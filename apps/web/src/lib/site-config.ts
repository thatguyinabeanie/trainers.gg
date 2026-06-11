/**
 * Server-to-server site_config reader.
 *
 * The `getSiteConfig` server action in `actions/site-config.ts` is
 * auth-gated (requires a site admin session) and is suitable for
 * user-initiated requests. This helper is for trusted server contexts
 * (cron routes, background workers) that hold a service-role client but
 * have no user session.
 *
 * Pass a service-role Supabase client. The keys list is always small and
 * bounded — no chunking needed.
 */

import type { TypedClient } from "@trainers/supabase";

/**
 * Read multiple site_config values by key in a single round-trip.
 *
 * Returns a map of `{ [key]: value }` where `value` is the raw JSONB
 * column value (already parsed by the Supabase JS client). Missing keys
 * are omitted from the result rather than returned as null.
 *
 * Throws if the query fails so callers can surface the error rather
 * than silently using stale/default values.
 *
 * @example
 * ```ts
 * const supabase = createServiceRoleClient();
 * const config = await readSiteConfigValues(supabase, [
 *   "rk9_max_teams_per_tick",
 *   "rk9_team_concurrency",
 * ]);
 * const batchSize = (config["rk9_max_teams_per_tick"] as number | undefined) ?? 25;
 * const concurrency = (config["rk9_team_concurrency"] as number | undefined) ?? 3;
 * ```
 */
export async function readSiteConfigValues(
  supabase: TypedClient,
  keys: string[]
): Promise<Record<string, unknown>> {
  // Fail open on an empty key list — `.in("key", [])` builds an invalid
  // PostgREST `in.()` filter that errors at runtime.
  if (keys.length === 0) return {};

  const { data, error } = await supabase
    .from("site_config")
    .select("key, value")
    .in("key", keys);

  if (error) {
    throw new Error(`Failed to read site_config: ${error.message}`);
  }

  const result: Record<string, unknown> = {};
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }
  return result;
}
