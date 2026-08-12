// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Fronteras de la arquitectura (ver docs/ARQUITECTURA.md).
//
// En `error`: la migración a feature-first terminó y ya no hay violaciones. Las
// excepciones legítimas se marcan en el sitio con un eslint-disable y su motivo.
const BOUNDARY = 'error';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'docs/*'],
  },
  {
    // Una feature habla con otra SOLO por su barrel. Para sus propios archivos
    // usa rutas relativas (`./hooks/useX`), no `@/features/<la-propia>/...`.
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        BOUNDARY,
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message:
                'Importa desde el barrel de la feature (@/features/<nombre>). Dentro de la propia feature, usa rutas relativas.',
            },
          ],
        },
      ],
    },
  },
  {
    // shared/ es la base sobre la que se apoyan las features: no puede depender
    // de ninguna, o se crean ciclos.
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        BOUNDARY,
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/*/**'],
              message: 'shared/ no puede depender de una feature.',
            },
          ],
        },
      ],
    },
  },
  {
    // La UI consume hooks; quien habla con la red es la capa de hooks.
    files: ['src/app/**', 'src/features/*/components/**', 'src/components/**'],
    rules: {
      'no-restricted-imports': [
        BOUNDARY,
        {
          patterns: [
            {
              group: ['@/services/*', '**/services/*'],
              message:
                'Un componente no llama a un servicio: usa un hook de la feature (useQuery/useMutation).',
            },
          ],
        },
      ],
    },
  },
]);
