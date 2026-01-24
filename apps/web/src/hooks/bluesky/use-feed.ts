"use client";

/**
 * TanStack Query hooks for Bluesky feed data.
 *
 * These hooks fetch feed data from server-side API layer and handle
 * caching, infinite scroll pagination, and background refetching.
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import type { AppBskyFeedDefs } from "@atproto/api";
import type { AuthorFeedOptions } from "@/lib/atproto/api";

// Server actions for fetching feed data
import {
  getTimelineAction,
  getPokemonFeedAction,
  getAuthorFeedAction,
  getActorLikesAction,
} from "@/actions/bluesky/feed-actions";

/**
 * Feed filter types for profile tabs
 */
export type AuthorFeedFilter =
  | "posts_with_replies"
  | "posts_no_replies"
  | "posts_with_media";

/**
 * Query keys for feed data
 */
export const feedKeys = {
  all: ["feed"] as const,
  timeline: (did: string) => [...feedKeys.all, "timeline", did] as const,
  pokemonFeed: (did: string) => [...feedKeys.all, "pokemon", did] as const,
  authorFeed: (actor: string, filter?: AuthorFeedFilter) =>
    [...feedKeys.all, "author", actor, filter ?? "default"] as const,
  actorLikes: (actor: string) => [...feedKeys.all, "likes", actor] as const,
};

/**
 * Hook for fetching the user's home timeline with infinite scroll
 */
export function useTimeline(did: string | null) {
  return useInfiniteQuery({
    queryKey: feedKeys.timeline(did ?? ""),
    queryFn: async ({ pageParam }) => {
      if (!did) throw new Error("Not authenticated");
      const result = await getTimelineAction({ cursor: pageParam, limit: 25 });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor : undefined,
    enabled: !!did,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching Pokemon-filtered feed with infinite scroll
 */
export function usePokemonFeed(did: string | null) {
  return useInfiniteQuery({
    queryKey: feedKeys.pokemonFeed(did ?? ""),
    queryFn: async ({ pageParam }) => {
      if (!did) throw new Error("Not authenticated");
      const result = await getPokemonFeedAction({
        cursor: pageParam,
        limit: 25,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor : undefined,
    enabled: !!did,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for fetching an author's feed with infinite scroll
 *
 * @param actor - The DID or handle of the user
 * @param filter - Optional filter for the feed type
 */
export function useAuthorFeed(actor: string, filter?: AuthorFeedFilter) {
  return useInfiniteQuery({
    queryKey: feedKeys.authorFeed(actor, filter),
    queryFn: async ({ pageParam }) => {
      const options: AuthorFeedOptions = {
        cursor: pageParam,
        limit: 25,
        filter,
      };
      const result = await getAuthorFeedAction(actor, options);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor : undefined,
    enabled: !!actor,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook for fetching posts liked by a user with infinite scroll
 *
 * @param actor - The DID or handle of the user
 */
export function useActorLikes(actor: string) {
  return useInfiniteQuery({
    queryKey: feedKeys.actorLikes(actor),
    queryFn: async ({ pageParam }) => {
      const result = await getActorLikesAction(actor, {
        cursor: pageParam,
        limit: 25,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor : undefined,
    enabled: !!actor,
    staleTime: 60 * 1000,
  });
}

/**
 * Flatten pages of feed data into a single array of posts
 */
export function flattenFeedPages(
  pages: Array<{ posts: AppBskyFeedDefs.FeedViewPost[] }> | undefined
): AppBskyFeedDefs.FeedViewPost[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.posts);
}
