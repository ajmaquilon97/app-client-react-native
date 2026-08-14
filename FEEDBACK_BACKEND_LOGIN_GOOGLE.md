# Feedback para backend: endpoint de login con Google

> ✅ Resuelto (2026-08-01): backend implementó el endpoint, pero en una ruta distinta a la
> pedida y separada por espacio de identidad en vez de un único endpoint "inteligente":
> - `POST /api/mobile/auth/google` (`GoogleLoginRequest { idToken }`) → upsert en el espacio
>   **Cliente** (TipoUsuarioId=3), sin password si es cuenta nueva. **Este es el que usa la app
>   móvil.**
> - `POST /api/auth/google/token` → upsert en el espacio **Propietario** (TipoUsuarioId=2, portal
>   web). No aplica a la app móvil.
>
> Ambos responden `{ accessToken, refreshToken }` como se pidió, más `401` si el idToken es
> inválido/expirado o la cuenta está anulada, y `409` si el correo/username ya está en uso por
> otra cuenta Cliente. Actualizamos `src/services/auth.service.ts` (`loginWithGoogle`) para
> apuntar a `/mobile/auth/google` — antes apuntaba a `/auth/google`, que en este swagger solo
> existe como `GET` (parte del flujo de redirect OAuth del portal web), así que el botón de
> Google hubiera seguido fallando aunque backend ya tuviera todo listo.

## Resumen

Agregamos inicio de sesión con Google en la app móvil (botón "Continuar con Google" en login y
registro). El cliente obtiene un `idToken` de Google vía el SDK nativo de Android
(`@react-native-google-signin/google-signin`) y necesita canjearlo por una sesión propia
(`accessToken`/`refreshToken`), igual que ya hace `/auth/login` con email/password.

## Lo que pedimos

Un endpoint nuevo, `POST /auth/google`, que reciba el `idToken` y devuelva los mismos tokens que
`/auth/login`:

**Request**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response 200** (mismo shape que `/auth/login`)
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

## Validación esperada del `idToken`

- Verificar la firma del token contra las llaves públicas de Google
  (`https://www.googleapis.com/oauth2/v3/certs`).
- El `aud` (audience) del token va a ser el client ID de tipo **Web** que ya tenemos en Google
  Cloud Console (`AgoraClientWeb1`, mismo client que usa el portal web) — no hace falta aceptar
  ningún otro audience. El client Android (`AgoraClientAndroid1`) solo autoriza que la app móvil
  pueda pedir el token; no aparece como `aud`.

## Importante: no reusar cuentas del portal web por email

Sabemos que la tabla de usuarios identifica cuentas por **correo + aplicación**, no solo por
correo. Eso es justo lo que necesitamos que `/auth/google` respete: **no** hay que buscar "¿existe
algún usuario con este correo?" a secas, porque el mismo `AgoraClientWeb1` ya lo usa el portal web,
y una persona con cuenta ahí puede loguearse con Google en la app móvil con ese mismo correo — no
queremos que eso la deje entrar a la cuenta del portal, sino que le cree (o la deje crear) una
cuenta nueva, propia de la app móvil.

Entonces, la búsqueda/creación en `/auth/google` debe quedar scopeada igual que ya lo está
`POST /usuarios` (registro con formulario) y `/auth/login` para la app móvil:

- Buscar el usuario por **correo + aplicación = app móvil** (el mismo identificador de aplicación
  que ya usa el registro con formulario, no el que usa el portal).
- Si existe una cuenta para esa combinación, emitir tokens para esa cuenta.
- Si no existe (aunque ya exista una cuenta con ese correo para la aplicación del portal), crear
  una cuenta **nueva**, con `tipoUsuarioId` = `CLI` (el mismo que usa `POST /usuarios` hoy) y la
  aplicación = app móvil, usando los datos del token de Google (`email`, `given_name`,
  `family_name`), sin password. Luego emitir tokens para esa cuenta nueva.
- Si el token es inválido/expirado, responder 401 igual que hoy responde `/auth/login` con
  credenciales incorrectas.

Este mismo criterio (scoping por aplicación, no solo por correo) debería aplicar también si en
algún momento agregan Google Sign-In al portal web usando este mismo client — para que tampoco
pase al revés (alguien con cuenta en la app móvil "entrando" al portal).

## Estado del lado de la app móvil

Ya implementamos el flujo completo del lado cliente:
- `GoogleSignin.configure({ webClientId: ... })` con el client Web (`src/config/googleAuthConfig.ts`).
- `GoogleButton.tsx` dispara `GoogleSignin.signIn()`, obtiene el `idToken` y llama a
  `authService.loginWithGoogle(idToken)` (`src/services/auth.service.ts`), que hoy pega contra
  `POST /auth/google` asumiendo el contrato de arriba.

Mientras el endpoint no exista, el botón va a fallar con un alert de error al intentar loguear.
Avisen si el contrato debería ser distinto (por ejemplo si prefieren mandarle el `idToken` en un
header en vez de body, o si el shape de la respuesta de creación de usuario nuevo necesita otro
campo del cliente).

## Contexto

- Reportado desde: app-client-react-native. 2026-07-30.
- Client OAuth Android creado: `AgoraClientAndroid1` (package `com.obsidiantechlab.agora`).
