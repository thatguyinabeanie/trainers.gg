import nextjsConfig from "@trainers/eslint-config/nextjs";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["scripts/**"],
  },
  ...nextjsConfig,
];
