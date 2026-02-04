import type { Config } from "jest";

const config: Config = {
  displayName: "mobile",
  // Use node environment for pure logic tests.
  // Switch to jest-expo preset when testing React Native components.
  testEnvironment: "node",
  transform: { "^.+\\.tsx?$": ["ts-jest", { useESM: true }] },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
};

export default config;
