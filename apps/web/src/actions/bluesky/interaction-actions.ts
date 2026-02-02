/**
 * Bluesky Interaction Server Actions
 *
 * Server Actions for liking, reposting, and other engagement actions.
 * These actions handle authentication and can be called directly from client components.
 */

"use server";

import { checkBotId } from "botid/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserDid } from "@/lib/atproto/agent";
import { getErrorMessage } from "@/lib/utils";
import {
  likePost as apiLikePost,
  unlikePost as apiUnlikePost,
  repost as apiRepost,
  unrepost as apiUnrepost,
} from "@/lib/atproto/api";

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Like a post
 *
 * @param postUri - The AT-URI of the post to like
 * @param postCid - The CID of the post to like
 * @returns The URI of the created like record (for unliking)
 *
 * @example
 * ```tsx
 * const result = await likeBlueskyPost(post.uri, post.cid);
 * if (result.success) {
 *   // Store result.data.likeUri to allow unliking
 * }
 * ```
 */
export async function likeBlueskyPost(
  postUri: string,
  postCid: string
): Promise<ActionResult<{ likeUri: string }>> {
  const { isBot } = await checkBotId();
  if (isBot) return { success: false, error: "Access denied" };

  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to like posts.",
      };
    }

    const result = await apiLikePost(did, postUri, postCid);

    return {
      success: true,
      data: { likeUri: result.uri },
    };
  } catch (error) {
    console.error("Failed to like post:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to like post. Please try again."),
    };
  }
}

/**
 * Unlike a post
 *
 * @param likeUri - The AT-URI of the like record to delete
 */
export async function unlikeBlueskyPost(
  likeUri: string
): Promise<ActionResult> {
  const { isBot } = await checkBotId();
  if (isBot) return { success: false, error: "Access denied" };

  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to unlike posts.",
      };
    }

    await apiUnlikePost(did, likeUri);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to unlike post:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to unlike post. Please try again."),
    };
  }
}

/**
 * Repost a post
 *
 * @param postUri - The AT-URI of the post to repost
 * @param postCid - The CID of the post to repost
 * @returns The URI of the created repost record (for unreposting)
 */
export async function repostBlueskyPost(
  postUri: string,
  postCid: string
): Promise<ActionResult<{ repostUri: string }>> {
  const { isBot } = await checkBotId();
  if (isBot) return { success: false, error: "Access denied" };

  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to repost.",
      };
    }

    const result = await apiRepost(did, postUri, postCid);

    // Revalidate feed to show the repost
    revalidatePath("/feed");

    return {
      success: true,
      data: { repostUri: result.uri },
    };
  } catch (error) {
    console.error("Failed to repost:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to repost. Please try again."),
    };
  }
}

/**
 * Remove a repost
 *
 * @param repostUri - The AT-URI of the repost record to delete
 */
export async function unrepostBlueskyPost(
  repostUri: string
): Promise<ActionResult> {
  const { isBot } = await checkBotId();
  if (isBot) return { success: false, error: "Access denied" };

  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to unrepost.",
      };
    }

    await apiUnrepost(did, repostUri);

    // Revalidate feed
    revalidatePath("/feed");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to unrepost:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to unrepost. Please try again."),
    };
  }
}

/**
 * Toggle like on a post
 *
 * Convenience action that likes or unlikes based on current state.
 *
 * @param postUri - The AT-URI of the post
 * @param postCid - The CID of the post
 * @param currentLikeUri - The current like URI if liked, undefined if not
 * @returns The new like URI if liked, null if unliked
 */
export async function toggleLikeBlueskyPost(
  postUri: string,
  postCid: string,
  currentLikeUri?: string
): Promise<ActionResult<{ likeUri: string | null }>> {
  if (currentLikeUri) {
    const result = await unlikeBlueskyPost(currentLikeUri);
    if (!result.success) {
      return result;
    }
    return { success: true, data: { likeUri: null } };
  } else {
    const result = await likeBlueskyPost(postUri, postCid);
    if (!result.success) {
      return result;
    }
    return { success: true, data: { likeUri: result.data.likeUri } };
  }
}

/**
 * Toggle repost on a post
 *
 * Convenience action that reposts or unreposts based on current state.
 *
 * @param postUri - The AT-URI of the post
 * @param postCid - The CID of the post
 * @param currentRepostUri - The current repost URI if reposted, undefined if not
 * @returns The new repost URI if reposted, null if unreposted
 */
export async function toggleRepostBlueskyPost(
  postUri: string,
  postCid: string,
  currentRepostUri?: string
): Promise<ActionResult<{ repostUri: string | null }>> {
  if (currentRepostUri) {
    const result = await unrepostBlueskyPost(currentRepostUri);
    if (!result.success) {
      return result;
    }
    return { success: true, data: { repostUri: null } };
  } else {
    const result = await repostBlueskyPost(postUri, postCid);
    if (!result.success) {
      return result;
    }
    return { success: true, data: { repostUri: result.data.repostUri } };
  }
}
