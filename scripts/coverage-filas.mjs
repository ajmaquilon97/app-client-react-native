/**
 * Agrupación de la cobertura de Jest en las filas por módulo que espera la
 * tesis (§10.8.3.2, Aplicación Móvil).
 *
 * Vive aparte porque la consumen dos generadores distintos:
 *   · `coverage-tesis.mjs` → tabla Markdown para pegar en el documento.
 *   · `coverage-email.mjs` → cuerpo HTML del correo que envía el pipeline.
 *
 * Si la tabla del documento cambia de filas, se cambia aquí una sola vez.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

export const METRICAS = ['statements', 'branches', 'functions', 'lines'];

/** Umbral de aceptación de la tesis, el mismo de `jest.config.js`. */
export const UMBRAL = 70;

/**
 * Las seis filas de la tabla del documento. El orden importa: un archivo cae en
 * la primera fila cuyo `coincide` devuelva verdadero, así que lo específico
 * (los contextos) va antes que lo general (`shared/`, `features/auth/`).
 *
 * `suites` deja que una fila reclame archivos de prueba por nombre: las suites
 * viven en `__tests__/`, no junto al archivo que prueban, de modo que el mapeo
 * por prefijo de directorio no las alcanza.
 */
export const FILAS = [
  {
    nombre: 'Stores React Context',
    coincide: f =>
      f.includes('/features/auth/context/') ||
      f.includes('/features/recepcion/context/') ||
      f.includes('/shared/theme/ThemeModeContext.tsx') ||
      f.includes('/shared/location/'),
    suites: [
      'AuthContext.test.tsx',
      'KioskAuthContext.test.tsx',
      'ThemeModeContext.test.tsx',
      'LocationContext.test.tsx',
    ],
  },
  {
    nombre: 'Autenticación',
    coincide: f => f.includes('/features/auth/'),
  },
  {
    nombre: 'Exploración de Espacios',
    coincide: f => f.includes('/features/espacios/') || f.includes('/features/favoritos/'),
  },
  {
    nombre: 'Reservas',
    coincide: f => f.includes('/features/reservas/') || f.includes('/features/pagos/'),
  },
  {
    nombre: 'Invitaciones / QR',
    coincide: f => f.includes('/features/invitados/') || f.includes('/features/recepcion/'),
  },
  {
    nombre: 'Componentes UI comunes',
    coincide: f =>
      f.includes('/shared/') || f.includes('/features/resenas/') || f.includes('/features/legal/'),
  },
];

/**
 * Desglose sin agrupar, para el anexo del documento: separa lo que las filas
 * "Exploración de Espacios" y "Componentes UI comunes" juntan.
 */
export const FILAS_DETALLE = [
  FILAS[0], // Stores React Context
  FILAS[1], // Autenticación
  { nombre: 'Exploración de Espacios', coincide: f => f.includes('/features/espacios/') },
  FILAS[3], // Reservas
  FILAS[4], // Invitaciones / QR
  { nombre: 'Reseñas y calificaciones', coincide: f => f.includes('/features/resenas/') },
  { nombre: 'Favoritos', coincide: f => f.includes('/features/favoritos/') },
  {
    nombre: 'Componentes UI comunes e infraestructura',
    coincide: f => f.includes('/shared/') || f.includes('/features/legal/'),
  },
];

export const normalizar = ruta => ruta.replace(/\\/g, '/');

const vacio = () => Object.fromEntries(METRICAS.map(m => [m, { total: 0, covered: 0 }]));

function acumular(destino, fichero) {
  for (const m of METRICAS) {
    destino[m].total += fichero[m].total;
    destino[m].covered += fichero[m].covered;
  }
}

export function pct({ total, covered }) {
  return total === 0 ? 100 : (covered / total) * 100;
}

/**
 * Reparte `coverage/coverage-summary.json` entre las filas indicadas.
 * Devuelve `{ porFila: Map<nombre, métricas>, total: métricas }`.
 */
export function agruparCobertura(filas = FILAS, rutaResumen = 'coverage/coverage-summary.json') {
  const resumen = JSON.parse(readFileSync(rutaResumen, 'utf8'));
  const porFila = new Map(filas.map(f => [f.nombre, vacio()]));
  const total = vacio();

  for (const [ruta, datos] of Object.entries(resumen)) {
    if (ruta === 'total') continue;
    const f = normalizar(ruta);
    const fila = filas.find(x => x.coincide(f));
    if (!fila) {
      console.warn(`[aviso] sin fila asignada: ${f}`);
      continue;
    }
    acumular(porFila.get(fila.nombre), datos);
    acumular(total, datos);
  }

  return { porFila, total };
}

/**
 * Conteo de pruebas por fila.
 *
 * `rutaResultados` es el JSON que produce `jest --json --outputFile=…`. En CI se
 * reaprovecha el de la ejecución que ya corrió; en local, si no se pasa ruta, se
 * vuelve a ejecutar Jest (más lento, pero no obliga a recordar el flag).
 */
export function contarPruebas(rutaResultados, filas = FILAS) {
  const json = rutaResultados
    ? JSON.parse(readFileSync(rutaResultados, 'utf8'))
    : (() => {
        const salida = execSync('npx jest --silent --forceExit --json', {
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        });
        return JSON.parse(salida.slice(salida.indexOf('{')));
      })();

  const porFila = new Map(filas.map(f => [f.nombre, { total: 0, pasados: 0, fallidos: 0 }]));

  for (const suite of json.testResults) {
    const ruta = normalizar(suite.name);
    const archivo = ruta.split('/').pop();
    const fila =
      filas.find(f => (f.suites ?? []).includes(archivo)) ?? filas.find(f => f.coincide(ruta));
    if (!fila) {
      console.warn(`[aviso] suite sin fila asignada: ${ruta}`);
      continue;
    }
    const destino = porFila.get(fila.nombre);
    for (const t of suite.assertionResults) {
      destino.total += 1;
      if (t.status === 'passed') destino.pasados += 1;
      else destino.fallidos += 1;
    }
  }

  return porFila;
}

/** Suma de los conteos de todas las filas. */
export function totalizarPruebas(porFila) {
  return [...porFila.values()].reduce(
    (a, t) => ({
      total: a.total + t.total,
      pasados: a.pasados + t.pasados,
      fallidos: a.fallidos + t.fallidos,
    }),
    { total: 0, pasados: 0, fallidos: 0 },
  );
}

/**
 * Filas listas para renderizar: nombre, conteo de pruebas y las cuatro métricas
 * ya en porcentaje.
 */
export function construirFilas({ porFilaCobertura, porFilaPruebas, filas = FILAS }) {
  return filas.map(f => {
    const cov = porFilaCobertura.get(f.nombre);
    const t = porFilaPruebas.get(f.nombre) ?? { total: 0, pasados: 0, fallidos: 0 };
    return {
      nombre: f.nombre,
      tests: t.total,
      pasados: t.pasados,
      fallidos: t.fallidos,
      metricas: Object.fromEntries(METRICAS.map(m => [m, pct(cov[m])])),
    };
  });
}
