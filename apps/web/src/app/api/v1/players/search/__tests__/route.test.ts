/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedPlayerSearch = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@/lib/data/players-search-endpoint", () => ({
  getCachedPlayerSearch: (...args: unknown[]) =>
    mockGetCachedPlayerSearch(...args),
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

const SEARCH_RESULT = {
  players: [
    {
      userId: "u1",
      altId: 1,
      username: "ash",
      avatarUrl: null,
      country: "US",
      tournamentCount: 5,
      winRate: 70.0,
      totalWins: 14,
      totalLosses: 6,
    },
    {
      userId: "u2",
      altId: 2,
      username: "gary",
      avatarUrl: null,
      country: "JP",
      tournamentCount: 3,
      winRate: 50.0,
      totalWins: 6,
      totalLosses: 6,
    },
  ],
  totalCount: 2,
  page: 1,
};

const AUTHED_COOKIE = {
  mode: "cookie" as const,
  userId: "user-cookie-1",
  supabase: {},
};
const AUTHED_BEARER = {
  mode: "bearer" as const,
  userId: "user-bearer-1",
  supabase: {},
};
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = {
  allowed: false,
  remaining: 0,
  resetAt: new Date("2030-01-01"),
};

function makeRequest(
  searchParams: Record<string, string> = {},
  options: { token?: string } = {}
): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/players/search");
  for (const [key, val] of Object.entries(searchParams)) {
    url.searchParams.set(key, val);
  }
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest(url.toString(), { headers });
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedPlayerSearch.mockResolvedValue(SEARCH_RESULT);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that expect success must override this.
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for anonymous requests (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedPlayerSearch).not.toHaveBeenCalled();
  });

  it("returns 200 for authenticated cookie sessions", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
  });

  it("returns 200 for authenticated Bearer tokens (mobile auth mode)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(makeRequest({}, { token: "valid-jwt" }));

    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedPlayerSearch).not.toHaveBeenCalled();
  });

  it("sets the Retry-After header to the reset timestamp", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest());

    expect(response.headers.get("retry-after")).toBe(
      new Date("2030-01-01").toUTCString()
    );
  });
});

// =============================================================================
// Query param validation
// =============================================================================

describe("query param validation", () => {
  it("returns 400 for an invalid page param (non-numeric)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ page: "abc" }));

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({ error: "Invalid page parameter" });
    expect(mockGetCachedPlayerSearch).not.toHaveBeenCalled();
  });

  it("returns 400 for page < 1", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ page: "0" }));

    expect(response.status).toBe(400);
  });

  it("ignores unknown sort values (omits sort from filters)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ sort: "unknown-sort-value" }));

    expect(mockGetCachedPlayerSearch).toHaveBeenCalledWith(
      expect.not.objectContaining({ sort: "unknown-sort-value" }),
      1
    );
  });
});

// =============================================================================
// Success — data forwarding and response shape
// =============================================================================

describe("success", () => {
  it("returns 200 + search result JSON for a cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(SEARCH_RESULT);
    expect(mockGetCachedPlayerSearch).toHaveBeenCalledWith({}, 1);
  });

  it("returns 200 + search result JSON for a Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(
      makeRequest({ q: "ash" }, { token: "valid-jwt" })
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(SEARCH_RESULT);
    expect(mockGetCachedPlayerSearch).toHaveBeenCalledWith(
      { query: "ash" },
      1
    );
  });

  it("sets a private, no-store Cache-Control header on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("passes q, country, format, sort, and page to the fetcher", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(
      makeRequest({
        q: "ash",
        country: "US",
        format: "VGC",
        sort: "win_rate",
        page: "2",
      })
    );

    expect(mockGetCachedPlayerSearch).toHaveBeenCalledWith(
      { query: "ash", country: "US", format: "VGC", sort: "win_rate" },
      2
    );
  });

  it("uses page 1 when page param is omitted", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ q: "pikachu" }));

    expect(mockGetCachedPlayerSearch).toHaveBeenCalledWith(
      { query: "pikachu" },
      1
    );
  });

  it("omits empty-string params from the filters object", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    // q="" is treated as an undefined/absent query by the URLSearchParams.get
    // returning null — the filter object should not include it.
    await GET(makeRequest());

    expect(mockGetCachedPlayerSearch).toHaveBeenCalledWith({}, 1);
  });

  it.each([
    ["tournaments"],
    ["win_rate"],
    ["newest"],
    ["alphabetical"],
  ] as const)(
    "accepts valid sort value '%s' and passes it to the fetcher",
    async (sortValue) => {
      mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

      await GET(makeRequest({ sort: sortValue }));

      expect(mockGetCachedPlayerSearch).toHaveBeenCalledWith(
        expect.objectContaining({ sort: sortValue }),
        1
      );
    }
  );
});
