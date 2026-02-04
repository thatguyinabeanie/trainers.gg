import nextjsConfig from "@trainers/eslint-config/nextjs";
import reactCompiler from "eslint-plugin-react-compiler";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["scripts/**"],
  },
  ...nextjsConfig,
  {
    plugins: {
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-compiler/react-compiler": "error",
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
