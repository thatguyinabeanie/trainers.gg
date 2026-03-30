import type { Config } from "jest";

const config: Config = {
  displayName: "mobile",
  preset: "jest-expo",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],

  // pnpm hoists packages under node_modules/.pnpm/<pkg>/node_modules/<pkg>/
  // The default patterns only handle one level of node_modules. We need to
  // allow transforms through nested node_modules inside .pnpm as well.
  transformIgnorePatterns: [
    "node_modules/.pnpm/(?!.*node_modules/(" +
      "(jest-)?react-native|" +
      "@react-native|" +
      "expo(nent)?|" +
      "@expo(nent)?|" +
      "expo-modules-core|" +
      "@expo-google-fonts|" +
      "react-navigation|" +
      "@react-navigation|" +
      "@sentry/react-native|" +
      "native-base|" +
      "react-native-svg|" +
      "@supabase|" +
      "@tanstack|" +
      "@trainers" +
      ")/)",
    "node_modules/(?!\\.pnpm)(?!(" +
      "(jest-)?react-native|" +
      "@react-native|" +
      "expo(nent)?|" +
      "@expo(nent)?|" +
      "expo-modules-core|" +
      "@expo-google-fonts|" +
      "react-navigation|" +
      "@react-navigation|" +
      "@sentry/react-native|" +
      "native-base|" +
      "react-native-svg|" +
      "@supabase|" +
      "@tanstack|" +
      "@trainers" +
      ")/)",
  ],

  // babel-preset-expo uses @babel/plugin-transform-runtime which injects
  // require('@babel/runtime/helpers/...') into every transformed file.
  // In pnpm's virtual store, that require is evaluated from within
  // .pnpm/react-native@.../node_modules/ — a path where @babel/runtime is
  // not resolvable by Node. Mapping it through this package's own
  // node_modules symlink (created because @babel/runtime is a direct dep)
  // lets Jest intercept the require before Node resolution runs.
  moduleNameMapper: {
    "^@babel/runtime/(.*)$": "<rootDir>/node_modules/@babel/runtime/$1",
  },

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
  ],
  coverageDirectory: "<rootDir>/coverage",
  setupFilesAfterEnv: ["<rootDir>/test-setup.ts"],
};

export default config;
