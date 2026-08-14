# Descarga de factura electrónica — feedback para Frontend Mobile

> **Actualizado tras el addendum de Ángel.** La ruta cambió a **plural** y la respuesta ahora es un
> **arreglo plano** (antes era un objeto con envoltura). Si tomaste la versión anterior de este
> documento, revisa los puntos 1 y 4. El detalle del cambio está en
> [`backend-addendum-facturas-response.md`](./backend-addendum-facturas-response.md).

Ya pueden implementar el botón **"Descargar factura"** en el detalle de la reserva.
Compilado (`dotnet build` → 0 errores) y con las migraciones aplicadas.

Además, el backend **manda cada comprobante por correo automáticamente** apenas el SRI lo autoriza,
así que la descarga desde la app es un complemento, no el único canal.

---

## 1. `GET /api/mobile/reservas/{reservaId}/facturas`

Devuelve un **arreglo** con las facturas **autorizadas** de una reserva y sus URLs de descarga.

**Auth**: JWT normal de Cliente en el header `Authorization: Bearer <token>`.
El backend valida que `Reserva.UsuarioId == sub` del token. Si la reserva es de otro usuario
responde `403`, aunque el `reservaId` exista y sea válido.

### Respuesta `200 OK` — contrato exacto

```json
[
  {
    "facturaId": "6f2a0c31-8d4e-4b0a-9f11-2c7e5a0b91d3",
    "reservaId": 154,
    "codigoReserva": "RES-06082026-28-154",
    "tipoFactura": "reserva_espacio",
    "descripcion": "Alquiler del espacio",
    "emisorRazonSocial": "AGORA ESPACIOS S.A.",
    "emisorNombreComercial": "Quinta Los Almendros",
    "numeroComprobante": "001-001-000000019",
    "claveAcceso": "0608202601120516292600110010010000000191234567819",
    "numeroAutorizacion": "0608202601120516292600110010010000000191234567819",
    "fechaAutorizacion": "2026-08-06T15:22:31",
    "subtotal": 43.48,
    "iva": 6.52,
    "total": 50.00,
    "pdfUrl": "https://agora-espacios-dev.s3.us-east-1.amazonaws.com/facturas/1205162926001/001-001-000000019.pdf?X-Amz-Signature=...",
    "xmlUrl": "https://agora-espacios-dev.s3.us-east-1.amazonaws.com/facturas/1205162926001/001-001-000000019.xml?X-Amz-Signature=...",
    "urlsExpiranEnSegundos": 3600,
    "nombreArchivoPdf": "factura-001-001-000000019.pdf",
    "nombreArchivoXml": "factura-001-001-000000019.xml"
  }
]
```

### Campos (todos por elemento del arreglo)

| Campo | Tipo | Notas |
|---|---|---|
| `facturaId` | `string (uuid)` | |
| `reservaId` | `int` | El mismo que mandaron en la ruta. |
| `codigoReserva` | `string` | Código legible (`RES-ddMMyyyy-espacio-id`). |
| `tipoFactura` | `string` | `"fee_plataforma"` o `"reserva_espacio"`. |
| `descripcion` | `string` | El tipo ya traducido a lenguaje de usuario — úsenlo tal cual, no traduzcan el enum en el cliente. |
| `emisorRazonSocial` | `string` | Emisor legal. **Es el mismo en las dos facturas** (ver punto 2). |
| `emisorNombreComercial` | `string \| null` | **Este sí distingue una factura de otra.** Es lo que conviene mostrar como título. |
| `numeroComprobante` | `string` | Formato SRI `EEE-PPP-SSSSSSSSS`. |
| `claveAcceso` | `string` | 49 dígitos. Útil si quieren ofrecer "consultar en el SRI". |
| `numeroAutorizacion` | `string \| null` | |
| `fechaAutorizacion` | `string \| null` | ISO-8601 **sin sufijo de zona, el valor está en UTC**. Para hora de Ecuador resten 5 horas. |
| `subtotal` | `number` | Sin IVA. |
| `iva` | `number` | IVA 15%. |
| `total` | `number` | `subtotal + iva`. Lo que el cliente pagó por ese concepto. |
| `pdfUrl` | `string \| null` | URL pre-firmada del RIDE. Ver punto 3. |
| `xmlUrl` | `string \| null` | URL pre-firmada del XML autorizado. Ver punto 3. |
| `urlsExpiranEnSegundos` | `int` | Vigencia de las dos URLs. Hoy `3600`. |
| `nombreArchivoPdf` | `string` | Nombre sugerido al guardar/compartir. |
| `nombreArchivoXml` | `string` | Idem para el XML. |

---

## 2. Una reserva tiene **dos** facturas, no una

Cada reserva pagada emite dos comprobantes independientes:

- `reserva_espacio` → el alquiler del espacio (lo que cobra el anfitrión).
- `fee_plataforma` → la comisión de servicio de Agora.

No sumen ni escojan una sola: listen las dos, cada una con su `total` y su propio botón de descarga.
Si llega un solo elemento (por ejemplo, porque la comisión fue 0), pinten solo esa.

**Para el título de cada fila usen `emisorNombreComercial`, no `emisorRazonSocial`.** Los dos
comprobantes se firman con el mismo certificado, y el SRI exige que la razón social corresponda al
RUC del firmante — así que el emisor legal es la plataforma en ambos casos y `emisorRazonSocial`
sale idéntico. El que cambia es `emisorNombreComercial`: el anfitrión en la factura del espacio, la
marca Agora en la del fee. Es también lo que imprime el RIDE como encabezado.

El arreglo viene ordenado de la factura **más reciente a la más antigua** por fecha de emisión.

---

## 3. Las URLs son pre-firmadas y caducan

`pdfUrl` y `xmlUrl` son URLs pre-firmadas de S3 con **1 hora de vigencia** (el valor exacto está en
`urlsExpiranEnSegundos`, léanlo de ahí en vez de hardcodear 3600).

- **No cacheen las URLs** en AsyncStorage ni en el estado global. Llamen al endpoint en el momento
  en que el usuario toca "Descargar factura".
- Si la pantalla quedó en memoria y el usuario vuelve más de una hora después, vuelvan a pedir el
  endpoint antes de abrir el enlace.
- Si S3 responde `403` con un XML de error, es que expiró: repitan el `GET` y reintenten.
- **No manden el header `Authorization` al descargar de S3** — la firma va en la propia URL, y
  agregar el header puede hacer fallar la petición.

`xmlUrl` puede llegar en `null` en casos residuales (facturas viejas cuyo XML no alcanzó a subirse a
S3). `pdfUrl` es el que importa para el usuario final: si `xmlUrl` viene null, oculten esa opción en
vez de mostrar un botón roto. Traten ambos campos como opcionales.

---

## 4. Errores

| Código | Cuándo | Body |
|---|---|---|
| `400` | Las facturas todavía se están procesando en el SRI. | `{ "message": "Tus facturas aún se están procesando en el SRI. Inténtalo de nuevo en unos minutos." }` |
| `400` | El SRI las rechazó y no hay comprobante que descargar. | `{ "message": "Las facturas de esta reserva no pudieron ser autorizadas por el SRI. Contacta al anfitrión del espacio." }` |
| `401` | Falta o expiró el JWT. | — |
| `403` | La reserva existe pero es de otro usuario. | — |
| `404` | No existe una reserva con ese ID. | `{ "message": "No existe una reserva con ese ID." }` |
| `404` | La reserva existe pero todavía no generó facturas (típicamente porque no está pagada). | `{ "message": "Esta reserva todavía no tiene facturas emitidas." }` |

Los dos `400` y los dos `404` se distinguen solo por el `message`, que ya viene redactado para
mostrarse al usuario tal cual.

**Sugerencia de UX**: el `400` de "aún se están procesando" no es un error del usuario — muéstrenlo
como estado ("tu factura se está generando") con opción de reintentar, no como toast rojo. La
autorización del SRI tarda típicamente entre 10 y 60 segundos desde que se aprueba el pago, así que
ese `400` es esperable si el usuario entra al detalle inmediatamente después de pagar.

---

## 5. Correo automático (no requiere nada del cliente)

Apenas el SRI autoriza cada factura, el backend le manda al cliente un correo con el **PDF (RIDE) y
el XML adjuntos**, más enlaces de respaldo por si el servidor de correo recorta los adjuntos.

Asunto: `Tu factura de {razón social del emisor} — Reserva {código}`.

El destinatario es el correo de facturación que el cliente indicó al reservar (`facturacion.correo`
del `POST /api/reservas`); si esa reserva no lo trae, se usa el email de la cuenta. **Son dos
correos por reserva**, uno por comprobante.

Esto es transparente para la app: no hay que llamar a nada. Solo tenlo en cuenta para el copy —
pueden decir algo como *"También te la enviamos por correo"*.

---

## 6. Endpoints relacionados

- **`GET /api/reservas/{id}/factura`** — solo el **estado** de la facturación, sin URLs de descarga:
  `Procesando` / `Recibida` / `Autorizada` / `Devuelta` / `No autorizada` / `Error`, más
  `motivoRechazo`. Sirve para decidir si el botón de descarga va habilitado o en espera, sin gastar
  una firma de URL.
- **`GET /api/facturas`** — panel financiero del Anfitrión (web, no móvil). Incluye `emailEnviado` y
  `fechaEnvioEmail`.

El endpoint del punto 1 es el que hay que llamar cuando el usuario efectivamente toca "Descargar".
