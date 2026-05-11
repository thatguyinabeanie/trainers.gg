/**
 * Limitless Webhook Route
 *
 * Receives POST from Limitless when a tournament ends.
 * Validates the shared secret, then queues the tournament for import
 * by setting import_status = 'queued' on the tournaments row.
 *
 * The /api/cron/limitless-import cron processes the queue every 15 minutes.
 *
 * Webhook payload from Limitless:
 *   {
 *     "secret": "user-configured-secret",
 *     "event": {
 *       "name": "tournament:ended",
 *       "tournamentId": "abc123",
 *       "game": "VGC"
 *     }
 *   }
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate webhook secret
    const expectedSecret = process.env.LIMITLESS_WEBHOOK_SECRET;
    if (!expectedSecret) {
      console.error(
        "[limitless-webhook] LIMITLESS_WEBHOOK_SECRET not configured"
      );
      return NextResponse.json(
        { success: false, error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (body.secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Invalid secret" },
        { status: 401 }
      );
    }

    // Parse the event
    const event = body.event;
    if (!event || event.name !== "tournament:ended") {
      // Acknowledge unknown events gracefully (don't break Limitless retries)
      return NextResponse.json({
        success: true,
        message: `Ignored event: ${event?.name ?? "unknown"}`,
      });
    }

    // Only process VGC tournaments
    if (event.game !== "VGC") {
      return NextResponse.json({
        success: true,
        message: `Ignored non-VGC game: ${event.game}`,
      });
    }

    const tournamentId = event.tournamentId;
    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: "Missing tournamentId in event" },
        { status: 400 }
      );
    }

    // Queue the tournament for import.
    // If the sync cron hasn't seen this tournament yet, the update below will
    // match 0 rows — that's fine. The sync cron runs every 5 minutes and will
    // create the row, then the import cron will pick it up from the queue.
    const supabase = createServiceRoleClient();

    // Set queue status (only updates if the row already exists)
    const { error: queueErr } = await supabase
      .schema("limitless")
      .from("tournaments")
      .update({
        import_requested_at: new Date().toISOString(),
        import_status: "queued",
        import_error: null,
      })
      .eq("tournament_id", tournamentId);

    if (queueErr) {
      console.error("[limitless-webhook] Queue error:", queueErr);
      return NextResponse.json(
        { success: false, error: "Failed to queue tournament" },
        { status: 500 }
      );
    }

    console.log(
      `[limitless-webhook] Queued tournament ${tournamentId} for import`
    );

    return NextResponse.json({
      success: true,
      data: { tournamentId, queued: true },
    });
  } catch (err) {
    console.error("[limitless-webhook]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
