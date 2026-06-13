/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedPlayerProfile = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@/lib/data/players-endpoints", () => ({
  getCachedPlayerProfile: (...args: unknown[]) =>
    mockGetCachedPlayerProfile(...args),
}));

jest.mock("@/lib/api/auth", () => ({
  resolveApiAuth: (...args: unknown[]) => mockResolveApiAuth(...args),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  extractRequestIp: jest.fn(() => "127.0.0.1"),
  DEFAULT_API_LIMIT: 120,
  DEFAULT_WINDOW_MS: 60_000,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NextRequest } from "next/server";

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const FULL_PROFILE = {
  type: "profile" as const,
  userId: "u1",
  username: "ash",
  country: "US",
  did: null,
  pdsHandle: null,
  createdAt: "2024-01-01T00:00:00Z",
  mainAlt: { id: 1, username: "ash", bio: null, avatar_url: null },
  alts: [{ id: 1, username: "ash", bio: null, avatar_url: null }],
  altIds: [1],
  resolvedViaAlt: null,
};

const PRIVATE_ALT_PROFILE = { type: "private-alt" as const, altUsername: "secretalt" };

const AUTHED_USER = { mode: "cookie" as const, userId: "user-123", supabase: {} };
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = { allowed: false, remaining: 0, resetAt: new Date("2030-01-01") };

function makeRequest(username?: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/players/${username ?? "ash"}`
  );
}

function makeParams(username: string) {
  return { params: Promise.resolve({ username }) };
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedPlayerProfile.mockResolvedValue(FULL_PROFILE);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for anonymous requests", async () => {
    const response = await GET(makeRequest("ash"), makeParams("ash"));

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedPlayerProfile).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest("ash"), makeParams("ash"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedPlayerProfile).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Profile not found
// =============================================================================

describe("not found", () => {
  it("returns 404 when the player does not exist", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
    mockGetCachedPlayerProfile.mockResolvedValue(null);

    const response = await GET(
      makeRequest("unknown-player"),
      makeParams("unknown-player")
    );

    expect(response.status).toBe(404);
    expect(await getJson(response)).toEqual({ error: "Player not found" });
  });
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + full profile with Cache-Control header", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(makeRequest("ash"), makeParams("ash"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(FULL_PROFILE);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("passes the username to getCachedPlayerProfile", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    await GET(makeRequest("ash"), makeParams("ash"));

    expect(mockGetCachedPlayerProfile).toHaveBeenCalledWith("ash");
  });

  it("returns 200 + private-alt sentinel when the handle is a private alt", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
    mockGetCachedPlayerProfile.mockResolvedValue(PRIVATE_ALT_PROFILE);

    const response = await GET(makeRequest("secretalt"), makeParams("secretalt"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(PRIVATE_ALT_PROFILE);
  });

  it("accepts a Bearer token (mobile auth mode)", async () => {
    mockResolveApiAuth.mockResolvedValue({
      mode: "bearer" as const,
      userId: "mobile-user",
      supabase: {},
    });

    const response = await GET(makeRequest("ash"), makeParams("ash"));

    expect(response.status).toBe(200);
  });
});
