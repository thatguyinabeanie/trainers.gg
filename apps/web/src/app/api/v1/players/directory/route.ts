/**
 * GET /api/v1/players/directory
 *
 * Phase 2 Task 7 — player S-bucket read endpoint.
 *
 * Returns a paginated, optionally filtered list of public player profiles,
 * served from a `'use cache'`-wrapped fetcher backed by `createStaticClient()`.
 *
 * AUTH: required (no anonymous open Data API — see Task 1 spike rationale).
 *   Bearer (mobile) → cookie (web) via `resolveApiAuth`. Anonymous → 401.
 *
 * RATE LIMIT: 120 req / userId-or-IP / minute via `enforceRateLimit`. → 429.
 *
 * CACHE-CONTROL: long s-maxage with SWR; tag-invalidated by
 *   `invalidatePlayerDirectoryCaches(username)` when players join or rename.
 *
 * Query params:
 *   - q: search query (optional, min 0 chars)
 *   - country: ISO 3166-1 alpha-2 code (optional)
 *   - format: tournament format string (optional)
 *   - sort: "tournaments" | "win_rate" | "newest" | "alphabetical" (optional)
 *   - page: 1-indexed page number (optional, default 1)
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
import {
  getCachedPlayerDirectory,
  withCoachBadges,
  type PlayerSearchFilters,
  type PlayerSortOption,
} from "@/lib/data/players-endpoints";

/**
 * Cache-Control: private, no-store — auth-gated routes must not be cached by
 * shared/CDN caches; a "public" cache-control would allow a CDN to serve an
 * authed 200 response to an anonymous caller.
 */
const CACHE_CONTROL = "private, no-store";

const VALID_SORTS = new Set<string>([
  "tournaments",
  "win_rate",
  "newest",
  "alphabetical",
]);

export async function GET(request: NextRequest) {
  // Auth — required even for public data (no anonymous open Data API).
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit — per userId when authed, per IP for anonymous (auth always
  // resolves here, so always per userId).
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

  // Parse query params.
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const country = searchParams.get("country") ?? undefined;
  const format = searchParams.get("format") ?? undefined;
  const rawSort = searchParams.get("sort") ?? undefined;
  const rawPage = searchParams.get("page") ?? undefined;

  const sort: PlayerSortOption | undefined =
    rawSort && VALID_SORTS.has(rawSort)
      ? (rawSort as PlayerSortOption)
      : undefined;

  // Validate page — must be a positive integer (rejects floats, zero,
  // negatives, and non-numeric strings). Default to 1 when omitted.
  const pageResult = positiveIntSchema.safeParse(rawPage ?? "1");
  if (!pageResult.success) {
    return NextResponse.json(
      { error: "Invalid page parameter" },
      { status: 400 }
    );
  }
  const page = pageResult.data;

  const filters: PlayerSearchFilters = {};
  if (q !== undefined) filters.query = q;
  if (country !== undefined) filters.country = country;
  if (format !== undefined) filters.format = format;
  if (sort !== undefined) filters.sort = sort;

  // getCachedPlayerDirectory is 'use cache' — badge resolution runs outside.
  const cachedResult = await getCachedPlayerDirectory(filters, page);
  // Attach coach badges OUTSIDE the cache scope (flag-gated, per-user —
  // neither busts PLAYERS_DIRECTORY, so it must not be cached).
  const result = await withCoachBadges(cachedResult);

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
