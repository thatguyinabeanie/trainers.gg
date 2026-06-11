/**
 * Limitless Webhook Route
 *
 * Receives POST from Limitless when a tournament ends.
 * Validates the shared secret, then queues the tournament for import
 * by setting import_status = 'queued' on the tournaments row.
 *
 * Queued tournaments can be imported via the admin data dashboard.
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
import { safeCompare } from "@/lib/timing-safe";
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

    if (!safeCompare(String(body.secret ?? ""), expectedSecret)) {
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
    // Use upsert so this works even if the sync cron hasn't created the row yet.
    const supabase = createServiceRoleClient();

    // Check current status first to avoid re-queueing completed tournaments
    const { data: existing, error: lookupErr } = await supabase
      .schema("limitless")
      .from("tournaments")
      .select("tournament_id, import_status")
      .eq("tournament_id", tournamentId)
      .maybeSingle();

    if (lookupErr) {
      console.error("[limitless-webhook] Lookup error:", lookupErr);
      return NextResponse.json(
        { success: false, error: "Database lookup failed" },
        { status: 500 }
      );
    }

    // Skip if already completed or currently importing
    if (
      existing?.import_status === "completed" ||
      existing?.import_status === "importing"
    ) {
      console.log(
        `[limitless-webhook] Tournament ${tournamentId} already ${existing.import_status} — skipping`
      );
      return NextResponse.json({
        success: true,
        data: {
          tournamentId,
          queued: false,
          note: `Already ${existing.import_status}`,
        },
      });
    }

    // Upsert a minimal row with queued status — works whether or not the
    // sync cron has created this tournament yet
    const now = new Date().toISOString();
    const dateOnly = now.slice(0, 10); // YYYY-MM-DD

    let queueErr: { message: string } | null = null;
    if (existing) {
      // Row exists — just update queue columns and reset attempts
      const { error } = await supabase
        .schema("limitless")
        .from("tournaments")
        .update({
          import_requested_at: now,
          import_status: "queued",
          import_error: null,
          import_attempts: 0,
        })
        .eq("tournament_id", tournamentId);
      if (error) queueErr = error;
    } else {
      // Row doesn't exist yet — upsert to handle race between webhook and sync cron
      const { error } = await supabase
        .schema("limitless")
        .from("tournaments")
        .upsert(
          {
            tournament_id: tournamentId,
            name: tournamentId, // Placeholder — sync cron will fill real name
            format_id: "unknown", // Placeholder — sync cron will fill real format
            date: dateOnly,
            player_count: 0,
            import_requested_at: now,
            import_status: "queued",
          },
          { onConflict: "tournament_id" }
        );
      if (error) queueErr = error;
    }

    if (queueErr) {
      console.error("[limitless-webhook] Queue error:", queueErr);
      return NextResponse.json(
        { success: false, error: "Failed to queue tournament" },
        { status: 500 }
      );
    }

    console.log(
      `[limitless-webhook] Queued tournament ${tournamentId} for import${!existing ? " (created new row)" : ""}`
    );

    return NextResponse.json({
      success: true,
      data: { tournamentId, queued: true, created: !existing },
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
