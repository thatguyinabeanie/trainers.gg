/**
 * AT Protocol Social Graph API
 *
 * Functions for managing follows, blocks, mutes, and other social connections.
 * Follow/block/mute operations require authentication.
 */

import type { AppBskyActorDefs } from "@atproto/api";
import {
  getAuthenticatedAgent,
  getPublicAgent,
  withErrorHandling,
} from "../agent";

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
 * Simplified profile view for social graph results
 */
export interface ProfileView {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
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
 * Follow a user
 *
 * Creates a follow record on the user's PDS.
 *
 * @param did - The user's DID (who is following)
 * @param targetDid - The DID of the user to follow
 * @returns The URI and CID of the created follow record
 *
 * @example
 * ```typescript
 * const { uri } = await follow("did:plc:xxx", "did:plc:yyy");
 * // Store uri to allow unfollowing later
 * ```
 */
export async function follow(
  did: string,
  targetDid: string
): Promise<FollowResult> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    const response = await agent.follow(targetDid);

    return {
      uri: response.uri,
      cid: response.cid,
    };
  });
}

/**
 * Unfollow a user (delete the follow record)
 *
 * @param did - The user's DID
 * @param followUri - The AT-URI of the follow record to delete
 *
 * @example
 * ```typescript
 * // followUri is the URI returned when you followed the user
 * await unfollow("did:plc:xxx", "at://did:plc:xxx/app.bsky.graph.follow/abc");
 * ```
 */
export async function unfollow(did: string, followUri: string): Promise<void> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    await agent.deleteFollow(followUri);
  });
}

/**
 * Get a user's profile
 *
 * @param actor - The DID or handle of the user
 * @returns The profile view
 */
export async function getProfile(actor: string): Promise<ProfileView | null> {
  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    const response = await agent.getProfile({ actor });

    return mapProfile(response.data);
  });
}

/**
 * Get multiple user profiles
 *
 * @param actors - Array of DIDs or handles (max 25)
 * @returns Array of profile views
 */
export async function getProfiles(actors: string[]): Promise<ProfileView[]> {
  if (actors.length === 0) return [];

  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    // API limits to 25 actors per request
    const chunks: string[][] = [];
    for (let i = 0; i < actors.length; i += 25) {
      chunks.push(actors.slice(i, i + 25));
    }

    const results: ProfileView[] = [];
    for (const chunk of chunks) {
      const response = await agent.getProfiles({ actors: chunk });
      results.push(...response.data.profiles.map(mapProfile));
    }

    return results;
  });
}

/**
 * Get a user's followers
 *
 * @param actor - The DID or handle of the user
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 50, max 100)
 * @returns List of followers with pagination
 */
export async function getFollowers(
  actor: string,
  cursor?: string,
  limit: number = 50
): Promise<{ followers: ProfileView[]; cursor?: string }> {
  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    const response = await agent.getFollowers({
      actor,
      limit,
      cursor,
    });

    return {
      followers: response.data.followers.map(mapProfile),
      cursor: response.data.cursor,
    };
  });
}

/**
 * Get users that a user follows
 *
 * @param actor - The DID or handle of the user
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 50, max 100)
 * @returns List of follows with pagination
 */
export async function getFollows(
  actor: string,
  cursor?: string,
  limit: number = 50
): Promise<{ follows: ProfileView[]; cursor?: string }> {
  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    const response = await agent.getFollows({
      actor,
      limit,
      cursor,
    });

    return {
      follows: response.data.follows.map(mapProfile),
      cursor: response.data.cursor,
    };
  });
}

/**
 * Block a user
 *
 * @param did - The user's DID (who is blocking)
 * @param targetDid - The DID of the user to block
 * @returns The URI of the block record
 */
export async function blockUser(
  did: string,
  targetDid: string
): Promise<{ uri: string }> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    const response = await agent.app.bsky.graph.block.create(
      { repo: did },
      {
        subject: targetDid,
        createdAt: new Date().toISOString(),
      }
    );

    return { uri: response.uri };
  });
}

/**
 * Unblock a user (delete the block record)
 *
 * @param did - The user's DID
 * @param blockUri - The AT-URI of the block record
 */
export async function unblockUser(
  did: string,
  blockUri: string
): Promise<void> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    // Parse the rkey from the URI
    const parts = blockUri.split("/");
    const rkey = parts[parts.length - 1];

    if (!rkey) {
      throw new Error("Invalid block URI");
    }

    await agent.app.bsky.graph.block.delete({
      repo: did,
      rkey,
    });
  });
}

/**
 * Mute a user
 *
 * @param did - The user's DID
 * @param targetDid - The DID of the user to mute
 */
export async function muteUser(did: string, targetDid: string): Promise<void> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    await agent.mute(targetDid);
  });
}

/**
 * Unmute a user
 *
 * @param did - The user's DID
 * @param targetDid - The DID of the user to unmute
 */
export async function unmuteUser(
  did: string,
  targetDid: string
): Promise<void> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    await agent.unmute(targetDid);
  });
}

/**
 * Search for users
 *
 * @param query - Search query
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 25)
 * @returns Matching profiles
 */
export async function searchUsers(
  query: string,
  cursor?: string,
  limit: number = 25
): Promise<{ actors: ProfileView[]; cursor?: string }> {
  return withErrorHandling(async () => {
    const agent = getPublicAgent();

    const response = await agent.searchActors({
      q: query,
      limit,
      cursor,
    });

    return {
      actors: response.data.actors.map(mapProfile),
      cursor: response.data.cursor,
    };
  });
}

/**
 * Get suggested follows for a user
 *
 * @param did - The user's DID (for personalized suggestions)
 * @param limit - Number of suggestions
 * @returns Suggested profiles to follow
 */
export async function getSuggestedFollows(
  did: string,
  limit: number = 10
): Promise<ProfileView[]> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    const response = await agent.getSuggestions({ limit });

    return response.data.actors.map(mapProfile);
  });
}

/**
 * Map API profile response to our ProfileView type
 */
function mapProfile(
  profile: AppBskyActorDefs.ProfileView | AppBskyActorDefs.ProfileViewDetailed
): ProfileView {
  return {
    did: profile.did,
    handle: profile.handle,
    displayName: profile.displayName,
    description: profile.description,
    avatar: profile.avatar,
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
