/**
 * AT Protocol Types
 *
 * Shared type definitions for Bluesky API operations.
 * Platform-agnostic - can be used by web and mobile.
 */

import type { AppBskyFeedDefs, AppBskyActorDefs, BlobRef } from "@atproto/api";

// Re-export commonly used types from @atproto/api
export type { AppBskyFeedDefs, AppBskyActorDefs, BlobRef };
export type { Agent } from "@atproto/api";

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
 * Result from creating a post
 */
export interface CreatePostResult {
  /** AT-URI of the created post */
  uri: string;
  /** Content hash of the post */
  cid: string;
}

/**
 * Options for creating a post
 */
export interface CreatePostOptions {
  /** Reply to an existing post */
  reply?: {
    /** Parent post to reply to */
    parent: { uri: string; cid: string };
    /** Root of the thread (same as parent if replying to root) */
    root: { uri: string; cid: string };
  };
  /** Quote another post */
  quote?: {
    uri: string;
    cid: string;
  };
  /** Embed images (blob references from uploadImage) */
  images?: Array<{
    /** Blob reference from uploadImage */
    blob: BlobRef;
    /** Alt text for accessibility */
    alt: string;
    /** Aspect ratio (optional) */
    aspectRatio?: { width: number; height: number };
  }>;
  /** External link embed */
  external?: {
    uri: string;
    title: string;
    description: string;
    thumb?: BlobRef;
  };
  /** Language tags (e.g., ["en", "ja"]) */
  langs?: string[];
  /** Labels/tags for the post */
  labels?: string[];
}

/**
 * Result from a like operation
 */
export interface LikeResult {
  /** AT-URI of the like record */
  uri: string;
  /** Content hash of the like record */
  cid: string;
}

/**
 * Result from a repost operation
 */
export interface RepostResult {
  /** AT-URI of the repost record */
  uri: string;
  /** Content hash of the repost record */
  cid: string;
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
