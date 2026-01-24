/**
 * AT Protocol Feed API
 *
 * Functions for fetching feeds, timelines, and posts from Bluesky.
 * Uses the public API for unauthenticated reads and authenticated
 * Agent for personalized content.
 */

import type { AppBskyFeedDefs } from "@atproto/api";
import {
  getAuthenticatedAgent,
  getPublicAgent,
  withErrorHandling,
} from "../agent";
import { isPokemonContent } from "../config";

/**
 * Pagination cursor for feed fetching
 */
export interface FeedCursor {
  cursor?: string;
}

/**
 * Result from feed fetching operations
 */
export interface FeedResult {
  posts: AppBskyFeedDefs.FeedViewPost[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * Options for timeline fetching
 */
export interface TimelineOptions extends FeedCursor {
  limit?: number;
  /** Filter to Pokemon content only */
  pokemonOnly?: boolean;
}

/**
 * Get the authenticated user's home timeline
 *
 * This returns the user's personalized feed including posts from
 * accounts they follow and suggested content.
 *
 * @param did - The user's DID
 * @param options - Pagination and filtering options
 * @returns Feed posts with pagination cursor
 *
 * @example
 * ```typescript
 * const { posts, cursor, hasMore } = await getTimeline("did:plc:xxx", {
 *   limit: 25,
 *   pokemonOnly: true,
 * });
 * ```
 */
export async function getTimeline(
  did: string,
  options: TimelineOptions = {}
): Promise<FeedResult> {
  const { limit = 50, cursor, pokemonOnly = false } = options;

  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    const response = await agent.getTimeline({
      limit,
      cursor,
    });

    let posts = response.data.feed;

    // Filter to Pokemon content if requested
    if (pokemonOnly) {
      posts = posts.filter((item) => {
        const post = item.post;
        if (
          post.record &&
          typeof post.record === "object" &&
          "text" in post.record
        ) {
          return isPokemonContent(post.record.text as string);
        }
        return false;
      });
    }

    return {
      posts,
      cursor: response.data.cursor,
      hasMore: !!response.data.cursor,
    };
  });
}

/**
 * Options for author feed fetching
 */
export interface AuthorFeedOptions extends FeedCursor {
  limit?: number;
  /** Filter type for author feed */
  filter?: "posts_with_replies" | "posts_no_replies" | "posts_with_media";
  /** Include replies */
  includeReplies?: boolean;
  /** Include reposts */
  includeReposts?: boolean;
}

/**
 * Get posts from a specific author
 *
 * This fetches the public feed of a user by their DID or handle.
 * Does not require authentication.
 *
 * @param actor - The DID or handle of the user (e.g., "did:plc:xxx" or "user.bsky.social")
 * @param options - Pagination and filtering options
 * @returns Feed posts with pagination cursor
 *
 * @example
 * ```typescript
 * const { posts } = await getAuthorFeed("user.bsky.social", { limit: 20 });
 * ```
 */
export async function getAuthorFeed(
  actor: string,
  options: AuthorFeedOptions = {}
): Promise<FeedResult> {
  const { limit = 50, cursor } = options;

  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    const response = await agent.getAuthorFeed({
      actor,
      limit,
      cursor,
    });

    return {
      posts: response.data.feed,
      cursor: response.data.cursor,
      hasMore: !!response.data.cursor,
    };
  });
}

/**
 * Get a single post by AT-URI
 *
 * @param uri - The AT-URI of the post (e.g., "at://did:plc:xxx/app.bsky.feed.post/xxx")
 * @returns The post view or null if not found
 */
export async function getPost(
  uri: string
): Promise<AppBskyFeedDefs.PostView | null> {
  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    const response = await agent.getPosts({
      uris: [uri],
    });

    return response.data.posts[0] ?? null;
  });
}

/**
 * Get multiple posts by AT-URI
 *
 * @param uris - Array of AT-URIs
 * @returns Array of post views
 */
export async function getPosts(
  uris: string[]
): Promise<AppBskyFeedDefs.PostView[]> {
  if (uris.length === 0) return [];

  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    // AT Protocol limits to 25 URIs per request
    const chunks: string[][] = [];
    for (let i = 0; i < uris.length; i += 25) {
      chunks.push(uris.slice(i, i + 25));
    }

    const results: AppBskyFeedDefs.PostView[] = [];
    for (const chunk of chunks) {
      const response = await agent.getPosts({ uris: chunk });
      results.push(...response.data.posts);
    }

    return results;
  });
}

/**
 * Thread view result
 */
export interface ThreadResult {
  thread: AppBskyFeedDefs.ThreadViewPost;
}

/**
 * Get a post thread (parent context and replies)
 *
 * @param uri - The AT-URI of the post
 * @param depth - How many levels of replies to fetch (default 6)
 * @param parentHeight - How many parent posts to fetch (default 80)
 * @returns The thread view
 */
export async function getPostThread(
  uri: string,
  depth: number = 6,
  parentHeight: number = 80
): Promise<AppBskyFeedDefs.ThreadViewPost | null> {
  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    const response = await agent.getPostThread({
      uri,
      depth,
      parentHeight,
    });

    // Type guard for thread view post
    if (response.data.thread.$type === "app.bsky.feed.defs#threadViewPost") {
      return response.data.thread as AppBskyFeedDefs.ThreadViewPost;
    }

    return null;
  });
}

/**
 * Get the Pokemon-filtered feed for an authenticated user
 *
 * This is a convenience function that combines getTimeline with pokemonOnly filter.
 * It fetches more posts initially to ensure enough Pokemon content after filtering.
 *
 * @param did - The user's DID
 * @param options - Pagination options
 * @returns Filtered feed posts
 */
export async function getPokemonFeed(
  did: string,
  options: FeedCursor & { limit?: number } = {}
): Promise<FeedResult> {
  const { limit = 25, cursor } = options;

  // Fetch more posts to account for filtering
  const fetchLimit = Math.min(limit * 3, 100);

  const result = await getTimeline(did, {
    limit: fetchLimit,
    cursor,
    pokemonOnly: true,
  });

  // Limit to requested amount
  return {
    posts: result.posts.slice(0, limit),
    cursor: result.cursor,
    hasMore: result.hasMore || result.posts.length > limit,
  };
}

/**
 * Search posts with a query
 *
 * @param query - The search query
 * @param options - Pagination options
 * @returns Matching posts
 */
export async function searchPosts(
  query: string,
  options: FeedCursor & { limit?: number } = {}
): Promise<FeedResult> {
  const { limit = 25, cursor } = options;

  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    const response = await agent.app.bsky.feed.searchPosts({
      q: query,
      limit,
      cursor,
    });

    // Convert search results to FeedViewPost format
    const posts: AppBskyFeedDefs.FeedViewPost[] = response.data.posts.map(
      (post) => ({
        post,
        // Search results don't have reply/reason context
      })
    );

    return {
      posts,
      cursor: response.data.cursor,
      hasMore: !!response.data.cursor,
    };
  });
}
