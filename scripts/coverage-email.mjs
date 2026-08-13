/**
 * Construye el reporte de cobertura que el pipeline envía por correo.
 *
 * Uso:
 *   npx jest --coverage --ci --forceExit --json --outputFile=jest-results.json
 *   node scripts/coverage-email.mjs jest-results.json
 *
 * Produce tres artefactos en `coverage/`:
 *   · `reporte-correo.html` → cuerpo del correo (HTML con estilos en línea, que
 *     es lo único que respetan Gmail y Outlook).
 *   · `resumen.md`          → mismo contenido en Markdown, para el resumen de
 *     la ejecución de GitHub Actions ($GITHUB_STEP_SUMMARY) y como adjunto.
 *   · `asunto.txt`          → asunto ya calculado, para que el paso de envío no
 *     tenga que recalcular nada.
 *
 * El contexto (rama, commit, enlace a la ejecución) se toma de las variables que
 * GitHub Actions ya expone; en local quedan con valores neutros.
 */
import { writeFileSync } from 'node:fs';
import {
  METRICAS,
  UMBRAL,
  agruparCobertura,
  construirFilas,
  contarPruebas,
  pct,
  totalizarPruebas,
} from './coverage-filas.mjs';

const rutaResultados = process.argv[2];

const CONTEXTO = {
  repo: process.env.GITHUB_REPOSITORY ?? 'local',
  rama: process.env.GITHUB_REF_NAME ?? 'local',
  commit: (process.env.GITHUB_SHA ?? '').slice(0, 7),
  autor: process.env.GITHUB_ACTOR ?? '—',
  url:
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
};

const { porFila: porFilaCobertura, total: totalProyecto } = agruparCobertura();
const porFilaPruebas = contarPruebas(rutaResultados);
const filas = construirFilas({ porFilaCobertura, porFilaPruebas });
const totalTests = totalizarPruebas(porFilaPruebas);
const totalMetricas = Object.fromEntries(METRICAS.map(m => [m, pct(totalProyecto[m])]));

const cumpleUmbral = METRICAS.every(m => totalMetricas[m] >= UMBRAL);
const pruebasVerdes = totalTests.fallidos === 0 && totalTests.total > 0;
const exito = cumpleUmbral && pruebasVerdes;

const ETIQUETA_METRICA = {
  statements: 'Sentencias',
  branches: 'Ramas',
  functions: 'Funciones',
  lines: 'Líneas',
};

const VERDE = '#15803d';
const ROJO = '#b91c1c';
const GRIS = '#475569';

const num = v => v.toFixed(2).replace('.', ',');

// ── Markdown (resumen de la ejecución en GitHub) ─────────────────────────────

const md = [];
md.push(`## ${exito ? '✅' : '❌'} Pruebas y cobertura — app móvil`);
md.push('');
md.push(
  `**${totalTests.pasados}/${totalTests.total} pruebas** superadas · ` +
    `rama \`${CONTEXTO.rama}\` · commit \`${CONTEXTO.commit || '—'}\``,
);
md.push('');
md.push(
  '| Módulo | Tests | Pasados | Fallidos | Sentencias (%) | Ramas (%) | Funciones (%) | Líneas (%) |',
);
md.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const f of filas) {
  md.push(
    `| ${f.nombre} | ${f.tests} | ${f.pasados} | ${f.fallidos} | ` +
      METRICAS.map(m => num(f.metricas[m])).join(' | ') +
      ' |',
  );
}
md.push(
  `| **TOTAL APP MÓVIL** | **${totalTests.total}** | **${totalTests.pasados}** | ` +
    `**${totalTests.fallidos}** | ` +
    METRICAS.map(m => `**${num(totalMetricas[m])}**`).join(' | ') +
    ' |',
);
md.push(`| Umbral mínimo requerido | — | — | — | ${UMBRAL} | ${UMBRAL} | ${UMBRAL} | ${UMBRAL} |`);
md.push('');

writeFileSync('coverage/resumen.md', md.join('\n'), 'utf8');

// ── HTML (cuerpo del correo) ─────────────────────────────────────────────────

const celda = (contenido, extra = '') =>
  `<td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;${extra}">${contenido}</td>`;

const encabezado = (contenido, alineacion = 'left') =>
  `<th style="padding:8px 10px;border-bottom:2px solid #cbd5e1;font-size:12px;text-transform:uppercase;` +
  `letter-spacing:.04em;color:${GRIS};text-align:${alineacion}">${contenido}</th>`;

const metricaCelda = valor =>
  celda(
    num(valor),
    `text-align:right;color:${valor >= UMBRAL ? VERDE : ROJO};font-variant-numeric:tabular-nums`,
  );

const filasHtml = filas
  .map(
    f =>
      `<tr>${celda(f.nombre)}${celda(f.tests, 'text-align:right')}` +
      celda(f.pasados, `text-align:right;color:${VERDE}`) +
      celda(f.fallidos, `text-align:right;color:${f.fallidos > 0 ? ROJO : GRIS}`) +
      METRICAS.map(m => metricaCelda(f.metricas[m])).join('') +
      '</tr>',
  )
  .join('\n');

const filaTotal =
  `<tr style="background:#f1f5f9;font-weight:600">` +
  celda('TOTAL APP MÓVIL', 'font-weight:700') +
  celda(totalTests.total, 'text-align:right') +
  celda(totalTests.pasados, `text-align:right;color:${VERDE}`) +
  celda(totalTests.fallidos, `text-align:right;color:${totalTests.fallidos > 0 ? ROJO : GRIS}`) +
  METRICAS.map(m => metricaCelda(totalMetricas[m])).join('') +
  '</tr>';

const filaUmbral =
  `<tr>` +
  celda(`Umbral mínimo requerido (tesis §10.8.1)`, `color:${GRIS}`) +
  celda('—', 'text-align:right') +
  celda('—', 'text-align:right') +
  celda('—', 'text-align:right') +
  METRICAS.map(() => celda(String(UMBRAL), `text-align:right;color:${GRIS}`)).join('') +
  '</tr>';

const tarjetas = METRICAS.map(
  m => `
      <td style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;text-align:center">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${GRIS}">${ETIQUETA_METRICA[m]}</div>
        <div style="font-size:22px;font-weight:700;color:${totalMetricas[m] >= UMBRAL ? VERDE : ROJO}">${num(totalMetricas[m])}%</div>
      </td>`,
).join('<td style="width:8px"></td>');

const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
  <div style="max-width:860px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">

    <div style="padding:18px 22px;background:${exito ? '#ecfdf5' : '#fef2f2'};border-bottom:1px solid #e2e8f0">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:${GRIS}">Reporte de pruebas — App Móvil (React Native / Expo)</div>
      <div style="font-size:20px;font-weight:700;color:${exito ? VERDE : ROJO};margin-top:4px">
        ${exito ? '✅ Pruebas y cobertura correctas' : '❌ La ejecución no cumple los criterios'}
      </div>
    </div>

    <div style="padding:18px 22px">
      <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;color:${GRIS};margin-bottom:18px">
        <tr><td style="padding:2px 0"><strong style="color:#1f2937">Repositorio:</strong> ${CONTEXTO.repo}</td></tr>
        <tr><td style="padding:2px 0"><strong style="color:#1f2937">Rama:</strong> ${CONTEXTO.rama}</td></tr>
        <tr><td style="padding:2px 0"><strong style="color:#1f2937">Commit:</strong> ${CONTEXTO.commit || '—'} · <strong style="color:#1f2937">Autor:</strong> ${CONTEXTO.autor}</td></tr>
        <tr><td style="padding:2px 0"><strong style="color:#1f2937">Resultado:</strong> ${totalTests.pasados} de ${totalTests.total} pruebas superadas${totalTests.fallidos ? ` · ${totalTests.fallidos} fallidas` : ''}</td></tr>
      </table>

      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px"><tr>${tarjetas}</tr></table>

      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            ${encabezado('Módulo')}${encabezado('Tests', 'right')}${encabezado('Pasados', 'right')}${encabezado('Fallidos', 'right')}
            ${METRICAS.map(m => encabezado(`${ETIQUETA_METRICA[m]} (%)`, 'right')).join('')}
          </tr>
        </thead>
        <tbody>
${filasHtml}
${filaTotal}
${filaUmbral}
        </tbody>
      </table>

      <p style="font-size:12px;color:${GRIS};line-height:1.6;margin-top:18px">
        El reporte HTML navegable (<code>coverage/lcov-report/index.html</code>) queda como artefacto
        <b>cobertura-app-movil</b> de la ejecución: se descarga desde el enlace de abajo, en la
        sección <i>Artifacts</i>. No viaja adjunto porque los proveedores de correo bloquean los
        archivos HTML y JavaScript, incluso dentro de un ZIP.
        ${CONTEXTO.url ? `<br><br>Detalle completo y descarga: <a href="${CONTEXTO.url}" style="color:#1d4ed8">${CONTEXTO.url}</a>` : ''}
      </p>
    </div>
  </div>
</body>
</html>`;

writeFileSync('coverage/reporte-correo.html', html, 'utf8');

// Asunto del correo, para que el paso de envío no tenga que recalcular nada.
const asunto =
  `[${exito ? 'OK' : 'FALLO'}] Cobertura app móvil · ${CONTEXTO.rama} · ` +
  `${num(totalMetricas.statements)}% sentencias · ${totalTests.pasados}/${totalTests.total} pruebas`;

writeFileSync('coverage/asunto.txt', asunto, 'utf8');

console.log(asunto);
console.log(`Umbral ${UMBRAL}% ${cumpleUmbral ? 'cumplido' : 'NO cumplido'} en las cuatro métricas.`);
