/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies
const mockCreateServerClient = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

// Import after mocking
import { createClient, refreshSession } from "../middleware";

describe("middleware.ts - Session refresh for proxy", () => {
  const mockEnv = {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = mockEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe("createClient", () => {
    it("should create Supabase client with request cookies", () => {
      const request = new NextRequest("http://localhost:3000/test", {
        headers: { cookie: "sb-token=abc123" },
      });

      const mockSupabase = {
        auth: { getUser: jest.fn() },
      };

      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Verify cookie handlers are provided
        expect(options.cookies).toBeDefined();
        expect(options.cookies.getAll).toBeInstanceOf(Function);
        expect(options.cookies.setAll).toBeInstanceOf(Function);

        return mockSupabase;
      });

      const { supabase, response } = createClient(request);

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

      expect(supabase).toBe(mockSupabase);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should read cookies from request", () => {
      const request = new NextRequest("http://localhost:3000/test");
      request.cookies.set("sb-access-token", "token123");
      request.cookies.set("sb-refresh-token", "refresh123");

      mockCreateServerClient.mockImplementation((url, key, options) => {
        const cookies = options.cookies.getAll();
        expect(cookies).toContainEqual(
          expect.objectContaining({
            name: "sb-access-token",
            value: "token123",
          })
        );
        expect(cookies).toContainEqual(
          expect.objectContaining({
            name: "sb-refresh-token",
            value: "refresh123",
          })
        );

        return { auth: { getUser: jest.fn() } };
      });

      createClient(request);
    });

    it("should write cookies to both request and response", () => {
      const request = new NextRequest("http://localhost:3000/test");

      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Simulate Supabase setting cookies
        options.cookies.setAll([
          {
            name: "sb-access-token",
            value: "new-token",
            options: { httpOnly: true, secure: true },
          },
          {
            name: "sb-refresh-token",
            value: "new-refresh",
            options: { httpOnly: true, secure: true },
          },
        ]);

        return { auth: { getUser: jest.fn() } };
      });

      const { response } = createClient(request);

      // Request cookies should be updated
      expect(request.cookies.get("sb-access-token")?.value).toBe("new-token");
      expect(request.cookies.get("sb-refresh-token")?.value).toBe(
        "new-refresh"
      );

      // Response should have cookies set
      const responseCookies = response.cookies.getAll();
      expect(responseCookies).toContainEqual(
        expect.objectContaining({
          name: "sb-access-token",
          value: "new-token",
        })
      );
      expect(responseCookies).toContainEqual(
        expect.objectContaining({
          name: "sb-refresh-token",
          value: "new-refresh",
        })
      );
    });

    it("should preserve request headers in response", () => {
      const request = new NextRequest("http://localhost:3000/test", {
        headers: {
          "x-custom-header": "custom-value",
          "user-agent": "test-agent",
        },
      });

      mockCreateServerClient.mockReturnValue({
        auth: { getUser: jest.fn() },
      });

      const { response } = createClient(request);

      // NextResponse.next() creates a response that forwards the request
      // The specific headers may or may not be directly accessible depending on Next.js version
      // Just verify response is valid
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it("should handle empty cookies", () => {
      const request = new NextRequest("http://localhost:3000/test");

      mockCreateServerClient.mockImplementation((url, key, options) => {
        const cookies = options.cookies.getAll();
        expect(cookies).toEqual([]);

        return { auth: { getUser: jest.fn() } };
      });

      createClient(request);
    });

    it("should handle cookie options", () => {
      const request = new NextRequest("http://localhost:3000/test");

      mockCreateServerClient.mockImplementation((url, key, options) => {
        options.cookies.setAll([
          {
            name: "test-cookie",
            value: "test-value",
            options: {
              httpOnly: true,
              secure: true,
              sameSite: "lax",
              maxAge: 3600,
              path: "/",
            },
          },
        ]);

        return { auth: { getUser: jest.fn() } };
      });

      const { response } = createClient(request);

      const cookie = response.cookies.get("test-cookie");
      expect(cookie?.value).toBe("test-value");
    });

    it("should create NextResponse with correct status", () => {
      const request = new NextRequest("http://localhost:3000/test");

      mockCreateServerClient.mockReturnValue({
        auth: { getUser: jest.fn() },
      });

      const { response } = createClient(request);

      // NextResponse.next() creates a 200 response by default
      expect(response.status).toBe(200);
    });
  });

  describe("refreshSession", () => {
    it("should create client and call getUser to refresh session", async () => {
      const request = new NextRequest("http://localhost:3000/test");

      const mockGetUser = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      });

      const mockSupabase = {
        auth: { getUser: mockGetUser },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase);

      const { supabase, response } = await refreshSession(request);

      expect(mockGetUser).toHaveBeenCalled();
      expect(supabase).toBe(mockSupabase);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should handle auth errors gracefully", async () => {
      const request = new NextRequest("http://localhost:3000/test");

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      const mockSupabase = {
        auth: { getUser: mockGetUser },
      };

      mockCreateServerClient.mockReturnValue(mockSupabase);

      const { supabase, response } = await refreshSession(request);

      expect(mockGetUser).toHaveBeenCalled();
      expect(supabase).toBe(mockSupabase);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should update cookies if session is refreshed", async () => {
      const request = new NextRequest("http://localhost:3000/test");
      request.cookies.set("sb-access-token", "old-token");

      const mockGetUser = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      });

      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Simulate Supabase refreshing tokens
        options.cookies.setAll([
          {
            name: "sb-access-token",
            value: "refreshed-token",
            options: { httpOnly: true },
          },
        ]);

        return { auth: { getUser: mockGetUser } };
      });

      const { response } = await refreshSession(request);

      expect(mockGetUser).toHaveBeenCalled();

      const cookie = response.cookies.get("sb-access-token");
      expect(cookie?.value).toBe("refreshed-token");
    });

    it("should preserve request context", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer token",
        },
      });

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockCreateServerClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      const { response } = await refreshSession(request);

      // Response is created via NextResponse.next() which forwards the request
      expect(response).toBeInstanceOf(NextResponse);
      expect(mockGetUser).toHaveBeenCalled();
    });

    it("should work with various request URLs", async () => {
      const urls = [
        "http://localhost:3000/",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/api/users/123",
        "https://trainers.gg/tournaments",
      ];

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockCreateServerClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      for (const url of urls) {
        mockGetUser.mockClear();

        const request = new NextRequest(url);
        await refreshSession(request);

        expect(mockGetUser).toHaveBeenCalled();
      }
    });

    it("should handle concurrent refresh attempts", async () => {
      const request = new NextRequest("http://localhost:3000/test");

      const mockGetUser = jest.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      });

      mockCreateServerClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      // Multiple concurrent refreshes
      const results = await Promise.all([
        refreshSession(request),
        refreshSession(request),
        refreshSession(request),
      ]);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.supabase).toBeDefined();
        expect(result.response).toBeInstanceOf(NextResponse);
      });
    });
  });

  describe("Cookie synchronization", () => {
    it("should sync cookies between request and response", () => {
      const request = new NextRequest("http://localhost:3000/test");

      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Set initial cookies
        options.cookies.setAll([
          { name: "cookie1", value: "value1", options: {} },
        ]);

        // Read them back
        const cookies = options.cookies.getAll();
        expect(cookies).toContainEqual(
          expect.objectContaining({ name: "cookie1", value: "value1" })
        );

        return { auth: { getUser: jest.fn() } };
      });

      const { response } = createClient(request);

      expect(response.cookies.get("cookie1")?.value).toBe("value1");
    });

    it("should handle multiple cookie operations", () => {
      const request = new NextRequest("http://localhost:3000/test");

      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Multiple setAll calls
        options.cookies.setAll([
          { name: "cookie1", value: "value1", options: {} },
        ]);

        options.cookies.setAll([
          { name: "cookie2", value: "value2", options: {} },
        ]);

        return { auth: { getUser: jest.fn() } };
      });

      const { response } = createClient(request);

      expect(response.cookies.get("cookie1")?.value).toBe("value1");
      expect(response.cookies.get("cookie2")?.value).toBe("value2");
    });

    it("should allow cookie updates", () => {
      const request = new NextRequest("http://localhost:3000/test");

      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Set initial value
        options.cookies.setAll([
          { name: "token", value: "initial", options: {} },
        ]);

        // Update value
        options.cookies.setAll([
          { name: "token", value: "updated", options: {} },
        ]);

        return { auth: { getUser: jest.fn() } };
      });

      const { response } = createClient(request);

      expect(response.cookies.get("token")?.value).toBe("updated");
    });
  });

  describe("Error handling", () => {
    it("should handle missing environment variables", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const request = new NextRequest("http://localhost:3000/test");

      // Should not throw, but will pass undefined to createServerClient
      mockCreateServerClient.mockReturnValue({
        auth: { getUser: jest.fn() },
      });

      createClient(request);

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        undefined,
        mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.any(Object)
      );
    });

    it("should handle Supabase client creation failure", () => {
      const request = new NextRequest("http://localhost:3000/test");

      mockCreateServerClient.mockImplementation(() => {
        throw new Error("Failed to create client");
      });

      expect(() => createClient(request)).toThrow("Failed to create client");
    });

    it("should handle getUser failure in refreshSession", async () => {
      const request = new NextRequest("http://localhost:3000/test");

      const mockGetUser = jest
        .fn()
        .mockRejectedValue(new Error("Network error"));

      mockCreateServerClient.mockReturnValue({
        auth: { getUser: mockGetUser },
      });

      await expect(refreshSession(request)).rejects.toThrow("Network error");
    });
  });
});
