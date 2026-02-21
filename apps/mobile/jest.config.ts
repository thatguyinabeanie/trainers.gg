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

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
  ],
  coverageDirectory: "<rootDir>/coverage",
  setupFilesAfterEnv: ["<rootDir>/test-setup.ts"],
};

export default config;
