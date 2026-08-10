# Favoritos de espacios por usuario — Backend

> **De:** equipo Frontend (React Native — app cliente)
> **Para:** equipo Backend (ApiTesis / .NET)
> **Fecha:** 2026-08-10
> **Contexto:** la app tiene una pantalla "Mis Favoritos" (`src/app/(tabs)/favoritos.tsx`)
> y un corazón para marcar/desmarcar favorito en cada tarjeta de espacio de la lista
> principal (`src/components/home/SpaceCard.tsx`, dentro de `src/app/(tabs)/index.tsx`).
> Hoy ese estado vive **solo en memoria del cliente** (`src/context/FavoritesContext.tsx`),
> con un array hardcodeado `DEFAULT_FAVORITES = [1, 4]` — se pierde al cerrar la app y no
> distingue entre usuarios. Este documento pide persistir los favoritos en backend,
> asociados al usuario autenticado.

---

## 0. Punto de partida importante

`GET /api/mobile/espacios` (consumido en `src/services/espacios.service.ts`) es el
catálogo **general** de espacios: la misma lista para los N usuarios de la app, sin
personalización. Los favoritos son un dato **por usuario**, así que **no deben vivir en
esa tabla/endpoint** — necesitamos un recurso nuevo que relacione `usuarioId` ↔
`espacioId`.

El usuario autenticado ya viaja en cada request como siempre: header
`Authorization: Bearer <accessToken>`, con el `usuarioId` (string, típicamente GUID —
ver `UsuarioAPI.id` en `auth.service.ts`) en el claim `sub` del JWT. No hace falta que el
frontend mande el id en el body de ningún endpoint de favoritos.

---

## 1. Modelo de datos

Tabla `Favoritos` (o equivalente):

| Campo | Tipo | Notas |
|---|---|---|
| `UsuarioId` | string (FK → Usuarios) | del claim `sub` del JWT |
| `EspacioId` | int (FK → Espacios) | |
| `FechaCreacion` | datetime | para poder ordenar "agregados recientemente" a futuro si hace falta |

- Clave única compuesta `(UsuarioId, EspacioId)` — un usuario no puede tener el mismo
  espacio duplicado en favoritos.
- `ON DELETE CASCADE` en ambas FKs: si se borra el usuario o el espacio (ej. un anfitrión
  elimina su espacio), el registro de favorito debe desaparecer solo, sin dejar filas
  huérfanas ni romper el listado.

---

## 2. Endpoints

### 2.1 `GET /api/mobile/favoritos`

Devuelve los IDs de espacio marcados como favoritos por el usuario autenticado (del
token).

**Respuesta `200 OK`:**
```jsonc
[1, 4, 7]
```

Alcanza con un array de IDs — el frontend ya tiene el catálogo completo vía
`GET /api/mobile/espacios` y hace el cruce en cliente (mismo patrón que hoy usa
`useFavoriteSpaces` en `src/hooks/useFilteredSpaces.ts`, solo que los IDs vendrán de acá
en vez de estado local). No hace falta duplicar el objeto `Espacio` completo por cada
favorito.

- Usuario sin favoritos → `200` con `[]` (no `404`).
- Requiere `Authorization` válido → `401` si falta o expiró.

### 2.2 `POST /api/mobile/espacios/{espacioId}/favorito`

Marca `espacioId` como favorito del usuario autenticado.

**Respuestas:**
- `204 No Content` (o `200` con `{ "espacioId": 7, "favorito": true }`, indistinto para
  el frontend) → favorito creado.
- **Idempotente:** si ya era favorito, responder igual `204`/`200` (no `409`) — evita que
  el frontend tenga que manejar un caso especial en el toggle si el usuario tocó el
  corazón dos veces rápido (doble tap, reconexión, etc.).
- `404 Not Found` → el `espacioId` no existe (o está inactivo/eliminado).
- `401` → sin sesión válida.

### 2.3 `DELETE /api/mobile/espacios/{espacioId}/favorito`

Quita `espacioId` de los favoritos del usuario autenticado.

**Respuestas:**
- `204 No Content` → eliminado.
- **Idempotente también:** si no estaba en favoritos, igual `204` (no `404`) — no hay
  nada roto en pedir "quitar" algo que ya no está.
- `401` → sin sesión válida.

> Nota: se prefieren dos endpoints (`POST`/`DELETE`) sobre un único `toggle`, porque el
> frontend siempre sabe el estado actual (`isFavorite(id)`) antes de llamar, así que puede
> pedir la acción exacta que quiere sin depender de que el toggle del servidor coincida
> con lo que el cliente cree que es el estado actual (evita condiciones de carrera si el
> mismo usuario tiene la app abierta en dos dispositivos).

---

## 3. Alternativa considerada (no pedida, pero queda la opción abierta)

Se evaluó embeber un campo `esFavorito: boolean` directamente en cada elemento de
`GET /api/mobile/espacios`, derivado del usuario del token. Se descarta como requisito
principal porque:

- Personalizaría un endpoint que hoy es un catálogo compartido cacheado igual para todos
  los usuarios (`useEspacios` usa `staleTime: 5 min` con la queryKey `['espacios']`, sin
  distinción por usuario) — mezclar eso complica el cacheo en cliente sin necesidad.
- El endpoint de favoritos (§2.1) es liviano (solo IDs) y se puede refrescar
  independientemente del catálogo, con su propio ciclo de cache.

Si backend prefiere ese enfoque por costo de implementación, avisar y lo evaluamos, pero
la opción de los tres endpoints separados (§2) es la que el frontend va a implementar por
default.

---

## 4. Casos borde

- **Espacio eliminado/inactivo con favoritos existentes:** el `DELETE ON CASCADE` (§1)
  se encarga de limpiar la fila; `GET /api/mobile/favoritos` nunca debería devolver un ID
  que ya no exista en el catálogo. Del lado del frontend, aunque llegara un ID así, el
  cruce con `GET /api/mobile/espacios` simplemente no lo muestra (mismo comportamiento
  que hoy).
- **Usuario no autenticado:** los tres endpoints requieren `Authorization` — `401` en
  todos si falta o el token expiró (mismo shape de error que el resto de la API mobile).
- **Doble tap / reconexión con reintento:** cubierto por la idempotencia pedida en §2.2 y
  §2.3.

---

## 5. Checklist

- [ ] Tabla `Favoritos` con FK `UsuarioId`/`EspacioId`, clave única compuesta, `ON DELETE
      CASCADE` en ambas FKs (§1).
- [ ] `GET /api/mobile/favoritos` → array de `espacioId` (int) del usuario autenticado,
      `[]` si no tiene ninguno (§2.1).
- [ ] `POST /api/mobile/espacios/{espacioId}/favorito` → idempotente, `404` si el espacio
      no existe (§2.2).
- [ ] `DELETE /api/mobile/espacios/{espacioId}/favorito` → idempotente (§2.3).
- [ ] Confirmar si el enfoque de endpoints separados (§2) es el implementado, o si se
      opta por la alternativa de `esFavorito` embebido (§3) — avisar cuál para ajustar el
      frontend.
