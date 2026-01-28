/**
 * Bluesky Post Server Actions
 *
 * Server Actions for creating, deleting, and managing posts on Bluesky.
 * These actions handle authentication and can be called directly from client components.
 */

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserDid } from "@/lib/atproto/agent";
import { getErrorMessage } from "@/lib/utils";
import {
  createPost as apiCreatePost,
  deletePost as apiDeletePost,
  type CreatePostOptions,
} from "@/lib/atproto/api";

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new post on Bluesky
 *
 * @param text - The post text (max 300 graphemes)
 * @param options - Optional reply/embed settings
 * @returns The URI and CID of the created post
 *
 * @example
 * ```tsx
 * // In a client component
 * const result = await createBlueskyPost("Hello trainers!");
 * if (result.success) {
 *   console.log("Posted:", result.data.uri);
 * }
 * ```
 */
export async function createBlueskyPost(
  text: string,
  options?: Omit<CreatePostOptions, "images" | "external">
): Promise<ActionResult<{ uri: string; cid: string }>> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to post.",
      };
    }

    if (!text.trim()) {
      return {
        success: false,
        error: "Post cannot be empty.",
      };
    }

    const result = await apiCreatePost(did, text, options);

    // Revalidate feed pages
    revalidatePath("/feed");
    revalidatePath("/profile");

    return {
      success: true,
      data: { uri: result.uri, cid: result.cid },
    };
  } catch (error) {
    console.error("Failed to create Bluesky post:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create post. Please try again."),
    };
  }
}

/**
 * Reply to an existing post
 *
 * @param text - The reply text
 * @param parentUri - AT-URI of the post to reply to
 * @param parentCid - CID of the post to reply to
 * @param rootUri - AT-URI of the thread root (same as parent if replying to root)
 * @param rootCid - CID of the thread root
 * @returns The URI and CID of the created reply
 */
export async function replyToBlueskyPost(
  text: string,
  parentUri: string,
  parentCid: string,
  rootUri: string,
  rootCid: string
): Promise<ActionResult<{ uri: string; cid: string }>> {
  return createBlueskyPost(text, {
    reply: {
      parent: { uri: parentUri, cid: parentCid },
      root: { uri: rootUri, cid: rootCid },
    },
  });
}

/**
 * Quote an existing post
 *
 * @param text - The quote text
 * @param quoteUri - AT-URI of the post to quote
 * @param quoteCid - CID of the post to quote
 * @returns The URI and CID of the created quote post
 */
export async function quoteBlueskyPost(
  text: string,
  quoteUri: string,
  quoteCid: string
): Promise<ActionResult<{ uri: string; cid: string }>> {
  return createBlueskyPost(text, {
    quote: { uri: quoteUri, cid: quoteCid },
  });
}

/**
 * Delete a post
 *
 * @param postUri - The AT-URI of the post to delete
 */
export async function deleteBlueskyPost(
  postUri: string
): Promise<ActionResult> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to delete posts.",
      };
    }

    await apiDeletePost(did, postUri);

    // Revalidate feed pages
    revalidatePath("/feed");
    revalidatePath("/profile");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete Bluesky post:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete post. Please try again."),
    };
  }
}
