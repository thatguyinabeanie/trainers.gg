import type { Config } from "jest";
import { createConfig } from "@trainers/jest-config";

const config: Config = createConfig({
  displayName: "supabase",
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.ts",
    // Edge function tests that use Jest-compatible mocking (no Deno-specific imports)
    "<rootDir>/supabase/functions/_shared/__tests__/cors.test.ts",
    "<rootDir>/supabase/functions/_shared/__tests__/posthog.test.ts",
    "<rootDir>/supabase/functions/**/__tests__/**/*.test.ts",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    // These tests use Deno-specific imports (jsr:, npm:) and must run with Deno
    "<rootDir>/supabase/functions/_shared/__tests__/cache.test.ts",
    "<rootDir>/supabase/functions/_shared/__tests__/pds.test.ts",
    "<rootDir>/supabase/functions/update-pds-handle/__tests__/",
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    // Exclude Edge Functions from coverage - they run in Deno, not Jest
    // "supabase/functions/_shared/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!supabase/functions/_shared/__tests__/**",
    "!src/types.ts",
    "!src/index.ts",
  ],
});

export default config;
