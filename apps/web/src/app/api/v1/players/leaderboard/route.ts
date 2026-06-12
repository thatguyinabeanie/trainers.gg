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

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedLeaderboard } from "@/lib/data/players-endpoints";

/** Cache-Control for tag-invalidated public leaderboard data. */
const CACHE_CONTROL =
  "public, s-maxage=31536000, stale-while-revalidate=86400";

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
        headers: { "Retry-After": rl.resetAt.toUTCString() },
      }
    );
  }

  // Parse limit param.
  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = rawLimit ? Number(rawLimit) : 5;
  if (!Number.isFinite(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json(
      { error: `limit must be between 1 and ${MAX_LIMIT}` },
      { status: 400 }
    );
  }

  const entries = await getCachedLeaderboard(limit);

  return NextResponse.json(entries, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
