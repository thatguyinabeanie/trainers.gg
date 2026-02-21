import type { Config } from "jest";
import { createConfig } from "@trainers/test-utils/jest-config";

const config: Config = createConfig({
  displayName: "web",
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/test-setup.ts",
    "!src/components/ui/**",
    "!src/generated/**",
  ],
});

export default config;
