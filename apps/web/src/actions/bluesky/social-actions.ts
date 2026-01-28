/**
 * Bluesky Social Server Actions
 *
 * Server Actions for following, blocking, muting, and other social graph actions.
 * These actions handle authentication and can be called directly from client components.
 */

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserDid } from "@/lib/atproto/agent";
import { getErrorMessage } from "@/lib/utils";
import {
  follow as apiFollow,
  unfollow as apiUnfollow,
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
  muteUser as apiMuteUser,
  unmuteUser as apiUnmuteUser,
  getFollowers as apiGetFollowers,
  getFollows as apiGetFollows,
  type ProfileView,
} from "@/lib/atproto/api";

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Follow a user
 *
 * @param targetDid - The DID of the user to follow
 * @returns The URI of the created follow record (for unfollowing)
 *
 * @example
 * ```tsx
 * const result = await followBlueskyUser(profile.did);
 * if (result.success) {
 *   // Store result.data.followUri to allow unfollowing
 * }
 * ```
 */
export async function followBlueskyUser(
  targetDid: string
): Promise<ActionResult<{ followUri: string }>> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to follow users.",
      };
    }

    if (did === targetDid) {
      return {
        success: false,
        error: "You cannot follow yourself.",
      };
    }

    const result = await apiFollow(did, targetDid);

    // Revalidate profile pages
    revalidatePath("/profile");

    return {
      success: true,
      data: { followUri: result.uri },
    };
  } catch (error) {
    console.error("Failed to follow user:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to follow user. Please try again."),
    };
  }
}

/**
 * Unfollow a user
 *
 * @param followUri - The AT-URI of the follow record to delete
 */
export async function unfollowBlueskyUser(
  followUri: string
): Promise<ActionResult> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to unfollow users.",
      };
    }

    await apiUnfollow(did, followUri);

    // Revalidate profile pages
    revalidatePath("/profile");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to unfollow user:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Failed to unfollow user. Please try again."
      ),
    };
  }
}

/**
 * Toggle follow on a user
 *
 * Convenience action that follows or unfollows based on current state.
 *
 * @param targetDid - The DID of the user
 * @param currentFollowUri - The current follow URI if following, undefined if not
 * @returns The new follow URI if following, null if unfollowed
 */
export async function toggleFollowBlueskyUser(
  targetDid: string,
  currentFollowUri?: string
): Promise<ActionResult<{ followUri: string | null }>> {
  if (currentFollowUri) {
    const result = await unfollowBlueskyUser(currentFollowUri);
    if (!result.success) {
      return result;
    }
    return { success: true, data: { followUri: null } };
  } else {
    const result = await followBlueskyUser(targetDid);
    if (!result.success) {
      return result;
    }
    return { success: true, data: { followUri: result.data.followUri } };
  }
}

/**
 * Block a user
 *
 * @param targetDid - The DID of the user to block
 * @returns The URI of the block record
 */
export async function blockBlueskyUser(
  targetDid: string
): Promise<ActionResult<{ blockUri: string }>> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to block users.",
      };
    }

    if (did === targetDid) {
      return {
        success: false,
        error: "You cannot block yourself.",
      };
    }

    const result = await apiBlockUser(did, targetDid);

    // Revalidate profile pages
    revalidatePath("/profile");
    revalidatePath("/feed");

    return {
      success: true,
      data: { blockUri: result.uri },
    };
  } catch (error) {
    console.error("Failed to block user:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to block user. Please try again."),
    };
  }
}

/**
 * Unblock a user
 *
 * @param blockUri - The AT-URI of the block record to delete
 */
export async function unblockBlueskyUser(
  blockUri: string
): Promise<ActionResult> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to unblock users.",
      };
    }

    await apiUnblockUser(did, blockUri);

    // Revalidate profile pages
    revalidatePath("/profile");
    revalidatePath("/feed");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to unblock user:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Failed to unblock user. Please try again."
      ),
    };
  }
}

/**
 * Mute a user
 *
 * @param targetDid - The DID of the user to mute
 */
export async function muteBlueskyUser(
  targetDid: string
): Promise<ActionResult> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to mute users.",
      };
    }

    await apiMuteUser(did, targetDid);

    // Revalidate feed
    revalidatePath("/feed");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to mute user:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to mute user. Please try again."),
    };
  }
}

/**
 * Unmute a user
 *
 * @param targetDid - The DID of the user to unmute
 */
export async function unmuteBlueskyUser(
  targetDid: string
): Promise<ActionResult> {
  try {
    const did = await getCurrentUserDid();

    if (!did) {
      return {
        success: false,
        error: "You must be signed in with Bluesky to unmute users.",
      };
    }

    await apiUnmuteUser(did, targetDid);

    // Revalidate feed
    revalidatePath("/feed");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to unmute user:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to unmute user. Please try again."),
    };
  }
}

/**
 * Toggle mute on a user
 *
 * @param targetDid - The DID of the user
 * @param isMuted - Current mute state
 */
export async function toggleMuteBlueskyUser(
  targetDid: string,
  isMuted: boolean
): Promise<ActionResult> {
  if (isMuted) {
    return unmuteBlueskyUser(targetDid);
  } else {
    return muteBlueskyUser(targetDid);
  }
}

/**
 * Result type for followers/following lists
 */
export interface FollowListResult {
  profiles: ProfileView[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * Get a user's followers
 *
 * @param actor - The DID or handle of the user
 * @param cursor - Pagination cursor
 * @param limit - Number of results
 */
export async function getFollowersAction(
  actor: string,
  options: { cursor?: string; limit?: number } = {}
): Promise<ActionResult<FollowListResult>> {
  try {
    const { cursor, limit = 50 } = options;
    const result = await apiGetFollowers(actor, cursor, limit);

    return {
      success: true,
      data: {
        profiles: result.followers,
        cursor: result.cursor,
        hasMore: !!result.cursor,
      },
    };
  } catch (error) {
    console.error("Failed to fetch followers:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Failed to fetch followers. Please try again."
      ),
    };
  }
}

/**
 * Get users that a user follows
 *
 * @param actor - The DID or handle of the user
 * @param cursor - Pagination cursor
 * @param limit - Number of results
 */
export async function getFollowsAction(
  actor: string,
  options: { cursor?: string; limit?: number } = {}
): Promise<ActionResult<FollowListResult>> {
  try {
    const { cursor, limit = 50 } = options;
    const result = await apiGetFollows(actor, cursor, limit);

    return {
      success: true,
      data: {
        profiles: result.follows,
        cursor: result.cursor,
        hasMore: !!result.cursor,
      },
    };
  } catch (error) {
    console.error("Failed to fetch follows:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Failed to fetch following. Please try again."
      ),
    };
  }
}
