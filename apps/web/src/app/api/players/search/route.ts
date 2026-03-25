import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/server";
import { searchPlayers } from "@trainers/supabase/queries";
import { playerSearchParamsSchema } from "@trainers/validators";

/**
 * GET /api/players/search
 *
 * Search and filter the player directory.
 * Public endpoint — no auth required.
 *
 * Query params:
 *   - q: search query (matches username)
 *   - country: ISO 3166-1 alpha-2 country code
 *   - format: tournament format string (e.g., "VGC")
 *   - sort: "tournaments" | "win_rate" | "newest" | "alphabetical"
 *   - page: page number (1-indexed)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Parse and validate query params
  const rawParams = {
    q: searchParams.get("q") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    format: searchParams.get("format") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  };

  const parsed = playerSearchParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { q, country, format, sort, page } = parsed.data;

  try {
    const supabase = createStaticClient();
    const result = await searchPlayers(
      supabase,
      { query: q, country, format, sort },
      page ?? 1
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to search players:", error);
    return NextResponse.json(
      { error: "Failed to search players" },
      { status: 500 }
    );
  }
}
