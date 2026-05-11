/**
 * Limitless Import Queue Cron
 *
 * Processes the import queue: picks the oldest "queued" tournament, fetches
 * full data from the Limitless API (standings, teams, matches), and imports
 * it into the database.
 *
 * Processes one tournament per invocation to stay within Vercel's 300s limit.
 * Runs every 15 minutes. Handles stale/stuck imports by requeueing or failing
 * after MAX_ATTEMPTS.
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 *
 * GET /api/cron/limitless-import
 */

import { requireCronAuth } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { processImportQueue } from "@/lib/limitless";

export async function GET(request: Request): Promise<Response> {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();
  const apiKey = process.env.LIMITLESS_API_KEY;

  try {
    const result = await processImportQueue(supabase, apiKey);

    if (result.recovered) {
      console.log(
        "[limitless-import] Recovered stale imports, will retry next pass"
      );
    } else if (!result.processed) {
      console.log("[limitless-import] Queue empty — nothing to process");
    } else if (result.error) {
      console.warn(
        `[limitless-import] Failed to import ${result.tournamentId}: ${result.error}`
      );
    } else {
      console.log(
        `[limitless-import] Imported ${result.tournamentId}: ${result.result?.name} (${result.result?.players} players, ${result.result?.standings} standings, ${result.result?.pokemon} pokemon, ${result.result?.matches} matches)`
      );
    }

    return Response.json({ success: true, data: result });
  } catch (err) {
    console.error("[limitless-import]", err);
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Import failed",
      },
      { status: 500 }
    );
  }
}
