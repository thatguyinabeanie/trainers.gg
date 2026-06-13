/**
 * GET /api/v1/admin/coaches
 *
 * Phase 2 Task 9 (T3i) — admin-only coach list endpoint.
 *
 * Backs the `CoachesManager` component, which previously read from the `users`
 * table directly via `useSupabaseQuery` (anon-keyed browser client). Once the
 * Phase 2 Step-4 `REVOKE SELECT ... FROM anon, authenticated` lands on S-bucket
 * base tables, that browser read returns zero rows. This route moves the read
 * server-side (service-role client) so it survives the revoke.
 *
 * AUTH (dual-mode, required):
 *   1. `resolveApiAuth` — Bearer first (mobile), cookie fallback (web). Anonymous → 401.
 *   2. `isSiteAdmin` — the caller must be a site admin. Not an admin → 403.
 *
 * RATE LIMIT: 120 req / userId / minute → 429 with Retry-After.
 *
 * CACHE-CONTROL: `private, no-store` — admin-only data must never be stored or
 * replayed by a shared CDN/proxy. The auth+admin gate is what matters, not data
 * sensitivity.
 */

import { NextResponse, type NextRequest } from "next/server";

import { listCoaches, isSiteAdmin } from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Admin-only: must never be stored or replayed by a shared CDN or browser cache. */
const CACHE_CONTROL = "private, no-store";

/** A single coach row as returned by `listCoaches`. */
export type CoachRow = Awaited<ReturnType<typeof listCoaches>>[number];

export async function GET(
  request: NextRequest
): Promise<NextResponse<ActionResult<CoachRow[]>>> {
  // 1. Authenticate — no anonymous open Data API.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  // 2. Admin check — this endpoint is site-admin–only.
  //    Use a service-role client so the user_roles lookup bypasses RLS.
  const serviceRole = createServiceRoleClient();
  const isAdmin = await isSiteAdmin(serviceRole, auth.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  // 3. Rate-limit — keyed on userId.
  const { allowed, resetAt } = await enforceRateLimit({
    identifier: auth.userId,
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

  // 4. Fetch coaches via service-role (survives the Phase 2 anon-revoke on `users`).
  const coaches = await listCoaches(serviceRole);

  return NextResponse.json(
    { success: true, data: coaches },
    { headers: { "Cache-Control": CACHE_CONTROL } }
  );
}
