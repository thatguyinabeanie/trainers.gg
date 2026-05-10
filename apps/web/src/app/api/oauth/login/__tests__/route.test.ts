/**
 * @jest-environment node
 */

import { GET } from "../route";

// Mock dependencies
const mockStartAtprotoAuth = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/lib/atproto/oauth-client", () => ({
  startAtprotoAuth: (...args: unknown[]) => mockStartAtprotoAuth(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  getUser: () => mockGetUser(),
}));

describe("GET /api/oauth/login", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Not on Vercel preview by default
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createRequest(params: Record<string, string> = {}) {
    const url = new URL("http://localhost:3000/api/oauth/login");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return new Request(url.toString());
  }

  describe("link mode", () => {
    it("redirects to sign-in when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue(null);

      const response = await GET(
        createRequest({ handle: "user.bsky.social", mode: "link", returnUrl: "/dashboard/settings/account" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/sign-in");
      expect(location).toContain("redirect=%2Fdashboard%2Fsettings%2Faccount");
    });

    it("passes linkUserId to startAtprotoAuth when user is authenticated", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      mockStartAtprotoAuth.mockResolvedValue("https://bsky.social/oauth/authorize?state=abc");

      const response = await GET(
        createRequest({ handle: "user.bsky.social", mode: "link", returnUrl: "/dashboard/settings/account" })
      );

      expect(response.status).toBe(307);
      expect(mockStartAtprotoAuth).toHaveBeenCalledWith(
        "user.bsky.social",
        "/dashboard/settings/account",
        "user-123"
      );
    });

    it("does not pass linkUserId when mode is not link", async () => {
      mockStartAtprotoAuth.mockResolvedValue("https://bsky.social/oauth/authorize?state=abc");

      await GET(createRequest({ handle: "user.bsky.social" }));

      expect(mockStartAtprotoAuth).toHaveBeenCalledWith(
        "user.bsky.social",
        "/",
        undefined
      );
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe("returnUrl sanitization", () => {
    it("sanitizes open redirect attempts in returnUrl", async () => {
      mockStartAtprotoAuth.mockResolvedValue("https://bsky.social/oauth/authorize?state=abc");

      await GET(createRequest({ handle: "user.bsky.social", returnUrl: "//evil.com" }));

      // Should pass "/" (the fallback) instead of the malicious URL
      expect(mockStartAtprotoAuth).toHaveBeenCalledWith(
        "user.bsky.social",
        "/",
        undefined
      );
    });

    it("passes through safe relative URLs", async () => {
      mockStartAtprotoAuth.mockResolvedValue("https://bsky.social/oauth/authorize?state=abc");

      await GET(createRequest({ handle: "user.bsky.social", returnUrl: "/dashboard/tournaments" }));

      expect(mockStartAtprotoAuth).toHaveBeenCalledWith(
        "user.bsky.social",
        "/dashboard/tournaments",
        undefined
      );
    });
  });

  describe("handle normalization", () => {
    it("strips @ prefix from handle", async () => {
      mockStartAtprotoAuth.mockResolvedValue("https://bsky.social/oauth/authorize?state=abc");

      await GET(createRequest({ handle: "@user.bsky.social" }));

      expect(mockStartAtprotoAuth).toHaveBeenCalledWith(
        "user.bsky.social",
        "/",
        undefined
      );
    });

    it("defaults to bsky.social URL when no handle provided", async () => {
      mockStartAtprotoAuth.mockResolvedValue("https://bsky.social/oauth/authorize?state=abc");

      await GET(createRequest({}));

      expect(mockStartAtprotoAuth).toHaveBeenCalledWith(
        "https://bsky.social",
        "/",
        undefined
      );
    });
  });

  describe("Vercel preview detection", () => {
    it("returns 503 on Vercel preview deployments", async () => {
      process.env.VERCEL_ENV = "preview";

      const response = await GET(createRequest({ handle: "user.bsky.social" }));

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toContain("not available on preview");
    });

    it("allows requests on production deployments", async () => {
      process.env.VERCEL_ENV = "production";
      mockStartAtprotoAuth.mockResolvedValue("https://bsky.social/oauth/authorize?state=abc");

      const response = await GET(createRequest({ handle: "user.bsky.social" }));

      expect(response.status).toBe(307);
    });
  });

  describe("error handling", () => {
    it("returns 404 for handle resolution failures", async () => {
      mockStartAtprotoAuth.mockRejectedValue(new Error("Could not resolve handle"));

      const response = await GET(createRequest({ handle: "nonexistent.bsky.social" }));

      expect(response.status).toBe(404);
    });

    it("returns 503 for missing configuration", async () => {
      mockStartAtprotoAuth.mockRejectedValue(new Error("ATPROTO_PRIVATE_KEY is not set"));

      const response = await GET(createRequest({ handle: "user.bsky.social" }));

      expect(response.status).toBe(503);
    });

    it("returns 500 for unexpected errors", async () => {
      mockStartAtprotoAuth.mockRejectedValue(new Error("Something unexpected"));

      const response = await GET(createRequest({ handle: "user.bsky.social" }));

      expect(response.status).toBe(500);
    });
  });
});
