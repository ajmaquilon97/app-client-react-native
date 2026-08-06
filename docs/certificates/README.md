# Certificados de firma de Android (Play App Signing)

## Contexto

En agosto 2026 el botón "Continuar con Google" funcionaba en builds locales pero fallaba en
producción (instalado desde Play Store) con `DEVELOPER_ERROR` (código 10) en
`@react-native-google-signin/google-signin`.

## Causa raíz

`GoogleSignin.configure()` solo recibe `webClientId` (ver `src/config/googleAuthConfig.ts`). En
Android, el SDK resuelve el client OAuth Android (`AgoraClientAndroid1`) del lado de Google
cruzando `applicationId` (`com.obsidiantechlab.agora`) + el **SHA-1 del certificado que firmó el
APK/AAB instalado en el dispositivo**.

Los builds de producción se generan en CI (`.github/workflows/android-release-bundle.yml`),
firmados con `agora-release-key.jks` (la **upload key**). Pero como el proyecto usa **Play App
Signing** (obligatorio para `.aab`), Google **re-firma** el bundle con una llave propia antes de
entregarlo a los usuarios. El SHA-1 real que ve un dispositivo que instala desde Play Store es el
de esa llave de Google — no el de `agora-release-key.jks` — y ese SHA-1 nunca estaba registrado en
`AgoraClientAndroid1`, de ahí el error 10 solo en producción.

## Qué es cada archivo

Descargados desde **Play Console → tu app → Configuración → Integridad de la app → Key
management → Clave de firma de aplicación**:

| Archivo | Algoritmo | Descripción |
|---|---|---|
| `deployment_cert.der` | RSA-4096 (clásico) | Certificado clásico usado para lo que Play realmente entrega a los dispositivos. **Este es el que resolvió el problema.** |
| `hybrid_classical_cert.der` | RSA-4096 (clásico) | Mitad "clásica" del esquema de firma híbrida (clásico + post-cuántico) que Play está introduciendo para el App Signing key. |
| `hybrid_pqc_cert.der` | ML-DSA-65 (post-cuántico, FIPS 204/Dilithium) | Mitad post-cuántica del mismo esquema híbrido. **No aplica** a la verificación de fingerprint de Google Sign-In / OAuth — ese mecanismo es clásico (X.509 + SHA-1) y no valida contra certificados PQC. |

Falta además el **Certificado de clave de subida** (Upload key certificate, de
`agora-release-key.jks`) — se puede regenerar en cualquier momento con:

```
keytool -list -v -keystore agora-release-key.jks
```

## Solución aplicada

Se registraron como fingerprints adicionales del client Android `AgoraClientAndroid1` (Google
Cloud Console → APIs & Services → Credentials):

- `deployment_cert.der` → `57:17:9A:DB:E3:E6:DE:9B:F1:79:88:54:80:F3:95:2F:41:67:67:5C` — **SHA-1 que resolvió el error 10**.
- `hybrid_classical_cert.der` → `0C:D1:88:08:70:A9:39:7C:E8:46:DF:E0:11:F3:3E:76:7F:06:61:3B`
- SHA-1 de `agora-release-key.jks` (upload key), para que sigan funcionando instalaciones directas de builds de CI/QA vía `adb install`.

## Si vuelve a pasar (rotación de key, nuevo client OAuth, etc.)

1. Play Console → Integridad de la app → confirmar/descargar el certificado vigente de "Clave de
   firma de aplicación".
2. Sacar su SHA-1: `openssl x509 -inform der -in <archivo>.der -noout -fingerprint -sha1`.
3. Agregarlo como fingerprint del client Android correspondiente en Google Cloud Console.
4. Esperar propagación (minutos, a veces hasta ~1 hora) antes de reintentar.
5. Probar solo vía un track real de Play Console (internal testing / internal app sharing) — no
   se puede replicar localmente porque Google nunca comparte la llave privada del App Signing key.
