import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      // eslint-plugin-react-hooks 7: legacy `recommended-latest` keeps the
      // eslintrc shape (plugins array) which eslint 10 rejects; the flat
      // variants live under configs.flat.*
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Core no-unused-vars does not count JSX-only usage; uppercase names are
      // component bindings, so ignore them for params (Icon, Page) exactly like
      // the long-standing vars pattern already does for component imports.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]', caughtErrorsIgnorePattern: '^_' }],
      // Keep compiler diagnostics visible at their established severity. The lint
      // command enforces zero warnings after the state/data-flow cleanup.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    // Root config files run under Node, not the browser.
    files: ['*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/**/*.{test,spec}.{js,jsx}'],
    languageOptions: { globals: { ...globals.vitest } },
  },
  {
    files: ['src/routes/protectedLayoutRoutes.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
