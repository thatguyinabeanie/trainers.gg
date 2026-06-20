/**
 * GET /api/v1/matches/[matchId]
 *
 * Auth-gated endpoint for a single match's full details (players, scores, round,
 * tournament). Consumed by the match-report dialog
 * (`components/tournament/match-report-dialog.tsx`) after Phase 2 Task 9 (T3o)
 * repoints it off the browser anon client.
 *
 * The match-report dialog only knows the `matchId` (not the tournament id), so
 * this route is keyed on the match. The read is served by a `'use cache'`
 * service-role fetcher — see `getCachedMatchDetails` for the §0.2 rationale.
 * Auth is required (no anonymous open Data API): anon → 401.
 *
 * **Cache-Control**: `private, no-store` — the response is auth-gated and
 * per-user in the sense that it is tied to a specific match that a user has
 * standing to view. The `tournament_matches` select is now an explicit allowlist
 * (no wildcard): `staff_notes` and all other staff/internal columns are excluded.
 * The player alt join is narrowed to `id, username, avatar_url` — no PII fields
 * from `alts` appear in the response.
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
 * `private, no-store` — auth-gated; response not for CDN caching.
 * `staff_notes` and all internal columns are excluded from the query, but
 * `private, no-store` is the correct posture for an auth-required route.
 */
const CACHE_CONTROL = "private, no-store";

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
