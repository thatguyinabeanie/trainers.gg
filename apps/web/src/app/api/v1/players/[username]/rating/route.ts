/**
 * GET /api/v1/players/[username]/rating?altId=1&format=overall
 *
 * Phase 2 Task 7 — player ELO rating S-bucket read endpoint.
 *
 * Returns the ELO rating (with global rank) for a specific alt.  The `username`
 * path segment is included for semantic URL clarity and future per-player rate
 * limiting; the actual lookup uses `altId` (required query param).
 *
 * Returns:
 *   - 200 + rating object when the alt has a rating for the requested format
 *   - 200 + `null` when no rating exists yet (alt has never played a rated match)
 *   - 400 when `altId` is missing or non-numeric
 *   - 401 for anonymous requests
 *   - 429 when rate limit is exceeded
 *
 * AUTH: required. Bearer → cookie → 401.
 * RATE LIMIT: 120 req / userId / min → 429.
 *
 * CACHE-CONTROL: long s-maxage with SWR; tag-invalidated by
 *   `invalidatePlayerRankingCaches()` on rating changes.
 *
 * Query params:
 *   - altId: numeric alt ID (required)
 *   - format: rating format string (optional, default "overall")
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedPlayerRating } from "@/lib/data/players-endpoints";

/** Cache-Control for tag-invalidated public rating data. */
const CACHE_CONTROL =
  "public, s-maxage=31536000, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params: _params }: { params: Promise<{ username: string }> }
) {
  // Auth — required even for public data.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit.
  const identifier = auth.userId ?? extractRequestIp(request);
  const rl = await enforceRateLimit({
    identifier,
    limit: DEFAULT_API_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": rl.resetAt.toUTCString() },
      }
    );
  }

  // Validate altId.
  const rawAltId = request.nextUrl.searchParams.get("altId");
  if (!rawAltId) {
    return NextResponse.json(
      { error: "Missing altId parameter" },
      { status: 400 }
    );
  }
  const altId = Number(rawAltId);
  if (Number.isNaN(altId)) {
    return NextResponse.json(
      { error: "Invalid altId parameter" },
      { status: 400 }
    );
  }

  const format =
    request.nextUrl.searchParams.get("format") ?? "overall";

  const rating = await getCachedPlayerRating(altId, format);

  return NextResponse.json(rating, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
