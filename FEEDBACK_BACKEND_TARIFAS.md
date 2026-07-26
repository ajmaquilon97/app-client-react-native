# Feedback para backend: endpoint dedicado para móvil (espacio + tarifa del día)

## Resumen

La app móvil necesita mostrar el precio por hora de cada espacio en la pantalla principal (listado de espacios). Pedimos un **endpoint especial pensado para el consumo desde la app móvil** que devuelva, en una sola llamada, la información actual de cada espacio **junto con la tarifa aplicable hoy** para ese espacio. Esto reemplaza cualquier pedido anterior de tocar permisos de `GET /api/espacios/{id}/tarifas` o de exponer el precio en el listado genérico — la idea es resolverlo todo con este único endpoint de móvil.

## Por qué no alcanza con lo que existe hoy

- `GET /api/espacios` no incluye precio (campo pendiente).
- `GET /api/espacios/{espacioId}/tarifas` sí devuelve el precio, pero está restringido: solo el dueño del espacio (o un usuario `admin`) puede consultarlo. Un usuario `Cliente` normal navegando el listado recibe **403** al intentar ver la tarifa de un espacio que no le pertenece.
- Aunque se relajara ese permiso, seguiríamos necesitando **una llamada por cada espacio** para armar el listado (patrón N+1: 14 espacios hoy = 14 requests extra solo para pintar el home), con el costo de latencia/datos que eso implica en móvil.

### Reproducción del bloqueo de permisos (evidencia)

Usuario `Cliente` recién registrado (no dueño del espacio) contra un espacio existente:

```bash
curl --location 'https://obsidiantechlab-001-site1.htempurl.com/api/espacios/1/tarifas' \
  --header 'Authorization: Bearer <token de un usuario Cliente que no es dueño>'
```

```json
HTTP 403
{ "message": "No tienes permisos para realizar esta acción." }
```

Sin token: `HTTP 401`. Con un token `admin` o del dueño real: `HTTP 200` con el `EspacioPricingResponse` esperado — confirma que el bloqueo es específicamente por rol/propiedad, no un error general del endpoint.

## Lo que pedimos

Un endpoint nuevo, propio para móvil (ej. `GET /api/mobile/espacios` o el nombre que el equipo de backend prefiera), de **lectura pública para cualquier usuario autenticado** (Cliente, Propietario o Admin, sin validar propiedad), que devuelva por cada espacio activo:

- Los mismos campos que ya expone `EspacioResponse` hoy (`id`, `titulo`, `descripcion`, `ciudad`, `provincia`, `imagenPortada`, `imagenesGaleria`, `calificacion`, `totalResenas`, etc.).
- Un campo adicional con la **tarifa del día** para ese espacio, es decir, el precio ya resuelto por el backend considerando:
  - La modalidad `hora` (la que se muestra en el card — "precio por hora").
  - El override de `tarifasPorDia` según el día de la semana actual.
  - Una fecha especial (`fechas-especiales`) si hoy coincide con alguna.
  - Una promoción activa aplicable hoy, si corresponde.

Ejemplo de shape sugerido (el nombre exacto de los campos queda a criterio de backend):

```json
{
  "id": 5,
  "titulo": "Cancha Sintética Norte",
  "...": "...campos existentes de EspacioResponse",
  "tarifaHoy": {
    "modalidad": "hora",
    "precio": 25.0,
    "unidad": "hora",
    "esPromocion": false
  }
}
```

La escritura de tarifas (`PUT /api/espacios/{espacioId}/tarifas`) no cambia — sigue restringida al dueño/admin como está hoy. Este pedido es solo para lectura, y solo para el caso de uso de listado en móvil.

## Contexto

- Endpoint mockeado actualmente en el cliente: `src/services/espacios.service.ts` (`mapApiToEspacio`), campo `precio` fijo en `0` con el comentario `// --- campos pendientes de otros endpoints ---`.
- Reportado desde: app-client-react-native, 2026-07-23.
