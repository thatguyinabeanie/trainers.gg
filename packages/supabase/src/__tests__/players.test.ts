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

  it("chunks the alts/stats IN-queries and merges rows across chunks", async () => {
    // 150 users with default sort "tournaments" → searchPlayers fetches ALL
    // users (post-sort), so allUserIds has 150 ids → 2 alts chunks (size 100)
    // and 2 stats chunks. Regression guard: a single oversized IN-list returned
    // "URI too long", silently stripping every altId and all coach badges.
    const users = Array.from({ length: 150 }, (_, i) => ({
      id: `user-${i}`,
      username: `player_${i}`,
      country: null,
      created_at: "2025-01-01T00:00:00Z",
    }));
    const toAlt = (u: { id: string; username: string }, id: number) => ({
      id,
      user_id: u.id,
      username: u.username,
      avatar_url: null,
    });
    const altsChunk1 = users.slice(0, 100).map((u, i) => toAlt(u, i + 1));
    const altsChunk2 = users.slice(100).map((u, i) => toAlt(u, i + 101));

    const supabase = mockSupabaseSequential([
      { data: users, count: 150 }, // users query
      { data: altsChunk1 }, // alts chunk 1 (user-0..99 -> alt 1..100)
      { data: altsChunk2 }, // alts chunk 2 (user-100..149 -> alt 101..150)
      { data: [] }, // stats chunk 1 (alt 1..100)
      // stats chunk 2 (alt 101..150): give a chunk-2 user a tournament so it
      // sorts to the top, proving BOTH the alts and stats chunk-2 merged.
      {
        data: [
          { alt_id: 101, match_wins: 9, match_losses: 1, tournament_id: 1 },
        ],
      },
    ]);

    const result = await searchPlayers(supabase, { sort: "tournaments" }, 1);

    // Top player is the chunk-2 user whose stats came from stats chunk 2.
    expect(result.players[0]).toEqual(
      expect.objectContaining({
        userId: "user-100",
        username: "player_100",
        altId: 101,
        tournamentCount: 1,
      })
    );
    // Every player on the page resolved a non-null altId (no silent strip).
    expect(result.players.every((p) => p.altId !== null)).toBe(true);
  });

  it("throws when a chunked alts query errors instead of silently returning empty", async () => {
    const supabase = mockSupabaseSequential([
      {
        data: [
          {
            id: "u1",
            username: "solo",
            country: null,
            created_at: "2025-01-01T00:00:00Z",
          },
        ],
        count: 1,
      },
      // alts chunk errors — must propagate, not be swallowed
      { data: null, error: { message: "URI too long" } },
    ]);

    await expect(searchPlayers(supabase, {}, 1)).rejects.toThrow(
      "URI too long"
    );
  });
});

// ============================================================================
// searchPlayers — private-alt exclusion security tests
//
// These tests guard the invariant that users whose alts are all private must
// never surface in public directory results. The service-role client bypasses
// RLS, so the `.eq("is_public", true)` filter on alts is the SOLE enforcement
// point. If that filter is removed, private users leak silently.
// ============================================================================

describe("searchPlayers — private-alt exclusion", () => {
  it("excludes a user whose only alt is private from the result set", async () => {
    // The user appears in the users query (they have a username), but their
    // single alt has is_public=false, so the alts query returns nothing for
    // them. searchPlayers must exclude them entirely.
    const supabase = mockSupabaseSequential([
      // public_user_profiles — user exists
      {
        data: [
          {
            id: "private-user-1",
            username: "shadow_trainer",
            country: null,
            created_at: "2025-01-01T00:00:00Z",
          },
        ],
        count: 1,
      },
      // alts query — is_public=true filter returns nothing (only private alt)
      { data: [] },
      // tournament_player_stats — empty (no alts to look up)
      { data: [] },
    ]);

    const result = await searchPlayers(supabase, {}, 1);

    // The user has no public alt → must not appear in results.
    expect(result.players).toEqual([]);
  });

  it("excludes a user surfaced by a private-alt username match from search results", async () => {
    // When searching for a specific username that belongs to a private alt,
    // the alt username search MUST have is_public=true so the user is never
    // added to the candidate id set.
    // We simulate this: alts search returns empty (private alt filtered out),
    // user profile search also returns empty → userIds = [] → empty result.
    const supabase = mockSupabaseSequential([
      // public_user_profiles search — no direct username match
      { data: [] },
      // alts search with is_public=true — returns nothing (alt is private)
      { data: [] },
    ]);

    const result = await searchPlayers(
      supabase,
      { query: "shadow_trainer" },
      1
    );

    expect(result.players).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("shows only the public alt as the primary alt when user has both public and private alts", async () => {
    // User has two alts: alt id=10 is private, alt id=11 is public.
    // The alts query with is_public=true must return only the public alt.
    // The primary alt shown must be the public one (id=11, username "ash_public").
    const supabase = mockSupabaseSequential([
      // public_user_profiles — user found
      {
        data: [
          {
            id: "user-mixed",
            username: "ash_ketchum",
            country: "US",
            created_at: "2025-01-01T00:00:00Z",
          },
        ],
        count: 1,
      },
      // alts query with is_public=true — only the public alt comes back
      {
        data: [
          {
            id: 11,
            user_id: "user-mixed",
            username: "ash_public",
            avatar_url: "https://example.com/ash-public.png",
          },
        ],
      },
      // tournament_player_stats — empty for simplicity
      { data: [] },
    ]);

    const result = await searchPlayers(supabase, {}, 1);

    expect(result.players).toHaveLength(1);
    const player = result.players[0]!;
    // Must show the public alt's identity.
    expect(player.altId).toBe(11);
    expect(player.username).toBe("ash_public");
    expect(player.avatarUrl).toBe("https://example.com/ash-public.png");
    // Must NOT show any reference to the private alt (id=10).
    expect(player.altId).not.toBe(10);
  });

  it("returns only users that have at least one public alt when no search query is supplied", async () => {
    // Three users in the profile query; only two have public alts.
    // The third (id="private-only") should be absent from results.
    const supabase = mockSupabaseSequential([
      {
        data: [
          {
            id: "user-a",
            username: "alice",
            country: null,
            created_at: "2025-01-01T00:00:00Z",
          },
          {
            id: "user-b",
            username: "bob",
            country: null,
            created_at: "2025-01-01T00:00:00Z",
          },
          {
            id: "private-only",
            username: "ghost",
            country: null,
            created_at: "2025-01-01T00:00:00Z",
          },
        ],
        count: 3,
      },
      // alts — only alice and bob have public alts; ghost has none
      {
        data: [
          { id: 1, user_id: "user-a", username: "alice", avatar_url: null },
          { id: 2, user_id: "user-b", username: "bob", avatar_url: null },
        ],
      },
      // stats — empty
      { data: [] },
    ]);

    const result = await searchPlayers(supabase, {}, 1);

    expect(result.players).toHaveLength(2);
    const userIds = result.players.map((p) => p.userId);
    expect(userIds).toContain("user-a");
    expect(userIds).toContain("user-b");
    expect(userIds).not.toContain("private-only");
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
