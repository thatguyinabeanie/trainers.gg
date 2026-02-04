import expoConfig from "@trainers/eslint-config/expo";
import reactCompiler from "eslint-plugin-react-compiler";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...expoConfig,
  {
    ignores: [
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
      "*.config.js",
    ],
  },
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
