import type { Config } from "jest";
import { createConfig } from "@trainers/jest-config";

const config: Config = createConfig({
  displayName: "supabase",
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.ts",
    // Exclude Edge Function tests - they use Deno and should be run with Deno test
    // "<rootDir>/supabase/functions/_shared/__tests__/**/*.test.ts",
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
