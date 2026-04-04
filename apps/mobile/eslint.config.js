import expoConfig from "@trainers/eslint-config/expo";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...expoConfig,
  {
    ignores: ["babel.config.js", "metro.config.js", "tailwind.config.js"],
  },
  {
    files: ["**/__tests__/**/*.test.{ts,tsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
        jest: "readonly",
      },
    },
  },
];
