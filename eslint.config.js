const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist-android/*', 'tests/*'] },
  { rules: { 'no-undef': 'error', 'no-unused-vars': 'warn', 'react-hooks/exhaustive-deps': 'off' } },
]);
