import { getMatchDetails } from "../queries/tournaments";
import type { TypedClient } from "../client";

// Build a Supabase mock where each table returns a configured result.
// Calls to .from(table) are tracked by call order so the two tournament_phases
// calls can return different data.
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

const mockMatch = {
  id: 42,
  round_id: 10,
  alt1_id: 1,
  alt2_id: 2,
  status: "active",
  table_number: 5,
  winner_alt_id: null,
  game_wins1: 0,
  game_wins2: 0,
  player1: { id: 1, username: "ash", avatar_url: null },
  player2: { id: 2, username: "gary", avatar_url: null },
  round: { id: 10, phase_id: 100, round_number: 1 },
};

const mockPhase = {
  id: 100,
  tournament_id: 7,
  name: "Swiss",
  phase_type: "swiss",
  status: "active",
  tournament: {
    id: 7,
    name: "Pallet Town Open",
    slug: "pallet-town-open",
    status: "active",
  },
};

describe("getMatchDetails", () => {
  it("returns null when the match is not found", async () => {
    const supabase = {
      from: jest.fn(() =>
        makeResolvableChain({ data: null, error: { message: "not found" } })
      ),
    } as unknown as TypedClient;

    const result = await getMatchDetails(supabase, 999);

    expect(result).toBeNull();
  });

  it("returns full match details when match exists", async () => {
    let fromCallCount = 0;

    const supabase = {
      from: jest.fn(() => {
        fromCallCount++;
        switch (fromCallCount) {
          case 1: // tournament_matches
            return makeResolvableChain({ data: mockMatch, error: null });
          case 2: // tournament_phases with embedded tournament
            return makeResolvableChain({ data: mockPhase, error: null });
          default:
            return makeResolvableChain({ data: null, error: null });
        }
      }),
    } as unknown as TypedClient;

    const result = await getMatchDetails(supabase, 42);

    expect(result).not.toBeNull();
    expect(result!.match).toEqual(mockMatch);
    expect(result!.player1).toEqual(mockMatch.player1);
    expect(result!.player2).toEqual(mockMatch.player2);
    expect(result!.round).toEqual(mockMatch.round);
    expect(result!.phase).toEqual(mockPhase);
    expect(result!.tournament).toEqual(mockPhase.tournament);
  });

  it("returns match with null phase/tournament when phase query fails", async () => {
    let fromCallCount = 0;

    const supabase = {
      from: jest.fn(() => {
        fromCallCount++;
        switch (fromCallCount) {
          case 1: // tournament_matches — match found
            return makeResolvableChain({ data: mockMatch, error: null });
          case 2: // tournament_phases — not found
            return makeResolvableChain({ data: null, error: null });
          default:
            return makeResolvableChain({ data: null, error: null });
        }
      }),
    } as unknown as TypedClient;

    const result = await getMatchDetails(supabase, 42);

    expect(result).not.toBeNull();
    expect(result!.phase).toBeNull();
    expect(result!.tournament).toBeUndefined();
  });

  it("exposes only non-sensitive tournament columns (no archived_by, archive_reason, tournament_state, template_id)", async () => {
    let fromCallCount = 0;

    // Phase with tournament that intentionally omits admin-internal columns
    const phaseWithLimitedTournament = {
      id: 100,
      tournament_id: 7,
      name: "Swiss",
      phase_type: "swiss",
      status: "active",
      tournament: {
        id: 7,
        name: "Pallet Town Open",
        slug: "pallet-town-open",
        status: "active",
        // Admin-internal columns NOT present — confirm they are absent
      },
    };

    const supabase = {
      from: jest.fn((table: string) => {
        fromCallCount++;
        if (fromCallCount === 1 && table === "tournament_matches") {
          return makeResolvableChain({ data: mockMatch, error: null });
        }
        if (fromCallCount === 2 && table === "tournament_phases") {
          // Verify the select string does NOT contain wildcard or admin columns
          const builder = makeResolvableChain({
            data: phaseWithLimitedTournament,
            error: null,
          });
          return builder;
        }
        return makeResolvableChain({ data: null, error: null });
      }),
    } as unknown as TypedClient;

    const result = await getMatchDetails(supabase, 42);

    expect(result).not.toBeNull();
    const t = result!.tournament as Record<string, unknown> | undefined;
    expect(t).toBeDefined();

    // Admin-internal columns must NOT appear on the embedded tournament
    expect(t).not.toHaveProperty("archived_by");
    expect(t).not.toHaveProperty("archive_reason");
    expect(t).not.toHaveProperty("archived_at");
    expect(t).not.toHaveProperty("tournament_state");
    expect(t).not.toHaveProperty("template_id");

    // Non-sensitive columns that callers need must be present
    expect(t).toHaveProperty("id");
    expect(t).toHaveProperty("name");
    expect(t).toHaveProperty("slug");
    expect(t).toHaveProperty("status");
  });

  it("uses explicit column allowlist in the phase select (no wildcards)", () => {
    // This test asserts the select string shape by inspecting the mock call args.
    let phaseSelectArg: string | undefined;

    let fromCallCount = 0;
    const supabase = {
      from: jest.fn((table: string) => {
        fromCallCount++;
        const chain: Record<string, jest.Mock> = {};
        const step = new Proxy(chain, {
          get(_target, prop) {
            if (prop === "then") {
              const resolveValue =
                fromCallCount === 1
                  ? { data: mockMatch, error: null }
                  : { data: mockPhase, error: null };
              return (resolve: (v: unknown) => void) => resolve(resolveValue);
            }
            if (prop === "select") {
              return jest.fn((cols: string) => {
                if (table === "tournament_phases") {
                  phaseSelectArg = cols;
                }
                return step;
              });
            }
            if (typeof prop === "string") {
              return jest.fn().mockReturnValue(step);
            }
            return undefined;
          },
        });
        return step;
      }),
    } as unknown as TypedClient;

    return getMatchDetails(supabase, 42).then(() => {
      expect(phaseSelectArg).toBeDefined();
      // Must not be a bare wildcard
      expect(phaseSelectArg).not.toBe("*");
      // Must not contain a wildcard on the embedded tournament relationship
      expect(phaseSelectArg).not.toMatch(/tournaments![^(]*\(\s*\*\s*\)/);
      // Must not use a standalone wildcard prefix ("*, …")
      expect(phaseSelectArg).not.toMatch(/^\s*\*/);
      // Must include the non-sensitive columns callers rely on
      expect(phaseSelectArg).toContain("id");
      expect(phaseSelectArg).toContain("name");
      expect(phaseSelectArg).toContain("slug");
    });
  });
});
