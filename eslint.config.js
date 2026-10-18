import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'coverage/', 'dist-fixture/', 'test-results/', 'playwright-report/', '.claude/', '.github/', '.remember/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  { languageOptions: { globals: { process: 'readonly', console: 'readonly', fetch: 'readonly' } } },
];
