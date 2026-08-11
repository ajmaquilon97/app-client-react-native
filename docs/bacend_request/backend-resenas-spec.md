# Especificación técnica — Reseñas de espacios

> **De:** Equipo Backend (ApiTesis)
> **Para:** Equipo Frontend (Next.js / React Native)
> **Contexto:** Especificación técnica para la visualización y creación de reseñas de los espacios de Agora.

**Fecha:** 2026-08-10
**Base:** código en la rama `desarrollo` (`EspaciosController`, `EspaciosService`, `EspaciosRepository`, `ResenaRequest` / `ResenaResponse` / `ResenasEspacios`).

Todo lo que sigue fue **verificado ejecutando la API**, no solo leyendo el código.

> **Contrato estable — pueden construir sobre esto.** Una versión anterior de este documento
> advertía que la escritura estaba bloqueada por falta de autenticación. **Ya está resuelto:** los
> endpoints de escritura exigen JWT, el autor sale del token y hay validación de datos. No hay
> cambios de contrato pendientes.

---

## 1. Rutas: ya no hay `ñ` ✅

**Atendido su pedido.** Las rutas ahora son ASCII puro: `resenas`, sin eñe y sin codificación de
URL. Se acabaron los problemas de UTF-8 vs Latin-1 en proxies y gateways.

```
✅  /api/espacios/1/resenas
❌  /api/espacios/1/reseñas          →  404 (la ruta vieja YA NO EXISTE)
❌  /api/mobile/espacios/1/resenas   →  404 (no existe ningún endpoint de reseñas en /api/mobile)
```

> ⚠️ **Es un cambio incompatible.** La ruta anterior (`/rese%C3%B1as`) devuelve **404**; no
> conviven las dos. Si ya tenían llamadas apuntando a la versión con eñe, hay que actualizarlas.

La `ñ` se eliminó de todo lo técnico: rutas, nombres de clases, métodos, archivos y la propia
tabla en base de datos (`CAT_ResenasEspacios`). **Solo se conservó en los textos en español que ve
el usuario final** — el mensaje `"Ya dejaste una reseña para esta reserva."` sigue escrito
correctamente, porque es contenido, no un identificador.

> **Nota:** el módulo de reseñas vive bajo `/api/espacios`, que es el controlador del panel web.
> No hay endpoints espejo bajo `/api/mobile` como sí los hay para espacios o reservas. React Native
> tiene que pegarle a estas mismas rutas.

---

## 2. Modelos / Contratos JSON

### 2.1 Request de alta — `CrearResenaRequest` (POST)

```jsonc
{
  // int — REQUERIDO. Reserva propia, ya terminada, que habilita esta reseña.
  // Solo se puede reseñar un espacio que se reservó, y cada reserva vale por una reseña.
  // El id sale de GET .../resenas/reservas-disponibles (§3.2). Ver reglas en §4.
  "reservaId": 55,

  // string — REQUERIDO. Máx. 200 caracteres, validado por la API.
  "titulo": "Excelente cancha",

  // string — REQUERIDO. Máx. 1000 caracteres, validado por la API.
  "descripcion": "Muy buen estado del césped y buena iluminación.",

  // int — REQUERIDO. Debe estar entre 1 y 5 (inclusive), validado por la API.
  // 0, -3 y 99 devuelven 400. Ojo: omitir el campo equivale a mandar 0 → también 400.
  "calificacion": 5
}
```

### 2.2 Request de edición — `ResenaRequest` (PUT)

Lo mismo **sin `reservaId`**: una reseña no se puede mover a otra reserva. Si lo mandan, se ignora.

```jsonc
{
  "titulo": "Excelente cancha",
  "descripcion": "Muy buen estado del césped y buena iluminación.",
  "calificacion": 5
}
```

**No manden `usuarioId` en ninguno de los dos.** El autor sale del claim `sub` del JWT. Si lo
incluyen en el JSON, el backend lo **ignora** — verificado: mandando el `usuarioId` de otro usuario,
la reseña se guardó a nombre del dueño del token.

### 2.3 Response — `ResenaResponse`

```jsonc
{
  "id": 1,                                                   // int — id de la reseña
  "usuarioId": "bc31960c-6706-4c21-a3a6-5b9a1bda927e",       // string GUID — autor (del JWT)
  "usuarioNombre": "Angel Maquilon",                         // string "Nombre Apellido".
                                                             // Poblado en GET, POST y PUT.
  "espacioId": 35,
  "reservaId": 55,                                           // int — reserva que habilitó la reseña
  "titulo": "Excelente cancha",
  "descripcion": "Muy buen estado del césped.",
  "calificacion": 5,                                         // int, siempre 1..5
  "fechaCreacion": "2026-08-10T22:39:21.957471Z"             // UTC. ⚠️ El GET la devuelve SIN la
                                                             //    "Z" final; POST y PUT la
                                                             //    incluyen. Parseen asumiendo
                                                             //    UTC en ambos casos.
}
```

**No existe** `fechaModificacion`: al editar una reseña, `fechaCreacion` conserva la fecha original
y no hay forma de saber desde la API que fue editada.

### 2.4 Response de reservas disponibles — `ReservaResenableResponse`

```jsonc
[
  {
    "reservaId": 59,                       // int — el valor a mandar en el POST
    "codigo": "RES-06082026-35-59",        // string — código visible de la reserva
    "fechaInicio": "2026-08-06T09:00:00",  // hora local de Ecuador
    "fechaFin": "2026-08-06T11:00:00"
  }
]
```

### 2.5 Formato de errores

Los `400` de validación vienen siempre con este shape:

```jsonc
{
  "message": "Los datos proporcionados no son válidos.",
  "errors": {
    "calificacion": ["La calificación debe estar entre 1 y 5."],
    "titulo": ["El título no puede superar los 200 caracteres."]
  }
}
```

Los mensajes están **en español y son mostrables al usuario final**. `errors` es un diccionario
`campo → array de mensajes`, en camelCase, y puede traer varios campos a la vez.

Los `404` y los `409` traen `{ "message": "..." }` con texto en español mostrable al usuario. El
`403` viene **con cuerpo vacío** — no intenten parsearlo.

> Si alguna vez reciben una respuesta `400` que **no** es JSON (texto plano tipo
> `"An error occurred while saving..."`), es un bug: repórtenlo. Las rutas que lo producían ya
> fueron cerradas.

---

## 3. Endpoints detallados

| Endpoint | JWT | Éxito |
|---|---|---|
| `GET /api/espacios/{espacioId}/resenas` | ❌ Público | `200` |
| `GET /api/espacios/{espacioId}/resenas/reservas-disponibles` | ✅ Requerido | `200` |
| `POST /api/espacios/{espacioId}/resenas` | ✅ Requerido | `200` |
| `PUT /api/espacios/{espacioId}/resenas/{id}` | ✅ Requerido | `200` |
| `DELETE /api/espacios/{espacioId}/resenas/{id}` | ✅ Requerido | `200` |

Header en los cuatro autenticados: `Authorization: Bearer <access_token>`.

### 3.1 `GET /api/espacios/{espacioId}/resenas`

Lista las reseñas **no anuladas** de un espacio. **Público**: sirve para la ficha del espacio sin
sesión iniciada.

| Caso | Respuesta |
|---|---|
| OK | `200` — arreglo de `ResenaResponse` |
| Sin reseñas | `200` con `[]` |
| Espacio inexistente | ⚠️ `200` con `[]` — **no** 404. No usen este endpoint para saber si un espacio existe |

**Orden garantizado:** de la más reciente a la más antigua (`fechaCreacion` descendente). Se ordena
en el servidor; no hace falta reordenar en el cliente.

```jsonc
[
  {
    "id": 2,
    "usuarioId": "bc31960c-...",
    "usuarioNombre": "Angel Maquilon",
    "espacioId": 35,
    "reservaId": 59,
    "titulo": "Volví",
    "descripcion": "Segunda visita, igual de buena",
    "calificacion": 4,
    "fechaCreacion": "2026-08-10T22:53:50.1527837"
  }
]
```

### 3.2 `GET /api/espacios/{espacioId}/resenas/reservas-disponibles`

**Empiecen por acá antes de mostrar el formulario.** Devuelve las reservas del usuario autenticado
en ese espacio que todavía habilitan una reseña: propias, no canceladas, ya terminadas y sin reseña
activa. Ordenadas de la más reciente a la más antigua.

| Caso | Respuesta |
|---|---|
| OK | `200` — arreglo de `ReservaResenableResponse` (§2.4) |
| No puede reseñar (nunca reservó, o ya usó todas sus reservas) | `200` con `[]` |
| Sin JWT | `401` |

> **Para la UI:** si devuelve `[]`, **no muestren el botón de "Escribir reseña"** — cualquier POST
> va a fallar. Si devuelve un solo elemento, usen ese `reservaId` directo. Si devuelve varios,
> muestren un selector tipo "¿cuál de tus visitas querés reseñar?" con el `codigo` y las fechas.

### 3.3 `POST /api/espacios/{espacioId}/resenas`

Crea una reseña a nombre del usuario del token, consumiendo una de sus reservas.

| Caso | Respuesta |
|---|---|
| OK | `200 OK` con la `ResenaResponse` creada — ⚠️ **no** `201`, y sin header `Location` |
| Sin JWT / token vencido | `401` |
| Campo faltante, texto muy largo, `calificacion` fuera de 1..5, o `reservaId` ausente | `400` (§2.5) |
| Espacio inexistente, **o la reserva no es del usuario para ese espacio** | `404` |
| Reserva cancelada | `409` — `"No puedes reseñar una reserva cancelada."` |
| Reserva que todavía no termina | `409` — `"Solo puedes reseñar una reserva que ya haya terminado."` |
| Reserva que ya tiene reseña | `409` — `"Ya dejaste una reseña para esta reserva."` |

El backend fija `usuarioId` (del `sub`), `fechaCreacion` (UTC) y `anulado = false`. Lo que manden en
esos campos se ignora.

La respuesta trae `usuarioNombre` ya poblado, así que **pueden insertarla directo en la lista** sin
recargar ni completar el nombre desde la sesión.

> **Nota sobre el 404:** una reserva ajena, inexistente o de otro espacio devuelven todas el mismo
> `404` con el mismo mensaje. Es deliberado: distinguirlas filtraría las reservas de otros usuarios.

### 3.4 `PUT /api/espacios/{espacioId}/resenas/{id}`

Actualiza `titulo`, `descripcion` y `calificacion` de una reseña propia.

| Caso | Respuesta |
|---|---|
| OK | `200` con la `ResenaResponse` actualizada |
| Sin JWT | `401` |
| **No es el autor** | `403` (cuerpo vacío) |
| Reseña inexistente o anulada | `404` |
| Datos inválidos | `400` (§2.5) |

El autor y la reserva de una reseña **no se pueden reasignar**: `reservaId` en el body se ignora, y
la respuesta conserva el original. El `espacioId` de la ruta también se ignora (la reseña se busca
por `id`), pero manden el correcto igual por claridad.

Editar **no** libera la reserva ni consume otra: sigue siendo la misma reseña.

### 3.5 `DELETE /api/espacios/{espacioId}/resenas/{id}`

Baja lógica: marca `Anulado = true`, no borra la fila.

| Caso | Respuesta |
|---|---|
| OK | `200` con cuerpo vacío |
| Sin JWT | `401` |
| **No es el autor** | `403` (cuerpo vacío) |
| Reseña inexistente o ya anulada | `404` |

Una vez anulada desaparece del `GET` y **no hay endpoint para restaurarla**. Ojo con la diferencia
respecto de favoritos: acá el DELETE repetido devuelve `404`, no `200`, porque la reseña anulada ya
no se encuentra.

**Borrar una reseña libera su reserva:** esa reserva vuelve a aparecer en
`reservas-disponibles` y el usuario puede reseñarla de nuevo, empezando de cero. Verificado.

---

## 4. Reglas de negocio

| Pregunta | Respuesta según el código actual |
|---|---|
| ¿El autor sale del token? | ✅ **Sí**, del claim `sub`. El request no acepta `usuarioId` |
| ¿Se valida que sea el autor para editar/borrar? | ✅ **Sí**, `403` en caso contrario |
| ¿Se valida la calificación 1..5? | ✅ **Sí**, `400` fuera de rango |
| **¿Hay que haber reservado antes para reseñar?** | ✅ **Sí.** Ver el detalle abajo |
| ¿Un usuario puede dejar varias reseñas del mismo espacio? | ✅ **Sí, una por reserva.** Reservó 3 veces → puede dejar 3 reseñas |
| ¿Puede editar su reseña? | ✅ Sí, sin límite de tiempo ni de cantidad de ediciones |
| ¿El dueño del espacio puede responder la reseña? | ❌ No existe esa funcionalidad |
| ¿Hay moderación / aprobación previa? | ❌ No. La reseña se publica al instante |
| ¿Se filtran palabras ofensivas? | ❌ No |

### Regla central: una reserva = una reseña

**No se puede reseñar un espacio que nunca se reservó.** Cada reseña se ata a una reserva concreta
(`reservaId`), y una reserva habilita **una sola reseña activa**. Quien reservó el mismo espacio
tres veces puede dejar tres reseñas, una por visita.

Una reserva habilita reseña cuando cumple **todo** esto:

| Condición | Si no se cumple |
|---|---|
| Es del usuario autenticado | `404` |
| Es de **ese** espacio | `404` |
| `estado != "cancelada"` | `409` |
| **Ya terminó** (`fechaFin` en el pasado, hora de Ecuador) | `409` |
| No tiene ya una reseña activa | `409` |

Notas:

- **La asistencia no se mira.** Una reserva marcada como `no_asistio` igual habilita la reseña.
- **El estado `finalizada` no se usa como criterio.** Hoy ninguna reserva llega a ese estado en el
  sistema, así que la regla se apoya en las fechas, no en el estado. Vale cualquier estado que no
  sea `cancelada` (`pendiente`, `confirmada`, `reagendada`).
- Las fechas de reserva están en **hora local de Ecuador (UTC-5)**, no en UTC. La comparación se
  hace del lado del servidor; no intenten replicarla con `new Date()` sin ajustar el offset.
- Borrar una reseña libera su reserva: se puede volver a reseñar esa misma visita.

Secuencia verificada (usuario con 2 reservas pasadas del espacio 35):

```
GET  .../35/reseñas/reservas-disponibles   →  [59, 55]     dos visitas por reseñar
POST .../35/reseñas  {reservaId: 55, ...}  →  200          primera reseña
POST .../35/reseñas  {reservaId: 55, ...}  →  409          la 55 ya se usó
POST .../35/reseñas  {reservaId: 59, ...}  →  200          segunda reseña, otra visita
GET  .../35/reseñas/reservas-disponibles   →  []           sin visitas por reseñar
POST .../18/reseñas  {reservaId: 55, ...}  →  404          nunca reservó el espacio 18
```

### El promedio del espacio se recalcula solo ✅

`EspacioResponse` y `EspacioMobileResponse` exponen `calificacion` (decimal, 2 decimales) y
`totalResenas` (int). El backend los **recalcula y persiste en cada alta, edición y anulación** de
reseña, contando solo las activas. **Úsenlos directo para las estrellitas del catálogo** — no hace
falta traer todas las reseñas y promediar en el cliente.

Secuencia verificada sobre el espacio 1:

| Acción | `calificacion` | `totalResenas` |
|---|---|---|
| Estado inicial, sin reseñas | `null` | `null` |
| Alta de una reseña de 5★ | `5.00` | `1` |
| Alta de una segunda de 4★ | `4.50` | `2` |
| Edición de la primera 5★ → 1★ | `2.50` | `2` |
| Anulación de la de 1★ | `4.00` | `1` |
| Anulación de la última | `null` | `0` |

**`calificacion` es `null` cuando el espacio no tiene reseñas activas** — no `0`. La UI tiene que
distinguir "sin calificar" de una calificación baja. Noten también que `totalResenas` arranca en
`null` en espacios que nunca tuvieron reseñas y pasa a `0` después de que se anula la última: traten
`null` y `0` como equivalentes.

---

## 5. Paginación y ordenamiento

**Paginación: no aplica.** `GET /api/espacios/{espacioId}/resenas` devuelve **todas** las reseñas
activas del espacio en un solo arreglo. No acepta `page`, `pageSize`, `skip` ni `take` — mandarlos
no rompe nada, simplemente se ignoran. La respuesta es un array plano, sin envoltorio
`{ items, total, page }`.

**Ordenamiento: resuelto en el servidor.** Siempre `fechaCreacion` descendente (más reciente
primero). No hay parámetro `sort` para cambiarlo.

Mientras no haya paginación:

- Virtualicen la lista en el cliente: un espacio popular puede devolver una respuesta grande.
- Si el volumen se vuelve un problema real, pídannos paginación server-side y la agregamos — el
  contrato pasaría a ser `{ items, totalElements }`, como en tickets de soporte.

---

## 6. Checklist de integración

**Lectura**

- [ ] Codificar la `ñ` de la ruta: verificar que salga `rese%C3%B1as` (UTF-8) y no `rese%F1as`
- [ ] Apuntar a `/api/espacios/...`, **no** a `/api/mobile/...` (no existe para reseñas)
- [ ] Tratar `200 []` como "sin reseñas" **y también** como "espacio inexistente" — no distinguirlos por esta API
- [ ] No reordenar en el cliente: ya viene de la más reciente a la más antigua
- [ ] Virtualizar la lista: la API devuelve todas las reseñas de una
- [ ] Parsear `fechaCreacion` como UTC aunque el `GET` la devuelva sin la `Z`
- [ ] Usar `calificacion` / `totalResenas` del espacio para las estrellas — ya vienen calculados
- [ ] Manejar `calificacion: null` (y `totalResenas` `null` o `0`) como "sin calificar", distinto de una nota baja

**Escritura**

- [ ] Mandar `Authorization: Bearer <token>` en POST, PUT, DELETE y en `reservas-disponibles`
- [ ] **Llamar a `reservas-disponibles` antes de mostrar el botón "Escribir reseña"**: si viene `[]`, ocultarlo
- [ ] Selector de visita cuando `reservas-disponibles` trae más de una, usando `codigo` y fechas
- [ ] Enviar `reservaId` en el POST (obligatorio) y **no** enviarlo en el PUT (se ignora)
- [ ] **No** enviar `usuarioId` en el body: se ignora, el autor sale del token
- [ ] Validar en el cliente igual (1..5, 200 y 1000 chars) para dar feedback inmediato, con contador de caracteres
- [ ] Esperar `200` en el POST (**no** `201`), sin header `Location`
- [ ] Usar la `ResenaResponse` del POST directo en la lista: ya trae `usuarioNombre`
- [ ] Mostrar los mensajes de `errors`, de `404` y de `409` tal cual: vienen en español, listos para el usuario
- [ ] Manejar `409` como "no podés reseñar esta visita" y refrescar `reservas-disponibles` (el estado del servidor cambió)
- [ ] Manejar `401` (sesión vencida → refresh o re-login) y `403` (cuerpo vacío → mensaje genérico)
- [ ] Mostrar editar/borrar solo si `usuarioId` de la reseña == usuario en sesión (el backend igual devuelve `403`)
- [ ] Refrescar la calificación del espacio tras crear/editar/borrar: el promedio cambió
- [ ] Contemplar que el DELETE repetido devuelve `404`, no `200`
- [ ] Tras borrar una reseña, refrescar `reservas-disponibles`: esa visita vuelve a estar disponible
- [ ] No replicar la validación de fechas en el cliente con `new Date()`: las reservas están en hora de Ecuador (UTC-5)

---

## 7. Pendientes de backend

Nada que bloquee la integración. Lo que queda es producto, no contrato:

| # | Pendiente | Prioridad |
|---|---|---|
| 1 | Respuesta del anfitrión a una reseña | 🟡 Funcionalidad nueva |
| 2 | Exponer las rutas bajo `/api/mobile` | 🟡 Consistencia con el resto de la API móvil |
| 3 | Ventana de tiempo para reseñar (ej. hasta 30 días después de la visita) | 🟡 Decisión de producto |
| 4 | `fechaModificacion` para distinguir reseñas editadas | 🟢 Nice to have |
| 5 | Paginación server-side | 🟢 Cuando el volumen lo pida |

Ninguno de estos rompe el contrato actual: los puntos 2 y 5 lo harían, pero se coordinarían con
ustedes antes y con las rutas viejas conviviendo.

---

## Anexo — Qué cambió respecto de la versión anterior de este documento

Si empezaron a integrar con el borrador previo, esto es lo que cambió en la API:

| Antes | Ahora |
|---|---|
| POST/PUT/DELETE sin autenticación | Requieren `Authorization: Bearer` → `401` sin token |
| `usuarioId` obligatorio en el body | **Eliminado del contrato**; sale del claim `sub` (si lo mandan, se ignora) |
| Cualquiera editaba/borraba reseñas ajenas | `403` si no es el autor |
| `calificacion` aceptaba 0, -3, 99 | `400` fuera de 1..5 |
| Texto largo → `400` con error crudo de EF | `400` estructurado en español |
| Espacio inexistente en POST → `400` crudo | `404` con mensaje |
| `usuarioNombre` vacío en la respuesta del POST | Poblado |
| Orden del `GET` no garantizado | `fechaCreacion` descendente |
| `calificacion` / `totalResenas` del espacio siempre `null` | Recalculados en cada alta/edición/anulación |
| Se podía reseñar un espacio sin haberlo reservado | Se exige una reserva propia, ya terminada y no cancelada |
| Reseñas ilimitadas por usuario y espacio | Una por reserva (N reservas → N reseñas) |
| El POST no pedía `reservaId` | **`reservaId` es obligatorio en el POST** (nuevo endpoint `reservas-disponibles` para obtenerlo) |
| `ResenaResponse` sin `reservaId` | Incluye `reservaId` |
| No había `409` | `409` para reserva cancelada, no terminada o ya reseñada |
| Rutas con eñe (`/rese%C3%B1as`) | **Rutas ASCII: `/resenas`.** La versión con eñe devuelve `404` |
| DTOs `ReseñaRequest` / `ReseñaResponse` / `ReservaReseñableResponse` | `ResenaRequest` / `ResenaResponse` / `ReservaResenableResponse` (solo cambia el nombre, no los campos) |

## Cierre

Pueden avanzar con lectura y escritura. Cualquier duda o si necesitan que prioricemos alguno de los
pendientes de la sección 7, nos dicen.
