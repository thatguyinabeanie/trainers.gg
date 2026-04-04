import nextjsConfig from "@trainers/eslint-config/nextjs";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["scripts/**"],
  },
  ...nextjsConfig,
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
