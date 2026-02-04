import type { Config } from "jest";

const config: Config = {
  projects: [
    "<rootDir>/packages/validators",
    "<rootDir>/packages/supabase",
    "<rootDir>/packages/atproto",
    "<rootDir>/apps/web",
    "<rootDir>/apps/mobile",
  ],
};

export default config;
