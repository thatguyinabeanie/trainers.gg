import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getPlayerLifetimeStats } from "@trainers/supabase/queries";

/**
 * GET /api/players/stats?altIds=1,2,3
 *
 * Returns aggregated lifetime stats across all provided alt IDs.
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
    const supabase = createStaticClient();
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
