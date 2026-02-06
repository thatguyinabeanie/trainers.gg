import { renderHook, waitFor } from "@testing-library/react";
import {
  useProfile,
  useFollowMutation,
  useFollowers,
  useFollowing,
  flattenFollowPages,
  profileKeys,
} from "../use-profile";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type { ProfileView } from "@/lib/atproto/api";

// Mock TanStack Query
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
  useInfiniteQuery: jest.fn(),
}));

// Mock server actions
jest.mock("@/actions/bluesky/profile-actions", () => ({
  getProfileAction: jest.fn(),
}));

jest.mock("@/actions/bluesky/social-actions", () => ({
  followBlueskyUser: jest.fn(),
  unfollowBlueskyUser: jest.fn(),
  getFollowersAction: jest.fn(),
  getFollowsAction: jest.fn(),
}));

describe("profileKeys", () => {
  it("should generate correct profile detail key", () => {
    expect(profileKeys.detail("user.bsky.social")).toEqual([
      "profile",
      "detail",
      "user.bsky.social",
    ]);
  });

  it("should generate correct followers key", () => {
    expect(profileKeys.followers("user.bsky.social")).toEqual([
      "profile",
      "followers",
      "user.bsky.social",
    ]);
  });

  it("should generate correct following key", () => {
    expect(profileKeys.following("user.bsky.social")).toEqual([
      "profile",
      "following",
      "user.bsky.social",
    ]);
  });
});

describe("useProfile", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return loading state initially", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useProfile("user.bsky.social"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("should fetch profile by handle", async () => {
    const mockProfile: ProfileView = {
      did: "did:plc:123",
      handle: "user.bsky.social",
      displayName: "Test User",
      followersCount: 100,
      followsCount: 50,
    };

    (useQuery as jest.Mock).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useProfile("user.bsky.social"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockProfile);
  });

  it("should fetch profile by DID", async () => {
    const mockProfile: ProfileView = {
      did: "did:plc:456",
      handle: "another.bsky.social",
      displayName: "Another User",
      followersCount: 200,
      followsCount: 75,
    };

    (useQuery as jest.Mock).mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useProfile("did:plc:456"));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockProfile);
    });
  });

  it("should not fetch when actor is null", () => {
    (useQuery as jest.Mock).mockImplementation((options) => {
      expect(options.enabled).toBe(false);
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    });

    renderHook(() => useProfile(null));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it("should not fetch when actor is undefined", () => {
    (useQuery as jest.Mock).mockImplementation((options) => {
      expect(options.enabled).toBe(false);
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    });

    renderHook(() => useProfile(undefined));
  });

  it("should use correct query key", () => {
    (useQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual([
        "profile",
        "detail",
        "profile-key.bsky.social",
      ]);
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    });

    renderHook(() => useProfile("profile-key.bsky.social"));
  });

  it("should have 1 minute stale time", () => {
    (useQuery as jest.Mock).mockImplementation((options) => {
      expect(options.staleTime).toBe(60 * 1000);
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    });

    renderHook(() => useProfile("stale.bsky.social"));
  });
});

interface MockQueryClient {
  cancelQueries: jest.Mock;
  getQueryData: jest.Mock;
  setQueryData: jest.Mock;
  invalidateQueries: jest.Mock;
}

describe("useFollowMutation", () => {
  let mockQueryClient: MockQueryClient;

  beforeEach(() => {
    mockQueryClient = {
      cancelQueries: jest.fn(),
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
    };

    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return mutation functions", () => {
    const mockMutate = jest.fn();
    const mockMutateAsync = jest.fn();

    (useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useFollowMutation());

    expect(result.current.mutate).toBe(mockMutate);
    expect(result.current.mutateAsync).toBe(mockMutateAsync);
  });

  it("should handle follow action", async () => {
    let mutationFn:
      | ((variables: {
          targetDid: string;
          isFollowing: boolean;
        }) => Promise<unknown>)
      | undefined;

    (useMutation as jest.Mock).mockImplementation((options) => {
      mutationFn = options.mutationFn;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
      };
    });

    renderHook(() => useFollowMutation());

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { followBlueskyUser } = require("@/actions/bluesky/social-actions");
    followBlueskyUser.mockResolvedValue({
      success: true,
      data: { followUri: "at://follow/123" },
    });

    const result = mutationFn
      ? await mutationFn({
          targetDid: "did:plc:target",
          isFollowing: false,
        })
      : null;

    expect(result).toEqual({
      following: true,
      followUri: "at://follow/123",
    });
  });

  it("should handle unfollow action", async () => {
    let mutationFn:
      | ((variables: {
          targetDid: string;
          isFollowing: boolean;
          followUri?: string;
        }) => Promise<unknown>)
      | undefined;

    (useMutation as jest.Mock).mockImplementation((options) => {
      mutationFn = options.mutationFn;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
      };
    });

    renderHook(() => useFollowMutation());

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { unfollowBlueskyUser } = require("@/actions/bluesky/social-actions");
    unfollowBlueskyUser.mockResolvedValue({
      success: true,
    });

    const result = mutationFn
      ? await mutationFn({
          targetDid: "did:plc:target",
          isFollowing: true,
          followUri: "at://follow/456",
        })
      : null;

    expect(result).toEqual({
      following: false,
      followUri: null,
    });
  });

  it("should optimistically update profile on follow", async () => {
    let onMutate:
      | ((variables: {
          targetDid: string;
          isFollowing: boolean;
        }) => Promise<void>)
      | undefined;

    (useMutation as jest.Mock).mockImplementation((options) => {
      onMutate = options.onMutate;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
      };
    });

    renderHook(() => useFollowMutation());

    const mockProfile: ProfileView = {
      did: "did:plc:target",
      handle: "target.bsky.social",
      followersCount: 100,
      viewer: {},
    };

    mockQueryClient.getQueryData.mockReturnValue(mockProfile);

    if (onMutate) {
      await onMutate({
        targetDid: "did:plc:target",
        isFollowing: false,
      });
    }

    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      ["profile", "detail", "did:plc:target"],
      expect.any(Function)
    );

    // Test the updater function
    const updater = mockQueryClient.setQueryData.mock.calls[0][1];
    const updated = updater(mockProfile);

    expect(updated.viewer.following).toBe("pending");
    expect(updated.followersCount).toBe(101);
  });

  it("should optimistically update profile on unfollow", async () => {
    let onMutate:
      | ((variables: {
          targetDid: string;
          isFollowing: boolean;
        }) => Promise<void>)
      | undefined;

    (useMutation as jest.Mock).mockImplementation((options) => {
      onMutate = options.onMutate;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
      };
    });

    renderHook(() => useFollowMutation());

    const mockProfile: ProfileView = {
      did: "did:plc:target",
      handle: "target.bsky.social",
      followersCount: 100,
      viewer: { following: "at://follow/123" },
    };

    mockQueryClient.getQueryData.mockReturnValue(mockProfile);

    if (onMutate) {
      await onMutate({
        targetDid: "did:plc:target",
        isFollowing: true,
      });
    }

    const updater = mockQueryClient.setQueryData.mock.calls[0][1];
    const updated = updater(mockProfile);

    expect(updated.viewer.following).toBeUndefined();
    expect(updated.followersCount).toBe(99);
  });

  it("should rollback on error", () => {
    let onError:
      | ((error: Error, variables: unknown, context?: unknown) => void)
      | undefined;

    (useMutation as jest.Mock).mockImplementation((options) => {
      onError = options.onError;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
      };
    });

    renderHook(() => useFollowMutation());

    const previousProfile: ProfileView = {
      did: "did:plc:target",
      handle: "target.bsky.social",
      followersCount: 100,
      viewer: {},
    };

    const context = { previousProfile };

    if (onError) {
      onError(new Error("Failed"), { targetDid: "did:plc:target" }, context);
    }

    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      ["profile", "detail", "did:plc:target"],
      previousProfile
    );
  });

  it("should invalidate queries on settle", () => {
    let onSettled:
      | ((
          data: unknown,
          error: unknown,
          variables: { targetDid: string }
        ) => void)
      | undefined;

    (useMutation as jest.Mock).mockImplementation((options) => {
      onSettled = options.onSettled;
      return {
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
        isPending: false,
      };
    });

    renderHook(() => useFollowMutation());

    if (onSettled) {
      onSettled(null, null, { targetDid: "did:plc:target" });
    }

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["profile", "detail", "did:plc:target"],
    });
  });
});

describe("useFollowers", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch followers with pagination", async () => {
    const mockData = {
      pages: [
        {
          profiles: [
            { did: "did:plc:follower1", handle: "follower1.bsky.social" },
            { did: "did:plc:follower2", handle: "follower2.bsky.social" },
          ] as ProfileView[],
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

    const { result } = renderHook(() => useFollowers("user.bsky.social"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it("should use correct query key", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual([
        "profile",
        "followers",
        "followers.bsky.social",
      ]);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useFollowers("followers.bsky.social"));
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

    renderHook(() => useFollowers(""));
  });
});

describe("useFollowing", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch following with pagination", async () => {
    const mockData = {
      pages: [
        {
          profiles: [
            { did: "did:plc:following1", handle: "following1.bsky.social" },
            { did: "did:plc:following2", handle: "following2.bsky.social" },
          ] as ProfileView[],
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

    const { result } = renderHook(() => useFollowing("user.bsky.social"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it("should use correct query key", () => {
    (useInfiniteQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual([
        "profile",
        "following",
        "following.bsky.social",
      ]);
      return {
        data: undefined,
        isLoading: false,
        hasNextPage: false,
        fetchNextPage: jest.fn(),
      };
    });

    renderHook(() => useFollowing("following.bsky.social"));
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

    renderHook(() => useFollowing(""));
  });
});

describe("flattenFollowPages", () => {
  it("should flatten multiple pages of profiles", () => {
    const pages = [
      {
        profiles: [
          { did: "did:plc:1", handle: "user1.bsky.social" } as ProfileView,
          { did: "did:plc:2", handle: "user2.bsky.social" } as ProfileView,
        ],
      },
      {
        profiles: [
          { did: "did:plc:3", handle: "user3.bsky.social" } as ProfileView,
          { did: "did:plc:4", handle: "user4.bsky.social" } as ProfileView,
        ],
      },
    ];

    const result = flattenFollowPages(pages);

    expect(result).toEqual([
      { did: "did:plc:1", handle: "user1.bsky.social" },
      { did: "did:plc:2", handle: "user2.bsky.social" },
      { did: "did:plc:3", handle: "user3.bsky.social" },
      { did: "did:plc:4", handle: "user4.bsky.social" },
    ]);
  });

  it("should handle single page", () => {
    const pages = [
      {
        profiles: [
          {
            did: "did:plc:single",
            handle: "single.bsky.social",
          } as ProfileView,
        ],
      },
    ];

    const result = flattenFollowPages(pages);

    expect(result).toEqual([
      { did: "did:plc:single", handle: "single.bsky.social" },
    ]);
  });

  it("should handle empty pages", () => {
    const pages = [{ profiles: [] }, { profiles: [] }];

    const result = flattenFollowPages(pages);

    expect(result).toEqual([]);
  });

  it("should handle undefined pages", () => {
    const result = flattenFollowPages(undefined);

    expect(result).toEqual([]);
  });

  it("should handle empty array", () => {
    const result = flattenFollowPages([]);

    expect(result).toEqual([]);
  });
});
