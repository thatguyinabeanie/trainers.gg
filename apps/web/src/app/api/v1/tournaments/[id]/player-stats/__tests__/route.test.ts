/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly.
//
// Note: jest.mock() calls are hoisted by Babel/ts-jest regardless of position
// in the file. All mocks here apply to all imports and require() calls below.
// =============================================================================

const mockGetCachedTournamentPlayerStats = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@/lib/data/tournament-player-stats-endpoint", () => ({
  getCachedTournamentPlayerStats: (...args: unknown[]) =>
    mockGetCachedTournamentPlayerStats(...args),
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

// Deps of the real fetcher — mocked so the fetcher unit tests can call the
// real getCachedTournamentPlayerStats (via jest.requireActual) without hitting
// Supabase or Next.js infrastructure.
const mockGetTournamentPlayerStatsQuery = jest.fn();
const mockFakeServiceRoleClient = { from: jest.fn() };

jest.mock("@trainers/supabase", () => ({
  getTournamentPlayerStats: (...args: unknown[]) =>
    mockGetTournamentPlayerStatsQuery(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockFakeServiceRoleClient,
}));

jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  CacheTags: {
    tournament: (id: number) => `tournament:${id}`,
  },
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NextRequest } from "next/server";

import { GET } from "../route";

// =============================================================================
// Test data
// =============================================================================

const PLAYER_STATS = [
  {
    id: 1,
    tournament_id: 42,
    alt_id: 7,
    current_standing: 1,
    match_wins: 5,
    match_losses: 1,
    match_points: 15,
    matches_played: 6,
    is_dropped: false,
    final_ranking: null,
    alt: { id: 7, username: "ash", avatar_url: null },
  },
  {
    id: 2,
    tournament_id: 42,
    alt_id: 8,
    current_standing: 2,
    match_wins: 4,
    match_losses: 2,
    match_points: 12,
    matches_played: 6,
    is_dropped: false,
    final_ranking: null,
    alt: { id: 8, username: "gary", avatar_url: null },
  },
];

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

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(options: { token?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest(
    "http://localhost:3000/api/v1/tournaments/42/player-stats",
    { headers }
  );
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedTournamentPlayerStats.mockResolvedValue(PLAYER_STATS);
  mockGetTournamentPlayerStatsQuery.mockResolvedValue(PLAYER_STATS);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that need auth must override this.
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Route: param validation
// =============================================================================

describe("param validation", () => {
  it("returns 404 when the id is non-numeric", async () => {
    const response = await GET(
      makeRequest({ token: "valid" }),
      makeParams("abc")
    );

    expect(response.status).toBe(404);
    expect(await getJson(response)).toEqual({ error: "Tournament not found" });
    // Short-circuits before touching auth or the DB.
    expect(mockResolveApiAuth).not.toHaveBeenCalled();
    expect(mockGetCachedTournamentPlayerStats).not.toHaveBeenCalled();
  });

  it("short-circuits on bad id even when anonymous (no token)", async () => {
    const response = await GET(makeRequest(), makeParams("not-a-number"));

    expect(response.status).toBe(404);
    expect(mockResolveApiAuth).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Route: authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedTournamentPlayerStats).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Route: rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedTournamentPlayerStats).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Route: success — both auth modes
// =============================================================================

describe("success", () => {
  it("returns 200 + player-stats JSON for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(PLAYER_STATS);
    expect(mockGetCachedTournamentPlayerStats).toHaveBeenCalledWith(42);
  });

  it("returns 200 + player-stats JSON for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(
      makeRequest({ token: "valid-jwt" }),
      makeParams("42")
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(PLAYER_STATS);
    expect(mockGetCachedTournamentPlayerStats).toHaveBeenCalledWith(42);
  });

  it("sets the tag-invalidated Cache-Control header on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=31536000, stale-while-revalidate=86400"
    );
  });

  it("returns an empty array when no player stats exist for the tournament", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockGetCachedTournamentPlayerStats.mockResolvedValue([]);

    const response = await GET(makeRequest(), makeParams("99"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual([]);
    expect(mockGetCachedTournamentPlayerStats).toHaveBeenCalledWith(99);
  });
});

// =============================================================================
// Fetcher: getCachedTournamentPlayerStats (unit tests)
//
// Uses jest.requireActual to import the real fetcher while its transitive
// dependencies (createServiceRoleClient, getTournamentPlayerStats, next/cache,
// CacheTags) are all mocked by the top-level jest.mock() calls above.
// =============================================================================

describe("getCachedTournamentPlayerStats (fetcher unit)", () => {
  // jest.requireActual bypasses the top-level jest.mock() for the endpoint
  // module so the real cached fetcher runs (while its transitive deps —
  // createServiceRoleClient, getTournamentPlayerStats, next/cache, CacheTags —
  // are still mocked by the top-level jest.mock() calls above).
  //
  // Cast via Record to avoid the `typeof import()` inline type annotation
  // that @typescript-eslint/consistent-type-imports forbids.
  const actual = jest.requireActual(
    "@/lib/data/tournament-player-stats-endpoint"
  ) as Record<string, (...args: unknown[]) => unknown>;
  const realGetCachedTournamentPlayerStats = actual[
    "getCachedTournamentPlayerStats"
  ] as (
    tournamentId: number,
    options?: { includeDropped?: boolean }
  ) => Promise<unknown>;

  it("calls getTournamentPlayerStats with the service-role client and tournamentId", async () => {
    await realGetCachedTournamentPlayerStats(42);

    expect(mockGetTournamentPlayerStatsQuery).toHaveBeenCalledWith(
      mockFakeServiceRoleClient,
      42,
      {}
    );
  });

  it("forwards includeDropped: true to the underlying query", async () => {
    await realGetCachedTournamentPlayerStats(42, { includeDropped: true });

    expect(mockGetTournamentPlayerStatsQuery).toHaveBeenCalledWith(
      mockFakeServiceRoleClient,
      42,
      { includeDropped: true }
    );
  });

  it("returns the rows from getTournamentPlayerStats", async () => {
    const result = await realGetCachedTournamentPlayerStats(42);

    expect(result).toEqual(PLAYER_STATS);
  });
});
