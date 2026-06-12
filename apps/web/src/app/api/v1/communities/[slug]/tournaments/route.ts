/**
 * GET /api/v1/communities/[slug]/tournaments
 *
 * Returns a paginated list of tournaments for a community.
 *
 * QUERY PARAMS:
 *   status  — one of "draft" | "upcoming" | "active" | "completed" | "cancelled"
 *             (omit for all tournaments)
 *   limit   — max results per page (default: 50, max: 100)
 *   offset  — pagination offset (default: 0)
 *
 * AUTH: Dual-mode (Bearer OR cookie). Anonymous → 401.
 * CACHE-CONTROL: `public, s-maxage=31536000, stale-while-revalidate=86400`
 * Tag-invalidated via `invalidateCommunityPageCaches(slug, id)` on tournament
 * status changes, and via `invalidateTournamentListCaches` on registration changes.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import {
  getCachedCommunityBySlug,
  getCachedCommunityTournaments,
  type CommunityTournamentStatus,
} from "@/lib/data/communities-endpoints";

/** Cache-Control for tag-invalidated public data. */
const CACHE_CONTROL = "public, s-maxage=31536000, stale-while-revalidate=86400";

/** Valid tournament status values accepted as a query param. */
const VALID_STATUSES: ReadonlySet<string> = new Set([
  "draft",
  "upcoming",
  "active",
  "completed",
  "cancelled",
]);

/** Maximum page size the API will honour (prevents unbounded fetches). */
const MAX_LIMIT = 100;

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

  // Parse query params with defaults and bounds.
  const searchParams = request.nextUrl.searchParams;
  const statusParam = searchParams.get("status");
  const status: CommunityTournamentStatus | undefined =
    statusParam && VALID_STATUSES.has(statusParam)
      ? (statusParam as CommunityTournamentStatus)
      : undefined;

  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isNaN(limitParam)
    ? 50
    : Math.min(Math.max(1, limitParam), MAX_LIMIT);

  const offsetParam = Number(searchParams.get("offset") ?? "0");
  const offset = Number.isNaN(offsetParam) ? 0 : Math.max(0, offsetParam);

  // Resolve slug → community (cached) to get the numeric ID.
  const community = await getCachedCommunityBySlug(slug);
  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const result = await getCachedCommunityTournaments(
    community.id,
    slug,
    status,
    limit,
    offset
  );

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
