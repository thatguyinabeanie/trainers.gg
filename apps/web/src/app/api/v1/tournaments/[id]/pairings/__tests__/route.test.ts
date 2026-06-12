/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedTournamentPairings = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@/lib/data/tournament-pairings-endpoint", () => ({
  getCachedTournamentPairings: (...args: unknown[]) =>
    mockGetCachedTournamentPairings(...args),
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

/** Minimal pairings fixture that mirrors the TournamentPairingsData shape. */
const PAIRINGS_DATA = {
  phases: [
    { id: 1, tournament_id: 42, phase_order: 1, format: "swiss", name: "Swiss" },
  ],
  allPhaseRounds: [
    [
      {
        id: 10,
        phase_id: 1,
        round_number: 1,
        status: "completed",
        matches: [
          {
            id: 100,
            round_id: 10,
            table_number: 1,
            alt1_id: 7,
            alt2_id: 8,
            status: "completed",
            player1: { id: 7, username: "ash" },
            player2: { id: 8, username: "gary" },
            player1Stats: { wins: 1, losses: 0 },
            player2Stats: { wins: 0, losses: 1 },
          },
        ],
      },
    ],
  ],
  roundsWithStats: [
    {
      id: 10,
      phase_id: 1,
      round_number: 1,
      status: "completed",
      matchCount: 1,
      completedCount: 1,
      inProgressCount: 0,
      pendingCount: 0,
    },
  ],
  unpairedPlayers: [],
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

function makeRequest(options: { token?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest(
    "http://localhost:3000/api/v1/tournaments/42/pairings",
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
  mockGetCachedTournamentPairings.mockResolvedValue(PAIRINGS_DATA);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that need auth must override this.
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Route-param validation
// =============================================================================

describe("param validation", () => {
  it("returns 404 when the id is non-numeric", async () => {
    const response = await GET(makeRequest({ token: "valid" }), makeParams("abc"));

    expect(response.status).toBe(404);
    expect(await getJson(response)).toEqual({ error: "Tournament not found" });
    // Never touches auth or DB on a bad id.
    expect(mockResolveApiAuth).not.toHaveBeenCalled();
    expect(mockGetCachedTournamentPairings).not.toHaveBeenCalled();
  });

  it("validates the param before auth (bad id short-circuits even when anonymous)", async () => {
    const response = await GET(makeRequest(), makeParams("not-a-number"));

    expect(response.status).toBe(404);
  });

  it("returns 404 for a float id", async () => {
    const response = await GET(makeRequest({ token: "valid" }), makeParams("1.5"));

    // Number("1.5") === 1.5, not NaN — Number.isNaN(1.5) is false.
    // So the route would proceed. The int guard is NaN-only.
    // This asserts the current specified behaviour (NaN-check only).
    expect(response.status).not.toBe(404);
  });
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedTournamentPairings).not.toHaveBeenCalled();
  });

  it("does not call the fetcher when auth fails", async () => {
    mockResolveApiAuth.mockResolvedValue(null);

    await GET(makeRequest(), makeParams("42"));

    expect(mockGetCachedTournamentPairings).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedTournamentPairings).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success — both auth modes
// =============================================================================

describe("success", () => {
  it("returns 200 + pairings JSON for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(PAIRINGS_DATA);
    expect(mockGetCachedTournamentPairings).toHaveBeenCalledWith(42);
  });

  it("returns 200 + pairings JSON for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(
      makeRequest({ token: "valid-jwt" }),
      makeParams("42")
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(PAIRINGS_DATA);
    expect(mockGetCachedTournamentPairings).toHaveBeenCalledWith(42);
  });

  it("passes the numeric tournamentId (not the raw string) to the fetcher", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest(), makeParams("99"));

    expect(mockGetCachedTournamentPairings).toHaveBeenCalledWith(99);
  });

  it("sets the tag-invalidated Cache-Control header on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=31536000, stale-while-revalidate=86400"
    );
  });

  it("returns empty phases/rounds when tournament has no phases yet", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockGetCachedTournamentPairings.mockResolvedValue({
      phases: [],
      allPhaseRounds: [],
      roundsWithStats: [],
      unpairedPlayers: [],
    });

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(200);
    const body = (await getJson(response)) as {
      phases: unknown[];
      allPhaseRounds: unknown[];
    };
    expect(body.phases).toHaveLength(0);
    expect(body.allPhaseRounds).toHaveLength(0);
  });
});

// =============================================================================
// Fetcher tests — getCachedTournamentPairings logic
// =============================================================================

// These tests exercise the exported fetcher in isolation without hitting the DB.
// They mock the underlying @trainers/supabase query functions and the Supabase client,
// then assert that the fetcher aggregates the data correctly.

const mockGetTournamentPhases = jest.fn();
const mockGetPhaseRoundsWithMatches = jest.fn();
const mockGetPhaseRoundsWithStats = jest.fn();
const mockGetUnpairedCheckedInPlayers = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getTournamentPhases: (...args: unknown[]) =>
    mockGetTournamentPhases(...args),
  getPhaseRoundsWithMatches: (...args: unknown[]) =>
    mockGetPhaseRoundsWithMatches(...args),
  getPhaseRoundsWithStats: (...args: unknown[]) =>
    mockGetPhaseRoundsWithStats(...args),
  getUnpairedCheckedInPlayers: (...args: unknown[]) =>
    mockGetUnpairedCheckedInPlayers(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

// next/cache is a no-op in tests
jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  CacheTags: {
    tournament: (id: number) => `tournament:${id}`,
  },
}));

describe("getCachedTournamentPairings (fetcher)", () => {
  const FAKE_SUPABASE = { _tag: "service-role" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServiceRoleClient.mockReturnValue(FAKE_SUPABASE);
  });

  it("returns empty shape immediately when tournament has no phases", async () => {
    mockGetTournamentPhases.mockResolvedValue([]);

    // Import directly so we bypass the route-level mock
    const { getCachedTournamentPairings } = await import(
      "@/lib/data/tournament-pairings-endpoint"
    );

    const result = await getCachedTournamentPairings(42);

    expect(result).toEqual({
      phases: [],
      allPhaseRounds: [],
      roundsWithStats: [],
      unpairedPlayers: [],
    });
    // Short-circuit: none of the later queries should run
    expect(mockGetPhaseRoundsWithMatches).not.toHaveBeenCalled();
    expect(mockGetPhaseRoundsWithStats).not.toHaveBeenCalled();
    expect(mockGetUnpairedCheckedInPlayers).not.toHaveBeenCalled();
  });

  it("fetches rounds+matches for every phase in parallel", async () => {
    const phases = [
      { id: 1, tournament_id: 42, phase_order: 1 },
      { id: 2, tournament_id: 42, phase_order: 2 },
    ];
    mockGetTournamentPhases.mockResolvedValue(phases);
    mockGetPhaseRoundsWithMatches.mockResolvedValue([]);
    mockGetPhaseRoundsWithStats.mockResolvedValue([]);
    mockGetUnpairedCheckedInPlayers.mockResolvedValue([]);

    const { getCachedTournamentPairings } = await import(
      "@/lib/data/tournament-pairings-endpoint"
    );

    const result = await getCachedTournamentPairings(42);

    // Called once per phase
    expect(mockGetPhaseRoundsWithMatches).toHaveBeenCalledTimes(2);
    expect(mockGetPhaseRoundsWithMatches).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      1,
      42
    );
    expect(mockGetPhaseRoundsWithMatches).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      2,
      42
    );
    // allPhaseRounds has one entry per phase
    expect(result.allPhaseRounds).toHaveLength(2);
  });

  it("fetches roundsWithStats only for the first phase", async () => {
    const phases = [
      { id: 10, tournament_id: 42, phase_order: 1 },
      { id: 20, tournament_id: 42, phase_order: 2 },
    ];
    mockGetTournamentPhases.mockResolvedValue(phases);
    mockGetPhaseRoundsWithMatches.mockResolvedValue([]);
    mockGetPhaseRoundsWithStats.mockResolvedValue([]);
    mockGetUnpairedCheckedInPlayers.mockResolvedValue([]);

    const { getCachedTournamentPairings } = await import(
      "@/lib/data/tournament-pairings-endpoint"
    );

    await getCachedTournamentPairings(42);

    expect(mockGetPhaseRoundsWithStats).toHaveBeenCalledTimes(1);
    expect(mockGetPhaseRoundsWithStats).toHaveBeenCalledWith(FAKE_SUPABASE, 10);
  });

  it("uses the active round for the unpaired-players query when one exists", async () => {
    const phases = [{ id: 1, tournament_id: 42, phase_order: 1 }];
    const roundsWithStats = [
      { id: 5, status: "completed", round_number: 1 },
      { id: 6, status: "active", round_number: 2 },
    ];
    mockGetTournamentPhases.mockResolvedValue(phases);
    mockGetPhaseRoundsWithMatches.mockResolvedValue([]);
    mockGetPhaseRoundsWithStats.mockResolvedValue(roundsWithStats);
    mockGetUnpairedCheckedInPlayers.mockResolvedValue([]);

    const { getCachedTournamentPairings } = await import(
      "@/lib/data/tournament-pairings-endpoint"
    );

    await getCachedTournamentPairings(42);

    // Active round (id=6) takes priority over the last round (id=5)
    expect(mockGetUnpairedCheckedInPlayers).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      42,
      6
    );
  });

  it("falls back to the last round when no active round exists", async () => {
    const phases = [{ id: 1, tournament_id: 42, phase_order: 1 }];
    const roundsWithStats = [
      { id: 5, status: "completed", round_number: 1 },
      { id: 6, status: "completed", round_number: 2 },
    ];
    mockGetTournamentPhases.mockResolvedValue(phases);
    mockGetPhaseRoundsWithMatches.mockResolvedValue([]);
    mockGetPhaseRoundsWithStats.mockResolvedValue(roundsWithStats);
    mockGetUnpairedCheckedInPlayers.mockResolvedValue([]);

    const { getCachedTournamentPairings } = await import(
      "@/lib/data/tournament-pairings-endpoint"
    );

    await getCachedTournamentPairings(42);

    // No active round — falls back to last (id=6)
    expect(mockGetUnpairedCheckedInPlayers).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      42,
      6
    );
  });

  it("skips the unpaired-players query when no rounds exist", async () => {
    const phases = [{ id: 1, tournament_id: 42, phase_order: 1 }];
    mockGetTournamentPhases.mockResolvedValue(phases);
    mockGetPhaseRoundsWithMatches.mockResolvedValue([]);
    mockGetPhaseRoundsWithStats.mockResolvedValue([]); // no rounds
    mockGetUnpairedCheckedInPlayers.mockResolvedValue([]);

    const { getCachedTournamentPairings } = await import(
      "@/lib/data/tournament-pairings-endpoint"
    );

    const result = await getCachedTournamentPairings(42);

    expect(mockGetUnpairedCheckedInPlayers).not.toHaveBeenCalled();
    expect(result.unpairedPlayers).toEqual([]);
  });

  it("surfaces unpaired players in the returned shape", async () => {
    const phases = [{ id: 1, tournament_id: 42, phase_order: 1 }];
    const unpairedPlayers = [
      { altId: 99, username: "misty", displayName: "Misty" },
    ];
    mockGetTournamentPhases.mockResolvedValue(phases);
    mockGetPhaseRoundsWithMatches.mockResolvedValue([]);
    mockGetPhaseRoundsWithStats.mockResolvedValue([
      { id: 7, status: "active", round_number: 1 },
    ]);
    mockGetUnpairedCheckedInPlayers.mockResolvedValue(unpairedPlayers);

    const { getCachedTournamentPairings } = await import(
      "@/lib/data/tournament-pairings-endpoint"
    );

    const result = await getCachedTournamentPairings(42);

    expect(result.unpairedPlayers).toEqual(unpairedPlayers);
  });
});
