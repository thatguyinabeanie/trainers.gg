/**
 * Read path for the import_runs observability log.
 *
 * Powers the admin "Recent runs" feed. RLS restricts SELECT to site admins, so
 * pass an authenticated client (the service-role client also works and bypasses
 * RLS — used by the gated server action).
 */

import { type TypedClient } from "../client";
import { type Tables } from "../types";

/** A single import_runs row, as displayed in the admin recent-runs feed. */
export type ImportRunRow = Tables<"import_runs">;

/** Hard cap so a misconfigured limit can never fetch the whole table. */
const MAX_LIMIT = 100;

/**
 * List the most recent import runs, newest first.
 *
 * @param limit number of rows to return (default 20, clamped to 1..100)
 */
export async function listRecentImportRuns(
  supabase: TypedClient,
  limit = 20
): Promise<ImportRunRow[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);

  const { data, error } = await supabase
    .from("import_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(boundedLimit);

  if (error) {
    throw new Error(`Failed to fetch import runs: ${error.message}`);
  }

  return data ?? [];
}
