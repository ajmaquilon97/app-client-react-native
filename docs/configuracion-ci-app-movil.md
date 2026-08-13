# Configuración de CI — Aplicación Móvil

Qué hay que configurar en GitHub para que los workflows de este repositorio
funcionen. La estructura replica la del portal web (`app-admin-react-next`):
`pruebas.yml` para la batería de pruebas con reporte por correo, y
`code-analysis.yml` para el análisis estático.

---

## 1. Modelo de ramas y cuándo se valida

| Rama | Rol | ¿Se valida? |
| ---- | --- | ----------- |
| `develop` | Desarrollo libre | No |
| `feature`, `feature/**` | Camino intermedio hacia producción | Sí |
| `hotfix`, `hotfix/**` | Corrección urgente hacia producción | Sí |
| `main` | Producción; solo recibe PR desde `feature/**` y `hotfix` | Sí, en el PR |

Los dos workflows de calidad se disparan igual:

```yaml
on:
  push:
    branches: [feature, feature/**, hotfix, hotfix/**]
  pull_request:
    branches: [feature, feature/**, hotfix, hotfix/**, main]
  workflow_dispatch:
```

**`main` aparece en `pull_request` pero no en `push`, y es deliberado.** El
filtro `pull_request.branches` mira la rama *destino*, no la de origen: sin esa
entrada, un PR de `feature/x` hacia `main` no dispararía ningún workflow y el
status check exigido por la protección de rama quedaría en *"Expected — waiting
for status to be reported"* de forma indefinida, bloqueando el merge para
siempre. Que la rama de origen ya se hubiera validado en su propio push no
cambia nada: GitHub exige el resultado del check **sobre ese PR concreto**.

No está en `push` porque un push directo a `main` no debería ocurrir: la
protección de rama lo impide, y todo lo que llega ahí pasó ya por el PR.

## 2. Workflows del repositorio

| Archivo | Qué hace | Disparadores |
| ------- | -------- | ------------ |
| `.github/workflows/pruebas.yml` | Lint, tipos, pruebas con cobertura, artefacto y correo | Ver arriba |
| `.github/workflows/code-analysis.yml` | CodeQL + SonarCloud | Ver arriba |
| `.github/workflows/android-release-bundle.yml` | Genera el `.aab` firmado | Push a `develop` (ya existía) |

> El workflow de release sigue disparándose en `develop` porque genera el
> binario de pruebas, no una validación de calidad. Si quieres que el `.aab`
> salga del código ya validado, cámbialo a `main`.

### Cambios respecto de lo que había

- **Se eliminó `ci.yml`.** Lo había creado en la sesión anterior y hacía lo
  mismo que `pruebas.yml`, que ahora además envía el correo. Mantener los dos
  habría ejecutado la batería de pruebas dos veces por Pull Request.
- **Se eliminó `sonarcloud.yml`.** Apuntaba a
  `sonar.projectKey=ajmaquilon97_app-admin-react-next`, es decir, **al proyecto
  del portal web desde el repositorio móvil**: cualquier ejecución habría
  mezclado el análisis de las dos aplicaciones en el mismo proyecto de
  SonarCloud. Se disparaba en la rama `feature`, así que con el modelo de ramas
  actual sí habría llegado a ejecutarse. Su reemplazo, `code-analysis.yml`, usa
  la clave correcta. Queda en el historial de git (commit `0da7809`) por si lo
  necesitas.
- **Se añadió `sonar-project.properties`** con la clave correcta de este
  repositorio, siguiendo el mismo formato que el del portal web.

### Diferencias respecto de los workflows del portal web

| Aspecto | Portal web | App móvil | Motivo |
| ------- | ---------- | --------- | ------ |
| Ramas que disparan | `feature`, `feature/**` | `feature`, `feature/**`, `hotfix`, `hotfix/**` + PR a `main` | Mismo modelo de ramas, más `hotfix` y el PR hacia `main` que exige la protección de rama |
| Lint y tipos | En `code-analysis.yml`, vía `npm run build` | En `pruebas.yml`, como pasos propios | React Native no tiene un `build` que compruebe tipos; sin `tsc --noEmit` un error de tipado llegaría a `main` con las pruebas en verde |
| Paso de compilación en CodeQL | `npm run build` | Ninguno | Empaquetar el binario nativo tarda 10–20 min y no aporta al análisis; CodeQL analiza JS/TS sin compilar |
| Cobertura para Sonar | No se genera | `npx jest --coverage` antes del escaneo | Sin `coverage/lcov.info`, SonarCloud reporta 0% de cobertura |
| Nombre del artefacto | `cobertura-portal-web` | `cobertura-app-movil` | — |

---

## 3. Secrets

**Settings → Secrets and variables → Actions → pestaña *Secrets* → *New repository secret***

| Secret | Usado por | Valor | Si falta |
| ------ | --------- | ----- | -------- |
| `MAIL_USERNAME` | `pruebas.yml` | La cuenta de Gmail que envía: `angelmaquilon97@gmail.com` | No llega el correo; el merge **no** se bloquea |
| `MAIL_PASSWORD` | `pruebas.yml` | **Contraseña de aplicación** de Google (16 caracteres), no la contraseña de la cuenta | Igual que el anterior |
| `SONAR_TOKEN` | `code-analysis.yml` | Token generado en SonarCloud | El job *SonarCloud Analysis* falla; solo bloquea si lo pones como check obligatorio |
| `GITHUB_TOKEN` | `code-analysis.yml` | **No hay que crearlo**: GitHub lo inyecta solo en cada ejecución | — |

Son los mismos nombres que en el portal web, así que si ya los tienes ahí, los
valores de `MAIL_USERNAME` y `MAIL_PASSWORD` sirven tal cual; `SONAR_TOKEN`
puede ser el mismo token de la organización.

### Qué necesitas según lo que quieras conseguir

| Objetivo | Secrets necesarios |
| -------- | ------------------ |
| Solo bloquear el merge cuando fallan lint, tipos o pruebas | **Ninguno** |
| Además recibir el reporte de cobertura por correo | `MAIL_USERNAME` + `MAIL_PASSWORD` |
| Además análisis de SonarCloud | `SONAR_TOKEN` |

El bloqueo del merge no depende de ningún secret: lo decide el paso *Reflejar el
resultado de las verificaciones*, que solo mira el desenlace de lint, tipos y
pruebas. El paso de envío del correo lleva `continue-on-error`, precisamente
para que un fallo de SMTP —credenciales ausentes, Gmail caído— no impida
integrar código que sí pasó las verificaciones. El fallo del envío queda visible
como anotación en la ejecución, así que no pasa desapercibido.

### Cómo obtener `MAIL_PASSWORD`

Gmail bloquea el acceso SMTP con la contraseña normal de la cuenta. Hace falta
una contraseña de aplicación:

1. La cuenta debe tener **verificación en dos pasos activada** — sin eso, Google
   no ofrece la opción de crear contraseñas de aplicación.
2. Entra a <https://myaccount.google.com/apppasswords>.
3. Crea una con un nombre reconocible, por ejemplo `GitHub Actions app móvil`.
4. Copia los 16 caracteres **sin los espacios** y pégalos en el secret.

Si el envío falla con `535-5.7.8 Username and Password not accepted`, es que se
usó la contraseña de la cuenta en lugar de la de aplicación.

### Cómo obtener `SONAR_TOKEN`

1. Entra a <https://sonarcloud.io> con tu cuenta de GitHub.
2. **+ → Analyze new project** y selecciona `app-client-react-native`.
3. Confirma que la clave del proyecto queda como
   `ajmaquilon97_app-client-react-native` y la organización como `ajmaquilon97`.
   Deben coincidir exactamente con `sonar-project.properties`; si SonarCloud
   propone otra clave, actualiza el archivo.
4. **Administration → Analysis Method → desactiva *Automatic Analysis***. Si
   queda activo, el escaneo desde GitHub Actions falla con
   *"You are running CI analysis while Automatic Analysis is enabled"*.
5. Genera el token en **Mi cuenta → Security** y guárdalo como `SONAR_TOKEN`.

---

## 4. Variables del workflow (no son secrets)

Los destinatarios del correo están en el propio `pruebas.yml`, en el bloque
`env`, porque no son información sensible:

```yaml
env:
  DESTINATARIOS_REPORTE: "angelmaquilon97@gmail.com"
  NOMBRE_REMITENTE: "CI App Móvil"
```

Para añadir destinatarios, sepáralos por coma:

```yaml
  DESTINATARIOS_REPORTE: "angelmaquilon97@gmail.com,tutor@universidad.edu.ec"
```

---

## 5. Permisos de Actions

**Settings → Actions → General**

| Ajuste | Valor |
| ------ | ----- |
| Actions permissions | *Allow all actions and reusable workflows* (los workflows usan acciones de terceros: `dawidd6/action-send-mail` y `SonarSource/sonarqube-scan-action`) |
| Workflow permissions | *Read repository contents and packages permissions* |

El job de CodeQL necesita `security-events: write`, pero **ya lo declara el
propio workflow**; no hace falta subir los permisos globales del repositorio.

### CodeQL en repositorios privados

El análisis de CodeQL y la pestaña *Security → Code scanning* son gratuitos en
repositorios **públicos**. Si este repositorio es **privado**, requieren
GitHub Advanced Security, que no está incluida en los planes gratuitos: el job
`codeql` fallará con un error de permisos.

Dos salidas, según el caso:

- Hacer público el repositorio (habitual en un proyecto de tesis).
- Quitar el job `codeql` de `code-analysis.yml` y dejar solo `sonarcloud`.
  Recuerda entonces borrar la línea `needs: codeql` del job de Sonar, porque de
  lo contrario nunca se ejecutará.

---

## 6. Protección de ramas: bloquear el merge cuando algo falla

El objetivo es que **ni `develop` → `feature` ni `feature` → `main` se puedan
integrar si el código no pasa lint, tipos, pruebas y umbral de cobertura**. Eso
exige proteger las dos puertas, no solo `main`.

Se configura con **un único Ruleset**, que es la forma moderna y la única que
admite varios patrones de rama en una sola regla. Las *branch protection rules*
clásicas obligarían a crear una regla por patrón, y su comodín `*` no cruza la
barra `/`, así que `feature/**` necesitaría su propia entrada.

### Crear el ruleset

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

| Campo | Valor |
| ----- | ----- |
| Ruleset Name | `Calidad antes del merge` |
| Enforcement status | `Active` |
| Bypass list | Vacía (nadie se lo salta) |

**Target branches → Add target → Include by pattern**, una entrada por cada uno:

```
main
feature
feature/**
hotfix
hotfix/**
```

**Branch rules** a marcar:

| Regla | Valor |
| ----- | ----- |
| Restrict deletions | Activo |
| Require a pull request before merging | Activo |
| → Required approvals | `0` (el proyecto lo desarrolla una sola persona) |
| Require status checks to pass | Activo |
| → Require branches to be up to date before merging | Activo |
| → Status check requerido | `Lint, tipos, pruebas y cobertura` |
| Block force pushes | Activo |

### Por qué "Require a pull request before merging" es imprescindible

Sin esa regla, el flujo `develop` → `feature` se puede hacer con un
`git push origin develop:feature` desde la terminal y **no pasa por ningún
check**: los status checks solo existen en el contexto de un Pull Request. La
regla de status checks sin la de PR obligatorio no bloquea nada.

### Qué check exigir, y cuál no todavía

`Lint, tipos, pruebas y cobertura` es el nombre del job de `pruebas.yml`, y es
el que refleja el resultado real: lint, tipos, pruebas y umbral del 70%.

**Aparecerá en el buscador de status checks solo después de que el workflow se
haya ejecutado al menos una vez**, así que el orden es: subir los workflows a
una rama `feature/**` → esperar la ejecución → volver a esta pantalla y
seleccionarlo.

Sobre los otros dos:

- `SonarCloud Analysis` — se puede añadir como segundo check obligatorio una vez
  que hayas comprobado que corre en verde.
- `CodeQL Analysis` — **no lo pongas como obligatorio hasta confirmar que
  funciona**. En un repositorio privado sin GitHub Advanced Security el job
  falla siempre, y un check obligatorio que nunca puede pasar bloquea todos los
  merges de forma permanente (ver §5).

Por el mismo motivo, `code-analysis.yml` de este repositorio **no** encadena
SonarCloud detrás de CodeQL, a diferencia del portal web: si lo hiciera, un
fallo de CodeQL dejaría a Sonar sin ejecutarse y, siendo obligatorio, el merge
quedaría bloqueado sin que Sonar hubiera tenido nada que decir.

### Lo que este ruleset no hace

**No impide que un PR a `main` venga de una rama distinta de `feature/**` o
`hotfix`.** GitHub no filtra por rama de origen en los rulesets de rama. Si
quieres forzarlo, hay que añadir un paso de guardia al workflow que falle cuando
`github.head_ref` no case con esos patrones. Mientras tanto es una convención de
trabajo; conviene que el documento de tesis lo diga así y no afirme que está
técnicamente impuesta.

### El workflow del bundle no bloquea nada

`android-release-bundle.yml` se dispara con `push` a `develop` y no participa en
ningún Pull Request, así que no puede aparecer como status check ni frenar un
merge. Que falle la generación del `.aab` no detiene el flujo de trabajo, que es
el comportamiento esperado.

---

## 7. Orden recomendado de puesta en marcha

1. Crear los cuatro secrets (§3).
2. Configurar el proyecto en SonarCloud y desactivar el análisis automático (§3).
3. Hacer commit de los workflows en `develop` y crear desde ahí una rama
   `feature/ci-pruebas`; empujarla dispara la primera ejecución.
4. Verificar en la pestaña *Actions* que las ejecuciones terminan en verde y que
   llega el correo.
5. Crear el ruleset con los cinco patrones de rama y el check ya visible (§6).
6. Comprobar que el bloqueo funciona en las dos puertas:
   - PR de `develop` → `feature`: el check se ejecuta y el merge queda bloqueado
     hasta que pase.
   - PR de `feature/ci-pruebas` → `main`: lo mismo.
7. Opcional, para dejar evidencia del bloqueo en el documento de tesis:
   introducir a propósito un fallo (por ejemplo, una variable sin usar que ESLint
   rechace) en una rama `feature/**`, abrir el PR y capturar la pantalla con el
   merge bloqueado y el check en rojo.

---

## 8. El reporte por correo

### Qué llega

- **Asunto:** `[OK] Cobertura app móvil · develop · 91,00% sentencias · 550/550 pruebas`
  (o `[FALLO]` cuando algo no cumple).
- **Cuerpo:** HTML con las cuatro métricas globales en tarjetas y la tabla de
  cobertura por módulo, con cada porcentaje en verde o rojo según el umbral del
  70%.
- **Adjunto:** `resumen.md`, el mismo contenido en texto plano.

### Por qué no se adjunta el reporte HTML navegable

Es la novedad que ya conocías del portal web: **Gmail rechaza con
`552-5.7.0` cualquier mensaje que lleve archivos `.html` o `.js` adjuntos,
incluso comprimidos dentro de un ZIP**. El reporte navegable de Istanbul
(`coverage/lcov-report/`) está hecho exactamente de eso, así que adjuntarlo hace
que el correo no salga.

La solución es la misma que en el portal web: el reporte completo se sube como
artefacto de la ejecución (`cobertura-app-movil`, 30 días de retención) y el
correo lleva el enlace directo a la ejecución para descargarlo. El único adjunto
es `resumen.md`, que es texto plano y Gmail acepta sin problema.

### El correo sale también cuando algo falla

Los pasos de lint, tipos y pruebas llevan `continue-on-error: true`, de modo que
un fallo no interrumpe el job antes de enviar el correo — que es justo cuando
más se necesita. El resultado real del job lo decide el último paso, *Reflejar
el resultado de las verificaciones*, que lee el `outcome` de los tres y termina
en rojo si alguno falló. Ese es el status check que protege la rama.

Si Jest ni siquiera llega a escribir el resumen de cobertura (un error de
compilación, una dependencia rota), el workflow envía igualmente un aviso mínimo
con el enlace a la ejecución, en lugar de no enviar nada.

---

## 9. Comandos locales equivalentes

| Comando | Qué hace |
| ------- | -------- |
| `npm run test:ci` | Lo que ejecuta el pipeline: cobertura + verificación del umbral |
| `npm run test:reporte-correo` | Genera en `coverage/` el HTML del correo, el `resumen.md` y el asunto |
| `npm run test:tabla-tesis` | Genera `coverage/metricas-pruebas.md` con las tablas del documento |

`npm run test:reporte-correo` es útil para revisar cómo se verá el correo antes
de subir cambios al workflow: abre `coverage/reporte-correo.html` en el
navegador. Fuera de GitHub Actions, la rama y el commit salen como `local`.
