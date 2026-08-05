# Modalidades de reserva por tipo de espacio — Instrucciones para Mobile

> **De:** equipo Frontend Web (Next.js — portal de anfitriones)
> **Para:** equipo Frontend Mobile (app de clientes finales)
> **Fecha:** 2026-08-04
> **Contexto:** ya identificamos con Backend que la app necesita soportar 3 tipos de
> espacio con dos modelos de reserva distintos (ver `docs/backend-espacios-archetypes-spec.md`,
> ya enviado a Backend). El lado Web/Anfitriones ya ajustó su UI para esto. Este documento
> es para que ustedes analicen el impacto en el flujo de reserva de la app de clientes y
> levanten **sus propios** requerimientos a Backend — coordinados con los que ya pedimos
> nosotros, sin duplicar.

---

## 0. El cambio de fondo (mismo que ya viven ustedes hoy con horas)

Hoy toda reserva en la app asume: el cliente ocupa **el espacio completo** por un **rango
de horas exclusivo** (nadie más puede reservar ese mismo horario). Eso es correcto para
canchas y salones, pero no para piscinas: en el modelo real, el cliente compra una
**entrada** (sin elegir hora) y **comparte** el espacio con otros clientes hasta un aforo
máximo por día.

| Archetype | Tipos | Cómo se reserva hoy en mobile |
|---|---|---|
| `franja_exclusiva` | Canchas (`CAN`), Salones (`SAL`) | Ya funciona como está — **sin cambios**. |
| `cupo_compartido` | Piscinas (`PIS`) | **No funciona con el flujo actual** — ver §1. |

El campo que distingue esto (`modalidadReserva` en el catálogo de tipos de espacio) ya se
lo pedimos a Backend en `docs/backend-espacios-archetypes-spec.md` §1. Cuando exista,
tanto Web como Mobile lo consumen igual — no hace falta que lo vuelvan a pedir, pero sí
que confirmen que también lo necesitan expuesto en **sus** endpoints (ver §2).

---

## 1. Qué del flujo actual de mobile NO le sirve a piscinas

Revisamos el swagger (`docs/swagger-api-login.json`) para confirmar el comportamiento
exacto de lo que ya consumen:

### `GET /api/mobile/espacios/{espacioId}/disponibilidad?fecha=`

Hoy devuelve `DisponibilidadMobileResponse` con `horas: HoraEstadoDto[]` — una grilla de
24 horas con el estado de cada una. **No hay ningún concepto de aforo/cupo disponible.**
Para piscinas, esta pantalla no debería mostrar una grilla de horas — el cliente solo
necesita saber "¿cuántas entradas quedan disponibles hoy?", no "¿qué hora está libre?".

### `POST /api/mobile/reservas`

La descripción del propio endpoint dice explícitamente:

> "Valida que el rango `fechaInicio`–`fechaFin` no se solape con otra reserva activa del
> mismo espacio."

Esto es **exactamente lo que no debe pasar** en una piscina: si dos clientes distintos
compran entradas para el mismo día, **no** debe rechazarse por "solape" — debe aceptarse
mientras la suma de personas no supere el aforo máximo del espacio ese día.

### `ReservaRequest` (body de creación)

```jsonc
{
  "espacioId": 0,
  "usuarioId": "string",   // ignorado, se toma del JWT
  "fechaInicio": "date-time",
  "fechaFin": "date-time",
  "totalHoras": 0,
  "facturacion": { /* ... */ }
}
```

**No existe un campo para indicar cantidad de personas/entradas.** Para franja exclusiva
no hace falta (se reserva el espacio completo), pero para una piscina el cliente necesita
decir "quiero 3 entradas", y hoy no hay dónde ponerlo.

### `GET /api/mobile/espacios`

La tarifa mostrada (`TarifaHoy`) se calcula **siempre sobre la modalidad "Hora"**. Si
Backend decide agregar una modalidad `entrada` dedicada (ver `backend-espacios-archetypes-spec.md`
§4), este endpoint también necesita saber calcularla para espacios `cupo_compartido`.

---

## 2. Qué deberían pedirle a Backend (su propia lista, coordinada con la nuestra)

Backend ya tiene nuestro pedido general (`docs/backend-espacios-archetypes-spec.md`). Lo
que sigue es **específico de los endpoints `/api/mobile/*`** que backend todavía no cubrió
porque nuestro spec se enfocó en el lado Anfitriones/Web:

1. **`modalidadReserva` también en `EspacioMobileResponse`** (`GET /api/mobile/espacios` y
   el detalle de disponibilidad) — hoy ese shape trae `tipoEspacioId`/`tipoEspacioNombre`
   pero no el código ni la modalidad. Sin esto, mobile no puede decidir qué UI mostrar.
2. **Endpoint o respuesta alternativa de disponibilidad para `cupo_compartido`** —
   equivalente mobile del `/api/aforo` que pedimos para el panel de anfitriones (ver
   `backend-espacios-archetypes-spec.md` §2): algo como
   `{ fecha, capacidadTotal, vendida, disponible }`, para reemplazar el bloque `horas[]`
   cuando el espacio sea de cupo compartido. Confirmar si conviene que sea el mismo
   endpoint `/api/aforo` (reutilizado desde mobile) o una versión dentro de
   `DisponibilidadMobileResponse`.
3. **Campo de cantidad en `ReservaRequest`** (ej. `cantidadEntradas` o reusar `pax`) para
   que el cliente pueda especificar cuántas entradas está comprando en un espacio
   `cupo_compartido`. Para `franja_exclusiva` este campo no debería ser necesario (o
   ignorarse), igual que hoy.
4. **`POST /api/mobile/reservas`: la validación de "no solape" debe ser condicional al
   archetype** — para `cupo_compartido`, en vez de rechazar por solape de horario, debe
   validar que `cantidadEntradas` solicitada no exceda el aforo disponible de ese día
   (mismo pedido que hicimos en `backend-espacios-archetypes-spec.md` §3, pero aplicado
   puntualmente a este endpoint mobile — no asuman que ya está cubierto solo porque lo
   pedimos para el genérico `/api/reservas`).
5. **Confirmar la convención `fechaInicio = fechaFin`** para reservas de `cupo_compartido`
   (acotada al horario operativo del espacio ese día, sin franja específica) — es la misma
   convención que ya propusimos a Backend; mobile debe armar el request con ese mismo
   criterio para que el modelo sea consistente entre ambos clientes.
6. **`GET /api/mobile/espacios`: `TarifaHoy` para espacios `cupo_compartido`** — confirmar
   con Backend si va a calcularse sobre una modalidad `entrada` nueva o reutilizando
   `hora` (pendiente de la decisión del §4 de nuestro spec) para saber qué campo leer.

---

## 3. Algo que YA existe y no hace falta pedir de nuevo: entradas QR

Ya hay un sistema de invitaciones/QR construido (`POST /api/reservas/{id}/invitaciones/asignar`
+ `POST /api/invitaciones/{tokenQr}/validar`), pensado para asignar y validar entradas
individuales de **una reserva ya creada**. Es una buena base a reutilizar para la
validación en la puerta de la piscina (cada entrada comprada podría generar su propio QR
para escanear al ingresar), **pero ojo**: ese sistema resuelve el aforo *de una reserva
puntual* (cuántos invitados entran con esa reserva), no el aforo *compartido entre
reservas de distintos clientes el mismo día* — eso sigue siendo el problema de fondo del
§2.2/§2.4. No dupliquen el pedido de "sistema de QR" — enfóquense en pedir que la
validación de aforo compartido (§2.4) exista antes de crear la reserva.

---

## 4. Qué NO cambia para canchas y salones

Igual que en el spec de backend: `franja_exclusiva` (canchas y salones) sigue funcionando
exactamente como hoy en mobile — mismo `POST /api/mobile/reservas` con franja horaria real,
misma grilla de `disponibilidad`, mismo cálculo de `TarifaHoy` sobre modalidad Hora. No es
necesario tocar nada de eso.

---

## Checklist para el equipo Mobile

- [ ] Revisar si `GET /api/mobile/espacios` / disponibilidad necesitan `modalidadReserva`
      expuesto para decidir qué pantalla renderizar (§2.1).
- [ ] Definir con Backend el contrato de disponibilidad para `cupo_compartido` en mobile
      (§2.2) — puede ser el mismo `/api/aforo` que pedimos nosotros, a confirmar.
- [ ] Pedir el campo de cantidad de entradas en `ReservaRequest` (§2.3).
- [ ] Pedir que la validación de solape en `POST /api/mobile/reservas` sea condicional al
      archetype, con validación de aforo para `cupo_compartido` (§2.4) — **no asumir que
      ya quedó cubierto** por nuestro pedido genérico a `/api/reservas`.
- [ ] Confirmar la convención `fechaInicio = fechaFin` para reservas de cupo compartido (§2.5).
- [ ] Confirmar cómo se calculará `TarifaHoy` para piscinas en `GET /api/mobile/espacios` (§2.6).
- [ ] Evaluar reutilizar el sistema de invitaciones QR existente para la validación en
      puerta, sin perder de vista que no resuelve el aforo compartido por sí solo (§3).
- [ ] Confirmar que no hace falta ningún cambio para canchas/salones (§4).
