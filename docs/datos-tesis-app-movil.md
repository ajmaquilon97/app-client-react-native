# Dónde va cada dato — Aplicación Móvil en el documento de tesis

Guía de colocación para `docs/Tesis_kelly.docx`. Cubre **solo lo que se puede
generar desde el repositorio**: tablas de cobertura, versiones de herramientas,
comandos y configuración del pipeline. Las capturas de pantalla del emulador y
de GitHub quedan fuera de este documento.

Cifras de la ejecución del **13/08/2026**: 550 pruebas en 36 suites, todas
pasando. Para regenerarlas:

```bash
npm run test:tabla-tesis   # deja el informe en coverage/metricas-pruebas.md
```

Si el código cambia, vuelve a ejecutar ese comando y usa las cifras nuevas: las
de abajo son una instantánea, no un valor fijo.

---

## Índice de colocaciones

| # | Sección del documento | Qué se rellena | ¿Disponible? |
| - | --------------------- | -------------- | ------------ |
| 1 | 10.8.2 Herramientas y Configuración | Fila "App Móvil (React Native)" de la tabla | Sí |
| 2 | 10.8.3.2 Aplicación Móvil — React Native / Expo | Tabla de cobertura completa (6 filas + total + umbral) | Sí |
| 3 | 10.8.3.2, nota al pie de las tablas | Aviso `[COMPLETAR: Reemplazar los guiones…]` | Se elimina |
| 4 | 10.9.1 Arquitectura General del Pipeline | Fila "App Móvil (React Native)" de la tabla | Sí |
| 5 | 10.9.3 Workflow — Aplicación Móvil | Párrafo descriptivo + tabla de pasos | Sí |
| 6 | 10.9.4 Métricas de Ejecución del Pipeline | Tabla de métricas y causas de fallo | **No** — ver §9 |
| 7 | 10.9.5 Configuración de Protección de Ramas | Filas con guion de la tabla | Decisión tuya — ver §7 |
| 8 | 10.10 Consolidación / OE3 | `cobertura Jest de la app [COMPLETAR: %]` | Sí |
| 9 | 11.2.3 Conclusión OE3 | `La cobertura … alcanzó el [COMPLETAR: X]%` | Sí |
| 10 | 11.2.5 Conclusión OE5 | `[COMPLETAR: N] tests en 2 repositorios frontend` | Parcial |

---

## 1. §10.8.2 Herramientas y Configuración

**Ubicación.** Página 151. Tabla con cabecera
*Repositorio | Herramienta | Versión | Tipo de Prueba | Comando Local | Comando CI*.
Busca la fila que empieza con **"App Móvil (React Native)"**.

**Qué reemplazar.** La celda *Versión* (hoy un guion) y los dos comandos, que en
el documento están puestos de forma genérica y no coinciden con los scripts
reales del repositorio.

**Contenido:**

| Repositorio | Herramienta | Versión | Tipo de Prueba | Comando Local | Comando CI |
| ----------- | ----------- | ------- | -------------- | ------------- | ---------- |
| App Móvil (React Native) | Jest + React Native Testing Library | Jest 29.7.0 · jest-expo 56.0.5 · RNTL 14.0.1 | Unitarias / Componentes | `npm run test:coverage` | `npm run test:ci` |

Si el tribunal pide más detalle del entorno, estas son las versiones exactas
sobre las que se ejecutaron las pruebas:

| Elemento | Versión |
| -------- | ------- |
| Jest | 29.7.0 |
| Preset `jest-expo` | 56.0.5 |
| React Native Testing Library | 14.0.1 |
| Renderizador `test-renderer` | 1.2.0 |
| TypeScript | 6.0.3 |
| ESLint | 9.39.5 |
| Expo SDK | 56.0.5 |
| React Native | 0.85.3 |
| React | 19.2.3 |

---

## 2. §10.8.3.2 Aplicación Móvil — React Native / Expo

**Ubicación.** Página 152, justo después de la tabla del portal web. Es la tabla
cuya primera columna arranca con las filas *Autenticación, Exploración de
Espacios, Reservas, Invitaciones / QR, Stores React Context, Componentes UI
comunes, TOTAL APP MÓVIL, Umbral mínimo requerido*.

**Qué reemplazar.** Todos los guiones. Las seis filas del documento se conservan
tal cual; los valores ya vienen agregados a esas seis filas.

**Contenido:**

| Módulo | Tests | Pasados | Fallidos | Statements (%) | Branches (%) | Functions (%) | Lines (%) |
| ------ | ----- | ------- | -------- | -------------- | ------------ | ------------- | --------- |
| Autenticación | 36 | 36 | 0 | 94.16 | 82.22 | 88.24 | 94.87 |
| Exploración de Espacios | 103 | 103 | 0 | 97.03 | 92.59 | 95.58 | 97.10 |
| Reservas | 146 | 146 | 0 | 78.60 | 76.23 | 82.05 | 79.67 |
| Invitaciones / QR | 45 | 45 | 0 | 95.54 | 89.62 | 93.33 | 95.74 |
| Stores React Context | 50 | 50 | 0 | 100.00 | 87.14 | 100.00 | 100.00 |
| Componentes UI comunes | 170 | 170 | 0 | 93.91 | 92.78 | 92.62 | 94.94 |
| **TOTAL APP MÓVIL** | **550** | **550** | **0** | **91.00** | **85.09** | **91.16** | **91.67** |
| Umbral mínimo requerido | — | — | — | 70.00 | 70.00 | 70.00 | 70.00 |

**Dos aclaraciones que conviene dejar por escrito en el documento**, porque son
las preguntas naturales del tribunal:

> Los porcentajes se calculan sobre los totales absolutos de cada módulo
> (sentencias cubiertas / sentencias totales) y no como promedio de los
> porcentajes de sus archivos, de modo que un archivo pequeño con cobertura
> total no compense a uno extenso con cobertura baja.

> El alcance de la medición comprende la totalidad del directorio `src/`, con
> excepción de las pantallas de Expo Router (`src/app/`), que constituyen
> composición y navegación sobre los componentes ya verificados y se validaron
> mediante pruebas manuales sobre dispositivo físico; los archivos de
> declaración de tipos y los módulos de re-exportación, carentes de código
> ejecutable propio; y el texto legal estático. Este alcance está declarado de
> forma explícita en `collectCoverageFrom` (`jest.config.js`), lo que garantiza
> que el porcentaje reportado sea reproducible entre ejecuciones.

**Correspondencia entre las seis filas y los módulos del código**, por si te la
piden:

| Fila del documento | Módulos del repositorio |
| ------------------ | ----------------------- |
| Autenticación | `features/auth` (servicios y componentes) |
| Exploración de Espacios | `features/espacios` + `features/favoritos` |
| Reservas | `features/reservas` + `features/pagos` |
| Invitaciones / QR | `features/invitados` + `features/recepcion` |
| Stores React Context | Contextos de sesión, kiosco, tema y ubicación |
| Componentes UI comunes | `shared/**` + `features/resenas` + `features/legal` |

El desglose a ocho módulos sin agrupar está en `coverage/metricas-pruebas.md`,
sección *Resultados por módulo (detalle)*, por si prefieres ampliar la tabla en
lugar de agrupar.

---

## 3. §10.8.3.2 — nota al pie de las tablas

**Ubicación.** Inmediatamente después de la tabla móvil, el párrafo:

> *[COMPLETAR: Reemplazar los guiones de las tablas anteriores con los
> resultados reales de la ejecución de jest --coverage en ambos repositorios. El
> docente advierte que presentar tablas de resultados vacías en la versión final
> invalida el capítulo ante el jurado.]*

**Qué hacer.** Eliminarlo una vez rellenadas las dos tablas (la del portal web y
la de la app móvil). Es una nota de trabajo, no contenido del documento.

---

## 4. §10.9.1 Arquitectura General del Pipeline

**Ubicación.** Página 154. Tabla con cabecera
*Repositorio | Archivo Workflow | Trigger | Jobs Definidos | Rama Protegida*.
Fila **"App Móvil (React Native)"**.

**Qué reemplazar.** Las celdas *Trigger* y *Jobs Definidos*. El documento dice
"PR + push main" y "lint → test → expo-check". El workflow implementado sigue el
modelo de ramas del proyecto —`develop` para desarrollo libre, `feature/**` y
`hotfix` como camino validado hacia `main`— y ejecuta un paso más (verificación
de tipos), que es justamente el que justifica su existencia en el capítulo.

**Contenido:**

| Repositorio | Archivo Workflow | Trigger | Jobs Definidos | Rama Protegida |
| ----------- | ---------------- | ------- | -------------- | -------------- |
| App Móvil (React Native) | `.github/workflows/pruebas.yml` | Push a `feature/**` y `hotfix/**`; PR hacia esas ramas y hacia `main` | lint → typecheck → test (cobertura ≥ 70%) → reporte por correo → expo-doctor | `main` |

> Nota terminológica: el workflow define **un solo job** (`Lint, tipos, pruebas
> y cobertura`) con pasos secuenciales. Se resolvió así, y no como varios jobs
> independientes, para reutilizar la instalación de dependencias: cada job
> adicional habría vuelto a ejecutar `npm ci`. Si en la tabla la columna se
> titula "Jobs Definidos", lo correcto es renombrarla a **"Pasos definidos"** o
> aclararlo en el texto.

El repositorio tiene un segundo workflow de calidad, equivalente al del portal
web, que conviene mencionar en la misma tabla:

| Repositorio | Archivo Workflow | Trigger | Jobs Definidos | Rama Protegida |
| ----------- | ---------------- | ------- | -------------- | -------------- |
| App Móvil (React Native) | `.github/workflows/code-analysis.yml` | Push a `feature/**` y `hotfix/**`; PR hacia esas ramas y hacia `main` | CodeQL → SonarCloud | `main` |

---

## 5. §10.9.3 Workflow — Aplicación Móvil (React Native / Expo)

**Ubicación.** Página 155. La sección tiene hoy un único párrafo descriptivo y
ninguna tabla, a diferencia de la del portal web, que sí tiene su diagrama de
flujo (§10.9.2.1).

**Qué hacer.** El párrafo existente ya describe correctamente lo implementado;
puede conservarse. Debajo conviene añadir la tabla de pasos, que es el
equivalente textual del diagrama de flujo del pipeline web.

**Contenido a añadir:**

| # | Paso | Comando | ¿Bloquea el merge? |
| - | ---- | ------- | ------------------ |
| 1 | Instalación de dependencias | `npm ci` | Sí |
| 2 | Análisis estático | `npm run lint` | Sí |
| 3 | Verificación de tipos | `npm run typecheck` | Sí |
| 4 | Pruebas unitarias con verificación de cobertura | `npm run test:ci` | Sí |
| 5 | Construcción del reporte de cobertura | `node scripts/coverage-email.mjs` | No |
| 6 | Publicación del resumen en la ejecución | — | No |
| 7 | Publicación del reporte de cobertura como artefacto | — | No |
| 8 | Envío del reporte por correo electrónico | — | No |
| 9 | Diagnóstico de configuración de Expo | `npx expo-doctor` | No (informativo) |

Párrafo de apoyo, por si quieres justificar el diseño en el texto:

> Los pasos de verificación se ejecutan con `continue-on-error`, de modo que un
> fallo no interrumpe el flujo antes del envío del reporte por correo, que es
> precisamente cuando resulta más necesario; el resultado real del job lo
> determina un paso final que evalúa el desenlace de los tres y termina en
> fallo si alguno no pasó. Se emplea `npm ci` en lugar
> de `npm install` para que el entorno de integración instale exactamente el
> árbol de dependencias fijado en `package-lock.json`. La verificación de tipos
> constituye un paso independiente porque el transpilador Babel elimina las
> anotaciones de tipo sin comprobarlas: sin `tsc --noEmit`, un error de tipado
> alcanzaría la rama principal con la totalidad de las pruebas en verde. El
> umbral de cobertura del 70% en las cuatro métricas está declarado en
> `coverageThreshold` (`jest.config.js`), por lo que Jest retorna un código de
> salida distinto de cero cuando alguna métrica desciende por debajo de él y el
> pipeline falla; el umbral no opera como recomendación, sino como condición de
> integración.

Configuración adicional del workflow, si la sección lo amerita:

| Elemento | Valor |
| -------- | ----- |
| Runner | `ubuntu-latest` |
| Node.js | 20, con caché de npm |
| Tiempo límite | 15 minutos |
| Concurrencia | Un push nuevo sobre el mismo PR cancela la ejecución anterior |

---

## 6. §10.9.4 Métricas de Ejecución del Pipeline

**No puedo darte estos datos, y es importante que sepas por qué.**

La tabla de esa sección ya trae números (10 ejecuciones, 3 exitosas, 7 con
fallos, 1.3 min de promedio, 12 s de instalación, 1 min de compilación, 8 s de
pruebas). El workflow de la app móvil **se creó en esta sesión y todavía no se
ha ejecutado ni una vez en GitHub Actions**, así que esos valores no pueden
proceder de él. O vienen de otro repositorio, o son de relleno. Presentarlos
como métricas del pipeline móvil sería un dato inventado, que es exactamente el
riesgo que advierte la nota de tu docente en §10.8.3.2.

**De dónde sale cada valor una vez que el pipeline corra:**

| Métrica de la tabla | Dónde obtenerla |
| ------------------- | --------------- |
| Total de ejecuciones del workflow | Pestaña *Actions* → workflow *CI* → contador de ejecuciones |
| Ejecuciones exitosas / con fallos | Misma vista, filtrando por *Status: success* y *Status: failure* |
| Tiempo promedio del pipeline completo | Columna de duración en el listado de ejecuciones |
| Tiempo de instalación de dependencias | Detalle de una ejecución → duración del paso *Instalar dependencias* |
| Tiempo de ejecución de pruebas Jest | Detalle de una ejecución → duración del paso *Pruebas unitarias con cobertura* |
| Umbral de cobertura configurado | **70%** — este sí es un dato del repositorio |

**Lo único que sí puedo aportar** es el tiempo de ejecución local de la batería
de pruebas, medido en esta máquina, que sirve como referencia del orden de
magnitud pero **no sustituye** al tiempo del runner:

| Medición local | Valor |
| -------------- | ----- |
| Ejecución completa de Jest con cobertura (36 suites, 550 pruebas) | ~7 segundos |

**Sobre "Tiempo de compilación Expo: 1 min":** el workflow implementado no
compila la app. Compilar el binario nativo en cada PR llevaría entre 10 y 20
minutos y no aporta señal de calidad sobre el código; esa compilación ya está
resuelta en el workflow separado `android-release-bundle.yml`, que genera el
`.aab` firmado en cada push a `develop`. Si conservas esa fila en la tabla,
tienes que aclarar que corresponde a ese otro workflow, o retirarla.

**Sobre el párrafo de causas de fallo** (`[COMPLETAR: causas reales — p. ej.,
errores de configuración de Expo detectados por expo-doctor, errores de tipos de
TypeScript, umbrales de cobertura no alcanzados en commits intermedios]`): las
causas hay que tomarlas de los logs reales de las ejecuciones fallidas. Como
referencia de qué tipo de defecto detecta efectivamente este pipeline, durante
la implementación se encontraron y corrigieron en el repositorio:

- 4 violaciones de la regla `react-hooks/set-state-in-effect` que detiene el
  paso de análisis estático.
- 1 error de tipado (`TS2367`, comparación imposible en `features/pagos/config.ts`)
  que ninguna prueba detectaba, porque Babel elimina los tipos sin comprobarlos.

Ese par de hallazgos sí es evidencia legítima del valor del pipeline y puedes
citarlo; lo que no puedes es atribuirle ejecuciones que no ocurrieron.

---

## 7. §10.9.5 Configuración de Protección de Ramas

**Ubicación.** Página 157. Tabla con cabecera
*Regla de Protección | Frontend Web | App Móvil | Backend API*.

**Qué reemplazar.** Las dos filas que tienen guion en las tres columnas:
*Required approving reviews* y *Restrict pushes that create files > X MB*.

**Esto no es un dato del repositorio, es una decisión de configuración tuya.**
Lo que pongas en la tabla tiene que coincidir con lo que efectivamente quede
configurado en *Settings → Branches*, porque la captura de esa pantalla es la
evidencia (§10.9.5 pide una).

Valores razonables para un proyecto de tesis con un solo desarrollador:

| Regla de Protección | App Móvil | Justificación para el texto |
| ------------------- | --------- | --------------------------- |
| Required approving reviews | 0 | El proyecto lo desarrolla una sola persona: exigir aprobación de un tercero bloquearía todo merge. El control de calidad recae en el pipeline, no en la revisión por pares. |
| Restrict pushes that create files > X MB | 100 MB (límite por defecto de GitHub) | No se configuró un límite propio; rige el de la plataforma. |

Las filas que ya están marcadas como activas (*Require status checks*, *Require
branches to be up to date*, *Require pull request before merging*, *Do not allow
bypassing*) **tienes que activarlas de verdad** antes de tomar la captura. El
check obligatorio a seleccionar se llama:

```
Lint, tipos, pruebas y cobertura
```

Es el nombre del job en `.github/workflows/pruebas.yml`. Aparecerá en la lista de
*status checks* de GitHub solo después de que el workflow se haya ejecutado al
menos una vez.

---

## 8. §10.10 Consolidación de Resultados / OE3

**Ubicación.** Página 157. Tabla *Objetivo Específico | Evidencia de
Cumplimiento | Resultado*, fila **OE3**.

**Qué reemplazar.** El texto `cobertura Jest de la app [COMPLETAR: %]` y el
`Cumplido — [COMPLETAR]` de la tercera columna.

**Contenido:**

> …validación de QR en tiempo real; cobertura Jest de la app del **91.00%** en
> sentencias, **85.09%** en ramas, **91.16%** en funciones y **91.67%** en
> líneas, sobre 550 pruebas unitarias distribuidas en 36 suites.

Y en la columna *Resultado*:

> Cumplido — cobertura superior al umbral del 70% en las cuatro métricas, con
> 550/550 pruebas en verde.

---

## 9. §11.2.3 Conclusión OE3

**Ubicación.** Página 163. Párrafo *Aplicación Móvil Marketplace y Control de
Acceso QR*, última oración:

> *La cobertura de pruebas unitarias Jest alcanzó el [COMPLETAR: X]% en el total
> de componentes y módulos de la app.*

**Contenido:**

> La cobertura de pruebas unitarias Jest alcanzó el 91.00% de sentencias, el
> 85.09% de ramas, el 91.16% de funciones y el 91.67% de líneas sobre el total
> de componentes y módulos de la app, superando en las cuatro métricas el umbral
> del 70% establecido como criterio de aceptación.

---

## 10. §11.2.5 Conclusión OE5

**Ubicación.** Página 165. Primera oración del párrafo *Estrategia de Pruebas y
Pipeline de Integración Continua*:

> *…pruebas unitarias Jest ([COMPLETAR: N] tests en 2 repositorios frontend)…*

**Contenido — parcial.** De la app móvil son **550 pruebas**. Falta el número
del portal web, que no está en este repositorio; súmalos antes de escribir la
cifra:

```
550 (app móvil) + [tests del portal web] = N
```

---

## Resumen de lo que queda pendiente de tu lado

| Pendiente | Por qué |
| --------- | -------- |
| Métricas de ejecución del pipeline (§10.9.4) | El workflow nunca se ha ejecutado; los datos salen de la pestaña *Actions* |
| Decidir y aplicar las branch protection rules (§10.9.5) | Es configuración de GitHub, y la captura debe coincidir con la tabla |
| Número de pruebas del portal web (§11.2.5) | Está en el otro repositorio |
| Capturas de pantalla | Emulador y GitHub, según indicaste |
