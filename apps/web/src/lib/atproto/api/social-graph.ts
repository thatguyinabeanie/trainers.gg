/**
 * AT Protocol Social Graph API - Web Wrapper
 *
 * Thin wrapper around @trainers/atproto/api/social-graph that injects
 * web-specific authenticated agents via OAuth.
 */

import {
  follow as followShared,
  unfollow as unfollowShared,
  getProfile as getProfileShared,
  getProfiles as getProfilesShared,
  getFollowers as getFollowersShared,
  getFollows as getFollowsShared,
  blockUser as blockUserShared,
  unblockUser as unblockUserShared,
  muteUser as muteUserShared,
  unmuteUser as unmuteUserShared,
  searchUsers as searchUsersShared,
  getSuggestedFollows as getSuggestedFollowsShared,
} from "@trainers/atproto/api";
import type { ProfileView, FollowResult } from "@trainers/atproto/api";
import { getAuthenticatedAgent } from "../agent";

// Re-export types from shared package
export type { ProfileView, FollowResult };

/**
 * Follow a user
 *
 * Creates a follow record on the user's PDS.
 *
 * @param did - The user's DID (who is following)
 * @param targetDid - The DID of the user to follow
 * @returns The URI and CID of the created follow record
 */
export async function follow(
  did: string,
  targetDid: string
): Promise<FollowResult> {
  const agent = await getAuthenticatedAgent(did);
  return followShared(agent, targetDid);
}

/**
 * Unfollow a user (delete the follow record)
 *
 * @param did - The user's DID
 * @param followUri - The AT-URI of the follow record to delete
 */
export async function unfollow(did: string, followUri: string): Promise<void> {
  const agent = await getAuthenticatedAgent(did);
  return unfollowShared(agent, followUri);
}

/**
 * Get a user's profile
 *
 * @param actor - The DID or handle of the user
 * @returns The profile view
 */
export async function getProfile(actor: string): Promise<ProfileView | null> {
  // No auth needed - shared function uses public agent by default
  return getProfileShared(actor);
}

/**
 * Get multiple user profiles
 *
 * @param actors - Array of DIDs or handles (max 25)
 * @returns Array of profile views
 */
export async function getProfiles(actors: string[]): Promise<ProfileView[]> {
  // No auth needed - shared function uses public agent by default
  return getProfilesShared(actors);
}

/**
 * Get a user's followers
 *
 * @param actor - The DID or handle of the user
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 50, max 100)
 * @returns List of followers with pagination
 */
export async function getFollowers(
  actor: string,
  cursor?: string,
  limit: number = 50
): Promise<{ followers: ProfileView[]; cursor?: string }> {
  // No auth needed - shared function uses public agent by default
  return getFollowersShared(actor, cursor, limit);
}

/**
 * Get users that a user follows
 *
 * @param actor - The DID or handle of the user
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 50, max 100)
 * @returns List of follows with pagination
 */
export async function getFollows(
  actor: string,
  cursor?: string,
  limit: number = 50
): Promise<{ follows: ProfileView[]; cursor?: string }> {
  // No auth needed - shared function uses public agent by default
  return getFollowsShared(actor, cursor, limit);
}

/**
 * Block a user
 *
 * @param did - The user's DID (who is blocking)
 * @param targetDid - The DID of the user to block
 * @returns The URI of the block record
 */
export async function blockUser(
  did: string,
  targetDid: string
): Promise<{ uri: string }> {
  const agent = await getAuthenticatedAgent(did);
  return blockUserShared(agent, targetDid);
}

/**
 * Unblock a user (delete the block record)
 *
 * @param did - The user's DID
 * @param blockUri - The AT-URI of the block record
 */
export async function unblockUser(
  did: string,
  blockUri: string
): Promise<void> {
  const agent = await getAuthenticatedAgent(did);
  return unblockUserShared(agent, blockUri);
}

/**
 * Mute a user
 *
 * @param did - The user's DID
 * @param targetDid - The DID of the user to mute
 */
export async function muteUser(did: string, targetDid: string): Promise<void> {
  const agent = await getAuthenticatedAgent(did);
  return muteUserShared(agent, targetDid);
}

/**
 * Unmute a user
 *
 * @param did - The user's DID
 * @param targetDid - The DID of the user to unmute
 */
export async function unmuteUser(
  did: string,
  targetDid: string
): Promise<void> {
  const agent = await getAuthenticatedAgent(did);
  return unmuteUserShared(agent, targetDid);
}

/**
 * Search for users
 *
 * @param query - Search query
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 25)
 * @returns Matching profiles
 */
export async function searchUsers(
  query: string,
  cursor?: string,
  limit: number = 25
): Promise<{ actors: ProfileView[]; cursor?: string }> {
  // No auth needed - shared function uses public agent by default
  return searchUsersShared(query, cursor, limit);
}

/**
 * Get suggested follows for a user
 *
 * @param did - The user's DID (for personalized suggestions)
 * @param limit - Number of suggestions
 * @returns Suggested profiles to follow
 */
export async function getSuggestedFollows(
  did: string,
  limit: number = 10
): Promise<ProfileView[]> {
  const agent = await getAuthenticatedAgent(did);
  return getSuggestedFollowsShared(agent, limit);
}
