/**
 * GET /api/v1/tournaments/[id]/player-stats
 *
 * Public S-bucket endpoint for per-tournament player stats (standings/record data).
 * Follows the locked route-handler pattern established by the standings gate:
 *
 *   route handler (param validation → auth → rate-limit)
 *     → `'use cache'` fetcher (service-role, tag-invalidated)
 *       → `getTournamentPlayerStats` query wrapper
 *
 * AUTH (dual-mode, required even for public data):
 *   No anonymous open Data API. Requests must carry either a logged-in web
 *   cookie session OR a mobile `Authorization: Bearer <supabase access JWT>`.
 *   Anonymous → 401.
 *   - Bearer first (mobile): anon Supabase client bound to the token,
 *     validated via `auth.getUser()`. Token is never logged.
 *   - Cookie fallback (web): `createClientReadOnly()` + `auth.getUser()`.
 *   Auth is read OUTSIDE the cache scope — the cached fetcher runs with
 *   service-role (constant identity) so no per-user session can poison the
 *   shared cache entry.
 *
 * CACHE-CONTROL header:
 *   `public, s-maxage=31536000, stale-while-revalidate=86400`
 *   Player stats are tag-invalidated (busted by
 *   `revalidateTag(CacheTags.tournament(id), 'max')` on any round/standings
 *   change), so the CDN entry never needs a short time-based TTL.
 *
 * CONSUMERS (Phase 2 Task 9 T3c):
 *   `manage/tournament-standings.tsx`, `manage/tournament-overview.tsx`,
 *   `create-tournament-client.tsx` — all auth-gated client components that
 *   previously read `tournament_player_stats` + `alts` directly via the anon
 *   key. After Step 4 revokes anon SELECT on those tables, this route is the
 *   correct access path.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedTournamentPlayerStats } from "@/lib/data/tournament-player-stats-endpoint";

/**
 * Cache-Control for tag-invalidated public data. Long shared-CDN TTL + SWR;
 * on-demand tag bust is the real refresh trigger.
 */
const CACHE_CONTROL =
  "public, s-maxage=31536000, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Validate route param FIRST — a non-numeric id is a 404 before any auth/DB work.
  const { id } = await params;
  const tournamentId = Number(id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
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
      {
        status: 429,
        headers: { "Retry-After": resetAt.toUTCString() },
      }
    );
  }

  // 4. Return the cached fetcher's result.
  const stats = await getCachedTournamentPlayerStats(tournamentId);

  return NextResponse.json(stats, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
