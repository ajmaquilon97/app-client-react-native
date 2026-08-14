# Feedback para backend: registrar la aceptación de Términos y Condiciones / Política de Privacidad

## Resumen

Agregamos en la pantalla de registro (`src/app/registro.tsx`) un checkbox obligatorio de aceptación de
los Términos y Condiciones y la Política de Privacidad de AGORA. El usuario no puede enviar el
formulario (ni registrarse con Google) sin marcarlo. El texto completo que se muestra en la app sale de
`src/constants/legalContent.ts`, generado a partir de:

- `docs/TyC_UsuariosFinales_Agora_v1_1.docx` (Términos y Condiciones v1.1, 29/07/2026).
- `docs/PoliticasProteccionDatos_Agora.txt` (Política de Privacidad v1.0, 30/07/2026 — documento nuevo,
  redactado para AGORA con base en la LOPDP del Ecuador).

Hoy esa aceptación **solo se valida en el cliente** y no se envía ni se persiste en ningún lado. Dado que
es un requisito legal (contrato vinculante + LOPDP), necesitamos poder demostrar más adelante que un
usuario concreto aceptó una versión concreta del documento en una fecha concreta — eso solo se puede
garantizar si queda guardado en el backend, no solo validado en la app.

## Lo que pedimos

1. Que `POST /usuarios` (registro con formulario) acepte campos adicionales en el body, por ejemplo:

   ```json
   {
     "nombre": "...",
     "apellido": "...",
     "email": "...",
     "username": "...",
     "password": "...",
     "tipoUsuarioId": 1,
     "aceptaTerminos": true,
     "terminosVersion": "1.1",
     "politicaPrivacidadVersion": "1.0"
   }
   ```

   y que backend guarde, asociado al usuario creado: `terminosVersion`, `politicaPrivacidadVersion` y la
   fecha/hora del servidor en la que se registró la aceptación (no la fecha que mande el cliente).

2. Que `POST /auth/google` (ver `FEEDBACK_BACKEND_LOGIN_GOOGLE.md`) reciba los mismos campos
   `aceptaTerminos` / `terminosVersion` / `politicaPrivacidadVersion` cuando crea una cuenta nueva vía
   Google, y los persista de la misma forma. La app ya bloquea el botón de Google en la pantalla de
   registro hasta que el checkbox esté marcado, así que en la práctica siempre va a mandar `true` — pero
   si no se manda o viene `false`, el registro debería rechazarse (400), igual que si faltara cualquier
   otro campo obligatorio.

3. Si en el futuro se publica una nueva versión de alguno de los dos documentos y se requiere que
   usuarios existentes vuelvan a aceptar (como contempla la Cláusula 13 de los Términos y Condiciones),
   sería útil un endpoint tipo `POST /usuarios/{id}/aceptar-terminos` para registrar esa re-aceptación sin
   tener que pasar por el flujo de registro. No es urgente, pero avisen si prefieren que lo dejemos
   pedido/diseñado desde ya.

## Estado del lado de la app móvil

- `src/app/registro.tsx` — checkbox obligatorio, con enlaces a las pantallas
  `src/app/terminos-condiciones.tsx` y `src/app/politica-privacidad.tsx`. Bloquea "CREAR CUENTA" y el
  botón de Google mientras no esté marcado.
- `src/constants/legalContent.ts` — expone `TERMINOS_CONDICIONES_VERSION` (`"1.1"`) y
  `POLITICA_PRIVACIDAD_VERSION` (`"1.0"`), listos para mandarse en el body del registro apenas backend
  tenga dónde guardarlos.
- `src/services/auth.service.ts` (`registro()` / `registrarUsuario()`) — **todavía no manda** los campos
  de aceptación en el `POST /usuarios`, porque backend no los soporta hoy. Avisen el contrato exacto que
  prefieren (nombres de campo, si quieren la fecha de aceptación o la calculan ustedes con la hora del
  servidor) y lo conectamos.

## Contexto

- Reportado desde: app-client-react-native. 2026-07-30.
- Esto responde a un requisito legal/regulatorio (Constitución del Ecuador art. 66.19 + LOPDP), no es una
  mejora de producto opcional — mientras no quede persistido, la app no tiene forma de demostrar que un
  usuario específico aceptó.
