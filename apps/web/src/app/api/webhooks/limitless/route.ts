/**
 * Limitless Webhook Route
 *
 * Receives POST from Limitless when a tournament ends.
 * Validates the shared secret, then delegates to the limitless-import
 * edge function for the actual import work.
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

    // Delegate to the limitless-import edge function via service role client.
    // The auto-import action fetches tournament details, determines format,
    // and imports if the format is known.
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.functions.invoke(
      "limitless-import",
      {
        body: { action: "auto-import", tournamentId },
      }
    );

    if (error) {
      console.error("[limitless-webhook] Edge function error:", error);
      return NextResponse.json(
        { success: false, error: "Import failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
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
