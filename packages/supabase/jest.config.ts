import type { Config } from "jest";
import { createConfig } from "@trainers/test-utils/jest-config";

const config: Config = createConfig({
  displayName: "supabase",
  // Load .env (symlinked to ../../.env.local) so integration tests that need
  // NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY can auto-skip rather
  // than error when local Supabase is not running.
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.ts",
    // Edge function tests that use Jest-compatible mocking (no Deno-specific imports)
    "<rootDir>/supabase/functions/_shared/__tests__/cors.test.ts",
    "<rootDir>/supabase/functions/_shared/__tests__/posthog.test.ts",
    "<rootDir>/supabase/functions/**/__tests__/**/*.test.ts",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    // These tests use Deno-specific imports (jsr:, npm:) that need special resolution
    "<rootDir>/supabase/functions/_shared/__tests__/cache.test.ts",
    "<rootDir>/supabase/functions/_shared/__tests__/pds.test.ts",
  ],
  moduleNameMapper: {
    // Map Deno-specific import specifiers to identity (they're jest.mock'd in tests)
    "^jsr:@supabase/supabase-js@2$": "<rootDir>/src/__mocks__/supabase-js.ts",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    // Exclude Edge Functions from coverage - they run in Deno, not Jest
    // "supabase/functions/_shared/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!supabase/functions/_shared/__tests__/**",
    "!src/types.ts",
    "!src/index.ts",
    // Auto-generated client wrappers — thin DI wrappers around core queries/mutations
    "!src/clients/client.ts",
    "!src/clients/mobile.ts",
    "!src/clients/server.ts",
  ],
});

export default config;
