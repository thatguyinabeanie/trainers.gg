import { renderHook, waitFor } from "@testing-library/react";
import {
  useTimeline,
  usePokemonFeed,
  useAuthorFeed,
  useActorLikes,
  flattenFeedPages,
  feedKeys,
} from "../use-feed";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { AppBskyFeedDefs } from "@atproto/api";

// Mock TanStack Query
jest.mock("@tanstack/react-query", () => ({
  useInfiniteQuery: jest.fn(),
}));

// Mock server actions
jest.mock("@/actions/bluesky/feed-actions", () => ({
  getTimelineAction: jest.fn(),
  getPokemonFeedAction: jest.fn(),
  getAuthorFeedAction: jest.fn(),
  getActorLikesAction: jest.fn(),
}));

describe("feedKeys", () => {
  it("should generate correct timeline key", () => {
    expect(feedKeys.timeline("did:plc:123")).toEqual([
      "feed",
      "timeline",
      "did:plc:123",
    ]);
  });

  it("should generate correct pokemon feed key", () => {
    expect(feedKeys.pokemonFeed("did:plc:456")).toEqual([
      "feed",
      "pokemon",
      "did:plc:456",
    ]);
  });

  it("should generate correct author feed key", () => {
    expect(feedKeys.authorFeed("user.bsky.social")).toEqual([
      "feed",
      "author",
      "user.bsky.social",
      "default",
    ]);
  });

  it("should generate author feed key with filter", () => {
    expect(feedKeys.authorFeed("user.bsky.social", "posts_no_replies")).toEqual(
      ["feed", "author", "user.bsky.social", "posts_no_replies"]
    );
  });

  it("should generate correct actor likes key", () => {
    expect(feedKeys.actorLikes("user.bsky.social")).toEqual([
      "feed",
      "likes",
      "user.bsky.social",
    ]);
  });
});

describe("useTimeline", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return loading state initially", () => {
    (useInfiniteQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    });

    const { result } = renderHook(() => useTimeline("did:plc:123"));

    expect(result.current.isLoading).toBe(true);
  });

  it("should fetch timeline for authenticated user", async () => {
    const mockData = {
      pages: [
        {
          posts: [{ uri: "post1" }, { uri: "post2" }],
          cursor: "cursor1",
          hasMore: true,
        },
      ],
    };

    (useInfiniteQuery as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      hasNextPage: true,
      fetchNextPage: jest.fn(),
    });

    const { result } = renderHook(() => useTimeline("did:plc:123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it("should not fetch when DID is null", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.enabled).toBe(false);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useTimeline(null));

    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it("should use correct query key", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual(["feed", "timeline", "did:plc:456"]);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useTimeline("did:plc:456"));
  });

  it("should have 1 minute stale time", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.staleTime).toBe(60 * 1000);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useTimeline("did:plc:789"));
  });
});

describe("usePokemonFeed", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch pokemon-filtered feed", async () => {
    const mockData = {
      pages: [
        {
          posts: [{ uri: "pokemon-post1" }, { uri: "pokemon-post2" }],
          cursor: "pokemon-cursor1",
          hasMore: true,
        },
      ],
    };

    (useInfiniteQuery as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      hasNextPage: true,
      fetchNextPage: jest.fn(),
    });

    const { result } = renderHook(() => usePokemonFeed("did:plc:pokemon"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it("should use correct query key", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual([
        "feed",
        "pokemon",
        "did:plc:pokemon-key",
      ]);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => usePokemonFeed("did:plc:pokemon-key"));
  });

  it("should not fetch when DID is null", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.enabled).toBe(false);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => usePokemonFeed(null));
  });
});

describe("useAuthorFeed", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch author feed with default filter", async () => {
    const mockData = {
      pages: [
        {
          posts: [{ uri: "author-post1" }],
          cursor: "author-cursor1",
          hasMore: false,
        },
      ],
    };

    (useInfiniteQuery as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    });

    const { result } = renderHook(() => useAuthorFeed("user.bsky.social"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it("should fetch author feed with posts_no_replies filter", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual([
        "feed",
        "author",
        "user.bsky.social",
        "posts_no_replies",
      ]);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useAuthorFeed("user.bsky.social", "posts_no_replies"));
  });

  it("should fetch author feed with posts_with_media filter", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual([
        "feed",
        "author",
        "user.bsky.social",
        "posts_with_media",
      ]);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useAuthorFeed("user.bsky.social", "posts_with_media"));
  });

  it("should not fetch when actor is empty", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.enabled).toBe(false);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useAuthorFeed(""));
  });
});

describe("useActorLikes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch actor likes", async () => {
    const mockData = {
      pages: [
        {
          posts: [{ uri: "liked-post1" }],
          cursor: "likes-cursor1",
          hasMore: false,
        },
      ],
    };

    (useInfiniteQuery as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    });

    const { result } = renderHook(() => useActorLikes("user.bsky.social"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it("should use correct query key", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual([
        "feed",
        "likes",
        "likes-user.bsky.social",
      ]);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useActorLikes("likes-user.bsky.social"));
  });

  it("should not fetch when actor is empty", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.enabled).toBe(false);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useActorLikes(""));
  });
});

describe("flattenFeedPages", () => {
  it("should flatten multiple pages of posts", () => {
    const pages = [
      {
        posts: [
          { uri: "post1" } as AppBskyFeedDefs.FeedViewPost,
          { uri: "post2" } as AppBskyFeedDefs.FeedViewPost,
        ],
      },
      {
        posts: [
          { uri: "post3" } as AppBskyFeedDefs.FeedViewPost,
          { uri: "post4" } as AppBskyFeedDefs.FeedViewPost,
        ],
      },
      {
        posts: [{ uri: "post5" } as AppBskyFeedDefs.FeedViewPost],
      },
    ];

    const result = flattenFeedPages(pages);

    expect(result).toEqual([
      { uri: "post1" },
      { uri: "post2" },
      { uri: "post3" },
      { uri: "post4" },
      { uri: "post5" },
    ]);
  });

  it("should handle single page", () => {
    const pages = [
      {
        posts: [
          { uri: "single-post1" } as AppBskyFeedDefs.FeedViewPost,
          { uri: "single-post2" } as AppBskyFeedDefs.FeedViewPost,
        ],
      },
    ];

    const result = flattenFeedPages(pages);

    expect(result).toEqual([{ uri: "single-post1" }, { uri: "single-post2" }]);
  });

  it("should handle empty pages", () => {
    const pages = [{ posts: [] }, { posts: [] }];

    const result = flattenFeedPages(pages);

    expect(result).toEqual([]);
  });

  it("should handle undefined pages", () => {
    const result = flattenFeedPages(undefined);

    expect(result).toEqual([]);
  });

  it("should handle empty array", () => {
    const result = flattenFeedPages([]);

    expect(result).toEqual([]);
  });

  it("should preserve post order across pages", () => {
    const pages = [
      {
        posts: [
          { uri: "post1", indexedAt: "2024-01-01" } as any,
          { uri: "post2", indexedAt: "2024-01-02" } as any,
        ],
      },
      {
        posts: [
          { uri: "post3", indexedAt: "2024-01-03" } as any,
          { uri: "post4", indexedAt: "2024-01-04" } as any,
        ],
      },
    ];

    const result = flattenFeedPages(pages);

    expect(result.map((p) => p.uri)).toEqual([
      "post1",
      "post2",
      "post3",
      "post4",
    ]);
  });
});
