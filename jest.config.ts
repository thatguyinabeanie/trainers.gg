import type { Config } from "jest";

const config: Config = {
  projects: [
    "<rootDir>/packages/validators",
    "<rootDir>/packages/supabase",
    "<rootDir>/packages/atproto",
    "<rootDir>/packages/pokemon",
    "<rootDir>/packages/tournaments",
    "<rootDir>/packages/utils",
    "<rootDir>/apps/web",
    "<rootDir>/apps/mobile",
  ],
  // Coverage reporters are set at the root level (not per-project)
  // to avoid "Unknown option" warnings in multi-project mode.
  coverageReporters: ["text", "lcov", "json-summary", "cobertura"],
};

export default config;
