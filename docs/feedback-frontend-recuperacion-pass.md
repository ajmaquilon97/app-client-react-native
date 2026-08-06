# Recuperación de contraseña — contratos para Frontend

Implementado en el backend (ASP.NET Core Identity). Hay **dos espacios de identidad
independientes** en la API — Web/Anfitriones y Mobile/Clientes — porque el mismo correo puede
tener una cuenta en cada uno. Cada frontend debe llamar únicamente a su prefijo de rutas:

| App               | Prefijo            |
|-------------------|---------------------|
| Web (Anfitriones) | `/api/auth`         |
| Mobile (Clientes) | `/api/mobile/auth`  |

## 1. `POST /api/auth/forgot-password` (Web) / `POST /api/mobile/auth/forgot-password` (Mobile)

Solicita el envío del correo con el enlace de recuperación.

**Request**
```json
{ "email": "usuario@example.com" }
```

**Response — siempre 200 OK**, exista o no una cuenta con ese correo (protección contra
enumeración de usuarios):
```json
{ "message": "Si el correo existe, se ha enviado un enlace de recuperación." }
```

No hay ninguna otra rama de respuesta posible en este endpoint: nunca devuelve 404/400 por
correo inexistente. Si `email` falta o no tiene formato válido, el model binding de ASP.NET
devuelve el `400` estándar de validación de la plataforma (no el formato `{ message }`).

**Enlace enviado por correo** (formato, no lo expone ningún endpoint, es informativo):
```
{origin_del_frontend}/reset-password?token={token_urlencoded}&email={email_urlencoded}
```
El `{origin_del_frontend}` se deriva de la clave de configuración `Google:FrontendCallbackUrl`
(la misma que usa el callback de Google OAuth), tomando solo `scheme://host:puerto` — no la ruta
`/auth/google/callback` completa.

**Importante para el frontend**: el `token` va con `Uri.EscapeDataString` en el `href` del
correo. Cuando el navegador navega a `/reset-password?token=...`, el framework del frontend
(Next.js `useSearchParams`, etc.) entrega el valor **ya decodificado**. Al enviarlo de vuelta en
el body de `reset-password`, mándenlo tal cual lo leyeron de la query string — **no lo
vuelvan a URL-encodear**, es JSON, no un query param.

## 2. `POST /api/auth/reset-password` (Web) / `POST /api/mobile/auth/reset-password` (Mobile)

Consume el token y establece la nueva contraseña.

**Request**
```json
{
  "email": "usuario@example.com",
  "token": "<token recibido en el query string del enlace, sin re-encodear>",
  "newPassword": "nuevaClave123"
}
```
`newPassword` requiere mínimo 6 caracteres (única regla activa de complejidad en este proyecto).

**Response — éxito (200 OK)**
```json
{ "message": "Contraseña actualizada correctamente." }
```

**Response — error (400 Bad Request)** — token inválido, expirado, ya usado, correo sin cuenta
asociada, o `newPassword` no cumple la política:
```json
{ "message": "El enlace no es válido o expiró." }
```
Es intencional que todas esas causas devuelvan el mismo mensaje genérico (no se distingue "token
expiró" de "token inválido" de "correo no existe") para no filtrar información explotable.

## 3. Invalidación de sesiones anteriores

Al resetear la contraseña con éxito, el backend:

- Llama a `UserManager.UpdateSecurityStampAsync` (regenera el `SecurityStamp` del usuario).
- Revoca **todos los refresh tokens activos** del usuario en la tabla `RefreshTokens` — desde ese
  momento ningún `POST /api/auth/refresh` con un refresh token emitido antes del reset funcionará.

**Limitación real que el frontend debe conocer**: los access tokens JWT de esta API son
**stateless** (no hay blacklist de tokens revocados) y **no llevan el `SecurityStamp` como
claim**. Eso significa que `UpdateSecurityStampAsync` **no invalida un access token ya emitido**
— solo bloquea la próxima rotación de refresh token. Un access token capturado antes del reset
sigue siendo válido hasta su expiración natural (`Jwt:AccessTokenMinutes`, actualmente **15
minutos**). Es una ventana corta y es el comportamiento estándar de JWT sin lista de revocación,
pero si el frontend asumía invalidación inmediata del access token, no es así: el reset garantiza
que no se pueda seguir refrescando la sesión, no que el access token en memoria muera al
instante.

## 4. Expiración del token de reset

El token que genera `GeneratePasswordResetTokenAsync` usa el `DataProtectorTokenProvider` por
defecto de Identity, cuyo `TokenLifespan` venía en **24 horas** (default de ASP.NET Core). Se
ajustó a **1 hora** (`Program.cs`, `DataProtectionTokenProviderOptions.TokenLifespan`), por ser
más razonable para un enlace de recuperación enviado por correo. Si el usuario tarda más de 1h en
usar el enlace, `reset-password` devuelve el 400 genérico de la sección 2 y debe pedir uno nuevo
vía `forgot-password`.

Nota: este `TokenLifespan` es una opción global del provider por defecto. Ningún otro flujo del
proyecto lo usa hoy (la verificación de email por OTP usa un provider numérico aparte, con su
propia expiración), así que el cambio es efectivamente exclusivo del flujo de reset de
contraseña.
