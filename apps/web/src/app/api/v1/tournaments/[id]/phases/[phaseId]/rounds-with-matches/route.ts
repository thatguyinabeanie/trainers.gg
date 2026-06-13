/**
 * GET /api/v1/tournaments/[id]/phases/[phaseId]/rounds-with-matches
 *
 * Returns rounds with full match detail (player joins) for a phase.
 * Used by the public bracket/pairing view.
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
import { getCachedPhaseRoundsWithMatches } from "@/lib/data/tournaments-endpoints";

const CACHE_CONTROL =
  "public, s-maxage=31536000, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  const { id, phaseId } = await params;
  const tournamentId = Number(id);
  const phaseIdNum = Number(phaseId);
  if (Number.isNaN(tournamentId) || Number.isNaN(phaseIdNum)) {
    return NextResponse.json(
      { error: "Tournament or phase not found" },
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

  const rounds = await getCachedPhaseRoundsWithMatches(
    phaseIdNum,
    tournamentId
  );

  return NextResponse.json(
    { success: true, data: rounds },
    { headers: { "Cache-Control": CACHE_CONTROL } }
  );
}
