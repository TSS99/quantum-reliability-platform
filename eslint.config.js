// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'packages/contracts/src/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // RECON-29: apps/web must never reach into the backend service — DemoProvider is the
    // only browser-reachable adapter; real provider integrations live behind services/api.
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['services/api', 'services/api/*', '**/services/api/**'],
              message:
                'apps/web must not import services/api (RECON-29). Use packages/contracts and the ReliabilityDataSource abstraction instead.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
