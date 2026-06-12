/**
 * GET /api/v1/me/teams?altId=<number>
 *
 * Phase 2 Task 9 (T3k) — the caller's teams for a specific alt.
 *
 * This is the API-backed replacement for the browser `useSupabaseQuery(getTeamsForAlt)`
 * read in `teams-sub-table.tsx`. Once the S-bucket base-table SELECT grants are
 * revoked from `anon`/`authenticated`, a browser anon-keyed read of `teams` /
 * `team_pokemon` / `pokemon` returns zero rows; moving the read behind this
 * auth-gated route keeps it working (it runs server-side as the resolved caller
 * identity). RLS on `teams` evaluates as the caller, so users only ever see
 * their own teams.
 *
 * PER-USER (NOT cacheable):
 *   This reads the *caller's own* data, so it must NOT be wrapped in `'use cache'`
 *   and must NOT use a service-role / static (anon) client. It reads via
 *   `auth.supabase` — the identity-bound client returned by `resolveApiAuth`
 *   (cookie session for web, Bearer-bound anon client for mobile). RLS evaluates
 *   as the caller, so each user only ever sees their own teams.
 *
 * AUTH (dual-mode, required — no anonymous open Data API):
 *   `resolveApiAuth` accepts a web cookie session OR a mobile
 *   `Authorization: Bearer <supabase access JWT>`. Anonymous → 401.
 *
 * QUERY PARAM:
 *   `altId` (required, numeric) — the alt whose teams to return. Returns 400
 *   if missing or non-numeric.
 *
 * CACHE-CONTROL header:
 *   `private, no-store` — per-user data must never be stored by a shared CDN or
 *   the browser cache. Client-side freshness is handled by TanStack Query
 *   (`staleTime`) in `TeamsSubTable`, not by HTTP caching.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getTeamsForAlt, type AltTeam } from "@trainers/supabase";
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

export async function GET(
  request: NextRequest
): Promise<NextResponse<ActionResult<AltTeam[]>>> {
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

  // Validate required altId query param.
  const altIdParam = request.nextUrl.searchParams.get("altId");
  const altId = Number(altIdParam);
  if (!altIdParam || Number.isNaN(altId) || altId <= 0) {
    return NextResponse.json(
      { success: false, error: "altId is required and must be a positive integer" },
      { status: 400 }
    );
  }

  // Read the caller's teams via the identity-bound client (RLS as caller).
  // NOT a `'use cache'` fetcher and NOT service-role — this is per-user data.
  const teams = await getTeamsForAlt(auth.supabase, altId);

  return NextResponse.json(
    { success: true, data: teams },
    { headers: { "Cache-Control": CACHE_CONTROL } }
  );
}
