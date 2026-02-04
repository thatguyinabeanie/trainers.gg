import type { Config } from "jest";
import { createConfig } from "@trainers/jest-config";

const config: Config = createConfig({
  displayName: "supabase",
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.ts",
    "<rootDir>/supabase/functions/_shared/__tests__/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "supabase/functions/_shared/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!supabase/functions/_shared/__tests__/**",
    "!src/types.ts",
    "!src/index.ts",
  ],
});

export default config;
