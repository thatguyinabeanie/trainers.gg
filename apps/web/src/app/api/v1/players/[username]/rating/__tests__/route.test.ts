/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedPlayerRating = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@/lib/data/players-endpoints", () => ({
  getCachedPlayerRating: (...args: unknown[]) =>
    mockGetCachedPlayerRating(...args),
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

const RATING = {
  altId: 42,
  format: "overall",
  rating: 1500,
  peakRating: 1550,
  gamesPlayed: 25,
  skillBracket: "intermediate",
  globalRank: 15,
};

const AUTHED_USER = { mode: "cookie" as const, userId: "user-123", supabase: {} };
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = { allowed: false, remaining: 0, resetAt: new Date("2030-01-01") };

function makeRequest(
  username: string,
  searchParams: Record<string, string> = {}
): NextRequest {
  const url = new URL(
    `http://localhost:3000/api/v1/players/${username}/rating`
  );
  for (const [key, val] of Object.entries(searchParams)) {
    url.searchParams.set(key, val);
  }
  return new NextRequest(url.toString());
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
  mockGetCachedPlayerRating.mockResolvedValue(RATING);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for anonymous requests", async () => {
    const response = await GET(
      makeRequest("ash", { altId: "42" }),
      makeParams("ash")
    );

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedPlayerRating).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(
      makeRequest("ash", { altId: "42" }),
      makeParams("ash")
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedPlayerRating).not.toHaveBeenCalled();
  });
});

// =============================================================================
// altId validation
// =============================================================================

describe("altId validation", () => {
  it("returns 400 when altId is missing", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(makeRequest("ash"), makeParams("ash"));

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({ error: "Missing altId parameter" });
  });

  it("returns 400 when altId is non-numeric", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(
      makeRequest("ash", { altId: "not-a-number" }),
      makeParams("ash")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({ error: "Invalid altId parameter" });
  });

  it("returns 400 when altId is a float (e.g. 1.5)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(
      makeRequest("ash", { altId: "1.5" }),
      makeParams("ash")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({ error: "Invalid altId parameter" });
  });

  it("returns 400 when altId is zero", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(
      makeRequest("ash", { altId: "0" }),
      makeParams("ash")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({ error: "Invalid altId parameter" });
  });

  it("returns 400 when altId is negative", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(
      makeRequest("ash", { altId: "-5" }),
      makeParams("ash")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({ error: "Invalid altId parameter" });
  });
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + rating with Cache-Control header", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(
      makeRequest("ash", { altId: "42" }),
      makeParams("ash")
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(RATING);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("passes altId and format to getCachedPlayerRating", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    await GET(
      makeRequest("ash", { altId: "42", format: "VGC" }),
      makeParams("ash")
    );

    expect(mockGetCachedPlayerRating).toHaveBeenCalledWith(42, "VGC");
  });

  it("defaults format to 'overall' when not provided", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    await GET(makeRequest("ash", { altId: "42" }), makeParams("ash"));

    expect(mockGetCachedPlayerRating).toHaveBeenCalledWith(42, "overall");
  });

  it("returns 200 + null when the alt has no rating yet", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
    mockGetCachedPlayerRating.mockResolvedValue(null);

    const response = await GET(
      makeRequest("ash", { altId: "99" }),
      makeParams("ash")
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toBeNull();
  });

  it("accepts a Bearer token (mobile auth mode)", async () => {
    mockResolveApiAuth.mockResolvedValue({
      mode: "bearer" as const,
      userId: "mobile-user",
      supabase: {},
    });

    const response = await GET(
      makeRequest("ash", { altId: "42" }),
      makeParams("ash")
    );

    expect(response.status).toBe(200);
  });
});
