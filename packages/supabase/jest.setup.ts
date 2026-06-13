/**
 * Jest global setup for @trainers/supabase.
 *
 * Loads the `.env` file (symlinked to `../../.env.local`) so that integration
 * tests that require `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
 * and `SUPABASE_SERVICE_ROLE_KEY` can pick up local credentials without the
 * developer needing to manually source the env file before running tests.
 *
 * This is a no-op in CI — CI sets env vars directly in the workflow env block,
 * and the `.env` symlink does not exist in CI checkout.
 */

import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, ".env");

if (fs.existsSync(envPath)) {
  // dotenv is available as a transitive dependency via @supabase/supabase-js
  // or the monorepo root. Load silently — missing vars are handled by
  // isSupabaseRunning() inside each test that needs them.
  const dotenv = require("dotenv") as { config: (opts: { path: string }) => void };
  dotenv.config({ path: envPath });
}
