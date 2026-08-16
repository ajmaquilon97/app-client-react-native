# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Arquitectura

Referencia completa: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Léela antes
de añadir una pantalla, un endpoint o una feature.

## Estructura

```
src/app/         rutas de Expo Router — solo componen features
src/features/    un dominio por carpeta, autocontenido
src/shared/      base común (api, ui, theme, location, utils, config)
```

Anatomía de una feature: `components/ hooks/ services/ types.ts index.ts` (+
`context/` y `errors.ts` si el dominio los necesita).

## Reglas (están en ESLint como error)

1. Una feature habla con otra **solo por su barrel** (`@/features/reservas`).
   Dentro de la propia feature, rutas relativas.
2. `shared/` no importa ninguna feature.
3. **Un componente no llama a un servicio.** Consume hooks.
4. **Ningún componente conoce el `accessToken`.** Lo inyecta el cliente HTTP.

## Datos

- **Toda lectura** es `useQuery` en `features/x/hooks/`, con `queryKey` exportada.
- **Toda escritura** es `useMutation`, con su `invalidateQueries` en `onSuccess`.
  Nunca un `invalidateQueries` suelto en una pantalla.
- Los servicios usan `api.get/post/put/del` de `@/shared/api/client` y siempre
  pasan un `fallback` (el mensaje que verá el usuario).
- El DTO del backend se declara **dentro** del servicio y no sale de ahí; lo que
  sale es modelo de dominio.
- `context/` es solo para estado de cliente. El estado de servidor vive en React
  Query.

## Estilos

- Todo sale de `@/shared/theme`: `makeStyles` para las hojas, `useTheme()` para
  colores en el JSX.
- **Nunca** un hexadecimal ni un `fontSize` numérico fuera de `theme/`.

## Antes de dar algo por terminado

```bash
npx tsc --noEmit     # 1 error preexistente conocido en pagos/config.ts
npm run lint
npm test
```

React Compiler está activo: no hace falta añadir `useMemo`/`useCallback` nuevos.
