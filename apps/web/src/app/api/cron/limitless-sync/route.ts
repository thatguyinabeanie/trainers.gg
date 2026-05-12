/**
 * Limitless Sync Cron
 *
 * Fetches the full VGC tournament list from the Limitless API and upserts
 * metadata rows into the `limitless.tournaments` table. Runs every 5 minutes.
 *
 * Does NOT import full tournament data (standings, teams, matches) — that is
 * handled by the /api/cron/limitless-import queue processor.
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 *
 * GET /api/cron/limitless-sync
 */

import { requireCronAuth } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { syncTournamentList } from "@/lib/limitless";

export async function GET(request: Request): Promise<Response> {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();
  const apiKey = process.env.LIMITLESS_API_KEY;

  if (!apiKey) {
    console.error("[limitless-sync] LIMITLESS_API_KEY not configured");
    return Response.json(
      { success: false, error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const result = await syncTournamentList(supabase, apiKey);

    console.log(
      `[limitless-sync] Synced ${result.synced} tournaments (${result.skipped} skipped, ${result.total} total from API, ${result.mapped} mapped, ${result.unmapped} unmapped)`
    );

    return Response.json({ success: true, data: result });
  } catch (err) {
    console.error("[limitless-sync]", err);
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
