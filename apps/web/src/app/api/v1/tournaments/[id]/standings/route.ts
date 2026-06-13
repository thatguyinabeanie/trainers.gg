/**
 * GET /api/v1/tournaments/[id]/standings
 *
 * Phase 2 caching-spike endpoint (the GATE). Proves the full S-bucket
 * route-handler pattern on ONE endpoint before any mass migration:
 *
 *   route handler (auth + validation)  →  `'use cache'` fetcher  →  query wrapper
 *
 * The `/api/v1/…` prefix is the locked home for the versioned public API; the
 * S-bucket reads start here so the namespace exists from day one.
 *
 * AUTH (dual-mode, required even for public data):
 *   The locked constraint is "no anonymous open Data API." A request must carry
 *   either a logged-in web cookie session OR a mobile `Authorization: Bearer
 *   <supabase access JWT>`. Anonymous → 401.
 *   - Bearer first (mobile sends `session.access_token`): we build an anon
 *     Supabase client bound to that token and call `auth.getUser()` to validate
 *     it. We never log the token value.
 *   - Cookie fallback (web): `createClientReadOnly()` + `auth.getUser()`.
 *   The auth read is kept OUTSIDE the cache scope — only the public, cookie-less
 *   `createStaticClient()` read runs inside `getCachedTournamentStandings`, so a
 *   per-viewer session can never poison the shared cache entry.
 *
 * CACHE-CONTROL header:
 *   `public, s-maxage=31536000, stale-while-revalidate=86400`
 *   Standings are tag-invalidated (busted by `revalidateTag(CacheTags.tournament(id), 'max')`
 *   on any registration/round/standings change), so a CDN entry never needs a
 *   short time-based TTL — the tag bust is the source of truth. A long `s-maxage`
 *   (1y) lets Vercel's CDN serve cached responses indefinitely until a tag bust
 *   purges them; `stale-while-revalidate=86400` lets the edge serve a slightly
 *   stale copy for up to a day while it refreshes in the background. We omit
 *   `max-age` so browsers don't cache privately past the session (the response
 *   is gated behind auth) while the shared CDN (`s-maxage`) does the heavy
 *   lifting. This mirrors how `revalidateTag(tag, 'max')` busts a CDN-cached
 *   handler response.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import { enforceRateLimit, extractRequestIp, DEFAULT_API_LIMIT, DEFAULT_WINDOW_MS } from "@/lib/api/rate-limit";
import { getCachedTournamentStandings } from "@/lib/data/standings-endpoint";

/**
 * Cache-Control for tag-invalidated public data. See file-level JSDoc for the
 * rationale. Long shared-CDN TTL + SWR; on-demand tag bust is the real refresh.
 */
const CACHE_CONTROL = "public, s-maxage=31536000, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate the route param BEFORE any auth/DB work — a non-numeric id is a 404.
  const { id } = await params;
  const tournamentId = Number(id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  // Auth required (no anonymous open Data API). Read OUTSIDE the cache scope.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate-limit: keyed on userId when authed, request IP as fallback.
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

  const standings = await getCachedTournamentStandings(tournamentId);

  return NextResponse.json(standings, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
