import { typescript, javascript } from '@frsource/eslint-config';
import globals from 'globals';
import cypress from 'eslint-plugin-cypress/flat'

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...javascript,
  ...typescript,
  { ignores: ['**/dist', '**/coverage', '**/node_modules'] },
  { rules: { '@typescript-eslint/no-invalid-void-type': 'off' } },
  {
    plugins: { cypress },
    files: ['examples/*/cypress/**', 'packages/*/src/**'],
    languageOptions: {
      globals: {
        ...globals.es2021,
        ...globals.node,
        ...cypress.globals,
      },
    },
  },
];
