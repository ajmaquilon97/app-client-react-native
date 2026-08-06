# Recuperación de contraseña — Backend (ApiTesis / ASP.NET Core)

> **De:** equipo Frontend (Next.js — portal de anfitriones)
> **Para:** equipo Backend (ApiTesis / .NET)
> **Objetivo:** flujo estándar de "olvidé mi contraseña" por enlace de un solo uso
> enviado por correo. El frontend ya implementó las pantallas y las Server Actions
> (`src/actions/auth.ts` → `forgotPassword`, `resetPassword`; cliente HTTP en
> `src/lib/auth-api.ts`) contra el contrato descrito abajo — **no existe hoy en el
> backend** (no aparece en `docs/swagger-api-login.json`). Mientras no se implemente,
> el frontend queda mostrando el estado de "enviando…" indefinidamente / error genérico.

---

## 0. Flujo end-to-end

1. Usuario en `/login` da clic en "¿Olvidaste tu contraseña?" → `/forgot-password`.
2. Ingresa su correo → `POST /api/auth/forgot-password`.
3. **Sin importar si el correo existe o no**, el frontend muestra el mismo mensaje
   genérico ("si existe una cuenta asociada, te enviamos un enlace…") — esto es
   deliberado, para no permitir enumerar cuentas registradas probando correos. El
   backend debe sostener esta misma garantía: **responder 200 siempre** que el body
   sea válido, exista o no el correo.
4. Si el correo existe, backend genera un token de un solo uso, lo persiste con
   expiración, y envía un correo (mismo mecanismo de envío real que ya usa
   `POST /api/auth/send-email-otp`) con un link a:
   ```
   {FRONTEND_URL}/reset-password?token=<token>&email=<email>
   ```
   `{FRONTEND_URL}` es la misma variable/config que ya usa el callback de Google
   OAuth (`docs/backend-cambios-solicitados.md §3`) — reutilizarla, no hardcodear
   otra URL.
5. Usuario abre el link desde su correo → el frontend renderiza el formulario de
   nueva contraseña en `/reset-password` (lee `token`/`email` de la querystring).
6. Envía la nueva contraseña → `POST /api/auth/reset-password` con
   `{ email, token, newPassword }`.
7. Si el token es válido y no expiró: se actualiza la contraseña, el token queda
   invalidado (un solo uso), y el frontend redirige a `/login?reset=success`.
8. Si el token es inválido/expirado/ya usado: `400`/`410` con mensaje — el frontend
   muestra "El enlace no es válido o expiró. Solicita uno nuevo." y un link de vuelta
   a `/forgot-password`.

---

## 1. `POST /api/auth/forgot-password`

**Body:**
```jsonc
{ "email": "usuario@correo.com" }
```

**Comportamiento:**
- Buscar el usuario por `email`.
  - **Si existe:** generar un token de reseteo (ej. Identity
    `UserManager.GeneratePasswordResetTokenAsync`), persistir su expiración (ver §3),
    y enviar el correo con el link del §0.4.
  - **Si NO existe:** no hacer nada (no crear token, no enviar correo) — pero
    responder exactamente igual que si existiera.
- **Respuesta en ambos casos:** `200 OK`, sin body relevante (o `{ "message": "..." }`
  genérico, mismo string sin importar el caso).
- Único caso donde debe fallar: el body es inválido (`email` ausente o mal formado)
  → `400` con el shape de error estándar (§4 de `backend-cambios-solicitados.md`):
  ```jsonc
  { "message": "...", "errors": { "email": ["..."] } }
  ```
- **No filtrar información** en el tiempo de respuesta ni en logs accesibles al
  cliente: la diferencia entre "correo existe" y "correo no existe" debe ser
  indetectable desde afuera.

**Recomendado (no bloqueante para el frontend, pero importante en producción):**
- Rate limiting por IP y/o por correo (ej. máx. 3 solicitudes cada 15 minutos) para
  evitar spam de correos hacia una víctima.
- Si ya existe un token vigente sin usar para ese usuario, invalidarlo al generar uno
  nuevo (que solo el último link enviado funcione).

## 2. `POST /api/auth/reset-password`

**Body:**
```jsonc
{
  "email": "usuario@correo.com",
  "token": "<token del link>",
  "newPassword": "NuevaClave123"
}
```

**Validación de `newPassword`:** misma política que registro (`SignupSchema` en el
frontend) — mínimo 8 caracteres, al menos una letra y un número. Si el backend tiene
una política de Identity distinta/más estricta, avisar para alinear el mensaje de
ayuda que se muestra en el formulario (`src/components/auth/ResetPasswordForm.tsx`).

**Respuestas:**
- `200 OK` → contraseña actualizada. El token queda invalidado (no debe poder
  reusarse). El frontend redirige a `/login`.
- `400 Bad Request` → token inválido, ya usado, o no corresponde al `email` dado.
- `410 Gone` (o `400`, ver nota) → token expirado. El frontend trata `400` y `410`
  igual (mismo mensaje genérico "enlace inválido o expirado"), así que cualquiera de
  los dos sirve — usar el que sea más natural para el backend; no es necesario
  distinguirlos en el body, pero si se puede, mejor.
- Cuerpo de error, mismo shape estándar:
  ```jsonc
  { "message": "El enlace no es válido o expiró." }
  ```

**Recomendado — seguridad:**
- Al resetear exitosamente, revocar/invalidar los refresh tokens activos del usuario
  (forzar el cierre de sesión en otros dispositivos) — igual que un cambio de
  contraseña normal debería hacer. Confirmar si esto ya ocurre en algún flujo
  existente (ej. `PUT /api/usuarios/{id}` cuando cambia password desde Configuración,
  si ese endpoint lo permite) o si hay que agregarlo aquí también.
- Enviar un correo de confirmación ("tu contraseña fue cambiada") es buena práctica
  pero no es requisito de esta spec — queda a criterio de backend si ya tienen el
  mecanismo de envío listo.

## 3. Expiración del token

No hay un requisito de negocio específico — se recomienda una ventana corta, típica
de este tipo de flujo: **30–60 minutos**. Si se usa el `DataProtectorTokenProvider`
por defecto de ASP.NET Identity, confirmar su `TokenLifespan` configurado (el default
suele ser más largo, ~1 día) y ajustarlo si aplica, o manejar la expiración a mano si
se usa un token propio.

## 4. ⚠️ Encoding del token en el link — punto común de bugs

Los tokens que genera Identity (`GeneratePasswordResetTokenAsync`) suelen incluir
caracteres como `+`, `/`, `=` que **no son seguros sin escapar** dentro de una
querystring (`+` se interpreta como espacio, `&`/`=` pueden cortar el parámetro).

**Al construir el link del correo, el token debe ir URL-encoded:**
```
{FRONTEND_URL}/reset-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(email)}
```

El frontend, al recibir la request en `POST /api/auth/reset-password`, envía el valor
tal como lo leyó de la querystring (ya decodificado por Next.js) — si el token llegó
truncado o corrupto por no haber sido encodeado al armar el correo, la validación en
backend fallará como "token inválido" aunque el usuario haya hecho todo bien. Si ven
una tasa alta de `400` en este endpoint, este es el primer sospechoso a revisar.

## 5. Formato de errores y CORS

Aplican los mismos acuerdos generales ya definidos: shape de error uniforme
(`docs/backend-cambios-solicitados.md §4`) y orígenes CORS habilitados (§5 del mismo
documento). No hay nada adicional que configurar para estos dos endpoints.

---

## 6. Checklist

- [ ] `POST /api/auth/forgot-password` — siempre `200`, no revela si el correo existe
      (§1).
- [ ] Envío real del correo con el link `{FRONTEND_URL}/reset-password?token=...&email=...`
      (§0.4), reutilizando el mismo mecanismo de envío de `send-email-otp`.
- [ ] Token de un solo uso, con expiración corta (§3), invalidado tras usarse o al
      generarse uno nuevo para el mismo usuario.
- [ ] Token **URL-encoded** al construir el link del correo (§4) — confirmar
      explícitamente, es la causa más común de "enlace inválido" falsos.
- [ ] `POST /api/auth/reset-password` — valida token + email + política de contraseña,
      `200` en éxito, `400`/`410` con mensaje en enlace inválido/expirado (§2).
- [ ] Confirmar si se revocan refresh tokens activos al resetear la contraseña (§2,
      recomendado) — decisión de backend, avisar cuál se implementó.
- [ ] Confirmar rate limiting en `forgot-password` (§1, recomendado) — decisión de
      backend.
