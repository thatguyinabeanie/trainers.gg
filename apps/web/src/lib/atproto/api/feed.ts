/**
 * AT Protocol Feed API - Web Wrapper
 *
 * Thin wrapper around @trainers/atproto/api/feed that injects
 * web-specific authenticated agents via OAuth.
 */

import type { AppBskyFeedDefs } from "@atproto/api";
import {
  getTimeline as getTimelineShared,
  getAuthorFeed as getAuthorFeedShared,
  getActorLikes as getActorLikesShared,
  getPost as getPostShared,
  getPosts as getPostsShared,
  getPostThread as getPostThreadShared,
  getPokemonFeed as getPokemonFeedShared,
  searchPosts as searchPostsShared,
} from "@trainers/atproto/api";
import type {
  FeedResult,
  TimelineOptions,
  AuthorFeedOptions,
  FeedCursor,
} from "@trainers/atproto/api";
import { getAuthenticatedAgent } from "../agent";

// Re-export types from shared package
export type { FeedResult, TimelineOptions, AuthorFeedOptions, FeedCursor };

/**
 * Get the authenticated user's home timeline
 *
 * @param did - The user's DID
 * @param options - Pagination and filtering options
 * @returns Feed posts with pagination cursor
 */
export async function getTimeline(
  did: string,
  options: TimelineOptions = {}
): Promise<FeedResult> {
  const agent = await getAuthenticatedAgent(did);
  return getTimelineShared(agent, options);
}

/**
 * Get posts from a specific author
 *
 * Uses the public agent (no auth required).
 *
 * @param actor - The DID or handle of the user
 * @param options - Pagination and filtering options
 * @returns Feed posts with pagination cursor
 */
export async function getAuthorFeed(
  actor: string,
  options: AuthorFeedOptions = {}
): Promise<FeedResult> {
  // No auth needed - shared function uses public agent by default
  return getAuthorFeedShared(actor, options);
}

/**
 * Get posts liked by a specific user
 *
 * Uses the public agent (no auth required).
 *
 * @param actor - The DID or handle of the user
 * @param options - Pagination options
 * @returns Feed posts with pagination cursor
 */
export async function getActorLikes(
  actor: string,
  options: FeedCursor & { limit?: number } = {}
): Promise<FeedResult> {
  // No auth needed - shared function uses public agent by default
  return getActorLikesShared(actor, options);
}

/**
 * Get a single post by AT-URI
 *
 * @param uri - The AT-URI of the post
 * @returns The post view or null if not found
 */
export async function getPost(
  uri: string
): Promise<AppBskyFeedDefs.PostView | null> {
  // No auth needed - shared function uses public agent by default
  return getPostShared(uri);
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
  // No auth needed - shared function uses public agent by default
  return getPostsShared(uris);
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
  // No auth needed - shared function uses public agent by default
  return getPostThreadShared(uri, depth, parentHeight);
}

/**
 * Get the Pokemon-filtered feed for an authenticated user
 *
 * @param did - The user's DID
 * @param options - Pagination options
 * @returns Filtered feed posts
 */
export async function getPokemonFeed(
  did: string,
  options: FeedCursor & { limit?: number } = {}
): Promise<FeedResult> {
  const agent = await getAuthenticatedAgent(did);
  return getPokemonFeedShared(agent, options);
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
  // No auth needed - shared function uses public agent by default
  return searchPostsShared(query, options);
}
