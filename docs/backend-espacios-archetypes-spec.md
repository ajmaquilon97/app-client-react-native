# Modalidades de reserva por tipo de espacio (canchas / salones / piscinas) — Backend

> **De:** equipo Frontend (Next.js — portal de anfitriones)
> **Para:** equipo Backend (ApiTesis / .NET)
> **Fecha:** 2026-08-04
> **Contexto:** hoy toda la app trata cada espacio igual — se reserva una franja horaria
> exclusiva (canchas, salones). Eso no aplica a piscinas: en Ecuador/Guayaquil el modelo
> real es que la persona compra una **entrada** sin franja horaria fija y **comparte** el
> espacio con otros hasta un aforo máximo. El frontend ya implementó una primera pasada
> de UI para soportar esto (wizard de espacios, tarifario, agenda/disponibilidad,
> reservas), pero **derivando el comportamiento en el cliente** a partir de un mapeo
> hardcodeado de `codigo` de tipo de espacio, porque el backend todavía no expone este
> dato. Este documento pide formalizar ese concepto en el modelo de datos.

---

## 0. Los dos "archetypes" de reserva

| Archetype | Tipos hoy | Cómo se reserva |
|---|---|---|
| `franja_exclusiva` | Canchas deportivas (`CAN`), Salones de evento (`SAL`) | Se ocupa el espacio completo por un rango de tiempo (`fechaInicio`/`fechaFin`). Ya funciona tal cual hoy — **sin cambios** para estos dos tipos. |
| `cupo_compartido` | Piscinas (`PIS`) | Se vende una entrada/ticket sin franja horaria; varias personas comparten el espacio hasta un aforo máximo por día. **Es lo nuevo que este documento pide modelar.** |

El catálogo real de `GET /api/tipos-espacios` hoy es:

```json
[
  { "id": 1, "codigo": "CAN", "nombre": "Canchas deportivas" },
  { "id": 2, "codigo": "SAL", "nombre": "Salones de evento" },
  { "id": 3, "codigo": "PIS", "nombre": "Piscinas" }
]
```

El frontend hoy infiere el archetype con un mapa fijo `codigo → archetype` en
`src/lib/espacio-archetype.ts`. Es una solución temporal — necesitamos que el dato venga
del backend para no tener que actualizar código cada vez que se agregue un tipo nuevo
(bailes, restaurantes, salones de juego, etc., mencionados como roadmap futuro del MVP).

---

## 1. Nuevo campo en el catálogo de tipos de espacio — **BLOQUEANTE**

Agregar un campo al shape de `TiposEspacios` (`GET /api/tipos-espacios`):

```jsonc
[
  {
    "id": 1,
    "codigo": "CAN",
    "nombre": "Canchas deportivas",
    "modalidadReserva": "franja_exclusiva"   // NUEVO
  },
  {
    "id": 2,
    "codigo": "SAL",
    "nombre": "Salones de evento",
    "modalidadReserva": "franja_exclusiva"   // NUEVO
  },
  {
    "id": 3,
    "codigo": "PIS",
    "nombre": "Piscinas",
    "modalidadReserva": "cupo_compartido"    // NUEVO
  }
]
```

- Enum `modalidadReserva`: `"franja_exclusiva" | "cupo_compartido"`.
- Este campo vive en el **tipo de espacio** (catálogo), no en el espacio individual — un
  anfitrión no debería poder marcar una cancha como cupo compartido por error. Si en el
  futuro se necesita una excepción por espacio, lo conversamos aparte.
- Con este campo, el frontend reemplaza su mapeo hardcodeado por el valor real —
  actualizar `src/lib/espacio-archetype.ts` es un cambio de una línea de nuestro lado.

---

## 2. Nuevo endpoint: aforo/venta diaria (para `cupo_compartido`)

Hoy `GET /api/availability` (ver `docs/ajustes-solicitados-disponibilidad.md`) modela
disponibilidad como slots de 1 hora — no aplica a piscinas. Se necesita un endpoint
paralelo, específico para espacios `cupo_compartido`.

### Consultar aforo por rango de fechas

```
GET /api/aforo?espacioId={id}&fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
```

**Response `200 OK`:**

```jsonc
[
  {
    "fecha": "2026-08-10",
    "capacidadTotal": 80,     // = maxCapacidad del espacio ese día
    "vendida": 32,            // suma de pax de reservas activas ese día
    "disponible": 48
  }
]
```

### Consultar detalle de ventas de un día

```
GET /api/aforo/dia?espacioId={id}&fecha=YYYY-MM-DD
```

**Response `200 OK`:**

```jsonc
{
  "fecha": "2026-08-10",
  "capacidadTotal": 80,
  "vendida": 32,
  "disponible": 48,
  "tickets": [
    { "reservaId": 501, "clienteNombre": "Carlos Mendoza", "cantidad": 4, "horaCompra": "10:15" }
  ]
}
```

> El frontend hoy simula estos dos endpoints con datos locales deterministas
> (`src/lib/aforo-mock.ts`) solo para poder construir y demostrar la UI
> (`src/components/availability/AforoPanel.tsx`). En cuanto este contrato exista,
> reemplazamos el mock por el fetch real.

---

## 3. Cómo se modela la venta de una entrada en `Reserva`

Para no duplicar todo el módulo de reservas (pagos, cancelaciones, notas de crédito,
timeline, etc. — ver `docs/backend-cancelacion-reservas-spec.md`,
`docs/backend-nota-credito-sri-spec.md`), proponemos que una venta de entrada de piscina
sea **una `Reserva` más**, con esta convención:

- `fechaInicio` y `fechaFin` = el mismo día, acotados por el horario operativo del
  espacio ese día (`apertura`/`cierre` del `GeneralScheduleCard`) — no representan una
  franja específica, solo "válido durante el horario de apertura de ese día".
- `pax` = cantidad de entradas/personas de esa venta (el campo ya existe en
  `ReservaResponseApi` y ya lo usa el frontend).
- El resto del ciclo de vida (estados, pagos, cancelación, asistencia) funciona
  exactamente igual que para canchas/salones.

**Pregunta para backend:** ¿este approach (reutilizar `Reserva` con la convención de
arriba) es viable de su lado, o prefieren un modelo de datos separado (ej. una entidad
`VentaEntrada` aparte)? Si es lo segundo, necesitamos que `GET /api/reservas` y
`GET /api/reservas/{id}` sigan siendo la única fuente que consume el frontend (para no
duplicar el módulo de listado/detalle de reservas) — avisar si eso no es posible.

### Validación de aforo al crear la reserva — **BLOQUEANTE**

Cuando se crea una reserva sobre un espacio `cupo_compartido`, el backend debe validar
que `pax` no exceda la `capacidadDisponible` de ese día (§2) **en el momento de la
creación**, y rechazar con `409 Conflict` si se excede. Esta validación **debe vivir en
el backend** — es la única fuente de verdad ante compras concurrentes; el frontend no
puede garantizar esto de forma confiable en el cliente.

---

## 4. Tarifario: modalidad de precio para entradas

Hoy `EspacioPricing` (`GET/PUT /api/espacios/{id}/tarifas`, ver
`src/lib/pricing/api.ts`) modela 3 modalidades fijas: `hora`, `jornada`, `evento`. Para
piscinas no aplica ninguna tal cual — el frontend hoy **reutiliza la modalidad `hora`**
como precio de entrada (parche temporal en `PricingModalities.tsx`, mostrando el label
"Entrada / Ticket" en la UI pero mandando el dato bajo la key `hora` al backend).

**Pedido:** confirmar una de estas dos rutas:

1. **Agregar una 4ª modalidad `entrada`** al shape de `EspacioPricingResponseApi`
   (`entradaActiva: bool`, `entradaPrecio: decimal?`), simétrica a `horaActiva`/`horaPrecio`.
   Es la opción más limpia a largo plazo — evita la ambigüedad de "hora" significando dos
   cosas distintas según el tipo de espacio.
2. **Mantener el reuso de `hora`** como precio de entrada para `cupo_compartido`, y el
   frontend sigue relabeleando en la UI. Más rápido de implementar, pero el nombre del
   campo queda semánticamente incorrecto para piscinas.

Recomendamos la opción 1. Si se adopta, también ajustar la regla de activación de
espacios (§5 de `docs/backend-inactivacion-espacios-spec.md`: *"al menos una modalidad
de tarifa activa con precio > 0"*) para que cuente `entradaActiva` como válida en
espacios `cupo_compartido`.

---

## 5. Sin cambios para canchas y salones

Puntual y explícito: `franja_exclusiva` (canchas y salones) **no requiere ningún cambio**
de contrato — siguen usando `GET/POST /api/availability*`, `Reserva` con franja horaria
real, y las 3 modalidades de tarifa existentes (`hora`/`jornada`/`evento`) exactamente
como hoy. Salones ya soportan rangos multi-hora vía `hourStart`/`hourEnd`
(`POST /api/availability/block`) — no se pide nada nuevo ahí.

---

## Checklist de confirmación

- [ ] `GET /api/tipos-espacios` incluye `modalidadReserva` (`franja_exclusiva` |
      `cupo_compartido`) por tipo (§1) — **bloqueante para reemplazar el mapeo
      hardcodeado del frontend**.
- [ ] `GET /api/aforo?espacioId&fechaInicio&fechaFin` — aforo agregado por día (§2).
- [ ] `GET /api/aforo/dia?espacioId&fecha` — detalle de ventas de un día (§2).
- [ ] Confirmado el approach de modelado de ventas de entrada como `Reserva` con
      `fechaInicio=fechaFin` + `pax` (§3), o alternativa si no es viable.
- [ ] Validación de aforo disponible al crear una reserva sobre espacio
      `cupo_compartido`, con `409 Conflict` si se excede (§3) — **bloqueante**.
- [ ] Decisión sobre modalidad de tarifa `entrada` vs. reuso de `hora` (§4).
- [ ] Confirmado que no hay cambios de contrato para `franja_exclusiva` (§5).
