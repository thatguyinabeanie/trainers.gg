/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock dependencies - must set up return value before importing the module
const mockCreateBrowserClient = jest.fn(() => ({
  auth: { getUser: jest.fn() },
  from: jest.fn(),
}));

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

// Import after mocking - supabase singleton will be created with the mock
import { createClient, supabase } from "../client";

describe("client.ts - Browser client wrapper", () => {
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
    it("should create browser client with correct config", () => {
      const mockClient = {
        auth: { getUser: jest.fn() },
        from: jest.fn(),
      };

      mockCreateBrowserClient.mockReturnValueOnce(mockClient);

      const client = createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      expect(client).toBe(mockClient);
    });

    it("should create a new client on each call", () => {
      const mockClient1 = { id: 1, auth: { getUser: jest.fn() } };
      const mockClient2 = { id: 2, auth: { getUser: jest.fn() } };

      mockCreateBrowserClient
        .mockReturnValueOnce(mockClient1)
        .mockReturnValueOnce(mockClient2);

      const client1 = createClient();
      const client2 = createClient();

      expect(client1).toBe(mockClient1);
      expect(client2).toBe(mockClient2);
      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2);
    });

    it("should handle missing environment variables", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      mockCreateBrowserClient.mockReturnValueOnce({
        auth: { getUser: jest.fn() },
      });

      createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        undefined,
        undefined
      );
    });
  });

  describe("supabase singleton", () => {
    it("should export a default Supabase client instance", () => {
      // Supabase singleton is created at module load time with the default mock
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(supabase.from).toBeDefined();
    });
  });

  describe("Client configuration", () => {
    it("should use browser client, not server client", () => {
      mockCreateBrowserClient.mockReturnValueOnce({
        auth: { getUser: jest.fn() },
      });

      createClient();

      // Should call createBrowserClient, not createServerClient
      expect(mockCreateBrowserClient).toHaveBeenCalled();
    });

    it("should not include cookie handlers", () => {
      mockCreateBrowserClient.mockImplementationOnce((url, key, options) => {
        // Browser client should not receive cookie options
        expect(options).toBeUndefined();
        return { auth: { getUser: jest.fn() } };
      });

      createClient();
    });

    it("should use public environment variables", () => {
      // Set production-like env vars
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "prod-anon-key";

      mockCreateBrowserClient.mockReturnValueOnce({
        auth: { getUser: jest.fn() },
      });

      createClient();

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        "https://prod.supabase.co",
        "prod-anon-key"
      );
    });
  });

  describe("Type safety", () => {
    it("should return typed Supabase client", () => {
      const mockClient = {
        auth: {
          getUser: jest.fn(),
          signIn: jest.fn(),
          signOut: jest.fn(),
        },
        from: jest.fn(),
      };

      mockCreateBrowserClient.mockReturnValueOnce(mockClient);

      const client = createClient();

      // Should have auth methods
      expect(client.auth).toBeDefined();
      expect(typeof client.auth.getUser).toBe("function");
      expect(typeof client.from).toBe("function");
    });
  });
});
