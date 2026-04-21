// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  {
    files: [
      "**/__tests__/**/*.{js,jsx,ts,tsx}",
      "**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    ignores: ["dist/*"],
  },
]);
