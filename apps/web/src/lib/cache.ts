/**
 * Cache Tags and Utilities
 *
 * Provides cache tag constants and helper functions for Next.js on-demand revalidation.
 * Use with `'use cache'` (Cache Components API) for data fetching; call `updateTag` or
 * `revalidateTag` via the helpers in `@/lib/cache-invalidation` — never call them directly.
 *
 * @example
 * ```ts
 * // In a cached data-fetching function (Cache Components API)
 * import { cacheTag, cacheLife } from "next/cache";
 * import { CacheTags } from "@/lib/cache";
 * import { createStaticClient } from "@/lib/supabase/server";
 * import { getTournamentBySlug } from "@trainers/supabase";
 *
 * async function getCachedTournament(slug: string) {
 *   "use cache";
 *   cacheTag(CacheTags.tournament(slug), CacheTags.TOURNAMENTS_LIST);
 *   cacheLife("max");
 *   const supabase = createStaticClient();
 *   return getTournamentBySlug(supabase, slug);
 * }
 * ```
 *
 * ## Tag-naming scheme
 *
 * - **Collection tags** — kebab-case nouns: `"usage-stats"`, `"tournaments-list"`.
 *   Apply to any cached fetcher that returns a list of that entity type.
 *   Invalidating them busts every cached page that shows that list.
 *
 * - **Entity tags** — `noun:id` form: `"usage-stats:gen9vgc2025regg"`, `"tournament:42"`.
 *   Apply alongside the collection tag for fine-grained invalidation.
 *   Invalidating an entity tag busts only pages scoped to that specific entity.
 *
 * - **Cached fetchers** apply both a broad collection tag AND a narrow entity tag
 *   (e.g., `cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(format))`).
 *
 * - **Invalidation helpers** in `@/lib/cache-invalidation` choose the right granularity:
 *   bust the collection tag when a list changes, the entity tag when only one record changes.
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

  /** Tag for site announcements (banner/alert content) */
  ANNOUNCEMENTS: "announcements",

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

  /**
   * Tag for pokemon usage stats — covers all format/source/period combinations.
   * Invalidated when the usage rollup worker writes new data.
   */
  USAGE_STATS: "usage-stats",

  /**
   * Generate a tag for a specific format's usage stats.
   * Allows targeted invalidation when only one format's rollup completes.
   */
  usageStats: (format: string) => `usage-stats:${format}`,
} as const;
