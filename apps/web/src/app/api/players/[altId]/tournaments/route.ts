import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getPlayerTournamentHistory } from "@trainers/supabase/queries";

/**
 * GET /api/players/[altId]/tournaments
 *
 * Returns the tournament history for the given alt.
 * Only includes completed tournaments with standings.
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
    const history = await getPlayerTournamentHistory(supabase, [id]);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch tournament history:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournament history" },
      { status: 500 }
    );
  }
}
