/**
 * @jest-environment node
 *
 * Tests for getCachedTournamentStandings.
 *
 * The fetcher is a thin `'use cache'` wrapper around getPublicTournamentStandings
 * (explicit column allowlist). We verify:
 *   1. It calls the underlying query with the correct client and tournamentId.
 *   2. It returns the query result as-is.
 *   3. The mocked service-role client (not the anon client) is what gets passed
 *      to the query — proving the Phase 2 Task 9 mechanical swap is in effect.
 *   4. The explicit-column variant (not select-*) is used, so new schema columns
 *      cannot silently leak through this versioned public endpoint.
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetPublicTournamentStandings = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getPublicTournamentStandings: (...args: unknown[]) =>
    mockGetPublicTournamentStandings(...args),
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
  },
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { getCachedTournamentStandings } from "../standings-endpoint";

// =============================================================================
// Fixtures
// =============================================================================

const STANDINGS = [
  { id: 1, tournament_id: 42, rank: 1, alt: { id: 7, username: "ash" } },
  { id: 2, tournament_id: 42, rank: 2, alt: { id: 8, username: "gary" } },
];

const SERVICE_ROLE_CLIENT = { __serviceRole: true, from: jest.fn() };

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  mockGetPublicTournamentStandings.mockResolvedValue(STANDINGS);
});

// =============================================================================
// Tests
// =============================================================================

describe("getCachedTournamentStandings", () => {
  it("returns the standings returned by getPublicTournamentStandings", async () => {
    const result = await getCachedTournamentStandings(42);

    expect(result).toEqual(STANDINGS);
  });

  it("calls getPublicTournamentStandings (explicit-column variant) — not getTournamentStandings (select-*)", async () => {
    await getCachedTournamentStandings(42);

    // Must use the explicit-column variant so future schema additions don't
    // silently leak through this versioned public endpoint.
    expect(mockGetPublicTournamentStandings).toHaveBeenCalledTimes(1);
    expect(mockGetPublicTournamentStandings).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      42
    );
  });

  it("creates a service-role client (not an anon client) — Phase 2 Task 9 swap", async () => {
    await getCachedTournamentStandings(99);

    // The service-role factory must have been called to obtain the client.
    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("passes the correct tournamentId to the query for different ids", async () => {
    await getCachedTournamentStandings(7);

    expect(mockGetPublicTournamentStandings).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      7
    );
  });

  it("propagates an empty array from the query unchanged", async () => {
    mockGetPublicTournamentStandings.mockResolvedValue([]);

    const result = await getCachedTournamentStandings(42);

    expect(result).toEqual([]);
  });
});
