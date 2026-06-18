/**
 * GET /api/v1/admin/audit-log/stats
 *
 * Audit log statistics (24h, 7d, 30d event counts) for the admin Activity tab.
 *
 * ADMIN-ONLY (NOT cacheable):
 *   After `resolveApiAuth` (401 for anon), `isSiteAdmin()` is called — any
 *   authenticated user who is NOT a site admin receives 403.
 *
 * CACHE-CONTROL header:
 *   `private, no-store` — admin data must never be stored by a shared CDN or
 *   the browser cache.
 */

import { NextResponse, type NextRequest } from "next/server";

import { isSiteAdmin, getAuditLogStats } from "@trainers/supabase";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Per-user/admin data: never cache in a shared CDN or the browser. */
const CACHE_CONTROL = "private, no-store";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth required (no anonymous open Data API).
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Admin gate — read-only admin check.
  const serviceRole = createServiceRoleClient();
  const isAdmin = await isSiteAdmin(serviceRole, auth.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const stats = await getAuditLogStats(serviceRole);

  return NextResponse.json(stats, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
