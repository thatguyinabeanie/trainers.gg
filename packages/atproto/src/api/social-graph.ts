/**
 * AT Protocol Social Graph API
 *
 * Functions for managing follows, blocks, mutes, and other social connections.
 * Follow/block/mute operations require an authenticated Agent.
 */

import type { Agent } from "@atproto/api";
import { withErrorHandling, getPublicAgent } from "../agent";
import { mapProfile } from "../types";
import type { ProfileView, FollowResult } from "../types";

// Re-export types for convenience
export type { ProfileView, FollowResult };

/**
 * Follow a user
 *
 * Creates a follow record on the user's PDS.
 *
 * @param agent - An authenticated Agent instance
 * @param targetDid - The DID of the user to follow
 * @returns The URI and CID of the created follow record
 */
export async function follow(
  agent: Agent,
  targetDid: string
): Promise<FollowResult> {
  return withErrorHandling(async () => {
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
 * @param agent - An authenticated Agent instance
 * @param followUri - The AT-URI of the follow record to delete
 */
export async function unfollow(agent: Agent, followUri: string): Promise<void> {
  return withErrorHandling(async () => {
    await agent.deleteFollow(followUri);
  });
}

/**
 * Get a user's profile
 *
 * @param actor - The DID or handle of the user
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns The profile view
 */
export async function getProfile(
  actor: string,
  agent?: Agent
): Promise<ProfileView | null> {
  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.getProfile({ actor });

    return mapProfile(response.data);
  });
}

/**
 * Get multiple user profiles
 *
 * @param actors - Array of DIDs or handles (max 25)
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns Array of profile views
 */
export async function getProfiles(
  actors: string[],
  agent?: Agent
): Promise<ProfileView[]> {
  if (actors.length === 0) return [];

  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    // API limits to 25 actors per request
    const chunks: string[][] = [];
    for (let i = 0; i < actors.length; i += 25) {
      chunks.push(actors.slice(i, i + 25));
    }

    const results: ProfileView[] = [];
    for (const chunk of chunks) {
      const response = await agentToUse.getProfiles({ actors: chunk });
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
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns List of followers with pagination
 */
export async function getFollowers(
  actor: string,
  cursor?: string,
  limit: number = 50,
  agent?: Agent
): Promise<{ followers: ProfileView[]; cursor?: string }> {
  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.getFollowers({
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
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns List of follows with pagination
 */
export async function getFollows(
  actor: string,
  cursor?: string,
  limit: number = 50,
  agent?: Agent
): Promise<{ follows: ProfileView[]; cursor?: string }> {
  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.getFollows({
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
 * @param agent - An authenticated Agent instance
 * @param targetDid - The DID of the user to block
 * @returns The URI of the block record
 */
export async function blockUser(
  agent: Agent,
  targetDid: string
): Promise<{ uri: string }> {
  return withErrorHandling(async () => {
    const did = agent.did;
    if (!did) {
      throw new Error("Agent must be authenticated");
    }

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
 * @param agent - An authenticated Agent instance
 * @param blockUri - The AT-URI of the block record
 */
export async function unblockUser(
  agent: Agent,
  blockUri: string
): Promise<void> {
  return withErrorHandling(async () => {
    const did = agent.did;
    if (!did) {
      throw new Error("Agent must be authenticated");
    }

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
 * @param agent - An authenticated Agent instance
 * @param targetDid - The DID of the user to mute
 */
export async function muteUser(agent: Agent, targetDid: string): Promise<void> {
  return withErrorHandling(async () => {
    await agent.mute(targetDid);
  });
}

/**
 * Unmute a user
 *
 * @param agent - An authenticated Agent instance
 * @param targetDid - The DID of the user to unmute
 */
export async function unmuteUser(
  agent: Agent,
  targetDid: string
): Promise<void> {
  return withErrorHandling(async () => {
    await agent.unmute(targetDid);
  });
}

/**
 * Search for users
 *
 * @param query - Search query
 * @param cursor - Pagination cursor
 * @param limit - Number of results (default 25)
 * @param agent - Optional agent to use (defaults to public agent)
 * @returns Matching profiles
 */
export async function searchUsers(
  query: string,
  cursor?: string,
  limit: number = 25,
  agent?: Agent
): Promise<{ actors: ProfileView[]; cursor?: string }> {
  return withErrorHandling(async () => {
    const agentToUse = agent ?? getPublicAgent();

    const response = await agentToUse.searchActors({
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
 * @param agent - An authenticated Agent instance
 * @param limit - Number of suggestions
 * @returns Suggested profiles to follow
 */
export async function getSuggestedFollows(
  agent: Agent,
  limit: number = 10
): Promise<ProfileView[]> {
  return withErrorHandling(async () => {
    const response = await agent.getSuggestions({ limit });

    return response.data.actors.map(mapProfile);
  });
}
