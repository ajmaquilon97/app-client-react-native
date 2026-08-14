# Feedback para backend: soporte de `cupo_compartido` (piscinas) en `/api/mobile/*`

## Resumen

El negocio definió que la app debe soportar 3 tipos de espacio (canchas, salones,
piscinas) con dos modelos de reserva ("archetypes"):

- `franja_exclusiva` (canchas, salones) — el cliente ocupa el espacio completo por un
  rango de horas exclusivo. **Ya funciona hoy, sin cambios.**
- `cupo_compartido` (piscinas) — el cliente compra N entradas para un día, sin franja
  horaria, compartiendo un aforo máximo con otros clientes. **No funciona con el flujo
  actual de `/api/mobile/*`.**

Este pedido es la contraparte formal, del lado mobile, de
`docs/instrucciones-equipo-mobile-modalidades-reserva.md` (redactado por el equipo
Web/Anfitriones el 2026-08-04), que a su vez coordina con lo que ese mismo equipo ya
pidió a Backend en `docs/backend-espacios-archetypes-spec.md`. **No duplicamos ese
pedido** — este documento cubre específicamente lo que falta en los endpoints
`/api/mobile/*` que consume esta app.

Ya adaptamos el lado de la app móvil para soportar `cupo_compartido` (ver "Estado del
lado de la app móvil" abajo), pero **sin los cambios de este documento, un intento real
de reservar una piscina puede seguir fallando** (validación de solape no condicional al
archetype, `pax` no aceptado en `ReservaRequest`). La app queda lista para funcionar en
cuanto Backend confirme — no garantizamos el flujo end-to-end todavía.

## Lo que pedimos

### 1. `modalidadReserva` en `EspacioMobileResponse`

`GET /api/mobile/espacios` y el detalle de disponibilidad hoy traen `tipoEspacioId` /
`tipoEspacioNombre`, pero no el código del tipo ni la modalidad de reserva. Sin esto, la
app no puede decidir con certeza qué UI mostrar (hoy lo inferimos por
`tipoEspacioNombre`, ver más abajo).

```jsonc
{
  "id": 12,
  "titulo": "Piscina Los Ceibos",
  "tipoEspacioId": 3,
  "tipoEspacioNombre": "Piscinas",
  "modalidadReserva": "cupo_compartido", // NUEVO — "franja_exclusiva" | "cupo_compartido"
  // ...resto de EspacioMobileResponse sin cambios
}
```

### 2. Respuesta de aforo para mobile (equivalente a `GET /api/aforo` del panel web)

Para reemplazar el bloque `horas: HoraEstadoDto[]` cuando el espacio sea
`cupo_compartido` (esa grilla no tiene sentido para piscinas — el cliente necesita saber
"¿cuántas entradas quedan?", no "¿qué hora está libre?"):

```
GET /api/aforo?espacioId={id}&fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
GET /api/aforo/dia?espacioId={id}&fecha=YYYY-MM-DD
```

con el shape ya propuesto en `docs/backend-espacios-archetypes-spec.md` §2:

```jsonc
{ "fecha": "2026-08-10", "capacidadTotal": 80, "vendida": 32, "disponible": 48 }
```

Nos sirve reusar el mismo endpoint que ya se pidió para el panel de anfitriones — no
hace falta una versión mobile-específica, siempre que acepte el JWT de cliente (no solo
el de anfitrión) para espacios ajenos (el cliente consulta aforo de espacios que no le
pertenecen, a diferencia del anfitrión).

### 3. Campo `pax` en `ReservaRequest`

Hoy `ReservaRequest` no tiene forma de indicar cantidad de personas/entradas:

```jsonc
{
  "espacioId": 12,
  "fechaInicio": "2026-08-10T00:00:00",
  "fechaFin": "2026-08-10T00:00:00",
  "totalHoras": 0,
  "pax": 3 // NUEVO — reutiliza el nombre que ya usa ReservaResponse.pax hoy
}
```

Elegimos `pax` (en vez de `cantidadEntradas`) porque `ReservaResponse.pax` ya existe y ya
lo devuelve el backend hoy — evita un nombre nuevo para el mismo concepto. Para
`franja_exclusiva` este campo no debería ser obligatorio (o se ignora), igual que hoy.

**Nota:** `ReservaRequest` tiene `additionalProperties: false` en el swagger — mientras
esto no se confirme explícitamente, es posible que backend rechace o ignore
silenciosamente el campo `pax` que ya estamos mandando desde la app (mismo
comportamiento que ya documentamos para `facturacion` en
`FEEDBACK_BACKEND_FACTURACION.md`).

### 4. Validación de "no solape" condicional al archetype en `POST /api/mobile/reservas`

La descripción actual del endpoint dice: *"Valida que el rango fechaInicio–fechaFin no
se solape con otra reserva activa del mismo espacio."* Para `cupo_compartido` esto es
exactamente lo que **no** debe pasar: dos clientes comprando entradas para el mismo día
deben poder coexistir mientras la suma de `pax` no supere el aforo máximo de ese día
(`409 Conflict` si se excede — mismo pedido bloqueante que ya está en
`docs/backend-espacios-archetypes-spec.md` §3, pero puntualizado acá para este endpoint
mobile específico, para que no se asuma cubierto solo porque se pidió para el genérico
`/api/reservas`).

### 5. Confirmar la convención `fechaInicio = fechaFin`

Para reservas `cupo_compartido`, la app arma el request con
`fechaInicio = fechaFin = <día elegido>T00:00:00` (sin franja específica, acotado al
horario operativo del espacio ese día). Necesitamos que Backend confirme que acepta este
formato — es la misma convención ya propuesta por el equipo Web.

### 6. Cálculo de `TarifaHoy` para `cupo_compartido` en `GET /api/mobile/espacios`

Hoy `TarifaHoy` siempre se calcula sobre la modalidad "Hora". Pendiente de la decisión de
`docs/backend-espacios-archetypes-spec.md` §4 (nueva modalidad `entrada` vs. reuso de
`hora`) — lo que se decida ahí aplica igual a este endpoint mobile. Mientras no haya
modalidad `entrada` dedicada, la app relabelea "hora" como "entrada" en la UI (ver abajo)
para no confundir al cliente, pero el precio en sí sigue viniendo de la modalidad `hora`
reutilizada.

## Notas de integridad

Igual que con el pedido de aforo del equipo Web: la validación de que `pax` no exceda la
capacidad disponible de ese día **debe vivir en el backend** — es la única fuente de
verdad ante compras concurrentes de distintos clientes. El frontend no puede garantizar
esto de forma confiable en el cliente.

## Estado del lado de la app móvil

Ya implementado, condicionado a que backend confirme lo de arriba:

- `src/types/index.ts` — nuevo `ModalidadReserva` (`'franja_exclusiva' | 'cupo_compartido'`),
  `AforoDia`, y campos `modalidadReserva?` / `maxCapacidad?` en `Espacio`.
- `src/utils/espacioArchetype.ts` — `getModalidadReserva(espacio)`: mientras
  `modalidadReserva` no venga de backend (§1), se infiere por `categoria`
  (`'piscinas' → 'cupo_compartido'`, deducida hoy de `tipoEspacioNombre`). Cuando el
  campo real llegue, gana automáticamente sobre el fallback.
- `src/services/aforo.service.ts` — `fetchAforoDia(...)` genera aforo determinístico en
  cliente (sin pegarle a un endpoint inexistente) mientras no exista §2. Reemplazar por
  un `fetch` real en cuanto el contrato esté confirmado — la firma de la función ya está
  pensada para no cambiar en los call sites.
- `src/services/reservas.service.ts` — `CrearReservaInput` ahora acepta `pax?: number`,
  mandado "optimista" en `POST /api/mobile/reservas` (mismo riesgo de
  `additionalProperties: false` que `facturacion`, ver §3 arriba).
- `src/services/espacios.service.ts` — `EspacioAPI`/`mapApiToEspacio` ya mapean
  `modalidadReserva` (hoy siempre `undefined`, forward-compat con §1).
- `src/components/space/TicketQuantitySelector.tsx` (nuevo) — selector de cantidad de
  entradas + resumen de aforo, reemplaza a `HourRangeSelector` cuando el espacio es
  `cupo_compartido`.
- `src/components/space/SpaceDetailSheet.tsx` — todo el flujo de reserva (día, cantidad
  de entradas en vez de horario, desglose de costos, payload de `crearReserva`, resumen
  de pago) ahora rama según `getModalidadReserva(espacio)`. `franja_exclusiva`
  (canchas/salones) no cambió de comportamiento.
- `src/app/(tabs)/calendario.tsx` — el detalle de cada reserva muestra "N entrada(s)" en
  vez de "N hora(s)" cuando corresponde a un espacio `cupo_compartido`.
- Sin cambios necesarios para `franja_exclusiva` (canchas, salones) — mismo
  `POST /api/mobile/reservas` con franja horaria real, misma grilla de disponibilidad,
  mismo cálculo de `TarifaHoy` sobre modalidad Hora.

## Contexto

- Reportado desde: app-client-react-native. 2026-08-04.
- Ver también: `docs/backend-espacios-archetypes-spec.md` (pedido del equipo Web a
  Backend) y `docs/instrucciones-equipo-mobile-modalidades-reserva.md` (instrucciones del
  equipo Web a Mobile, base de este documento).
