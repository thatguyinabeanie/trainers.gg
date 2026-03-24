/**
 * Shared AT Protocol mock builders for tests.
 *
 * Provides mock Agent and data type builders used across
 * social-graph test suites.
 */

import type { Agent, AppBskyActorDefs } from "@atproto/api";

/**
 * Create a mock Agent with social-graph methods (follow, block, mute, etc.)
 */
export const createMockAgent = (overrides?: Partial<Agent>): Agent => {
  return {
    did: "did:plc:test123",
    follow: jest.fn(),
    deleteFollow: jest.fn(),
    getProfile: jest.fn(),
    getProfiles: jest.fn(),
    getFollowers: jest.fn(),
    getFollows: jest.fn(),
    mute: jest.fn(),
    unmute: jest.fn(),
    getSuggestions: jest.fn(),
    searchActors: jest.fn(),
    app: {
      bsky: {
        graph: {
          block: {
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
      },
    },
    ...overrides,
  } as unknown as Agent;
};

/**
 * Create a mock ProfileView (basic profile data)
 */
export const createMockProfileView = (
  overrides?: Partial<AppBskyActorDefs.ProfileView>
): AppBskyActorDefs.ProfileView => {
  return {
    did: "did:plc:user123",
    handle: "user.bsky.social",
    displayName: "Test User",
    description: "Test description",
    avatar: "https://example.com/avatar.jpg",
    viewer: {
      muted: false,
      blockedBy: false,
    },
    ...overrides,
  } as AppBskyActorDefs.ProfileView;
};

/**
 * Create a mock ProfileViewDetailed (profile with stats)
 */
export const createMockProfileViewDetailed = (
  overrides?: Partial<AppBskyActorDefs.ProfileViewDetailed>
): AppBskyActorDefs.ProfileViewDetailed => {
  return {
    did: "did:plc:user123",
    handle: "user.bsky.social",
    displayName: "Test User",
    description: "Test description",
    avatar: "https://example.com/avatar.jpg",
    banner: "https://example.com/banner.jpg",
    followersCount: 100,
    followsCount: 50,
    postsCount: 200,
    viewer: {
      muted: false,
      blockedBy: false,
    },
    ...overrides,
  } as AppBskyActorDefs.ProfileViewDetailed;
};
