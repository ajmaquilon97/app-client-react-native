# Feedback para backend: tarifario por fecha + disponibilidad horaria para móvil

## Resumen

En el Detalle de Espacio necesitamos que el usuario elija **día y hora (desde–hasta)** para su reserva, viendo el precio real de ese día y qué horas ya están ocupadas. Igual que con `GET /api/mobile/espacios`, los endpoints que ya existen para esto (`GET /api/espacios/{id}/tarifas` y `GET /api/availability`) están restringidos al dueño/admin — un usuario `Cliente` recibe **403** al consultarlos sobre un espacio que no le pertenece.

## Reproducción

Usuario `Cliente` recién registrado (no dueño), sobre un espacio activo real:

```bash
GET /api/espacios/{espacioId}/tarifas
→ 403 { "message": "No tienes permisos para realizar esta acción." }

GET /api/availability?fechaInicio=2026-07-27&fechaFin=2026-07-27&espacioId={espacioId}
→ 403 { "message": "No tienes permisos para realizar esta acción." }
```

Ambos con el mismo patrón que ya vimos antes: la lógica de negocio está bien, pero estos endpoints fueron pensados para que el **dueño** administre su propio espacio, no para que un cliente consulte el de otro antes de reservar.

## Lo que pedimos

Un endpoint móvil (mismo espíritu que `GET /api/mobile/espacios`), de **lectura pública para cualquier usuario autenticado**, que dado un `espacioId` y una `fecha`, devuelva en una sola llamada:

1. **El precio real de esa fecha** (no solo "hoy"): resolviendo la misma jerarquía que ya usa `tarifaHoy` — promoción > fecha especial > override por día de la semana > precio base de la modalidad `hora`.
2. **El estado de cada hora del día** (`available`, `blocked`, `reserved`, `closed`, `maintenance`), igual que ya calcula `GET /api/availability` internamente, para poder deshabilitar en la UI las horas que ya no se pueden reservar.

Ejemplo de shape sugerido:

```
GET /api/mobile/espacios/{espacioId}/disponibilidad?fecha=2026-07-27

{
  "espacioId": 7,
  "fecha": "2026-07-27",
  "tarifa": { "modalidad": "Hora", "precio": 8.0, "unidad": "hora", "esPromocion": false },
  "horas": [
    { "hora": 7, "estado": "available" },
    { "hora": 8, "estado": "reserved" },
    ...
  ]
}
```

La escritura (`PUT /api/espacios/{id}/tarifas`, `POST /api/availability/block`, etc.) no cambia — sigue restringida al dueño/admin. Este pedido es solo para lectura, para el flujo de reserva en móvil.

## Mientras tanto

Implementamos el selector de día + hora (desde–hasta) en la app usando `tarifaHoy` (de `/api/mobile/espacios`) como precio de referencia, **válido solo cuando el día elegido es hoy** — la UI muestra una advertencia cuando el usuario elige otro día. No hay bloqueo de horas ya ocupadas todavía, porque no tenemos esa información sin este endpoint.

## Contexto

- Relacionado con `FEEDBACK_BACKEND_TARIFAS.md` (mismo tipo de restricción, resuelta ahí para el listado con `/api/mobile/espacios`).
- Código relevante: `src/components/space/SpaceDetailSheet.tsx`, `src/components/space/DaySelector.tsx`, `src/components/space/HourRangeSelector.tsx`.
- Reportado desde: app-client-react-native, 2026-07-27.
