import { NextResponse } from "next/server";
// Service-role client: reads tournaments/tournament_standings/alts (revoke-set tables).
// Anon SELECT on these tables is revoked in the Phase 2 Step-4 migration;
// service-role bypasses that grant so public-facing player tournament endpoints still work.
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPlayerTournamentHistory } from "@trainers/supabase/queries";

/**
 * GET /api/players/tournaments?altIds=1,2,3
 *
 * Returns tournament history across all provided alt IDs.
 * Only includes completed tournaments with standings.
 * Public endpoint — no auth required.
 */
export async function GET(request: Request) {
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
    const history = await getPlayerTournamentHistory(supabase, altIds);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch tournament history:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournament history" },
      { status: 500 }
    );
  }
}
