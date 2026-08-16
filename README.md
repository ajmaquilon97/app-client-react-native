# Agora — app cliente

App móvil de reserva de espacios recreativos (canchas, piscinas, salones) para
Ecuador. Expo + React Native, Android e iOS.

## Empezar

```bash
npm install
npx expo start
```

Necesita un **development build** (usa módulos nativos: cámara, Google Sign-In,
secure store), así que **no funciona en Expo Go**:

```bash
npm run android     # expo run:android
npm run ios         # expo run:ios
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | servidor de desarrollo |
| `npm run android` / `npm run ios` | compila e instala el development build |
| `npm run lint` | ESLint (incluye las reglas de frontera de la arquitectura) |
| `npm test` | Jest |
| `npx tsc --noEmit` | typecheck |

## Arquitectura

Organizada **por features**. Lee [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
antes de tocar código; [`AGENTS.md`](AGENTS.md) tiene el resumen de reglas.

```
src/
  app/          rutas (Expo Router) — solo componen features
  features/     auth · espacios · reservas · pagos · favoritos ·
                resenas · invitados · recepcion · legal
  shared/       api · ui · theme · location · utils · config
```

- Estado de servidor → React Query. Estado de cliente → Context.
- Toda petición pasa por el cliente HTTP de `shared/api`, que inyecta el token y
  maneja el `401 → refresh → reintento`.
- Todo lo visual sale de los tokens de `shared/theme`.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — arquitectura vigente y deuda conocida.
- [`src/shared/theme/README.md`](src/shared/theme/README.md) — sistema de estilos.
- `docs/` — specs de backend, feedback por módulo y guías de build.

## Notas

- `npm run reset-project` viene de la plantilla de Expo y **borraría el proyecto**.
  No lo ejecutes.
- La URL del backend está en `src/shared/config/api.ts` (todavía sin variables de
  entorno — ver la deuda conocida en la doc de arquitectura).
