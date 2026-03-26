import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { getPlayerRating } from "@trainers/supabase/queries";

/**
 * GET /api/players/rating?altId=1&format=overall
 *
 * Returns the ELO rating for a specific alt, including global rank.
 * Defaults to the 'overall' format if not specified.
 * Returns null with status 200 if the player has no rating yet.
 * Public endpoint — no auth required.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("altId");
  const format = searchParams.get("format") ?? "overall";

  if (!raw) {
    return NextResponse.json(
      { error: "Missing altId parameter" },
      { status: 400 }
    );
  }

  const altId = Number(raw);

  if (Number.isNaN(altId)) {
    return NextResponse.json(
      { error: "Invalid altId parameter" },
      { status: 400 }
    );
  }

  try {
    const supabase = createStaticClient();
    const rating = await getPlayerRating(supabase, altId, format);
    return NextResponse.json(rating);
  } catch (error) {
    console.error("Failed to fetch player rating:", error);
    return NextResponse.json(
      { error: "Failed to fetch player rating" },
      { status: 500 }
    );
  }
}
