# Arquitectura de la aplicación móvil (Agora — cliente)

> Estado: **diagnóstico + arquitectura objetivo**. Documenta lo que hay hoy en `src/`, identifica
> los patrones que conviven y define hacia cuál se unifica.
> Fecha del análisis: 2026-08-11 · rama `develop`.

---

## 1. Resumen ejecutivo

El proyecto **no tiene una sola arquitectura**: tiene **una arquitectura dominante bien definida**
(por capas, con Expo Router + React Query + capa de servicios) y **al menos tres patrones
alternativos conviviendo con ella**, además de una capa de restos de la plantilla de Expo que
nunca se limpió.

| | Patrón | Alcance aproximado |
|---|---|---|
| **A — canónico** | Capas: `app/` → `hooks/` (React Query) → `services/` (fetch + mapeo) → `types/` | ~70 % del código nuevo |
| **B — imperativo** | `useState` + `useEffect` + `fetch` del service dentro del componente | Disponibilidad, aforo, pagos, escaneo QR |
| **C — mutación manual** | Service llamado directo desde el componente + sincronización de caché a mano | **100 % de las escrituras** (0 `useMutation` en todo el repo) |
| **D — estado global** | `Context` que envuelve React Query y expone su propia API | `FavoritesContext` |
| **E — plantilla Expo** | `ThemedText` / `ThemedView` / `NativeTabs` / `explore` | Código muerto o semi-muerto |

La unificación consiste en llevar B, C y D al patrón A, y eliminar E.

---

## 2. Stack técnico

| Área | Tecnología | Versión |
|---|---|---|
| Runtime | Expo (managed + dev-client) | `~56.0.5` |
| React Native | `react-native` | `0.85.3` |
| React | `react` | `19.2.3` |
| Navegación | `expo-router` (file-based) | `~56.2.7` |
| Estado de servidor | `@tanstack/react-query` | `^5.101.0` |
| Estado de cliente | React Context API | nativo |
| Estilos | Sistema propio de design tokens (`src/theme`) | — |
| Persistencia segura | `expo-secure-store` | `~56.0.4` |
| Tipado | TypeScript `strict: true`, alias `@/* → src/*` | `~6.0.3` |

No hay librería de estado global (Redux/Zustand/Jotai), ni de formularios, ni de validación de
esquemas, ni de tests. El HTTP se hace con `fetch` nativo (sin Axios ni cliente generado).

---

## 3. Arquitectura canónica (patrón A) — la que se debe seguir

### 3.1 Capas

```
┌──────────────────────────────────────────────────────────────┐
│  src/app/            RUTAS (Expo Router)                     │
│                      Un archivo = una ruta. Guardas de       │
│                      sesión con <Stack.Protected>.           │
└───────────────┬──────────────────────────────────────────────┘
                │ compone
┌───────────────▼──────────────────────────────────────────────┐
│  src/components/     UI por dominio (auth, home, space,      │
│                      resenas, invitados, payment, legal)     │
│                      + comunes (common, icons, navigation)   │
└───────────────┬──────────────────────────────────────────────┘
                │ consume
┌───────────────▼──────────────────────────────────────────────┐
│  src/hooks/          ESTADO DE SERVIDOR (React Query)        │
│                      useQuery + queryKey exportada           │
│  src/context/        ESTADO DE CLIENTE (sesión, tema,        │
│                      ubicación) vía Context API              │
└───────────────┬──────────────────────────────────────────────┘
                │ llama
┌───────────────▼──────────────────────────────────────────────┐
│  src/services/       ACCESO A LA API                         │
│                      fetch + headers + errores + mapeo       │
│                      DTO de backend → modelo de dominio      │
└───────────────┬──────────────────────────────────────────────┘
                │ tipa con
┌───────────────▼──────────────────────────────────────────────┐
│  src/types/          MODELO DE DOMINIO (barrel único)        │
│  src/theme/  src/utils/  src/config/  src/constants/         │
└──────────────────────────────────────────────────────────────┘
```

**Regla de dependencia:** cada capa solo conoce la de abajo. Un componente nunca debe hacer
`fetch`; un service nunca debe importar React.

### 3.2 Capa de rutas — `src/app/`

- File-based routing de Expo Router. `src/app/_layout.tsx` monta el árbol de providers y el `Stack`.
- El control de acceso es **declarativo**, con `<Stack.Protected guard={...}>` — no hay redirects
  imperativos. Hay cuatro zonas: autenticado, no autenticado, kiosko autenticado, kiosko no
  autenticado ([_layout.tsx:51-73](../src/app/_layout.tsx#L51-L73)).
- Orden de providers (de fuera hacia dentro): `ThemeMode → QueryClient → Auth → KioskAuth →
  Favorites → Location`. El orden importa: `FavoritesProvider` depende de `Auth` y de `QueryClient`.
- Grupo `(tabs)` con `Tabs` de Expo Router y una barra propia (`CustomTabBar`).

### 3.3 Capa de servicios — `src/services/`

Un archivo por dominio de backend. Cada función:

1. es `async` y **stateless** (no conoce React),
2. recibe el `accessToken` como último parámetro explícito,
3. arma la URL a partir de `API_BASE_URL`,
4. valida la respuesta con `throwIfNotOk(res, mensajeFallback)`,
5. **mapea el DTO del backend al modelo de dominio** antes de devolverlo.

El punto 5 es lo que aísla a la app de los cambios del backend. Ejemplo de referencia:
[espacios.service.ts:46-89](../src/services/espacios.service.ts#L46-L89) — `EspacioAPI` (interno,
no exportado) → `Espacio` (dominio).

Errores: `ApiError { message, status }` construido por `throwIfNotOk`; el parseo contempla que
ASP.NET devuelve a veces un string JSON crudo en vez de `{ message }`
([apiError.ts](../src/services/apiError.ts)).

### 3.4 Capa de datos — `src/hooks/`

Un hook por recurso, siempre con la misma forma:

```ts
export const ESPACIOS_QUERY_KEY = ['espacios'] as const;   // 1. key exportada

export function useEspacios() {
  const { fetchAuthorized, isAuthenticated } = useAuth();  // 2. token desde el context
  return useQuery<Espacio[]>({
    queryKey: ESPACIOS_QUERY_KEY,
    queryFn: () => fetchAuthorized(fetchEspacios),         // 3. service envuelto
    enabled: isAuthenticated,                              // 4. gate de sesión
    staleTime: 5 * 60 * 1000,                              // 5. staleTime explícito
  });
}
```

`fetchAuthorized` ([AuthContext.tsx:186-205](../src/context/AuthContext.tsx#L186-L205)) es la pieza
central: obtiene un token válido, ejecuta la petición y, si el backend responde 401 pese a que el
JWT parecía vigente, refresca y reintenta **una sola vez**; si el refresh también falla, cierra la
sesión. Ninguna capa superior debe manejar tokens a mano.

Hooks de **derivación** (sin red) viven en el mismo directorio y componen los de red:
`useFilteredSpaces`, `useFavoriteSpaces`, `useEspaciosPorIds` — filtran/ordenan sobre `useEspacios`
con `useMemo`, sin duplicar peticiones.

Convención de `queryKey` en uso:

| Recurso | Key |
|---|---|
| Catálogo | `['espacios']` |
| Reseñas de un espacio | `['espacios', id, 'resenas']` |
| Reservas reseñables | `['espacios', id, 'resenas', 'reservas-disponibles']` |
| Mis reservas | `['reservas', 'mias']` |
| Favoritos | `['favoritos']` |
| Listas de favoritos | `['listas-favoritos']` / `['listas-favoritos', id]` |

### 3.5 Capa de estado de cliente — `src/context/`

Reservada para lo que **no** es estado de servidor:

| Context | Responsabilidad |
|---|---|
| `AuthContext` | Sesión, tokens en `SecureStore`, refresh, `fetchAuthorized` |
| `KioskAuthContext` | Sesión paralela del modo recepción (PIN) |
| `ThemeModeContext` | Preferencia claro/oscuro |
| `LocationContext` | Permisos y coordenadas del dispositivo |
| `FavoritesContext` | ⚠️ *excepción* — envuelve estado de servidor (ver §4.4) |

Todos exponen un hook `useX()` que lanza si se usa fuera del provider.

### 3.6 Capa de presentación — `src/components/`

Agrupación **por dominio funcional**, no por tipo de componente:
`auth/`, `home/`, `space/`, `resenas/`, `invitados/`, `payment/`, `legal/`, `navigation/`
+ transversales `common/`, `icons/`, `ui/`.

### 3.7 Sistema de estilos — `src/theme/`

Design tokens centralizados ([theme/index.ts](../src/theme/index.ts), 547 líneas): `fontSize`,
`fontWeight`, `lineHeight`, `spacing`, `radius`, `typography`, `palette`, `lightColors`/`darkColors`,
`shadows`, `layout`.

Dos formas de consumo, ambas canónicas:

```ts
const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.colors.surface } }));
const { colors } = useTheme();   // para props del JSX: <HeartIcon color={colors.favorite} />
```

Regla dura ya documentada en el propio archivo: **nunca un hexadecimal ni un `fontSize` numérico
fuera de `theme/`**. Es la capa más consistente del proyecto: **48 de 50 archivos con estilos usan
`makeStyles`**.

### 3.8 Multiplataforma

Especialización por sufijo de archivo (mecanismo nativo del bundler de RN), aplicado de forma
consistente: `animated-icon.web.tsx`, `app-tabs.web.tsx`, `LocationMap.web.tsx`,
`use-color-scheme.web.ts`.

### 3.9 Flujo canónico de lectura

```
Pantalla → useRecurso() → fetchAuthorized(service) → fetch → throwIfNotOk → map DTO→dominio
        ← { data, isLoading, isError, refetch } ←──────────────────────────────────────────
```

---

## 4. Divergencias detectadas — las otras arquitecturas

### 4.1 Patrón B — lectura imperativa dentro del componente

Coexiste con los hooks de React Query. En vez de un hook, el componente declara tres estados por
recurso y los sincroniza a mano en un `useEffect` con bandera `cancelled`:

```ts
const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
const [disponibilidadLoading, setDisponibilidadLoading] = useState(false);
const [disponibilidadError, setDisponibilidadError] = useState<string | null>(null);
// … y otros tres para `aforo`
```

**Dónde:**
- [SpaceDetailSheet.tsx](../src/components/space/SpaceDetailSheet.tsx) — disponibilidad y aforo
  (1190 líneas; además concentra reserva, facturación, pago y favoritos).
- [recepcion/scan.tsx](../src/app/recepcion/scan.tsx) — validación de QR.
- [payment/DatafastPaymentModal.tsx](../src/components/payment/DatafastPaymentModal.tsx) — polling de estado de pago.

**Coste:** sin caché, sin deduplicación, sin reintentos, sin invalidación; el estado se pierde al
cerrar el modal y se vuelve a pedir todo. Cada recurso reimplementa el manejo de race conditions.

### 4.2 Patrón C — escrituras sin `useMutation` (la divergencia más extendida)

**No existe una sola llamada a `useMutation` en todo el repositorio.** Todas las escrituras
(crear reserva, pagar, cancelar, reseñar, editar, borrar, asignar invitados, crear lista, marcar
favorito) siguen este molde dentro del componente:

```ts
const [enviando, setEnviando] = useState(false);
const [error, setError] = useState('');
// setEnviando(true) → try { await fetchAuthorized(service) } catch → setError → finally setEnviando(false)
// y después, a mano: queryClient.setQueryData(...) / queryClient.invalidateQueries(...)
```

La sincronización de caché queda **repartida entre componentes**: el hijo hace la escritura y avisa
por callback (`onCreated` / `onUpdated` / `onDeleted`), y el padre decide qué invalidar
([ResenaSection.tsx:44-70](../src/components/resenas/ResenaSection.tsx#L44-L70)). Eso es exactamente
lo que `useMutation({ onSuccess })` resuelve en un solo lugar, junto al `queryKey` que afecta.

**Consecuencias observadas:**
- La lista de `invalidateQueries` a disparar tras cada escritura está duplicada y desalineada entre
  [favoritos.tsx:70-72](<../src/app/(tabs)/favoritos.tsx#L70-L72>), `SaveToListSheet`, `CrearListaModal`
  y `FavoritesContext` — cuatro sitios que invalidan las mismas tres keys con criterios distintos.
- Cualquier escritura nueva obliga a recordar qué invalidar; olvidarlo produce UI desactualizada
  silenciosamente.
- No hay estado de mutación compartido (`isPending`) reutilizable entre pantallas.

### 4.3 Manejo de errores — tres estrategias en la capa de servicios

| Estrategia | Servicios |
|---|---|
| `throwIfNotOk` + `ApiError` (canónica) | `aforo`, `auth`, `datafast`, `espacios`, `favoritos`, `recepcion`, `reservas` |
| Subclase de `ApiError` **con parser duplicado** | `resenas` (`ResenaApiError` + `throwIfResenaError`, reimplementa `parseErrorMessage` completo), `invitados` (`InvitadoApiError`) |
| Sin capa de errores compartida | `datafastDirectUat` |

La necesidad detrás de las subclases es legítima (exponer `fieldErrors` de un 400, o el
`retryAfter` de un 429), pero la implementación **copia** el parseo en vez de extenderlo.

En la UI la divergencia se repite: `Alert.alert` imperativo (10 archivos, 24 llamadas) conviviendo
con estado `error` renderizado inline — y en varios componentes, **ambos a la vez**.

### 4.4 Patrón D — estado de servidor detrás de un Context

[FavoritesContext](../src/context/FavoritesContext.tsx) envuelve `useFavoritos()` (React Query) y
expone su propia API (`favorites`, `isFavorite`, `toggleFavorite`, `favoritesCount`), incluyendo una
mutación optimista con rollback manual.

El problema no es el optimismo, es que **el mismo dato tiene dos puertas de entrada**: pantallas que
lo leen por `useFavoritesContext()` y otras que importan `FAVORITOS_QUERY_KEY` y hablan con el
`queryClient` directamente. React Query ya es global; el Context solo añade una capa de indirección
y un punto extra donde el caché puede desincronizarse.

### 4.5 Dos convenciones para "pantalla"

- **Ruta = pantalla completa:** `(tabs)/index.tsx` (407 líneas), `reserva/[id]/detalle.tsx` (717).
- **Ruta = adaptador fino que delega en `components/`:** `terminos-condiciones.tsx` y
  `politica-privacidad.tsx` (17 líneas) → `components/legal/LegalDocumentScreen`; y la búsqueda vive
  en `components/home/SearchScreen.tsx` (658 líneas), que es una pantalla completa fuera de `app/`.

### 4.6 Dos convenciones para declarar componentes

| Estilo | Archivos |
|---|---|
| `export default function X(props: Props)` | mayoría del código reciente (resenas, invitados, space, auth) |
| `const X: React.FC<Props> = …; export default X` | `common/SearchBar`, `common/StarRating`, `home/CategoryCard`, `home/EmptyState`, `home/SpaceCard`, los 4 de `payment/`, los ~22 de `icons/` |

`React.FC` está desaconsejado desde React 18 (no aporta tipado útil y arrastra el `children`
implícito histórico).

### 4.7 Patrón E — restos de la plantilla de Expo y código muerto

| Archivo | Situación |
|---|---|
| `gemini.tsx` (raíz, **105 KB**) | Prototipo monolítico completo con datos quemados. 0 referencias. |
| `src/data/espacios.ts` (210 líneas) | Mock del catálogo. **0 imports** en todo `src/`. |
| `src/components/app-tabs.tsx` + `.web.tsx` | Segundo sistema de tabs (`NativeTabs`, tabs `index`/`explore`). 0 referencias — el real es `(tabs)/_layout.tsx` + `CustomTabBar`. |
| `src/components/animated-icon.tsx` + `.web.tsx` | 0 referencias. Únicos archivos que aún usan `StyleSheet.create`. |
| `src/components/hint-row.tsx` | 0 referencias. |
| `src/app/explore.tsx` | Pantalla del template. No está en el `Stack`, pero Expo Router **igual la enruta**: `/explore` es alcanzable. |
| `themed-text.tsx` / `themed-view.tsx` / `ui/collapsible.tsx` / `web-badge.tsx` / `external-link.tsx` | Sistema temático alternativo (`ThemedText`/`ThemedView`) paralelo a `makeStyles`. Solo los usa `explore.tsx`. |
| `src/global.css` | Variables CSS de fuentes, importado por `theme/index.ts`. Sin efecto en nativo (no hay NativeWind ni Tailwind en `package.json`). |
| `docs/theme_default/index.ts`, `docs/theme_pink/index.ts` | Dos copias completas del tema fuera de `src/`. Riesgo de editar la equivocada. |
| `Tabs.Screen name="nueva"` en `(tabs)/_layout.tsx` | Ruta declarada **sin archivo** `nueva.tsx`. La etiqueta ya está comentada en `CustomTabBar`. |

### 4.8 Configuración y secretos

- `API_BASE_URL` está **hardcodeado** en [config/api.ts](../src/config/api.ts) apuntando a un
  hosting temporal. No hay `.env` ni `expo-constants.extra`, así que no existe separación
  dev/staging/prod.
- [datafastDirectUat.ts](../src/services/datafastDirectUat.ts) llama **directo al host externo de
  Datafast** (`eu-test.oppwa.com`) desde el cliente, con `UAT_ENTITY_ID` y `UAT_TOKEN` embebidos.
  El propio archivo se declara temporal y pide borrarse cuando backend corrija el bug, pero ya está
  cableado en `calendario.tsx` y en `DatafastPaymentModal`. Es una **cuarta ruta de acceso a datos**
  que no pasa por la arquitectura.
- 31 `console.log` sin guarda `__DEV__`, algunos con datos de sesión
  ([AuthContext.tsx:126-134](../src/context/AuthContext.tsx#L126-L134) loguea el usuario y el flujo
  de tokens de Google).

---

## 5. Arquitectura objetivo

Una sola arquitectura por capas, con estas reglas verificables:

1. **Ningún componente hace `fetch` ni conoce `accessToken`.** Todo pasa por `hooks/`.
2. **Toda lectura de servidor es un `useQuery`** en `src/hooks/useX.ts`, con `queryKey` exportada,
   `enabled` y `staleTime` explícitos.
3. **Toda escritura de servidor es un `useMutation`** en `src/hooks/useXMutations.ts`, con la
   invalidación de caché declarada en su `onSuccess`. Ningún `invalidateQueries` suelto en pantallas.
4. **`src/context/` solo guarda estado de cliente.** El estado de servidor vive en React Query.
5. **Un solo `ApiError`**, extendido (no copiado) cuando un dominio necesita campos extra.
6. **Un solo sistema de estilos:** `makeStyles` + `useTheme`. Sin `StyleSheet.create`, sin hexadecimales.
7. **`src/app/` solo enruta y compone.** La pantalla puede vivir en `components/<dominio>/`, pero la
   regla se aplica igual en ambos lados.
8. **`export default function` + `interface Props`.** Sin `React.FC`.
9. **La configuración de entorno se lee de una sola fuente** (`expo-constants.extra` / `.env`).

---

## 6. Plan de unificación

Ordenado por relación beneficio/riesgo. Cada fase es independiente y se puede mergear sola.

### Fase 0 — Limpieza (riesgo nulo, alto impacto en claridad)
- Borrar `gemini.tsx`, `src/data/espacios.ts`, `app-tabs.tsx(.web)`, `animated-icon.tsx(.web)`,
  `hint-row.tsx`.
- Decidir sobre `explore.tsx` y su cadena (`themed-text`, `themed-view`, `ui/collapsible`,
  `web-badge`, `external-link`): borrar, o dejarla como pantalla de debug fuera de `app/`.
- Quitar el `Tabs.Screen name="nueva"` fantasma.
- Mover `docs/theme_default|theme_pink` a un único lugar versionado, o eliminarlos.
- Evaluar `global.css` (borrar si no hay plan de web con CSS).

### Fase 1 — Unificar escrituras con `useMutation`
La fase de mayor impacto. Por dominio, en este orden (de menor a mayor riesgo):

1. `resenas` — es el flujo más reciente y aislado; sirve de plantilla de referencia.
2. `favoritos` + `listas-favoritos` — aquí está la duplicación de invalidaciones; al centralizarlas
   se puede además decidir el futuro de `FavoritesContext` (fase 3).
3. `invitados`.
4. `reservas` / `pagos` — último, porque toca `SpaceDetailSheet`.

Entregable por dominio: `src/hooks/useXMutations.ts` con las invalidaciones dentro de `onSuccess`,
y componentes que solo consumen `{ mutate, isPending, error }`.

### Fase 2 — Migrar lecturas imperativas a React Query
`useDisponibilidad(espacioId, fecha)` y `useAforoDia(espacioId, fecha)` reemplazan los seis estados
manuales de `SpaceDetailSheet`. Aprovechar para partir ese componente (1190 líneas) en
`SpaceDetailSheet` (presentación) + `useReservaFlow` (orquestación).

### Fase 3 — Un solo canal para favoritos
Eliminar `FavoritesContext` y exponer `useFavoritos()` + `useToggleFavorito()` (con el optimismo ya
implementado, movido al `onMutate` de la mutación). Menos providers, una sola fuente de verdad.

### Fase 4 — Unificar errores
`ResenaApiError` e `InvitadoApiError` extienden `ApiError` y **reutilizan** `parseErrorMessage`;
un único helper `throwIfNotOk(res, fallback, ErrorClass?)`. Definir además la regla de UX:
error inline para validación de formulario, `Alert` solo para acciones destructivas y confirmaciones.

### Fase 5 — Convenciones y configuración
- Migrar los ~30 componentes `React.FC` a `export default function`.
- Mover `API_BASE_URL` y las claves de pago a configuración por entorno; borrar `datafastDirectUat`
  cuando backend confirme el fix.
- Guardar los `console.log` restantes tras `__DEV__` (o un `logger` propio).
- Fijar las reglas 1-9 de §5 como lint rules donde sea posible (`no-restricted-imports` para impedir
  `@/services` desde `src/components` y `src/app`).

---

## 7. Mapa de referencia rápido

| Directorio | Qué contiene | Qué **no** debe contener |
|---|---|---|
| `src/app/` | Rutas, layouts, guardas | Lógica de negocio, `fetch` |
| `src/components/<dominio>/` | UI del dominio | `fetch`, tokens, `invalidateQueries` |
| `src/hooks/` | `useQuery` / `useMutation` + derivaciones | Llamadas `fetch` directas |
| `src/context/` | Estado **de cliente** | Estado de servidor |
| `src/services/` | HTTP + mapeo DTO→dominio + errores | React, hooks, estado |
| `src/types/` | Modelo de dominio | DTOs crudos del backend |
| `src/theme/` | Design tokens, `makeStyles` | Componentes |
| `src/utils/` | Funciones puras (`fechas`, `geo`, `espacioArchetype`) | I/O |
| `src/config/` | Constantes de entorno | Secretos |
