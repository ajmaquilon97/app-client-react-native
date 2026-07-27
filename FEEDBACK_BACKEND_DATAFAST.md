# Feedback para backend: proxy de Datafast para pago y reverso de reservas (UAT)

## Resumen

Vamos a conectar el pago con **Datafast** (entorno UAT: `https://test.oppwa.com`) en el flujo de reserva
de la app móvil. Datafast usa el modelo **Copy&Pay**: primero hay que crear un `checkoutId` llamando a
`POST /v1/checkouts`, y luego verificar el resultado con `GET /v1/checkouts/{id}/payment`. Ambas llamadas
requieren el `entityId` y el `Authorization: Bearer {accessToken}` del comercio.

**Esas credenciales no pueden vivir en la app móvil** — son secretos del comercio; si quedaran embebidas en
el bundle de la app se podrían extraer del APK/IPA y usarse para generar cargos fraudulentos contra la
cuenta. Por eso necesitamos que el backend actúe de intermediario: la app nunca habla directo con Datafast
para crear/verificar el pago, solo carga el *widget* visual de Datafast (que si es público, no requiere
secretos) dentro de un `WebView`.

## Credenciales para esta etapa (UAT / Fase 1)

Para no bloquear la implementación esperando el alta como comercio, Datafast publica en su propia
documentación (https://developers.datafast.com.ec/index.aspx) un `entityId` + token de prueba **compartido**
para la Fase 1 de integración — cualquier desarrollador lo puede usar, no es un secreto de comercio, y no
mueve dinero real (entorno `test.oppwa.com`):

```
entityId: 8a829418533cf31d01533d06f2ee06fa
Authorization: Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA==
```

Con esto el backend puede implementar y probar los 3 endpoints de abajo **ya**, sin esperar credenciales
propias del comercio.

**Importante — esto es solo para esta etapa:** la documentación de Datafast distingue una Fase 2 de
integración, donde el comercio recibe credenciales de prueba propias (`MID`/`TID` de ejemplo:
`1000000406`/`PD100406`) para certificación antes de salir a producción. Cuando pasemos a esa fase (o a
producción), el `entityId`/`accessToken` sí van a ser secretos de verdad — en ese momento la razón de este
documento (que el backend medie, nunca el cliente) sigue aplicando igual. Por ahora, usar el valor
compartido de Fase 1 no cambia la arquitectura pedida (backend sigue siendo el único que llama a Datafast),
solo evita que backend tenga que gestionar el alta como comercio antes de poder arrancar.

## Lo que pedimos: 3 endpoints nuevos

Ambos autenticados igual que el resto de `/api/reservas/*` (JWT del cliente dueño de la reserva).

### 1. Crear el checkout

```
POST /api/reservas/{id}/pago/datafast/checkout
```

El backend, del lado del servidor:
1. Busca la reserva `{id}` y su monto total pendiente (`Reserva.Pago.Total` o el campo que corresponda).
2. Llama a Datafast:
   ```
   POST https://test.oppwa.com/v1/checkouts
   Authorization: Bearer {ACCESS_TOKEN}
   Content-Type: application/x-www-form-urlencoded

   entityId={ENTITY_ID}
   amount={monto de la reserva, formato "50.00"}
   currency=USD
   paymentType=DB
   merchantTransactionId={id de la reserva, o un código propio}
   customer.email={correo del cliente}
   customer.givenName={nombre del cliente}
   customer.surname={apellido del cliente}
   ```
3. Devuelve al cliente solo lo mínimo necesario:
   ```json
   { "checkoutId": "8ac7a4a1934...." }
   ```

Respuestas de error esperadas por el cliente:
- `404` si la reserva no existe o no pertenece al usuario autenticado.
- `409` si la reserva ya está pagada o en un estado que no admite pago (ej. `cancelada`).
- `400`/`502` si Datafast rechaza la creación del checkout (credenciales, parámetros, etc.) — con un
  `message` legible para mostrar en la UI.

### 2. Verificar el resultado del pago

```
GET /api/reservas/{id}/pago/datafast/status?resourcePath={resourcePath}
```

El *widget* de Datafast, tras el intento de pago, le da a la app un `resourcePath` (ej.
`/v1/checkouts/8ac7a4a1934.../payment`) — se lo mandamos tal cual al backend en el query param.

El backend:
1. Llama a Datafast:
   ```
   GET https://test.oppwa.com{resourcePath}?entityId={ENTITY_ID}
   Authorization: Bearer {ACCESS_TOKEN}
   ```
2. Interpreta `result.code` según los rangos de éxito documentados por Datafast (ej.
   `^(000\.000\.|000\.100\.1|000\.[36])` = exitoso/pendiente-revisión; cualquier otro código = rechazado).
3. **Si fue aprobado**, registra el pago en la reserva (mismo efecto que hoy tiene
   `POST /api/reservas/{id}/pago` con `tipo: "total"`) de forma atómica — no confiar en que el cliente
   llame después a otro endpoint para esto, porque un cliente malicioso podría nunca hacerlo o mentir el
   resultado.
4. Devuelve al cliente:
   ```json
   {
     "aprobado": true,
     "transactionId": "8ac7a4a1934....",
     "resultCode": "000.100.110",
     "mensaje": "Pago aprobado",
     "reserva": { "...": "mismo shape que ReservaResponse, ya con Pago actualizado" }
   }
   ```
   Si fue rechazado, `aprobado: false` y `mensaje` con el motivo (para mostrarlo tal cual en la UI de
   error).

### 3. Reverso / anulación del pago

Cuando un cliente cancela una reserva que ya pagó (`Reserva.EstadoPago == "pagado"`), hay que devolverle el
dinero contra Datafast, no solo cambiar el estado de la reserva en nuestra base.

```
POST /api/reservas/{id}/pago/datafast/reverso
```

Body:
```json
{ "motivo": "Cancelado por el cliente desde la app" }
```

El backend:
1. Busca la transacción original de Datafast asociada a esta reserva (el `transactionId`/`resultCode`
   crudo que se guardó en el paso 2 — de ahí la importancia de persistirlo).
2. Llama a Datafast:
   ```
   POST https://test.oppwa.com/v1/payments/{idDeLaTransaccionOriginal}
   Authorization: Bearer {ACCESS_TOKEN}
   Content-Type: application/x-www-form-urlencoded

   entityId={ENTITY_ID}
   amount={monto a reversar, formato "50.00"}
   currency=USD
   paymentType=RF
   ```
   **Nota:** la documentación de Datafast que revisamos solo confirma `paymentType=RF` (refund) como
   mecanismo de devolución — no documenta explícitamente un `RV` (reversal same-day) separado como sí
   existe en otras integraciones OPPWA. Si el equipo de backend necesita confirmar si aplica una distinción
   por ventana de tiempo antes/después del cierre de lote, o si se admiten reversos parciales, Datafast
   recomienda consultarlo directo: `servbdpago@datafast.com.ec`.
3. Si Datafast confirma el reverso (`result.code` exitoso), actualiza `Reserva.EstadoPago` a
   `"reembolsado"` (mismo efecto que `POST /api/reservas/{id}/pago` con `tipo: "reembolso"`, que ya existe
   hoy) — otra vez, esto debe pasar del lado del servidor, no confiar en que el cliente llame después a otro
   endpoint.
4. Devuelve al cliente el mismo shape que el endpoint de verificación (punto 2): `aprobado`,
   `transactionId`, `resultCode`, `mensaje`, `reserva` actualizada.

**Alternativa a considerar:** en vez de un endpoint separado que la app tenga que acordarse de llamar antes
de cancelar, el equipo de backend podría preferir disparar el reverso automáticamente **dentro de**
`POST /api/reservas/{id}/cancelar` cuando detecte que la reserva ya estaba pagada — así ninguna cancelación
(desde la app, desde un panel de anfitrión, o desde donde sea) puede quedar "cancelada pero sin devolver el
dinero" por un cliente que no llamó al endpoint de reverso. Si optan por ese camino, avísenos para no
duplicar la llamada desde el cliente (hoy la app llama primero al reverso y solo si tiene éxito llama a
cancelar, precisamente para evitar ese estado inconsistente mientras no exista el automatismo).

## Notas de seguridad / integridad

1. **`entityId`/`accessToken` de Datafast solo existen en el backend** (variables de entorno o
   equivalente), nunca en la respuesta de ningún endpoint hacia el cliente.
2. El monto que se manda a Datafast en el paso 1 **debe salir de la reserva en base de datos**, nunca de un
   parámetro que mande el cliente — evita que alguien manipule el monto a cobrar.
3. Guardar el `resultCode`/`transactionId` crudo de Datafast junto al pago, para poder auditar/conciliar
   después.
4. `merchantTransactionId` conviene que sea único por intento de pago (no reusar el mismo si el cliente
   reintenta tras un rechazo) — nosotros del lado del cliente vamos a pedir un checkout nuevo en cada
   reintento, así que esto ya queda resuelto si el backend genera uno nuevo por cada llamada al endpoint 1.

## Alcance PCI-DSS — por qué el backend tampoco debe tocar datos de tarjeta

Todo el flujo está diseñado para que **ni la app ni el backend reciban, procesen o almacenen datos de
tarjeta** (PAN completo, CVV, fecha de vencimiento) en ningún punto — eso es lo que nos mantiene en el nivel
más liviano de PCI-DSS (SAQ A) en vez de uno mucho más pesado. Esto aplica directo al diseño de los 3
endpoints de arriba:

1. **Endpoint 1 (crear checkout)**: el backend solo manda `amount`/`currency`/datos del cliente a Datafast —
   nunca recibe ni reenvía datos de tarjeta. La tarjeta la captura el *widget* de Datafast directo en el
   dispositivo del usuario, fuera de nuestro código.
2. **Endpoint 2 (verificar pago) y 3 (reverso)**: lo que Datafast devuelve trae metadata no sensible
   (últimos 4 dígitos, marca de tarjeta, `resultCode`) — nunca el PAN completo ni el CVV. Está bien
   persistir esa metadata (es lo que ya pedimos guardar para auditoría), **nunca** habría que persistir o
   loguear un PAN/CVV completo si en algún momento apareciera en algún payload (no debería, pero si backend
   ve algo así, es señal de que algo está mal configurado del lado de Datafast/el merchant y hay que
   frenarlo, no guardarlo).
3. Todo el tráfico hacia Datafast debe ser HTTPS (ya lo es: `test.oppwa.com`) y hacia nuestro propio backend
   también (ya lo es: `API_BASE_URL` de la app apunta a HTTPS).

Del lado de la app, esto ya se respeta: el `WebView` solo carga el widget real de Datafast (`paymentWidgets.js`)
y el único listener que tenemos (`onShouldStartLoadWithRequest`) mira la URL de redirección final, nunca el
contenido del formulario — no hay `injectedJavaScript` leyendo campos de tarjeta, ni logs del HTML del
WebView. Ojo con no romper esto a futuro (agregar inputs propios de tarjeta o inspeccionar el WebView nos
sacaría de este alcance liviano).

**Nota aparte, no bloqueante:** el certificado SAQ A en sí es un trámite del comercio (quien tiene la cuenta
Datafast) con su adquirente/QSA, no algo que se resuelva con código — este apartado documenta el diseño
técnico que lo hace posible, no reemplaza ese trámite.

## Lo que la app móvil ya tiene listo de su lado

- `src/config/paymentConfig.ts` → solo guarda el dominio público del widget (`https://test.oppwa.com`) y el
  `shopperResultUrl` (un scheme propio `appclientreactnative://payment-result` que el `WebView` intercepta
  localmente, nunca navega de verdad ahí).
- `src/services/datafast.service.ts` → llama a los tres endpoints de arriba (checkout, status y reverso).
- `src/components/payment/DatafastPaymentModal.tsx` → pide el `checkoutId` al backend, carga el widget real
  de Datafast (`paymentWidgets.js`) en un `WebView`, intercepta la redirección final para sacar el
  `resourcePath`, y llama al endpoint de verificación.
- `src/app/(tabs)/calendario.tsx` (`handleCancelar`) → si la reserva a cancelar tiene `estadoPago: "pagado"`
  y el proveedor activo es Datafast, llama primero al reverso y solo si tiene éxito llama a
  `POST /api/reservas/{id}/cancelar`.

Mientras estos tres endpoints no existan, el flujo de pago con Datafast en la app queda funcional del lado
del cliente pero sin poder completarse (el paso 1 fallará con lo que sea que devuelva hoy
`POST /api/reservas/{id}/pago/datafast/checkout`, casi seguro un 404 de ruta no encontrada) — y cancelar una
reserva pagada fallará también, a propósito, hasta que exista el reverso (para no dejar cancelaciones sin
devolver el dinero).

## Contexto

- Reemplaza el flujo 100% simulado que existía antes en `DatafastPaymentModal.tsx` (formulario propio +
  `setTimeout` decidiendo éxito/fallo por número de tarjeta), documentado en `PAYMENT_SETUP.md`.
- Documentación de Datafast: https://developers.datafast.com.ec/index.aspx
- Reportado desde: app-client-react-native, 2026-07-27.
