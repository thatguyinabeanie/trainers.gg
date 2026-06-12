/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedSpeciesUsageDetail = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockEnforceRateLimit = jest.fn();

jest.mock("@/lib/data/usage-cache", () => ({
  getCachedSpeciesUsageDetail: (...args: unknown[]) =>
    mockGetCachedSpeciesUsageDetail(...args),
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

const DETAIL_PERIODS = [
  {
    periodStart: "2026-06-01",
    periodEnd: "2026-06-07",
    usagePct: 42.5,
    rank: 1,
    sampleSize: 200,
    usageChange7d: 1.2,
    usageChange30d: 3.4,
    moves: [],
    tera: [],
    items: [],
    abilities: [],
    natures: [],
    abilityItems: [],
  },
];

const AUTHED = { mode: "cookie" as const, userId: "user-1", supabase: {} };
const RATE_ALLOWED = {
  allowed: true,
  remaining: 119,
  resetAt: new Date("2026-06-11T12:01:00Z"),
};

function makeRequest(
  species: string,
  params: Record<string, string> = {}
): NextRequest {
  const encoded = encodeURIComponent(species);
  const url = new URL(
    `http://localhost:3000/api/v1/usage/species/${encoded}/detail`
  );
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

function makeParams(species: string) {
  return { params: Promise.resolve({ species: encodeURIComponent(species) }) };
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedSpeciesUsageDetail.mockResolvedValue(DETAIL_PERIODS);
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
      makeRequest("Koraidon", { format: "gen9vgc2025regg" }),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedSpeciesUsageDetail).not.toHaveBeenCalled();
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
      makeRequest("Koraidon", { format: "gen9vgc2025regg" }),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(429);
    expect(await getJson(response)).toEqual({ error: "Too many requests" });
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedSpeciesUsageDetail).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Param validation
// =============================================================================

describe("param validation", () => {
  it("returns 400 when format is missing", async () => {
    const response = await GET(
      makeRequest("Koraidon"),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({
      error: "Missing required param: format",
    });
    expect(mockGetCachedSpeciesUsageDetail).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid periodType", async () => {
    const response = await GET(
      makeRequest("Koraidon", { format: "gen9vgc2025regg", periodType: "year" }),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toMatchObject({
      error: expect.stringContaining("periodType"),
    });
  });

  it("returns 400 for an invalid limit", async () => {
    const response = await GET(
      makeRequest("Koraidon", { format: "gen9vgc2025regg", limit: "0" }),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toMatchObject({
      error: expect.stringContaining("limit"),
    });
  });

  it("returns 400 for a non-numeric limit", async () => {
    const response = await GET(
      makeRequest("Koraidon", { format: "gen9vgc2025regg", limit: "abc" }),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-integer limit (float)", async () => {
    const response = await GET(
      makeRequest("Koraidon", { format: "gen9vgc2025regg", limit: "1.5" }),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toMatchObject({
      error: expect.stringContaining("limit"),
    });
    expect(mockGetCachedSpeciesUsageDetail).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid source", async () => {
    const response = await GET(
      makeRequest("Koraidon", { format: "gen9vgc2025regg", source: "smogon" }),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(400);
    expect(await getJson(response)).toMatchObject({
      error: expect.stringContaining("source"),
    });
    expect(mockGetCachedSpeciesUsageDetail).not.toHaveBeenCalled();
  });

  it.each([["all"], ["rk9"], ["limitless"], ["trainers.gg"]])(
    "accepts source=%s",
    async (src) => {
      const response = await GET(
        makeRequest("Koraidon", {
          format: "gen9vgc2025regg",
          source: src,
        }),
        makeParams("Koraidon")
      );
      expect(response.status).toBe(200);
    }
  );
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + detail periods JSON", async () => {
    const response = await GET(
      makeRequest("Koraidon", { format: "gen9vgc2025regg" }),
      makeParams("Koraidon")
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(DETAIL_PERIODS);
  });

  it("passes correct params to getCachedSpeciesUsageDetail", async () => {
    await GET(
      makeRequest("Koraidon", {
        format: "gen9vgc2025regg",
        source: "rk9",
        periodType: "day",
        limit: "3",
      }),
      makeParams("Koraidon")
    );

    expect(mockGetCachedSpeciesUsageDetail).toHaveBeenCalledWith({
      format: "gen9vgc2025regg",
      species: "Koraidon",
      source: "rk9",
      periodType: "day",
      limit: 3,
      minPlayers: 0,
    });
  });

  it("URL-decodes species names with special characters", async () => {
    const species = "Ting-Lu";
    await GET(
      makeRequest(species, { format: "gen9vgc2025regg" }),
      makeParams(species)
    );

    expect(mockGetCachedSpeciesUsageDetail).toHaveBeenCalledWith(
      expect.objectContaining({ species: "Ting-Lu" })
    );
  });

  it("defaults source to 'all' and periodType to 'week' and limit to 1", async () => {
    await GET(
      makeRequest("Koraidon", { format: "gen9vgc2025regg" }),
      makeParams("Koraidon")
    );

    expect(mockGetCachedSpeciesUsageDetail).toHaveBeenCalledWith({
      format: "gen9vgc2025regg",
      species: "Koraidon",
      source: "all",
      periodType: "week",
      limit: 1,
      minPlayers: 0,
    });
  });

  it("sets the Cache-Control header on success", async () => {
    const response = await GET(
      makeRequest("Koraidon", { format: "gen9vgc2025regg" }),
      makeParams("Koraidon")
    );

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=3600, stale-while-revalidate=300"
    );
  });
});
