import expoConfig from "@trainers/eslint-config/expo";

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
];
