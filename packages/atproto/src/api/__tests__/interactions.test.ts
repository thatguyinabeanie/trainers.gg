/**
 * Tests for AT Protocol Interactions API
 */

import type { Agent } from "@atproto/api";
import {
  likePost,
  unlikePost,
  repost,
  unrepost,
  getLikes,
  getRepostedBy,
} from "../interactions";
import { BlueskyApiError, BlueskyAuthError } from "../../errors";

// Mock the agent module
jest.mock("../../agent", () => ({
  getPublicAgent: jest.fn(),
  withErrorHandling: jest.fn(
    <T>(fn: () => Promise<T>) => fn() // Pass through by default
  ),
}));

import { getPublicAgent } from "../../agent";

const mockGetPublicAgent = getPublicAgent as jest.MockedFunction<
  typeof getPublicAgent
>;

describe("interactions API", () => {
  // Create mock agent with all required methods
  let mockAgent: jest.Mocked<Agent>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a mock agent with all the methods we need
    mockAgent = {
      like: jest.fn(),
      deleteLike: jest.fn(),
      repost: jest.fn(),
      deleteRepost: jest.fn(),
      getLikes: jest.fn(),
      getRepostedBy: jest.fn(),
    } as unknown as jest.Mocked<Agent>;
  });

  describe("likePost", () => {
    const postUri = "at://did:plc:test123/app.bsky.feed.post/abc123";
    const postCid = "bafyreiabc123";

    it("creates a like and returns the like record URI and CID", async () => {
      const likeUri = "at://did:plc:test123/app.bsky.feed.like/like123";
      const likeCid = "bafyreilikeabc";

      mockAgent.like.mockResolvedValueOnce({
        uri: likeUri,
        cid: likeCid,
      });

      const result = await likePost(mockAgent, postUri, postCid);

      expect(mockAgent.like).toHaveBeenCalledWith(postUri, postCid);
      expect(mockAgent.like).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        uri: likeUri,
        cid: likeCid,
      });
    });

    it("returns different URIs and CIDs for different likes", async () => {
      const like1Uri = "at://did:plc:test123/app.bsky.feed.like/like1";
      const like1Cid = "bafyreilike1";
      const like2Uri = "at://did:plc:test123/app.bsky.feed.like/like2";
      const like2Cid = "bafyreilike2";

      mockAgent.like
        .mockResolvedValueOnce({
          uri: like1Uri,
          cid: like1Cid,
        })
        .mockResolvedValueOnce({
          uri: like2Uri,
          cid: like2Cid,
        });

      const result1 = await likePost(mockAgent, postUri, postCid);
      const result2 = await likePost(mockAgent, postUri, postCid);

      expect(result1).toEqual({ uri: like1Uri, cid: like1Cid });
      expect(result2).toEqual({ uri: like2Uri, cid: like2Cid });
    });

    it("propagates errors when like operation fails", async () => {
      const error = new BlueskyApiError(
        "Failed to create like",
        500,
        "ServerError"
      );
      mockAgent.like.mockRejectedValueOnce(error);

      await expect(likePost(mockAgent, postUri, postCid)).rejects.toThrow(
        error
      );
      expect(mockAgent.like).toHaveBeenCalledWith(postUri, postCid);
    });

    it("handles authentication errors", async () => {
      const authError = new BlueskyAuthError(
        "Your session has expired. Please sign in again."
      );
      mockAgent.like.mockRejectedValueOnce(authError);

      await expect(likePost(mockAgent, postUri, postCid)).rejects.toThrow(
        authError
      );
    });

    it("handles invalid post URI", async () => {
      const error = new BlueskyApiError(
        "Invalid request. Please check your input.",
        400,
        "InvalidRequest"
      );
      mockAgent.like.mockRejectedValueOnce(error);

      await expect(likePost(mockAgent, "invalid-uri", postCid)).rejects.toThrow(
        error
      );
    });

    it("handles post not found", async () => {
      const error = new BlueskyApiError(
        "The requested content was not found.",
        404,
        "RecordNotFound"
      );
      mockAgent.like.mockRejectedValueOnce(error);

      await expect(likePost(mockAgent, postUri, postCid)).rejects.toThrow(
        error
      );
    });
  });

  describe("unlikePost", () => {
    const likeUri = "at://did:plc:test123/app.bsky.feed.like/like123";

    it("deletes a like record successfully", async () => {
      mockAgent.deleteLike.mockResolvedValueOnce(undefined);

      await expect(unlikePost(mockAgent, likeUri)).resolves.toBeUndefined();
      expect(mockAgent.deleteLike).toHaveBeenCalledWith(likeUri);
      expect(mockAgent.deleteLike).toHaveBeenCalledTimes(1);
    });

    it("handles multiple unlike operations", async () => {
      const like1Uri = "at://did:plc:test123/app.bsky.feed.like/like1";
      const like2Uri = "at://did:plc:test123/app.bsky.feed.like/like2";

      mockAgent.deleteLike.mockResolvedValue(undefined);

      await unlikePost(mockAgent, like1Uri);
      await unlikePost(mockAgent, like2Uri);

      expect(mockAgent.deleteLike).toHaveBeenCalledTimes(2);
      expect(mockAgent.deleteLike).toHaveBeenNthCalledWith(1, like1Uri);
      expect(mockAgent.deleteLike).toHaveBeenNthCalledWith(2, like2Uri);
    });

    it("propagates errors when unlike operation fails", async () => {
      const error = new BlueskyApiError(
        "Failed to delete like",
        500,
        "ServerError"
      );
      mockAgent.deleteLike.mockRejectedValueOnce(error);

      await expect(unlikePost(mockAgent, likeUri)).rejects.toThrow(error);
      expect(mockAgent.deleteLike).toHaveBeenCalledWith(likeUri);
    });

    it("handles authentication errors", async () => {
      const authError = new BlueskyAuthError(
        "Your session has expired. Please sign in again."
      );
      mockAgent.deleteLike.mockRejectedValueOnce(authError);

      await expect(unlikePost(mockAgent, likeUri)).rejects.toThrow(authError);
    });

    it("handles like record not found", async () => {
      const error = new BlueskyApiError(
        "The requested content was not found.",
        404,
        "RecordNotFound"
      );
      mockAgent.deleteLike.mockRejectedValueOnce(error);

      await expect(unlikePost(mockAgent, likeUri)).rejects.toThrow(error);
    });

    it("handles invalid like URI", async () => {
      const error = new BlueskyApiError(
        "Invalid request. Please check your input.",
        400,
        "InvalidRequest"
      );
      mockAgent.deleteLike.mockRejectedValueOnce(error);

      await expect(unlikePost(mockAgent, "invalid-uri")).rejects.toThrow(error);
    });
  });

  describe("repost", () => {
    const postUri = "at://did:plc:test123/app.bsky.feed.post/abc123";
    const postCid = "bafyreiabc123";

    it("creates a repost and returns the repost record URI and CID", async () => {
      const repostUri = "at://did:plc:test123/app.bsky.feed.repost/repost123";
      const repostCid = "bafyreirepostabc";

      mockAgent.repost.mockResolvedValueOnce({
        uri: repostUri,
        cid: repostCid,
      });

      const result = await repost(mockAgent, postUri, postCid);

      expect(mockAgent.repost).toHaveBeenCalledWith(postUri, postCid);
      expect(mockAgent.repost).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        uri: repostUri,
        cid: repostCid,
      });
    });

    it("returns different URIs and CIDs for different reposts", async () => {
      const repost1Uri = "at://did:plc:test123/app.bsky.feed.repost/repost1";
      const repost1Cid = "bafyreirepost1";
      const repost2Uri = "at://did:plc:test123/app.bsky.feed.repost/repost2";
      const repost2Cid = "bafyreirepost2";

      mockAgent.repost
        .mockResolvedValueOnce({
          uri: repost1Uri,
          cid: repost1Cid,
        })
        .mockResolvedValueOnce({
          uri: repost2Uri,
          cid: repost2Cid,
        });

      const result1 = await repost(mockAgent, postUri, postCid);
      const result2 = await repost(mockAgent, postUri, postCid);

      expect(result1).toEqual({ uri: repost1Uri, cid: repost1Cid });
      expect(result2).toEqual({ uri: repost2Uri, cid: repost2Cid });
    });

    it("propagates errors when repost operation fails", async () => {
      const error = new BlueskyApiError(
        "Failed to create repost",
        500,
        "ServerError"
      );
      mockAgent.repost.mockRejectedValueOnce(error);

      await expect(repost(mockAgent, postUri, postCid)).rejects.toThrow(error);
      expect(mockAgent.repost).toHaveBeenCalledWith(postUri, postCid);
    });

    it("handles authentication errors", async () => {
      const authError = new BlueskyAuthError(
        "Your session has expired. Please sign in again."
      );
      mockAgent.repost.mockRejectedValueOnce(authError);

      await expect(repost(mockAgent, postUri, postCid)).rejects.toThrow(
        authError
      );
    });

    it("handles invalid post URI", async () => {
      const error = new BlueskyApiError(
        "Invalid request. Please check your input.",
        400,
        "InvalidRequest"
      );
      mockAgent.repost.mockRejectedValueOnce(error);

      await expect(repost(mockAgent, "invalid-uri", postCid)).rejects.toThrow(
        error
      );
    });

    it("handles post not found", async () => {
      const error = new BlueskyApiError(
        "The requested content was not found.",
        404,
        "RecordNotFound"
      );
      mockAgent.repost.mockRejectedValueOnce(error);

      await expect(repost(mockAgent, postUri, postCid)).rejects.toThrow(error);
    });

    it("handles rate limiting", async () => {
      const error = new BlueskyApiError(
        "Too many requests. Please wait a moment and try again.",
        429,
        "RateLimitExceeded"
      );
      mockAgent.repost.mockRejectedValueOnce(error);

      await expect(repost(mockAgent, postUri, postCid)).rejects.toThrow(error);
    });
  });

  describe("unrepost", () => {
    const repostUri = "at://did:plc:test123/app.bsky.feed.repost/repost123";

    it("deletes a repost record successfully", async () => {
      mockAgent.deleteRepost.mockResolvedValueOnce(undefined);

      await expect(unrepost(mockAgent, repostUri)).resolves.toBeUndefined();
      expect(mockAgent.deleteRepost).toHaveBeenCalledWith(repostUri);
      expect(mockAgent.deleteRepost).toHaveBeenCalledTimes(1);
    });

    it("handles multiple unrepost operations", async () => {
      const repost1Uri = "at://did:plc:test123/app.bsky.feed.repost/repost1";
      const repost2Uri = "at://did:plc:test123/app.bsky.feed.repost/repost2";

      mockAgent.deleteRepost.mockResolvedValue(undefined);

      await unrepost(mockAgent, repost1Uri);
      await unrepost(mockAgent, repost2Uri);

      expect(mockAgent.deleteRepost).toHaveBeenCalledTimes(2);
      expect(mockAgent.deleteRepost).toHaveBeenNthCalledWith(1, repost1Uri);
      expect(mockAgent.deleteRepost).toHaveBeenNthCalledWith(2, repost2Uri);
    });

    it("propagates errors when unrepost operation fails", async () => {
      const error = new BlueskyApiError(
        "Failed to delete repost",
        500,
        "ServerError"
      );
      mockAgent.deleteRepost.mockRejectedValueOnce(error);

      await expect(unrepost(mockAgent, repostUri)).rejects.toThrow(error);
      expect(mockAgent.deleteRepost).toHaveBeenCalledWith(repostUri);
    });

    it("handles authentication errors", async () => {
      const authError = new BlueskyAuthError(
        "Your session has expired. Please sign in again."
      );
      mockAgent.deleteRepost.mockRejectedValueOnce(authError);

      await expect(unrepost(mockAgent, repostUri)).rejects.toThrow(authError);
    });

    it("handles repost record not found", async () => {
      const error = new BlueskyApiError(
        "The requested content was not found.",
        404,
        "RecordNotFound"
      );
      mockAgent.deleteRepost.mockRejectedValueOnce(error);

      await expect(unrepost(mockAgent, repostUri)).rejects.toThrow(error);
    });

    it("handles invalid repost URI", async () => {
      const error = new BlueskyApiError(
        "Invalid request. Please check your input.",
        400,
        "InvalidRequest"
      );
      mockAgent.deleteRepost.mockRejectedValueOnce(error);

      await expect(unrepost(mockAgent, "invalid-uri")).rejects.toThrow(error);
    });
  });

  describe("getLikes", () => {
    const postUri = "at://did:plc:test123/app.bsky.feed.post/abc123";

    beforeEach(() => {
      mockGetPublicAgent.mockReturnValue(mockAgent);
    });

    it("fetches likes for a post", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          likes: [
            {
              actor: {
                did: "did:plc:user1",
                handle: "user1.bsky.social",
                displayName: "User One",
                avatar: "https://avatar.url/1",
              },
              createdAt: "2025-01-01T00:00:00Z",
            },
            {
              actor: {
                did: "did:plc:user2",
                handle: "user2.bsky.social",
                displayName: "User Two",
                avatar: "https://avatar.url/2",
              },
              createdAt: "2025-01-02T00:00:00Z",
            },
          ],
          cursor: "next-page-cursor",
        },
      };

      mockAgent.getLikes.mockResolvedValueOnce(mockResponse as never);

      const result = await getLikes(postUri);

      expect(mockAgent.getLikes).toHaveBeenCalledWith({
        uri: postUri,
        limit: 50,
        cursor: undefined,
      });
      expect(result).toEqual({
        likes: [
          {
            actor: {
              did: "did:plc:user1",
              handle: "user1.bsky.social",
              displayName: "User One",
              avatar: "https://avatar.url/1",
            },
            createdAt: "2025-01-01T00:00:00Z",
          },
          {
            actor: {
              did: "did:plc:user2",
              handle: "user2.bsky.social",
              displayName: "User Two",
              avatar: "https://avatar.url/2",
            },
            createdAt: "2025-01-02T00:00:00Z",
          },
        ],
        cursor: "next-page-cursor",
      });
    });

    it("uses provided agent instead of public agent", async () => {
      const customAgent = {
        getLikes: jest.fn(),
      } as unknown as jest.Mocked<Agent>;

      const mockResponse = {
        success: true,
        headers: {},
        data: {
          likes: [],
          cursor: undefined,
        },
      };

      customAgent.getLikes.mockResolvedValueOnce(mockResponse as never);

      await getLikes(postUri, undefined, 50, customAgent);

      expect(customAgent.getLikes).toHaveBeenCalledWith({
        uri: postUri,
        limit: 50,
        cursor: undefined,
      });
      expect(mockGetPublicAgent).not.toHaveBeenCalled();
    });

    it("supports custom limit parameter", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          likes: [],
          cursor: undefined,
        },
      };

      mockAgent.getLikes.mockResolvedValueOnce(mockResponse as never);

      await getLikes(postUri, undefined, 25);

      expect(mockAgent.getLikes).toHaveBeenCalledWith({
        uri: postUri,
        limit: 25,
        cursor: undefined,
      });
    });

    it("supports pagination with cursor", async () => {
      const cursor = "page-2-cursor";
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          likes: [
            {
              actor: {
                did: "did:plc:user3",
                handle: "user3.bsky.social",
                displayName: "User Three",
              },
              createdAt: "2025-01-03T00:00:00Z",
            },
          ],
          cursor: "page-3-cursor",
        },
      };

      mockAgent.getLikes.mockResolvedValueOnce(mockResponse as never);

      const result = await getLikes(postUri, cursor);

      expect(mockAgent.getLikes).toHaveBeenCalledWith({
        uri: postUri,
        limit: 50,
        cursor,
      });
      expect(result.cursor).toBe("page-3-cursor");
    });

    it("handles likes without optional fields", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          likes: [
            {
              actor: {
                did: "did:plc:minimal",
                handle: "minimal.bsky.social",
              },
              createdAt: "2025-01-01T00:00:00Z",
            },
          ],
          cursor: undefined,
        },
      };

      mockAgent.getLikes.mockResolvedValueOnce(mockResponse as never);

      const result = await getLikes(postUri);

      if (result.likes[0]) {
        expect(result.likes[0].actor).toEqual({
          did: "did:plc:minimal",
          handle: "minimal.bsky.social",
          displayName: undefined,
          avatar: undefined,
        });
      }
    });

    it("handles empty likes list", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          likes: [],
          cursor: undefined,
        },
      };

      mockAgent.getLikes.mockResolvedValueOnce(mockResponse as never);

      const result = await getLikes(postUri);

      expect(result.likes).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it("handles response without cursor", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          likes: [
            {
              actor: {
                did: "did:plc:user1",
                handle: "user1.bsky.social",
              },
              createdAt: "2025-01-01T00:00:00Z",
            },
          ],
          cursor: undefined,
        },
      };

      mockAgent.getLikes.mockResolvedValueOnce(mockResponse as never);

      const result = await getLikes(postUri);

      expect(result.cursor).toBeUndefined();
    });

    it("propagates errors when fetching likes fails", async () => {
      const error = new BlueskyApiError(
        "Failed to fetch likes",
        500,
        "ServerError"
      );
      mockAgent.getLikes.mockRejectedValueOnce(error);

      await expect(getLikes(postUri)).rejects.toThrow(error);
    });

    it("handles post not found", async () => {
      const error = new BlueskyApiError(
        "The requested content was not found.",
        404,
        "RecordNotFound"
      );
      mockAgent.getLikes.mockRejectedValueOnce(error);

      await expect(getLikes(postUri)).rejects.toThrow(error);
    });
  });

  describe("getRepostedBy", () => {
    const postUri = "at://did:plc:test123/app.bsky.feed.post/abc123";

    beforeEach(() => {
      mockGetPublicAgent.mockReturnValue(mockAgent);
    });

    it("fetches repost authors for a post", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          repostedBy: [
            {
              did: "did:plc:user1",
              handle: "user1.bsky.social",
              displayName: "User One",
              avatar: "https://avatar.url/1",
            },
            {
              did: "did:plc:user2",
              handle: "user2.bsky.social",
              displayName: "User Two",
              avatar: "https://avatar.url/2",
            },
          ],
          cursor: "next-page-cursor",
        },
      };

      mockAgent.getRepostedBy.mockResolvedValueOnce(mockResponse as never);

      const result = await getRepostedBy(postUri);

      expect(mockAgent.getRepostedBy).toHaveBeenCalledWith({
        uri: postUri,
        limit: 50,
        cursor: undefined,
      });
      expect(result).toEqual({
        repostedBy: [
          {
            did: "did:plc:user1",
            handle: "user1.bsky.social",
            displayName: "User One",
            avatar: "https://avatar.url/1",
          },
          {
            did: "did:plc:user2",
            handle: "user2.bsky.social",
            displayName: "User Two",
            avatar: "https://avatar.url/2",
          },
        ],
        cursor: "next-page-cursor",
      });
    });

    it("uses provided agent instead of public agent", async () => {
      const customAgent = {
        getRepostedBy: jest.fn(),
      } as unknown as jest.Mocked<Agent>;

      const mockResponse = {
        success: true,
        headers: {},
        data: {
          repostedBy: [],
          cursor: undefined,
        },
      };

      customAgent.getRepostedBy.mockResolvedValueOnce(mockResponse as never);

      await getRepostedBy(postUri, undefined, 50, customAgent);

      expect(customAgent.getRepostedBy).toHaveBeenCalledWith({
        uri: postUri,
        limit: 50,
        cursor: undefined,
      });
      expect(mockGetPublicAgent).not.toHaveBeenCalled();
    });

    it("supports custom limit parameter", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          repostedBy: [],
          cursor: undefined,
        },
      };

      mockAgent.getRepostedBy.mockResolvedValueOnce(mockResponse as never);

      await getRepostedBy(postUri, undefined, 25);

      expect(mockAgent.getRepostedBy).toHaveBeenCalledWith({
        uri: postUri,
        limit: 25,
        cursor: undefined,
      });
    });

    it("supports pagination with cursor", async () => {
      const cursor = "page-2-cursor";
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          repostedBy: [
            {
              did: "did:plc:user3",
              handle: "user3.bsky.social",
              displayName: "User Three",
            },
          ],
          cursor: "page-3-cursor",
        },
      };

      mockAgent.getRepostedBy.mockResolvedValueOnce(mockResponse as never);

      const result = await getRepostedBy(postUri, cursor);

      expect(mockAgent.getRepostedBy).toHaveBeenCalledWith({
        uri: postUri,
        limit: 50,
        cursor,
      });
      expect(result.cursor).toBe("page-3-cursor");
    });

    it("handles repost authors without optional fields", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          repostedBy: [
            {
              did: "did:plc:minimal",
              handle: "minimal.bsky.social",
            },
          ],
          cursor: undefined,
        },
      };

      mockAgent.getRepostedBy.mockResolvedValueOnce(mockResponse as never);

      const result = await getRepostedBy(postUri);

      if (result.repostedBy[0]) {
        expect(result.repostedBy[0]).toEqual({
          did: "did:plc:minimal",
          handle: "minimal.bsky.social",
          displayName: undefined,
          avatar: undefined,
        });
      }
    });

    it("handles empty repostedBy list", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          repostedBy: [],
          cursor: undefined,
        },
      };

      mockAgent.getRepostedBy.mockResolvedValueOnce(mockResponse as never);

      const result = await getRepostedBy(postUri);

      expect(result.repostedBy).toEqual([]);
      expect(result.cursor).toBeUndefined();
    });

    it("handles response without cursor", async () => {
      const mockResponse = {
        success: true,
        headers: {},
        data: {
          repostedBy: [
            {
              did: "did:plc:user1",
              handle: "user1.bsky.social",
            },
          ],
          cursor: undefined,
        },
      };

      mockAgent.getRepostedBy.mockResolvedValueOnce(mockResponse as never);

      const result = await getRepostedBy(postUri);

      expect(result.cursor).toBeUndefined();
    });

    it("propagates errors when fetching reposts fails", async () => {
      const error = new BlueskyApiError(
        "Failed to fetch reposts",
        500,
        "ServerError"
      );
      mockAgent.getRepostedBy.mockRejectedValueOnce(error);

      await expect(getRepostedBy(postUri)).rejects.toThrow(error);
    });

    it("handles post not found", async () => {
      const error = new BlueskyApiError(
        "The requested content was not found.",
        404,
        "RecordNotFound"
      );
      mockAgent.getRepostedBy.mockRejectedValueOnce(error);

      await expect(getRepostedBy(postUri)).rejects.toThrow(error);
    });

    it("handles invalid post URI", async () => {
      const error = new BlueskyApiError(
        "Invalid request. Please check your input.",
        400,
        "InvalidRequest"
      );
      mockAgent.getRepostedBy.mockRejectedValueOnce(error);

      await expect(getRepostedBy("invalid-uri")).rejects.toThrow(error);
    });

    it("handles rate limiting", async () => {
      const error = new BlueskyApiError(
        "Too many requests. Please wait a moment and try again.",
        429,
        "RateLimitExceeded"
      );
      mockAgent.getRepostedBy.mockRejectedValueOnce(error);

      await expect(getRepostedBy(postUri)).rejects.toThrow(error);
    });
  });
});
