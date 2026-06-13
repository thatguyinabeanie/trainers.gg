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
  // Parse the .env file directly rather than depending on `dotenv` — it keeps
  // this setup self-contained (no extra dependency / lockfile entry) and avoids
  // the forbidden `require()` import. Existing process.env values win, so an
  // already-exported var (e.g. CI's workflow env) is never overwritten. Missing
  // vars are handled by isSupabaseRunning() inside each test that needs them.
  const contents = fs.readFileSync(envPath, "utf8");
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip a single pair of surrounding quotes, if present.
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
