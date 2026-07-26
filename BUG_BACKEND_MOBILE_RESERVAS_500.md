# Bug reportado: POST /api/mobile/reservas

## Estado

- ✅ **Resuelto**: el 500 original (columna `Codigo` nula) — confirmado el 2026-07-26, `POST /api/mobile/reservas` ya crea la reserva correctamente (200), `cliente.id` coincide con el usuario del JWT, y `GET /reservas/mias`, `GET /reservas/{id}` y `POST /reservas/{id}/cancelar` funcionan bien como cliente.
- ⚠️ **Nuevo bug encontrado en el mismo flujo**: la reserva se crea con el monto total sin definir, lo que bloquea el pago (`POST /reservas/{id}/pago`). Ver sección "Bug 2" más abajo.

## Bug 1 (resuelto): 500 por columna `Codigo` nula

El endpoint devolvía **500 Internal Server Error** con cualquier body válido. Confirmado con 3 variantes distintas del payload — no era un problema de shape/validación del lado del cliente.

## Causa raíz (extraída de `GET /api/logs`)

```
2026-07-25 20:21:06.311 -07:00 [ERR] Error no controlado procesando POST /api/mobile/reservas
Microsoft.EntityFrameworkCore.DbUpdateException: An error occurred while saving the entity changes. See the inner exception for details.
 ---> Microsoft.Data.SqlClient.SqlException (0x80131904): Cannot insert the value NULL into column 'Codigo', table 'db_acb096_reservas.dbo.RES_Reservas'; column does not allow nulls. INSERT fails.
   ...
   at ApiTesis.Repositories.ReservasRepository.CreateAsync(Reservas reserva) in C:\Users\PCKelly\source\repos\ApiReservas\Repositories\ReservasRepository.cs:line 30
   at ApiTesis.Services.ReservasService.CrearComoClienteAsync(ReservaRequest request, String usuarioId) in C:\Users\PCKelly\source\repos\ApiReservas\Services\ReservasService.cs:line 87
   at ApiTesis.Controllers.ReservasController.CrearComoCliente(ReservaRequest request) in C:\Users\PCKelly\source\repos\ApiReservas\Controllers\ReservasController.cs:line 168
```

`ReservasService.CrearComoClienteAsync` (línea 87) construye la entidad `Reservas` sin asignarle un valor a `Codigo` antes de guardarla. La columna `Codigo` en `RES_Reservas` no permite `NULL`, así que el `INSERT` falla siempre. El flujo original del anfitrión (`POST /api/reservas`) sí genera ese código — `CrearComoClienteAsync` parece ser una copia que se saltó ese paso.

## Reproducción

Usuario `Cliente` real, contra un espacio activo con tarifa configurada:

```bash
POST /api/mobile/reservas
{
  "espacioId": 18,
  "usuarioId": "<id del cliente autenticado>",
  "fechaInicio": "2026-07-29T09:00:00",
  "fechaFin": "2026-07-29T11:00:00",
  "totalHoras": 2
}
```

```json
HTTP 500
{ "message": "Ha ocurrido un error interno. Intenta de nuevo más tarde." }
```

Probado también sin `totalHoras` y con `usuarioId` dummy (`00000000-0000-0000-0000-000000000000`) — mismo error en los tres casos, confirmando que la causa es el `Codigo` faltante, no el body enviado.

## Lo que pedimos

Generar el `Codigo` de la reserva en `CrearComoClienteAsync` antes de guardarla — igual que ya lo hace el flujo de creación del anfitrión (mismo formato de código, para no romper nada que ya lo consuma, ej. `RES-XXXXXX`).

## Nota adicional (menor, no bloqueante)

Aunque el summary del endpoint dice *"cualquier `usuarioId` enviado en el body es ignorado"*, la validación del modelo igual exige que el campo esté **presente** — omitirlo por completo da `400 { "errors": { "usuarioId": ["The UsuarioId field is required."] } }`. Confirmado que sigue así tras el fix. Si de verdad se ignora su valor, sugerimos quitarle el `[Required]` (o equivalente) para que el cliente pueda omitirlo directamente en vez de mandar un GUID descartable solo para pasar la validación.

## Bug 2 (nuevo, bloqueante): la reserva se crea sin `Total`, y eso bloquea el pago

### Reproducción

```bash
POST /api/mobile/reservas
{
  "espacioId": 18,
  "usuarioId": "<id del cliente autenticado>",
  "fechaInicio": "2026-07-30T09:00:00",
  "fechaFin": "2026-07-30T11:00:00",
  "totalHoras": 2
}
```

Respuesta `200`, pero con el desglose de pago vacío:

```json
{
  "id": 5,
  "estado": "pendiente",
  "estadoPago": "pendiente",
  "pago": { "total": null, "pagado": 0, "pendiente": 0, "fechaUltimoPago": null },
  "...": "..."
}
```

Al intentar registrar el pago de esa misma reserva:

```bash
POST /api/reservas/5/pago
{ "monto": 16.0, "tipo": "total", "notas": "..." }
```

```json
HTTP 409
{ "message": "La reserva no tiene un monto total definido." }
```

### Causa probable

`ReservaRequest` (el body de `POST /api/mobile/reservas`) no tiene ningún campo `total`/`monto` — y no debería tenerlo, el precio no debe venir del cliente. El monto total tiene que calcularlo el propio backend al crear la reserva, con la misma lógica que ya usa `GET /api/mobile/espacios/{espacioId}/disponibilidad` para resolver la tarifa de una fecha puntual (`tarifa.precio × totalHoras`, más lo que corresponda de reglas de negocio). Todo indica que `CrearComoClienteAsync` guarda la reserva sin ese cálculo — mismo patrón que el Bug 1: un paso que sí hace el flujo del anfitrión pero que se salteó en la copia para el cliente.

### Lo que pedimos

Que `CrearComoClienteAsync` calcule y guarde el `Total` de la reserva (misma jerarquía de precio que ya usa `TarifaHoy`/`disponibilidad`, evaluada en `FechaInicio`, multiplicada por `TotalHoras`) antes de guardarla, para que `POST /{id}/pago` deje de rechazarla por falta de monto.

## Contexto

- Relacionado con `FEEDBACK_BACKEND_RESERVAS_CLIENTE.md` (pedido original) y `FEEDBACK_BACKEND_DISPONIBILIDAD.md` (ya funciona correctamente — verificado con y sin tarifa configurada).
- `GET /api/mobile/espacios/{espacioId}/disponibilidad` **sí funciona bien**, no está afectado por este bug.
- Reportado desde: app-client-react-native, 2026-07-25.
