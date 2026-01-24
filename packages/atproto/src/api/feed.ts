/**
 * AT Protocol Feed API
 *
 * Functions for fetching feeds, timelines, and posts from Bluesky.
 * All functions accept an Agent as the first parameter, making them
 * platform-agnostic (can be used with any authenticated or public Agent).
 */

import type { Agent, AppBskyFeedDefs } from "@atproto/api";
import { withErrorHandling, getPublicAgent } from "../agent";
import { isPokemonContent } from "../config";
import type {
  FeedResult,
  TimelineOptions,
  AuthorFeedOptions,
  FeedCursor,
} from "../types";

// Re-export types for convenience
export type { FeedResult, TimelineOptions, AuthorFeedOptions, FeedCursor };

/**
 * Get the authenticated user's home timeline
 *
 * This returns the user's personalized feed including posts from
 * accounts they follow and suggested content.
 *
 * @param agent - An authenticated Agent instance
 * @param options - Pagination and filtering options
 * @returns Feed posts with pagination cursor
 */
export async function getTimeline(
  agent: Agent,
  options: TimelineOptions = {}
): Promise<FeedResult> {
  const { limit = 50, cursor, pokemonOnly = false } = options;

  return withErrorHandling(async () => {
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
 * Get posts from a specific author
 *
 * This fetches the public feed of a user by their DID or handle.
 * Uses the public agent by default (no auth required).
 *
 * @param actor - The DID or handle of the user
 * @param options - Pagination and filtering options
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns Feed posts with pagination cursor
 */
export async function getAuthorFeed(
  actor: string,
  options: AuthorFeedOptions = {},
  agent?: Agent
): Promise<FeedResult> {
  const { limit = 50, cursor } = options;

  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.getAuthorFeed({
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
 * @param uri - The AT-URI of the post
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns The post view or null if not found
 */
export async function getPost(
  uri: string,
  agent?: Agent
): Promise<AppBskyFeedDefs.PostView | null> {
  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.getPosts({
      uris: [uri],
    });

    return response.data.posts[0] ?? null;
  });
}

/**
 * Get multiple posts by AT-URI
 *
 * @param uris - Array of AT-URIs
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns Array of post views
 */
export async function getPosts(
  uris: string[],
  agent?: Agent
): Promise<AppBskyFeedDefs.PostView[]> {
  if (uris.length === 0) return [];

  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    // AT Protocol limits to 25 URIs per request
    const chunks: string[][] = [];
    for (let i = 0; i < uris.length; i += 25) {
      chunks.push(uris.slice(i, i + 25));
    }

    const results: AppBskyFeedDefs.PostView[] = [];
    for (const chunk of chunks) {
      const response = await agentToUse.getPosts({ uris: chunk });
      results.push(...response.data.posts);
    }

    return results;
  });
}

/**
 * Get a post thread (parent context and replies)
 *
 * @param uri - The AT-URI of the post
 * @param depth - How many levels of replies to fetch (default 6)
 * @param parentHeight - How many parent posts to fetch (default 80)
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns The thread view
 */
export async function getPostThread(
  uri: string,
  depth: number = 6,
  parentHeight: number = 80,
  agent?: Agent
): Promise<AppBskyFeedDefs.ThreadViewPost | null> {
  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.getPostThread({
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
 *
 * @param agent - An authenticated Agent instance
 * @param options - Pagination options
 * @returns Filtered feed posts
 */
export async function getPokemonFeed(
  agent: Agent,
  options: FeedCursor & { limit?: number } = {}
): Promise<FeedResult> {
  const { limit = 25, cursor } = options;

  // Fetch more posts to account for filtering
  const fetchLimit = Math.min(limit * 3, 100);

  const result = await getTimeline(agent, {
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
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns Matching posts
 */
export async function searchPosts(
  query: string,
  options: FeedCursor & { limit?: number } = {},
  agent?: Agent
): Promise<FeedResult> {
  const { limit = 25, cursor } = options;

  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.app.bsky.feed.searchPosts({
      q: query,
      limit,
      cursor,
    });

    // Convert search results to FeedViewPost format
    const posts: AppBskyFeedDefs.FeedViewPost[] = response.data.posts.map(
      (post) => ({
        post,
      })
    );

    return {
      posts,
      cursor: response.data.cursor,
      hasMore: !!response.data.cursor,
    };
  });
}
