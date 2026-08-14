# Respuesta a Frontend Mobile — Favoritos con listas (wishlists)

**Estado:** ✅ Implementado y desplegable
**Fecha:** 2026-08-10
**Solicitado por:** equipo Frontend Mobile

---

## Resumen

Dos cosas, y la primera es la que les importa:

1. **Su contrato se respetó tal cual.** `GET /api/mobile/favoritos` devuelve un arreglo plano de
   enteros — `[1, 4, 7]` — sin envoltorio, sin objetos, sin paginación. Pueden cachear y cruzar
   contra su catálogo local exactamente como lo planearon.
2. **Por debajo hay un sistema de listas al estilo Airbnb.** Los favoritos ahora viven dentro de
   listas con nombre ("Mis Canchas", "Cumpleaños"). Esto **no rompe nada** de lo que ya tenían
   pensado: si ignoran los endpoints de listas, el sistema se comporta como un favoritos plano de
   toda la vida, porque el backend crea y administra una lista por defecto sola.

Todos los endpoints requieren JWT (`Authorization: Bearer <token>`). El usuario sale del claim
`sub` del token: **no manden `usuarioId` en ningún lado**, no existe como parámetro.

---

## 1. El contrato que pidieron, intacto

### `GET /api/mobile/favoritos`

Respuesta `200`:

```json
[1, 4, 7]
```

Sin favoritos:

```json
[]
```

Notas de contrato:

- Es un **consolidado de todas las listas** del usuario. Si un espacio está guardado en dos listas,
  aparece **una sola vez** — el `Distinct()` está del lado del servidor.
- El orden **no está garantizado**. Es un conjunto para cruzar contra su caché (`Set.has(id)`), no
  una lista para renderizar en ese orden. Si necesitan orden, usen el detalle de una lista.
- Nunca devuelve `null`. Sin favoritos es `[]`.

Con esto alcanza para pintar el corazón lleno/vacío en todo el catálogo con **una sola llamada**.

---

## 2. Guardar y quitar favoritos

Los dos son **totalmente idempotentes** y siempre responden `204 No Content` cuando la operación es
válida. Pueden llamarlos las veces que quieran, en cualquier orden, sin chequear estado previo.

### `POST /api/mobile/espacios/{espacioId}/favorito`

Body **opcional**:

```json
{ "listaId": 5 }
```

| Situación | Respuesta |
|---|---|
| No estaba guardado | `204` — se crea |
| Ya estaba guardado y activo | `204` — no-op, no se duplica ni se pisa la fecha |
| Estaba guardado y fue quitado antes | `204` — se **reactiva** la fila existente |
| **Sin body, o body sin `listaId`** | Cae en la lista por defecto del usuario ("Mis Favoritos"), que el backend **crea sola** si no existe |
| El espacio no existe o está inactivo | `404` |
| El `listaId` no es una lista activa del usuario | `404` |

> **Para la UI:** el flujo de "toque el corazón desde el catálogo" no necesita ningún setup previo.
> Manden el POST sin body y listo — no hay que crear una lista antes ni preguntarle nada al usuario.

### `DELETE /api/mobile/espacios/{espacioId}/favorito`

Query **opcional**: `?listaId=5`

| Situación | Respuesta |
|---|---|
| **Con `listaId`** | Lo quita solo de esa lista |
| **Sin `listaId`** | Lo quita de **todas** las listas del usuario |
| No estaba guardado, o ya se había quitado | `204` igual — idempotente |

> **Para la UI:** el corazón del catálogo (que es global) debe llamar **sin `listaId`**, para que el
> espacio salga de todas las listas y el ícono quede consistente con `GET /favoritos`. El botón
> "quitar" dentro de la pantalla de una lista sí debe mandar el `listaId`.

### Soft delete — lo que implica para ustedes

Nada se borra físicamente. Quitar un favorito marca la fila como anulada; volver a guardarlo
**revive esa misma fila** en vez de crear una nueva. Consecuencias prácticas:

- **Quitar y volver a guardar es seguro e ilimitado.** No se acumula basura ni se duplican filas.
- La **fecha se refresca** al reactivar, así que el espacio vuelve a aparecer al principio del
  detalle de la lista (que ordena por recencia). Es intencional.
- Un doble toque accidental al corazón no rompe nada: el backend maneja incluso los dos requests
  simultáneos y responde `204` a ambos.

---

## 3. Listas de favoritos (UI de "Crear lista / Seleccionar lista")

Base: `/api/mobile/listas-favoritos`

### `GET /api/mobile/listas-favoritos` — listado

Para el selector de listas y la pantalla de wishlists. Ordenado de la más antigua a la más reciente.

```json
[
  { "id": 1, "nombre": "Mis Canchas",   "cantidadEspacios": 3, "fechaCreacion": "2026-08-10T22:08:15.91" },
  { "id": 2, "nombre": "Cumpleaños",    "cantidadEspacios": 0, "fechaCreacion": "2026-08-10T22:08:43.49" }
]
```

`cantidadEspacios` ya viene calculado en el servidor — **no hace falta pedir el detalle de cada
lista solo para mostrar el contador**. Sin listas devuelve `[]`.

### `POST /api/mobile/listas-favoritos` — crear

```json
{ "nombre": "Cumpleaños" }
```

Respuesta `200` con el objeto creado (úsenlo directo, ya trae el `id` para el siguiente POST de
favorito):

```json
{ "id": 2, "nombre": "Cumpleaños", "cantidadEspacios": 0, "fechaCreacion": "2026-08-10T22:08:43.49" }
```

`400` si el nombre viene vacío, en blanco o supera **100 caracteres** — conviene limitar el input
en la UI para no depender del error.

### `GET /api/mobile/listas-favoritos/{listaId}` — detalle

Para la pantalla de una wishlist:

```json
{
  "id": 1,
  "nombre": "Mis Canchas",
  "fechaCreacion": "2026-08-10T22:08:15.91",
  "espacioIds": [6, 5, 1]
}
```

- Mismo criterio que su contrato original: **arreglo plano de IDs**, para cruzar contra el catálogo
  cacheado.
- Acá el orden **sí importa y está garantizado**: del guardado más reciente al más antiguo.
- `404` si la lista no existe, fue eliminada o es de otro usuario.

### `DELETE /api/mobile/listas-favoritos/{listaId}` — eliminar

`204` siempre (idempotente). Soft delete, igual que los favoritos.

**Elimina en cascada los favoritos de la lista.** Ojo con esto en la UI: borrar "Mis Canchas"
saca sus espacios de `GET /favoritos` y los corazones del catálogo se apagan — salvo los que
también estén guardados en otra lista, que sobreviven. Conviene refrescar la caché de favoritos
después de un DELETE de lista, y probablemente pedir confirmación al usuario.

Eliminar la lista por defecto ("Mis Favoritos") es válido: el siguiente POST de favorito sin
`listaId` la vuelve a crear con un `id` nuevo.

---

## 4. Flujos sugeridos

**Arranque de la app**

```
GET /api/mobile/favoritos  →  [1, 4, 7]  →  Set en memoria/AsyncStorage
```

Con eso pintan todos los corazones del catálogo sin llamadas extra.

**Toque rápido al corazón (catálogo)**

```
POST   /api/mobile/espacios/{id}/favorito        (sin body)
DELETE /api/mobile/espacios/{id}/favorito        (sin listaId)
```

Como son idempotentes, pueden hacer *optimistic update* del ícono y disparar el request sin esperar
la respuesta; si falla, revierten. No hace falta consultar el estado antes.

**"Guardar en…" (bottom sheet estilo Airbnb)**

```
GET  /api/mobile/listas-favoritos                →  pintar el selector con los contadores
POST /api/mobile/listas-favoritos                →  si el usuario crea una nueva (devuelve el id)
POST /api/mobile/espacios/{id}/favorito          →  { "listaId": <id elegido> }
```

**Pantalla de una wishlist**

```
GET /api/mobile/listas-favoritos/{listaId}       →  espacioIds en orden  →  render desde la caché
```

---

## Dos avisos honestos

**El detalle de lista devuelve IDs, no espacios completos.** Lo hicimos así por coherencia con el
contrato que pidieron, pero significa que la pantalla de wishlist **depende de que su caché del
catálogo esté fresca**: si el usuario guardó un espacio que su caché no tiene, van a ver un hueco.
Si prefieren que el detalle traiga el objeto completo (título, foto, tarifa), es un cambio chico de
nuestro lado — pídanlo y lo hacemos.

**No hay endpoint para renombrar listas todavía.** Si la UI necesita "editar nombre", avísennos y
lo agregamos; es un `PUT` de pocas líneas. Tampoco validamos nombres duplicados: hoy se pueden
crear dos listas llamadas igual.

---

## Cierre

**No hay bloqueos.** Pueden empezar por el flujo simple (`GET /favoritos` + corazón) y sumar la UI
de listas después, sin migraciones ni cambios de contrato en el medio.

Cualquier cosa que encuentren integrando, la vemos.
