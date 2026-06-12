/**
 * GET /api/v1/communities/[slug]
 *
 * Returns the public detail for a single community by its URL slug.
 *
 * AUTH: Dual-mode (Bearer mobile token OR web cookie session). Anonymous → 401.
 * The authenticated check runs OUTSIDE the cache scope; the cached fetcher uses
 * `createStaticClient()` (cookie-less) so per-viewer sessions never pollute the
 * shared cache entry.
 *
 * CACHE-CONTROL: `private, no-store`
 * Auth is required on every request, so CDN caching is unsafe — a CDN could
 * serve an authenticated 200 to an anonymous caller. Server-side `'use cache'`
 * on the underlying fetcher handles shared caching; the HTTP response must not
 * be stored by any intermediate cache.
 *
 * RETURNS: `null` when the community does not exist → caller receives `null` JSON
 * (the route itself stays 200 so clients can distinguish "not found" from errors).
 * The client hook treats a `null` response as a "community not found" state.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { getCachedCommunityBySlug } from "@/lib/data/communities-endpoints";

/**
 * Cache-Control for auth-gated routes. CDN must not cache authenticated
 * responses — a cached 200 could be served to anonymous callers.
 * Server-side `'use cache'` on the underlying fetcher handles shared caching.
 */
const CACHE_CONTROL = "private, no-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Validate slug — must be a non-empty string (Next.js already enforces this
  // via the segment pattern, but we guard explicitly for clarity).
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Auth required — no anonymous open Data API.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit per authenticated user.
  const rateLimit = await enforceRateLimit({ identifier: auth.userId });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(
              1,
              Math.ceil(
                (rateLimit.resetAt.getTime() - Date.now()) / 1000
              )
            )
          ),
        },
      }
    );
  }

  const community = await getCachedCommunityBySlug(slug);

  return NextResponse.json(community, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
