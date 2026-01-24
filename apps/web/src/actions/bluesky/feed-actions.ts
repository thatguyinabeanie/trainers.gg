/**
 * Bluesky Feed Server Actions
 *
 * Server Actions for fetching feed data. These wrap the AT Protocol API
 * layer and can be called from client components via TanStack Query.
 */

"use server";

import { getCurrentUserDid } from "@/lib/atproto/agent";
import {
  getTimeline,
  getPokemonFeed,
  getAuthorFeed,
  type FeedResult,
  type TimelineOptions,
  type AuthorFeedOptions,
} from "@/lib/atproto/api";

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get the authenticated user's home timeline
 */
export async function getTimelineAction(
  options: TimelineOptions = {}
): Promise<ActionResult<FeedResult>> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to view your timeline.",
      };
    }

    const result = await getTimeline(did, options);

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to fetch timeline:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Failed to fetch timeline. Please try again.",
    };
  }
}

/**
 * Get Pokemon-filtered feed for the authenticated user
 */
export async function getPokemonFeedAction(
  options: { cursor?: string; limit?: number } = {}
): Promise<ActionResult<FeedResult>> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to view the Pokemon feed.",
      };
    }

    const result = await getPokemonFeed(did, options);

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to fetch Pokemon feed:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Failed to fetch Pokemon feed. Please try again.",
    };
  }
}

/**
 * Get an author's public feed (no authentication required)
 */
export async function getAuthorFeedAction(
  actor: string,
  options: AuthorFeedOptions = {}
): Promise<ActionResult<FeedResult>> {
  try {
    const result = await getAuthorFeed(actor, options);

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to fetch author feed:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Failed to fetch author feed. Please try again.",
    };
  }
}
