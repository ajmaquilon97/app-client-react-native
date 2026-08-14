# Requerimiento para backend: integración de pagos Datafast (UAT)

> Todo lo de este documento está **confirmado funcionando** contra el sandbox real de Datafast — cada
> request de acá abajo fue probado directo (bypaseando nuestro propio backend, solo como diagnóstico) y
> terminó en un pago/reverso aprobado real. La evidencia completa está en los Anexos, al final. Esto se puede
> implementar tal cual está documentado, sin necesidad de volver a investigar nada contra Datafast.

## Resumen

Vamos a conectar el pago de reservas con **Datafast**, modelo **Copy&Pay**: la app carga un *widget* de
Datafast dentro de un `WebView` para capturar la tarjeta (nuestro código nunca la toca), y backend hace 2
llamadas server-to-server a Datafast alrededor de eso — crear el checkout antes, y verificar el resultado
después. La anulación (cuando se cancela una reserva ya pagada) va dentro del endpoint de cancelar que ya
existe, no es un endpoint nuevo — ver el punto 3.

**El `entityId`/`Authorization` de Datafast nunca pueden vivir en la app móvil** — son credenciales que, si
se filtraran del bundle de la app (fácilmente extraíble de un APK/IPA), se podrían usar para generar cargos
fraudulentos. Por eso todas las llamadas a Datafast las hace el backend; la app solo le pide a backend el
`checkoutId` y, después, que verifique el resultado.

## Credenciales de sandbox (UAT)

```
Host:          https://eu-test.oppwa.com
entityId:      8a8294175f113aad015f11652f2200a5
Authorization: Bearer OGE4Mjk0MTg1YTY1YmY1ZTAxNWE2YzhjNzI4YzBkOTV8YmZxR3F3UTMyWA==
```

Son las credenciales de sandbox que Datafast publica en su propia documentación
(`https://developers.datafast.com.ec/index.aspx`, sección "Sandbox") — no son secretas, cualquiera las puede
usar para probar sin darse de alta como comercio todavía. Alcanza para implementar y probar los 2 endpoints
de abajo ya mismo. Cuando el comercio se registre con Datafast para certificación o producción, va a recibir
su propio `entityId`/`Authorization` — en ese momento esos valores sí van a ser secretos de verdad, pero la
arquitectura (backend medía, nunca el cliente) no cambia.

`customParameters[SHOPPER_MID]`/`[SHOPPER_TID]` (`1000000505`/`PD100406`) **no son credenciales** — son
parámetros de negocio que van dentro del body del checkout, tal como los usa el ejemplo oficial de Datafast.

---

## Requerimiento 1: Crear el checkout

```
POST /api/reservas/{id}/pago/datafast/checkout
```

Autenticado igual que el resto de `/api/reservas/*` (JWT del cliente dueño de la reserva).

**Lógica del backend:**
1. Buscar la reserva `{id}`; validar que exista, que pertenezca al usuario autenticado, y que su estado
   admita pago (`404`/`403`/`409` según corresponda — ver "Respuestas de error" abajo).
2. Tomar el monto de la reserva (`Reserva.Pago.Total` o el campo que corresponda) — **nunca** un monto que
   mande el cliente en el body.
3. Calcular el desglose de IVA ecuatoriano a partir de ese monto (ver fórmula abajo — **crítico**, si se
   calcula mal Datafast rechaza el checkout).
4. Llamar a Datafast:
   ```
   POST https://eu-test.oppwa.com/v1/checkouts
   Authorization: Bearer OGE4Mjk0MTg1YTY1YmY1ZTAxNWE2YzhjNzI4YzBkOTV8YmZxR3F3UTMyWA==
   Content-Type: application/x-www-form-urlencoded

   entityId=8a8294175f113aad015f11652f2200a5
   amount={monto de la reserva, formato "50.00"}
   currency=USD
   paymentType=DB
   customParameters[SHOPPER_MID]=1000000505
   customParameters[SHOPPER_TID]=PD100406
   customParameters[SHOPPER_PSERV]=17913101
   risk.parameters[USER_DATA2]=Sismetic
   customParameters[SHOPPER_VAL_BASE0]=0.00
   customParameters[SHOPPER_VAL_BASEIMP]={ver fórmula de IVA}
   customParameters[SHOPPER_VAL_IVA]={ver fórmula de IVA}
   customParameters[SHOPPER_VERSIONDF]=2
   merchantTransactionId={único por intento de pago, ej. GUID o timestamp}
   customer.merchantCustomerId={id del usuario/cliente}
   testMode=EXTERNAL
   ```
5. Devolver al cliente **solo** lo mínimo necesario:
   ```json
   { "checkoutId": "8ac7a4a1934...." }
   ```
   (el `checkoutId` es el campo `id` de la respuesta de Datafast)

### Fórmula del IVA (obligatoria, Datafast valida esto exacto)

Datafast exige que `SHOPPER_VAL_BASE0 + SHOPPER_VAL_BASEIMP + SHOPPER_VAL_IVA == amount`. `amount` es el
total **con IVA incluido** (12% en Ecuador), así que hay que desglosarlo hacia atrás:

```
base0   = 0.00
baseImp = round(amount / 1.12, 2)
iva     = round(amount - baseImp, 2)     // el RESTO, nunca round(amount * 0.12, 2)
```

Calcular `iva` como el resto de `amount - baseImp` (no como `baseImp * 0.12` por separado) es lo que
garantiza que la suma cierre exacta pese al redondeo a 2 decimales. Calcularlo mal da un rechazo
`800.100.199` / *"invalid tax number" — "Transaccion rechazada, valores mal calculados"* — nos pasó
probando, ver Anexo 1 para un ejemplo real de valores que sí cuadran (`58.04 + 0.00 + 6.96 = 65.00`).

### Respuestas de error esperadas por el cliente

- `404` — la reserva no existe o no pertenece al usuario autenticado.
- `409` — la reserva ya está pagada o en un estado que no admite pago (ej. `cancelada`).
- `400`/`502` — Datafast rechazó la creación del checkout — devolver el `message` legible que mandó Datafast
  para mostrarlo en la UI.

---

## Requerimiento 2: Verificar el resultado del pago

```
GET /api/reservas/{id}/pago/datafast/status?resourcePath={resourcePath}
```

El *widget* de Datafast, tras el intento de pago, le da a la app un `resourcePath` (ej.
`/v1/checkouts/8ac7a4a.../payment`) — la app se lo manda tal cual a este endpoint en el query param.

**Lógica del backend:**
1. Llamar a Datafast (mismo host/credenciales que el checkout):
   ```
   GET https://eu-test.oppwa.com{resourcePath}?entityId=8a8294175f113aad015f11652f2200a5
   Authorization: Bearer OGE4Mjk0MTg1YTY1YmY1ZTAxNWE2YzhjNzI4YzBkOTV8YmZxR3F3UTMyWA==
   ```
2. Interpretar `result.code` de la respuesta contra los rangos de éxito documentados por Datafast/OPPWA:
   ```
   éxito / pendiente-revisión:  ^(000\.000\.|000\.100\.1|000\.(3|6))
   cualquier otro código:       rechazado
   ```
   (nuestra prueba real dio `000.100.112`, ver Anexo 1)
3. **Si fue aprobado**, registrar el pago en la reserva de forma atómica en este mismo request (mismo efecto
   que `POST /api/reservas/{id}/pago` con `tipo: "total"` hoy) — **no** confiar en que el cliente llame
   después a otro endpoint para esto; un cliente malicioso podría mentir el resultado o nunca llamarlo.
4. Guardar el `id` (transactionId) y el `result.code` crudo de Datafast junto al pago — **el `id` hace
   falta después para poder anular el pago** (Requerimiento 3).
5. Devolver al cliente:
   ```json
   {
     "aprobado": true,
     "transactionId": "8ac7a4a1934....",
     "resultCode": "000.100.112",
     "mensaje": "Pago aprobado",
     "reserva": { "...": "mismo shape que ReservaResponse, ya con Pago actualizado" }
   }
   ```
   Si fue rechazado: `aprobado: false` y `mensaje` con el motivo que dio Datafast, para mostrarlo tal cual en
   la UI de error.

---

## Requerimiento 3: Anulación del pago (dentro de `POST /api/reservas/{id}/cancelar`)

**No es un endpoint nuevo** — según lo que confirmó el equipo de backend, la anulación va **embebida dentro
del endpoint de cancelar que ya existe**. Cuando se cancela una reserva con `EstadoPago == "pagado"`, antes
de marcarla como cancelada hay que devolverle el dinero al cliente contra Datafast.

**Lógica a agregar dentro de `POST /api/reservas/{id}/cancelar`:**
1. Si `Reserva.EstadoPago != "pagado"` → comportamiento actual, sin cambios (no hay nada que reversar).
2. Si `Reserva.EstadoPago == "pagado"`:
   a. Recuperar el `transactionId` de Datafast que se guardó en el Requerimiento 2, paso 4.
   b. Llamar a Datafast:
      ```
      POST https://eu-test.oppwa.com/v1/payments/{transactionId}
      Authorization: Bearer OGE4Mjk0MTg1YTY1YmY1ZTAxNWE2YzhjNzI4YzBkOTV8YmZxR3F3UTMyWA==
      Content-Type: application/x-www-form-urlencoded

      entityId=8a8294175f113aad015f11652f2200a5
      amount={monto pagado, formato "50.00" — el total, sin desglose de IVA}
      currency=USD
      paymentType=RF
      testMode=EXTERNAL
      ```
      A diferencia del checkout, **el reverso no lleva los `customParameters` de IVA/MID/TID** — con estos 5
      campos alcanza, confirmado (ver Anexo 2). `paymentType=RF` (refund) es el único mecanismo de devolución
      que documenta Datafast.
   c. Si Datafast aprueba (`result.code` en el mismo rango de éxito del Requerimiento 2), recién ahí:
      - Actualizar `Reserva.EstadoPago` a `"reembolsado"` (mismo efecto que
        `POST /api/reservas/{id}/pago` con `tipo: "reembolso"`, que ya existe hoy).
      - Marcar la reserva como cancelada (comportamiento actual del endpoint).
      - Guardar el `id` (nuevo, distinto al original) y `result.code` de este reverso para auditoría.
   d. Si Datafast **rechaza** el reverso, la reserva **no debe quedar cancelada** — devolver un error al
      cliente en vez de proceder, para no dejar una cancelación sin devolver el dinero.

No hace falta ningún cambio en el contrato (request/response) de `POST /api/reservas/{id}/cancelar` que ve
el cliente — esto es enteramente lógica interna nueva.

---

## Notas de seguridad / integridad

1. `entityId`/`Authorization` de Datafast solo existen en el backend (variables de entorno o equivalente) —
   nunca en la respuesta de ningún endpoint hacia el cliente.
2. El monto que se manda a Datafast (checkout y reverso) sale siempre de la reserva en base de datos, nunca
   de un parámetro que mande el cliente.
3. Guardar el `id`/`result.code` crudo de cada llamada a Datafast (checkout, verificación, reverso) junto al
   pago, para auditoría/conciliación — y porque el reverso necesita el `id` de la transacción original.
4. `merchantTransactionId` debe ser único por intento de pago — la app pide un checkout nuevo en cada
   reintento tras un rechazo, así que esto se resuelve solo si backend genera uno nuevo por cada llamada al
   Requerimiento 1.

## Alcance PCI-DSS — por qué el backend tampoco debe tocar datos de tarjeta

Ni la app ni el backend deben recibir, procesar o almacenar datos de tarjeta (PAN completo, CVV, fecha de
vencimiento) en ningún punto del flujo — eso es lo que mantiene esta integración en el nivel más liviano de
PCI-DSS (SAQ A) en vez de uno mucho más pesado:

- **Requerimiento 1**: el backend solo manda `amount`/parámetros de negocio a Datafast — nunca recibe ni
  reenvía datos de tarjeta. La tarjeta la captura el *widget* de Datafast directo en el dispositivo del
  usuario, fuera de nuestro código en ambos lados (app y backend).
- **Requerimientos 2 y 3**: lo que Datafast devuelve trae metadata no sensible (últimos 4 dígitos, marca de
  tarjeta, `resultCode`) — nunca el PAN completo ni el CVV. Esa metadata sí se puede guardar para auditoría;
  si en algún payload apareciera un PAN/CVV completo (no debería pasar nunca), es señal de una mala
  configuración del lado de Datafast/el merchant, y no debe guardarse ni loguearse.
- Todo el tráfico hacia Datafast y hacia nuestro propio backend debe ser HTTPS (ya lo es en ambos casos).

El certificado SAQ A en sí es un trámite del comercio (quien tiene la cuenta Datafast) con su
adquirente/QSA, no algo que se resuelva con código — este apartado documenta el diseño técnico que lo hace
posible, no reemplaza ese trámite.

## Estado del lado de la app móvil

Ya implementado y probado (contra el bypass directo, mientras backend no tenga los 2 endpoints):

- `src/config/paymentConfig.ts` — dominio del widget y el `shopperResultUrl` (scheme propio
  `datafast-checkout://payment-result` que el `WebView` intercepta localmente, nunca navega ahí de verdad —
  tiene que ser un scheme que la app NO tenga registrado en `app.json`, si no el sistema operativo lo
  resuelve como deep link real antes de que el `WebView` lo pueda interceptar).
- `src/services/datafast.service.ts` — llama a los Requerimientos 1 y 2. Ya no existe una función de
  reverso separada del lado del cliente — el reverso vive enteramente en backend, dentro de `cancelar`.
- `src/components/payment/DatafastPaymentModal.tsx` — pide el `checkoutId`, carga el widget real de
  Datafast en el `WebView`, intercepta la redirección final para sacar el `resourcePath`, y llama a
  verificación.
- `src/app/(tabs)/calendario.tsx` — el botón "Cancelar" llama directo a
  `POST /api/reservas/{id}/cancelar`, sin pasos intermedios — confía en que backend hace el reverso
  internamente cuando corresponde.
- `src/services/datafastDirectUat.ts` — el bypass temporal de diagnóstico que usamos para encontrar y
  confirmar todo lo de este documento (checkout, verificación y reverso directo contra Datafast, sin pasar
  por nuestro backend). Desactivado por defecto (toggle en `paymentConfig.ts`, con seguro para que nunca se
  active en un build de producción). Se puede borrar una vez que backend confirme que su implementación
  funciona con los datos de este documento.

**Importante:** hoy `paymentConfig.ts` sigue apuntando al host viejo (`test.oppwa.com`), porque nuestro
backend real, según sus logs, también estaba llamando a ese host. Cuando backend actualice al host correcto
(`eu-test.oppwa.com`) según este documento, avisen para actualizarlo en el mismo cambio — si no, el widget
va a intentar cargar un `checkoutId` que vive en un host distinto al que lo generó, y va a fallar.

## Contexto

- Reemplaza el flujo 100% simulado que existía antes en `DatafastPaymentModal.tsx` (formulario propio +
  `setTimeout` decidiendo éxito/fallo por número de tarjeta), documentado en `PAYMENT_SETUP.md`.
- Documentación de Datafast: https://developers.datafast.com.ec/index.aspx (sección "Sandbox" — ahí están
  los ejemplos de código reales de los que sale todo lo de este documento).
- Reportado desde: app-client-react-native. Primera versión 2026-07-27; checkout y verificación confirmados
  end-to-end 2026-07-29; reverso confirmado end-to-end y arquitectura de anulación (embebida en `cancelar`,
  no endpoint aparte) confirmada con backend el mismo día.

---

## Anexo 1: respuesta real de Datafast — pago aprobado

Verificación de pago (`GET {resourcePath}?entityId=...`) contra el sandbox real, capturada el 2026-07-29:

```json
{
  "amount": "65.00",
  "currency": "USD",
  "id": "8ac7a4a19fa30a2f019fac3ed80056a3",
  "ndc": "4D04B65804A690A88A15D6657FF0716E.uat01-vm-tx01",
  "merchantTransactionId": "29072026_1785301203335",
  "paymentBrand": "VISA",
  "paymentType": "DB",
  "descriptor": "2351.9718.1171 Sismetic",
  "card": {
    "bin": "420000",
    "binCountry": "US",
    "expiryMonth": "10",
    "expiryYear": "2030",
    "holder": "Obsidian Tech Lab",
    "last4Digits": "0000"
  },
  "customer": {
    "ip": "181.199.40.4",
    "ipCountry": "EC",
    "merchantCustomerId": "999999"
  },
  "customParameters": {
    "CTPE_DESCRIPTOR_TEMPLATE": "",
    "SHOPPER_EndToEndIdentity": "a4a84f90bcf0f480f3fc3b9045c01b8c6f326c1ba633ea4b846321c5f23efc1b",
    "SHOPPER_MID": "1000000505",
    "SHOPPER_PSERV": "17913101",
    "SHOPPER_TID": "PD100406",
    "SHOPPER_VAL_BASE0": "0.00",
    "SHOPPER_VAL_BASEIMP": "58.04",
    "SHOPPER_VAL_IVA": "6.96",
    "SHOPPER_VERSIONDF": "2"
  },
  "result": {
    "code": "000.100.112",
    "description": "Request successfully processed in 'Merchant in Connector Test Mode'"
  },
  "resultDetails": {
    "AcquirerCode": "01",
    "AcquirerResponse": "00_01MP",
    "AcquirerTimestamp": "2026-07-29 04:57:13",
    "AuthCode": "985384",
    "BatchNo": "260728",
    "CardType": "MP",
    "ConnectorTxID1": "8ac7a4a19fa30a2f019fac3ed80056a3",
    "ExtendedDescription": "Transaccion aprobada",
    "ReferenceNbr": "260728_000083",
    "ReferenceNo": "000083",
    "Response": "00",
    "TotalAmount": "65.00",
    "clearingInstituteName": "Datafast"
  },
  "risk": { "parameters": { "USER_DATA2": "Sismetic" }, "score": "0" },
  "threeDSecure": { "eci": "07" },
  "timestamp": "2026-07-29 05:00:27+0000",
  "buildNumber": "23fe882764f5285f123738a41063b6927eb88106@2026-07-24 07:24:36 +0000"
}
```

Puntos clave:
- `result.code: "000.100.112"` + `resultDetails.ExtendedDescription: "Transaccion aprobada"` → criterio de
  "pago aprobado" (Requerimiento 2, paso 2).
- `id` (`8ac7a4a19fa30a2f019fac3ed80056a3`) es el `transactionId` a guardar para poder anular después.
- `SHOPPER_VAL_BASEIMP` (58.04) + `SHOPPER_VAL_BASE0` (0.00) + `SHOPPER_VAL_IVA` (6.96) = `amount` (65.00)
  exacto — confirma la fórmula de IVA del Requerimiento 1.

## Anexo 2: respuesta real de Datafast — reverso aprobado

Anulación de la transacción del Anexo 1 (`8ac7a4a19fa30a2f019fac3ed80056a3`), capturada el mismo día:

```json
{
  "amount": "65.00",
  "currency": "USD",
  "id": "8ac7a49f9fa30a8b019fac41c1634920",
  "referencedId": "8ac7a4a19fa30a2f019fac3ed80056a3",
  "merchantTransactionId": "29072026_1785301203335",
  "ndc": "8a8294175f113aad015f11652f2200a5_f98fe7b44563425d932beab0eb139c65",
  "paymentType": "RF",
  "descriptor": "8779.6280.0371 Sismetic",
  "customer": { "merchantCustomerId": "999999" },
  "result": {
    "code": "000.100.112",
    "description": "Request successfully processed in 'Merchant in Connector Test Mode'"
  },
  "resultDetails": {
    "AcquirerResponse": "00_01MP",
    "AcquirerTimestamp": "2026-07-29 05:00:25",
    "AuthCode": "488692",
    "ConnectorTxID1": "8ac7a49f9fa30a8b019fac41c1634920",
    "ExtendedDescription": "Transaccion aprobada",
    "ReferenceNbr": "260728_000083",
    "clearingInstituteName": "Datafast"
  },
  "timestamp": "2026-07-29 05:03:39+0000",
  "buildNumber": "23fe882764f5285f123738a41063b6927eb88106@2026-07-24 07:24:36 +0000"
}
```

Puntos clave:
- `referencedId` apunta exacto al `id` de la transacción original del Anexo 1 — así liga Datafast el reverso
  con el pago que está devolviendo.
- El reverso tiene su **propio** `id` (`8ac7a49f9fa30a8b019fac41c1634920`), distinto al de la transacción
  original — es el que conviene guardar como referencia de este reembolso puntual.
- Mismo criterio de éxito que el pago: `result.code: "000.100.112"` + `ExtendedDescription: "Transaccion
  aprobada"`.
