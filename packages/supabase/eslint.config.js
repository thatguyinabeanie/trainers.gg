import baseConfig from "@trainers/eslint-config/base";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      globals: {
        Deno: "readonly",
        RequestInit: "readonly",
      },
    },
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
