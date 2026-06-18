/**
 * Admin API gate — shared auth + admin check + rate-limit for all admin routes.
 *
 * Every `GET /api/v1/admin/*` route repeats the same ~30-line sequence:
 *   1. `resolveApiAuth` — 401 for anon / invalid sessions
 *   2. `createServiceRoleClient` + `isSiteAdmin` — 403 for non-admins
 *   3. `enforceRateLimit` — 429 when the window is exhausted
 *
 * This helper consolidates that sequence so each route only handles its own
 * business logic. On failure it returns the `NextResponse` directly so the
 * caller can return-early with a single `instanceof` check. On success it
 * returns `{ serviceRole, userId }` so the route keeps the service-role client
 * (needed for downstream queries) without re-creating it.
 *
 * Status codes and error body shapes are preserved verbatim from the canonical
 * `users/route.ts` implementation (the first route to define this pattern).
 */

import { NextResponse, type NextRequest } from "next/server";

import { isSiteAdmin } from "@trainers/supabase";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ServiceRoleClient } from "@trainers/supabase";

// =============================================================================
// Types
// =============================================================================

/** Successful gate result: service-role client + authenticated user ID. */
export interface AdminGateSuccess {
  serviceRole: ServiceRoleClient;
  userId: string;
}

// =============================================================================
// Gate helper
// =============================================================================

/**
 * Run the admin API gate for an incoming request.
 *
 * Returns a `NextResponse` (401 / 403 / 429) on failure so the caller can
 * return it immediately:
 *
 * ```ts
 * const gate = await requireApiAdmin(request);
 * if (gate instanceof NextResponse) return gate;
 * const { serviceRole, userId } = gate;
 * ```
 *
 * On success returns `{ serviceRole, userId }` — the service-role client is
 * created once here (for the `isSiteAdmin` check) and reused by the caller for
 * downstream queries, avoiding a redundant `createServiceRoleClient()` call.
 */
export async function requireApiAdmin(
  request: NextRequest
): Promise<AdminGateSuccess | NextResponse> {
  // 1. Auth — no anonymous open Data API.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Admin gate — read-only admin check (not the sudo/mutation gate).
  //    Service-role client so the user_roles lookup bypasses RLS.
  const serviceRole = createServiceRoleClient();
  const isAdmin = await isSiteAdmin(serviceRole, auth.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Rate-limit — keyed on userId when authed, request IP as fallback.
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

  return { serviceRole, userId: auth.userId };
}
