import { renderHook, waitFor } from "@testing-library/react";
import { useSiteAdmin } from "../use-site-admin";
import { useAuthContext } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// Mock dependencies
jest.mock("@/components/auth/auth-provider", () => ({
  useAuthContext: jest.fn(),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

// Helper to create base64-encoded JWT payload
const createMockJWT = (claims: Record<string, unknown>) => {
  const payload = JSON.stringify(claims);
  const base64 = btoa(payload);
  return `header.${base64}.signature`;
};

interface MockAuth {
  getSession: jest.Mock;
}

interface MockSupabase {
  auth: MockAuth;
}

describe("useSiteAdmin", () => {
  let mockSupabase: MockSupabase;
  let mockAuth: MockAuth;

  beforeEach(() => {
    mockAuth = {
      getSession: jest.fn(),
    };

    mockSupabase = {
      auth: mockAuth,
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return loading state initially", () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    const { result } = renderHook(() => useSiteAdmin());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.siteRoles).toEqual([]);
    expect(result.current.isSiteAdmin).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("should return empty roles for unauthenticated user", async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.siteRoles).toEqual([]);
    expect(result.current.isSiteAdmin).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("should extract site_admin role from JWT", async () => {
    const mockUser: User = {
      id: "admin-123",
      email: "admin@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockJWT = createMockJWT({
      sub: "admin-123",
      site_roles: ["site_admin"],
    });

    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: mockJWT,
          user: mockUser,
        },
      },
    });

    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.siteRoles).toEqual(["site_admin"]);
    expect(result.current.isSiteAdmin).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it("should handle multiple site roles", async () => {
    const mockUser: User = {
      id: "user-456",
      email: "user@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockJWT = createMockJWT({
      sub: "user-456",
      site_roles: ["site_admin", "moderator", "reviewer"],
    });

    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: mockJWT,
          user: mockUser,
        },
      },
    });

    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.siteRoles).toEqual([
      "site_admin",
      "moderator",
      "reviewer",
    ]);
    expect(result.current.isSiteAdmin).toBe(true);
  });

  it("should handle user without site_admin role", async () => {
    const mockUser: User = {
      id: "user-789",
      email: "regular@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockJWT = createMockJWT({
      sub: "user-789",
      site_roles: ["user"],
    });

    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: mockJWT,
          user: mockUser,
        },
      },
    });

    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.siteRoles).toEqual(["user"]);
    expect(result.current.isSiteAdmin).toBe(false);
  });

  it("should handle JWT without site_roles claim", async () => {
    const mockUser: User = {
      id: "user-no-roles",
      email: "noroles@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockJWT = createMockJWT({
      sub: "user-no-roles",
      // No site_roles claim
    });

    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: mockJWT,
          user: mockUser,
        },
      },
    });

    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.siteRoles).toEqual([]);
    expect(result.current.isSiteAdmin).toBe(false);
  });

  it("should handle session without access token", async () => {
    const mockUser: User = {
      id: "user-no-token",
      email: "notoken@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    mockAuth.getSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.siteRoles).toEqual([]);
    expect(result.current.isSiteAdmin).toBe(false);
  });

  it("should handle malformed JWT gracefully", async () => {
    const mockUser: User = {
      id: "user-malformed",
      email: "malformed@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    // Invalid JWT structure
    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "invalid.jwt",
          user: mockUser,
        },
      },
    });

    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.siteRoles).toEqual([]);
    expect(result.current.isSiteAdmin).toBe(false);
  });

  it("should handle session fetch error", async () => {
    const mockUser: User = {
      id: "user-error",
      email: "error@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    mockAuth.getSession.mockRejectedValue(new Error("Session fetch failed"));

    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.siteRoles).toEqual([]);
    expect(result.current.isSiteAdmin).toBe(false);
  });

  it("should update when user changes", async () => {
    const mockUser1: User = {
      id: "user-1",
      email: "user1@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser1,
      loading: false,
    });

    const mockJWT1 = createMockJWT({
      sub: "user-1",
      site_roles: [],
    });

    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: mockJWT1,
          user: mockUser1,
        },
      },
    });

    const { result, rerender } = renderHook(() => useSiteAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isSiteAdmin).toBe(false);

    // Change user to admin
    const mockUser2: User = {
      id: "user-2",
      email: "admin@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    } as User;

    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser2,
      loading: false,
    });

    const mockJWT2 = createMockJWT({
      sub: "user-2",
      site_roles: ["site_admin"],
    });

    mockAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: mockJWT2,
          user: mockUser2,
        },
      },
    });

    rerender();

    await waitFor(() => {
      expect(result.current.isSiteAdmin).toBe(true);
    });

    expect(result.current.siteRoles).toEqual(["site_admin"]);
  });

  it("should combine loading states from auth context and hook", () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    const { result } = renderHook(() => useSiteAdmin());

    // Both auth loading and hook loading should be considered
    expect(result.current.isLoading).toBe(true);
  });
});
