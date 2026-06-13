/**
 * GET /api/v1/matches/[matchId]
 *
 * Auth-gated public S-bucket endpoint for a single match's full details
 * (players, scores, round, tournament). Consumed by the match-report dialog
 * (`components/tournament/match-report-dialog.tsx`) after Phase 2 Task 9 (T3o)
 * repoints it off the browser anon client.
 *
 * The match-report dialog only knows the `matchId` (not the tournament id), so
 * this route is keyed on the match. The underlying data is public S-bucket
 * (everything here also renders on the public bracket), so the read is served by
 * a `'use cache'` service-role fetcher — see `getCachedMatchDetails` for the
 * §0.2 rationale. Auth is still required (no anonymous open Data API): anon → 401.
 *
 * Follows the locked route-handler pattern:
 *   route handler (param validation → auth → rate-limit)
 *     → `'use cache'` fetcher (service-role, tag-invalidated on the owning tournament)
 *       → `getMatchDetails` query wrapper.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedMatchDetails } from "@/lib/data/match-details-endpoint";

/**
 * Cache-Control for tag-invalidated public data. Long shared-CDN TTL + SWR;
 * on-demand tag bust (on result report) is the real refresh trigger.
 */
const CACHE_CONTROL =
  "public, s-maxage=31536000, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  // 1. Validate route param FIRST — a non-numeric id is a 404 before any auth/DB work.
  const { matchId: rawMatchId } = await params;
  const matchId = Number(rawMatchId);
  if (Number.isNaN(matchId)) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // 2. Auth required (no anonymous open Data API). Read OUTSIDE the cache scope.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 3. Rate-limit: keyed on userId when authed, request IP as fallback.
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

  // 4. Return the cached fetcher's result. A missing match is a 404.
  const details = await getCachedMatchDetails(matchId);
  if (!details) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json(details, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
