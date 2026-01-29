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
];
