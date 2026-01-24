/**
 * AT Protocol Interactions API
 *
 * Functions for liking, reposting, and other engagement actions on Bluesky.
 * All operations require authentication.
 */

import { getAuthenticatedAgent, withErrorHandling } from "../agent";

/**
 * Result from a like operation
 */
export interface LikeResult {
  /** AT-URI of the like record */
  uri: string;
  /** Content hash of the like record */
  cid: string;
}

/**
 * Result from a repost operation
 */
export interface RepostResult {
  /** AT-URI of the repost record */
  uri: string;
  /** Content hash of the repost record */
  cid: string;
}

/**
 * Like a post
 *
 * Creates a like record on the user's PDS pointing to the target post.
 *
 * @param did - The user's DID (who is liking)
 * @param postUri - The AT-URI of the post to like
 * @param postCid - The CID of the post to like
 * @returns The URI and CID of the created like record
 *
 * @example
 * ```typescript
 * const { uri } = await likePost(
 *   "did:plc:xxx",
 *   "at://did:plc:yyy/app.bsky.feed.post/abc",
 *   "bafyreiabc..."
 * );
 * // Store uri to allow unliking later
 * ```
 */
export async function likePost(
  did: string,
  postUri: string,
  postCid: string
): Promise<LikeResult> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

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
 * @param did - The user's DID
 * @param likeUri - The AT-URI of the like record to delete
 *
 * @example
 * ```typescript
 * // likeUri is the URI returned when you liked the post
 * await unlikePost("did:plc:xxx", "at://did:plc:xxx/app.bsky.feed.like/abc");
 * ```
 */
export async function unlikePost(did: string, likeUri: string): Promise<void> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    await agent.deleteLike(likeUri);
  });
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
 *
 * @example
 * ```typescript
 * const { uri } = await repost(
 *   "did:plc:xxx",
 *   "at://did:plc:yyy/app.bsky.feed.post/abc",
 *   "bafyreiabc..."
 * );
 * ```
 */
export async function repost(
  did: string,
  postUri: string,
  postCid: string
): Promise<RepostResult> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

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
 * @param did - The user's DID
 * @param repostUri - The AT-URI of the repost record to delete
 */
export async function unrepost(did: string, repostUri: string): Promise<void> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    await agent.deleteRepost(repostUri);
  });
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
  return withErrorHandling(async () => {
    // Import here to avoid circular dependencies
    const { getPublicAgent } = await import("../agent");
    const agent = getPublicAgent();

    const response = await agent.getLikes({
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
  return withErrorHandling(async () => {
    const { getPublicAgent } = await import("../agent");
    const agent = getPublicAgent();

    const response = await agent.getRepostedBy({
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
