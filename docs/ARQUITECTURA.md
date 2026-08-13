# Arquitectura de la aplicación móvil (Agora — cliente)

> Describe la arquitectura **vigente**. Si vas a añadir una pantalla, un endpoint
> o una feature, esto es lo que hay que seguir.
> Última actualización: 2026-08-12.

---

## 1. En una frase

App Expo Router organizada **por features**: cada dominio de negocio es una
carpeta autocontenida con su UI, sus hooks, su servicio y sus tipos; debajo, una
capa `shared/` con el cliente HTTP, el tema y los utilitarios.

**Estado de servidor** → React Query, siempre. **Estado de cliente** → Context,
solo para lo que no viene del backend.

---

## 2. Stack

| Área | Tecnología | Versión |
|---|---|---|
| Runtime | Expo (managed + dev-client) | `~56.0.5` |
| React Native | `react-native` | `0.85.3` |
| React | `react` (con **React Compiler** activo) | `19.2.3` |
| Navegación | `expo-router` (file-based) | `~56.2.7` |
| Estado de servidor | `@tanstack/react-query` | `^5.101.0` |
| Estado de cliente | React Context API | nativo |
| Estilos | Design tokens propios (`shared/theme`) | — |
| Sesión | `expo-secure-store` | `~56.0.4` |
| Red | `fetch` nativo tras un cliente propio | — |
| Tests | `jest-expo` | `~56.0.5` |

`experiments.reactCompiler: true` en `app.json`. El chequeo de compatibilidad
compila **107 de 107 componentes**.

---

## 3. Estructura

```
src/
  app/                     RUTAS (Expo Router). Solo componen features.
    _layout.tsx            providers + Stack + ErrorBoundary
    +not-found.tsx
    (tabs)/  reserva/[id]/  recepcion/

  features/                UN DOMINIO POR CARPETA
    auth/         sesión, login, registro, recuperación de contraseña
    espacios/     catálogo, búsqueda, tarjetas, mapa
    reservas/     disponibilidad, aforo, reserva, calendario, facturas
    pagos/        Datafast, Kushki, resultado de pago
    favoritos/    corazón global y listas
    resenas/      reseñas de un espacio
    invitados/    control de acceso (invitaciones)
    recepcion/    modo kiosco (PIN + escaneo de QR)
    legal/        términos y política de privacidad

  shared/                  BASE COMÚN — no depende de ninguna feature
    api/          client.ts · errors.ts · queryClient.ts · rn-bridge.ts
    ui/           icons/ · navigation/ · feedback/ · SearchBar · StarRating…
    theme/        design tokens + ThemeModeContext
    location/     LocationContext
    utils/        fechas · geo
    config/       api · googleAuthConfig
```

Anatomía de una feature (no todas tienen todas las piezas):

```
features/<dominio>/
  components/    UI del dominio
  hooks/         useQuery (lecturas) · useMutation (escrituras)
  services/      HTTP + mapeo DTO→dominio
  context/       solo si el dominio tiene estado de cliente (auth, recepcion)
  errors.ts      subclase de ApiError, si el dominio la necesita
  types.ts       modelo de dominio
  index.ts       barrel: la única puerta de entrada desde fuera
  __tests__/
```

### Reglas de dependencia

| Desde | Puede importar |
|---|---|
| `src/app/**` | barrels de features + `@/shared/**` |
| `src/features/x/**` | `@/shared/**`, sus propios archivos por ruta **relativa**, y el **barrel** de otras features |
| `src/shared/**` | solo `@/shared/**` |

Más: **ningún componente llama a un servicio** ni conoce el token.

Las tres están en `eslint.config.js` como **error**. Las excepciones legítimas se
marcan en el sitio con un `eslint-disable` y su motivo (hoy hay una: el modal de
Datafast, que orquesta un SDK externo de forma imperativa).

Dirección de las dependencias cruzadas, sin ciclos:

```
pagos ──▶ reservas ──▶ espacios
invitados ──▶ reservas
favoritos ──▶ espacios
resenas   ──▶ espacios
```

`espacios` no importa a nadie: el corazón de favorito llega a `SpaceCard` como
prop. Conservar esa inversión es lo que mantiene el grafo acíclico.

---

## 4. Cómo fluyen los datos

### Lectura

```
Pantalla → useX() [useQuery] → servicio → api.get() → mapeo DTO→dominio
        ← { data, isLoading, isError, refetch } ←──────────────────────
```

```ts
// features/espacios/hooks/useEspacios.ts
export const ESPACIOS_QUERY_KEY = ['espacios'] as const;

export function useEspacios() {
  const { isAuthenticated } = useAuth();
  return useQuery<Espacio[]>({
    queryKey: ESPACIOS_QUERY_KEY,
    queryFn: fetchEspacios,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,   // solo si te apartas del default
  });
}
```

### Escritura

Toda escritura es un `useMutation`, **con su invalidación de caché al lado**.
Nunca un `invalidateQueries` suelto en una pantalla.

```ts
export function useCrearResena(espacioId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearResenaInput) => crearResena(espacioId, input),
    onSuccess: (nueva, input) => {
      queryClient.setQueryData<Resena[]>(resenasEspacioQueryKey(espacioId), p =>
        p ? [nueva, ...p] : [nueva]);
      queryClient.invalidateQueries({ queryKey: ESPACIOS_QUERY_KEY });
    },
  });
}
```

El componente solo consume `{ mutate, isPending, error }`.

### Escritura optimista

Cuando la acción debe sentirse instantánea (el corazón de favoritos), el
optimismo va en `onMutate` con rollback en `onError`:

```ts
onMutate: async ({ espacioId, esFavorito }) => {
  await queryClient.cancelQueries({ queryKey: FAVORITOS_QUERY_KEY });  // no lo pise un refetch en vuelo
  const anterior = queryClient.getQueryData<number[]>(FAVORITOS_QUERY_KEY);
  queryClient.setQueryData<number[]>(FAVORITOS_QUERY_KEY, (prev = []) => …);
  return { anterior };
},
onError: (_e, _v, ctx) => queryClient.setQueryData(FAVORITOS_QUERY_KEY, ctx.anterior),
onSettled: () => invalidarFavoritos(queryClient),
```

---

## 5. El cliente HTTP

[`shared/api/client.ts`](../src/shared/api/client.ts) centraliza URL base,
cabeceras, serialización, parseo de errores y la política de sesión.

```ts
export const misReservas = () =>
  api.get<Reserva[]>('/reservas/mias', { fallback: 'No se pudieron obtener tus reservas.' });
```

`fallback` es obligatorio: es el mensaje que ve el usuario si el backend no manda
uno propio.

| Opción | Para qué |
|---|---|
| `auth: false` | endpoint público (login, reseñas de un espacio) |
| `token: string` | sesión ajena a la del cliente — hoy solo el kiosco |
| `makeError` | construir una subclase de `ApiError` con campos extra |
| `query` | parámetros de URL; los `null`/`undefined` se omiten |

**Sesión.** `AuthContext` registra un `TokenProvider` al montar. Con eso, el
`401 → refresh → reintento (una vez) → si falla, cerrar sesión` lo aplica el
cliente a **todas** las peticiones, sin que ninguna tenga que envolverse.

Dos excepciones deliberadas, ambas con test que las fija:

- `fetchUsuario` recibe el token explícito: se llama durante el arranque, cuando
  el token está en `SecureStore` pero aún no en el estado de `AuthContext`.
- El kiosco (`token: …`) no tiene refresh: su 401 se propaga para que la UI
  vuelva a pedir el PIN, sin tocar la sesión del cliente.

**Errores.** Un solo `ApiError { message, status }`. Un dominio que necesite más
extiende la clase y pasa una `ErrorFactory` que recibe el cuerpo y las cabeceras
ya parseados — nunca reimplementa el parseo:

```ts
// features/invitados/errors.ts
export const makeInvitadoError: ErrorFactory = ({ message, status, body, headers }) => …
```

Vive en `errors.ts` de la feature, no en el servicio, para que la UI pueda
importarlo sin saltarse la frontera.

**Configuración de React Query** ([`queryClient.ts`](../src/shared/api/queryClient.ts)):
`staleTime` 1 min, `gcTime` 5 min, y `retry` que **no reintenta 4xx** (son de
contrato, no de red). [`rn-bridge.ts`](../src/shared/api/rn-bridge.ts) conecta
`focusManager` a `AppState` y `onlineManager` a `expo-network`: sin eso, en
nativo la app no refresca al volver de segundo plano ni al recuperar conexión.

---

## 6. Estilos

Todo pasa por [`shared/theme`](../src/shared/theme/index.ts): `fontSize`,
`spacing`, `radius`, `typography`, `palette`, `lightColors`/`darkColors`,
`shadows`.

```ts
const useStyles = makeStyles(t => ({ card: { backgroundColor: t.colors.surface } }));
const { colors } = useTheme();   // para props del JSX
```

**Nunca un hexadecimal ni un `fontSize` numérico fuera de `theme/`.**

`getTheme(scheme)` es la versión sin hook, para donde no hay contexto (el
`ErrorBoundary` raíz se renderiza por encima de `ThemeModeProvider`).

`shared/theme/global.css` **sí se usa**: define las variables de fuente que
consume la rama `web` de `fonts`.

---

## 7. Estados de UI

`shared/ui/feedback` evita que cada pantalla repinte lo mismo:

- `ScreenState` — cargando / error con reintento / vacío.
- `QueryBoundary` — envuelve una query completa. Útil cuando la pantalla *es*
  una sola cosa; si hay cabecera que debe seguir visible durante la carga, usa
  `ScreenState` como `ListEmptyComponent`.
- `DeferredContent` — aplaza el montaje de un árbol pesado y mientras tanto
  pinta el indicador. Para demoras de render, no de red (§7.1).

Regla de UX para errores: **inline** para validación de formulario, `Alert` para
acciones destructivas, confirmaciones y fallos que interrumpen un flujo.

### 7.1 Toda demora perceptible lleva indicador

**Regla:** ninguna acción del usuario puede quedar sin respuesta visual. Si entre
el toque y el resultado hay una espera que se nota, va el indicador de la app —
el spinner rosa (`colors.accent`, `#FD548A`) que pinta `ScreenState`. Siempre el
mismo, en cualquier pantalla: es la señal de "te escuché, estoy en ello".

No inventes un indicador nuevo por pantalla. Lo que cambia según de dónde venga
la demora es **qué componente** la cubre:

| De dónde viene la demora | Qué usar | Ejemplo |
| --- | --- | --- |
| Una petición de red | `QueryBoundary`, o `ScreenState variant="loading"` si la cabecera debe seguir visible | catálogo de espacios, reservas |
| El montaje de una pantalla pesada (imágenes, `WebView`, selectores) | `DeferredContent` | hoja de detalle del espacio |
| Una acción puntual del usuario | El estado pendiente del propio botón (`isPending` de la mutación) | "Continuar al pago" |

El tercer caso no lleva `ScreenState`: bloquear la pantalla entera por una
mutación esconde el contexto que el usuario acaba de rellenar.

### 7.2 `DeferredContent`: demoras de render

Un contenedor solo pinta su primer frame cuando ya montó **todo** lo que lleva
dentro. Si eso incluye imágenes remotas, selectores y un `WebView`, entre el
toque y la aparición de la ventana hay un hueco en el que la app parece colgada:
no hay nada que indique que el toque se registró.

`DeferredContent` invierte el orden — primero la ventana con el indicador, que
es barata de pintar; el trabajo caro después, ya con respuesta en pantalla:

```tsx
<DeferredContent active={visible} message="Preparando el espacio…">
  {() => <ArbolPesado />}
</DeferredContent>
```

Tres detalles que no son casuales:

- **Los hijos son una función**, no un elemento. Así el árbol pesado ni siquiera
  se construye hasta que toca montarlo, que es justo lo que se quiere aplazar.
- **`active` rearma el gate.** Al cerrarse, la siguiente apertura vuelve a
  empezar por el indicador en vez de enseñar un frame del contenido anterior.
- **Deja fuera lo que deba responder ya.** En la hoja de detalle la cabecera vive
  fuera del gate: se puede volver sin esperar a que cargue el resto.

Por dentro usa `requestIdleCallback` y **no**
`InteractionManager.runAfterInteractions`: este último quedó deprecado en React
Native 0.84 (vamos por la 0.85) y su propia nota de deprecación remite a
`requestIdleCallback`. Lleva un plazo máximo de 500 ms como seguro contra el
indicador eterno: si el hilo de JS nunca llega a estar ocioso, el contenido se
monta igual.

En Jest el global lo aporta [`jest/setup.js`](../jest/setup.js), resuelto al
momento, para que los tests de componentes no tengan que saber que existe el
aplazamiento.

### 7.3 Saneo de entrada

[`shared/utils/texto.ts`](../src/shared/utils/texto.ts) — `soloDigitos`,
`soloNombre`, `soloCorreo`. Se aplican en el **setter**, no en el `TextInput`:
`keyboardType` es una sugerencia al teclado, no una restricción (no cubre pegar
ni un teclado físico), y así lo que viaja a backend no depende de qué componente
pinte el formulario. Ver `useReservaFlow` para el patrón.

Van por lista blanca —qué se conserva— y no por lista negra de emojis: cada
versión de Unicode añade rangos, y hay que contar con secuencias ZWJ, tonos de
piel, keycaps y banderas. Además evita depender del soporte de
`\p{Extended_Pictographic}` en Hermes, que no es el motor con el que corren los
tests.

Hoy solo lo usan los campos de facturación. Los formularios de registro e
invitados siguen sin sanear.

---

## 8. Tests

`npm test` (jest-expo). Cubren la capa barata y de mayor retorno: cliente HTTP,
servicios de cada feature, utils y el mapeo DTO→dominio. **590 tests.**

`jest/setup.js` mockea los módulos nativos de terceros; `jest/styleMock.js`
absorbe los `import './global.css'`.

⚠️ `renderHook` de `@testing-library/react-native` 14 devuelve un objeto vacío
con React 19.2 / RN 0.85 — **no funciona**. La lógica de las mutaciones se prueba
con el `MutationObserver` de React Query, que ejercita `onMutate`/`onError`/
`onSettled` sin montar React (ver
[`useToggleFavorito.test.ts`](../src/features/favoritos/__tests__/useToggleFavorito.test.ts)).
Para probar componentes habrá que resolver antes lo de RTL.

---

## 9. Añadir algo nuevo

**Un endpoint a una feature existente**
1. Función en `services/`, con `api.*` y su `fallback`.
2. Hook en `hooks/`: `useQuery` si lee, `useMutation` (con su invalidación en
   `onSuccess`) si escribe.
3. Expórtalo en `index.ts`.
4. Test del servicio.

**Una feature nueva**
1. `src/features/<dominio>/` con la anatomía de §3.
2. Los DTOs del backend se declaran **dentro** del servicio y no salen de ahí; lo
   que sale es modelo de dominio.
3. Si necesita estado de cliente, un `context/` propio; si es estado de servidor,
   no lo metas en un Context.
4. La ruta en `src/app/` solo compone.

---

## 10. Deuda conocida

Decisiones tomadas a conciencia, no olvidos:

| Qué | Por qué sigue ahí |
|---|---|
| `API_BASE_URL` hardcodeado en `shared/config/api.ts` | Fuera del alcance acordado. El camino es `.env` + `EXPO_PUBLIC_API_URL` (se inlinea en el bundle: vale para URLs, nunca para secretos). |
| `pagos/services/datafastDirectUat.ts` | Diagnóstico temporal con credenciales UAT embebidas, mientras backend arregla la validación de `resourcePath`. Aislado tras el barrel de `pagos`. **Borrar junto con el flag `DATAFAST_DIAGNOSTICO_DIRECTO_UAT` cuando backend confirme.** |
| `paymentConfig.ts:105` — único error de `tsc` | Comparación contra un toggle manual de pasarela fijado a `'datafast'`. Preexistente; tocarlo es cambiar configuración de pagos. |
| 4 `react-hooks/set-state-in-effect` | Dos en los modales de pago, uno en `useReservaFlow`, uno en `LocationContext`. Son idiomáticos, no bugs: el reset funciona. Arreglarlos bien exige reestructurar el flujo de pago, que no conviene tocar sin poder ejecutarlo. |
| ~104 `useMemo`/`useCallback` manuales | Redundantes con React Compiler, pero **no dañinos**: `preserve-manual-memoization` reporta 0. Se quitan al tocar cada archivo, no en un barrido masivo. Ojo con `SpaceDetailSheet` → `hoy`, marcado `NO BORRAR`: su dependencia es intencional. |
| ~30 componentes con `React.FC` | Se migran a `export default function` al tocar cada archivo. |
| `docs/theme_default/`, `docs/theme_pink/` | Plantillas de paleta fuera de `src/`; `docs/` está excluido de `tsconfig`. Decidir si se integran o se borran. |
