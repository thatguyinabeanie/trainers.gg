/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// -- Mock setup --
// Define mock functions before jest.mock() calls so they're hoisted correctly.
const mockGetUser = jest.fn();
const mockCookieStore = {
  getAll: jest.fn().mockReturnValue([]),
  set: jest.fn(),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue(mockCookieStore),
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock @supabase/supabase-js for createServiceRoleClient
const mockCreateSupabaseClient = jest.fn().mockReturnValue({});
jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateSupabaseClient,
}));

// -- Import the module under test after mocks are in place --
import {
  getUser,
  isAuthenticated,
  getUserId,
  createServiceRoleClient,
  createStorageClient,
} from "../server";

describe("supabase/server", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set required environment variables for each test
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  // ── getUser ──────────────────────────────────────────────────────────

  describe("getUser", () => {
    it("returns user when auth succeeds", async () => {
      // Arrange: simulate a successful auth response with a user object
      const mockUser = {
        id: "user-abc-123",
        email: "ash@trainers.gg",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2025-01-01T00:00:00Z",
      };
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Act
      const result = await getUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });

    it("returns null on auth error", async () => {
      // Arrange: simulate an auth error (e.g., invalid token)
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Invalid JWT"),
      });

      // Act
      const result = await getUser();

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error getting user:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("returns null when no user (session expired)", async () => {
      // Arrange: no error, but user is null (session expired / not logged in)
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await getUser();

      // Assert
      expect(result).toBeNull();
    });
  });

  // ── isAuthenticated ──────────────────────────────────────────────────

  describe("isAuthenticated", () => {
    it("returns true when user exists", async () => {
      // Arrange: getUser resolves with a valid user
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "user-abc-123",
            email: "ash@trainers.gg",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "2025-01-01T00:00:00Z",
          },
        },
        error: null,
      });

      // Act
      const result = await isAuthenticated();

      // Assert
      expect(result).toBe(true);
    });

    it("returns false when user is null", async () => {
      // Arrange: getUser resolves with no user
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await isAuthenticated();

      // Assert
      expect(result).toBe(false);
    });
  });

  // ── getUserId ────────────────────────────────────────────────────────

  describe("getUserId", () => {
    it("returns user ID when authenticated", async () => {
      // Arrange: getUser resolves with a user that has an ID
      const expectedId = "user-abc-123";
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: expectedId,
            email: "ash@trainers.gg",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "2025-01-01T00:00:00Z",
          },
        },
        error: null,
      });

      // Act
      const result = await getUserId();

      // Assert
      expect(result).toBe(expectedId);
    });

    it("returns null when not authenticated", async () => {
      // Arrange: getUser resolves with no user
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await getUserId();

      // Assert
      expect(result).toBeNull();
    });
  });

  // ── createServiceRoleClient ──────────────────────────────────────────

  describe("createServiceRoleClient", () => {
    it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
      // Arrange: remove the service role key from the environment
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Act & Assert
      expect(() => createServiceRoleClient()).toThrow(
        "Missing SUPABASE_SERVICE_ROLE_KEY environment variable for service role client"
      );
    });
  });

  // ── createStorageClient ──────────────────────────────────────────────

  describe("createStorageClient", () => {
    it("returns service role client for 127.0.0.1 URL", async () => {
      // Arrange: local dev URL using 127.0.0.1
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

      // Act
      await createStorageClient();

      // Assert: service role path uses @supabase/supabase-js createClient
      expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
        "http://127.0.0.1:54321",
        "test-service-role-key",
        expect.objectContaining({
          auth: { autoRefreshToken: false, persistSession: false },
        })
      );
    });

    it("returns service role client for localhost URL", async () => {
      // Arrange: local dev URL using localhost
      process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

      // Act
      await createStorageClient();

      // Assert: same service role path
      expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
        "http://localhost:54321",
        "test-service-role-key",
        expect.objectContaining({
          auth: { autoRefreshToken: false, persistSession: false },
        })
      );
    });

    it("returns authenticated client for production URL", async () => {
      // Arrange: production Supabase URL
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";

      // Import the mock to check it was called
      const { createServerClient } = await import("@supabase/ssr");

      // Clear to isolate this test's call
      (createServerClient as jest.Mock).mockClear();

      // Act
      await createStorageClient();

      // Assert: production path uses @supabase/ssr createServerClient (authenticated)
      expect(createServerClient).toHaveBeenCalled();
      expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
    });
  });
});
