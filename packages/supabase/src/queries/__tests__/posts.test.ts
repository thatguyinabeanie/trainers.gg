import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getFeedPosts,
  getFollowingFeedPosts,
  getPostWithReplies,
  getUserPosts,
} from "../posts";
import type { TypedClient } from "../../client";

// Mock query builder
type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  is: jest.Mock<() => MockQueryBuilder>;
  in: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  range: jest.Mock<() => MockQueryBuilder>;
  limit: jest.Mock<() => MockQueryBuilder>;
  single: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  then: jest.Mock<
    (
      resolve: (value: {
        data: unknown;
        error: unknown;
        count?: number | null;
      }) => void
    ) => Promise<{ data: unknown; error: unknown; count?: number | null }>
  >;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
    }),
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

describe("posts queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getFeedPosts", () => {
    it("should fetch feed posts with default options", async () => {
      const mockPosts = [
        {
          id: 1,
          content: "Test post 1",
          likes_count: 5,
          replies_count: 2,
          created_at: "2024-01-01T12:00:00Z",
          reply_to_id: null,
          user: { id: "user-1", username: "user1", name: "User One" },
        },
        {
          id: 2,
          content: "Test post 2",
          likes_count: 10,
          replies_count: 0,
          created_at: "2024-01-01T11:00:00Z",
          reply_to_id: null,
          user: { id: "user-2", username: "user2", name: "User Two" },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockPosts, error: null, count: 2 }).then(
          resolve
        );
      });

      const result = await getFeedPosts(mockClient);

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0]).toMatchObject({
        id: 1,
        content: "Test post 1",
        likesCount: 5,
        repliesCount: 2,
        author: {
          id: "user-1",
          username: "user1",
          displayName: "User One",
        },
        isLikedByMe: false,
      });
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it("should filter out replies (only top-level posts)", async () => {
      const mockClient = createMockClient();

      await getFeedPosts(mockClient);

      expect(mockClient._queryBuilder.is).toHaveBeenCalledWith(
        "reply_to_id",
        null
      );
    });

    it("should apply pagination with cursor", async () => {
      const mockClient = createMockClient();

      await getFeedPosts(mockClient, { limit: 10, cursor: 20 });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(20, 29);
    });

    it.skip("should fetch liked status for current user", async () => {
      const mockPosts = [
        {
          id: 1,
          content: "Test post",
          likes_count: 5,
          created_at: "2024-01-01T12:00:00Z",
          reply_to_id: null,
          user: { id: "user-1", username: "user1" },
        },
      ];

      const mockLikes = [{ post_id: 1 }];

      const mockClient = createMockClient();
      mockClient._queryBuilder.range.mockResolvedValue({
        data: mockPosts,
        error: null,
        count: 1,
      });

      mockClient._queryBuilder.then
        .mockResolvedValueOnce({
          data: mockPosts,
          error: null,
          count: 1,
        })
        .mockResolvedValueOnce({
          data: mockLikes,
          error: null,
        });

      const result = await getFeedPosts(mockClient, {
        currentUserId: "user-123",
      });

      expect(result.posts[0]?.isLikedByMe).toBe(true);
    });

    it("should calculate hasMore correctly", async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        content: `Post ${i + 1}`,
        created_at: "2024-01-01T12:00:00Z",
        reply_to_id: null,
        user: { id: "user-1", username: "user1" },
      }));

      const mockClient = createMockClient();
      mockClient._queryBuilder.range.mockResolvedValue({
        data: mockPosts,
        error: null,
        count: 100,
      });

      const result = await getFeedPosts(mockClient, { limit: 20, cursor: 0 });

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(20);
    });

    it("should filter deleted posts", async () => {
      const mockClient = createMockClient();

      await getFeedPosts(mockClient);

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "is_deleted",
        false
      );
    });

    it("should order by created_at descending", async () => {
      const mockClient = createMockClient();

      await getFeedPosts(mockClient);

      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
    });
  });

  describe("getFollowingFeedPosts", () => {
    it.skip("should fetch posts from followed users", async () => {
      const mockFollows = [
        { following_user_id: "user-2" },
        { following_user_id: "user-3" },
      ];

      const mockPosts = [
        {
          id: 1,
          content: "Post from followed user",
          created_at: "2024-01-01T12:00:00Z",
          reply_to_id: null,
          user: { id: "user-2", username: "user2" },
        },
      ];

      const mockClient = createMockClient();

      mockClient._queryBuilder.then = jest
        .fn()
        // First call for follows query
        .mockResolvedValueOnce({
          data: mockFollows,
          error: null,
        })
        // Second call for likes query
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        // Third call for posts query
        .mockResolvedValueOnce({
          data: mockPosts,
          error: null,
          count: 1,
        });

      const result = await getFollowingFeedPosts(mockClient, "user-1");

      expect(result.posts).toHaveLength(1);
      expect(mockClient._queryBuilder.in).toHaveBeenCalledWith("user_id", [
        "user-2",
        "user-3",
        "user-1",
      ]);
    });

    it.skip("should include user's own posts", async () => {
      const mockClient = createMockClient();

      // First call for follows query
      mockClient._queryBuilder.then = jest
        .fn()
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        // Second call for posts query
        .mockResolvedValueOnce({
          data: [],
          error: null,
          count: 0,
        });

      await getFollowingFeedPosts(mockClient, "user-1");

      expect(mockClient._queryBuilder.in).toHaveBeenCalledWith(
        "user_id",
        expect.arrayContaining(["user-1"])
      );
    });

    it.skip("should return empty result when user follows no one", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getFollowingFeedPosts(mockClient, "user-1");

      expect(result.posts).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it.skip("should apply pagination", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then.mockResolvedValue({
        data: [{ following_user_id: "user-2" }],
        error: null,
      });

      await getFollowingFeedPosts(mockClient, "user-1", {
        limit: 10,
        cursor: 20,
      });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(20, 29);
    });
  });

  describe("getPostWithReplies", () => {
    it("should fetch post with replies", async () => {
      const mockPost = {
        id: 1,
        content: "Main post",
        created_at: "2024-01-01T12:00:00Z",
        reply_to_id: null,
        user: { id: "user-1", username: "user1" },
      };

      const mockReplies = [
        {
          id: 2,
          content: "Reply 1",
          created_at: "2024-01-01T12:05:00Z",
          reply_to_id: 1,
          user: { id: "user-2", username: "user2" },
        },
        {
          id: 3,
          content: "Reply 2",
          created_at: "2024-01-01T12:10:00Z",
          reply_to_id: 1,
          user: { id: "user-3", username: "user3" },
        },
      ];

      const mockClient = createMockClient();

      // First call: single() for the main post
      mockClient._queryBuilder.single.mockResolvedValueOnce({
        data: mockPost,
        error: null,
      });

      // Second call: then() for replies query
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockReplies,
          error: null,
        }).then(resolve);
      });

      const result = await getPostWithReplies(mockClient, 1);

      expect(result.post).toBeDefined();
      expect(result.post?.id).toBe(1);
      expect(result.replies).toHaveLength(2);
    });

    it("should return null post when not found", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      const result = await getPostWithReplies(mockClient, 999);

      expect(result.post).toBeNull();
      expect(result.replies).toEqual([]);
    });

    it.skip("should fetch liked status for replies", async () => {
      const mockPost = {
        id: 1,
        content: "Main post",
        created_at: "2024-01-01T12:00:00Z",
        user: { id: "user-1", username: "user1" },
      };

      const mockReplies = [
        {
          id: 2,
          content: "Reply",
          created_at: "2024-01-01T12:05:00Z",
          reply_to_id: 1,
          user: { id: "user-2", username: "user2" },
        },
      ];

      const mockClient = createMockClient();

      // First call: single() for the main post
      mockClient._queryBuilder.single = jest.fn().mockResolvedValueOnce({
        data: mockPost,
        error: null,
      });

      // Second and third calls: then() for replies and likes
      mockClient._queryBuilder.then = jest
        .fn()
        // First then() call for replies query
        .mockResolvedValueOnce({
          data: mockReplies,
          error: null,
        })
        // Second then() call for likes query
        .mockResolvedValueOnce({
          data: [{ post_id: 1 }, { post_id: 2 }],
          error: null,
        });

      const result = await getPostWithReplies(mockClient, 1, {
        currentUserId: "user-123",
      });

      expect(result.post?.isLikedByMe).toBe(true);
      expect(result.replies[0]?.isLikedByMe).toBe(true);
    });

    it("should apply custom replies limit", async () => {
      const mockPost = {
        id: 1,
        content: "Main post",
        user: { id: "user-1", username: "user1" },
      };

      const mockClient = createMockClient();

      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockPost,
        error: null,
      });

      mockClient._queryBuilder.limit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      await getPostWithReplies(mockClient, 1, { repliesLimit: 100 });

      expect(mockClient._queryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it("should order replies chronologically", async () => {
      const mockPost = {
        id: 1,
        content: "Main post",
        user: { id: "user-1", username: "user1" },
      };

      const mockClient = createMockClient();

      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockPost,
        error: null,
      });

      mockClient._queryBuilder.limit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      await getPostWithReplies(mockClient, 1);

      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: true }
      );
    });
  });

  describe("getUserPosts", () => {
    it("should fetch posts by specific user", async () => {
      const mockPosts = [
        {
          id: 1,
          content: "User post 1",
          created_at: "2024-01-01T12:00:00Z",
          reply_to_id: null,
          user: { id: "user-1", username: "user1" },
        },
        {
          id: 2,
          content: "User post 2",
          created_at: "2024-01-01T11:00:00Z",
          reply_to_id: null,
          user: { id: "user-1", username: "user1" },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockPosts,
          error: null,
          count: 2,
        }).then(resolve);
      });

      const result = await getUserPosts(mockClient, "user-1");

      expect(result.posts).toHaveLength(2);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "user_id",
        "user-1"
      );
    });

    it("should exclude replies by default", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: [],
          error: null,
          count: 0,
        }).then(resolve);
      });

      await getUserPosts(mockClient, "user-1");

      expect(mockClient._queryBuilder.is).toHaveBeenCalledWith(
        "reply_to_id",
        null
      );
    });

    it("should include replies when requested", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: [],
          error: null,
          count: 0,
        }).then(resolve);
      });

      await getUserPosts(mockClient, "user-1", { includeReplies: true });

      expect(mockClient._queryBuilder.is).not.toHaveBeenCalledWith(
        "reply_to_id",
        null
      );
    });

    it.skip("should apply pagination", async () => {
      const mockClient = createMockClient();

      await getUserPosts(mockClient, "user-1", { limit: 10, cursor: 20 });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(20, 29);
    });

    it.skip("should fetch liked status for current user", async () => {
      const mockPosts = [
        {
          id: 1,
          content: "Post",
          created_at: "2024-01-01T12:00:00Z",
          reply_to_id: null,
          user: { id: "user-1", username: "user1" },
        },
      ];

      const mockClient = createMockClient();

      // First call for getUserPosts query
      mockClient._queryBuilder.then = jest
        .fn()
        .mockResolvedValueOnce({
          data: mockPosts,
          error: null,
          count: 1,
        })
        // Second call for post_likes query (inside getUserPosts)
        .mockResolvedValueOnce({
          data: [{ post_id: 1 }],
          error: null,
        });

      const result = await getUserPosts(mockClient, "user-1", {
        currentUserId: "user-123",
      });

      expect(result.posts[0]?.isLikedByMe).toBe(true);
    });

    it("should filter deleted posts", async () => {
      const mockClient = createMockClient();

      await getUserPosts(mockClient, "user-1");

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "is_deleted",
        false
      );
    });

    it("should order by created_at descending", async () => {
      const mockClient = createMockClient();

      await getUserPosts(mockClient, "user-1");

      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
    });

    it("should calculate hasMore correctly", async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        content: `Post ${i + 1}`,
        created_at: "2024-01-01T12:00:00Z",
        reply_to_id: null,
        user: { id: "user-1", username: "user1" },
      }));

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockPosts,
          error: null,
          count: 50,
        }).then(resolve);
      });

      const result = await getUserPosts(mockClient, "user-1", {
        limit: 20,
        cursor: 0,
      });

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(20);
    });
  });
});
