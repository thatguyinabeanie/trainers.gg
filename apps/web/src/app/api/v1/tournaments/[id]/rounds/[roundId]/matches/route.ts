/**
 * GET /api/v1/tournaments/[id]/rounds/[roundId]/matches
 *
 * Returns all matches for a round (used by the judge pairings view).
 *
 * AUTH: Bearer (mobile) or web cookie. Anonymous → 401.
 * CACHE: Tag-invalidated via CacheTags.tournament(id); CDN long TTL.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedRoundMatches } from "@/lib/data/tournaments-endpoints";

const CACHE_CONTROL =
  "public, s-maxage=31536000, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  const { id, roundId } = await params;
  const tournamentId = Number(id);
  const roundIdNum = Number(roundId);
  if (Number.isNaN(tournamentId) || Number.isNaN(roundIdNum)) {
    return NextResponse.json(
      { error: "Tournament or round not found" },
      { status: 404 }
    );
  }

  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const identifier = auth.userId ?? extractRequestIp(request);
  const { allowed, resetAt } = await enforceRateLimit({
    identifier,
    limit: DEFAULT_API_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": resetAt.toUTCString() } }
    );
  }

  const matches = await getCachedRoundMatches(roundIdNum, tournamentId);

  return NextResponse.json(
    { success: true, data: matches },
    { headers: { "Cache-Control": CACHE_CONTROL } }
  );
}
