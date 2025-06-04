import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import {defineConfig} from 'eslint/config';

export default defineConfig([
    {
        files: ['**/*.{js,mjs,cjs,ts}'],
        plugins: {js},
        languageOptions: {
            globals: globals.browser,
        },
        extends: ['js/recommended'],
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            sourceType: 'script',
        },
    },
    {
        files: ['**/*.ts'],
        ...tseslint.configs.recommended,
        rules: {
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
]);
