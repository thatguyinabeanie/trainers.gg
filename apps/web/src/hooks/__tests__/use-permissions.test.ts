import { renderHook, waitFor } from "@testing-library/react";
import { usePermission, usePermissions } from "../use-permissions";
import { useSupabaseQuery } from "@/lib/supabase";
import { useCurrentUser } from "../use-current-user";

// Mock dependencies
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
}));

jest.mock("../use-current-user", () => ({
  useCurrentUser: jest.fn(),
}));

describe("usePermission", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return loading state initially", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: undefined,
      isLoading: true,
    });

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => usePermission("tournaments.create"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasPermission).toBe(false);
  });

  it("should check permission for authenticated user", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      alt: { id: 1, username: "testalt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Mock the query to return the permission check result
    (useSupabaseQuery as jest.Mock).mockImplementation(
      (_queryFn: unknown, _deps: unknown) => {
        return {
          data: true,
          isLoading: false,
        };
      }
    );

    const { result } = renderHook(() => usePermission("tournaments.create"));

    await waitFor(() => {
      expect(result.current.hasPermission).toBe(true);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it("should return false when user lacks permission", async () => {
    const mockUser = {
      id: "user-456",
      email: "noperm@example.com",
      alt: { id: 2, username: "nopermalt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: false,
      isLoading: false,
    });

    const { result } = renderHook(() => usePermission("tournaments.delete"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission).toBe(false);
  });

  it("should handle unauthenticated user", async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    (useSupabaseQuery as jest.Mock).mockImplementation(
      (_queryFn: unknown, _deps: unknown) => {
        return {
          data: false,
          isLoading: false,
        };
      }
    );

    const { result } = renderHook(() => usePermission("tournaments.create"));

    await waitFor(() => {
      expect(result.current.hasPermission).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it("should respect enabled parameter", async () => {
    const mockUser = {
      id: "user-789",
      email: "enabled@example.com",
      alt: { id: 3, username: "enabledalt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Mock should return false when not enabled
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: false,
      isLoading: false,
    });

    const { result } = renderHook(() =>
      usePermission("tournaments.create", false)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasPermission).toBe(false);

    // Verify the query function receives enabled param
    expect(useSupabaseQuery).toHaveBeenCalledWith(expect.any(Function), [
      mockUser.id,
      false,
      "tournaments.create",
    ]);
  });

  it("should handle query function returning false for disabled query", async () => {
    const mockUser = {
      id: "user-disabled",
      email: "disabled@example.com",
      alt: { id: 4, username: "disabledalt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Simulate the query function when not enabled
    (useSupabaseQuery as jest.Mock).mockImplementation(
      (_queryFn: unknown, deps: unknown[]) => {
        const enabled = deps[1];
        return {
          data: enabled ? undefined : false,
          isLoading: false,
        };
      }
    );

    const { result } = renderHook(() =>
      usePermission("tournaments.view", false)
    );

    await waitFor(() => {
      expect(result.current.hasPermission).toBe(false);
    });
  });

  it("should update when permission changes", async () => {
    const mockUser = {
      id: "user-change",
      email: "change@example.com",
      alt: { id: 5, username: "changealt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Initially no permission
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: false,
      isLoading: false,
    });

    const { result, rerender } = renderHook(() =>
      usePermission("tournaments.manage")
    );

    await waitFor(() => {
      expect(result.current.hasPermission).toBe(false);
    });

    // Permission granted
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: true,
      isLoading: false,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.hasPermission).toBe(true);
    });
  });
});

describe("usePermissions", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return loading state initially", () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: undefined,
      isLoading: true,
    });

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() =>
      usePermissions(["tournaments.create", "tournaments.manage"])
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.permissions).toEqual({
      "tournaments.create": false,
      "tournaments.manage": false,
    });
  });

  it("should check multiple permissions at once", async () => {
    const mockUser = {
      id: "user-multi",
      email: "multi@example.com",
      alt: { id: 6, username: "multialt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Mock user has tournaments.create and tournaments.view permissions
    (useSupabaseQuery as jest.Mock).mockImplementation(
      (_queryFn: unknown, _deps: unknown) => {
        return {
          data: ["tournaments.create", "tournaments.view"],
          isLoading: false,
        };
      }
    );

    const { result } = renderHook(() =>
      usePermissions([
        "tournaments.create",
        "tournaments.view",
        "tournaments.delete",
      ])
    );

    await waitFor(() => {
      expect(result.current.permissions).toEqual({
        "tournaments.create": true,
        "tournaments.view": true,
        "tournaments.delete": false,
      });
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it("should handle empty permissions array", async () => {
    const mockUser = {
      id: "user-empty",
      email: "empty@example.com",
      alt: { id: 7, username: "emptyalt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      usePermissions(["tournaments.create", "tournaments.manage"])
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions).toEqual({
      "tournaments.create": false,
      "tournaments.manage": false,
    });
  });

  it("should handle unauthenticated user", async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    (useSupabaseQuery as jest.Mock).mockImplementation(
      (_queryFn: unknown, _deps: unknown) => {
        return {
          data: [],
          isLoading: false,
        };
      }
    );

    const { result } = renderHook(() => usePermissions(["tournaments.create"]));

    await waitFor(() => {
      expect(result.current.permissions).toEqual({
        "tournaments.create": false,
      });
    });

    expect(result.current.user).toBeNull();
  });

  it("should respect enabled parameter", async () => {
    const mockUser = {
      id: "user-enabled-multi",
      email: "enabled-multi@example.com",
      alt: { id: 8, username: "enabledmultialt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      usePermissions(["tournaments.create", "tournaments.view"], false)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions).toEqual({
      "tournaments.create": false,
      "tournaments.view": false,
    });

    // Verify enabled param passed to query
    expect(useSupabaseQuery).toHaveBeenCalledWith(expect.any(Function), [
      mockUser.id,
      false,
    ]);
  });

  it("should handle user without alt", async () => {
    const mockUser = {
      id: "user-no-alt-perm",
      email: "noaltperm@example.com",
      alt: null,
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (useSupabaseQuery as jest.Mock).mockImplementation(
      (_queryFn: unknown, _deps: unknown) => {
        return {
          data: [],
          isLoading: false,
        };
      }
    );

    const { result } = renderHook(() => usePermissions(["tournaments.create"]));

    await waitFor(() => {
      expect(result.current.permissions).toEqual({
        "tournaments.create": false,
      });
    });
  });

  it("should update when user permissions change", async () => {
    const mockUser = {
      id: "user-perm-change",
      email: "permchange@example.com",
      alt: { id: 9, username: "permchangealt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Initially only view permission
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: ["tournaments.view"],
      isLoading: false,
    });

    const { result, rerender } = renderHook(() =>
      usePermissions(["tournaments.view", "tournaments.create"])
    );

    await waitFor(() => {
      expect(result.current.permissions).toEqual({
        "tournaments.view": true,
        "tournaments.create": false,
      });
    });

    // Permissions updated
    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: ["tournaments.view", "tournaments.create"],
      isLoading: false,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.permissions).toEqual({
        "tournaments.view": true,
        "tournaments.create": true,
      });
    });
  });

  it("should handle undefined permissions array", async () => {
    const mockUser = {
      id: "user-undef-perms",
      email: "undefperms@example.com",
      alt: { id: 10, username: "undefpermsalt" },
    };

    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (useSupabaseQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => usePermissions(["tournaments.create"]));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions).toEqual({
      "tournaments.create": false,
    });
  });
});
