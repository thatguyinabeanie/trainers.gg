import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getAltsBulkStats,
  getPlayerLifetimeStats,
  getTeamsForAlt,
} from "../tournaments";
import type { TypedClient } from "../../client";

// ============================================================================
// Shared mock helpers
// ============================================================================

/**
 * Create a mock client where `from()` dispatches to a per-table handler.
 * Each handler must return a chainable query builder object.
 */
function createTableDispatchClient(
  handlers: Record<string, () => Record<string, jest.Mock>>
): TypedClient {
  return {
    from: jest.fn((table: string) => {
      const handler = handlers[table];
      if (handler) return handler();
      // Fallback: chainable no-op
      const chain: Record<string, jest.Mock> = {};
      for (const m of ["select", "eq", "in", "order", "limit", "maybeSingle"]) {
        chain[m] = jest.fn().mockReturnThis();
      }
      return chain;
    }),
  } as unknown as TypedClient;
}

/** Build a query chain that resolves (via await) to the given value. */
function buildChain(resolved: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  for (const m of [
    "select",
    "eq",
    "in",
    "order",
    "limit",
    "maybeSingle",
    "gt",
    "neq",
  ]) {
    chain[m] = jest.fn().mockReturnThis();
  }
  chain["then"] = jest.fn((resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolved).then(resolve)
  ) as jest.Mock;
  return chain;
}

// ============================================================================
// getAltsBulkStats
// ============================================================================

describe("getAltsBulkStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty object when altIds is empty", async () => {
    const client = { from: jest.fn() } as unknown as TypedClient;
    const result = await getAltsBulkStats(client, []);
    expect(result).toEqual({});
    expect(client.from).not.toHaveBeenCalled();
  });

  it("aggregates match wins and losses per alt from player_stats", async () => {
    // alt 1: two rows — 3+2 wins, 1+0 losses
    // alt 2: one row — 5 wins, 2 losses
    const statsRows = [
      { alt_id: 1, match_wins: 3, match_losses: 1 },
      { alt_id: 1, match_wins: 2, match_losses: 0 },
      { alt_id: 2, match_wins: 5, match_losses: 2 },
    ];
    const regRows = [{ alt_id: 1 }, { alt_id: 1 }, { alt_id: 2 }];

    const client = createTableDispatchClient({
      tournament_player_stats: () =>
        buildChain({ data: statsRows, error: null }),
      tournament_registrations: () =>
        buildChain({ data: regRows, error: null }),
    });

    const result = await getAltsBulkStats(client, [1, 2]);

    expect(result[1]).toEqual({
      altId: 1,
      matchWins: 5,
      matchLosses: 1,
      tournamentCount: 2,
    });
    expect(result[2]).toEqual({
      altId: 2,
      matchWins: 5,
      matchLosses: 2,
      tournamentCount: 1,
    });
  });

  it("counts tournament registrations per alt", async () => {
    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: [], error: null }),
      tournament_registrations: () =>
        buildChain({
          data: [{ alt_id: 10 }, { alt_id: 10 }, { alt_id: 10 }],
          error: null,
        }),
    });

    const result = await getAltsBulkStats(client, [10]);
    expect(result[10]?.tournamentCount).toBe(3);
  });

  it("returns zero stats for alts with no data in either table", async () => {
    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: [], error: null }),
      tournament_registrations: () => buildChain({ data: [], error: null }),
    });

    const result = await getAltsBulkStats(client, [42]);

    expect(result[42]).toEqual({
      altId: 42,
      matchWins: 0,
      matchLosses: 0,
      tournamentCount: 0,
    });
  });

  it("throws on player_stats query error", async () => {
    const client = createTableDispatchClient({
      tournament_player_stats: () =>
        buildChain({ data: null, error: { message: "stats failed" } }),
      tournament_registrations: () => buildChain({ data: [], error: null }),
    });

    await expect(getAltsBulkStats(client, [1])).rejects.toMatchObject({
      message: "stats failed",
    });
  });

  it("throws on registrations query error", async () => {
    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: [], error: null }),
      tournament_registrations: () =>
        buildChain({ data: null, error: { message: "reg failed" } }),
    });

    await expect(getAltsBulkStats(client, [1])).rejects.toMatchObject({
      message: "reg failed",
    });
  });

  it("handles null match_wins / match_losses gracefully (treats as 0)", async () => {
    const client = createTableDispatchClient({
      tournament_player_stats: () =>
        buildChain({
          data: [{ alt_id: 5, match_wins: null, match_losses: null }],
          error: null,
        }),
      tournament_registrations: () => buildChain({ data: [], error: null }),
    });

    const result = await getAltsBulkStats(client, [5]);
    expect(result[5]).toEqual({
      altId: 5,
      matchWins: 0,
      matchLosses: 0,
      tournamentCount: 0,
    });
  });
});

// ============================================================================
// getPlayerLifetimeStats
// ============================================================================

describe("getPlayerLifetimeStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty stats when altIds is empty", async () => {
    const client = { from: jest.fn() } as unknown as TypedClient;
    const result = await getPlayerLifetimeStats(client, []);

    expect(result).toEqual({
      tournamentCount: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      bestPlacement: null,
      formats: [],
    });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("returns empty stats when no rows come back from DB", async () => {
    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: [], error: null }),
    });

    const result = await getPlayerLifetimeStats(client, [1]);
    expect(result).toEqual({
      tournamentCount: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      bestPlacement: null,
      formats: [],
    });
  });

  it("aggregates wins and losses across all rows", async () => {
    const rows = [
      {
        tournament_id: 1,
        alt_id: 10,
        match_wins: 4,
        match_losses: 2,
        final_ranking: 3,
        tournament: { format: "VGC" },
      },
      {
        tournament_id: 2,
        alt_id: 10,
        match_wins: 6,
        match_losses: 1,
        final_ranking: 1,
        tournament: { format: "VGC" },
      },
    ];

    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: rows, error: null }),
    });

    const result = await getPlayerLifetimeStats(client, [10]);

    expect(result.totalWins).toBe(10);
    expect(result.totalLosses).toBe(3);
  });

  it("computes correct win rate", async () => {
    const rows = [
      {
        tournament_id: 1,
        alt_id: 10,
        match_wins: 3,
        match_losses: 1,
        final_ranking: null,
        tournament: null,
      },
    ];

    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: rows, error: null }),
    });

    const result = await getPlayerLifetimeStats(client, [10]);
    // 3 wins out of 4 matches = 75%
    expect(result.winRate).toBeCloseTo(75);
  });

  it("tracks best (lowest) placement across multiple rows", async () => {
    const rows = [
      {
        tournament_id: 1,
        alt_id: 10,
        match_wins: 2,
        match_losses: 2,
        final_ranking: 5,
        tournament: null,
      },
      {
        tournament_id: 2,
        alt_id: 10,
        match_wins: 3,
        match_losses: 1,
        final_ranking: 2,
        tournament: null,
      },
      {
        tournament_id: 3,
        alt_id: 10,
        match_wins: 4,
        match_losses: 0,
        final_ranking: 1,
        tournament: null,
      },
    ];

    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: rows, error: null }),
    });

    const result = await getPlayerLifetimeStats(client, [10]);
    expect(result.bestPlacement).toBe(1);
  });

  it("ignores null final_ranking when computing best placement", async () => {
    const rows = [
      {
        tournament_id: 1,
        alt_id: 10,
        match_wins: 2,
        match_losses: 2,
        final_ranking: null,
        tournament: null,
      },
      {
        tournament_id: 2,
        alt_id: 10,
        match_wins: 3,
        match_losses: 1,
        final_ranking: 4,
        tournament: null,
      },
    ];

    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: rows, error: null }),
    });

    const result = await getPlayerLifetimeStats(client, [10]);
    expect(result.bestPlacement).toBe(4);
  });

  it("collects unique formats from joined tournament rows", async () => {
    const rows = [
      {
        tournament_id: 1,
        alt_id: 10,
        match_wins: 1,
        match_losses: 0,
        final_ranking: null,
        tournament: { format: "VGC" },
      },
      {
        tournament_id: 2,
        alt_id: 10,
        match_wins: 1,
        match_losses: 0,
        final_ranking: null,
        tournament: { format: "singles" },
      },
      // Duplicate format — should only appear once
      {
        tournament_id: 3,
        alt_id: 10,
        match_wins: 1,
        match_losses: 0,
        final_ranking: null,
        tournament: { format: "VGC" },
      },
      // Null format — should be skipped
      {
        tournament_id: 4,
        alt_id: 10,
        match_wins: 1,
        match_losses: 0,
        final_ranking: null,
        tournament: { format: null },
      },
    ];

    const client = createTableDispatchClient({
      tournament_player_stats: () => buildChain({ data: rows, error: null }),
    });

    const result = await getPlayerLifetimeStats(client, [10]);
    expect(result.formats).toHaveLength(2);
    expect(result.formats).toContain("VGC");
    expect(result.formats).toContain("singles");
  });

  it("throws on query error", async () => {
    const client = createTableDispatchClient({
      tournament_player_stats: () =>
        buildChain({ data: null, error: { message: "lifetime stats error" } }),
    });

    await expect(getPlayerLifetimeStats(client, [10])).rejects.toMatchObject({
      message: "lifetime stats error",
    });
  });
});

// ============================================================================
// getTeamsForAlt
// ============================================================================

describe("getTeamsForAlt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array when no teams exist", async () => {
    const chain: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
    chain["then"] = jest.fn((resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve)
    ) as jest.Mock;

    const client = {
      from: jest.fn().mockReturnValue(chain),
    } as unknown as TypedClient;

    const result = await getTeamsForAlt(client, 1);
    expect(result).toEqual([]);
  });

  it("returns teams with pokemon species", async () => {
    const teamsData = [
      {
        id: 100,
        name: "My Team",
        created_by: 1,
        is_public: true,
        format_legal: true,
        team_pokemon: [
          { pokemon: { species: "pikachu" } },
          { pokemon: { species: "charizard" } },
        ],
      },
    ];

    const chain: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
    chain["then"] = jest.fn((resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: teamsData, error: null }).then(resolve)
    ) as jest.Mock;

    const client = {
      from: jest.fn().mockReturnValue(chain),
    } as unknown as TypedClient;

    const result = await getTeamsForAlt(client, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 100,
      name: "My Team",
      createdBy: 1,
      isPublic: true,
      formatLegal: true,
      pokemonSpecies: ["pikachu", "charizard"],
    });
  });

  it("filters out teams with zero pokemon", async () => {
    const teamsData = [
      {
        id: 101,
        name: "Has Pokemon",
        created_by: 1,
        is_public: false,
        format_legal: null,
        team_pokemon: [{ pokemon: { species: "bulbasaur" } }],
      },
      {
        id: 102,
        name: "Empty Team",
        created_by: 1,
        is_public: false,
        format_legal: null,
        team_pokemon: [],
      },
    ];

    const chain: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
    chain["then"] = jest.fn((resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: teamsData, error: null }).then(resolve)
    ) as jest.Mock;

    const client = {
      from: jest.fn().mockReturnValue(chain),
    } as unknown as TypedClient;

    const result = await getTeamsForAlt(client, 1);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(101);
  });

  it("skips pokemon entries where species is null", async () => {
    const teamsData = [
      {
        id: 103,
        name: "Partial Team",
        created_by: 1,
        is_public: false,
        format_legal: null,
        // One entry has a null pokemon reference, one has a real species
        team_pokemon: [{ pokemon: null }, { pokemon: { species: "eevee" } }],
      },
    ];

    const chain: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
    chain["then"] = jest.fn((resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: teamsData, error: null }).then(resolve)
    ) as jest.Mock;

    const client = {
      from: jest.fn().mockReturnValue(chain),
    } as unknown as TypedClient;

    const result = await getTeamsForAlt(client, 1);

    // Team still has 1 valid pokemon, so it should be included
    expect(result).toHaveLength(1);
    expect(result[0]?.pokemonSpecies).toEqual(["eevee"]);
  });

  it("throws on query error", async () => {
    const chain: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
    chain["then"] = jest.fn(
      (resolve: (v: unknown) => unknown, reject: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: "teams error" } }).then(
          resolve,
          reject
        )
    ) as jest.Mock;

    const client = {
      from: jest.fn().mockReturnValue(chain),
    } as unknown as TypedClient;

    await expect(getTeamsForAlt(client, 1)).rejects.toMatchObject({
      message: "teams error",
    });
  });
});
