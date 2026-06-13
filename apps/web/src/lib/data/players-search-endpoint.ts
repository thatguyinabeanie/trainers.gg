/**
 * Cached data-fetching function for the player search endpoint.
 *
 * This fetcher backs `GET /api/v1/players/search`, which is consumed by
 * auth-gated invite and create flows (`invite/player-search.tsx` and
 * `create/tournament-basic-info.tsx`). It is a separate file from
 * `players-endpoints.ts` per the D8 dedicated-file convention — each
 * `/api/v1` route gets its own fetcher file so parallel-wave assignments
 * never contend on the same source file.
 *
 * ### Why `createServiceRoleClient()` inside `'use cache'` (§0.2)
 *
 * Player search returns public S-bucket data — the same directory rows that
 * the SSR `/players` page already exposes. Because this data is identical for
 * every viewer, using a shared `'use cache'` entry is safe. We use
 * `createServiceRoleClient()` (service-role key) instead of
 * `createStaticClient()` (anon key) so the read survives the upcoming
 * `REVOKE SELECT ... FROM anon, authenticated` on S-bucket base tables (Phase
 * 2 Task 9, Step 4). Service-role is a single constant identity — it does not
 * vary per viewer, so it cannot pollute the shared cache key. The
 * authenticated check (cookie or Bearer) happens OUTSIDE this scope, in the
 * route handler. Do NOT revert this to `createStaticClient()` — that would
 * silently return zero rows once the grant revoke lands.
 *
 * ### Cache design
 *
 * Cache key = (filters, page) — every distinct combination gets its own
 * cache entry. The `PLAYERS_DIRECTORY` tag is reused (same data surface as
 * the directory route) so `invalidatePlayerDirectoryCaches(username)` busts
 * search results together with the directory grid whenever a player joins or
 * renames. `cacheLife("max")` — player data is tag-invalidated and does not
 * need time-based revalidation.
 */

import { cacheTag, cacheLife } from "next/cache";

import {
  searchPlayers,
  type SearchPlayersResult,
  type PlayerSearchFilters,
  type PlayerSortOption,
} from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

// Re-export types so the route handler does not need a second import.
export type { SearchPlayersResult, PlayerSearchFilters, PlayerSortOption };

/**
 * Cached fetch of player search results by query string and optional filters.
 *
 * Uses `createServiceRoleClient()` inside the cache scope (see file-level
 * JSDoc for the §0.2 service-role rationale). The auth check (cookie or
 * Bearer) happens in the route handler before this function is called.
 *
 * Coach badges are intentionally NOT attached here — badge visibility is
 * gated on the global coaching feature flag and per-user coach status,
 * neither of which busts `PLAYERS_DIRECTORY`. Callers that need badges must
 * call `withCoachBadges()` from `players-endpoints.ts` OUTSIDE this scope.
 *
 * @param filters - Optional search/sort/filter params forwarded to `searchPlayers`.
 * @param page    - 1-indexed page number (default 1).
 */
export async function getCachedPlayerSearch(
  filters: PlayerSearchFilters = {},
  page = 1
): Promise<SearchPlayersResult> {
  "use cache";
  cacheTag(CacheTags.PLAYERS_DIRECTORY);
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return searchPlayers(supabase, filters, page);
}
