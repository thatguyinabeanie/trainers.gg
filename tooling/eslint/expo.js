import base from "./base.js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: {
      react,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  // React Hooks + Compiler rules — constructed manually for flat config compatibility
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      // Disabled: React Compiler handles memoization and stale closure
      // prevention automatically. See reactwg/react-compiler#18.
      "react-hooks/exhaustive-deps": "off",
      // Informational only — third-party libs skip compiler optimization
      // gracefully. No action needed.
      "react-hooks/incompatible-library": "off",
    },
  },
];
