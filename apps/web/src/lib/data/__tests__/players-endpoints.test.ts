/**
 * @jest-environment node
 *
 * Tests for the players-endpoints cached fetchers and withCoachBadges.
 *
 * Each fetcher is a thin `'use cache'` wrapper around a query from
 * `@trainers/supabase`. We verify:
 *   1. Each fetcher calls the underlying query with the service-role client.
 *   2. Each fetcher returns the query result as-is.
 *   3. The mocked service-role client (not the anon client) is passed to the
 *      query — proving the Phase 2 Task 9 mechanical swap is in effect.
 *   4. `withCoachBadges` (outside any `'use cache'` scope) also uses the
 *      service-role client and preserves the rest of the result shape.
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockSearchPlayers = jest.fn();
const mockAttachCoachBadges = jest.fn();
const mockGetLeaderboard = jest.fn();
const mockGetRecentlyActivePlayers = jest.fn();
const mockGetNewMembers = jest.fn();
const mockGetPlayerProfileByHandle = jest.fn();
const mockGetPlayerRating = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  searchPlayers: (...args: unknown[]) => mockSearchPlayers(...args),
  attachCoachBadges: (...args: unknown[]) => mockAttachCoachBadges(...args),
  getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
  getRecentlyActivePlayers: (...args: unknown[]) =>
    mockGetRecentlyActivePlayers(...args),
  getNewMembers: (...args: unknown[]) => mockGetNewMembers(...args),
  getPlayerProfileByHandle: (...args: unknown[]) =>
    mockGetPlayerProfileByHandle(...args),
  getPlayerRating: (...args: unknown[]) => mockGetPlayerRating(...args),
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
    PLAYERS_LEADERBOARD: "players-leaderboard",
    PLAYERS_RECENT: "players-recent",
    PLAYERS_NEW: "players-new",
    player: (handle: string) => `player:${handle}`,
  },
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import {
  getCachedPlayerDirectory,
  withCoachBadges,
  getCachedLeaderboard,
  getCachedRecentlyActivePlayers,
  getCachedNewMembers,
  getCachedPlayerProfile,
  getCachedPlayerRating,
} from "../players-endpoints";

// =============================================================================
// Fixtures
// =============================================================================

const SERVICE_ROLE_CLIENT = { __serviceRole: true, from: jest.fn() };

const PLAYERS = [
  { id: 1, username: "ash", displayName: "Ash" },
  { id: 2, username: "gary", displayName: "Gary" },
];

// Cast the minimal fixture to the real param type — withCoachBadges only reads
// players/totalCount/page, so a full PlayerDirectoryEntry shape isn't needed.
const SEARCH_RESULT = {
  players: PLAYERS,
  totalCount: 2,
  page: 1,
} as unknown as Parameters<typeof withCoachBadges>[0];

const LEADERBOARD = [
  { rank: 1, altId: 1, username: "ash", rating: 1800 },
  { rank: 2, altId: 2, username: "gary", rating: 1750 },
];

const RECENTLY_ACTIVE = [{ altId: 1, username: "ash", lastActive: "2026-06-01" }];

const NEW_MEMBERS = [{ altId: 3, username: "misty", joinedAt: "2026-06-10" }];

const PLAYER_PROFILE = {
  id: 7,
  username: "ash",
  displayName: "Ash Ketchum",
  alt: { id: 7, username: "ash" },
};

const PLAYER_RATING = {
  altId: 7,
  format: "overall",
  rating: 1800,
  skillBracket: "diamond" as const,
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  mockSearchPlayers.mockResolvedValue(SEARCH_RESULT);
  mockAttachCoachBadges.mockImplementation(
    (_supabase: unknown, players: unknown) => Promise.resolve(players)
  );
  mockGetLeaderboard.mockResolvedValue(LEADERBOARD);
  mockGetRecentlyActivePlayers.mockResolvedValue(RECENTLY_ACTIVE);
  mockGetNewMembers.mockResolvedValue(NEW_MEMBERS);
  mockGetPlayerProfileByHandle.mockResolvedValue(PLAYER_PROFILE);
  mockGetPlayerRating.mockResolvedValue(PLAYER_RATING);
});

// =============================================================================
// getCachedPlayerDirectory
// =============================================================================

describe("getCachedPlayerDirectory", () => {
  it("returns the search result from searchPlayers", async () => {
    const result = await getCachedPlayerDirectory();

    expect(result).toEqual(SEARCH_RESULT);
  });

  it("calls searchPlayers with the service-role client and default args", async () => {
    await getCachedPlayerDirectory();

    expect(mockSearchPlayers).toHaveBeenCalledTimes(1);
    expect(mockSearchPlayers).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT, {}, 1);
  });

  it("forwards filters and page to searchPlayers", async () => {
    const filters = { query: "ash", sort: "tournaments" as const };
    await getCachedPlayerDirectory(filters, 3);

    expect(mockSearchPlayers).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      filters,
      3
    );
  });

  it("creates a service-role client (not an anon client) — Phase 2 Task 9 swap", async () => {
    await getCachedPlayerDirectory();

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("propagates an empty result from the query unchanged", async () => {
    const emptyResult = { players: [], totalCount: 0, page: 1 };
    mockSearchPlayers.mockResolvedValue(emptyResult);

    const result = await getCachedPlayerDirectory();

    expect(result).toEqual(emptyResult);
  });
});

// =============================================================================
// withCoachBadges
// =============================================================================

describe("withCoachBadges", () => {
  it("returns a result with the coach-badge-enriched players list", async () => {
    const enriched = [{ ...PLAYERS[0], isCoach: true }, PLAYERS[1]];
    mockAttachCoachBadges.mockResolvedValue(enriched);

    const result = await withCoachBadges(SEARCH_RESULT);

    expect(result.players).toEqual(enriched);
  });

  it("preserves non-player fields from the original result", async () => {
    const result = await withCoachBadges(SEARCH_RESULT);

    expect(result.totalCount).toBe(SEARCH_RESULT.totalCount);
    expect(result.page).toBe(SEARCH_RESULT.page);
  });

  it("calls attachCoachBadges with the service-role client — Phase 2 Task 9 swap", async () => {
    await withCoachBadges(SEARCH_RESULT);

    expect(mockAttachCoachBadges).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      SEARCH_RESULT.players
    );
  });
});

// =============================================================================
// getCachedLeaderboard
// =============================================================================

describe("getCachedLeaderboard", () => {
  it("returns the leaderboard from getLeaderboard", async () => {
    const result = await getCachedLeaderboard();

    expect(result).toEqual(LEADERBOARD);
  });

  it("calls getLeaderboard with the service-role client and default limit", async () => {
    await getCachedLeaderboard();

    expect(mockGetLeaderboard).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT, 5);
  });

  it("forwards a custom limit to getLeaderboard", async () => {
    await getCachedLeaderboard(10);

    expect(mockGetLeaderboard).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT, 10);
  });

  it("creates a service-role client — Phase 2 Task 9 swap", async () => {
    await getCachedLeaderboard();

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// getCachedRecentlyActivePlayers
// =============================================================================

describe("getCachedRecentlyActivePlayers", () => {
  it("returns recently active players from getRecentlyActivePlayers", async () => {
    const result = await getCachedRecentlyActivePlayers();

    expect(result).toEqual(RECENTLY_ACTIVE);
  });

  it("calls getRecentlyActivePlayers with the service-role client and default limit", async () => {
    await getCachedRecentlyActivePlayers();

    expect(mockGetRecentlyActivePlayers).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      5
    );
  });

  it("forwards a custom limit to getRecentlyActivePlayers", async () => {
    await getCachedRecentlyActivePlayers(3);

    expect(mockGetRecentlyActivePlayers).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      3
    );
  });

  it("creates a service-role client — Phase 2 Task 9 swap", async () => {
    await getCachedRecentlyActivePlayers();

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// getCachedNewMembers
// =============================================================================

describe("getCachedNewMembers", () => {
  it("returns new members from getNewMembers", async () => {
    const result = await getCachedNewMembers();

    expect(result).toEqual(NEW_MEMBERS);
  });

  it("calls getNewMembers with the service-role client and default limit", async () => {
    await getCachedNewMembers();

    expect(mockGetNewMembers).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT, 5);
  });

  it("forwards a custom limit to getNewMembers", async () => {
    await getCachedNewMembers(8);

    expect(mockGetNewMembers).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT, 8);
  });

  it("creates a service-role client — Phase 2 Task 9 swap", async () => {
    await getCachedNewMembers();

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("propagates an empty array from the query unchanged", async () => {
    mockGetNewMembers.mockResolvedValue([]);

    const result = await getCachedNewMembers();

    expect(result).toEqual([]);
  });
});

// =============================================================================
// getCachedPlayerProfile
// =============================================================================

describe("getCachedPlayerProfile", () => {
  it("returns the player profile from getPlayerProfileByHandle", async () => {
    const result = await getCachedPlayerProfile("ash");

    expect(result).toEqual(PLAYER_PROFILE);
  });

  it("calls getPlayerProfileByHandle with the service-role client and username", async () => {
    await getCachedPlayerProfile("ash");

    expect(mockGetPlayerProfileByHandle).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      "ash"
    );
  });

  it("returns null when the player does not exist", async () => {
    mockGetPlayerProfileByHandle.mockResolvedValue(null);

    const result = await getCachedPlayerProfile("unknown");

    expect(result).toBeNull();
  });

  it("creates a service-role client — Phase 2 Task 9 swap", async () => {
    await getCachedPlayerProfile("ash");

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("passes the correct username for different handles", async () => {
    await getCachedPlayerProfile("gary");

    expect(mockGetPlayerProfileByHandle).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      "gary"
    );
  });
});

// =============================================================================
// getCachedPlayerRating
// =============================================================================

describe("getCachedPlayerRating", () => {
  it("returns the player rating from getPlayerRating", async () => {
    const result = await getCachedPlayerRating(7);

    expect(result).toEqual(PLAYER_RATING);
  });

  it("calls getPlayerRating with the service-role client, altId, and default format", async () => {
    await getCachedPlayerRating(7);

    expect(mockGetPlayerRating).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      7,
      "overall"
    );
  });

  it("forwards a custom format to getPlayerRating", async () => {
    await getCachedPlayerRating(7, "vgc");

    expect(mockGetPlayerRating).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      7,
      "vgc"
    );
  });

  it("returns null when the rating does not exist", async () => {
    mockGetPlayerRating.mockResolvedValue(null);

    const result = await getCachedPlayerRating(999);

    expect(result).toBeNull();
  });

  it("creates a service-role client — Phase 2 Task 9 swap", async () => {
    await getCachedPlayerRating(7);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });
});
