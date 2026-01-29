/**
 * Bluesky Profile Server Actions
 *
 * Server Actions for fetching and managing Bluesky profiles.
 * These actions handle authentication and can be called directly from client components.
 */

"use server";

import { getProfile, getProfiles } from "@/lib/atproto/api";
import { getErrorMessage } from "@/lib/utils";
import { serialize } from "@/lib/atproto/serialize";
import type { ProfileView } from "@/lib/atproto/api";

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get a Bluesky profile by handle or DID
 *
 * @param actor - The handle or DID of the user to fetch
 * @returns The profile view
 *
 * @example
 * ```tsx
 * const result = await getProfileAction("user.bsky.social");
 * if (result.success) {
 *   console.log(result.data.displayName);
 * }
 * ```
 */
export async function getProfileAction(
  actor: string
): Promise<ActionResult<ProfileView>> {
  try {
    if (!actor) {
      return {
        success: false,
        error: "Handle or DID is required.",
      };
    }

    const profile = await getProfile(actor);

    if (!profile) {
      return {
        success: false,
        error: "Profile not found.",
      };
    }

    return {
      success: true,
      data: serialize(profile),
    };
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    const message = getErrorMessage(
      error,
      "Failed to fetch profile. Please try again."
    );
    // Handle specific AT Protocol errors
    if (message.includes("not found")) {
      return { success: false, error: "Profile not found." };
    }
    return { success: false, error: message };
  }
}

/**
 * Get multiple Bluesky profiles by handle or DID
 *
 * @param actors - Array of handles or DIDs (max 25)
 * @returns Array of profile views
 */
export async function getProfilesAction(
  actors: string[]
): Promise<ActionResult<ProfileView[]>> {
  try {
    if (!actors || actors.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const profiles = await getProfiles(actors);

    return {
      success: true,
      data: serialize(profiles),
    };
  } catch (error) {
    console.error("Failed to fetch profiles:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "Failed to fetch profiles. Please try again."
      ),
    };
  }
}
