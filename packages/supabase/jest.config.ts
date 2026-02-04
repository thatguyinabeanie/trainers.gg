import type { Config } from "jest";

const config: Config = {
  displayName: "supabase",
  testEnvironment: "node",
  transform: { "^.+\\.tsx?$": ["ts-jest", { useESM: true }] },
  extensionsToTreatAsEsm: [".ts"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.ts",
    "<rootDir>/supabase/functions/_shared/__tests__/**/*.test.ts",
  ],
};

export default config;
