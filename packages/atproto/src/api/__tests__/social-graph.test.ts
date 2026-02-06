/**
 * Tests for AT Protocol Social Graph API
 */

import type { Agent } from "@atproto/api";
import type { AppBskyActorDefs } from "@atproto/api";
import {
  follow,
  unfollow,
  getProfile,
  getProfiles,
  getFollowers,
  getFollows,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  searchUsers,
  getSuggestedFollows,
} from "../social-graph";
import { getPublicAgent } from "../../agent";

// Mock dependencies
jest.mock("../../agent", () => ({
  getPublicAgent: jest.fn(),
  withErrorHandling: jest.fn((fn) => fn()),
}));

// Mock console.error to avoid cluttering test output
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

describe("social-graph", () => {
  // Helper to create mock Agent
  const createMockAgent = (overrides?: Partial<Agent>): Agent => {
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

  // Helper to create mock ProfileView
  const createMockProfileView = (
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

  // Helper to create mock ProfileViewDetailed
  const createMockProfileViewDetailed = (
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

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("follow", () => {
    it("creates a follow record and returns URI and CID", async () => {
      const agent = createMockAgent();
      const targetDid = "did:plc:target123";

      (agent.follow as jest.Mock).mockResolvedValue({
        uri: "at://did:plc:test123/app.bsky.graph.follow/abc123",
        cid: "bafyreicid123",
      });

      const result = await follow(agent, targetDid);

      expect(agent.follow).toHaveBeenCalledWith(targetDid);
      expect(result).toEqual({
        uri: "at://did:plc:test123/app.bsky.graph.follow/abc123",
        cid: "bafyreicid123",
      });
    });

    it("passes different target DIDs correctly", async () => {
      const agent = createMockAgent();
      const targetDid = "did:plc:another456";

      (agent.follow as jest.Mock).mockResolvedValue({
        uri: "at://did:plc:test123/app.bsky.graph.follow/def456",
        cid: "bafyreicid456",
      });

      await follow(agent, targetDid);

      expect(agent.follow).toHaveBeenCalledWith(targetDid);
    });
  });

  describe("unfollow", () => {
    it("deletes a follow record", async () => {
      const agent = createMockAgent();
      const followUri = "at://did:plc:test123/app.bsky.graph.follow/abc123";

      (agent.deleteFollow as jest.Mock).mockResolvedValue(undefined);

      await unfollow(agent, followUri);

      expect(agent.deleteFollow).toHaveBeenCalledWith(followUri);
    });

    it("handles different follow URIs", async () => {
      const agent = createMockAgent();
      const followUri = "at://did:plc:test123/app.bsky.graph.follow/xyz789";

      (agent.deleteFollow as jest.Mock).mockResolvedValue(undefined);

      await unfollow(agent, followUri);

      expect(agent.deleteFollow).toHaveBeenCalledWith(followUri);
    });
  });

  describe("getProfile", () => {
    it("fetches a profile and maps to ProfileView", async () => {
      const agent = createMockAgent();
      const mockProfile = createMockProfileViewDetailed();

      (agent.getProfile as jest.Mock).mockResolvedValue({
        data: mockProfile,
      });

      const result = await getProfile("user.bsky.social", agent);

      expect(agent.getProfile).toHaveBeenCalledWith({
        actor: "user.bsky.social",
      });
      expect(result).toEqual({
        did: mockProfile.did,
        handle: mockProfile.handle,
        displayName: mockProfile.displayName,
        description: mockProfile.description,
        avatar: mockProfile.avatar,
        banner: mockProfile.banner,
        followersCount: mockProfile.followersCount,
        followsCount: mockProfile.followsCount,
        postsCount: mockProfile.postsCount,
        viewer: {
          muted: mockProfile.viewer?.muted,
          blockedBy: mockProfile.viewer?.blockedBy,
          blocking: undefined,
          following: undefined,
          followedBy: undefined,
        },
      });
    });

    it("uses public agent when no agent provided", async () => {
      const publicAgent = createMockAgent();
      const mockProfile = createMockProfileView();

      (getPublicAgent as jest.Mock).mockReturnValue(publicAgent);
      (publicAgent.getProfile as jest.Mock).mockResolvedValue({
        data: mockProfile,
      });

      await getProfile("user.bsky.social");

      expect(getPublicAgent).toHaveBeenCalled();
      expect(publicAgent.getProfile).toHaveBeenCalledWith({
        actor: "user.bsky.social",
      });
    });

    it("handles ProfileView (without detailed fields)", async () => {
      const agent = createMockAgent();
      const mockProfile = createMockProfileView();

      (agent.getProfile as jest.Mock).mockResolvedValue({
        data: mockProfile,
      });

      const result = await getProfile("user.bsky.social", agent);

      expect(result).toEqual({
        did: mockProfile.did,
        handle: mockProfile.handle,
        displayName: mockProfile.displayName,
        description: mockProfile.description,
        avatar: mockProfile.avatar,
        banner: undefined,
        followersCount: undefined,
        followsCount: undefined,
        postsCount: undefined,
        viewer: {
          muted: mockProfile.viewer?.muted,
          blockedBy: mockProfile.viewer?.blockedBy,
          blocking: undefined,
          following: undefined,
          followedBy: undefined,
        },
      });
    });

    it("handles profile with viewer relationship data", async () => {
      const agent = createMockAgent();
      const mockProfile = createMockProfileViewDetailed({
        viewer: {
          muted: true,
          blockedBy: false,
          blocking: "at://did:plc:test123/app.bsky.graph.block/block123",
          following: "at://did:plc:test123/app.bsky.graph.follow/follow123",
          followedBy:
            "at://did:plc:user123/app.bsky.graph.follow/followback123",
        },
      });

      (agent.getProfile as jest.Mock).mockResolvedValue({
        data: mockProfile,
      });

      const result = await getProfile("user.bsky.social", agent);

      if (result) {
        expect(result.viewer).toEqual({
          muted: true,
          blockedBy: false,
          blocking: "at://did:plc:test123/app.bsky.graph.block/block123",
          following: "at://did:plc:test123/app.bsky.graph.follow/follow123",
          followedBy:
            "at://did:plc:user123/app.bsky.graph.follow/followback123",
        });
      }
    });

    it("handles profile without viewer data", async () => {
      const agent = createMockAgent();
      const mockProfile = createMockProfileView({
        viewer: undefined,
      });

      (agent.getProfile as jest.Mock).mockResolvedValue({
        data: mockProfile,
      });

      const result = await getProfile("user.bsky.social", agent);

      if (result) {
        expect(result.viewer).toBeUndefined();
      }
    });

    it("accepts DID as actor parameter", async () => {
      const agent = createMockAgent();
      const did = "did:plc:user123";
      const mockProfile = createMockProfileView();

      (agent.getProfile as jest.Mock).mockResolvedValue({
        data: mockProfile,
      });

      await getProfile(did, agent);

      expect(agent.getProfile).toHaveBeenCalledWith({ actor: did });
    });
  });

  describe("getProfiles", () => {
    it("returns empty array for empty input", async () => {
      const result = await getProfiles([]);
      expect(result).toEqual([]);
    });

    it("fetches multiple profiles in a single request (under 25)", async () => {
      const agent = createMockAgent();
      const actors = ["user1.bsky.social", "user2.bsky.social"];
      const mockProfiles = [
        createMockProfileView({ handle: "user1.bsky.social" }),
        createMockProfileView({ handle: "user2.bsky.social" }),
      ];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: mockProfiles },
      });

      const result = await getProfiles(actors);

      expect(agent.getProfiles).toHaveBeenCalledWith({ actors });
      expect(result).toHaveLength(2);
      if (result[0]) expect(result[0].handle).toBe("user1.bsky.social");
      if (result[1]) expect(result[1].handle).toBe("user2.bsky.social");
    });

    it("chunks requests into groups of 25", async () => {
      const agent = createMockAgent();
      const actors = Array.from(
        { length: 30 },
        (_, i) => `user${i}.bsky.social`
      );
      const mockProfiles1 = Array.from({ length: 25 }, (_, i) =>
        createMockProfileView({ handle: `user${i}.bsky.social` })
      );
      const mockProfiles2 = Array.from({ length: 5 }, (_, i) =>
        createMockProfileView({ handle: `user${i + 25}.bsky.social` })
      );

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getProfiles as jest.Mock)
        .mockResolvedValueOnce({ data: { profiles: mockProfiles1 } })
        .mockResolvedValueOnce({ data: { profiles: mockProfiles2 } });

      const result = await getProfiles(actors);

      expect(agent.getProfiles).toHaveBeenCalledTimes(2);
      expect(agent.getProfiles).toHaveBeenNthCalledWith(1, {
        actors: actors.slice(0, 25),
      });
      expect(agent.getProfiles).toHaveBeenNthCalledWith(2, {
        actors: actors.slice(25, 30),
      });
      expect(result).toHaveLength(30);
    });

    it("preserves order across chunks", async () => {
      const agent = createMockAgent();
      const actors = Array.from(
        { length: 30 },
        (_, i) => `user${i}.bsky.social`
      );
      const mockProfiles1 = Array.from({ length: 25 }, (_, i) =>
        createMockProfileView({
          handle: `user${i}.bsky.social`,
          did: `did:plc:user${i}`,
        })
      );
      const mockProfiles2 = Array.from({ length: 5 }, (_, i) =>
        createMockProfileView({
          handle: `user${i + 25}.bsky.social`,
          did: `did:plc:user${i + 25}`,
        })
      );

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getProfiles as jest.Mock)
        .mockResolvedValueOnce({ data: { profiles: mockProfiles1 } })
        .mockResolvedValueOnce({ data: { profiles: mockProfiles2 } });

      const result = await getProfiles(actors);

      // Check first and last items
      if (result[0]) expect(result[0].handle).toBe("user0.bsky.social");
      if (result[24]) expect(result[24].handle).toBe("user24.bsky.social");
      if (result[25]) expect(result[25].handle).toBe("user25.bsky.social");
      if (result[29]) expect(result[29].handle).toBe("user29.bsky.social");
    });

    it("handles exactly 25 actors (no chunking needed)", async () => {
      const agent = createMockAgent();
      const actors = Array.from(
        { length: 25 },
        (_, i) => `user${i}.bsky.social`
      );
      const mockProfiles = Array.from({ length: 25 }, (_, i) =>
        createMockProfileView({ handle: `user${i}.bsky.social` })
      );

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: mockProfiles },
      });

      const result = await getProfiles(actors);

      expect(agent.getProfiles).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(25);
    });

    it("handles exactly 26 actors (two chunks)", async () => {
      const agent = createMockAgent();
      const actors = Array.from(
        { length: 26 },
        (_, i) => `user${i}.bsky.social`
      );
      const mockProfiles1 = Array.from({ length: 25 }, (_, i) =>
        createMockProfileView({ handle: `user${i}.bsky.social` })
      );
      const mockProfiles2 = [
        createMockProfileView({ handle: "user25.bsky.social" }),
      ];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getProfiles as jest.Mock)
        .mockResolvedValueOnce({ data: { profiles: mockProfiles1 } })
        .mockResolvedValueOnce({ data: { profiles: mockProfiles2 } });

      const result = await getProfiles(actors);

      expect(agent.getProfiles).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(26);
    });

    it("handles 75 actors (three chunks)", async () => {
      const agent = createMockAgent();
      const actors = Array.from(
        { length: 75 },
        (_, i) => `user${i}.bsky.social`
      );

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getProfiles as jest.Mock).mockImplementation(({ actors }) => {
        return Promise.resolve({
          data: {
            profiles: actors.map((handle: string) =>
              createMockProfileView({ handle })
            ),
          },
        });
      });

      const result = await getProfiles(actors);

      expect(agent.getProfiles).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(75);
    });

    it("uses provided agent when specified", async () => {
      const customAgent = createMockAgent();
      const actors = ["user.bsky.social"];
      const mockProfiles = [createMockProfileView()];

      (customAgent.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: mockProfiles },
      });

      await getProfiles(actors, customAgent);

      expect(customAgent.getProfiles).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });

    it("maps ProfileView fields correctly", async () => {
      const agent = createMockAgent();
      const actors = ["user.bsky.social"];
      const mockProfile = createMockProfileView({
        did: "did:plc:mapped123",
        handle: "mapped.bsky.social",
        displayName: "Mapped User",
        description: "Mapped description",
        avatar: "https://example.com/mapped.jpg",
      });

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getProfiles as jest.Mock).mockResolvedValue({
        data: { profiles: [mockProfile] },
      });

      const result = await getProfiles(actors);

      if (result[0]) {
        expect(result[0]).toEqual({
          did: "did:plc:mapped123",
          handle: "mapped.bsky.social",
          displayName: "Mapped User",
          description: "Mapped description",
          avatar: "https://example.com/mapped.jpg",
          banner: undefined,
          followersCount: undefined,
          followsCount: undefined,
          postsCount: undefined,
          viewer: {
            muted: false,
            blockedBy: false,
            blocking: undefined,
            following: undefined,
            followedBy: undefined,
          },
        });
      }
    });
  });

  describe("getFollowers", () => {
    it("fetches followers with default limit", async () => {
      const agent = createMockAgent();
      const mockFollowers = [
        createMockProfileView({ handle: "follower1.bsky.social" }),
        createMockProfileView({ handle: "follower2.bsky.social" }),
      ];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollowers as jest.Mock).mockResolvedValue({
        data: {
          followers: mockFollowers,
          cursor: "next-cursor",
        },
      });

      const result = await getFollowers("user.bsky.social");

      expect(agent.getFollowers).toHaveBeenCalledWith({
        actor: "user.bsky.social",
        limit: 50,
        cursor: undefined,
      });
      expect(result.followers).toHaveLength(2);
      expect(result.cursor).toBe("next-cursor");
    });

    it("fetches followers with custom limit", async () => {
      const agent = createMockAgent();
      const mockFollowers = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollowers as jest.Mock).mockResolvedValue({
        data: { followers: mockFollowers, cursor: undefined },
      });

      await getFollowers("user.bsky.social", undefined, 25);

      expect(agent.getFollowers).toHaveBeenCalledWith({
        actor: "user.bsky.social",
        limit: 25,
        cursor: undefined,
      });
    });

    it("fetches followers with pagination cursor", async () => {
      const agent = createMockAgent();
      const mockFollowers = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollowers as jest.Mock).mockResolvedValue({
        data: { followers: mockFollowers, cursor: undefined },
      });

      await getFollowers("user.bsky.social", "pagination-cursor", 50);

      expect(agent.getFollowers).toHaveBeenCalledWith({
        actor: "user.bsky.social",
        limit: 50,
        cursor: "pagination-cursor",
      });
    });

    it("handles response without cursor (end of pagination)", async () => {
      const agent = createMockAgent();
      const mockFollowers = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollowers as jest.Mock).mockResolvedValue({
        data: { followers: mockFollowers, cursor: undefined },
      });

      const result = await getFollowers("user.bsky.social");

      expect(result.cursor).toBeUndefined();
    });

    it("maps follower profiles correctly", async () => {
      const agent = createMockAgent();
      const mockFollower = createMockProfileViewDetailed({
        handle: "follower.bsky.social",
        followersCount: 100,
      });

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollowers as jest.Mock).mockResolvedValue({
        data: { followers: [mockFollower], cursor: undefined },
      });

      const result = await getFollowers("user.bsky.social");

      if (result.followers[0]) {
        expect(result.followers[0].handle).toBe("follower.bsky.social");
        expect(result.followers[0].followersCount).toBe(100);
      }
    });

    it("uses provided agent when specified", async () => {
      const customAgent = createMockAgent();
      const mockFollowers = [createMockProfileView()];

      (customAgent.getFollowers as jest.Mock).mockResolvedValue({
        data: { followers: mockFollowers, cursor: undefined },
      });

      await getFollowers("user.bsky.social", undefined, 50, customAgent);

      expect(customAgent.getFollowers).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });
  });

  describe("getFollows", () => {
    it("fetches follows with default limit", async () => {
      const agent = createMockAgent();
      const mockFollows = [
        createMockProfileView({ handle: "following1.bsky.social" }),
        createMockProfileView({ handle: "following2.bsky.social" }),
      ];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollows as jest.Mock).mockResolvedValue({
        data: {
          follows: mockFollows,
          cursor: "next-cursor",
        },
      });

      const result = await getFollows("user.bsky.social");

      expect(agent.getFollows).toHaveBeenCalledWith({
        actor: "user.bsky.social",
        limit: 50,
        cursor: undefined,
      });
      expect(result.follows).toHaveLength(2);
      expect(result.cursor).toBe("next-cursor");
    });

    it("fetches follows with custom limit", async () => {
      const agent = createMockAgent();
      const mockFollows = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollows as jest.Mock).mockResolvedValue({
        data: { follows: mockFollows, cursor: undefined },
      });

      await getFollows("user.bsky.social", undefined, 25);

      expect(agent.getFollows).toHaveBeenCalledWith({
        actor: "user.bsky.social",
        limit: 25,
        cursor: undefined,
      });
    });

    it("fetches follows with pagination cursor", async () => {
      const agent = createMockAgent();
      const mockFollows = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollows as jest.Mock).mockResolvedValue({
        data: { follows: mockFollows, cursor: undefined },
      });

      await getFollows("user.bsky.social", "pagination-cursor", 50);

      expect(agent.getFollows).toHaveBeenCalledWith({
        actor: "user.bsky.social",
        limit: 50,
        cursor: "pagination-cursor",
      });
    });

    it("handles response without cursor (end of pagination)", async () => {
      const agent = createMockAgent();
      const mockFollows = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollows as jest.Mock).mockResolvedValue({
        data: { follows: mockFollows, cursor: undefined },
      });

      const result = await getFollows("user.bsky.social");

      expect(result.cursor).toBeUndefined();
    });

    it("maps follow profiles correctly", async () => {
      const agent = createMockAgent();
      const mockFollow = createMockProfileViewDetailed({
        handle: "following.bsky.social",
        followersCount: 200,
      });

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.getFollows as jest.Mock).mockResolvedValue({
        data: { follows: [mockFollow], cursor: undefined },
      });

      const result = await getFollows("user.bsky.social");

      if (result.follows[0]) {
        expect(result.follows[0].handle).toBe("following.bsky.social");
        expect(result.follows[0].followersCount).toBe(200);
      }
    });

    it("uses provided agent when specified", async () => {
      const customAgent = createMockAgent();
      const mockFollows = [createMockProfileView()];

      (customAgent.getFollows as jest.Mock).mockResolvedValue({
        data: { follows: mockFollows, cursor: undefined },
      });

      await getFollows("user.bsky.social", undefined, 50, customAgent);

      expect(customAgent.getFollows).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });
  });

  describe("blockUser", () => {
    it("creates a block record and returns URI", async () => {
      const agent = createMockAgent();
      const targetDid = "did:plc:target123";
      const mockDate = new Date("2024-01-01T00:00:00Z");

      jest.spyOn(global, "Date").mockImplementation(() => mockDate as Date);

      (agent.app.bsky.graph.block.create as jest.Mock).mockResolvedValue({
        uri: "at://did:plc:test123/app.bsky.graph.block/block123",
      });

      const result = await blockUser(agent, targetDid);

      expect(agent.app.bsky.graph.block.create).toHaveBeenCalledWith(
        { repo: "did:plc:test123" },
        {
          subject: targetDid,
          createdAt: mockDate.toISOString(),
        }
      );
      expect(result).toEqual({
        uri: "at://did:plc:test123/app.bsky.graph.block/block123",
      });

      jest.restoreAllMocks();
    });

    it("throws error when agent is not authenticated", async () => {
      const agent = createMockAgent({ did: undefined });

      await expect(blockUser(agent, "did:plc:target123")).rejects.toThrow(
        "Agent must be authenticated"
      );

      expect(agent.app.bsky.graph.block.create).not.toHaveBeenCalled();
    });

    it("handles different target DIDs", async () => {
      const agent = createMockAgent();
      const targetDid = "did:plc:different456";

      (agent.app.bsky.graph.block.create as jest.Mock).mockResolvedValue({
        uri: "at://did:plc:test123/app.bsky.graph.block/different123",
      });

      await blockUser(agent, targetDid);

      expect(agent.app.bsky.graph.block.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ subject: targetDid })
      );
    });
  });

  describe("unblockUser", () => {
    it("deletes a block record", async () => {
      const agent = createMockAgent();
      const blockUri = "at://did:plc:test123/app.bsky.graph.block/block123";

      (agent.app.bsky.graph.block.delete as jest.Mock).mockResolvedValue(
        undefined
      );

      await unblockUser(agent, blockUri);

      expect(agent.app.bsky.graph.block.delete).toHaveBeenCalledWith({
        repo: "did:plc:test123",
        rkey: "block123",
      });
    });

    it("throws error when agent is not authenticated", async () => {
      const agent = createMockAgent({ did: undefined });

      await expect(
        unblockUser(agent, "at://did:plc:test123/app.bsky.graph.block/block123")
      ).rejects.toThrow("Agent must be authenticated");

      expect(agent.app.bsky.graph.block.delete).not.toHaveBeenCalled();
    });

    it("throws error when URI ends with slash (no rkey)", async () => {
      const agent = createMockAgent();
      const invalidUri = "at://did:plc:test123/app.bsky.graph.block/";

      await expect(unblockUser(agent, invalidUri)).rejects.toThrow(
        "Invalid block URI"
      );

      expect(agent.app.bsky.graph.block.delete).not.toHaveBeenCalled();
    });

    it("extracts rkey correctly from complex URIs", async () => {
      const agent = createMockAgent();
      const blockUri =
        "at://did:plc:test123/app.bsky.graph.block/3k7qwerty123456";

      (agent.app.bsky.graph.block.delete as jest.Mock).mockResolvedValue(
        undefined
      );

      await unblockUser(agent, blockUri);

      expect(agent.app.bsky.graph.block.delete).toHaveBeenCalledWith({
        repo: "did:plc:test123",
        rkey: "3k7qwerty123456",
      });
    });
  });

  describe("muteUser", () => {
    it("mutes a user", async () => {
      const agent = createMockAgent();
      const targetDid = "did:plc:target123";

      (agent.mute as jest.Mock).mockResolvedValue(undefined);

      await muteUser(agent, targetDid);

      expect(agent.mute).toHaveBeenCalledWith(targetDid);
    });

    it("handles different target DIDs", async () => {
      const agent = createMockAgent();
      const targetDid = "did:plc:another456";

      (agent.mute as jest.Mock).mockResolvedValue(undefined);

      await muteUser(agent, targetDid);

      expect(agent.mute).toHaveBeenCalledWith(targetDid);
    });
  });

  describe("unmuteUser", () => {
    it("unmutes a user", async () => {
      const agent = createMockAgent();
      const targetDid = "did:plc:target123";

      (agent.unmute as jest.Mock).mockResolvedValue(undefined);

      await unmuteUser(agent, targetDid);

      expect(agent.unmute).toHaveBeenCalledWith(targetDid);
    });

    it("handles different target DIDs", async () => {
      const agent = createMockAgent();
      const targetDid = "did:plc:another456";

      (agent.unmute as jest.Mock).mockResolvedValue(undefined);

      await unmuteUser(agent, targetDid);

      expect(agent.unmute).toHaveBeenCalledWith(targetDid);
    });
  });

  describe("searchUsers", () => {
    it("searches for users with default limit", async () => {
      const agent = createMockAgent();
      const mockActors = [
        createMockProfileView({ handle: "search1.bsky.social" }),
        createMockProfileView({ handle: "search2.bsky.social" }),
      ];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.searchActors as jest.Mock).mockResolvedValue({
        data: {
          actors: mockActors,
          cursor: "next-cursor",
        },
      });

      const result = await searchUsers("pokemon");

      expect(agent.searchActors).toHaveBeenCalledWith({
        q: "pokemon",
        limit: 25,
        cursor: undefined,
      });
      expect(result.actors).toHaveLength(2);
      expect(result.cursor).toBe("next-cursor");
    });

    it("searches with custom limit", async () => {
      const agent = createMockAgent();
      const mockActors = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.searchActors as jest.Mock).mockResolvedValue({
        data: { actors: mockActors, cursor: undefined },
      });

      await searchUsers("query", undefined, 50);

      expect(agent.searchActors).toHaveBeenCalledWith({
        q: "query",
        limit: 50,
        cursor: undefined,
      });
    });

    it("searches with pagination cursor", async () => {
      const agent = createMockAgent();
      const mockActors = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.searchActors as jest.Mock).mockResolvedValue({
        data: { actors: mockActors, cursor: undefined },
      });

      await searchUsers("query", "pagination-cursor", 25);

      expect(agent.searchActors).toHaveBeenCalledWith({
        q: "query",
        limit: 25,
        cursor: "pagination-cursor",
      });
    });

    it("handles response without cursor (end of results)", async () => {
      const agent = createMockAgent();
      const mockActors = [createMockProfileView()];

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.searchActors as jest.Mock).mockResolvedValue({
        data: { actors: mockActors, cursor: undefined },
      });

      const result = await searchUsers("query");

      expect(result.cursor).toBeUndefined();
    });

    it("maps actor profiles correctly", async () => {
      const agent = createMockAgent();
      const mockActor = createMockProfileViewDetailed({
        handle: "pokemon.bsky.social",
        displayName: "Pokemon Trainer",
      });

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.searchActors as jest.Mock).mockResolvedValue({
        data: { actors: [mockActor], cursor: undefined },
      });

      const result = await searchUsers("pokemon");

      if (result.actors[0]) {
        expect(result.actors[0].handle).toBe("pokemon.bsky.social");
        expect(result.actors[0].displayName).toBe("Pokemon Trainer");
      }
    });

    it("uses provided agent when specified", async () => {
      const customAgent = createMockAgent();
      const mockActors = [createMockProfileView()];

      (customAgent.searchActors as jest.Mock).mockResolvedValue({
        data: { actors: mockActors, cursor: undefined },
      });

      await searchUsers("query", undefined, 25, customAgent);

      expect(customAgent.searchActors).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });

    it("handles empty search results", async () => {
      const agent = createMockAgent();

      (getPublicAgent as jest.Mock).mockReturnValue(agent);
      (agent.searchActors as jest.Mock).mockResolvedValue({
        data: { actors: [], cursor: undefined },
      });

      const result = await searchUsers("nonexistent");

      expect(result.actors).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });
  });

  describe("getSuggestedFollows", () => {
    it("fetches suggested follows with default limit", async () => {
      const agent = createMockAgent();
      const mockActors = [
        createMockProfileView({ handle: "suggestion1.bsky.social" }),
        createMockProfileView({ handle: "suggestion2.bsky.social" }),
      ];

      (agent.getSuggestions as jest.Mock).mockResolvedValue({
        data: { actors: mockActors },
      });

      const result = await getSuggestedFollows(agent);

      expect(agent.getSuggestions).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toHaveLength(2);
      if (result[0]) {
        expect(result[0].handle).toBe("suggestion1.bsky.social");
      }
    });

    it("fetches suggested follows with custom limit", async () => {
      const agent = createMockAgent();
      const mockActors = [createMockProfileView()];

      (agent.getSuggestions as jest.Mock).mockResolvedValue({
        data: { actors: mockActors },
      });

      await getSuggestedFollows(agent, 20);

      expect(agent.getSuggestions).toHaveBeenCalledWith({ limit: 20 });
    });

    it("maps suggested profiles correctly", async () => {
      const agent = createMockAgent();
      const mockActor = createMockProfileViewDetailed({
        handle: "suggested.bsky.social",
        displayName: "Suggested User",
        followersCount: 500,
      });

      (agent.getSuggestions as jest.Mock).mockResolvedValue({
        data: { actors: [mockActor] },
      });

      const result = await getSuggestedFollows(agent);

      if (result[0]) {
        expect(result[0].handle).toBe("suggested.bsky.social");
        expect(result[0].displayName).toBe("Suggested User");
        expect(result[0].followersCount).toBe(500);
      }
    });

    it("handles empty suggestions", async () => {
      const agent = createMockAgent();

      (agent.getSuggestions as jest.Mock).mockResolvedValue({
        data: { actors: [] },
      });

      const result = await getSuggestedFollows(agent);

      expect(result).toEqual([]);
    });

    it("handles multiple suggested profiles", async () => {
      const agent = createMockAgent();
      const mockActors = Array.from({ length: 15 }, (_, i) =>
        createMockProfileView({ handle: `suggestion${i}.bsky.social` })
      );

      (agent.getSuggestions as jest.Mock).mockResolvedValue({
        data: { actors: mockActors },
      });

      const result = await getSuggestedFollows(agent, 15);

      expect(result).toHaveLength(15);
      expect(agent.getSuggestions).toHaveBeenCalledWith({ limit: 15 });
    });
  });
});
