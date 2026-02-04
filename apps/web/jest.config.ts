import type { Config } from "jest";

const config: Config = {
  displayName: "web",
  testEnvironment: "jsdom",
  transform: { "^.+\\.tsx?$": ["ts-jest", { useESM: true }] },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
};

export default config;
