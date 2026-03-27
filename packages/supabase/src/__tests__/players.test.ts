import {
  searchPlayers,
  getLeaderboard,
  getRecentlyActivePlayers,
  getNewMembers,
} from "../queries/players";
import type { TypedClient } from "../client";

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
 * Build a Supabase mock where `.from(table)` returns a chain that resolves
 * to the preconfigured data for that table. Each table can be called multiple
 * times, always returning the same data.
 */
function mockSupabase(
  tableResults: Record<
    string,
    { data: unknown; count?: number; error?: unknown }
  >
) {
  const supabase = {
    from: jest.fn((table: string) => {
      const result = tableResults[table] ?? { data: null };
      return makeResolvableChain(result);
    }),
  };
  return supabase as unknown as TypedClient;
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
// searchPlayers
// ============================================================================

describe("searchPlayers", () => {
  it("returns empty result when no users match", async () => {
    const supabase = mockSupabaseSequential([
      // users query — no results
      { data: [], count: 0 },
    ]);

    const result = await searchPlayers(supabase, {}, 1);

    expect(result.players).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.page).toBe(1);
  });

  it("returns empty result when search query matches no usernames", async () => {
    const supabase = mockSupabaseSequential([
      // users.username search
      { data: [] },
      // alts.username search
      { data: [] },
    ]);

    const result = await searchPlayers(
      supabase,
      { query: "nonexistent_user_xyz" },
      1
    );

    expect(result.players).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("returns players with stats when users are found", async () => {
    const supabase = mockSupabaseSequential([
      // users query (no search filter active, goes straight to main query)
      {
        data: [
          {
            id: "user-1",
            username: "ash_ketchum",
            country: "US",
            created_at: "2025-01-01T00:00:00Z",
          },
        ],
        count: 1,
      },
      // alts query for avatars
      {
        data: [
          {
            id: 10,
            user_id: "user-1",
            username: "ash_ketchum",
            avatar_url: "https://example.com/ash.png",
          },
        ],
      },
      // tournament_player_stats
      {
        data: [
          {
            alt_id: 10,
            match_wins: 8,
            match_losses: 2,
            tournament_id: 1,
          },
          {
            alt_id: 10,
            match_wins: 5,
            match_losses: 3,
            tournament_id: 2,
          },
        ],
      },
    ]);

    const result = await searchPlayers(supabase, {}, 1);

    expect(result.players).toHaveLength(1);
    expect(result.players[0]).toEqual(
      expect.objectContaining({
        userId: "user-1",
        username: "ash_ketchum",
        avatarUrl: "https://example.com/ash.png",
        country: "US",
        tournamentCount: 2,
        totalWins: 13,
        totalLosses: 5,
      })
    );
    // Win rate: 13/(13+5) * 100 = 72.2%
    expect(result.players[0]!.winRate).toBeCloseTo(72.2, 0);
  });

  it("applies country filter", async () => {
    const supabase = mockSupabaseSequential([
      // users query — filtered by country
      {
        data: [
          {
            id: "user-jp",
            username: "satoshi",
            country: "JP",
            created_at: "2025-01-01T00:00:00Z",
          },
        ],
        count: 1,
      },
      // alts
      {
        data: [
          {
            id: 20,
            user_id: "user-jp",
            username: "satoshi",
            avatar_url: null,
          },
        ],
      },
      // stats
      { data: [] },
    ]);

    const result = await searchPlayers(supabase, { country: "JP" }, 1);

    expect(result.players).toHaveLength(1);
    expect(result.players[0]!.country).toBe("JP");
  });

  it("handles format filter returning no matching alts", async () => {
    const supabase = mockSupabaseSequential([
      // tournament_player_stats for format filtering — no matches
      { data: [] },
    ]);

    const result = await searchPlayers(supabase, { format: "VGC" }, 1);

    expect(result.players).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});

// ============================================================================
// getLeaderboard
// ============================================================================

describe("getLeaderboard", () => {
  it("returns empty array when no rated players exist", async () => {
    const supabase = mockSupabaseSequential([
      // player_ratings — no rows
      { data: [] },
    ]);

    const result = await getLeaderboard(supabase, 5);

    expect(result).toEqual([]);
  });

  it("returns players ordered by rating descending", async () => {
    const supabase = mockSupabaseSequential([
      // player_ratings — DB returns pre-sorted rows
      {
        data: [
          {
            alt_id: 1,
            rating: "1600.00",
            skill_bracket: "advanced",
            games_played: 10,
          },
          {
            alt_id: 2,
            rating: "1350.00",
            skill_bracket: "intermediate",
            games_played: 8,
          },
        ],
      },
      // alts resolution
      {
        data: [
          { id: 1, user_id: "user-a", username: "player_a", avatar_url: null },
          { id: 2, user_id: "user-b", username: "player_b", avatar_url: null },
        ],
      },
    ]);

    const result = await getLeaderboard(supabase, 5);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      userId: "user-a",
      username: "player_a",
      avatarUrl: null,
      rating: 1600,
      skillBracket: "advanced",
      gamesPlayed: 10,
    });
    expect(result[1]).toEqual({
      userId: "user-b",
      username: "player_b",
      avatarUrl: null,
      rating: 1350,
      skillBracket: "intermediate",
      gamesPlayed: 8,
    });
  });

  it("skips entries whose alt cannot be resolved", async () => {
    const supabase = mockSupabaseSequential([
      {
        data: [
          {
            alt_id: 1,
            rating: "1600.00",
            skill_bracket: "advanced",
            games_played: 5,
          },
          {
            alt_id: 999,
            rating: "1500.00",
            skill_bracket: "intermediate",
            games_played: 3,
          },
        ],
      },
      // Only alt 1 resolves
      {
        data: [
          { id: 1, user_id: "user-a", username: "player_a", avatar_url: null },
        ],
      },
    ]);

    const result = await getLeaderboard(supabase, 5);

    expect(result).toHaveLength(1);
    expect(result[0]!.username).toBe("player_a");
  });

  it("respects limit parameter", async () => {
    const supabase = mockSupabaseSequential([
      // DB enforces the limit, so only 1 row comes back
      {
        data: [
          {
            alt_id: 1,
            rating: "1700.00",
            skill_bracket: "advanced",
            games_played: 12,
          },
        ],
      },
      {
        data: [{ id: 1, user_id: "u1", username: "first", avatar_url: null }],
      },
    ]);

    const result = await getLeaderboard(supabase, 1);

    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// getRecentlyActivePlayers
// ============================================================================

describe("getRecentlyActivePlayers", () => {
  it("returns empty array when no registrations exist", async () => {
    const supabase = mockSupabase({
      tournament_registrations: { data: [] },
    });

    const result = await getRecentlyActivePlayers(supabase, 5);

    expect(result).toEqual([]);
  });

  it("returns recently active players deduplicated by user", async () => {
    const supabase = mockSupabaseSequential([
      // tournament_registrations — ordered by most recent first
      {
        data: [
          {
            alt_id: 10,
            created_at: "2026-03-24T10:00:00Z",
          },
          {
            alt_id: 20,
            created_at: "2026-03-23T10:00:00Z",
          },
        ],
      },
      // alts resolution
      {
        data: [
          {
            id: 10,
            user_id: "user-1",
            username: "ash",
            avatar_url: "https://example.com/ash.png",
          },
          {
            id: 20,
            user_id: "user-2",
            username: "cynthia",
            avatar_url: null,
          },
        ],
      },
    ]);

    const result = await getRecentlyActivePlayers(supabase, 5);

    expect(result).toHaveLength(2);
    expect(result[0]!.username).toBe("ash");
    expect(result[0]!.lastActiveAt).toBe("2026-03-24T10:00:00Z");
    expect(result[1]!.username).toBe("cynthia");
  });

  it("respects limit parameter", async () => {
    const supabase = mockSupabaseSequential([
      {
        data: [
          { alt_id: 1, created_at: "2026-03-24T10:00:00Z" },
          { alt_id: 2, created_at: "2026-03-23T10:00:00Z" },
          { alt_id: 3, created_at: "2026-03-22T10:00:00Z" },
        ],
      },
      {
        data: [
          { id: 1, user_id: "u1", username: "p1", avatar_url: null },
          { id: 2, user_id: "u2", username: "p2", avatar_url: null },
          { id: 3, user_id: "u3", username: "p3", avatar_url: null },
        ],
      },
    ]);

    const result = await getRecentlyActivePlayers(supabase, 2);

    expect(result).toHaveLength(2);
  });
});

// ============================================================================
// getNewMembers
// ============================================================================

describe("getNewMembers", () => {
  it("returns empty array when no users exist", async () => {
    const supabase = mockSupabaseSequential([
      // users query
      { data: [] },
    ]);

    const result = await getNewMembers(supabase, 5);

    expect(result).toEqual([]);
  });

  it("returns newest users with avatar info from alts", async () => {
    const supabase = mockSupabaseSequential([
      // users — newest first
      {
        data: [
          {
            id: "user-new",
            username: "new_trainer",
            created_at: "2026-03-24T08:00:00Z",
          },
          {
            id: "user-old",
            username: "old_trainer",
            created_at: "2026-03-20T08:00:00Z",
          },
        ],
      },
      // alts for avatars
      {
        data: [
          {
            user_id: "user-new",
            username: "new_trainer",
            avatar_url: "https://example.com/new.png",
          },
          {
            user_id: "user-old",
            username: "old_trainer",
            avatar_url: null,
          },
        ],
      },
    ]);

    const result = await getNewMembers(supabase, 5);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      userId: "user-new",
      username: "new_trainer",
      avatarUrl: "https://example.com/new.png",
      joinedAt: "2026-03-24T08:00:00Z",
    });
    expect(result[1]).toEqual({
      userId: "user-old",
      username: "old_trainer",
      avatarUrl: null,
      joinedAt: "2026-03-20T08:00:00Z",
    });
  });

  it("falls back to user username when alt is missing", async () => {
    const supabase = mockSupabaseSequential([
      {
        data: [
          {
            id: "user-1",
            username: "solo_trainer",
            created_at: "2026-03-24T08:00:00Z",
          },
        ],
      },
      // No alts found
      { data: [] },
    ]);

    const result = await getNewMembers(supabase, 5);

    expect(result).toHaveLength(1);
    expect(result[0]!.username).toBe("solo_trainer");
    expect(result[0]!.avatarUrl).toBeNull();
  });
});
