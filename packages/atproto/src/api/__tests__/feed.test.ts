/**
 * Tests for AT Protocol Feed API
 */

import type { AppBskyFeedDefs } from "@atproto/api";
import {
  getTimeline,
  getAuthorFeed,
  getActorLikes,
  getPost,
  getPosts,
  getPostThread,
  getPokemonFeed,
  searchPosts,
} from "../feed";
import { getPublicAgent, withErrorHandling } from "../../agent";
import { BlueskyApiError } from "../../errors";
import {
  createMockFeedAgent,
  createMockPost,
  createMockPostView,
} from "@trainers/test-utils/mocks";

// Mock dependencies
jest.mock("../../agent");
jest.mock("../../config", () => ({
  ...jest.requireActual("../../config"),
  isPokemonContent: jest.fn(),
}));

// Import mocked function for type-safe access
import { isPokemonContent } from "../../config";
const mockIsPokemonContent = isPokemonContent as jest.MockedFunction<
  typeof isPokemonContent
>;

// Mock console.error to avoid cluttering test output
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

describe("feed API", () => {
  // Helper to create mock ThreadViewPost
  const createMockThreadViewPost = (
    uri: string,
    text: string
  ): AppBskyFeedDefs.ThreadViewPost => ({
    $type: "app.bsky.feed.defs#threadViewPost",
    post: createMockPostView(uri, text),
    replies: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockClear();

    // Mock withErrorHandling to pass through by default
    (withErrorHandling as jest.Mock).mockImplementation(
      async (fn: () => unknown) => fn()
    );

    // Mock getPublicAgent
    (getPublicAgent as jest.Mock).mockReturnValue(createMockFeedAgent());
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("getTimeline", () => {
    it("fetches timeline with default options", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = [
        createMockPost("at://did/post1", "Hello world"),
        createMockPost("at://did/post2", "Another post"),
      ];

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      const result = await getTimeline(agent);

      expect(agent.getTimeline).toHaveBeenCalledWith({
        limit: 50,
        cursor: undefined,
      });
      expect(result).toEqual({
        posts: mockPosts,
        cursor: "next-cursor",
        hasMore: true,
      });
    });

    it("fetches timeline with custom limit and cursor", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = [createMockPost("at://did/post1", "Test")];

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: undefined,
        },
      });

      const result = await getTimeline(agent, { limit: 25, cursor: "cursor1" });

      expect(agent.getTimeline).toHaveBeenCalledWith({
        limit: 25,
        cursor: "cursor1",
      });
      expect(result).toEqual({
        posts: mockPosts,
        cursor: undefined,
        hasMore: false,
      });
    });

    it("filters to Pokemon content when pokemonOnly is true", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = [
        createMockPost("at://did/post1", "Check out this #pokemon"),
        createMockPost("at://did/post2", "Random post"),
        createMockPost("at://did/post3", "VGC tournament results"),
      ];

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      // Mock isPokemonContent to filter posts
      mockIsPokemonContent.mockImplementation((text: string) => {
        return text.includes("pokemon") || text.includes("VGC");
      });

      const result = await getTimeline(agent, { pokemonOnly: true });

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0]?.post.uri).toBe("at://did/post1");
      expect(result.posts[1]?.post.uri).toBe("at://did/post3");
      expect(mockIsPokemonContent).toHaveBeenCalledTimes(3);
    });

    it("returns empty array when no Pokemon content found", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = [
        createMockPost("at://did/post1", "Random post"),
        createMockPost("at://did/post2", "Another random post"),
      ];

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: undefined,
        },
      });

      mockIsPokemonContent.mockReturnValue(false);

      const result = await getTimeline(agent, { pokemonOnly: true });

      expect(result.posts).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it("handles posts without text in record", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = [
        {
          post: {
            uri: "at://did/post1",
            cid: "cid1",
            author: {
              did: "did:plc:test",
              handle: "test.bsky.social",
            },
            record: {}, // No text field
            indexedAt: new Date().toISOString(),
          },
        } as AppBskyFeedDefs.FeedViewPost,
        createMockPost("at://did/post2", "#pokemon"),
      ];

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: undefined,
        },
      });

      mockIsPokemonContent.mockReturnValue(true);

      const result = await getTimeline(agent, { pokemonOnly: true });

      // Only the post with text should be included
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]?.post.uri).toBe("at://did/post2");
    });

    it("sets hasMore to false when cursor is undefined", async () => {
      const agent = createMockFeedAgent();

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: [createMockPost("at://did/post1", "Test")],
          cursor: undefined,
        },
      });

      const result = await getTimeline(agent);

      expect(result.hasMore).toBe(false);
    });
  });

  describe("getAuthorFeed", () => {
    it("fetches author feed with default options", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const mockPosts = [
        createMockPost("at://did/post1", "Author post 1"),
        createMockPost("at://did/post2", "Author post 2"),
      ];

      (mockAgent.getAuthorFeed as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      const result = await getAuthorFeed("did:plc:test");

      expect(mockAgent.getAuthorFeed).toHaveBeenCalledWith({
        actor: "did:plc:test",
        limit: 50,
        cursor: undefined,
        filter: undefined,
      });
      expect(result).toEqual({
        posts: mockPosts,
        cursor: "next-cursor",
        hasMore: true,
      });
    });

    it("uses custom agent when provided", async () => {
      const customAgent = createMockFeedAgent();
      const mockPosts = [createMockPost("at://did/post1", "Test")];

      (customAgent.getAuthorFeed as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: undefined,
        },
      });

      await getAuthorFeed("test.bsky.social", {}, customAgent);

      expect(customAgent.getAuthorFeed).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });

    it("supports filter options", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      (mockAgent.getAuthorFeed as jest.Mock).mockResolvedValue({
        data: { feed: [], cursor: undefined },
      });

      await getAuthorFeed("did:plc:test", {
        filter: "posts_no_replies",
        limit: 30,
        cursor: "cursor1",
      });

      expect(mockAgent.getAuthorFeed).toHaveBeenCalledWith({
        actor: "did:plc:test",
        limit: 30,
        cursor: "cursor1",
        filter: "posts_no_replies",
      });
    });
  });

  describe("getActorLikes", () => {
    it("fetches actor likes with default options", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const mockPosts = [
        createMockPost("at://did/post1", "Liked post 1"),
        createMockPost("at://did/post2", "Liked post 2"),
      ];

      (mockAgent.app.bsky.feed.getActorLikes as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      const result = await getActorLikes("did:plc:test");

      expect(mockAgent.app.bsky.feed.getActorLikes).toHaveBeenCalledWith({
        actor: "did:plc:test",
        limit: 50,
        cursor: undefined,
      });
      expect(result).toEqual({
        posts: mockPosts,
        cursor: "next-cursor",
        hasMore: true,
      });
    });

    it("uses custom agent when provided", async () => {
      const customAgent = createMockFeedAgent();

      (customAgent.app.bsky.feed.getActorLikes as jest.Mock).mockResolvedValue({
        data: { feed: [], cursor: undefined },
      });

      await getActorLikes("did:plc:test", {}, customAgent);

      expect(customAgent.app.bsky.feed.getActorLikes).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });

    it("supports custom limit and cursor", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      (mockAgent.app.bsky.feed.getActorLikes as jest.Mock).mockResolvedValue({
        data: { feed: [], cursor: undefined },
      });

      await getActorLikes("did:plc:test", { limit: 20, cursor: "cursor1" });

      expect(mockAgent.app.bsky.feed.getActorLikes).toHaveBeenCalledWith({
        actor: "did:plc:test",
        limit: 20,
        cursor: "cursor1",
      });
    });
  });

  describe("getPost", () => {
    it("fetches a single post by URI", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const mockPost = createMockPostView("at://did/post1", "Test post");

      (mockAgent.getPosts as jest.Mock).mockResolvedValue({
        data: {
          posts: [mockPost],
        },
      });

      const result = await getPost("at://did/post1");

      expect(mockAgent.getPosts).toHaveBeenCalledWith({
        uris: ["at://did/post1"],
      });
      expect(result).toEqual(mockPost);
    });

    it("returns null when post is not found", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      (mockAgent.getPosts as jest.Mock).mockResolvedValue({
        data: {
          posts: [],
        },
      });

      const result = await getPost("at://did/nonexistent");

      expect(result).toBeNull();
    });

    it("uses custom agent when provided", async () => {
      const customAgent = createMockFeedAgent();

      (customAgent.getPosts as jest.Mock).mockResolvedValue({
        data: { posts: [createMockPostView("at://did/post1", "Test")] },
      });

      await getPost("at://did/post1", customAgent);

      expect(customAgent.getPosts).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });
  });

  describe("getPosts", () => {
    it("returns empty array when no URIs provided", async () => {
      const result = await getPosts([]);

      expect(result).toEqual([]);
      expect(withErrorHandling).not.toHaveBeenCalled();
    });

    it("fetches posts in single request when URIs < 25", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const uris = Array.from({ length: 10 }, (_, i) => `at://did/post${i}`);
      const mockPosts = uris.map((uri) => createMockPostView(uri, "Test"));

      (mockAgent.getPosts as jest.Mock).mockResolvedValue({
        data: { posts: mockPosts },
      });

      const result = await getPosts(uris);

      expect(mockAgent.getPosts).toHaveBeenCalledTimes(1);
      expect(mockAgent.getPosts).toHaveBeenCalledWith({ uris });
      expect(result).toEqual(mockPosts);
    });

    it("fetches exactly 25 posts in single request", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const uris = Array.from({ length: 25 }, (_, i) => `at://did/post${i}`);
      const mockPosts = uris.map((uri) => createMockPostView(uri, "Test"));

      (mockAgent.getPosts as jest.Mock).mockResolvedValue({
        data: { posts: mockPosts },
      });

      const result = await getPosts(uris);

      expect(mockAgent.getPosts).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(25);
    });

    it("fetches posts in chunks of 25 when URIs > 25", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const uris = Array.from({ length: 30 }, (_, i) => `at://did/post${i}`);
      const mockPosts1 = uris
        .slice(0, 25)
        .map((uri) => createMockPostView(uri, "Test"));
      const mockPosts2 = uris
        .slice(25, 30)
        .map((uri) => createMockPostView(uri, "Test"));

      (mockAgent.getPosts as jest.Mock)
        .mockResolvedValueOnce({ data: { posts: mockPosts1 } })
        .mockResolvedValueOnce({ data: { posts: mockPosts2 } });

      const result = await getPosts(uris);

      expect(mockAgent.getPosts).toHaveBeenCalledTimes(2);
      expect(mockAgent.getPosts).toHaveBeenNthCalledWith(1, {
        uris: uris.slice(0, 25),
      });
      expect(mockAgent.getPosts).toHaveBeenNthCalledWith(2, {
        uris: uris.slice(25, 30),
      });
      expect(result).toHaveLength(30);
    });

    it("fetches posts in multiple chunks when URIs = 50", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const uris = Array.from({ length: 50 }, (_, i) => `at://did/post${i}`);
      const mockPosts1 = uris
        .slice(0, 25)
        .map((uri) => createMockPostView(uri, "Test"));
      const mockPosts2 = uris
        .slice(25, 50)
        .map((uri) => createMockPostView(uri, "Test"));

      (mockAgent.getPosts as jest.Mock)
        .mockResolvedValueOnce({ data: { posts: mockPosts1 } })
        .mockResolvedValueOnce({ data: { posts: mockPosts2 } });

      const result = await getPosts(uris);

      expect(mockAgent.getPosts).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(50);
    });

    it("fetches posts in multiple chunks when URIs > 100", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const uris = Array.from({ length: 120 }, (_, i) => `at://did/post${i}`);

      // Mock 5 chunks: 25 + 25 + 25 + 25 + 20
      for (let i = 0; i < 5; i++) {
        const start = i * 25;
        const end = Math.min(start + 25, 120);
        const mockPosts = uris
          .slice(start, end)
          .map((uri) => createMockPostView(uri, "Test"));
        (mockAgent.getPosts as jest.Mock).mockResolvedValueOnce({
          data: { posts: mockPosts },
        });
      }

      const result = await getPosts(uris);

      expect(mockAgent.getPosts).toHaveBeenCalledTimes(5);
      expect(result).toHaveLength(120);

      // Verify chunks were called with correct URIs
      expect(mockAgent.getPosts).toHaveBeenNthCalledWith(1, {
        uris: uris.slice(0, 25),
      });
      expect(mockAgent.getPosts).toHaveBeenNthCalledWith(2, {
        uris: uris.slice(25, 50),
      });
      expect(mockAgent.getPosts).toHaveBeenNthCalledWith(3, {
        uris: uris.slice(50, 75),
      });
      expect(mockAgent.getPosts).toHaveBeenNthCalledWith(4, {
        uris: uris.slice(75, 100),
      });
      expect(mockAgent.getPosts).toHaveBeenNthCalledWith(5, {
        uris: uris.slice(100, 120),
      });
    });

    it("preserves order of posts across chunks", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const uris = Array.from({ length: 30 }, (_, i) => `at://did/post${i}`);
      const mockPosts1 = uris
        .slice(0, 25)
        .map((uri, i) => createMockPostView(uri, `Test ${i}`));
      const mockPosts2 = uris
        .slice(25, 30)
        .map((uri, i) => createMockPostView(uri, `Test ${i + 25}`));

      (mockAgent.getPosts as jest.Mock)
        .mockResolvedValueOnce({ data: { posts: mockPosts1 } })
        .mockResolvedValueOnce({ data: { posts: mockPosts2 } });

      const result = await getPosts(uris);

      // Verify order is preserved
      result.forEach((post, i) => {
        expect(post.uri).toBe(`at://did/post${i}`);
      });
    });

    it("uses custom agent when provided", async () => {
      const customAgent = createMockFeedAgent();

      (customAgent.getPosts as jest.Mock).mockResolvedValue({
        data: { posts: [] },
      });

      await getPosts(["at://did/post1"], customAgent);

      expect(customAgent.getPosts).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });
  });

  describe("getPostThread", () => {
    it("fetches post thread with default options", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const mockThread = createMockThreadViewPost("at://did/post1", "Thread");

      (mockAgent.getPostThread as jest.Mock).mockResolvedValue({
        data: {
          thread: mockThread,
        },
      });

      const result = await getPostThread("at://did/post1");

      expect(mockAgent.getPostThread).toHaveBeenCalledWith({
        uri: "at://did/post1",
        depth: 6,
        parentHeight: 80,
      });
      expect(result).toEqual(mockThread);
    });

    it("fetches post thread with custom depth and parentHeight", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const mockThread = createMockThreadViewPost("at://did/post1", "Thread");

      (mockAgent.getPostThread as jest.Mock).mockResolvedValue({
        data: { thread: mockThread },
      });

      const result = await getPostThread("at://did/post1", 10, 100);

      expect(mockAgent.getPostThread).toHaveBeenCalledWith({
        uri: "at://did/post1",
        depth: 10,
        parentHeight: 100,
      });
      expect(result).toEqual(mockThread);
    });

    it("returns null when thread type is not threadViewPost", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      (mockAgent.getPostThread as jest.Mock).mockResolvedValue({
        data: {
          thread: {
            $type: "app.bsky.feed.defs#notFoundPost",
          },
        },
      });

      const result = await getPostThread("at://did/nonexistent");

      expect(result).toBeNull();
    });

    it("uses custom agent when provided", async () => {
      const customAgent = createMockFeedAgent();

      const mockThread = createMockThreadViewPost("at://did/post1", "Thread");

      (customAgent.getPostThread as jest.Mock).mockResolvedValue({
        data: { thread: mockThread },
      });

      await getPostThread("at://did/post1", 6, 80, customAgent);

      expect(customAgent.getPostThread).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });
  });

  describe("getPokemonFeed", () => {
    it("fetches Pokemon feed with default options", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = Array.from({ length: 25 }, (_, i) =>
        createMockPost(`at://did/post${i}`, `Pokemon post ${i}`)
      );

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      mockIsPokemonContent.mockReturnValue(true);

      const result = await getPokemonFeed(agent);

      // Should fetch 3x limit (75) but cap at 100
      expect(agent.getTimeline).toHaveBeenCalledWith({
        limit: 75,
        cursor: undefined,
      });
      expect(result.posts).toHaveLength(25);
      expect(result.cursor).toBe("next-cursor");
      expect(result.hasMore).toBe(true);
    });

    it("fetches up to 100 posts when limit is large", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = Array.from({ length: 50 }, (_, i) =>
        createMockPost(`at://did/post${i}`, `Pokemon post ${i}`)
      );

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      mockIsPokemonContent.mockReturnValue(true);

      const result = await getPokemonFeed(agent, { limit: 50 });

      // Should cap at 100 (50 * 3 = 150 > 100)
      expect(agent.getTimeline).toHaveBeenCalledWith({
        limit: 100,
        cursor: undefined,
      });
      expect(result.posts).toHaveLength(50);
    });

    it("slices posts to requested limit", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = Array.from({ length: 60 }, (_, i) =>
        createMockPost(`at://did/post${i}`, `Pokemon post ${i}`)
      );

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      mockIsPokemonContent.mockReturnValue(true);

      const result = await getPokemonFeed(agent, { limit: 20 });

      expect(result.posts).toHaveLength(20);
      // Verify first 20 posts are returned
      result.posts.forEach((post, i) => {
        expect(post.post.uri).toBe(`at://did/post${i}`);
      });
    });

    it("sets hasMore to true when posts exceed limit", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = Array.from({ length: 30 }, (_, i) =>
        createMockPost(`at://did/post${i}`, `Pokemon post ${i}`)
      );

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: undefined,
        },
      });

      mockIsPokemonContent.mockReturnValue(true);

      const result = await getPokemonFeed(agent, { limit: 20 });

      expect(result.posts).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBeUndefined();
    });

    it("handles empty results from filtering", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = [
        createMockPost("at://did/post1", "Non-Pokemon post 1"),
        createMockPost("at://did/post2", "Non-Pokemon post 2"),
      ];

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: undefined,
        },
      });

      mockIsPokemonContent.mockReturnValue(false);

      const result = await getPokemonFeed(agent);

      expect(result.posts).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it("handles partial filtering results", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = Array.from({ length: 75 }, (_, i) =>
        createMockPost(`at://did/post${i}`, `Post ${i}`)
      );

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      // Only keep 15 posts after filtering
      mockIsPokemonContent.mockImplementation(
        (text: string) => parseInt(text.split(" ")[1] ?? "0") < 15
      );

      const result = await getPokemonFeed(agent, { limit: 25 });

      // Should get 15 posts (all that passed filter), not 25
      expect(result.posts).toHaveLength(15);
      expect(result.hasMore).toBe(true); // Still has cursor
    });

    it("supports custom cursor for pagination", async () => {
      const agent = createMockFeedAgent();
      const mockPosts = Array.from({ length: 25 }, (_, i) =>
        createMockPost(`at://did/post${i}`, `Pokemon post ${i}`)
      );

      (agent.getTimeline as jest.Mock).mockResolvedValue({
        data: {
          feed: mockPosts,
          cursor: "next-cursor",
        },
      });

      mockIsPokemonContent.mockReturnValue(true);

      await getPokemonFeed(agent, { cursor: "cursor1" });

      expect(agent.getTimeline).toHaveBeenCalledWith({
        limit: 75,
        cursor: "cursor1",
      });
    });
  });

  describe("searchPosts", () => {
    it("searches posts with default options", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const mockPosts = [
        createMockPostView("at://did/post1", "Pokemon VGC"),
        createMockPostView("at://did/post2", "Pokemon tournament"),
      ];

      (mockAgent.app.bsky.feed.searchPosts as jest.Mock).mockResolvedValue({
        data: {
          posts: mockPosts,
          cursor: "next-cursor",
        },
      });

      const result = await searchPosts("pokemon");

      expect(mockAgent.app.bsky.feed.searchPosts).toHaveBeenCalledWith({
        q: "pokemon",
        limit: 25,
        cursor: undefined,
      });
      expect(result.posts).toHaveLength(2);
      expect(result.cursor).toBe("next-cursor");
      expect(result.hasMore).toBe(true);
    });

    it("converts PostView to FeedViewPost format", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      const mockPosts = [createMockPostView("at://did/post1", "Test")];

      (mockAgent.app.bsky.feed.searchPosts as jest.Mock).mockResolvedValue({
        data: {
          posts: mockPosts,
          cursor: undefined,
        },
      });

      const result = await searchPosts("test");

      expect(result.posts[0]).toHaveProperty("post");
      expect(result.posts[0]?.post).toEqual(mockPosts[0]);
    });

    it("uses custom agent when provided", async () => {
      const customAgent = createMockFeedAgent();

      (customAgent.app.bsky.feed.searchPosts as jest.Mock).mockResolvedValue({
        data: { posts: [], cursor: undefined },
      });

      await searchPosts("test", {}, customAgent);

      expect(customAgent.app.bsky.feed.searchPosts).toHaveBeenCalled();
      expect(getPublicAgent).not.toHaveBeenCalled();
    });

    it("supports custom limit and cursor", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      (mockAgent.app.bsky.feed.searchPosts as jest.Mock).mockResolvedValue({
        data: { posts: [], cursor: undefined },
      });

      await searchPosts("pokemon", { limit: 50, cursor: "cursor1" });

      expect(mockAgent.app.bsky.feed.searchPosts).toHaveBeenCalledWith({
        q: "pokemon",
        limit: 50,
        cursor: "cursor1",
      });
    });

    it("handles empty search results", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      (mockAgent.app.bsky.feed.searchPosts as jest.Mock).mockResolvedValue({
        data: {
          posts: [],
          cursor: undefined,
        },
      });

      const result = await searchPosts("nonexistent");

      expect(result.posts).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("error handling", () => {
    it("throws error when getTimeline fails", async () => {
      const agent = createMockFeedAgent();

      (withErrorHandling as jest.Mock).mockImplementation(async (fn) => {
        return fn();
      });

      (agent.getTimeline as jest.Mock).mockRejectedValue(
        new BlueskyApiError("API Error", 500, "ServerError")
      );

      await expect(getTimeline(agent)).rejects.toThrow(BlueskyApiError);
    });

    it("throws error when getPosts fails", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      (withErrorHandling as jest.Mock).mockImplementation(async (fn) => {
        return fn();
      });

      (mockAgent.getPosts as jest.Mock).mockRejectedValue(
        new BlueskyApiError("Not Found", 404, "RecordNotFound")
      );

      await expect(getPosts(["at://did/post1"])).rejects.toThrow(
        BlueskyApiError
      );
    });

    it("throws error when searchPosts fails", async () => {
      const mockAgent = createMockFeedAgent();
      (getPublicAgent as jest.Mock).mockReturnValue(mockAgent);

      (withErrorHandling as jest.Mock).mockImplementation(async (fn) => {
        return fn();
      });

      (mockAgent.app.bsky.feed.searchPosts as jest.Mock).mockRejectedValue(
        new BlueskyApiError("Bad Request", 400, "InvalidRequest")
      );

      await expect(searchPosts("test")).rejects.toThrow(BlueskyApiError);
    });
  });
});
