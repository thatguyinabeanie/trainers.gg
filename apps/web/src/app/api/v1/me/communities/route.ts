/**
 * GET /api/v1/me/communities
 *
 * Phase 2 Task 9 (Part A, T3j) — the caller's own communities.
 *
 * Returns the list of communities the authenticated user owns or has staff
 * access to. Uses `auth.supabase` (the identity-bound client from
 * `resolveApiAuth`) so RLS evaluates as the caller. This replaces the
 * `useSupabaseQuery(listMyCommunities)` reads in auth-gated dashboard
 * components (`overview-client.tsx`, the 3 community-manage clients).
 *
 * PER-USER (NOT cacheable):
 *   This reads the *caller's own* data — communities they own or staff.
 *   It must NOT be wrapped in `'use cache'` and must NOT use a service-role
 *   or static (anon) client. Each user only ever sees their own communities.
 *
 * CACHE-CONTROL header:
 *   `private, no-store` — per-user data must never be stored by a shared CDN.
 *   Client-side freshness is handled by TanStack Query `staleTime` in consumers.
 */

import { NextResponse, type NextRequest } from "next/server";

import { listMyCommunities } from "@trainers/supabase";
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

/** The communities list shape returned by `listMyCommunities`. */
type MyCommunitiesResult = Awaited<ReturnType<typeof listMyCommunities>>;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ActionResult<MyCommunitiesResult>>> {
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

  // Read the caller's own communities via the identity-bound client (RLS as
  // caller). Pass userId explicitly so listMyCommunities skips the extra
  // auth.getUser() call (we already know the caller's id).
  const communities = await listMyCommunities(auth.supabase, auth.userId);

  return NextResponse.json(
    { success: true, data: communities },
    { headers: { "Cache-Control": CACHE_CONTROL } }
  );
}
