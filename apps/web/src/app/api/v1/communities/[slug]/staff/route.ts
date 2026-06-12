/**
 * GET /api/v1/communities/[slug]/staff
 *
 * Returns the staff roster (with group/role assignments) for a community.
 *
 * The route needs the community's numeric ID to fetch staff, but the URL only
 * carries the slug. We resolve: slug → community (cached) → id. The community
 * lookup is public and cached; the staff fetch is NOT.
 *
 * SECURITY — the staff roster embeds `user.email` (PII). This route therefore:
 *   1. authenticates the caller (Bearer OR cookie; anonymous → 401),
 *   2. rate-limits (→ 429),
 *   3. verifies the caller manages this community (`canManageCommunity` → 403),
 *   4. reads staff with the caller's REQUEST-SCOPED, RLS-bound client
 *      (`auth.supabase`) — never a shared/service-role cache.
 *
 * CACHE-CONTROL: `private, no-store` — the PII response must never be stored or
 * replayed by a shared CDN/proxy. A CodeRabbit + security review flagged the
 * previous `public, s-maxage=…` header (plus a `'use cache'` fetcher) as a leak.
 */

import { NextResponse, type NextRequest } from "next/server";

import { canManageCommunity } from "@trainers/supabase";

import { resolveApiAuth } from "@/lib/api/auth";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import {
  getCachedCommunityBySlug,
  getCommunityStaff,
} from "@/lib/data/communities-endpoints";

/** Cache-Control for per-caller PII — never store or replay in a shared cache. */
const CACHE_CONTROL = "private, no-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({ identifier: auth.userId });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          // Clamp to ≥1s — clock drift can make the diff 0 or negative, and a
          // `Retry-After: 0` tells clients to retry immediately (defeats the limit).
          "Retry-After": String(
            Math.max(
              1,
              Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)
            )
          ),
        },
      }
    );
  }

  // Resolve slug → community (cached) to get the numeric ID.
  const community = await getCachedCommunityBySlug(slug);
  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // The staff roster includes member emails (PII). Only owners/staff of THIS
  // community may see it — gate with the caller's request-scoped, RLS-bound client.
  const canManage = await canManageCommunity(
    auth.supabase,
    community.id,
    auth.userId
  );
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staff = await getCommunityStaff(auth.supabase, community.id);

  return NextResponse.json(staff, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
