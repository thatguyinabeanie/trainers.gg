/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Supabase client
const mockGetUser = jest.fn();
const mockCreateBrowserClient = jest.fn(() => ({
  auth: {
    getUser: mockGetUser,
  },
}));

jest.mock("../client", () => ({
  createClient: mockCreateBrowserClient,
}));

// Import after mocking
import {
  getUserClient,
  getAuthUrls,
  oauthProviders,
  blueskyProvider,
} from "../auth";
import type { OAuthProvider, BlueskyProvider } from "../auth";

describe("auth.ts - Client-side auth utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  describe("getUserClient", () => {
    it("should return user when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await getUserClient();

      expect(user).toEqual(mockUser);
      expect(mockCreateBrowserClient).toHaveBeenCalled();
      expect(mockGetUser).toHaveBeenCalled();
    });

    it("should return null when not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const user = await getUserClient();

      expect(user).toBeNull();
      expect(mockGetUser).toHaveBeenCalled();
    });

    it("should return null and log error on auth failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const mockError = { message: "Network error" };
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const user = await getUserClient();

      expect(user).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error getting user:",
        mockError
      );

      consoleErrorSpy.mockRestore();
    });

    it("should create a new Supabase client each time", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await getUserClient();
      await getUserClient();

      // Should create client twice
      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2);
    });

    it("should handle Supabase client creation failure", async () => {
      mockCreateBrowserClient.mockImplementationOnce(() => {
        throw new Error("Client creation failed");
      });

      await expect(getUserClient()).rejects.toThrow("Client creation failed");
    });
  });

  describe("getAuthUrls", () => {
    it("should return localhost URLs when SITE_URL is not set", () => {
      const urls = getAuthUrls();

      expect(urls).toEqual({
        signIn: "http://localhost:3000/sign-in",
        signUp: "http://localhost:3000/sign-up",
        callback: "http://localhost:3000/auth/callback",
        redirectAfterSignIn: "http://localhost:3000/",
        redirectAfterSignOut: "http://localhost:3000",
      });
    });

    it("should use NEXT_PUBLIC_SITE_URL when set", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://trainers.gg";

      const urls = getAuthUrls();

      expect(urls).toEqual({
        signIn: "https://trainers.gg/sign-in",
        signUp: "https://trainers.gg/sign-up",
        callback: "https://trainers.gg/auth/callback",
        redirectAfterSignIn: "https://trainers.gg/",
        redirectAfterSignOut: "https://trainers.gg",
      });
    });

    it("should handle SITE_URL with trailing slash", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://trainers.gg/";

      const urls = getAuthUrls();

      // Should use URL as-is even with trailing slash
      expect(urls.signIn).toBe("https://trainers.gg//sign-in");
    });

    it("should construct correct paths for all auth flows", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://staging.trainers.gg";

      const urls = getAuthUrls();

      expect(urls.signIn).toContain("/sign-in");
      expect(urls.signUp).toContain("/sign-up");
      expect(urls.callback).toContain("/auth/callback");
      expect(urls.redirectAfterSignIn).toContain("/");
      expect(urls.redirectAfterSignOut).not.toContain("undefined");
    });
  });

  describe("oauthProviders", () => {
    it("should export correct provider list", () => {
      expect(oauthProviders).toHaveLength(4);
    });

    it("should include Google provider with correct config", () => {
      const google = oauthProviders.find((p) => p.name === "google");

      expect(google).toEqual({
        name: "google",
        displayName: "Google",
        icon: "google",
        type: "supabase",
      });
    });

    it("should include Twitter/X provider with correct config", () => {
      const twitter = oauthProviders.find((p) => p.name === "twitter");

      expect(twitter).toEqual({
        name: "twitter",
        displayName: "X",
        icon: "twitter",
        type: "supabase",
      });
    });

    it("should include Discord provider with correct config", () => {
      const discord = oauthProviders.find((p) => p.name === "discord");

      expect(discord).toEqual({
        name: "discord",
        displayName: "Discord",
        icon: "discord",
        type: "supabase",
      });
    });

    it("should include GitHub provider with correct config", () => {
      const github = oauthProviders.find((p) => p.name === "github");

      expect(github).toEqual({
        name: "github",
        displayName: "GitHub",
        icon: "github",
        type: "supabase",
      });
    });

    it("should mark all providers as supabase type", () => {
      const allSupabase = oauthProviders.every((p) => p.type === "supabase");
      expect(allSupabase).toBe(true);
    });

    it("should have unique provider names", () => {
      const names = oauthProviders.map((p) => p.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });

    it("should have display names for all providers", () => {
      const allHaveDisplayNames = oauthProviders.every(
        (p) => p.displayName && p.displayName.length > 0
      );

      expect(allHaveDisplayNames).toBe(true);
    });

    it("should have icons for all providers", () => {
      const allHaveIcons = oauthProviders.every(
        (p) => p.icon && p.icon.length > 0
      );

      expect(allHaveIcons).toBe(true);
    });
  });

  describe("blueskyProvider", () => {
    it("should export Bluesky provider config", () => {
      expect(blueskyProvider).toEqual({
        name: "bluesky",
        displayName: "Bluesky",
        icon: "bluesky",
        type: "atproto",
      });
    });

    it("should be marked as atproto type", () => {
      expect(blueskyProvider.type).toBe("atproto");
    });

    it("should be separate from Supabase OAuth providers", () => {
      const inOAuthProviders = oauthProviders.some((p) => p.name === "bluesky");

      expect(inOAuthProviders).toBe(false);
    });
  });

  describe("TypeScript types", () => {
    it("should properly type OAuthProvider", () => {
      const validProvider: OAuthProvider = "google";
      expect(validProvider).toBe("google");

      const twitterProvider: OAuthProvider = "twitter";
      expect(twitterProvider).toBe("twitter");

      const discordProvider: OAuthProvider = "discord";
      expect(discordProvider).toBe("discord");

      const githubProvider: OAuthProvider = "github";
      expect(githubProvider).toBe("github");
    });

    it("should properly type BlueskyProvider", () => {
      const provider: BlueskyProvider = blueskyProvider;

      expect(provider.name).toBe("bluesky");
      expect(provider.type).toBe("atproto");
    });
  });

  describe("Provider ordering", () => {
    it("should match documented order (Google, X, Discord, GitHub)", () => {
      const expectedOrder = ["google", "twitter", "discord", "github"];
      const actualOrder = oauthProviders.map((p) => p.name);

      expect(actualOrder).toEqual(expectedOrder);
    });

    it("should prioritize social platforms appropriately", () => {
      // Google and X should come before Discord and GitHub
      const googleIndex = oauthProviders.findIndex((p) => p.name === "google");
      const twitterIndex = oauthProviders.findIndex(
        (p) => p.name === "twitter"
      );
      const discordIndex = oauthProviders.findIndex(
        (p) => p.name === "discord"
      );
      const githubIndex = oauthProviders.findIndex((p) => p.name === "github");

      expect(googleIndex).toBeLessThan(discordIndex);
      expect(googleIndex).toBeLessThan(githubIndex);
      expect(twitterIndex).toBeLessThan(discordIndex);
      expect(twitterIndex).toBeLessThan(githubIndex);
    });
  });
});
