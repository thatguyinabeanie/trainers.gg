/**
 * GET /api/v1/me/tournament-history
 *
 * Phase 2 Task 9 (Part A, T3j) — the caller's own tournament history.
 *
 * Returns the authenticated user's full tournament history (registrations
 * across all their alts, with standings, team Pokémon, etc.). Uses
 * `auth.supabase` (the identity-bound client from `resolveApiAuth`) so RLS
 * evaluates as the caller. This replaces the `useSupabaseQuery` reads in
 * `overview-client.tsx`, `tournaments-client.tsx`, and `stats-client.tsx`.
 *
 * PER-USER (NOT cacheable):
 *   This reads the *caller's own* data. It must NOT be wrapped in `'use cache'`
 *   and must NOT use a service-role or static (anon) client. The underlying
 *   `getUserTournamentHistory` calls `supabase.auth.getUser()` internally, so
 *   passing the identity-bound client ensures it resolves the correct user.
 *
 * CACHE-CONTROL header:
 *   `private, no-store` — per-user data must never be stored by a shared CDN.
 *   Client-side freshness is handled by TanStack Query `staleTime` in consumers.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getUserTournamentHistory } from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";

/** Per-user data: never cache in a shared CDN or the browser. */
const CACHE_CONTROL = "private, no-store";

/** The tournament history shape returned by `getUserTournamentHistory`. */
type TournamentHistoryResult = Awaited<
  ReturnType<typeof getUserTournamentHistory>
>;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ActionResult<TournamentHistoryResult>>> {
  // Auth required (no anonymous open Data API).
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
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
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": resetAt.toUTCString() },
      }
    );
  }

  // Read the caller's own tournament history via the identity-bound client.
  // `getUserTournamentHistory` calls `supabase.auth.getUser()` internally,
  // which resolves to the caller's identity through the bound client.
  // NOT a `'use cache'` fetcher and NOT service-role — this is per-user data.
  const history = await getUserTournamentHistory(auth.supabase);

  return NextResponse.json(
    { success: true, data: history },
    { headers: { "Cache-Control": CACHE_CONTROL } }
  );
}
