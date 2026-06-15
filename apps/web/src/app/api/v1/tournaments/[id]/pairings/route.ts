/**
 * GET /api/v1/tournaments/[id]/pairings
 *
 * Public S-bucket route returning the full pairings data set for a tournament:
 * phases, per-phase rounds+matches, first-phase round stats, and unpaired players.
 *
 * Consumers (Part A of the Phase 2 Task 9 migration plan):
 *   - `manage/tournament-pairings.tsx`        (T3n)
 *   - `manage/tournament-pairings-judge.tsx`  (T3n)
 *   - `components/tournament/match-report-dialog.tsx` (T3o)
 *
 * The pattern below is the locked `/api/v1` route handler shape established by
 * `apps/web/src/app/api/v1/tournaments/[id]/standings/route.ts`.
 *
 * AUTH (dual-mode, required even for public data):
 *   The locked constraint is "no anonymous open Data API." A request must carry
 *   either a logged-in web cookie session OR a mobile `Authorization: Bearer
 *   <supabase access JWT>`. Anonymous → 401.
 *   Auth is read OUTSIDE the cache scope — only the service-role read runs inside
 *   `getCachedTournamentPairings`, so a per-viewer session can never poison the
 *   shared cache entry.
 *
 * CACHE-CONTROL header:
 *   `private, no-store`
 *   Response includes staff_notes and private columns; pending column-allowlist fix.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedTournamentPairings } from "@/lib/data/tournament-pairings-endpoint";

/**
 * Cache-Control for routes with private/PII columns pending allowlist fix.
 */
const CACHE_CONTROL = "private, no-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Validate the route param BEFORE any auth/DB work — a non-numeric id is a 404.
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

  // 4. Return the cached fetcher's result — service-role read inside the cache scope.
  const pairings = await getCachedTournamentPairings(tournamentId);

  return NextResponse.json(pairings, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
