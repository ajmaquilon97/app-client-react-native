# Pruebas unitarias y pipeline de CI — Aplicación Móvil

Documento de referencia del capítulo de calidad de la tesis (§10.8 Estrategia de
Pruebas de Software y §10.9 Pipeline de Integración y Entrega Continua), en la
parte que corresponde al repositorio `app-client-react-native`.

Las cifras de este documento son una instantánea. Para regenerarlas con el
estado actual del código:

```bash
npm run test:tabla-tesis   # deja el informe en coverage/metricas-pruebas.md
```

---

## 1. Herramientas y configuración

| Elemento              | Valor                                          |
| --------------------- | ---------------------------------------------- |
| Framework de pruebas  | Jest 29.7.0 con el preset `jest-expo` 56.0.5   |
| Librería de componentes | React Native Testing Library 14.0.1          |
| Renderizador          | `test-renderer` 1.2.0                          |
| Tipos                 | TypeScript 6.0.3 (`tsc --noEmit`)              |
| Análisis estático     | ESLint 9.39.5 (`eslint-config-expo`)           |
| Plataforma            | React Native 0.85.3 / React 19.2.3 / Expo SDK 56 |

| Comando                 | Qué hace                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `npm test`              | Ejecuta toda la batería de pruebas.                          |
| `npm run test:watch`    | Modo interactivo durante el desarrollo.                      |
| `npm run test:coverage` | Pruebas + informe de cobertura (texto, HTML y LCOV).          |
| `npm run test:ci`       | Lo que ejecuta el pipeline: cobertura + verificación de umbral.|
| `npm run test:tabla-tesis` | Genera la tabla de métricas por módulo de este documento.  |
| `npm run test:reporte-correo` | Genera el reporte de cobertura que el pipeline envía por correo. |
| `npm run typecheck`     | Verificación de tipos sin emitir código.                      |
| `npm run lint`          | Análisis estático.                                            |

### Alcance de la medición de cobertura

`collectCoverageFrom` (en `jest.config.js`) declara el alcance de forma
explícita. Sin esa lista, Jest solo mide los archivos que algún test llegó a
importar, y el porcentaje sube o baja según qué suites se ejecuten — un número
que no sirve para comparar entre ejecuciones.

Se mide todo `src/`, salvo:

- `src/app/` — pantallas de Expo Router. Son composición y navegación sobre los
  componentes ya probados; se verifican con pruebas manuales sobre dispositivo
  físico y quedan como candidatas naturales a pruebas End-to-End.
- `*.web.tsx` — variantes de la build web; la app se distribuye para Android e
  iOS y el resolutor de Jest solo carga las nativas.
- Archivos de tipos, barriles de re-exportación y el texto legal estático: sin
  código ejecutable propio.

### Criterio de aceptación

`coverageThreshold` fija el 70% en las cuatro métricas (statements, branches,
functions, lines). Jest devuelve código de salida distinto de cero si alguna cae
por debajo, de modo que el umbral no es una recomendación: bloquea el merge.

---

## 2. Resultados

Instantánea del 13/08/2026 — **550 pruebas en 36 suites, todas pasando**.

### Cobertura por módulo

| Módulo                                   | Tests | Pasados | Fallidos | Statements (%) | Branches (%) | Functions (%) | Lines (%) |
| ---------------------------------------- | ----- | ------- | -------- | -------------- | ------------ | ------------- | --------- |
| Stores (React Context)                   | 50    | 50      | 0        | 100.00         | 87.14        | 100.00        | 100.00    |
| Autenticación                            | 36    | 36      | 0        | 94.16          | 82.22        | 88.24         | 94.87     |
| Exploración de Espacios                  | 66    | 66      | 0        | 98.14          | 95.74        | 96.61         | 98.56     |
| Reservas                                 | 146   | 146     | 0        | 78.60          | 76.23        | 82.05         | 79.67     |
| Invitaciones / QR                        | 45    | 45      | 0        | 95.54          | 89.62        | 93.33         | 95.74     |
| Reseñas y calificaciones                 | 41    | 41      | 0        | 99.31          | 92.00        | 98.25         | 99.26     |
| Favoritos                                | 37    | 37      | 0        | 95.37          | 85.37        | 94.44         | 95.10     |
| Componentes UI comunes e infraestructura | 129   | 129     | 0        | 91.17          | 93.06        | 89.13         | 92.69     |
| **TOTAL APP MÓVIL**                      | 550   | 550     | 0        | 91.00          | 85.09        | 91.16         | 91.67     |
| Umbral mínimo requerido                  | —     | —       | —        | 70.00          | 70.00        | 70.00         | 70.00     |

Los porcentajes se calculan sobre totales absolutos del módulo (sentencias
cubiertas / sentencias totales), no como promedio de los porcentajes de cada
archivo: un archivo pequeño al 100% no debe compensar a uno grande al 40%.

### Resumen global

| Métrica    | Cubiertas | Totales | Porcentaje | Umbral | Cumple |
| ---------- | --------- | ------- | ---------- | ------ | ------ |
| Statements | 1517      | 1667    | 91.00%     | 70%    | Sí     |
| Branches   | 936       | 1100    | 85.09%     | 70%    | Sí     |
| Functions  | 464       | 509     | 91.16%     | 70%    | Sí     |
| Lines      | 1386      | 1512    | 91.67%     | 70%    | Sí     |

### Correspondencia con la tabla del documento de tesis

El documento plantea seis filas. La aplicación tiene ocho módulos funcionales;
si se quiere conservar el formato de seis, la agrupación es:

| Fila del documento      | Módulos que agrupa                                     |
| ----------------------- | ------------------------------------------------------ |
| Autenticación           | Autenticación                                          |
| Exploración de Espacios | Exploración de Espacios + Favoritos                    |
| Reservas                | Reservas (incluye el flujo de pago Datafast)           |
| Invitaciones / QR       | Invitaciones / QR                                      |
| Stores React Context    | Stores (React Context)                                 |
| Componentes UI comunes  | Componentes UI comunes e infraestructura + Reseñas     |

---

## 3. Qué se prueba en cada módulo

No son pruebas de "que el componente renderice": cada suite fija las reglas de
negocio que, si se rompen, producen un fallo visible para el usuario.

- **Stores (React Context)** — la máquina de estados de la sesión: arranque
  desde SecureStore, renovación automática del access token, cierre de sesión
  cuando el refresh token ya no sirve, y la sesión de kiosco (que caduca sola y
  nunca se renueva). También el tema claro/oscuro y la degradación de la
  ubicación cuando no hay permiso ni GPS.
- **Autenticación** — login por correo, registro con reintento de username ante
  colisión, y el flujo de Google Sign-In distinguiendo cancelación, login ya en
  curso y error real.
- **Exploración de Espacios** — mapeo del DTO del backend al modelo de dominio,
  filtrado y orden en cliente, y el buscador con su modo aproximado (fuzzy).
- **Reservas** — cálculo del total con comisión de servicio, tope por aforo,
  validaciones previas a reservar, liberación de la reserva al abandonar el
  pago, y el checkout de Datafast con sus cuatro salidas (checkout fallido, pago
  aprobado, rechazado y respuesta ilegible de la pasarela).
- **Invitaciones / QR** — reparto de entradas del pool, corrección de datos (que
  regenera credenciales) y los límites de reenvío que impone el backend: 3
  reenvíos y 5 minutos de espera, respetando el header `Retry-After`.
- **Reseñas** — una reseña por reserva cumplida, con sincronización de la caché
  del listado, de las reservas reseñables y del promedio del catálogo.
- **Favoritos** — actualización optimista del corazón con reversión si falla la
  red, y la política de invalidación conjunta de favoritos y listas.
- **UI común e infraestructura** — el cliente HTTP con su política de
  "401 → refrescar → reintentar una vez", los estados de pantalla y la librería
  de iconos.

---

## 4. Pipeline de Integración Continua

Archivo: `.github/workflows/pruebas.yml`. El análisis estático (CodeQL y
SonarCloud) vive aparte, en `.github/workflows/code-analysis.yml`. La guía de
configuración de secrets y ajustes está en `docs/configuracion-ci-app-movil.md`.

| Elemento         | Valor                                                  |
| ---------------- | ------------------------------------------------------ |
| Disparadores     | Push a `feature/**` y `hotfix/**`; PR hacia esas ramas y hacia `main`; manual |
| Runner           | `ubuntu-latest`                                        |
| Node             | 20, con caché de npm                                   |
| Tiempo límite    | 15 minutos                                             |
| Concurrencia     | Un push nuevo sobre el mismo PR cancela la ejecución anterior |

### Pasos

| # | Paso                              | Comando                | ¿Bloquea el merge? |
| - | --------------------------------- | ---------------------- | ------------------ |
| 1 | Instalación de dependencias       | `npm ci`               | Sí                 |
| 2 | Análisis estático                 | `npm run lint`         | Sí                 |
| 3 | Verificación de tipos             | `npm run typecheck`    | Sí                 |
| 4 | Pruebas unitarias + cobertura ≥70% | `npm run test:ci`     | Sí                 |
| 5 | Publicación del reporte de cobertura | artefacto `coverage/` | No (informativo)  |
| 6 | Diagnóstico de Expo               | `npx expo-doctor`      | No (informativo)   |

Los pasos van en orden de coste creciente: un fallo barato (lint) corta antes de
gastar minutos en los caros. `npm ci` y no `npm install`, para que el runner
instale exactamente lo que fija `package-lock.json`.

El paso 3 existe porque Jest no ve los errores de tipo: Babel borra los tipos sin
comprobarlos, así que sin `tsc --noEmit` un error de tipos llega a la rama
principal con todas las pruebas en verde.

El paso 6 queda informativo a propósito: el desfase entre las versiones
instaladas y las que recomienda el SDK de Expo se atiende en su propia tarea de
mantenimiento y no debe frenar el merge de un cambio funcional.

### Protección de rama

Para que el pipeline funcione como control de calidad y no como un informe que
se puede ignorar, `main` debe tener configurado en
*Settings → Branches → Branch protection rules*:

- Require a pull request before merging
- Require status checks to pass before merging → check requerido: `Lint, tipos, pruebas y cobertura`
- Require branches to be up to date before merging
- Do not allow bypassing the above settings

---

## 5. Notas de implementación

### React Native Testing Library 14 es asíncrona

A diferencia de las versiones anteriores, `render`, `renderHook` y `fireEvent`
devuelven promesas y hay que esperarlas:

```tsx
await render(<SpaceCard espacio={espacio} … />, { wrapper: ConTema });
await fireEvent.press(screen.getByLabelText('Añadir a favoritos'));
```

Sin el `await`, la aserción corre antes de que el árbol exista y el fallo que se
ve es un confuso "render function has not been called".

### Andamiaje compartido

`jest/harness.tsx` (fuera de `src/`, para que no cuente en la cobertura) expone
el cliente de React Query de pruebas y los wrappers `ConTema` y `conProviders`.
Todo componente de la app lee el esquema de color del `ThemeModeProvider`, así
que sin ese wrapper ninguno se monta.

`jest/setup.js` sustituye los módulos nativos que no existen en Jest:
`expo-secure-store`, `react-native-webview`, `react-native-safe-area-context` y
el SDK de Google Sign-In.

### Accesibilidad

Varios botones de icono recibieron `accessibilityRole` y `accessibilityLabel`
para poder localizarlos en las pruebas por lo que hacen ("Limpiar búsqueda",
"Añadir a favoritos") en vez de por su posición en el árbol. El efecto
secundario es que ahora son navegables por lector de pantalla.
