# Feedback para backend: datos de facturación (opcionales) al crear la reserva

## Resumen

En la tarjeta de "Planifica tu reserva" (`SpaceDetailSheet.tsx`), justo debajo del desglose de costos y el
total, la app ahora pide datos de facturación **opcionales**: Cédula/RUC, Razón social/Nombre y Correo. Si
el usuario no completa ninguno, se manda un valor por defecto de "Consumidor Final" (estándar de facturación
en Ecuador). Esto deja la ventana de pago de Datafast completamente intacta — todo pasa antes, en la misma
pantalla de detalle del espacio.

Necesitamos que `POST /api/mobile/reservas` acepte y guarde estos datos para poder emitir la factura de
cada reserva.

## Por qué va en la creación de la reserva

A diferencia de una iteración anterior de este pedido (facturación como paso dentro del modal de Datafast),
terminamos poniéndolo en la pantalla de detalle del espacio, junto al total, porque:

- Es donde el usuario ya está viendo el monto a pagar — tiene sentido pedir ahí los datos de facturación de
  ese monto.
- Al ser opcional (con fallback a "Consumidor Final"), no agrega fricción ni un paso extra obligatorio.
- Mantiene el modal de Datafast (`DatafastPaymentModal.tsx`) sin ningún cambio de flujo, tal como pidió el
  equipo.

## Lo que pedimos

Que `POST /api/mobile/reservas` acepte un objeto adicional y opcional, por ejemplo:

```json
{
  "espacioId": 12,
  "fechaInicio": "2026-08-01T10:00:00",
  "fechaFin": "2026-08-01T12:00:00",
  "totalHoras": 2,
  "facturacion": {
    "identificacion": "9999999999999",
    "nombre": "Consumidor Final",
    "correo": ""
  }
}
```

- `identificacion`: cédula (10 dígitos) o RUC (13 dígitos) ecuatoriano, o `"9999999999999"` si el usuario no
  completó el campo (consumidor final). La app ya valida el formato cuando el usuario sí escribe algo, pero
  backend debería validarlo también.
- `nombre`: razón social o nombre a facturar; `"Consumidor Final"` si no se completó.
- `correo`: puede venir vacío si el usuario no lo completó — no es obligatorio.
- Guardar estos datos junto a la reserva (o en una tabla de facturación relacionada). No es obligatorio
  exponerlos de vuelta en `ReservaResponse`, pero ayuda a confirmar que se guardaron bien si backend los
  devuelve.

## Notas de seguridad / integridad

- Igual que con los demás datos personales ya expuestos hoy (ej. `numeroCedula` en `UsuarioResponse`), la
  cédula/RUC debe tratarse con el mismo cuidado — no hay implicancia PCI-DSS aquí (no es dato de tarjeta),
  pero sí es dato personal.

## Estado del lado de la app móvil

- `src/components/space/SpaceDetailSheet.tsx` — dentro de la tarjeta de desglose de costos, debajo del
  "Total a pagar", hay tres campos opcionales (Cédula/RUC, Razón social/Nombre, Correo). Si el usuario deja
  los tres vacíos, se manda `FACTURACION_CONSUMIDOR_FINAL` (`identificacion: "9999999999999"`,
  `nombre: "Consumidor Final"`, `correo: ""`); si completa alguno, se manda tal cual lo escribió (sin
  validación estricta, son opcionales).
- `src/services/reservas.service.ts` — `crearReserva` ya manda `facturacion` en el body de
  `POST /api/mobile/reservas`. **Mientras backend no confirme soporte para este campo, es posible que el
  backend lo ignore silenciosamente** (comportamiento típico de deserialización JSON, y
  `ReservaRequest` hoy tiene `additionalProperties: false` en el swagger) — avisen cuando esté implementado
  para verificar end-to-end que los datos efectivamente se están guardando.
- El modal de pago de Datafast (`DatafastPaymentModal.tsx`) no tuvo ningún cambio relacionado a esto.

## Contexto

- Reportado desde: app-client-react-native. 2026-07-29.
