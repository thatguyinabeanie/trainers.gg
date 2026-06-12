/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedPlayerDirectory = jest.fn();
const mockWithCoachBadges = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@/lib/data/players-endpoints", () => ({
  getCachedPlayerDirectory: (...args: unknown[]) =>
    mockGetCachedPlayerDirectory(...args),
  withCoachBadges: (...args: unknown[]) => mockWithCoachBadges(...args),
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

const DIRECTORY_RESULT = {
  players: [
    {
      userId: "u1",
      altId: 1,
      username: "ash",
      avatarUrl: null,
      country: "US",
      tournamentCount: 10,
      winRate: 65.5,
      totalWins: 20,
      totalLosses: 11,
    },
  ],
  totalCount: 1,
  page: 1,
};

const AUTHED_USER = { mode: "cookie" as const, userId: "user-123", supabase: {} };
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = { allowed: false, remaining: 0, resetAt: new Date("2030-01-01") };

function makeRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/players/directory");
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
  mockGetCachedPlayerDirectory.mockResolvedValue(DIRECTORY_RESULT);
  // Pass-through — withCoachBadges runs outside the cache scope; tests assert
  // on the result from getCachedPlayerDirectory, so this should be transparent.
  mockWithCoachBadges.mockImplementation(async (x) => x);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that expect success must override this.
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
    expect(mockGetCachedPlayerDirectory).not.toHaveBeenCalled();
  });

  it("returns 200 for authenticated requests", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
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
    expect(mockGetCachedPlayerDirectory).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Query param validation
// =============================================================================

describe("query param validation", () => {
  it("returns 400 for an invalid page param", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(makeRequest({ page: "abc" }));

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({ error: "Invalid page parameter" });
  });

  it("returns 400 for page < 1", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(makeRequest({ page: "0" }));

    expect(response.status).toBe(400);
  });

  it("ignores unknown sort values (passes undefined for sort)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    await GET(makeRequest({ sort: "invalid-sort" }));

    // Should still call the fetcher, but without a sort key.
    expect(mockGetCachedPlayerDirectory).toHaveBeenCalledWith(
      expect.not.objectContaining({ sort: "invalid-sort" }),
      1
    );
  });
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + directory data with Cache-Control header", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(DIRECTORY_RESULT);
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=31536000, stale-while-revalidate=86400"
    );
  });

  it("passes q, country, format, sort and page to the fetcher", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    await GET(
      makeRequest({ q: "ash", country: "US", format: "VGC", sort: "win_rate", page: "2" })
    );

    expect(mockGetCachedPlayerDirectory).toHaveBeenCalledWith(
      { query: "ash", country: "US", format: "VGC", sort: "win_rate" },
      2
    );
  });

  it("uses default page 1 when page param is omitted", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_USER);

    await GET(makeRequest());

    expect(mockGetCachedPlayerDirectory).toHaveBeenCalledWith({}, 1);
  });

  it("accepts a valid Bearer token (mobile auth mode)", async () => {
    mockResolveApiAuth.mockResolvedValue({
      mode: "bearer" as const,
      userId: "mobile-user",
      supabase: {},
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
  });
});
