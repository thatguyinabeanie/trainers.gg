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
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@trainers/supabase/types";

import { createClientReadOnly } from "@/lib/supabase/server";
import { getCachedTournamentStandings } from "@/lib/data/standings-endpoint";

/**
 * Cache-Control for tag-invalidated public data. See file-level JSDoc for the
 * rationale. Long shared-CDN TTL + SWR; on-demand tag bust is the real refresh.
 */
const CACHE_CONTROL = "public, s-maxage=31536000, stale-while-revalidate=86400";

/**
 * Validate the request carries an authenticated identity (web cookie OR mobile
 * Bearer). Returns the userId on success, or `null` for anonymous/invalid.
 *
 * TODO(phase2-task2): swap to shared resolveApiAuth() once Task 2 lands. This
 * inline version is the spike's minimal stand-in.
 */
async function resolveAuthUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    // Mobile path: the token is a Supabase access JWT. Bind it to an anon
    // client and let Supabase validate it via getUser(). Never log the token.
    const token = authHeader.slice("bearer ".length).trim();
    if (!token) return null;

    const supabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  }

  // Web path: cookie session, read-only (a route handler must not mutate it).
  const supabase = await createClientReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

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
  const userId = await resolveAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const standings = await getCachedTournamentStandings(tournamentId);

  return NextResponse.json(standings, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
