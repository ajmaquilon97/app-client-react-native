# Modalidades de reserva por tipo de espacio — Instrucciones para Mobile

> **De:** equipo Frontend Web (Next.js — portal de anfitriones)
> **Para:** equipo Frontend Mobile (app de clientes finales)
> **Fecha:** 2026-08-04 — **actualizado 2026-08-05**
> **Contexto:** ya identificamos con Backend que la app necesita soportar 3 tipos de
> espacio con dos modelos de reserva distintos (ver `docs/backend-espacios-archetypes-spec.md`,
> ya enviado a Backend). El lado Web/Anfitriones ya ajustó su UI para esto. Este documento
> es para que ustedes analicen el impacto en el flujo de reserva de la app de clientes.
>
> **Actualización 2026-08-05:** Backend ya implementó y confirmó el contrato completo,
> incluyendo los endpoints `/api/mobile/*` (ver `docs/back_responses/api-specs-aforo.md`,
> probado end-to-end contra base de datos real). La sección §2 de este documento, que
> originalmente era "esto es lo que deben ir a pedirle a Backend", ahora está reescrita
> como "esto es lo que ya existe y así deben consumirlo" — no hace falta que vuelvan a
> pedir nada de lo que aparece marcado ✅. Queda **una sola pregunta abierta** (§2.6) que
> ya le reenviamos a Backend.

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

## 2. Cómo quedó el contrato real (ya implementado, confirmado por Backend)

Esto ya no es una lista de pedidos — es el contrato con el que deben integrar. Fuente:
`docs/back_responses/api-specs-aforo.md` (probado end-to-end contra base de datos real).

1. **`modalidadReserva` ya está en `EspacioMobileResponse`** ✅ — tanto en
   `GET /api/mobile/espacios` (cada elemento del listado) como en
   `GET /api/mobile/espacios/{id}/disponibilidad` (raíz de la respuesta). Valores:
   `"franja_exclusiva"` | `"cupo_compartido"`. Úsenlo para decidir qué pantalla renderizar
   — no el `tipoEspacioNombre`.
2. **`GET /api/aforo` y `GET /api/aforo/dia` sirven directo para mobile** ✅ — no es un
   endpoint aparte, es el mismo que usa el panel de anfitriones, y **ya no exige ser el
   dueño del espacio**: cualquier usuario autenticado puede consultarlo (así fue pedido
   específicamente para que mobile lo use antes de reservar). Para el detalle
   (`GET /api/aforo/dia`), el arreglo `tickets[]` (nombre de cliente + hora de compra)
   solo viene poblado para el dueño — para cualquier cliente Mobile llega `tickets: []`,
   pero `capacidadTotal`/`vendida`/`disponible` sí son visibles siempre. Usen estos
   endpoints en vez de `horas[]` cuando `modalidadReserva == "cupo_compartido"`.
3. **`ReservaRequest` ya tiene `pax`** ✅ — mismo body en `POST /api/mobile/reservas`:
   ```jsonc
   {
     "espacioId": 25,
     "fechaInicio": "2026-08-10T10:00:00",
     "fechaFin": "2026-08-10T12:00:00",
     "totalHoras": 2,
     "pax": 3,          // NUEVO — cantidad de entradas para cupo_compartido
     "facturacion": null
   }
   ```
   Para `franja_exclusiva` sigue funcionando igual (pueden seguir mandando `pax` en 0 o
   el valor que ya usaban, no se valida contra nada). Para `cupo_compartido`, `pax` es la
   cantidad de entradas que el cliente está comprando.
4. **La validación de aforo en `POST /api/mobile/reservas` ya está activa** ✅ — no es
   "no solape de horario" para `cupo_compartido`: el backend suma el `pax` de todas las
   reservas activas de ese espacio ese día, le suma el `pax` de la solicitud, y si supera
   `MaxCapacidad` responde `409 Conflict` con un mensaje que ya trae capacidad/vendidas/
   solicitadas listo para mostrar al usuario:
   ```json
   { "message": "Se excedió el aforo disponible para el 2026-08-10: capacidad 5, vendidas 5, solicitadas 1." }
   ```
   Es transaccional (aislamiento `Serializable`) — probado en vivo con dos compras
   simultáneas que individualmente cabían pero juntas no: una se creó, la otra recibió
   `409`. No hace falta ningún manejo especial de carrera del lado del cliente, solo
   mostrar el mensaje de error si llega `409`. Para `franja_exclusiva` el comportamiento
   de solape **no cambió**.
5. **Confirmada la convención `fechaInicio = fechaFin`** ✅ — con una restricción
   importante: **ambas fechas deben caer en el mismo día calendario**. Backend calcula el
   aforo por el día de `fechaInicio`; si el rango cruza medianoche, no se valida ni se
   contabiliza correctamente. Arment el request de reserva de piscina siempre dentro de un
   mismo día.
6. **`TarifaHoy` para espacios `cupo_compartido` — ✅ corregido, con un matiz importante.**
   Ver `docs/back_responses/tarifa-hoy-mobile-fix.md`. El listado (`GET /api/mobile/espacios`)
   ya estaba correcto. El que **estaba realmente roto** era
   `GET /api/mobile/espacios/{espacioId}/disponibilidad` — no era solo el label: ese
   endpoint leía el precio por hora del espacio (no `entradaPrecio`), así que para una
   piscina devolvía un precio equivocado o `null`. Ya está corregido (ambos endpoints
   comparten el mismo resolutor). **Re-testeen específicamente la pantalla de
   detalle/disponibilidad de piscinas, no solo el listado** — si asumieron que el número
   ahí era bueno y solo el texto era cosmético, puede que hayan validado un precio
   incorrecto sin darse cuenta.

   Contrato resultante para `cupo_compartido` (ambos endpoints):
   ```json
   { "modalidad": "Entrada", "precio": 8.50, "unidad": "entrada", "esPromocion": false }
   ```
   Tres cosas a tener en cuenta al consumirlo:
   - `modalidad`/`unidad` son texto libre para mostrar, **no identificadores** — para
     ramificar lógica sigan usando `modalidadReserva` del espacio, no estos campos.
   - `tarifa`/`tarifaHoy` puede venir `null` si el espacio no tiene `entradaActiva`/
     `entradaPrecio` configurado — tolerar ese caso, no es un error del backend.
   - `esPromocion` viene siempre `false` en `cupo_compartido` — las promociones hoy solo
     existen sobre la jerarquía de precio por hora. Si el producto necesita promociones
     en piscinas, es trabajo pendiente de Backend — avisar si hace falta.

---

## 3. Algo que ya existe y pueden reutilizar: entradas QR

Ya hay un sistema de invitaciones/QR construido (`POST /api/reservas/{id}/invitaciones/asignar`
+ `POST /api/invitaciones/{tokenQr}/validar`), pensado para asignar y validar entradas
individuales de **una reserva ya creada**. Es una buena base a reutilizar para la
validación en la puerta de la piscina (cada entrada comprada podría generar su propio QR
para escanear al ingresar), **pero ojo**: ese sistema resuelve el aforo *de una reserva
puntual* (cuántos invitados entran con esa reserva), no el aforo *compartido entre
reservas de distintos clientes el mismo día* — ese problema de fondo ya lo resolvió
Backend con la validación transaccional de §2.4, es un mecanismo aparte. Si quieren dar a
cada entrada comprada su propio QR individual para el control en puerta, evalúen
reutilizar este sistema — no hace falta pedir uno nuevo.

---

## 4. Qué NO cambia para canchas y salones

Igual que en el spec de backend: `franja_exclusiva` (canchas y salones) sigue funcionando
exactamente como hoy en mobile — mismo `POST /api/mobile/reservas` con franja horaria real,
misma grilla de `disponibilidad`, mismo cálculo de `TarifaHoy` sobre modalidad Hora. No es
necesario tocar nada de eso.

---

## Checklist para el equipo Mobile

- [x] `modalidadReserva` expuesto en `GET /api/mobile/espacios` y disponibilidad — úsenlo
      para decidir qué pantalla renderizar (§2.1).
- [x] Contrato de aforo para `cupo_compartido` en mobile: mismos `GET /api/aforo` /
      `GET /api/aforo/dia` del panel de anfitriones, abiertos a cualquier autenticado (§2.2).
- [x] `pax` ya existe en `ReservaRequest` — envíenlo con la cantidad de entradas (§2.3).
- [x] Validación de aforo transaccional activa en `POST /api/mobile/reservas` para
      `cupo_compartido`, con `409` + mensaje listo para mostrar (§2.4).
- [x] Convención `fechaInicio = fechaFin` confirmada — mismo día calendario obligatorio (§2.5).
- [x] `TarifaHoy` corregido en ambos endpoints (§2.6) — **re-testear puntualmente la
      pantalla de detalle/disponibilidad de piscinas**, ahí era donde el precio (no solo
      el label) estaba mal antes del fix. Tolerar `tarifa: null` cuando no hay
      `entradaPrecio` configurado.
- [ ] Evaluar (opcional) reutilizar el sistema de invitaciones QR existente para la
      validación en puerta de cada entrada comprada (§3).
- [x] Confirmado que no hace falta ningún cambio para canchas/salones (§4).
