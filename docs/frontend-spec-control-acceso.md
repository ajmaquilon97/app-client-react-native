# Control de Acceso (Invitados, PIN y Kiosco) — Guía de implementación Frontend

Guía por actor y plataforma del módulo de control de acceso: alta de invitados, entrega de
credenciales, emisión del PIN de recepción y validación en la puerta.

Este documento es **autocontenido**. Cubre los seis endpoints que intervienen en el flujo, con sus
contratos completos en el anexo técnico (§4). No hace falta consultar ninguna otra especificación
para implementarlo.

**Convenciones globales**

- Todos los endpoints devuelven y reciben JSON con claves en `camelCase`.
- Todos requieren `Authorization: Bearer <accessToken>` salvo donde se indique lo contrario.
- Los errores siguen el shape `{ "message": "..." }`. El `403 Forbidden` va **sin cuerpo**.
- Las fechas viajan en ISO 8601 UTC (`2026-08-04T22:30:00Z`).

---

## 0. El flujo completo, y de dónde salen los invitados

Antes de entrar por actor, el orden real de las cosas:

| # | Quién | Qué pasa | Endpoint |
|---|---|---|---|
| 1 | *(automático)* | Se aprueba el pago por Datafast. Si el espacio tiene `ValidarAforo`, el backend crea `MaxCapacidad` entradas **en blanco**, cada una con su token QR y su código corto. | — (efecto secundario del pago) |
| 2 | Cliente | Reparte esas entradas nominalmente a sus invitados. **Esto crea a los invitados.** | `POST /api/reservas/{id}/invitaciones/asignar` → contrato en **§4.1** |
| 3 | Cliente | Consulta el estado de sus invitados, corrige datos mal escritos y reenvía correos. | §1 · contratos en §4.2, §4.3 y §4.4 |
| 4 | Anfitrión | Emite el PIN que le entrega al recepcionista. | §2 · contrato en §4.5 |
| 5 | Recepcionista | Abre sesión de kiosco con el PIN y valida en la puerta. | §3 · contratos en §4.6 y §4.7 |

> **Punto crítico para el equipo móvil:** el paso 2 es el que da de alta a los invitados, y sin él
> el resto del flujo no tiene sobre qué operar — la lista de invitados de §1 devuelve `[]` siempre y
> no hay nada que validar en la puerta.
>
> Ese endpoint **no es nuevo**: ya existe en la API y hoy puede estar sin usar desde la app. Su
> contrato completo está en **§4.1** de este documento.
>
> Detalle de su semántica que conviene tener presente al diseñar la pantalla de alta: el backend
> **no** crea filas nuevas por invitado. Toma las entradas del pool que todavía están sin asignar y
> las empareja **posicionalmente** con la lista que mandes — el primer invitado del array recibe la
> primera entrada libre, y así. Por eso el endpoint es incremental y repetible: puedes llamarlo
> varias veces con pocos invitados cada vez, y cada llamada consume más del pool. Cuando el pool se
> agota, cualquier intento adicional devuelve `409`.

---

## 1. Actor: Cliente — App Móvil (React Native)

### Responsabilidad

Gestionar la lista de invitados de una reserva que ya pagó: ver quién ya ingresó y reenviar la
credencial a quien no le llegó el correo.

### UI/UX requerida

Pantalla de lista de invitados, accesible desde el detalle de la reserva. Por cada fila: nombre,
correo y un chip de estado.

> ### ⛔ NO renderizar el código QR en la app del cliente
>
> **El frontend no debe mostrar, ni permitir descargar, la imagen del QR de un invitado.** Si el
> cliente puede ver el QR de sus invitados en pantalla, puede capturarlo y reenviarlo por su cuenta
> a cualquiera, y el control de aforo deja de tener sentido: una misma entrada termina circulando
> entre personas que nunca fueron registradas.
>
> Esto ya está garantizado desde el backend y **no es negociable ni configurable**: ni `tokenQr` ni
> `codigoCorto` existen como campos en ninguna respuesta de la API de esta sección. No hay forma de
> pedirlos. La credencial viaja **únicamente** dentro del correo que recibe el invitado.
>
> Si el diseño trae una pantalla de "ver QR del invitado", hay que sacarla del alcance — no se puede
> implementar contra esta API.

**Estados a representar** (campo `estado`):

| Valor | Significado | Sugerencia visual |
|---|---|---|
| `Enviado` | Se le mandó la credencial por correo; todavía no entra. | Chip neutro |
| `Ingresado` | Ya escaneó/tecleó su código en la puerta. | Chip verde, ícono de check |
| `Pendiente` | Entrada del pool todavía sin asignar a nadie. | *(ver nota)* |

> **Nota sobre `Pendiente`:** el endpoint de listado filtra a las entradas ya asignadas, así que en
> la práctica **`Pendiente` nunca aparece en esta lista**. El valor existe en el enum del backend,
> pero no lo vas a recibir acá. No inviertas diseño en ese chip.

### Acciones y APIs

#### 1.1 Consultar la lista

```
GET /api/mobile/reservas/{reservaId}/invitados
```

Sólo el cliente dueño de la reserva (`Reserva.UsuarioId == sub` del JWT). Devuelve los invitados
ordenados por nombre.

| Código | Cuándo | Manejo sugerido |
|---|---|---|
| `200` | OK. Puede venir `[]`. | Si está vacío, mostrar empty state que invite a asignar invitados (paso 2 del flujo). |
| `401` | JWT ausente/expirado. | Refresh token o volver al login. |
| `403` | La reserva no es del usuario. | No debería pasar navegando normal; log y volver atrás. |
| `404` | No existe la reserva. | Mensaje genérico y volver atrás. |

#### 1.2 Reenviar el correo a un invitado

```
POST /api/mobile/reservas/{reservaId}/invitados/{invitadoId}/reenviar
```

Sin body. Reglas de negocio aplicadas en servidor: **máximo 3 reenvíos por invitado** y **5 minutos
de espera entre uno y otro**.

#### 1.3 Corregir un invitado (nombre y correo)

```
PUT /api/mobile/reservas/{reservaId}/invitados/{invitadoId}
```

Contrato en §4.4. Caso de uso principal: **el cliente escribió mal el correo** y la invitación le
llegó a otra persona.

> ### 🔄 Editar regenera las credenciales — y eso es el punto
>
> Este endpoint no es un "editar campos" cualquiera. Al guardar, el backend **descarta el código QR
> y el código corto del invitado y emite unos nuevos**.
>
> La razón: si el correo estaba mal escrito, un tercero recibió un mensaje con un QR **válido** que
> abre la puerta del evento. Cambiar sólo la dirección no arregla nada — el destinatario equivocado
> se queda con la credencial. Al regenerarla, ese correo queda inservible: el código viejo deja de
> existir y en la puerta responde `404`.
>
> Efectos colaterales que la UI debe comunicar:
> - **La credencial anterior deja de funcionar de inmediato.** Si el invitado correcto ya había
>   recibido un correo previo, ese también queda inválido y tiene que usar el nuevo.
> - **El contador de reenvíos vuelve a 0.** El destinatario nuevo recibe los 3 intentos completos,
>   sin arrastrar los que se gastaron escribiendo a la dirección equivocada. Si estabas llevando el
>   contador en estado local (§1.2), **reinícialo para esa fila** tras un `200`.
> - Se dispara automáticamente el envío del correo con la credencial nueva. **No hace falta llamar
>   a reenviar después de editar.**

**UI requerida.** En cada fila de la lista de invitados, una acción de **editar** que abra un
formulario con nombre y correo precargados. En el botón de guardar, un texto de confirmación del
tipo: *"Se enviará una invitación nueva a esta dirección y la anterior dejará de ser válida."*

La acción de editar debe **ocultarse o deshabilitarse** cuando `estado === "Ingresado"`: esa persona
ya entró y el backend rechaza la edición con `400`.

| Código | Cuándo | Manejo sugerido |
|---|---|---|
| `200` | Corregido. Devuelve el invitado actualizado. | Reemplazar la fila con la respuesta y reiniciar el contador local de reenvíos. |
| `400` | Datos inválidos, **o** el invitado ya ingresó. | Dos casos muy distintos bajo el mismo código: distinguirlos por la presencia de la clave `errors` en el cuerpo (ver §4.4). |
| `403` | La reserva no es del usuario. | Log y volver atrás. |
| `404` | El `invitadoId` no pertenece a esa reserva. | Refrescar la lista. |

### Validaciones a manejar

Estas dos son las que el usuario va a ver seguido — hay que atraparlas explícitamente, no dejarlas
caer en el handler genérico de errores.

| Código | Causa | Qué hacer en la UI |
|---|---|---|
| `400` | Se agotaron los 3 reenvíos de ese invitado. | Alerta: *"Ya reenviaste esta invitación 3 veces. Contacta al anfitrión si tu invitado sigue sin recibirla."* **Deshabilitar el botón de forma permanente para esa fila.** |
| `429` | Todavía no pasan 5 minutos del último reenvío. | Alerta: *"Espera unos minutos antes de volver a enviar."* **Deshabilitar el botón con cuenta regresiva** (ver abajo). |
| `404` | El `invitadoId` no pertenece a esa reserva. | Refrescar la lista: probablemente está desactualizada. |
| `403` | La reserva no es del usuario. | Log y volver atrás. |

**Usa la cabecera `Retry-After` para el cooldown.** La respuesta `429` incluye `Retry-After` con los
**segundos exactos** que faltan. Úsala en vez de asumir 300 s fijos: si el usuario reintentó al
minuto 4, `Retry-After` va a decir `60` y el botón se rehabilita en el momento justo.

```js
if (res.status === 429) {
  const segundos = Number(res.headers.get('Retry-After')) || 300;
  iniciarCuentaRegresiva(invitadoId, segundos);
}
```

**Contador local, no del servidor.** La respuesta `200` no devuelve cuántos reenvíos quedan. Si
quieres mostrar "te quedan N", llévalo en estado local del cliente — pero recuerda que se pierde al
reinstalar la app, así que el `400` sigue siendo la única fuente de verdad y hay que manejarlo igual.

---

## 2. Actor: Anfitrión — Portal Web (Next.js)

### Responsabilidad

Habilitar al personal de recepción entregándole un PIN, y tener un plan B si el escáner falla.

### UI/UX requerida

En la pantalla de **detalle de la reserva**, una sección "Control de acceso" con:

**a) Botón "Generar PIN de Recepción"**

Al pulsarlo se muestra el PIN en grande, junto con su fecha de expiración.

> ### ⚠️ El PIN se muestra UNA sola vez
>
> No existe ningún endpoint para volver a consultar un PIN ya emitido. Si el anfitrión cierra el
> modal sin anotarlo, la única salida es generar otro — **y generar otro revoca el anterior al
> instante**, tumbando cualquier sesión de kiosco abierta con él.
>
> Consecuencias para la UI:
> - Mostrar el PIN en un modal con botón de **copiar**, y una advertencia visible de que no se podrá
>   volver a ver.
> - Si ya hay un PIN vigente, el botón debe decir **"Regenerar PIN"** y pedir confirmación explícita:
>   *"Esto invalidará el PIN anterior y cerrará la sesión del kiosco que lo esté usando. ¿Continuar?"*
> - No cachear el PIN en `localStorage` ni en el estado global de la app.

**b) Caja de texto "Ingreso Manual de Invitado"**

Un input de 6 caracteres + botón "Validar", pensado para cuando el invitado llega y el escáner no
funciona.

> ### ⛔ Este endpoint NO existe todavía
>
> **No hay endpoint web que valide el ingreso por código corto.** El único endpoint de validación
> disponible para el anfitrión es `POST /api/invitaciones/{tokenQr}/validar`, que recibe el **token
> QR de 32 caracteres hexadecimales** como parámetro de ruta, no el código corto de 6. Teclear el
> código corto ahí devuelve `404`.
>
> El código corto sólo se puede validar desde el kiosco (§3), que exige un JWT de sesión de
> recepción — un anfitrión logueado en el portal web no lo tiene.
>
> **No implementen esta caja de texto contra la API actual: no hay nada que llamar.** Hay que
> construir el endpoint primero. La opción natural es un
> `POST /api/reservas/{reservaId}/invitados/validar-manual` autorizado por `PropietarioId`, que
> reutilice la misma lógica del kiosco. Coordinar con backend antes de incluir esto en el sprint.

### Acciones y APIs

#### 2.1 Generar / regenerar el PIN de recepción

```
POST /api/reservas/{reservaId}/pin-recepcion
```

Sin body. Sólo el **Anfitrión dueño del espacio** de la reserva (`Espacio.PropietarioId == sub`).
Nótese que es el portal web: el cliente que hizo la reserva **no** puede emitir PIN.

| Código | Cuándo | Manejo |
|---|---|---|
| `200` | PIN emitido. Revoca automáticamente el anterior. | Mostrar modal (ver arriba). |
| `401` | JWT ausente/expirado. | Login. |
| `403` | La reserva no pertenece a un espacio del anfitrión. | Ocultar la sección entera si no es dueño. |
| `404` | No existe la reserva. | Mensaje genérico. |

**Vigencia:** el PIN expira **2 horas después de `fechaFin` de la reserva**. La respuesta trae
`fechaExpiracion` ya calculada y en UTC — mostrarla convertida a hora local de Ecuador. No hay
endpoint de revocación explícita: para revocar, se regenera.

---

## 3. Actor: Recepcionista / Guardia — App Móvil, Modo Kiosco (React Native)

### Responsabilidad

Validar invitados en la puerta, sin tener cuenta propia en el sistema.

### UI/UX requerida

**a) Entrada al modo kiosco.** En la pantalla de login actual, un **botón secundario** —visualmente
subordinado al login normal— que diga **"Ingreso Recepción"**.

**b) Pantalla de PIN.** No pide correo ni contraseña. Sólo un input **numérico de 6 dígitos**:

- Teclado numérico (`keyboardType="number-pad"`), `maxLength={6}`.
- El PIN **puede empezar con cero** (`004821` es válido). Tratarlo siempre como **string**, nunca
  como número — parsearlo a `int` le come los ceros iniciales y el login falla.
- Autoenvío al completar los 6 dígitos, o botón "Ingresar".

**c) Al autenticar, abrir la cámara directamente.** Sin pantallas intermedias ni menús: la sesión de
kiosco existe para una sola cosa. La pantalla de escaneo debe tener:

- Visor de cámara ocupando la pantalla.
- Un acceso secundario a **entrada manual del código corto** (6 caracteres alfanuméricos), para
  cuando el QR esté dañado o el invitado sólo tenga el código dictado por teléfono.
- Feedback grande y legible a distancia tras cada escaneo: en éxito, **el nombre del invitado**,
  para que el guardia pueda saludarlo por su nombre.

**d) Modo kiosco = pantalla bloqueada.** Considerar deshabilitar el gesto de volver atrás y mantener
la pantalla encendida (`expo-keep-awake` o equivalente): el dispositivo se queda en la puerta durante
horas.

### Sobre el JWT de recepción — leer con atención

Este token **no representa a un usuario**. Lleva dos claims custom, `reservaId` y `pinId`, y su
`sub` es sintético (`recepcion:<guid>`), no el id de una cuenta.

> **Corrección respecto de cómo se planteó originalmente:** este JWT **no lleva claim de rol**. El
> sistema no maneja roles, así que se emite como un JWT estándar y lo que lo acota son sus claims.
> Si el equipo estaba asumiendo un `role: "Recepcion"` para ramificar lógica, no existe — hay que
> distinguir la sesión de kiosco por la presencia del claim `reservaId`, o simplemente por la ruta
> de login que se usó.

**Qué NO hacer con este token:**

- No usarlo para llamar endpoints del cliente (`/api/reservas/mias`, `/api/mobile/reservas`, etc.).
  Técnicamente el servidor lo acepta como JWT válido —va firmado con la misma clave—, pero **toda
  verificación de propiedad falla**, porque su `sub` sintético jamás coincide con el id de un
  usuario real. Vas a recibir `403` o listas vacías, nunca datos útiles.
- No guardarlo en el mismo slot de almacenamiento que el token del cliente. Usar una clave separada
  (ej. `kiosk_token` vs `auth_token`) para que abrir el kiosco no deslogue al cliente y viceversa.
- No intentar refrescarlo: **no hay refresh token para el modo kiosco.** Cuando expira, se vuelve a
  pedir el PIN.

**Vigencia y expiración:** el token vence junto con el PIN — 2 horas después del fin de la reserva,
no a los 15 minutos del access token normal. Esto es deliberado: el guardia no puede estar
reautenticándose a mitad del evento.

> ### Manejar el 401 en medio del turno
>
> `validar-qr` puede devolver `401` **en cualquier momento**, aunque el JWT todavía no haya vencido:
> el backend revalida el PIN contra la base en cada llamada, y si el anfitrión lo regeneró, la sesión
> muere al instante.
>
> Ante un `401` en `validar-qr`: **cerrar la cámara y volver a la pantalla de PIN** con el mensaje
> del backend. No reintentar, no mostrar un error genérico de red — el guardia necesita entender que
> tiene que pedir el PIN nuevo al anfitrión.

### Acciones y APIs

#### 3.1 Login de recepción

```
POST /api/mobile/auth/recepcion
```

**No requiere `Authorization`** — el PIN es la credencial.

| Código | Cuándo | Manejo |
|---|---|---|
| `200` | Sesión abierta. | Guardar token, navegar directo a la cámara. |
| `400` | Falta el campo `pin`. | Validación de formulario. |
| `401` | PIN inexistente, vencido o revocado. | *"PIN inválido o expirado. Solicítalo nuevamente al anfitrión."* Limpiar el input. |

#### 3.2 Validar un código en la puerta

```
POST /api/mobile/recepcion/validar-qr
```

Requiere el JWT de kiosco. El campo `codigo` acepta **indistintamente**:

- El **token QR** escaneado (32 caracteres hexadecimales), o
- El **código corto** (6 caracteres alfanuméricos).

El backend distingue cuál es por la longitud; el frontend **no** declara el tipo. Mandar el string
tal cual, sin normalizar (el backend hace `Trim()`).

> **El `reservaId` NO se envía en el body.** El backend lo saca del claim del JWT. Aunque el escáner
> lea un QR válido de otro evento, ese código devuelve `404`: una sesión de kiosco sólo puede validar
> invitados de su propia reserva.

| Código | Cuándo | UI en la puerta |
|---|---|---|
| `200` | Ingreso registrado. | **Pantalla verde grande con el nombre.** Volver a la cámara tras ~2 s. |
| `401` | Sesión expirada o PIN revocado. | Volver a la pantalla de PIN (ver recuadro arriba). |
| `404` | Código inexistente o de otro evento. | Pantalla roja: *"Invitado no encontrado o no pertenece a este evento"*. |
| `409` | Ese código ya se usó para entrar. | Pantalla ámbar: *"Este código ya fue utilizado"*. Distinguirla visualmente del `404` — son situaciones muy distintas para el guardia. |

**El ingreso es irreversible.** No existe endpoint para deshacer una validación. Si el guardia
escanea por error, ese invitado queda `Ingresado` de forma permanente.

**Antirrebote obligatorio.** Las librerías de escaneo disparan el callback en cada frame mientras el
QR esté en cuadro. Sin control, un solo QR genera un `200` seguido de varios `409` en menos de un
segundo, y el guardia ve la pantalla ámbar de "ya utilizado" para alguien que acaba de entrar bien.
Bloquear el escáner desde el primer disparo hasta que se cierre la pantalla de resultado.

---

## 4. Anexo técnico — Contratos JSON

### 4.1 `POST /api/reservas/{reservaId}/invitaciones/asignar`

Da de alta a los invitados: asigna entradas del pool y dispara el correo con la credencial.
**Es el paso 2 del flujo — sin esto, todo lo demás opera sobre una lista vacía.**

Autorización: **sólo el Cliente que hizo la reserva** (`Reserva.UsuarioId == sub` del JWT). El
anfitrión dueño del espacio recibe `403` en este endpoint.

**Request** — array JSON en la raíz, **no** un objeto envolvente. Un elemento por entrada a asignar:

```json
[
  { "nombre": "Ana Torres",  "correo": "ana.torres@example.com" },
  { "nombre": "Luis Pérez",  "correo": "luis.perez@example.com" }
]
```

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `nombre` | `string` | Sí | No vacío. |
| `correo` | `string` | Sí | Formato de email válido. |

**`200 OK`** — array con las entradas recién asignadas, en el mismo orden:

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "reservaId": 152,
    "nombreInvitado": "Ana Torres",
    "correoInvitado": "ana.torres@example.com",
    "enviada": true,
    "usada": false,
    "fechaUso": null
  },
  {
    "id": "9b2e1d3a-1234-4a5b-8c9d-abcdef123456",
    "reservaId": 152,
    "nombreInvitado": "Luis Pérez",
    "correoInvitado": "luis.perez@example.com",
    "enviada": true,
    "usada": false,
    "fechaUso": null
  }
]
```

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` (GUID) | Es el `invitadoId` que se usa después en §4.3 (reenviar). |
| `reservaId` | `int` | |
| `nombreInvitado` | `string \| null` | |
| `correoInvitado` | `string \| null` | |
| `enviada` | `bool` | Siempre `true` en esta respuesta. Significa que el envío se **encoló**, no que se haya entregado (ver §5). |
| `usada` | `bool` | `true` cuando el invitado ya ingresó por la puerta. |
| `fechaUso` | `string \| null` (ISO 8601 UTC) | Momento del ingreso, `null` si no ha entrado. |

> **Ni `tokenQr` ni `codigoCorto` viajan en esta respuesta.** El campo no existe en el contrato. Las
> credenciales sólo llegan al invitado dentro del correo. Es la misma regla de §1: nada en la app
> del cliente puede renderizar el QR.

**Errores**

| Código | Cuándo | Body |
|---|---|---|
| `400` | Falta `nombre`/`correo` o el correo tiene formato inválido en algún ítem del array. | `{ "message": "Los datos proporcionados no son válidos.", "errors": { "[0].Correo": ["The Correo field is not a valid e-mail address."] } }` |
| `401` | JWT ausente o expirado. | Respuesta estándar de autenticación. |
| `403` | El usuario autenticado no es el cliente de la reserva. | *(sin cuerpo)* |
| `404` | No existe la reserva. | `{ "message": "No existe una reserva con ese ID." }` |
| `409` | Se pidieron más invitados que entradas quedan en el pool. | `{ "message": "Solo quedan 3 entrada(s) disponible(s) para asignar (se solicitaron 5)." }` |

> **Sobre el `400`:** los textos dentro de `errors` vienen en **inglés** (mensajes por defecto de
> las anotaciones de validación de .NET), aunque `message` esté en español. No mostrarlos crudos al
> usuario final — mapearlos a textos propios por nombre de campo.

> **Sobre el `409`:** el mensaje trae los conteos exactos. Conviene parsearlo o, mejor, prevenirlo:
> el pool tiene el tamaño de `MaxCapacidad` del espacio, así que la UI puede limitar cuántos
> invitados se agregan antes de enviar.

---

### 4.2 `GET /api/mobile/reservas/{reservaId}/invitados`

**Request:** sin body.

**`200 OK`**
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "nombre": "Ana Torres",
    "correo": "ana.torres@example.com",
    "estado": "Enviado"
  },
  {
    "id": "9b2e1d3a-1234-4a5b-8c9d-abcdef123456",
    "nombre": "Luis Pérez",
    "correo": "luis.perez@example.com",
    "estado": "Ingresado"
  }
]
```

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` (GUID) | El `invitadoId` que se usa en el endpoint de reenvío. |
| `nombre` | `string` | Puede venir `""` si la entrada se asignó sin nombre. |
| `correo` | `string` | Puede venir `""`. |
| `estado` | `string` | `"Enviado"` \| `"Ingresado"`. En la práctica nunca `"Pendiente"`. |

**Errores:** `404` → `{ "message": "No existe una reserva con ese ID." }` · `403` sin cuerpo.

---

### 4.3 `POST /api/mobile/reservas/{reservaId}/invitados/{invitadoId}/reenviar`

**Request:** sin body.

**`200 OK`**
```json
{ "message": "Credencial reenviada al correo del invitado." }
```

**`400 Bad Request`** — tope de 3 alcanzado
```json
{ "message": "Límite de reenvíos alcanzado" }
```

**`429 Too Many Requests`** — cooldown activo
```
Retry-After: 187
```
```json
{ "message": "Espera 5 minutos para volver a enviar" }
```

**`404 Not Found`**
```json
{ "message": "No existe ese invitado en la reserva indicada." }
```

---

### 4.4 `PUT /api/mobile/reservas/{reservaId}/invitados/{invitadoId}`

Corrige nombre y correo, **y regenera las credenciales de ingreso**. Ver el recuadro de §1.3.

**Request**
```json
{
  "nombre": "Ana Torres",
  "correo": "ana.torres.correcto@example.com"
}
```

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `nombre` | `string` | Sí | No vacío. Se le aplica `Trim()`. |
| `correo` | `string` | Sí | Formato de email válido. Se le aplica `Trim()`. |

Ambos campos son obligatorios aunque sólo cambie uno: es un `PUT`, no un `PATCH`. Para corregir sólo
el correo, reenvía el nombre actual tal cual.

**`200 OK`** — mismo shape que el listado de §4.2:
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "nombre": "Ana Torres",
  "correo": "ana.torres.correcto@example.com",
  "estado": "Enviado"
}
```

> Las credenciales nuevas **no viajan en la respuesta**, igual que en el resto del módulo. Sólo
> llegan al invitado por correo. El `id` no cambia — sigue siendo el mismo invitado.

**Errores**

| Código | Cuándo | Body |
|---|---|---|
| `400` | El invitado ya ingresó al evento. | `{ "message": "No se puede editar un invitado que ya ingresó al evento." }` |
| `400` | `nombre`/`correo` faltante o correo con formato inválido. | `{ "message": "Los datos proporcionados no son válidos.", "errors": { "Correo": ["The Correo field is not a valid e-mail address."] } }` |
| `401` | JWT ausente o expirado. | Respuesta estándar de autenticación. |
| `403` | El usuario autenticado no es el cliente de la reserva. | *(sin cuerpo)* |
| `404` | No existe la reserva, o el `invitadoId` no pertenece a ella. | `{ "message": "No existe ese invitado en la reserva indicada." }` |

> **Los dos `400` se distinguen por la forma del cuerpo:** el de "ya ingresó" trae sólo `message`;
> el de validación trae además la clave `errors`. Ramificar por `if ('errors' in body)` es más
> robusto que comparar el texto del mensaje.

---

### 4.5 `POST /api/reservas/{reservaId}/pin-recepcion`

**Request:** sin body.

**`200 OK`**
```json
{
  "pin": "004821",
  "fechaExpiracion": "2026-08-05T03:00:00Z"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `pin` | `string` | **Siempre 6 dígitos, con ceros a la izquierda.** No parsear a número. |
| `fechaExpiracion` | `string` (ISO 8601 UTC) | `fechaFin` de la reserva + 2 h. |

**Errores:** `404` → `{ "message": "No existe una reserva con ese ID." }` · `403` sin cuerpo.

---

### 4.6 `POST /api/mobile/auth/recepcion`

**Request** *(sin `Authorization`)*
```json
{ "pin": "004821" }
```

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `pin` | `string` | Sí | 6 dígitos numéricos. Enviar como string. |

**`200 OK`**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "reservaId": 152,
  "expiraEn": "2026-08-05T03:00:00Z"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `accessToken` | `string` | JWT de kiosco. Guardar en slot separado del token del cliente. |
| `reservaId` | `int` | Informativo — sirve para mostrar de qué evento es la sesión. El backend igual lo lee del token, no del cliente. |
| `expiraEn` | `string` (ISO 8601 UTC) | Igual a la expiración del PIN. |

**`401 Unauthorized`**
```json
{ "message": "PIN inválido o expirado." }
```

---

### 4.7 `POST /api/mobile/recepcion/validar-qr`

**Request** *(con el JWT de kiosco)*
```json
{ "codigo": "3fa85f6457174562b3fc2c963f66afa6" }
```
o, en entrada manual:
```json
{ "codigo": "K7M2QX" }
```

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `codigo` | `string` | Sí | 32 hex (token QR) **o** 6 alfanuméricos (código corto). |

**`200 OK`**
```json
{
  "invitadoId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "nombre": "Ana Torres"
}
```

**`401 Unauthorized`**
```json
{ "message": "La sesión de kiosco ha expirado. Vuelve a ingresar el PIN." }
```

**`404 Not Found`**
```json
{ "message": "Invitado no encontrado o no pertenece a este evento" }
```

**`409 Conflict`**
```json
{ "message": "Este código ya fue utilizado" }
```

---

## 5. Resumen de gaps conocidos

Cosas que el frontend **no puede** implementar hoy contra esta API:

| Gap | Impacto | Estado |
|---|---|---|
| No hay endpoint web de validación por código corto para el anfitrión. | La caja "Ingreso Manual de Invitado" del portal web (§2b) no tiene backend. | **Bloqueante para esa UI.** Requiere endpoint nuevo. |
| No hay endpoint para reconsultar un PIN emitido. | Si el anfitrión pierde el PIN, debe regenerar (y revocar el anterior). | Por diseño. |
| No hay forma de deshacer una validación de ingreso. | Un escaneo por error es permanente. | Por diseño. |
| No hay refresh token para el modo kiosco. | Al expirar la sesión hay que reingresar el PIN. | Por diseño. |
| Las entradas creadas antes de esta versión tienen `codigoCorto` nulo. | Esos invitados sólo pueden entrar por QR, no por código corto. | Pendiente de backfill en backend. |
| No hay endpoint para desasignar una entrada o devolverla al pool. | Un invitado que cancela su asistencia sigue ocupando su cupo; no se puede liberar para otra persona. Corregir sus datos sí es posible (§4.4), pero no vaciarlos. | Requiere endpoint nuevo. |
| El correo al invitado no se reintenta si falla. | `estado: "Enviado"` / `enviada: true` significan "se intentó enviar", **no** "se entregó". | Por diseño; detalle en §5.1. |

### 5.1 Entrega del correo: por qué `enviada: true` no garantiza nada

El envío del correo con la credencial es **asíncrono y no persistente**. Cuando llamas a §4.1
(asignar) o §4.3 (reenviar), el backend encola el mensaje en memoria y responde de inmediato; un
proceso en segundo plano lo despacha después. La respuesta `200` confirma que la entrada quedó
asignada y el envío **encolado**, nada más.

Consecuencias concretas:

- Si el servidor se reinicia con correos pendientes en la cola, **esos correos se pierden y no hay
  reintento posterior**. El invitado nunca recibe su QR, pero su estado en la API sigue diciendo
  `"Enviado"`.
- Si el correo rebota (dirección inexistente, buzón lleno, filtro de spam), el backend **no se
  entera** y el estado tampoco cambia.

Qué hacer en la UI:

- No presentar `"Enviado"` como "el invitado ya recibió su entrada". Un texto honesto es
  *"Invitación enviada"*, no *"Invitación recibida"*.
- El botón de reenviar (§4.3) es la vía de recuperación para estos casos, y es la razón por la que
  existe el límite de 3 intentos: se espera que se use.
- Si un invitado reporta que no le llegó, el flujo correcto es reenviar. Si tras los 3 reenvíos
  sigue sin llegar, lo más probable es que la dirección esté mal escrita: usar **§4.4 (editar)**,
  que corrige el correo, regenera la credencial y reinicia el contador de reenvíos a 0.
