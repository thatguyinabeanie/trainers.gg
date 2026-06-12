/**
 * GET /api/v1/communities/[slug]/staff
 *
 * Returns the staff roster (with group/role assignments) for a community.
 *
 * The route needs the community's numeric ID to call `listCommunityStaffWithRoles`,
 * but the URL only carries the slug. We resolve: slug → community (cached) → id.
 * This two-step is cheap because the community fetch is itself cached.
 *
 * AUTH: Dual-mode (Bearer OR cookie). Anonymous → 401.
 * CACHE-CONTROL: `public, s-maxage=31536000, stale-while-revalidate=86400`
 * Tag-invalidated via `invalidateCommunityPageCaches(slug, id)` on staff changes.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import {
  getCachedCommunityBySlug,
  getCachedCommunityStaff,
} from "@/lib/data/communities-endpoints";

/** Cache-Control for tag-invalidated public data. */
const CACHE_CONTROL = "public, s-maxage=31536000, stale-while-revalidate=86400";

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
          "Retry-After": String(
            Math.ceil(
              (rateLimit.resetAt.getTime() - Date.now()) / 1000
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

  const staff = await getCachedCommunityStaff(community.id, slug);

  return NextResponse.json(staff, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
