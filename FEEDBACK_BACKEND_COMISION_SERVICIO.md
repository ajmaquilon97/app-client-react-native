# Feedback para backend: comisión de servicio del 10% en el monto de la reserva

## Resumen

La app ya muestra en el detalle del espacio un desglose de "Subtotal", "Comisión de servicio (10%)" y
"Total a pagar", sumando un 10% al precio del espacio como ganancia de la plataforma. Ese cálculo hoy
**solo existe en el frontend** (`SERVICE_FEE_RATE` en `src/config/paymentConfig.ts`), únicamente para
pintar el desglose *antes* de crear la reserva.

Necesitamos que backend aplique ese mismo 10% al calcular `pago.total` de la reserva, porque el monto que
realmente se cobra en la pasarela (Datafast/Kushki) sale siempre de `Reserva.pago.total` en base de datos
— nunca de un valor que mande el cliente (mismo criterio de seguridad ya acordado en
`FEEDBACK_BACKEND_DATAFAST.md` → "Notas de seguridad").

## Por qué hace falta el cambio

- `POST /api/reservas` (crear reserva) hoy calcula `pago.total` como `precio_tarifa * totalHoras`, sin
  comisión.
- El checkout de Datafast (`POST /{id}/pago/datafast/checkout`) y el registro de pago de Kushki
  (`POST /{id}/pago`) usan ese mismo `pago.total` como el monto a cobrar.
- Si backend no suma el 10%, el desglose que ve el usuario en la app ("Total a pagar: $X + 10%") **no va a
  coincidir** con lo que efectivamente se le cobra (`$X` sin comisión) — inconsistencia visible para el
  usuario y, más importante, la plataforma no está cobrando su comisión.

## Lo que pedimos

Al calcular `pago.total` (tanto al crear la reserva como en cualquier recálculo), aplicar:

```
subtotal = precio_tarifa * totalHoras
comision = round(subtotal * 0.10, 2)
total    = subtotal + comision
```

- El `0.10` debería quedar como una constante/config del lado de backend (no hardcodeada en múltiples
  lugares), por si el porcentaje cambia a futuro.
- `ReservaResponse.pago` debería seguir exponiendo `total` como hoy (el monto final con comisión incluida).
  Si backend quiere exponer también el desglose (`subtotal`/`comision`) en el mismo response, la app lo
  puede consumir para reemplazar el cálculo local, pero no es estrictamente necesario — con que `pago.total`
  ya venga con el 10% aplicado alcanza para que el cobro sea correcto.
- Aplica igual al reverso/cancelación (`POST /{id}/cancelar`): el monto a devolver contra Datafast
  (Requerimiento 3 de `FEEDBACK_BACKEND_DATAFAST.md`) debe ser el `pago.total` ya con comisión, no el
  subtotal sin ella — para devolver exactamente lo que se cobró.

## Estado del lado de la app móvil

- `src/config/paymentConfig.ts` — `SERVICE_FEE_RATE = 0.1`, documentado como temporal hasta que backend
  aplique el mismo cálculo.
- `src/components/space/SpaceDetailSheet.tsx` — desglose visual (Subtotal / Comisión / Total) calculado
  localmente con `SERVICE_FEE_RATE`, solo para la pantalla de reserva antes de crearla.
- Una vez creada la reserva, la app **ya usa `reserva.pago.total` de backend** como el total real a cobrar
  (`PaymentModal` en `SpaceDetailSheet.tsx`) — apenas backend sume el 10% ahí, el resto del flujo de pago
  no necesita ningún cambio adicional en el cliente.

## Contexto

- Reportado desde: app-client-react-native. 2026-07-29.
