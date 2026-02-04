import type { Config } from "jest";
import { createConfig } from "@trainers/jest-config";

const config: Config = createConfig({
  displayName: "mobile",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
  ],
});

export default config;
