/**
 * AT Protocol Interactions API - Web Wrapper
 *
 * Thin wrapper around @trainers/atproto/api/interactions that injects
 * web-specific authenticated agents via OAuth.
 */

import {
  likePost as likePostShared,
  unlikePost as unlikePostShared,
  repost as repostShared,
  unrepost as unrepostShared,
  getLikes as getLikesShared,
  getRepostedBy as getRepostedByShared,
} from "@trainers/atproto/api";
import type { LikeResult, RepostResult } from "@trainers/atproto/api";
import { getAuthenticatedAgent } from "../agent";

// Re-export types from shared package
export type { LikeResult, RepostResult };

/**
 * Like a post
 *
 * Creates a like record on the user's PDS pointing to the target post.
 *
 * @param did - The user's DID (who is liking)
 * @param postUri - The AT-URI of the post to like
 * @param postCid - The CID of the post to like
 * @returns The URI and CID of the created like record
 */
export async function likePost(
  did: string,
  postUri: string,
  postCid: string
): Promise<LikeResult> {
  const agent = await getAuthenticatedAgent(did);
  return likePostShared(agent, postUri, postCid);
}

/**
 * Unlike a post (delete the like record)
 *
 * @param did - The user's DID
 * @param likeUri - The AT-URI of the like record to delete
 */
export async function unlikePost(did: string, likeUri: string): Promise<void> {
  const agent = await getAuthenticatedAgent(did);
  return unlikePostShared(agent, likeUri);
}

/**
 * Repost a post
 *
 * Creates a repost record that shares the post with your followers.
 *
 * @param did - The user's DID
 * @param postUri - The AT-URI of the post to repost
 * @param postCid - The CID of the post to repost
 * @returns The URI and CID of the created repost record
 */
export async function repost(
  did: string,
  postUri: string,
  postCid: string
): Promise<RepostResult> {
  const agent = await getAuthenticatedAgent(did);
  return repostShared(agent, postUri, postCid);
}

/**
 * Remove a repost (delete the repost record)
 *
 * @param did - The user's DID
 * @param repostUri - The AT-URI of the repost record to delete
 */
export async function unrepost(did: string, repostUri: string): Promise<void> {
  const agent = await getAuthenticatedAgent(did);
  return unrepostShared(agent, repostUri);
}

/**
 * Get who liked a post
 *
 * @param postUri - The AT-URI of the post
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 50, max 100)
 * @returns List of actors who liked the post
 */
export async function getLikes(
  postUri: string,
  cursor?: string,
  limit: number = 50
): Promise<{
  likes: Array<{
    actor: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    };
    createdAt: string;
  }>;
  cursor?: string;
}> {
  // No auth needed - shared function uses public agent by default
  return getLikesShared(postUri, cursor, limit);
}

/**
 * Get who reposted a post
 *
 * @param postUri - The AT-URI of the post
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 50, max 100)
 * @returns List of actors who reposted the post
 */
export async function getRepostedBy(
  postUri: string,
  cursor?: string,
  limit: number = 50
): Promise<{
  repostedBy: Array<{
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  }>;
  cursor?: string;
}> {
  // No auth needed - shared function uses public agent by default
  return getRepostedByShared(postUri, cursor, limit);
}
