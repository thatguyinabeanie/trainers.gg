/**
 * Cached data-fetching functions for player/ratings/public-profile endpoints.
 *
 * Phase 2 Task 7: mirrors `standings-endpoint.ts` (the spike pattern) for the
 * player S-bucket family.
 *
 * Every function:
 *   - declares `'use cache'` so Next.js Cache Components memoizes across requests
 *   - calls `cacheTag()` with the relevant `CacheTags.*` constant so tag-based
 *     invalidation via `invalidatePlayerProfileCaches` / `invalidatePlayerDirectoryCaches`
 *     / `invalidatePlayerRankingCaches` busts the right entries
 *   - calls `cacheLife("max")` — all player data is tag-invalidated and does not
 *     need time-based revalidation
 *   - uses `createStaticClient()` (anonymous, cookie-less) so a per-viewer session
 *     can never pollute the shared cache key — auth happens OUTSIDE these functions,
 *     in the route handlers that call them
 *
 * None of these functions cache PII — they surface the same public data that
 * the SSR player pages already expose.
 */

import { cacheTag, cacheLife } from "next/cache";

import {
  searchPlayers,
  attachCoachBadges,
  getLeaderboard,
  getRecentlyActivePlayers,
  getNewMembers,
  getPlayerRating,
  getPlayerProfileByHandle,
  type SearchPlayersResult,
  type LeaderboardEntry,
  type RecentlyActivePlayer,
  type NewMemberEntry,
  type PlayerRating,
  type PlayerSearchFilters,
  type PlayerSortOption,
} from "@trainers/supabase";

import { createStaticClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

// =============================================================================
// Re-export types so route handlers can reference them without a second import
// =============================================================================

export type {
  SearchPlayersResult,
  LeaderboardEntry,
  RecentlyActivePlayer,
  NewMemberEntry,
  PlayerRating,
  PlayerSearchFilters,
  PlayerSortOption,
};

/** The union return type of `getPlayerProfileByHandle`. */
export type PlayerProfile = NonNullable<
  Awaited<ReturnType<typeof getPlayerProfileByHandle>>
>;

// =============================================================================
// Player directory / search
// =============================================================================

/**
 * Cached fetch of the player directory search results (without coach badges).
 *
 * Cache key = (filters, page) — every distinct combination gets its own entry.
 * Tag = `PLAYERS_DIRECTORY` (coarse, busted on any player join/username change).
 *
 * Coach-badge resolution is intentionally NOT inside this function — badge
 * visibility is gated on the global coaching feature flag and per-user coach
 * status, neither of which busts `PLAYERS_DIRECTORY`. Callers should attach
 * badges OUTSIDE the cache scope via `withCoachBadges()`.
 *
 * @param filters - Optional search/sort/filter params forwarded to `searchPlayers`.
 * @param page    - 1-indexed page number.
 */
export async function getCachedPlayerDirectory(
  filters: PlayerSearchFilters = {},
  page = 1
): Promise<SearchPlayersResult> {
  "use cache";
  cacheTag(CacheTags.PLAYERS_DIRECTORY);
  cacheLife("max");

  const supabase = createStaticClient();
  return searchPlayers(supabase, filters, page);
}

/**
 * Attach coach badges to a player directory result.
 *
 * Must be called OUTSIDE any `'use cache'` scope — badge visibility is
 * feature-flag gated and per-user; neither busts the directory cache tag.
 * See the SSR players page for the same pattern.
 *
 * @param result - The raw `SearchPlayersResult` from `getCachedPlayerDirectory`.
 */
export async function withCoachBadges(
  result: SearchPlayersResult
): Promise<SearchPlayersResult> {
  const supabase = createStaticClient();
  return {
    ...result,
    players: await attachCoachBadges(supabase, result.players),
  };
}

// =============================================================================
// Leaderboard sidebar
// =============================================================================

/**
 * Cached fetch of the top-N players by ELO rating.
 *
 * Tag = `PLAYERS_LEADERBOARD` (busted by `invalidatePlayerRankingCaches` on
 * tournament completion or rating changes).
 *
 * @param limit - Maximum number of entries to return (default 5).
 */
export async function getCachedLeaderboard(
  limit = 5
): Promise<LeaderboardEntry[]> {
  "use cache";
  cacheTag(CacheTags.PLAYERS_LEADERBOARD);
  cacheLife("max");

  const supabase = createStaticClient();
  return getLeaderboard(supabase, limit);
}

// =============================================================================
// Recently active players sidebar
// =============================================================================

/**
 * Cached fetch of recently active players (by tournament registration recency).
 *
 * Tag = `PLAYERS_RECENT` (busted by `invalidatePlayerRankingCaches`).
 *
 * @param limit - Maximum number of entries to return (default 5).
 */
export async function getCachedRecentlyActivePlayers(
  limit = 5
): Promise<RecentlyActivePlayer[]> {
  "use cache";
  cacheTag(CacheTags.PLAYERS_RECENT);
  cacheLife("max");

  const supabase = createStaticClient();
  return getRecentlyActivePlayers(supabase, limit);
}

// =============================================================================
// New members sidebar
// =============================================================================

/**
 * Cached fetch of the most recently created player accounts.
 *
 * Tag = `PLAYERS_NEW` (busted by `invalidatePlayerDirectoryCaches`).
 *
 * @param limit - Maximum number of entries to return (default 5).
 */
export async function getCachedNewMembers(limit = 5): Promise<NewMemberEntry[]> {
  "use cache";
  cacheTag(CacheTags.PLAYERS_NEW);
  cacheLife("max");

  const supabase = createStaticClient();
  return getNewMembers(supabase, limit);
}

// =============================================================================
// Public player profile
// =============================================================================

/**
 * Cached fetch of a public player profile by handle (username).
 *
 * The underlying `getPlayerProfileByHandle` reads `public_user_profiles` (the
 * Phase 0 view — never the locked `users` base table) and the public `alts` rows.
 *
 * Tag = `player(username)` (busted by `invalidatePlayerProfileCaches(username)`
 * on bio/country/avatar changes and by `invalidatePlayerDirectoryCaches(username)`
 * on username changes).
 *
 * @param username - The player's username (or alt username).
 */
export async function getCachedPlayerProfile(
  username: string
): Promise<PlayerProfile | null> {
  "use cache";
  cacheTag(CacheTags.player(username));
  cacheLife("max");

  const supabase = createStaticClient();
  return getPlayerProfileByHandle(supabase, username);
}

// =============================================================================
// Player ELO rating
// =============================================================================

/**
 * Cached fetch of the ELO rating for a specific alt.
 *
 * Tags = `player(altId)` entity tag (closest we have; rating changes bust when the
 * player profile cache is invalidated) + `PLAYERS_LEADERBOARD` so the leaderboard
 * sidebar also refreshes when any rating changes.
 *
 * @param altId  - The numeric alt ID to look up.
 * @param format - The rating format (default `"overall"`).
 */
export async function getCachedPlayerRating(
  altId: number,
  format = "overall"
): Promise<PlayerRating | null> {
  "use cache";
  // Use the leaderboard tag so rating-changing events bust this together with
  // the sidebar (both invalidated by `invalidatePlayerRankingCaches()`).
  cacheTag(CacheTags.PLAYERS_LEADERBOARD);
  cacheLife("max");

  const supabase = createStaticClient();
  return getPlayerRating(supabase, altId, format);
}
