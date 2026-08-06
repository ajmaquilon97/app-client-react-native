# Cómo generar el bundle de Android para Play Store (build local)

Compilamos localmente, sin EAS. Este documento es el paso a paso para generar un
`.aab` de release firmado y listo para subir a Play Console.

## 0. Requisitos (una sola vez por máquina)

Si es la primera vez que compilas en esta máquina, necesitas tener listo:

1. **Node, JDK 17 y Android SDK** instalados (los mismos que usas para
   `npx expo run:android`).
2. **El keystore de release**: `agora-release-key.jks`, en la raíz del proyecto.
   Está en `.gitignore` — no viene con el repo, pídelo al equipo si no lo tienes.
3. **Las contraseñas del keystore**, en `agora-release-key.credentials.txt`
   (también gitignored). Trae `STORE_PASSWORD`, `KEY_PASSWORD` y `ALIAS`.
4. **Configurar `~/.gradle/gradle.properties`** (archivo global de tu usuario,
   **fuera** del repo — nunca se sube a git ni se pisa con `expo prebuild`).
   Crea/edita `C:\Users\<tu-usuario>\.gradle\gradle.properties` con:

   ```properties
   MYAPP_RELEASE_STORE_FILE=agora-release-key.jks
   MYAPP_RELEASE_KEY_ALIAS=<valor de ALIAS en agora-release-key.credentials.txt>
   MYAPP_RELEASE_STORE_PASSWORD=<valor de STORE_PASSWORD>
   MYAPP_RELEASE_KEY_PASSWORD=<valor de KEY_PASSWORD>
   ```

   Sin esto, `gradlew bundleRelease` compila igual pero cae de vuelta al
   keystore de **debug** (ver `plugins/withAndroidReleaseSigning.js`) — el AAB
   resultante no seria válido para Play Store.

Con esto listo, no hace falta repetir nada de esta sección en builds futuros.

## 1. Subir el número de versión

Edita `app.json` (no `android/app/build.gradle` — esa carpeta se regenera
en cada `expo prebuild` y cualquier edición manual ahí se pierde):

```jsonc
{
  "expo": {
    "version": "1.0.0",           // versionName visible al usuario — súbelo solo si es un cambio real de versión
    "android": {
      "versionCode": 3            // ⚠️ debe ser mayor al último que subiste a Play Console
    }
  }
}
```

Play Console **rechaza** subir un `.aab` con el mismo `versionCode` que uno
anterior — súbelo siempre antes de compilar para una nueva subida.

## 2. Regenerar el proyecto nativo

```bash
npx expo prebuild --platform android --clean
```

Esto reconstruye `android/` desde cero a partir de `app.json` + los plugins
del proyecto (íconos, package name, `versionCode`, y la firma de release vía
`plugins/withAndroidReleaseSigning.js`).

Verificación rápida (opcional) de que quedó bien:

```bash
grep -n "versionCode\|applicationId" android/app/build.gradle
```

## 3. Compilar el bundle

```bash
cd android
./gradlew bundleRelease
```

Tarda varios minutos (compila código nativo para las 4 arquitecturas). Al
terminar, el `.aab` queda en:

```
android/app/build/outputs/bundle/release/app-release.aab
```

## 4. Verificar la firma (opcional pero recomendado)

Confirma que quedó firmado con la key de release y no con la de debug:

```bash
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab
```

El `Owner` debe decir `CN=Agora, OU=Mobile, O=Agora, L=Guayaquil, ST=Guayas, C=EC`
y el `SHA1` debe ser `86:0F:13:B3:2C:9A:8A:BE:52:5A:54:E3:D7:5C:C3:AA:88:F2:6B:4F`
(la huella de `agora-release-key.jks`, la "upload key" en Play Console).

## 5. Subir a Play Console

Play Console → tu app → **Testing → Internal testing** (o el track que
corresponda) → **Create new release** → sube `app-release.aab` → completa
las notas de la versión → **Review release** → **Start rollout**.

Recuerda: subir el `.aab` no es suficiente para que los testers lo vean —
el release tiene que quedar en estado "Disponible" (rollout iniciado), no
en borrador.

## Problemas conocidos

- **`DEVELOPER_ERROR` (código 10) en el login de Google, solo en el build de
  Play Store**: Play App Signing vuelve a firmar el `.aab` con una clave
  distinta a `agora-release-key.jks` antes de entregarlo a los usuarios (la
  "App signing key certificate" en Play Console → Configuración → Integridad
  de la app). Su SHA-1 tiene que estar registrado como client OAuth Android
  aparte en Google Cloud Console (mismo package, un client nuevo por cada
  SHA-1 — Google Cloud Console no permite varios SHA-1 en un mismo client).
- **`versionCode` duplicado al subir**: revisa el paso 1 — súbelo en `app.json`,
  no en `android/app/build.gradle`.
- **El ícono/package/nombre no cambian tras editar `app.json`**: falta correr
  `expo prebuild --platform android --clean` (paso 2) para que se regenere
  `android/` con los valores nuevos.
