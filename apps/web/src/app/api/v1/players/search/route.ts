/**
 * GET /api/v1/players/search
 *
 * Phase 2 Task 9 (T3a) — public S-bucket player search route.
 *
 * Backs the auth-gated invite and create flows:
 *   - `components/tournaments/invite/player-search.tsx`
 *   - `components/tournaments/create/tournament-basic-info.tsx`
 *   - `app/(app)/admin/config/flag-allowlist-sheet.tsx` (user-search repoint)
 *
 * These components previously called `useSupabaseQuery` with the browser anon
 * client. Once `REVOKE SELECT ... FROM anon, authenticated` lands on the
 * `alts` table (Step 4), that browser read would return zero rows. This
 * route handler moves the read server-side (service-role key inside
 * `getCachedPlayerSearch`) so it survives the revoke.
 *
 * AUTH (dual-mode, required even for public data):
 *   Bearer first (mobile / script): validated via `resolveApiAuth`.
 *   Cookie fallback (web session): same helper.
 *   Anonymous → 401.
 *
 * RATE LIMIT: 120 req / userId-or-IP / minute. → 429 with Retry-After.
 *
 * CACHE-CONTROL: long shared-CDN TTL (`public, s-maxage=31536000,
 * stale-while-revalidate=86400`). Tag-invalidated by
 * `invalidatePlayerDirectoryCaches(username)` whenever a player joins or
 * renames. Same tag and lifetime as `/api/v1/players/directory`.
 *
 * Query params:
 *   q       — search query (optional)
 *   country — ISO 3166-1 alpha-2 country code (optional)
 *   format  — tournament format string (optional)
 *   sort    — "tournaments" | "win_rate" | "newest" | "alphabetical" (optional)
 *   page    — 1-indexed page number (optional, default 1)
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import {
  getCachedPlayerSearch,
  type PlayerSearchFilters,
  type PlayerSortOption,
} from "@/lib/data/players-search-endpoint";

/**
 * Cache-Control: this route is auth-gated (resolveApiAuth -> 401 for anon), so
 * the HTTP response must not be shared by a CDN — a `public` header would let a
 * CDN serve an authenticated 200 to an anonymous caller, undermining the
 * "no anonymous open Data API" decision. Server-side `'use cache'` (tag-busted
 * via `invalidatePlayerDirectoryCaches`) is the real caching layer; the
 * CDN-facing response stays private.
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

  // Rate-limit — per userId when authed, request IP as fallback.
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

  // Parse and validate query params.
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

  const page = rawPage ? Number(rawPage) : 1;
  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json(
      { error: "Invalid page parameter" },
      { status: 400 }
    );
  }

  const filters: PlayerSearchFilters = {};
  if (q !== undefined) filters.query = q;
  if (country !== undefined) filters.country = country;
  if (format !== undefined) filters.format = format;
  if (sort !== undefined) filters.sort = sort;

  // Cached fetch — service-role inside 'use cache' scope (see §0.2 rationale
  // in the fetcher file). Auth check already happened above, outside the scope.
  const result = await getCachedPlayerSearch(filters, page);

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
