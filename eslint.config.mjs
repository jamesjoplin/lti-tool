import js from '@eslint/js';
import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import oxlint from 'eslint-plugin-oxlint';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      import: importPlugin,
    },
    rules: {
      // Rules oxlint doesn't handle yet (as of v1.0)
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      // Function/Complexity Rules (supplement oxlint)
      'max-len': [
        'error',
        {
          code: 90,
          ignoreUrls: true,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'require-await': 'off',
    },
  },
  // Test files configuration (Vitest globals)
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/__tests__/**/*.{ts,tsx,js,jsx}'],
    rules: {
      // Relax rules for test files
      'max-lines-per-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off', // Tests don't need return types
    },
  },
  // Turn off ESLint rules that oxlint handles (must be last)
  ...oxlint.configs['flat/recommended'],
  {
    ignores: [
      '**/coverage/**',
      '**/dist/**',
      'build/',
      '**/node_modules/*',
      '*.js',
      'coverage/',
      '.nyc_output/',
      '.vscode/',
      '.idea/',
      '*.min.js',
      '*.bundle.js',
      'eslint.config.mjs',
      '**/*.mjs',
      '**/*.d.ts',
    ],
  },
];
