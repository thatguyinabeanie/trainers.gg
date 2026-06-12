/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedLeaderboard = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@/lib/data/players-endpoints", () => ({
  getCachedLeaderboard: (...args: unknown[]) =>
    mockGetCachedLeaderboard(...args),
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

const LEADERBOARD = [
  {
    userId: "u1",
    username: "ash",
    avatarUrl: null,
    rating: 1600,
    skillBracket: "expert",
    gamesPlayed: 50,
  },
];

const AUTHED_USER = { mode: "cookie" as const, userId: "user-123", supabase: {} };
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = { allowed: false, remaining: 0, resetAt: new Date("2030-01-01") };

function makeRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/players/leaderboard");
  for (const [key, val] of Object.entries(searchParams)) {
    url.searchParams.set(key, val);
  }
  return new NextRequest(url.toString());
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedLeaderboard.mockResolvedValue(LEADERBOARD);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for anonymous requests", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedLeaderboard).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedLeaderboard).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Query param validation
// =============================================================================

describe("limit param validation", () => {
  it.each([
    ["abc", "non-numeric"],
    ["0", "zero"],
    ["51", "above max (50)"],
    ["-1", "negative"],
    ["1.5", "float"],
  ])("returns 400 for limit=%s (%s)", async (limitVal) => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(makeRequest({ limit: limitVal }));

    expect(response.status).toBe(400);
  });
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + leaderboard with Cache-Control header", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(LEADERBOARD);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("passes limit param to getCachedLeaderboard", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    await GET(makeRequest({ limit: "10" }));

    expect(mockGetCachedLeaderboard).toHaveBeenCalledWith(10);
  });

  it("defaults to limit=5 when not provided", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    await GET(makeRequest());

    expect(mockGetCachedLeaderboard).toHaveBeenCalledWith(5);
  });

  it("accepts a Bearer token (mobile auth mode)", async () => {
    mockResolveApiAuth.mockResolvedValue({
      mode: "bearer" as const,
      userId: "mobile-user",
      supabase: {},
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
  });
});
