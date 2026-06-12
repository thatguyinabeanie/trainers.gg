/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedFormatUsage = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockEnforceRateLimit = jest.fn();

jest.mock("@/lib/data/usage-cache", () => ({
  getCachedFormatUsage: (...args: unknown[]) =>
    mockGetCachedFormatUsage(...args),
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

const USAGE_ROWS = [
  { species: "Koraidon", usagePct: 42.5, rank: 1, usageChange7d: 1.2 },
  { species: "Miraidon", usagePct: 38.1, rank: 2, usageChange7d: -0.5 },
];

const AUTHED = { mode: "cookie" as const, userId: "user-1", supabase: {} };
const RATE_ALLOWED = {
  allowed: true,
  remaining: 119,
  resetAt: new Date("2026-06-11T12:01:00Z"),
};

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/usage/species");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
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
  mockGetCachedFormatUsage.mockResolvedValue(USAGE_ROWS);
  mockResolveApiAuth.mockResolvedValue(AUTHED);
  mockEnforceRateLimit.mockResolvedValue(RATE_ALLOWED);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for anonymous requests", async () => {
    mockResolveApiAuth.mockResolvedValue(null);

    const response = await GET(
      makeRequest({ format: "gen9vgc2025regg", source: "all", periodType: "week" })
    );

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedFormatUsage).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockEnforceRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date("2026-06-11T12:01:00Z"),
    });

    const response = await GET(
      makeRequest({ format: "gen9vgc2025regg", source: "all", periodType: "week" })
    );

    expect(response.status).toBe(429);
    expect(await getJson(response)).toEqual({ error: "Too many requests" });
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedFormatUsage).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Param validation
// =============================================================================

describe("param validation", () => {
  it("returns 400 when format is missing", async () => {
    const response = await GET(makeRequest({ source: "all", periodType: "week" }));

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({
      error: "Missing required param: format",
    });
    expect(mockGetCachedFormatUsage).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid periodType", async () => {
    const response = await GET(
      makeRequest({ format: "gen9vgc2025regg", source: "all", periodType: "quarter" })
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toMatchObject({
      error: expect.stringContaining("periodType"),
    });
    expect(mockGetCachedFormatUsage).not.toHaveBeenCalled();
  });

  it.each([["day"], ["week"], ["month"]])(
    "accepts periodType=%s",
    async (pt) => {
      const response = await GET(
        makeRequest({ format: "gen9vgc2025regg", source: "all", periodType: pt })
      );
      expect(response.status).toBe(200);
    }
  );

  it("returns 400 for an invalid source", async () => {
    const response = await GET(
      makeRequest({
        format: "gen9vgc2025regg",
        source: "smogon",
        periodType: "week",
      })
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toMatchObject({
      error: expect.stringContaining("source"),
    });
    expect(mockGetCachedFormatUsage).not.toHaveBeenCalled();
  });

  it.each([["all"], ["rk9"], ["limitless"], ["trainers.gg"]])(
    "accepts source=%s",
    async (src) => {
      const response = await GET(
        makeRequest({ format: "gen9vgc2025regg", source: src, periodType: "week" })
      );
      expect(response.status).toBe(200);
    }
  );
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + usage rows JSON", async () => {
    const response = await GET(
      makeRequest({ format: "gen9vgc2025regg", source: "all", periodType: "week" })
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(USAGE_ROWS);
  });

  it("passes format/source/periodType to getCachedFormatUsage", async () => {
    await GET(
      makeRequest({ format: "gen9vgc2025regg", source: "rk9", periodType: "day" })
    );

    expect(mockGetCachedFormatUsage).toHaveBeenCalledWith({
      format: "gen9vgc2025regg",
      source: "rk9",
      periodType: "day",
      minPlayers: 0,
    });
  });

  it("defaults source to 'all' when not provided", async () => {
    await GET(makeRequest({ format: "gen9vgc2025regg", periodType: "week" }));

    expect(mockGetCachedFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({ source: "all" })
    );
  });

  it("defaults periodType to 'week' when not provided", async () => {
    await GET(makeRequest({ format: "gen9vgc2025regg" }));

    expect(mockGetCachedFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({ periodType: "week" })
    );
  });

  it("sets the Cache-Control header on success", async () => {
    const response = await GET(
      makeRequest({ format: "gen9vgc2025regg", source: "all", periodType: "week" })
    );

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
