import { NextResponse } from "next/server";
// Service-role client: reads alts/player_ratings/tournament_standings (revoke-set tables).
// Anon SELECT on these tables is revoked in the Phase 2 Step-4 migration;
// service-role bypasses that grant so public-facing player stat pages still work.
import { createServiceRoleClient } from "@/lib/supabase/server";
import { enforceRateLimit, extractRequestIp } from "@/lib/api/rate-limit";
import { getPlayerLifetimeStats } from "@trainers/supabase/queries";

/**
 * GET /api/players/stats?altIds=1,2,3
 *
 * Returns aggregated lifetime stats across all provided alt IDs.
 * Public endpoint — no auth required.
 */
export async function GET(request: Request) {
  const ip = extractRequestIp(request);
  const { allowed, resetAt } = await enforceRateLimit({ identifier: ip });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers: { "Retry-After": resetAt.toUTCString() } }
    );
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("altIds");

  if (!raw) {
    return NextResponse.json(
      { error: "Missing altIds parameter" },
      { status: 400 }
    );
  }

  const altIds = raw.split(",").map(Number);

  if (altIds.length === 0 || altIds.some((id) => Number.isNaN(id))) {
    return NextResponse.json(
      { error: "Invalid altIds parameter" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const stats = await getPlayerLifetimeStats(supabase, altIds);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch player stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch player stats" },
      { status: 500 }
    );
  }
}
