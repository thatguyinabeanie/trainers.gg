import { getMatchByRoundAndTable } from "../queries/tournaments";
import type { TypedClient } from "../client";

// Helper to create a chainable mock that returns the specified final result
function createChainMock(_finalResult: { data: unknown; error?: unknown }) {
  const chain: Record<string, jest.Mock> = {};

  const createChainStep = (): Record<string, jest.Mock> => {
    const step: Record<string, jest.Mock> = {};
    for (const method of [
      "select",
      "eq",
      "in",
      "maybeSingle",
      "single",
      "from",
    ]) {
      step[method] = jest.fn().mockReturnValue(step);
    }
    return step;
  };

  Object.assign(chain, createChainStep());

  return chain;
}

// Build a Supabase mock where each call to `.from(table)` returns a
// pre-configured chainable builder with the desired result.
function mockSupabase(tableResults: Record<string, { data: unknown }>) {
  const builders = new Map<string, ReturnType<typeof createChainMock>>();

  for (const [table, result] of Object.entries(tableResults)) {
    const builder = createChainMock(result);
    // Override maybeSingle/single to return the actual data
    builder.maybeSingle = jest.fn().mockResolvedValue(result);
    builder.single = jest.fn().mockResolvedValue(result);
    builders.set(table, builder);
  }

  const supabase = {
    from: jest.fn((table: string) => {
      return builders.get(table) ?? createChainMock({ data: null });
    }),
  };

  return supabase as unknown as TypedClient;
}

describe("getMatchByRoundAndTable", () => {
  it("returns null when tournament slug not found", async () => {
    const supabase = mockSupabase({
      tournaments: { data: null },
    });

    const result = await getMatchByRoundAndTable(
      supabase,
      "nonexistent-slug",
      1,
      1
    );

    expect(result).toBeNull();
  });

  it("returns null when no phases exist for tournament", async () => {
    const supabase = mockSupabase({
      tournaments: { data: { id: 1, slug: "test-tourney" } },
      tournament_phases: { data: [] },
    });

    const result = await getMatchByRoundAndTable(
      supabase,
      "test-tourney",
      1,
      1
    );

    expect(result).toBeNull();
  });

  it("returns null when round number not found", async () => {
    let fromCallCount = 0;

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

    const supabase = {
      from: jest.fn(() => {
        fromCallCount++;
        switch (fromCallCount) {
          case 1: // tournaments
            return makeResolvableChain({
              data: { id: 1, slug: "test" },
            });
          case 2: // tournament_phases
            return makeResolvableChain({ data: [{ id: 10 }] });
          case 3: // tournament_rounds — round not found
            return makeResolvableChain({ data: null });
          default:
            return makeResolvableChain({ data: null });
        }
      }),
    } as unknown as TypedClient;

    const result = await getMatchByRoundAndTable(supabase, "test", 99, 1);

    expect(result).toBeNull();
  });

  it("returns match data when all params are valid", async () => {
    const mockTournament = {
      id: 1,
      name: "Test Tournament",
      slug: "test-tourney",
      organization_id: 5,
      status: "active",
    };
    const mockRound = {
      id: 10,
      round_number: 2,
      phase_id: 100,
      status: "active",
    };
    const mockMatch = {
      id: 50,
      round_id: 10,
      table_number: 3,
      alt1_id: 1,
      alt2_id: 2,
      status: "active",
      player1: { id: 1, username: "ash" },
      player2: { id: 2, username: "gary" },
    };
    const mockPhase = {
      id: 100,
      tournament_id: 1,
      best_of: 3,
      tournament: mockTournament,
    };

    let fromCallCount = 0;

    // Create chain that resolves to a value when awaited
    function makeResolvableChain(resolveValue: unknown) {
      const chain: Record<string, unknown> = {};
      const proxy = new Proxy(chain, {
        get(_target, prop) {
          if (prop === "then") {
            return (resolve: (v: unknown) => void) => resolve(resolveValue);
          }
          // All chain methods return the proxy itself
          if (typeof prop === "string") {
            return jest.fn().mockReturnValue(proxy);
          }
          return undefined;
        },
      });
      return proxy;
    }

    const supabase = {
      from: jest.fn(() => {
        fromCallCount++;
        switch (fromCallCount) {
          case 1: // tournaments
            return makeResolvableChain({ data: mockTournament });
          case 2: // tournament_phases (list)
            return makeResolvableChain({ data: [{ id: 100 }] });
          case 3: // tournament_rounds
            return makeResolvableChain({ data: mockRound });
          case 4: // tournament_matches
            return makeResolvableChain({ data: mockMatch });
          case 5: // tournament_phases (with tournament)
            return makeResolvableChain({ data: mockPhase });
          default:
            return makeResolvableChain({ data: null });
        }
      }),
    } as unknown as TypedClient;

    const result = await getMatchByRoundAndTable(
      supabase,
      "test-tourney",
      2,
      3
    );

    expect(result).not.toBeNull();
    expect(result!.match).toEqual(mockMatch);
    expect(result!.player1).toEqual(mockMatch.player1);
    expect(result!.player2).toEqual(mockMatch.player2);
    expect(result!.round).toEqual(mockRound);
    expect(result!.phase).toEqual(mockPhase);
    expect(result!.tournament).toEqual(mockTournament);
  });

  it("returns null when match not found at table", async () => {
    let fromCallCount = 0;

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

    const supabase = {
      from: jest.fn(() => {
        fromCallCount++;
        switch (fromCallCount) {
          case 1: // tournaments
            return makeResolvableChain({
              data: { id: 1, slug: "test-tourney" },
            });
          case 2: // tournament_phases
            return makeResolvableChain({ data: [{ id: 100 }] });
          case 3: // tournament_rounds
            return makeResolvableChain({
              data: { id: 10, round_number: 1, phase_id: 100 },
            });
          case 4: // tournament_matches — no match at this table
            return makeResolvableChain({ data: null });
          default:
            return makeResolvableChain({ data: null });
        }
      }),
    } as unknown as TypedClient;

    const result = await getMatchByRoundAndTable(
      supabase,
      "test-tourney",
      1,
      99
    );

    expect(result).toBeNull();
  });
});
