/**
 * Cache Tags and Utilities
 *
 * Provides cache tag constants and helper functions for Next.js on-demand revalidation.
 * Use with `unstable_cache` for data fetching and `revalidateTag` in server actions.
 *
 * @example
 * ```ts
 * // In a server component or data fetching function
 * import { unstable_cache } from "next/cache";
 * import { CacheTags } from "@/lib/cache";
 *
 * const getCachedData = unstable_cache(
 *   async () => fetchData(),
 *   ["cache-key"],
 *   { tags: [CacheTags.TOURNAMENTS_LIST] }
 * );
 *
 * // In a server action
 * import { revalidateTag } from "next/cache";
 * import { CacheTags } from "@/lib/cache";
 *
 * revalidateTag(CacheTags.TOURNAMENTS_LIST);
 * ```
 */

/**
 * Cache tag constants for on-demand revalidation
 */
export const CacheTags = {
  /** Tag for /tournaments list page */
  TOURNAMENTS_LIST: "tournaments-list",

  /** Tag for /organizations list page */
  ORGANIZATIONS_LIST: "organizations-list",

  /**
   * Generate a tag for a specific tournament
   * @param idOrSlug - Tournament ID or slug
   */
  tournament: (idOrSlug: string | number) => `tournament:${idOrSlug}`,

  /**
   * Generate a tag for a specific organization
   * @param idOrSlug - Organization ID or slug
   */
  organization: (idOrSlug: string | number) => `organization:${idOrSlug}`,

  /** Tag for tournament team submissions (open teamsheet public view) */
  tournamentTeams: (idOrSlug: string | number) =>
    `tournament-teams:${idOrSlug}`,

  /** Tag for a specific player profile */
  player: (handle: string) => `player:${handle}`,

  /** Tag for admin org requests list */
  ORG_REQUESTS_LIST: "org-requests-list",

  /** Tag for /players directory page (initial grid data) */
  PLAYERS_DIRECTORY: "players-directory",

  /** Tag for players leaderboard sidebar */
  PLAYERS_LEADERBOARD: "players-leaderboard",

  /** Tag for recently active players sidebar */
  PLAYERS_RECENT: "players-recent",

  /** Tag for new members sidebar */
  PLAYERS_NEW: "players-new",

  /** Tag for hero page platform overview stats (players, tournaments, matches) */
  PLATFORM_OVERVIEW: "platform-overview",
} as const;
