// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/**', 'backend/**', '.expo-production-check/**']),
  expoConfig,
  {
    ignores: ['dist/*', 'backend/**', '.expo-production-check/**'],
    rules: {
      // React Native text nodes safely render apostrophes and quotes as literal text.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
