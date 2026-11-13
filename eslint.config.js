const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'design/*', 'node_modules/*', '.expo/*', 'supabase/functions/*', 'scripts/*'],
  },
  {
    // CLAUDE.md القسم 6: بدون any وبدون @ts-ignore
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
]);
