/**
 * GET /api/v1/players/leaderboard
 *
 * Phase 2 Task 7 — player leaderboard S-bucket read endpoint.
 *
 * Returns the top-N players by ELO rating (default 5, max 50) served from a
 * `'use cache'`-wrapped fetcher (`getCachedLeaderboard`).
 *
 * AUTH: required (no anonymous open Data API). Bearer → cookie → 401.
 * RATE LIMIT: 120 req / userId / min → 429.
 *
 * CACHE-CONTROL: long s-maxage with SWR; tag-invalidated by
 *   `invalidatePlayerRankingCaches()` on tournament completion or rating changes.
 *
 * Query params:
 *   - limit: number of entries (optional, default 5, max 50)
 */

import { NextResponse, type NextRequest } from "next/server";

import { positiveIntSchema } from "@trainers/validators";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedLeaderboard } from "@/lib/data/players-endpoints";

/**
 * Cache-Control: private, no-store — auth-gated routes must not be cached by
 * shared/CDN caches; a "public" cache-control would allow a CDN to serve an
 * authed 200 response to an anonymous caller.
 */
const CACHE_CONTROL = "private, no-store";

const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
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
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  // Validate limit — must be a positive integer ≤ MAX_LIMIT (rejects floats,
  // zero, negatives, and non-numeric strings). Default to 5 when omitted.
  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limitResult = positiveIntSchema
    .max(MAX_LIMIT)
    .safeParse(rawLimit ?? "5");
  if (!limitResult.success) {
    return NextResponse.json(
      { error: `limit must be between 1 and ${MAX_LIMIT}` },
      { status: 400 }
    );
  }
  const limit = limitResult.data;

  const entries = await getCachedLeaderboard(limit);

  return NextResponse.json(entries, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
