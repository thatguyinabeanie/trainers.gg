import { renderHook, waitFor } from "@testing-library/react";
import { useCurrentUser } from "../use-current-user";
import { useSupabaseQuery } from "@/lib/supabase";

// Mock the useSupabaseQuery hook
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
}));

describe("useCurrentUser", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return loading state initially", () => {
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useCurrentUser());

    expect(result.current.user).toBeUndefined();
    expect(result.current.alt).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.hasProfile).toBe(false);
  });

  it("should return user data when loaded", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      alt: {
        id: 1,
        username: "testalt",
        display_name: "Test Alt",
        battle_tag: "TestAlt#1234",
      },
    };

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.alt).toEqual(mockUser.alt);
    expect(result.current.profile).toEqual(mockUser.alt); // Backwards compatibility
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasProfile).toBe(true);
  });

  it("should handle user without alt", async () => {
    const mockUser = {
      id: "user-456",
      email: "noalt@example.com",
      username: "noaltuser",
      alt: null,
    };

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.alt).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasProfile).toBe(false);
  });

  it("should handle no user (unauthenticated)", async () => {
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.alt).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.hasProfile).toBe(false);
  });

  it("should handle query error", async () => {
    const mockError = new Error("Failed to fetch user");

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeUndefined();
    expect(result.current.error).toEqual(mockError);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should handle user with undefined alt field", async () => {
    const mockUser = {
      id: "user-789",
      email: "undefinedalt@example.com",
      username: "undefinedaltuser",
      // alt field is undefined (not explicitly null)
    };

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.alt).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasProfile).toBe(false);
  });

  it("should call useSupabaseQuery with stable function", () => {
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderHook(() => useCurrentUser());

    expect(useSupabaseQuery).toHaveBeenCalledWith(expect.any(Function), []);
  });

  it("should re-render when query data changes", async () => {
    const { rerender } = renderHook(() => useCurrentUser());

    // Initially loading
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    rerender();

    expect(useSupabaseQuery).toHaveBeenCalled();

    // Then loaded
    const mockUser = {
      id: "user-reload",
      email: "reload@example.com",
      username: "reloaduser",
      alt: {
        id: 2,
        username: "reloadalt",
        display_name: "Reload Alt",
      },
    };

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
    });

    rerender();

    await waitFor(() => {
      const result = renderHook(() => useCurrentUser()).result;
      expect(result.current.user).toEqual(mockUser);
    });
  });
});
