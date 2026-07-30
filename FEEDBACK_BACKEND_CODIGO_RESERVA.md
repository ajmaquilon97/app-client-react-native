# Feedback para backend: código de reserva legible en ReservaResponse

## Resumen

En "Mis Reservas" queremos mostrarle al usuario un código de reserva identificable (para que lo pueda dar
de referencia al llegar al espacio, en soporte, etc.), no un ID técnico interno. Hoy `ReservaResponse` solo
trae `id` (entero autoincremental de base de datos) — no hay ningún campo pensado para mostrarse al usuario
como código de reserva.

## Lo que pedimos

Agregar un campo nuevo a `ReservaResponse`, por ejemplo `codigoReserva` (string), generado por backend al
crear la reserva. No es estrictamente necesario que sea único a nivel global si `id` ya lo es — alcanza con
que sea legible, por ejemplo:

```json
{
  "id": 123,
  "codigoReserva": "RES-000123",
  "...": "resto de los campos igual que hoy"
}
```

El formato exacto (prefijo, longitud, si incluye la fecha, etc.) queda a criterio de backend — desde la app
solo necesitamos un string corto para mostrarlo tal cual.

## Estado del lado de la app móvil

Mientras este campo no exista, `src/app/(tabs)/calendario.tsx` muestra un código provisorio armado en el
cliente a partir del `id` (`Reserva #` + `id` con padding a 6 dígitos, ej. `Reserva #000123`) — es solo un
formato visual local, no reemplaza un código real de backend. Apenas `ReservaResponse` exponga
`codigoReserva`, avisen para que la app lo consuma directo en vez de derivarlo del `id`.

## Contexto

- Reportado desde: app-client-react-native. 2026-07-29.
