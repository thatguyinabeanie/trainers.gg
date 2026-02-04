import type { Config } from "jest";

const config: Config = {
  displayName: "mobile",
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|tamagui|@tamagui/.*)",
  ],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
};

export default config;
