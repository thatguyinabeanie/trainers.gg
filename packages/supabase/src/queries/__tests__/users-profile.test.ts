/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  getFollowerCount,
  getFollowingCount,
  getPlayerTournamentHistoryFull,
  getPlayerPublicTeams,
} from "../users";
import {
  createMockClient,
  type MockSupabaseClient,
} from "@trainers/test-utils/mocks";
import type { TypedClient } from "../../client";

// ============================================================================
// Test helpers
// ============================================================================

/**
 * Create a resolvable chain mock that supports fluent Supabase query chaining.
 * Every chained method returns the proxy; awaiting resolves to `resolveValue`.
 */
function makeResolvableChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  const proxy = new Proxy(chain, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(resolveValue);
      }
      if (typeof prop === "string") {
        return jest.fn().mockReturnValue(proxy);
      }
      return undefined;
    },
  });
  return proxy;
}

/**
 * Build a Supabase mock where `.from()` returns different data on each call,
 * regardless of which table is queried. Useful when a function calls the same
 * table multiple times with different filters.
 */
function mockSupabaseSequential(
  results: Array<{ data: unknown; count?: number | null; error?: unknown }>
) {
  let callIndex = 0;
  const supabase = {
    from: jest.fn(() => {
      const result = results[callIndex] ?? { data: null };
      callIndex++;
      return makeResolvableChain(result);
    }),
  };
  return supabase as unknown as TypedClient;
}

// ============================================================================
// getFollowerCount
// ============================================================================

describe("getFollowerCount", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("returns count when query succeeds", async () => {
    // Terminal select with head: true resolves at the chain end
    const supabase = mockSupabaseSequential([
      { data: null, count: 42, error: null },
    ]);

    const result = await getFollowerCount(supabase, "user-123");

    expect(result).toBe(42);
  });

  it("returns 0 when count is null", async () => {
    const supabase = mockSupabaseSequential([
      { data: null, count: null, error: null },
    ]);

    const result = await getFollowerCount(supabase, "user-123");

    expect(result).toBe(0);
  });

  it("returns 0 when query errors", async () => {
    const supabase = mockSupabaseSequential([
      { data: null, count: null, error: { message: "DB error" } },
    ]);

    const result = await getFollowerCount(supabase, "user-123");

    expect(result).toBe(0);
  });

  it("queries the follows table with following_user_id", async () => {
    mockClient.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 10, error: null }),
      }),
    }));

    await getFollowerCount(mockClient as unknown as TypedClient, "user-abc");

    expect(mockClient.from).toHaveBeenCalledWith("follows");
  });
});

// ============================================================================
// getFollowingCount
// ============================================================================

describe("getFollowingCount", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("returns count when query succeeds", async () => {
    const supabase = mockSupabaseSequential([
      { data: null, count: 15, error: null },
    ]);

    const result = await getFollowingCount(supabase, "user-123");

    expect(result).toBe(15);
  });

  it("returns 0 when count is null", async () => {
    const supabase = mockSupabaseSequential([
      { data: null, count: null, error: null },
    ]);

    const result = await getFollowingCount(supabase, "user-123");

    expect(result).toBe(0);
  });

  it("returns 0 when query errors", async () => {
    const supabase = mockSupabaseSequential([
      { data: null, count: null, error: { message: "connection failed" } },
    ]);

    const result = await getFollowingCount(supabase, "user-123");

    expect(result).toBe(0);
  });

  it("queries the follows table with follower_user_id", async () => {
    mockClient.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
      }),
    }));

    await getFollowingCount(mockClient as unknown as TypedClient, "user-abc");

    expect(mockClient.from).toHaveBeenCalledWith("follows");
  });
});

// ============================================================================
// getPlayerTournamentHistoryFull
// ============================================================================

describe("getPlayerTournamentHistoryFull", () => {
  it("returns empty result when altIds is empty", async () => {
    const supabase = mockSupabaseSequential([]);

    const result = await getPlayerTournamentHistoryFull(supabase, []);

    expect(result).toEqual({ data: [], totalCount: 0, page: 1 });
  });

  it("returns paginated tournament history with stats", async () => {
    const supabase = mockSupabaseSequential([
      // tournament_registrations with tournament join
      {
        data: [
          {
            id: 100,
            alt_id: 1,
            status: "registered",
            registered_at: "2026-03-20T10:00:00Z",
            tournament: {
              id: 10,
              name: "VGC Regional",
              slug: "vgc-regional",
              start_date: "2026-03-15",
              status: "completed",
              format: "VGC",
              organization: {
                id: 1,
                name: "Pokemon League",
                slug: "pokemon-league",
              },
            },
          },
        ],
        count: 1,
        error: null,
      },
      // tournament_player_stats
      {
        data: [
          {
            tournament_id: 10,
            alt_id: 1,
            match_wins: 5,
            match_losses: 2,
            final_ranking: 3,
          },
        ],
        error: null,
      },
    ]);

    const result = await getPlayerTournamentHistoryFull(supabase, [1]);

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.page).toBe(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 100,
        tournamentId: 10,
        tournamentName: "VGC Regional",
        tournamentSlug: "vgc-regional",
        format: "VGC",
        placement: 3,
        wins: 5,
        losses: 2,
        organizationName: "Pokemon League",
        organizationSlug: "pokemon-league",
      })
    );
  });

  it("returns empty data when registrations query returns null", async () => {
    const supabase = mockSupabaseSequential([
      // No registrations found
      { data: null, count: 0, error: null },
    ]);

    const result = await getPlayerTournamentHistoryFull(supabase, [1, 2]);

    expect(result).toEqual({ data: [], totalCount: 0, page: 1 });
  });

  it("handles filters being passed", async () => {
    const supabase = mockSupabaseSequential([
      // Registrations with a filter applied — returns empty
      { data: [], count: 0, error: null },
    ]);

    const result = await getPlayerTournamentHistoryFull(
      supabase,
      [1],
      { format: "VGC", year: 2026, status: "completed" },
      2
    );

    expect(result.data).toEqual([]);
    expect(result.page).toBe(2);
  });

  it("defaults to page 1 when no page is given", async () => {
    const supabase = mockSupabaseSequential([
      { data: [], count: 0, error: null },
    ]);

    const result = await getPlayerTournamentHistoryFull(supabase, [1]);

    expect(result.page).toBe(1);
  });

  it("throws when the query returns an error", async () => {
    const supabase = mockSupabaseSequential([
      { data: null, count: null, error: { message: "DB error" } },
    ]);

    await expect(getPlayerTournamentHistoryFull(supabase, [1])).rejects.toEqual(
      { message: "DB error" }
    );
  });

  it("handles registrations with null tournament gracefully", async () => {
    const supabase = mockSupabaseSequential([
      {
        data: [
          {
            id: 200,
            alt_id: 1,
            status: "registered",
            registered_at: "2026-03-20T10:00:00Z",
            tournament: null,
          },
        ],
        count: 1,
        error: null,
      },
      // Stats query — no tournament IDs to look up
      { data: [], error: null },
    ]);

    const result = await getPlayerTournamentHistoryFull(supabase, [1]);

    // Null tournaments are filtered out
    expect(result.data).toHaveLength(0);
  });

  it("defaults wins/losses to 0 when no stats exist for a tournament", async () => {
    const supabase = mockSupabaseSequential([
      {
        data: [
          {
            id: 300,
            alt_id: 1,
            status: "registered",
            registered_at: "2026-03-20T10:00:00Z",
            tournament: {
              id: 30,
              name: "Locals",
              slug: "locals",
              start_date: "2026-03-01",
              status: "active",
              format: "VGC",
              organization: null,
            },
          },
        ],
        count: 1,
        error: null,
      },
      // Stats — empty
      { data: [], error: null },
    ]);

    const result = await getPlayerTournamentHistoryFull(supabase, [1]);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        placement: null,
        wins: 0,
        losses: 0,
        organizationName: null,
        organizationSlug: null,
      })
    );
  });
});

// ============================================================================
// getPlayerPublicTeams
// ============================================================================

describe("getPlayerPublicTeams", () => {
  it("returns empty array when altIds is empty", async () => {
    const supabase = mockSupabaseSequential([]);

    const result = await getPlayerPublicTeams(supabase, []);

    expect(result).toEqual([]);
  });

  it("returns teams from completed tournaments only", async () => {
    const supabase = mockSupabaseSequential([
      {
        data: [
          {
            id: 100,
            alt_id: 1,
            team_id: 50,
            registered_at: "2026-03-20T10:00:00Z",
            tournament: {
              id: 10,
              name: "VGC Regional",
              slug: "vgc-regional",
              start_date: "2026-03-15",
              status: "completed",
              format: "VGC",
            },
            team: {
              id: 50,
              pokemon_data: [{ species: "Pikachu" }],
              pokepaste_url: "https://pokepast.es/abc123",
            },
          },
          {
            id: 101,
            alt_id: 1,
            team_id: 51,
            registered_at: "2026-03-18T10:00:00Z",
            tournament: {
              id: 11,
              name: "Active Tournament",
              slug: "active-tournament",
              start_date: "2026-03-18",
              status: "active",
              format: "VGC",
            },
            team: {
              id: 51,
              pokemon_data: [{ species: "Charizard" }],
              pokepaste_url: null,
            },
          },
        ],
        error: null,
      },
    ]);

    const result = await getPlayerPublicTeams(supabase, [1]);

    // Only the completed tournament team is returned
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      registrationId: 100,
      tournamentName: "VGC Regional",
      tournamentSlug: "vgc-regional",
      startDate: "2026-03-15",
      format: "VGC",
      teamId: 50,
      pokemonData: [{ species: "Pikachu" }],
      pokepasteUrl: "https://pokepast.es/abc123",
    });
  });

  it("returns empty array when no registrations have teams", async () => {
    const supabase = mockSupabaseSequential([{ data: [], error: null }]);

    const result = await getPlayerPublicTeams(supabase, [1, 2]);

    expect(result).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    const supabase = mockSupabaseSequential([{ data: null, error: null }]);

    const result = await getPlayerPublicTeams(supabase, [1]);

    expect(result).toEqual([]);
  });

  it("throws when the query returns an error", async () => {
    const supabase = mockSupabaseSequential([
      { data: null, error: { message: "DB error" } },
    ]);

    await expect(getPlayerPublicTeams(supabase, [1])).rejects.toEqual({
      message: "DB error",
    });
  });

  it("handles null team data gracefully", async () => {
    const supabase = mockSupabaseSequential([
      {
        data: [
          {
            id: 102,
            alt_id: 1,
            team_id: 60,
            registered_at: "2026-03-20T10:00:00Z",
            tournament: {
              id: 12,
              name: "Completed Event",
              slug: "completed-event",
              start_date: "2026-03-10",
              status: "completed",
              format: "VGC",
            },
            team: null,
          },
        ],
        error: null,
      },
    ]);

    const result = await getPlayerPublicTeams(supabase, [1]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        teamId: null,
        pokemonData: null,
        pokepasteUrl: null,
      })
    );
  });
});
