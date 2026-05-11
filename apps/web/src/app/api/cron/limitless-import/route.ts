/**
 * Limitless Import Queue Cron
 *
 * Processes the import queue: picks queued tournaments, fetches full data from
 * the Limitless API (standings, teams, matches), and imports them into the DB.
 *
 * Batch size is configurable via `?batch=N` query param (default 1, max 50).
 * Runs every 15 minutes. Handles stale/stuck imports by requeueing or failing
 * after MAX_ATTEMPTS.
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 *
 * GET /api/cron/limitless-import?batch=5
 */

import { requireCronAuth } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { processImportQueue } from "@/lib/limitless";

export async function GET(request: Request): Promise<Response> {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const batchSize = Math.max(
    1,
    Math.min(50, parseInt(url.searchParams.get("batch") ?? "1", 10) || 1)
  );

  const supabase = createServiceRoleClient();
  const apiKey = process.env.LIMITLESS_API_KEY;

  try {
    const batch = await processImportQueue(supabase, apiKey, batchSize);

    for (const result of batch.results) {
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
    }

    return Response.json({
      success: true,
      data: {
        batchSize,
        totalProcessed: batch.totalProcessed,
        totalErrors: batch.totalErrors,
        results: batch.results,
      },
    });
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
