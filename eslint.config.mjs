import { defineConfig } from 'eslint/config';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([
  {
    extends: compat.extends('eslint:recommended'),

    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    },

    rules: {
      complexity: ['error', 4],
      'max-depth': ['error', 2],
      'max-nested-callbacks': ['error', 2],
      'no-undef': 'off'
    }
  },
  {
    files: ['client/**/*.js', 'shared/**/*.js'],

    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ['**/*.test.js'],
    extends: compat.extends('plugin:jest/recommended'),

    languageOptions: {
      globals: {
        ...globals.jest
      }
    },

    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
      'max-nested-callbacks': ['error', 3]
    }
  }
]);
