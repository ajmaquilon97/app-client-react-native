# Feedback para backend: enlace de recuperación de contraseña para Mobile

## Resumen

Ya implementamos el flujo de "olvidé mi contraseña" en la app móvil (Clientes) contra
`POST /api/mobile/auth/forgot-password` y `POST /api/mobile/auth/reset-password`, tal
como quedaron documentados en `docs/feedback-frontend-recuperacion-pass.md`. El único
punto pendiente es el **destino del enlace que se envía por correo**.

## El problema

Según ese mismo documento, el enlace se construye hoy como:
```
{origin_del_frontend}/reset-password?token={token_urlencoded}&email={email_urlencoded}
```
donde `{origin_del_frontend}` sale de `Google:FrontendCallbackUrl` — y esa configuración
apunta al portal web de Anfitriones. Eso es correcto para `POST /api/auth/forgot-password`
(web), pero `POST /api/mobile/auth/forgot-password` usa la misma config, así que hoy el
correo que le llega a un usuario de la app móvil lo manda a una URL web que no
existe/no aplica para él — la app móvil no tiene forma de recibir ni procesar ese link.

## Lo que pedimos

Ya que `/api/mobile/auth/forgot-password` es un endpoint separado del web (distinto
prefijo de rutas, distinto espacio de identidad), pedimos que, únicamente para este
endpoint, el enlace se construya con un esquema de deep link en vez del origin web:
```
appclientreactnative://restablecer-password?token={token_urlencoded}&email={email_urlencoded}
```
`appclientreactnative` es el `scheme` declarado en el `app.json` de la app móvil
(`expo.scheme`), y `expo-router` resuelve `restablecer-password` automáticamente al
archivo de ruta `src/app/restablecer-password.tsx` sin configuración adicional de
linking — no hace falta ningún mapeo especial del lado del backend más allá de armar
esa URL con ese formato.

## Config sugerida

Proponemos una clave nueva, ej. `Mobile:DeepLinkScheme` (o el nombre que el equipo de
backend prefiera), con default `appclientreactnative://restablecer-password`, análoga a
como `Google:FrontendCallbackUrl` ya resuelve el origin del portal web — para que
`/api/mobile/auth/forgot-password` arme el link con esta config en vez de
`Google:FrontendCallbackUrl`. El resto del contrato (query params `token`/`email`,
urlencoding del token, expiración de 1h, respuesta 200 siempre) queda exactamente igual
a lo ya documentado — este pedido es solo sobre el origin del link, no sobre el
endpoint ni el formato de query string.

## Por qué no afecta al flujo web

`/api/auth/forgot-password` (web) y `/api/mobile/auth/forgot-password` (mobile) ya son
endpoints distintos hoy — este cambio solo toca la rama mobile del código que arma el
link, así que el portal de Anfitriones sigue recibiendo el link con
`Google:FrontendCallbackUrl` sin ningún cambio de comportamiento.

## Estado del lado de la app móvil

Ya implementamos las pantallas `olvide-password` y `restablecer-password` (rutas
`src/app/olvide-password.tsx` / `src/app/restablecer-password.tsx`) contra el contrato
de `docs/feedback-frontend-recuperacion-pass.md`. `restablecer-password` lee `token` y
`email` de la query string del deep link vía `useLocalSearchParams()` — si cualquiera de
los dos falta o llega vacío, muestra un estado de "enlace inválido" en vez del
formulario. Mientras el backend no arme el link con este scheme, no podemos probar el
flujo de punta a punta con un correo real — lo estamos validando disparando el deep
link manualmente, por ejemplo:
```
adb shell am start -a android.intent.action.VIEW -d "appclientreactnative://restablecer-password?token=...&email=..."
```
así que no estamos bloqueados para seguir desarrollando/probando el resto de la
pantalla, solo para la prueba end-to-end con el correo real.

## Contexto

- Reportado desde: app-client-react-native. 2026-08-05.
- Ver también: `docs/feedback-frontend-recuperacion-pass.md` (contrato ya implementado),
  `docs/backend-recuperacion-password-spec.md` (spec original del portal web).
