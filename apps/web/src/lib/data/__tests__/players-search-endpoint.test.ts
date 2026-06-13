/**
 * @jest-environment node
 *
 * Tests for getCachedPlayerSearch.
 *
 * The fetcher is a thin `'use cache'` wrapper around searchPlayers.
 * We verify:
 *   1. It calls the underlying query with the service-role client and the
 *      forwarded filters/page params.
 *   2. It returns the query result as-is.
 *   3. The mocked service-role client (not the anon client) is what gets passed
 *      to the query — proving the Phase 2 Task 9 §0.2 rationale is in effect.
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockSearchPlayers = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  searchPlayers: (...args: unknown[]) => mockSearchPlayers(...args),
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
    PLAYERS_DIRECTORY: "players-directory",
  },
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { getCachedPlayerSearch } from "../players-search-endpoint";

// =============================================================================
// Fixtures
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
  ],
  totalCount: 1,
  page: 1,
};

const SERVICE_ROLE_CLIENT = { __serviceRole: true, from: jest.fn() };

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  mockSearchPlayers.mockResolvedValue(SEARCH_RESULT);
});

// =============================================================================
// Tests
// =============================================================================

describe("getCachedPlayerSearch", () => {
  it("returns the result from searchPlayers", async () => {
    const result = await getCachedPlayerSearch({}, 1);

    expect(result).toEqual(SEARCH_RESULT);
  });

  it("calls searchPlayers with the service-role client and correct filters + page", async () => {
    const filters = { query: "ash", country: "US" };
    await getCachedPlayerSearch(filters, 2);

    expect(mockSearchPlayers).toHaveBeenCalledTimes(1);
    expect(mockSearchPlayers).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      filters,
      2
    );
  });

  it("creates a service-role client (not an anon client) — Phase 2 Task 9 §0.2", async () => {
    await getCachedPlayerSearch();

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("defaults to empty filters and page 1 when called with no args", async () => {
    await getCachedPlayerSearch();

    expect(mockSearchPlayers).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT, {}, 1);
  });

  it("forwards all filter fields to searchPlayers", async () => {
    const filters = {
      query: "gary",
      country: "JP",
      format: "VGC",
      sort: "win_rate" as const,
    };
    await getCachedPlayerSearch(filters, 3);

    expect(mockSearchPlayers).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      filters,
      3
    );
  });

  it("propagates an empty result from the query unchanged", async () => {
    const empty = { players: [], totalCount: 0, page: 1 };
    mockSearchPlayers.mockResolvedValue(empty);

    const result = await getCachedPlayerSearch({ query: "no-match" }, 1);

    expect(result).toEqual(empty);
  });
});
