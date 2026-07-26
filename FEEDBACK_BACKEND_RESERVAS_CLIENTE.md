# Feedback para backend: APIs de reservas para clientes (no solo anfitriones)

## Resumen

Todos los endpoints de `/api/reservas` que existen hoy están diseñados para que el **anfitrión** administre las reservas de **sus propios espacios** (confirmar, cancelar, registrar pago, ver el listado). No hay ningún endpoint pensado para que un **Cliente** cree o gestione **su propia** reserva sobre el espacio de otra persona — que es exactamente el flujo principal de la app móvil (un cliente busca un espacio, elige día/hora y reserva).

Ya construimos en la app la pantalla de selección de día + hora (desde–hasta) para el Detalle de Espacio; nos falta conectarla a una API real de creación de reserva, y hoy no existe una que un Cliente pueda usar.

## Reproducción

Usuario `Cliente` recién registrado, reservando un espacio que no le pertenece:

```bash
POST /api/reservas
{
  "espacioId": 7,
  "usuarioId": "<id del cliente autenticado>",
  "fechaInicio": "2026-07-28T09:00:00",
  "fechaFin": "2026-07-28T11:00:00",
  "totalHoras": 2
}
```

```json
HTTP 403
{ "message": "No tienes permisos para realizar esta acción." }
```

```bash
GET /api/reservas
```

```json
HTTP 200
{ "content": [], "totalElements": 0, "totalPages": 0, "number": 0 }
```

El `GET` no da error, pero devuelve vacío porque filtra por "espacios del anfitrión autenticado" — este Cliente no es dueño de ningún espacio, así que nunca vería sus propias reservas ahí, ni aunque las pudiera crear.

## Lo que pedimos

El flujo completo de reserva desde la perspectiva del **cliente que reserva**, análogo al que ya existe para el anfitrión que administra:

### 1. Crear mi reserva
`POST /api/reservas` (o un endpoint dedicado, ej. `POST /api/mobile/reservas`) que permita a **cualquier usuario autenticado** reservar un espacio activo que no le pertenece, siempre que:
- El rango `fechaInicio`–`fechaFin` no se solape con otra reserva activa del mismo espacio (misma validación que ya existe en `POST /api/reservas/{id}/reagendar`).
- `usuarioId` se derive del JWT (`claim sub`), **ignorando** cualquier valor que mande el cliente — mismo patrón que ya usan como `propietarioId` en `GET /api/reservas` ("ignorado; el propietario efectivo es siempre el usuario autenticado").

El shape de `ReservaRequest` (`espacioId`, `fechaInicio`, `fechaFin`, `totalHoras`) ya encaja perfecto con lo que la UI de móvil captura (día + hora desde/hasta) — no hace falta cambiarlo, solo la regla de autorización.

### 2. Ver mis propias reservas
Un endpoint (ej. `GET /api/reservas/mias` o un parámetro en el `GET /api/reservas` existente) que devuelva las reservas donde `usuarioId == sub` del JWT, sin importar quién sea el dueño del espacio. Hoy `GET /api/reservas` solo sirve para el caso "anfitrión viendo reservas de sus espacios".

### 3. Ver el detalle de mi reserva
`GET /api/reservas/{id}` debería permitir también al cliente dueño de esa reserva (no solo al anfitrión del espacio) ver su detalle — hoy da 403 si `La reserva no pertenece a un espacio del usuario autenticado`, pero no contempla que el usuario autenticado sea el cliente que la hizo.

### 4. Cancelar mi reserva
`POST /api/reservas/{id}/cancelar` debería permitir también al cliente dueño de la reserva cancelarla (con el mismo `Motivo` mínimo 5 caracteres que ya exige), no solo al anfitrión.

### 5. Registrar mi pago
`POST /api/reservas/{id}/pago` debería permitir al cliente registrar el pago de **su propia** reserva (`Monto`, `Tipo: total`) inmediatamente después de crearla — hoy esto también está restringido al anfitrión, y sin esto no podemos cerrar el flujo de pago (Datafast/Kushki) contra una reserva real.

## Lo que debe seguir igual (no tocar)

- `POST /api/reservas/{id}/confirmar` y `POST /api/reservas/{id}/asistencia`: son acciones operativas del anfitrión (confirmar que acepta la reserva, marcar asistencia física) — correcto que sigan restringidas a él.
- `POST /api/reservas/{id}/reagendar`: por ahora lo dejamos como acción de anfitrión también, salvo que backend prefiera extenderlo igual que cancelar.
- Toda la gestión de tarifas, disponibilidad y edición de espacios (ya cubierta en `FEEDBACK_BACKEND_TARIFAS.md` y `FEEDBACK_BACKEND_DISPONIBILIDAD.md`).

## Contexto

- Relacionado con `FEEDBACK_BACKEND_TARIFAS.md` y `FEEDBACK_BACKEND_DISPONIBILIDAD.md` — mismo patrón recurrente: los endpoints existentes fueron diseñados para el dueño/anfitrión, y la app de clientes necesita su propia vía de lectura/escritura acotada a "lo mío".
- Código relevante en la app: `src/components/space/SpaceDetailSheet.tsx` (selección de día/hora ya lista, pendiente de conectar `handleReservar`/`handlePaymentSuccess` a una API real en vez de `ReservationsContext` local), `src/components/payment/PaymentModal.tsx`.
- Reportado desde: app-client-react-native, 2026-07-27.
