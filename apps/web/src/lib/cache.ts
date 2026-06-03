/**
 * Cache Tags and Utilities
 *
 * Provides cache tag constants and helper functions for Next.js on-demand revalidation.
 * Use with `unstable_cache` for data fetching and `updateTag` in server actions.
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
 * import { updateTag } from "next/cache";
 * import { CacheTags } from "@/lib/cache";
 *
 * updateTag(CacheTags.TOURNAMENTS_LIST);
 * ```
 */

/**
 * Cache tag constants for on-demand revalidation
 */
export const CacheTags = {
  /** Tag for /tournaments list page */
  TOURNAMENTS_LIST: "tournaments-list",

  /** Tag for /communities list page */
  COMMUNITIES_LIST: "communities-list",

  /**
   * Generate a tag for a specific tournament
   * @param idOrSlug - Tournament ID or slug
   */
  tournament: (idOrSlug: string | number) => `tournament:${idOrSlug}`,

  /**
   * Generate a tag for a specific community
   * @param idOrSlug - Community ID or slug
   */
  community: (idOrSlug: string | number) => `community:${idOrSlug}`,

  /** Tag for tournament team submissions (open teamsheet public view) */
  tournamentTeams: (idOrSlug: string | number) =>
    `tournament-teams:${idOrSlug}`,

  /** Tag for a specific player profile */
  player: (handle: string) => `player:${handle}`,

  /** Tag for admin community requests list */
  COMMUNITY_REQUESTS_LIST: "community-requests-list",

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

  /** Tag for dashboard bulk stats (win/loss/tournament counts per alt) */
  DASHBOARD_STATS: "dashboard-stats",

  /** Tag for dashboard bulk ratings */
  DASHBOARD_RATINGS: "dashboard-ratings",

  /** Generate a tag for a specific team (for public team pages) */
  team: (id: number) => `team:${id}`,

  /**
   * Tag for cached Discord REST data (guild channels + roles) for a specific server.
   * Invalidated explicitly via refreshDiscordGuildCacheAction — no auto-invalidation
   * because the data changes in Discord, not trainers.gg.
   */
  discordGuild: (serverId: number) => `discord-guild:${serverId}`,

  /** Tag for the limitless tournament list (admin data browser) */
  LIMITLESS_TOURNAMENTS: "limitless-tournaments",

  /** Tag for a specific limitless tournament detail page */
  limitlessTournament: (id: string) => `limitless-tournament:${id}`,

  /** Tag for the admin coaches list */
  COACHES_LIST: "coaches-list",

  /** Tag for a specific coach profile page */
  coachProfile: (handle: string) => `coach-profile:${handle}`,
} as const;
