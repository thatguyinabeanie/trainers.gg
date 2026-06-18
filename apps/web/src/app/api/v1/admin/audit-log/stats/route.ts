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

import { getAuditLogStats } from "@trainers/supabase";

import { requireApiAdmin } from "@/lib/api/require-admin";

/** Per-user/admin data: never cache in a shared CDN or the browser. */
const CACHE_CONTROL = "private, no-store";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth + admin check + rate-limit in one call.
  const gate = await requireApiAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { serviceRole } = gate;

  const stats = await getAuditLogStats(serviceRole);

  return NextResponse.json(stats, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
