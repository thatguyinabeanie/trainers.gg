import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getPlayerLifetimeStats } from "@trainers/supabase/queries";

/**
 * GET /api/players/[altId]/stats
 *
 * Returns aggregated lifetime stats for the given alt.
 * Public endpoint — no auth required.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ altId: string }> }
) {
  const { altId } = await params;
  const id = Number(altId);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid alt ID" }, { status: 400 });
  }

  try {
    const supabase = createStaticClient();
    const stats = await getPlayerLifetimeStats(supabase, [id]);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch player stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch player stats" },
      { status: 500 }
    );
  }
}
