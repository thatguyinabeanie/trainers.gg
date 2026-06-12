/**
 * @jest-environment node
 *
 * Tests for the cached fetchers in tournaments-endpoints.ts.
 *
 * Each fetcher is a thin `'use cache'` wrapper. We verify:
 *   1. It delegates to the correct underlying query.
 *   2. It passes the service-role client to the query (not an anon client) —
 *      confirming the Phase 2 Task 9 mechanical swap is in effect for every fetcher.
 *   3. It forwards arguments to the query correctly.
 *   4. It returns the query result unchanged.
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetTournamentPhases = jest.fn();
const mockGetPhaseRoundsWithStats = jest.fn();
const mockGetPhaseRoundsWithMatches = jest.fn();
const mockGetRoundMatches = jest.fn();
const mockGetTournamentPlayerStats = jest.fn();
const mockGetTournamentRegistrations = jest.fn();
const mockGetTournamentInvitationsSent = jest.fn();
const mockGetTournamentAuditLog = jest.fn();
const mockGetUnpairedCheckedInPlayers = jest.fn();
const mockListCommunityTournaments = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getTournamentPhases: (...args: unknown[]) =>
    mockGetTournamentPhases(...args),
  getPhaseRoundsWithStats: (...args: unknown[]) =>
    mockGetPhaseRoundsWithStats(...args),
  getPhaseRoundsWithMatches: (...args: unknown[]) =>
    mockGetPhaseRoundsWithMatches(...args),
  getRoundMatches: (...args: unknown[]) => mockGetRoundMatches(...args),
  getTournamentPlayerStats: (...args: unknown[]) =>
    mockGetTournamentPlayerStats(...args),
  getTournamentRegistrations: (...args: unknown[]) =>
    mockGetTournamentRegistrations(...args),
  getTournamentInvitationsSent: (...args: unknown[]) =>
    mockGetTournamentInvitationsSent(...args),
  getTournamentAuditLog: (...args: unknown[]) =>
    mockGetTournamentAuditLog(...args),
  getUnpairedCheckedInPlayers: (...args: unknown[]) =>
    mockGetUnpairedCheckedInPlayers(...args),
  listCommunityTournaments: (...args: unknown[]) =>
    mockListCommunityTournaments(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

// 'use cache', cacheTag, cacheLife are Next.js internals — stub them so the
// module loads in a Node test environment without a Next.js runtime.
jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  CacheTags: {
    tournament: (id: number) => `tournament:${id}`,
    TOURNAMENTS_LIST: "tournaments-list",
  },
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import {
  getCachedTournamentPhases,
  getCachedPhaseRoundsWithStats,
  getCachedPhaseRoundsWithMatches,
  getCachedRoundMatches,
  getCachedTournamentPlayerStats,
  getCachedTournamentRegistrations,
  getCachedTournamentInvitationsSent,
  getCachedTournamentAuditLog,
  getCachedUnpairedCheckedInPlayers,
  getCachedCommunityTournaments,
} from "../tournaments-endpoints";

// =============================================================================
// Fixtures
// =============================================================================

const SERVICE_ROLE_CLIENT = { __serviceRole: true, from: jest.fn() };
const PHASES = [{ id: 1, tournament_id: 42, name: "Swiss" }];
const ROUNDS_WITH_STATS = [{ id: 10, phase_id: 1, round_number: 1 }];
const ROUNDS_WITH_MATCHES = [{ id: 10, matches: [] }];
const ROUND_MATCHES = [{ id: 100, round_id: 10, player1_id: 7 }];
const PLAYER_STATS = [{ alt_id: 7, wins: 3, losses: 1 }];
const REGISTRATIONS = [{ id: 5, alt_id: 7, status: "confirmed" }];
const INVITATIONS = [{ id: 3, invited_alt_id: 9, status: "pending" }];
const AUDIT_LOG = [{ id: 20, action: "round_started", created_at: "2026-01-01" }];
const UNPAIRED_PLAYERS = [{ alt_id: 7, checked_in: true }];
const COMMUNITY_TOURNAMENTS = {
  tournaments: [{ id: 42, name: "Regionals" }],
  total: 1,
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  mockGetTournamentPhases.mockResolvedValue(PHASES);
  mockGetPhaseRoundsWithStats.mockResolvedValue(ROUNDS_WITH_STATS);
  mockGetPhaseRoundsWithMatches.mockResolvedValue(ROUNDS_WITH_MATCHES);
  mockGetRoundMatches.mockResolvedValue(ROUND_MATCHES);
  mockGetTournamentPlayerStats.mockResolvedValue(PLAYER_STATS);
  mockGetTournamentRegistrations.mockResolvedValue(REGISTRATIONS);
  mockGetTournamentInvitationsSent.mockResolvedValue(INVITATIONS);
  mockGetTournamentAuditLog.mockResolvedValue(AUDIT_LOG);
  mockGetUnpairedCheckedInPlayers.mockResolvedValue(UNPAIRED_PLAYERS);
  mockListCommunityTournaments.mockResolvedValue(COMMUNITY_TOURNAMENTS);
});

// =============================================================================
// Shared assertion helper
// =============================================================================

/** Assert the service-role client factory was invoked (not the anon client). */
function expectServiceRoleClientCreated() {
  expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
}

// =============================================================================
// getCachedTournamentPhases
// =============================================================================

describe("getCachedTournamentPhases", () => {
  it("returns phases from the underlying query", async () => {
    const result = await getCachedTournamentPhases(42);
    expect(result).toEqual(PHASES);
  });

  it("passes the service-role client and tournamentId to getTournamentPhases", async () => {
    await getCachedTournamentPhases(42);
    expect(mockGetTournamentPhases).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT, 42);
    expectServiceRoleClientCreated();
  });
});

// =============================================================================
// getCachedPhaseRoundsWithStats
// =============================================================================

describe("getCachedPhaseRoundsWithStats", () => {
  it("returns rounds-with-stats from the underlying query", async () => {
    const result = await getCachedPhaseRoundsWithStats(1, 42);
    expect(result).toEqual(ROUNDS_WITH_STATS);
  });

  it("passes service-role client and phaseId to getPhaseRoundsWithStats", async () => {
    await getCachedPhaseRoundsWithStats(1, 42);
    expect(mockGetPhaseRoundsWithStats).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      1
    );
    expectServiceRoleClientCreated();
  });
});

// =============================================================================
// getCachedPhaseRoundsWithMatches
// =============================================================================

describe("getCachedPhaseRoundsWithMatches", () => {
  it("returns rounds-with-matches from the underlying query", async () => {
    const result = await getCachedPhaseRoundsWithMatches(1, 42);
    expect(result).toEqual(ROUNDS_WITH_MATCHES);
  });

  it("passes service-role client, phaseId, and tournamentId to getPhaseRoundsWithMatches", async () => {
    await getCachedPhaseRoundsWithMatches(1, 42);
    expect(mockGetPhaseRoundsWithMatches).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      1,
      42
    );
    expectServiceRoleClientCreated();
  });
});

// =============================================================================
// getCachedRoundMatches
// =============================================================================

describe("getCachedRoundMatches", () => {
  it("returns matches from the underlying query", async () => {
    const result = await getCachedRoundMatches(10, 42);
    expect(result).toEqual(ROUND_MATCHES);
  });

  it("passes service-role client and roundId to getRoundMatches", async () => {
    await getCachedRoundMatches(10, 42);
    expect(mockGetRoundMatches).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT, 10);
    expectServiceRoleClientCreated();
  });
});

// =============================================================================
// getCachedTournamentPlayerStats
// =============================================================================

describe("getCachedTournamentPlayerStats", () => {
  it("returns player stats from the underlying query", async () => {
    const result = await getCachedTournamentPlayerStats(42);
    expect(result).toEqual(PLAYER_STATS);
  });

  it("passes service-role client, tournamentId, and includeDropped:true to getTournamentPlayerStats", async () => {
    await getCachedTournamentPlayerStats(42);
    expect(mockGetTournamentPlayerStats).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      42,
      { includeDropped: true }
    );
    expectServiceRoleClientCreated();
  });
});

// =============================================================================
// getCachedTournamentRegistrations
// =============================================================================

describe("getCachedTournamentRegistrations", () => {
  it("returns registrations from the underlying query", async () => {
    const result = await getCachedTournamentRegistrations(42);
    expect(result).toEqual(REGISTRATIONS);
  });

  it("passes service-role client and tournamentId to getTournamentRegistrations", async () => {
    await getCachedTournamentRegistrations(42);
    expect(mockGetTournamentRegistrations).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      42
    );
    expectServiceRoleClientCreated();
  });
});

// =============================================================================
// getCachedTournamentInvitationsSent
// =============================================================================

describe("getCachedTournamentInvitationsSent", () => {
  it("returns invitations from the underlying query", async () => {
    const result = await getCachedTournamentInvitationsSent(42);
    expect(result).toEqual(INVITATIONS);
  });

  it("passes service-role client and tournamentId to getTournamentInvitationsSent", async () => {
    await getCachedTournamentInvitationsSent(42);
    expect(mockGetTournamentInvitationsSent).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      42
    );
    expectServiceRoleClientCreated();
  });
});

// =============================================================================
// getCachedTournamentAuditLog
// =============================================================================

describe("getCachedTournamentAuditLog", () => {
  it("returns audit log entries from the underlying query", async () => {
    const result = await getCachedTournamentAuditLog(42, 50, 0, null);
    expect(result).toEqual(AUDIT_LOG);
  });

  it("passes service-role client and tournamentId to getTournamentAuditLog", async () => {
    await getCachedTournamentAuditLog(42, 50, 0, null);
    expect(mockGetTournamentAuditLog).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      42,
      expect.objectContaining({ limit: 50, offset: 0 })
    );
    expectServiceRoleClientCreated();
  });

  it("returns an empty array when the query returns null", async () => {
    mockGetTournamentAuditLog.mockResolvedValue(null);
    const result = await getCachedTournamentAuditLog(42, 50, 0, null);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// getCachedUnpairedCheckedInPlayers
// =============================================================================

describe("getCachedUnpairedCheckedInPlayers", () => {
  it("returns unpaired players from the underlying query", async () => {
    const result = await getCachedUnpairedCheckedInPlayers(42, 10);
    expect(result).toEqual(UNPAIRED_PLAYERS);
  });

  it("passes service-role client, tournamentId, and roundId to getUnpairedCheckedInPlayers", async () => {
    await getCachedUnpairedCheckedInPlayers(42, 10);
    expect(mockGetUnpairedCheckedInPlayers).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      42,
      10
    );
    expectServiceRoleClientCreated();
  });
});

// =============================================================================
// getCachedCommunityTournaments
// =============================================================================

describe("getCachedCommunityTournaments", () => {
  it("returns community tournaments from the underlying query", async () => {
    const result = await getCachedCommunityTournaments(5, null, 50, 0);
    expect(result).toEqual(COMMUNITY_TOURNAMENTS);
  });

  it("passes service-role client and communityId to listCommunityTournaments", async () => {
    await getCachedCommunityTournaments(5, null, 50, 0);
    expect(mockListCommunityTournaments).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      5,
      expect.objectContaining({ limit: 50, offset: 0 })
    );
    expectServiceRoleClientCreated();
  });

  it("passes a status filter when provided", async () => {
    await getCachedCommunityTournaments(5, "active", 20, 10);
    expect(mockListCommunityTournaments).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      5,
      expect.objectContaining({ status: "active", limit: 20, offset: 10 })
    );
  });

  it("passes undefined status when null is provided", async () => {
    await getCachedCommunityTournaments(5, null, 50, 0);
    expect(mockListCommunityTournaments).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      5,
      expect.objectContaining({ status: undefined })
    );
  });
});
