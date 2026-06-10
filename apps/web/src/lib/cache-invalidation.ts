/**
 * Cache Invalidation Helpers
 *
 * Entity-scoped helpers that bundle all cache invalidation calls for a given domain.
 * Using these instead of raw `updateTag()` / `revalidateTag()` calls in server actions
 * ensures that adding a new cache surface only requires updating one helper, not every action.
 *
 * ## Context split
 *
 * - `updateTag(tag)` — **Server Actions only**. Provides read-your-own-writes semantics:
 *   the current request sees the fresh data immediately after the mutation. Never call
 *   it inside Route Handlers, API routes, or cron endpoints.
 *
 * - `revalidateTag(tag, "max")` — **Route Handlers / webhooks / crons**. Uses
 *   stale-while-revalidate semantics; the next request after invalidation gets fresh data.
 *   Always pass `"max"` as the second argument — the single-arg form is deprecated and
 *   must never be used.
 *
 * Rules:
 * - Sync helpers for cases where all IDs/slugs are already known
 * - Async helpers when a DB lookup is needed to resolve an entity
 * - Never call `updateTag` or `revalidateTag` directly in actions — use these helpers
 */

import { revalidateTag, updateTag } from "next/cache";

import { CacheTags } from "@/lib/cache";
import { type createClient } from "@/lib/supabase/server";

// =============================================================================
// Community Cache Helpers
// =============================================================================

/**
 * Invalidate all caches that display community data.
 * Call after any community metadata change: name, description, logo, social
 * links, or staff roster.
 *
 * Pass whichever identifiers you have — both slug and id are optional but
 * providing both gives the most complete invalidation.
 */
export function invalidateCommunityPageCaches(
  slug?: string,
  id?: number
): void {
  updateTag(CacheTags.COMMUNITIES_LIST);
  if (slug) updateTag(CacheTags.community(slug));
  if (id !== undefined) updateTag(CacheTags.community(id));
}

// =============================================================================
// Tournament Cache Helpers
// =============================================================================

/**
 * Invalidate the individual tournament detail cache.
 * Call after any internal change: rounds, matches, registrations, check-ins.
 */
export function invalidateTournamentCaches(tournamentId: number): void {
  updateTag(CacheTags.tournament(tournamentId));
}

/**
 * Invalidate the tournament list + individual tournament caches.
 * Call when a tournament's visibility changes (publish, start, complete,
 * archive) but you already have no community context to update.
 */
export function invalidateTournamentListCaches(tournamentId: number): void {
  updateTag(CacheTags.TOURNAMENTS_LIST);
  updateTag(CacheTags.tournament(tournamentId));
}

/**
 * Invalidate the tournament list, individual tournament, and owning community
 * caches. Call when a tournament's status changes so the community detail
 * page's tournament groupings stay in sync.
 *
 * NOTE: Makes a DB round-trip to resolve the community slug. If you already
 * have the community slug and community id, prefer calling
 * `invalidateCommunityPageCaches(slug, communityId)` directly alongside
 * `invalidateTournamentListCaches(tournamentId)` to avoid the extra query.
 */
export async function invalidateTournamentAndCommunityCaches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: number
): Promise<void> {
  updateTag(CacheTags.TOURNAMENTS_LIST);
  updateTag(CacheTags.tournament(tournamentId));

  const { data, error } = await supabase
    .from("tournaments")
    .select("communities!tournaments_community_id_fkey(slug, id)")
    .eq("id", tournamentId)
    .single();

  if (error) throw error;

  if (data?.communities && "slug" in data.communities) {
    const community = data.communities as { slug: string; id: number };
    invalidateCommunityPageCaches(community.slug, community.id);
  }
}

// =============================================================================
// Player Cache Helpers
// =============================================================================

/**
 * Invalidate a player's profile cache.
 * Call after any profile data change that only affects the profile page
 * (bio, country, birth date).
 */
export function invalidatePlayerProfileCaches(username: string): void {
  updateTag(CacheTags.player(username));
}

/**
 * Invalidate a player's profile and all directory/sidebar caches.
 * Call when a player joins or changes their username — these events change
 * how the player appears in directory and new-members lists.
 *
 * Does NOT invalidate ranking caches by itself. New users typically do not
 * affect leaderboard/recent standings, but username changes do because those
 * views display usernames. Call `invalidatePlayerRankingCaches()`
 * separately when handling a rename.
 */
export function invalidatePlayerDirectoryCaches(username: string): void {
  updateTag(CacheTags.player(username));
  updateTag(CacheTags.PLAYERS_DIRECTORY);
  updateTag(CacheTags.PLAYERS_NEW);
}

/**
 * Invalidate leaderboard and recently-active player caches.
 * Call after tournament completion or any event that changes player rankings.
 */
export function invalidatePlayerRankingCaches(): void {
  updateTag(CacheTags.PLAYERS_LEADERBOARD);
  updateTag(CacheTags.PLAYERS_RECENT);
}

// =============================================================================
// Tournament Team Cache Helpers
// =============================================================================

/** Call after team submit or team selection changes. */
export function invalidateTournamentWithTeamCaches(tournamentId: number): void {
  updateTag(CacheTags.tournament(tournamentId));
  updateTag(CacheTags.tournamentTeams(tournamentId));
}

// =============================================================================
// Community Request Cache Helpers
// =============================================================================

/** Call after submitting or reviewing a community request. */
export function invalidateCommunityRequestCaches(): void {
  updateTag(CacheTags.COMMUNITY_REQUESTS_LIST);
}

// =============================================================================
// Team Cache Helpers
// =============================================================================

/** Invalidate the detail cache for a specific team. Call after team metadata changes. */
export function invalidateTeamDetailCache(teamId: number): void {
  updateTag(CacheTags.team(teamId));
}

/**
 * Route Handler-safe version of `invalidateTeamDetailCache`.
 * Uses `revalidateTag` which works in Route Handlers, middleware, and other
 * non-Server-Action contexts. Prefer this in API route files.
 */
export function revalidateTeamDetailCache(teamId: number): void {
  revalidateTag(CacheTags.team(teamId), "max");
}

// =============================================================================
// Dashboard Cache Helpers
// =============================================================================

/**
 * Invalidate dashboard stats and ratings caches.
 * Call after events that change player stats: tournament completion,
 * match result recording, alt creation/deletion.
 */
export function invalidateDashboardCaches(): void {
  updateTag(CacheTags.DASHBOARD_STATS);
  updateTag(CacheTags.DASHBOARD_RATINGS);
}

// =============================================================================
// Usage Stats Cache Helpers
// =============================================================================

/**
 * Server Action context — call after admin-triggered usage recompilation.
 *
 * Invalidates the global usage-stats tag plus one tag per touched format.
 * Pass an empty array (or omit `formats`) to bust only the global tag.
 */
export function invalidateUsageStatsCaches(formats: string[] = []): void {
  updateTag(CacheTags.USAGE_STATS);
  for (const f of formats) updateTag(CacheTags.usageStats(f));
}

/**
 * Route Handler / webhook context — stale-while-revalidate semantics.
 *
 * Uses `revalidateTag(tag, "max")` which is safe outside Server Actions.
 * Pass an empty array (or omit `formats`) to revalidate only the global tag.
 */
export function revalidateUsageStatsCaches(formats: string[] = []): void {
  revalidateTag(CacheTags.USAGE_STATS, "max");
  for (const f of formats) revalidateTag(CacheTags.usageStats(f), "max");
}

// =============================================================================
// Announcement Cache Helpers
// =============================================================================

/** Server Action context — call after announcement create/update/delete. */
export function invalidateAnnouncementCaches(): void {
  updateTag(CacheTags.ANNOUNCEMENTS);
}
