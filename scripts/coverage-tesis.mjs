/**
 * Genera la tabla de cobertura por módulo que pide la tesis (§10.8.3.2,
 * "Aplicación Móvil — React Native / Expo"), agrupando el reporte de Jest en
 * las filas que el documento espera.
 *
 * Uso:
 *   npm run test:tabla-tesis
 *
 * Con un JSON de resultados ya generado (`jest --json --outputFile=…`) se evita
 * la segunda ejecución de Jest:
 *   node scripts/coverage-tesis.mjs jest-results.json
 *
 * El reparto por filas vive en `coverage-filas.mjs`, compartido con el
 * generador del correo de cobertura. Además de imprimirlo por consola, deja el
 * informe completo en `coverage/metricas-pruebas.md`.
 */
import { writeFileSync } from 'node:fs';
import {
  FILAS_DETALLE,
  METRICAS,
  UMBRAL,
  agruparCobertura,
  construirFilas,
  contarPruebas,
  pct,
  totalizarPruebas,
} from './coverage-filas.mjs';

const rutaResultados = process.argv[2];

const CABECERA = [
  'Módulo',
  'Tests',
  'Pasados',
  'Fallidos',
  'Statements (%)',
  'Branches (%)',
  'Functions (%)',
  'Lines (%)',
];

function tablaMarkdown(cuerpo) {
  const anchos = CABECERA.map((c, i) => Math.max(c.length, ...cuerpo.map(f => f[i].length)));
  const linea = celdas => `| ${celdas.map((c, i) => c.padEnd(anchos[i])).join(' | ')} |`;
  return [
    linea(CABECERA),
    `| ${anchos.map(a => '-'.repeat(a)).join(' | ')} |`,
    ...cuerpo.map(linea),
  ].join('\n');
}

const aFila = f => [
  f.nombre,
  String(f.tests),
  String(f.pasados),
  String(f.fallidos),
  ...METRICAS.map(m => f.metricas[m].toFixed(2)),
];

/** Construye una tabla completa (filas + total + umbral) para un agrupamiento. */
function tablaDe(filasDef) {
  const { porFila: porFilaCobertura, total } = agruparCobertura(filasDef);
  const porFilaPruebas = contarPruebas(rutaResultados, filasDef);
  const filas = construirFilas({ porFilaCobertura, porFilaPruebas, filas: filasDef }).map(aFila);
  const t = totalizarPruebas(porFilaPruebas);

  const totalFila = [
    '**TOTAL APP MÓVIL**',
    String(t.total),
    String(t.pasados),
    String(t.fallidos),
    ...METRICAS.map(m => pct(total[m]).toFixed(2)),
  ];
  const umbralFila = [
    'Umbral mínimo requerido',
    '—',
    '—',
    '—',
    ...METRICAS.map(() => UMBRAL.toFixed(2)),
  ];

  return { markdown: tablaMarkdown([...filas, totalFila, umbralFila]), total, pruebas: t };
}

const tesis = tablaDe(undefined);
const detalle = tablaDe(FILAS_DETALLE);
const T = tesis.total;

const cumple = m => (pct(T[m]) >= UMBRAL ? 'Sí' : 'No');

const informe = `# Métricas de pruebas unitarias — Aplicación Móvil (React Native / Expo)

Generado por \`scripts/coverage-tesis.mjs\` a partir de la ejecución de
\`jest --coverage\`. Los porcentajes se calculan sobre los totales absolutos de
cada módulo (sentencias cubiertas / sentencias totales), no como promedio de los
porcentajes por archivo.

Alcance de la medición: todo \`src/\`, excepto las pantallas de Expo Router
(\`src/app/\`), los archivos de tipos, los barriles de re-exportación y el texto
legal estático. Ver \`collectCoverageFrom\` en \`jest.config.js\`.

## Tabla para el documento de tesis (§10.8.3.2)

Con las seis filas exactas del documento.

${tesis.markdown}

- **Exploración de Espacios** agrupa los módulos de espacios y favoritos.
- **Componentes UI comunes** agrupa \`shared/\`, reseñas y las pantallas legales.

## Resultados por módulo (detalle)

Desglose sin agrupar, por si prefieres ampliar la tabla del documento.

${detalle.markdown}

## Resumen global

| Métrica    | Cubiertas | Totales | Porcentaje | Umbral | Cumple |
| ---------- | --------- | ------- | ---------- | ------ | ------ |
| Statements | ${T.statements.covered} | ${T.statements.total} | ${pct(T.statements).toFixed(2)}% | ${UMBRAL}% | ${cumple('statements')} |
| Branches   | ${T.branches.covered} | ${T.branches.total} | ${pct(T.branches).toFixed(2)}% | ${UMBRAL}% | ${cumple('branches')} |
| Functions  | ${T.functions.covered} | ${T.functions.total} | ${pct(T.functions).toFixed(2)}% | ${UMBRAL}% | ${cumple('functions')} |
| Lines      | ${T.lines.covered} | ${T.lines.total} | ${pct(T.lines).toFixed(2)}% | ${UMBRAL}% | ${cumple('lines')} |

Casos de prueba: ${tesis.pruebas.pasados}/${tesis.pruebas.total} pasados.
`;

writeFileSync('coverage/metricas-pruebas.md', informe, 'utf8');
console.log(informe);
console.log('Informe escrito en coverage/metricas-pruebas.md');
