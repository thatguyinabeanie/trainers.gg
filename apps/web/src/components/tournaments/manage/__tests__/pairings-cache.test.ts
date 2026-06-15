import { upsertMatchInPairings } from "../pairings-cache";
import { type TournamentPairingsData } from "@/lib/data/tournament-pairings-endpoint";

// ---------------------------------------------------------------------------
// Builders — minimal shapes matching TournamentPairingsData. We cast through
// `unknown` because the real types carry many DB columns irrelevant to the
// merge logic under test.
// ---------------------------------------------------------------------------

function makeMatch(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    table_number: id,
    status: "active",
    staff_requested: false,
    game_wins1: 0,
    game_wins2: 0,
    is_bye: false,
    // Joins hydrated by the API fetcher — must survive a realtime merge.
    player1: { id: id * 10, username: `p${id}a`, display_name: null },
    player2: { id: id * 10 + 1, username: `p${id}b`, display_name: null },
    ...overrides,
  };
}

function makeData(
  matchesByRound: Array<Array<ReturnType<typeof makeMatch>>>
): TournamentPairingsData {
  const allPhaseRounds = [
    matchesByRound.map((matches, idx) => ({
      id: idx + 1,
      round_number: idx + 1,
      status: "active",
      matches,
    })),
  ];
  return {
    phases: [{ id: 1 } as TournamentPairingsData["phases"][number]],
    allPhaseRounds:
      allPhaseRounds as unknown as TournamentPairingsData["allPhaseRounds"],
    roundsWithStats: [],
    unpairedPlayers: [],
  };
}

describe("upsertMatchInPairings", () => {
  it("returns undefined unchanged when cache is empty", () => {
    expect(upsertMatchInPairings(undefined, { id: 1 })).toBeUndefined();
  });

  it("returns the same reference when payload has no id", () => {
    const data = makeData([[makeMatch(1)]]);
    expect(upsertMatchInPairings(data, {})).toBe(data);
  });

  it("returns the same reference when id is null", () => {
    const data = makeData([[makeMatch(1)]]);
    expect(upsertMatchInPairings(data, { id: null })).toBe(data);
  });

  it("returns the same reference when the id matches no cached match", () => {
    const data = makeData([[makeMatch(1), makeMatch(2)]]);
    expect(upsertMatchInPairings(data, { id: 999, status: "completed" })).toBe(
      data
    );
  });

  it("patches the matched match's scalar columns", () => {
    const data = makeData([[makeMatch(1), makeMatch(2)]]);
    const next = upsertMatchInPairings(data, {
      id: 2,
      status: "completed",
      game_wins1: 2,
      game_wins2: 1,
    })!;

    const updated = next.allPhaseRounds[0]![0]!.matches[1]!;
    expect(updated.status).toBe("completed");
    expect(updated.game_wins1).toBe(2);
    expect(updated.game_wins2).toBe(1);
  });

  it("preserves player joins not present in the realtime payload", () => {
    const data = makeData([[makeMatch(1)]]);
    const next = upsertMatchInPairings(data, {
      id: 1,
      staff_requested: true,
    })!;

    const updated = next.allPhaseRounds[0]![0]!.matches[0]!;
    expect(updated.staff_requested).toBe(true);
    // The join hydrated by the API must survive the merge.
    expect((updated.player1 as { username: string }).username).toBe("p1a");
    expect((updated.player2 as { username: string }).username).toBe("p1b");
  });

  it("never overwrites the existing id even if payload carries a different one", () => {
    const data = makeData([[makeMatch(5)]]);
    const next = upsertMatchInPairings(data, {
      id: 5,
      // A malformed payload should not be able to change the match identity to 999.
      ...({ id: 999 } as Record<string, unknown>),
    })!;
    expect(next.allPhaseRounds[0]![0]!.matches[0]!.id).toBe(5);
  });

  it("coerces a string id and patches the match", () => {
    const data = makeData([[makeMatch(3)]]);
    const next = upsertMatchInPairings(data, {
      id: "3",
      status: "completed",
    })!;
    expect(next.allPhaseRounds[0]![0]!.matches[0]!.status).toBe("completed");
  });

  it("does not mutate the input data", () => {
    const data = makeData([[makeMatch(1)]]);
    const snapshot = JSON.stringify(data);
    upsertMatchInPairings(data, { id: 1, status: "completed" });
    expect(JSON.stringify(data)).toBe(snapshot);
  });

  it("returns a new top-level reference when a match changes", () => {
    const data = makeData([[makeMatch(1)]]);
    const next = upsertMatchInPairings(data, { id: 1, status: "completed" });
    expect(next).not.toBe(data);
  });

  it("patches a match in a later round, leaving earlier rounds intact", () => {
    const data = makeData([[makeMatch(1)], [makeMatch(2)]]);
    const next = upsertMatchInPairings(data, { id: 2, status: "completed" })!;
    // Round 0 untouched (same reference).
    expect(next.allPhaseRounds[0]![0]).toBe(data.allPhaseRounds[0]![0]);
    // Round 1 patched.
    expect(next.allPhaseRounds[0]![1]!.matches[0]!.status).toBe("completed");
  });
});
