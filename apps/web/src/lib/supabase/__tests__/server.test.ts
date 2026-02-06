/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock dependencies
const mockCreateServerClient = jest.fn();
const mockCreateSupabaseClient = jest.fn();
const mockCookies = {
  getAll: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
};

jest.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateSupabaseClient,
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => mockCookies),
}));

// Import after mocking
import {
  createStaticClient,
  createClient,
  createClientReadOnly,
  getUser,
  isAuthenticated,
  getUserId,
  createServiceRoleClient,
  createAtprotoServiceClient,
  createAtprotoClient,
} from "../server";

describe("server.ts - Supabase server utilities", () => {
  const mockEnv = {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = mockEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = mockEnv.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe("createStaticClient", () => {
    it("should create a static client without cookies", () => {
      const mockClient = { from: jest.fn() };
      mockCreateSupabaseClient.mockReturnValue(mockClient);

      const client = createStaticClient();

      expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      expect(client).toBe(mockClient);
    });

    it("should not involve cookies module", () => {
      mockCreateSupabaseClient.mockReturnValue({ from: jest.fn() });

      createStaticClient();

      // Should not call cookies() since it's a static client
      expect(mockCookies.getAll).not.toHaveBeenCalled();
      expect(mockCookies.set).not.toHaveBeenCalled();
    });
  });

  describe("createClient", () => {
    it("should create server client with cookie handlers", async () => {
      const mockClient = { from: jest.fn() };
      const mockCookieData = [
        { name: "cookie1", value: "value1" },
        { name: "cookie2", value: "value2" },
      ];

      mockCookies.getAll.mockReturnValue(mockCookieData);
      mockCreateServerClient.mockReturnValue(mockClient);

      const client = await createClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(client).toBe(mockClient);
    });

    it("should properly handle getAll cookies", async () => {
      const mockCookieData = [
        { name: "sb-token", value: "token123" },
        { name: "other", value: "value" },
      ];

      mockCookies.getAll.mockReturnValue(mockCookieData);
      mockCreateServerClient.mockImplementation((url, key, options) => {
        const result = options.cookies.getAll();
        expect(result).toEqual(mockCookieData);
        return { from: jest.fn() };
      });

      await createClient();

      expect(mockCookies.getAll).toHaveBeenCalled();
    });

    it("should properly handle setAll cookies", async () => {
      mockCookies.getAll.mockReturnValue([]);
      mockCreateServerClient.mockImplementation((url, key, options) => {
        const cookiesToSet = [
          {
            name: "sb-access-token",
            value: "token123",
            options: { httpOnly: true, secure: true },
          },
          {
            name: "sb-refresh-token",
            value: "refresh123",
            options: { httpOnly: true, secure: true },
          },
        ];
        options.cookies.setAll(cookiesToSet);
        return { from: jest.fn() };
      });

      await createClient();

      expect(mockCookies.set).toHaveBeenCalledTimes(2);
      expect(mockCookies.set).toHaveBeenCalledWith(
        "sb-access-token",
        "token123",
        { httpOnly: true, secure: true }
      );
      expect(mockCookies.set).toHaveBeenCalledWith(
        "sb-refresh-token",
        "refresh123",
        { httpOnly: true, secure: true }
      );
    });

    it("should warn when cookie setting fails", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.set.mockImplementation(() => {
        throw new Error("Cookie write error");
      });

      mockCreateServerClient.mockImplementation((url, key, options) => {
        options.cookies.setAll([{ name: "test", value: "value", options: {} }]);
        return { from: jest.fn() };
      });

      await createClient();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to set cookies in Server Component:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("createClientReadOnly", () => {
    it("should create read-only client that can read but not write cookies", async () => {
      const mockCookieData = [{ name: "sb-token", value: "token123" }];
      mockCookies.getAll.mockReturnValue(mockCookieData);

      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Verify getAll works
        const cookies = options.cookies.getAll();
        expect(cookies).toEqual(mockCookieData);

        // Verify setAll is a no-op
        options.cookies.setAll([{ name: "test", value: "value", options: {} }]);

        return { from: jest.fn() };
      });

      await createClientReadOnly();

      // setAll should be called (by Supabase internals) but do nothing
      expect(mockCookies.set).not.toHaveBeenCalled();
    });

    it("should read cookies successfully", async () => {
      const mockCookieData = [
        { name: "sb-access-token", value: "token123" },
        { name: "sb-refresh-token", value: "refresh123" },
      ];

      mockCookies.getAll.mockReturnValue(mockCookieData);
      mockCreateServerClient.mockImplementation((url, key, options) => {
        const result = options.cookies.getAll();
        expect(result).toEqual(mockCookieData);
        return { from: jest.fn() };
      });

      await createClientReadOnly();

      expect(mockCookies.getAll).toHaveBeenCalled();
    });
  });

  describe("getUser", () => {
    it("should return user when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.get.mockReturnValue(undefined);
      mockCreateServerClient.mockReturnValue(mockSupabase);

      const user = await getUser();

      expect(user).toEqual(mockUser);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it("should return null when not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.get.mockReturnValue(undefined);
      mockCreateServerClient.mockReturnValue(mockSupabase);

      const user = await getUser();

      expect(user).toBeNull();
    });

    it("should return null and log error on auth failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Auth error" },
          }),
        },
      };

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.get.mockReturnValue(undefined);
      mockCreateServerClient.mockReturnValue(mockSupabase);

      const user = await getUser();

      expect(user).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting user:",
        expect.objectContaining({ message: "Auth error" })
      );

      consoleErrorSpy.mockRestore();
    });

    it("should return mock user in E2E test mode", async () => {
      mockCookies.get.mockReturnValue({ value: "true" });

      const user = await getUser();

      expect(user).toEqual({
        id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
        email: "player@trainers.local",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: expect.any(String),
      });

      // Should not call Supabase in E2E mode
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    });

    it("should only check e2e-test-mode cookie, not call Supabase when present", async () => {
      mockCookies.get.mockReturnValue({ value: "true" });

      await getUser();

      expect(mockCookies.get).toHaveBeenCalledWith("e2e-test-mode");
      expect(mockCreateServerClient).not.toHaveBeenCalled();
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when user is authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.get.mockReturnValue(undefined);
      mockCreateServerClient.mockReturnValue(mockSupabase);

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it("should return false when user is not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.get.mockReturnValue(undefined);
      mockCreateServerClient.mockReturnValue(mockSupabase);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe("getUserId", () => {
    it("should return user ID when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.get.mockReturnValue(undefined);
      mockCreateServerClient.mockReturnValue(mockSupabase);

      const userId = await getUserId();

      expect(userId).toBe("user-123");
    });

    it("should return null when not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.get.mockReturnValue(undefined);
      mockCreateServerClient.mockReturnValue(mockSupabase);

      const userId = await getUserId();

      expect(userId).toBeNull();
    });
  });

  describe("createServiceRoleClient", () => {
    it("should create service role client with correct config", () => {
      const mockClient = { from: jest.fn() };
      mockCreateSupabaseClient.mockReturnValue(mockClient);

      const client = createServiceRoleClient();

      expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      expect(client).toBe(mockClient);
    });

    it("should throw error when SUPABASE_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => createServiceRoleClient()).toThrow(
        "Missing SUPABASE_SERVICE_ROLE_KEY environment variable for service role client"
      );
    });

    it("should throw error when SERVICE_ROLE_KEY is missing", () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createServiceRoleClient()).toThrow(
        "Missing SUPABASE_SERVICE_ROLE_KEY environment variable for service role client"
      );
    });

    it("should not use cookies", () => {
      mockCreateSupabaseClient.mockReturnValue({ from: jest.fn() });

      createServiceRoleClient();

      // Service role client should never touch cookies
      expect(mockCookies.getAll).not.toHaveBeenCalled();
      expect(mockCookies.set).not.toHaveBeenCalled();
    });
  });

  describe("createAtprotoServiceClient", () => {
    it("should create AT Protocol service client with correct config", () => {
      const mockClient = { from: jest.fn() };
      mockCreateSupabaseClient.mockReturnValue(mockClient);

      const client = createAtprotoServiceClient();

      expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      expect(client).toBe(mockClient);
    });

    it("should throw error when SUPABASE_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => createAtprotoServiceClient()).toThrow(
        "Missing SUPABASE_SERVICE_ROLE_KEY environment variable for service role client"
      );
    });

    it("should throw error when SERVICE_ROLE_KEY is missing", () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createAtprotoServiceClient()).toThrow(
        "Missing SUPABASE_SERVICE_ROLE_KEY environment variable for service role client"
      );
    });
  });

  describe("createAtprotoClient", () => {
    it("should create AT Protocol client with cookie handlers", async () => {
      const mockClient = { from: jest.fn() };
      const mockCookieData = [{ name: "sb-token", value: "token123" }];

      mockCookies.getAll.mockReturnValue(mockCookieData);
      mockCreateServerClient.mockReturnValue(mockClient);

      const client = await createAtprotoClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(client).toBe(mockClient);
    });

    it("should handle cookie operations like regular createClient", async () => {
      const mockCookieData = [{ name: "sb-token", value: "token123" }];

      mockCookies.getAll.mockReturnValue(mockCookieData);
      mockCreateServerClient.mockImplementation((url, key, options) => {
        const cookies = options.cookies.getAll();
        expect(cookies).toEqual(mockCookieData);

        options.cookies.setAll([
          { name: "new-cookie", value: "new-value", options: {} },
        ]);

        return { from: jest.fn() };
      });

      await createAtprotoClient();

      expect(mockCookies.set).toHaveBeenCalledWith(
        "new-cookie",
        "new-value",
        {}
      );
    });

    it("should warn on cookie setting failure", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      mockCookies.getAll.mockReturnValue([]);
      mockCookies.set.mockImplementation(() => {
        throw new Error("Cookie error");
      });

      mockCreateServerClient.mockImplementation((url, key, options) => {
        options.cookies.setAll([{ name: "test", value: "value", options: {} }]);
        return { from: jest.fn() };
      });

      await createAtprotoClient();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to set cookies in Server Component:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
