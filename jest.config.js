/**
 * Configuración de Jest para la app móvil (React Native / Expo SDK 56).
 *
 * El alcance de cobertura (`collectCoverageFrom`) se declara de forma explícita
 * para que el porcentaje reportado sea estable: sin esta lista, Jest solo mide
 * los archivos que algún test llegó a importar, y el número sube o baja según
 * qué suites se ejecuten.
 */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest/setup.js'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest/styleMock.js',
  },

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',

    // Pantallas de Expo Router: son composición y navegación, no lógica de
    // negocio. Se verifican con pruebas manuales sobre dispositivo y quedan
    // fuera del alcance de las pruebas unitarias.
    '!src/app/**',

    // Variantes de la build web: la app se distribuye para Android e iOS, y
    // el resolutor de Jest solo carga las nativas.
    '!src/**/*.web.tsx',

    // Sin código ejecutable propio.
    '!src/**/types.ts',
    '!src/features/*/index.ts',
    '!src/shared/ui/feedback/index.ts',

    // Texto legal estático (términos, política de datos).
    '!src/features/legal/content.ts',

    '!src/**/__tests__/**',
  ],

  // Criterio de aceptación del proyecto: 70% en las cuatro métricas.
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },

  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov', 'html', 'cobertura'],
  coverageDirectory: 'coverage',
};
