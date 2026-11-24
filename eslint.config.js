import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'docs/reference/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Funkce cíl do 50 řádků (základ 33); varování, ne chyba.
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      // Proměnné začínající „_“ jsou záměrně nepoužité (vynechání vlastnosti z objektu).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Jádro: bez DOM a bez API prohlížeče či disku (základy 9, 13).
    files: ['packages/core/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch'].map(
          (name) => ({
            name,
            message: 'Jádro nesmí volat API prohlížeče (základ 13), použij rozhraní Platform.',
          }),
        ),
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'preact', 'preact/*'],
              message: 'Jádro je bez DOM, disku a UI (základy 9, 13).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/sandbox/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: { 'max-lines-per-function': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['tools/**/*.mjs', '*.config.{js,ts}', 'apps/*/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
