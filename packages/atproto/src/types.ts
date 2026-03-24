/**
 * AT Protocol Types
 *
 * Shared type definitions for Bluesky API operations.
 * Platform-agnostic - can be used by web and mobile.
 */

import type { AppBskyActorDefs } from "@atproto/api";

// Re-export commonly used types from @atproto/api
export type { AppBskyActorDefs };
export type { Agent } from "@atproto/api";

/**
 * Simplified profile view for social graph results
 */
export interface ProfileView {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  /** Banner image URL */
  banner?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  /** The viewer's relationship with this profile */
  viewer?: {
    muted?: boolean;
    blockedBy?: boolean;
    blocking?: string; // URI of block record
    following?: string; // URI of follow record
    followedBy?: string; // URI of their follow record
  };
}

/**
 * Result from a follow operation
 */
export interface FollowResult {
  /** AT-URI of the follow record */
  uri: string;
  /** Content hash of the follow record */
  cid: string;
}

/**
 * Map API profile response to our ProfileView type
 */
export function mapProfile(
  profile: AppBskyActorDefs.ProfileView | AppBskyActorDefs.ProfileViewDetailed
): ProfileView {
  return {
    did: profile.did,
    handle: profile.handle,
    displayName: profile.displayName,
    description: profile.description,
    avatar: profile.avatar,
    banner: "banner" in profile ? profile.banner : undefined,
    followersCount:
      "followersCount" in profile ? profile.followersCount : undefined,
    followsCount: "followsCount" in profile ? profile.followsCount : undefined,
    postsCount: "postsCount" in profile ? profile.postsCount : undefined,
    viewer: profile.viewer
      ? {
          muted: profile.viewer.muted,
          blockedBy: profile.viewer.blockedBy,
          blocking: profile.viewer.blocking,
          following: profile.viewer.following,
          followedBy: profile.viewer.followedBy,
        }
      : undefined,
  };
}
