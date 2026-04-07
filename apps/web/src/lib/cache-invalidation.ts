/**
 * Cache Invalidation Helpers
 *
 * Entity-scoped helpers that bundle all `updateTag()` calls for a given domain.
 * Using these instead of raw `updateTag()` calls in server actions ensures that
 * adding a new cache surface only requires updating one helper, not every action.
 *
 * Rules:
 * - Sync helpers for cases where all IDs/slugs are already known
 * - Async helpers when a DB lookup is needed to resolve an entity
 */

import { updateTag } from "next/cache";

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
 * have the community slug and id, prefer calling
 * `invalidateCommunityPageCaches(slug, id)` directly alongside
 * `invalidateTournamentListCaches(id)` to avoid the extra query.
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
 * Does NOT invalidate ranking caches — new users and username changes don't
 * affect leaderboard/recent standings. Call `invalidatePlayerRankingCaches()`
 * separately after tournament completion.
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

/**
 * Invalidate tournament detail + team submission caches.
 * Call after team submit or team selection changes.
 */
export function invalidateTournamentWithTeamCaches(tournamentId: number): void {
  updateTag(CacheTags.tournament(tournamentId));
  updateTag(CacheTags.tournamentTeams(tournamentId));
}

// =============================================================================
// Community Request Cache Helpers
// =============================================================================

/**
 * Invalidate the community requests list cache.
 * Call after submitting or reviewing a community request.
 */
export function invalidateCommunityRequestCaches(): void {
  updateTag(CacheTags.COMMUNITY_REQUESTS_LIST);
}
