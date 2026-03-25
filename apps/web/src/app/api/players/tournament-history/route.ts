import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getPlayerTournamentHistoryFull } from "@trainers/supabase/queries";
import { playerTournamentHistoryParamsSchema } from "@trainers/validators";

/**
 * GET /api/players/tournament-history
 *
 * Fetch paginated tournament history for a player's alts.
 * Public endpoint — no auth required.
 *
 * Query params:
 *   - altIds: comma-separated alt IDs (required)
 *   - format: tournament format filter (optional)
 *   - year: year filter (optional)
 *   - status: tournament status filter (optional)
 *   - page: page number, 1-indexed (optional, default 1)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawParams = {
    altIds: searchParams.get("altIds") ?? "",
    format: searchParams.get("format") ?? undefined,
    year: searchParams.get("year") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  };

  const parsed = playerTournamentHistoryParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { altIds, format, year, status, page } = parsed.data;

  try {
    const supabase = createStaticClient();
    const result = await getPlayerTournamentHistoryFull(
      supabase,
      altIds,
      { format, year, status },
      page ?? 1
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch tournament history:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournament history" },
      { status: 500 }
    );
  }
}
