/**
 * AT Protocol Interactions API
 *
 * Functions for liking, reposting, and other engagement actions on Bluesky.
 * All write operations require an authenticated Agent.
 */

import type { Agent } from "@atproto/api";
import { withErrorHandling, getPublicAgent } from "../agent";
import type { LikeResult, RepostResult } from "../types";

// Re-export types for convenience
export type { LikeResult, RepostResult };

/**
 * Like a post
 *
 * Creates a like record on the user's PDS pointing to the target post.
 *
 * @param agent - An authenticated Agent instance
 * @param postUri - The AT-URI of the post to like
 * @param postCid - The CID of the post to like
 * @returns The URI and CID of the created like record
 */
export async function likePost(
  agent: Agent,
  postUri: string,
  postCid: string
): Promise<LikeResult> {
  return withErrorHandling(async () => {
    const response = await agent.like(postUri, postCid);

    return {
      uri: response.uri,
      cid: response.cid,
    };
  });
}

/**
 * Unlike a post (delete the like record)
 *
 * @param agent - An authenticated Agent instance
 * @param likeUri - The AT-URI of the like record to delete
 */
export async function unlikePost(agent: Agent, likeUri: string): Promise<void> {
  return withErrorHandling(async () => {
    await agent.deleteLike(likeUri);
  });
}

/**
 * Repost a post
 *
 * Creates a repost record that shares the post with your followers.
 *
 * @param agent - An authenticated Agent instance
 * @param postUri - The AT-URI of the post to repost
 * @param postCid - The CID of the post to repost
 * @returns The URI and CID of the created repost record
 */
export async function repost(
  agent: Agent,
  postUri: string,
  postCid: string
): Promise<RepostResult> {
  return withErrorHandling(async () => {
    const response = await agent.repost(postUri, postCid);

    return {
      uri: response.uri,
      cid: response.cid,
    };
  });
}

/**
 * Remove a repost (delete the repost record)
 *
 * @param agent - An authenticated Agent instance
 * @param repostUri - The AT-URI of the repost record to delete
 */
export async function unrepost(agent: Agent, repostUri: string): Promise<void> {
  return withErrorHandling(async () => {
    await agent.deleteRepost(repostUri);
  });
}

/**
 * Get who liked a post
 *
 * @param postUri - The AT-URI of the post
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 50, max 100)
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns List of actors who liked the post
 */
export async function getLikes(
  postUri: string,
  cursor?: string,
  limit: number = 50,
  agent?: Agent
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
  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.getLikes({
      uri: postUri,
      limit,
      cursor,
    });

    return {
      likes: response.data.likes.map((like) => ({
        actor: {
          did: like.actor.did,
          handle: like.actor.handle,
          displayName: like.actor.displayName,
          avatar: like.actor.avatar,
        },
        createdAt: like.createdAt,
      })),
      cursor: response.data.cursor,
    };
  });
}

/**
 * Get who reposted a post
 *
 * @param postUri - The AT-URI of the post
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 50, max 100)
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns List of actors who reposted the post
 */
export async function getRepostedBy(
  postUri: string,
  cursor?: string,
  limit: number = 50,
  agent?: Agent
): Promise<{
  repostedBy: Array<{
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  }>;
  cursor?: string;
}> {
  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.getRepostedBy({
      uri: postUri,
      limit,
      cursor,
    });

    return {
      repostedBy: response.data.repostedBy.map((actor) => ({
        did: actor.did,
        handle: actor.handle,
        displayName: actor.displayName,
        avatar: actor.avatar,
      })),
      cursor: response.data.cursor,
    };
  });
}
