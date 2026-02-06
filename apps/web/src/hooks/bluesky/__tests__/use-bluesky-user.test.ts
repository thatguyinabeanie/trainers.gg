import { renderHook, waitFor } from "@testing-library/react";
import { useBlueskyUser } from "../use-bluesky-user";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Mock dependencies
jest.mock("@/hooks/use-auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

interface MockSupabase {
  from: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
}

describe("useBlueskyUser", () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return loading state initially", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useBlueskyUser());

    expect(result.current.blueskyDid).toBeNull();
    expect(result.current.pdsHandle).toBeNull();
    expect(result.current.pdsStatus).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("should fetch Bluesky user data for authenticated user", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });

    const mockBlueskyData = {
      did: "did:plc:abc123",
      pds_handle: "testuser.trainers.gg",
      pds_status: "active" as const,
    };

    (useQuery as jest.Mock).mockReturnValue({
      data: mockBlueskyData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useBlueskyUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.blueskyDid).toBe("did:plc:abc123");
    expect(result.current.pdsHandle).toBe("testuser.trainers.gg");
    expect(result.current.pdsStatus).toBe("active");
  });

  it("should return null for unauthenticated user", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useBlueskyUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.blueskyDid).toBeNull();
    expect(result.current.pdsHandle).toBeNull();
    expect(result.current.pdsStatus).toBeNull();
  });

  it("should handle pending PDS status", async () => {
    const mockUser = {
      id: "user-pending",
      email: "pending@example.com",
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });

    const mockBlueskyData = {
      did: "did:plc:pending123",
      pds_handle: "pendinguser.trainers.gg",
      pds_status: "pending" as const,
    };

    (useQuery as jest.Mock).mockReturnValue({
      data: mockBlueskyData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useBlueskyUser());

    await waitFor(() => {
      expect(result.current.pdsStatus).toBe("pending");
    });

    expect(result.current.blueskyDid).toBe("did:plc:pending123");
    expect(result.current.pdsHandle).toBe("pendinguser.trainers.gg");
  });

  it("should handle failed PDS status", async () => {
    const mockUser = {
      id: "user-failed",
      email: "failed@example.com",
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });

    const mockBlueskyData = {
      did: null,
      pds_handle: "faileduser.trainers.gg",
      pds_status: "failed" as const,
    };

    (useQuery as jest.Mock).mockReturnValue({
      data: mockBlueskyData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useBlueskyUser());

    await waitFor(() => {
      expect(result.current.pdsStatus).toBe("failed");
    });

    expect(result.current.blueskyDid).toBeNull();
  });

  it("should handle suspended PDS status", async () => {
    const mockUser = {
      id: "user-suspended",
      email: "suspended@example.com",
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });

    const mockBlueskyData = {
      did: "did:plc:suspended123",
      pds_handle: "suspendeduser.trainers.gg",
      pds_status: "suspended" as const,
    };

    (useQuery as jest.Mock).mockReturnValue({
      data: mockBlueskyData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useBlueskyUser());

    await waitFor(() => {
      expect(result.current.pdsStatus).toBe("suspended");
    });

    expect(result.current.blueskyDid).toBe("did:plc:suspended123");
  });

  it("should handle query error", async () => {
    const mockUser = {
      id: "user-error",
      email: "error@example.com",
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });

    const mockError = new Error("Failed to fetch Bluesky data");

    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: mockError,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useBlueskyUser());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.blueskyDid).toBeNull();
  });

  it("should provide refetch function", () => {
    const mockRefetch = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: "user-refetch" },
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useBlueskyUser());

    expect(result.current.refetch).toBe(mockRefetch);

    result.current.refetch();

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("should use correct query key based on user ID", () => {
    const mockUser = {
      id: "user-querykey",
      email: "querykey@example.com",
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });

    (useQuery as jest.Mock).mockImplementation((options) => {
      expect(options.queryKey).toEqual(["bluesky-user", "user-querykey"]);
      return {
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      };
    });

    renderHook(() => useBlueskyUser());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["bluesky-user", "user-querykey"],
      })
    );
  });

  it("should disable query when user is not authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
    });

    (useQuery as jest.Mock).mockImplementation((options) => {
      expect(options.enabled).toBe(false);
      return {
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      };
    });

    renderHook(() => useBlueskyUser());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it("should enable query when user is authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: "user-enabled" },
    });

    (useQuery as jest.Mock).mockImplementation((options) => {
      expect(options.enabled).toBe(true);
      return {
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      };
    });

    renderHook(() => useBlueskyUser());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    );
  });

  it("should have 5 minute stale time", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: "user-stale" },
    });

    (useQuery as jest.Mock).mockImplementation((options) => {
      expect(options.staleTime).toBe(5 * 60 * 1000);
      return {
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      };
    });

    renderHook(() => useBlueskyUser());
  });
});
