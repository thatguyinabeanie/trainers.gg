/**
 * GET /api/v1/admin/communities
 *
 * Phase 2 Task 9 (T3h) — admin-only paginated community + request search.
 *
 * Backs `admin/communities/page.tsx`, which previously read from the `communities`
 * and `community_requests` tables directly via `useSupabaseQuery` (anon-keyed
 * browser client). Once the Phase 2 Step-4 `REVOKE SELECT ... FROM anon, authenticated`
 * lands on S-bucket base tables, those browser reads return zero rows. This route
 * moves the reads server-side (service-role client) so they survive the revoke.
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
 *
 * QUERY PARAMS:
 *   type     — "communities" | "requests" (default: "communities")
 *   search   — partial name/slug match
 *   status   — filter by status (community or request status enum)
 *   limit    — page size (default: 25, max: 100)
 *   offset   — pagination offset (default: 0)
 */

import { NextResponse, type NextRequest } from "next/server";

import { listCommunitiesAdmin, listOrgRequestsAdmin } from "@trainers/supabase";

import { requireApiAdmin } from "@/lib/api/require-admin";

/** Admin-only: must never be stored or replayed by a shared CDN or browser cache. */
const CACHE_CONTROL = "private, no-store";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

/** Community list row as returned by `listCommunitiesAdmin`. */
export type AdminCommunityRow = Awaited<
  ReturnType<typeof listCommunitiesAdmin>
>["data"][number];

/** Community request row as returned by `listOrgRequestsAdmin`. */
export type AdminCommunityRequestRow = Awaited<
  ReturnType<typeof listOrgRequestsAdmin>
>["data"][number];

/** The paginated response envelope returned by this route. */
export interface AdminCommunitiesResponse {
  data: AdminCommunityRow[] | AdminCommunityRequestRow[];
  count: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth + admin check + rate-limit in one call.
  const gate = await requireApiAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { serviceRole } = gate;

  // Parse query params.
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "communities";
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);
  const limit = Number.isNaN(rawLimit)
    ? DEFAULT_PAGE_SIZE
    : Math.min(rawLimit, MAX_PAGE_SIZE);

  const rawOffset = Number(searchParams.get("offset") ?? 0);
  const offset = Number.isNaN(rawOffset) ? 0 : Math.max(0, rawOffset);

  // Fetch via service-role (survives the Phase 2 anon-revoke on base tables).
  if (type === "requests") {
    const result = await listOrgRequestsAdmin(serviceRole, {
      search,
      status: status as NonNullable<
        Parameters<typeof listOrgRequestsAdmin>[1]
      >["status"],
      limit,
      offset,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  // Default: communities
  const result = await listCommunitiesAdmin(serviceRole, {
    search,
    status: status as NonNullable<
      Parameters<typeof listCommunitiesAdmin>[1]
    >["status"],
    limit,
    offset,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
