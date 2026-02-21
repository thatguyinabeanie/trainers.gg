import type { Config } from "jest";
import { createConfig } from "@trainers/test-utils/jest-config";

const config: Config = createConfig({
  displayName: "utils",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!src/index.ts",
  ],
});

export default config;
