/**
 * Tests for importTournament in import.ts.
 *
 * Focus: the team_pokemon batch-insert mapping (~line 369) that persists
 * `mon.nature ?? null` — Copilot flagged this line on PR #379 as untested.
 * The mock supabase client below stubs exactly the tables/methods
 * importTournament touches on its write path (per the DI convention in
 * .claude/rules/supabase-patterns.md — supabase is always the first param).
 */

import { importTournament } from "../import";
import { type TournamentData } from "../types";

// =============================================================================
// Helpers — bespoke chainable mock tailored to importTournament's call graph
// =============================================================================

/**
 * Builds a minimal mock TypedClient covering every `.schema("limitless").from(...)`
 * call importTournament makes for a details payload with no organizer, no
 * phases, and no pairings (the branches that would add extra calls are
 * skipped in the fixture below so this mock only needs to cover the calls
 * that always happen: rpc clear, tournaments upsert, players upsert,
 * standings insert, team_pokemon insert, tournaments update).
 */
function createImportMock() {
  const teamPokemonInsert = jest.fn().mockResolvedValue({ error: null });

  const rpc = jest.fn().mockResolvedValue({ error: null });

  // tournaments: upsert() is awaited directly (no .select chained) on the
  // metadata upsert, and update().eq() is awaited directly on the final
  // "mark imported" step. Both just need `.error: null` on the thenable
  // object returned by the chain.
  const tournamentsUpsert = jest.fn().mockResolvedValue({ error: null });
  const tournamentsUpdateEq = jest.fn().mockResolvedValue({ error: null });
  const tournamentsUpdate = jest
    .fn()
    .mockReturnValue({ eq: tournamentsUpdateEq });

  // players: upsert(...).select("id, username") resolves with the upserted rows
  const playersSelect = jest.fn().mockResolvedValue({
    data: [
      { id: 1, username: "player_one" },
      { id: 2, username: "player_two" },
    ],
    error: null,
  });
  const playersUpsert = jest.fn().mockReturnValue({ select: playersSelect });

  // standings: insert(...).select("id") resolves with inserted ids, in order
  const standingsSelect = jest.fn().mockResolvedValue({
    data: [{ id: 101 }, { id: 102 }],
    error: null,
  });
  const standingsInsert = jest
    .fn()
    .mockReturnValue({ select: standingsSelect });

  const fromByTable: Record<string, unknown> = {
    tournaments: {
      upsert: tournamentsUpsert,
      update: tournamentsUpdate,
    },
    players: {
      upsert: playersUpsert,
    },
    standings: {
      insert: standingsInsert,
    },
    team_pokemon: {
      insert: teamPokemonInsert,
    },
  };

  const from = jest.fn((table: string) => {
    const impl = fromByTable[table];
    if (!impl) {
      throw new Error(`Unexpected table in mock: ${table}`);
    }
    return impl;
  });

  const schema = jest.fn(() => ({ from, rpc }));

  const supabase = { schema } as unknown as Parameters<
    typeof importTournament
  >[0];

  return { supabase, teamPokemonInsert, tournamentsUpsert, from, rpc };
}

/** Builds a minimal TournamentData fixture with no organizer/phases/pairings
 * so the mock above doesn't need to cover those optional branches. */
function buildTournamentData(
  decklist: TournamentData["standings"][number]["decklist"]
): TournamentData {
  return {
    details: {
      id: "T123",
      game: "VGC",
      format: "M-B",
      name: "Regional Championship",
      date: "2026-06-01",
      players: 2,
    },
    standings: [
      {
        player: "player_one",
        name: "Player One",
        placing: 1,
        record: { wins: 5, losses: 1, ties: 0 },
        decklist,
      },
      {
        player: "player_two",
        name: "Player Two",
        placing: 2,
        record: { wins: 4, losses: 2, ties: 0 },
        decklist: null,
      },
    ],
    pairings: [],
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("importTournament", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists nature: null when a decklist entry omits nature, and the real value when present", async () => {
    const { supabase, teamPokemonInsert } = createImportMock();

    const data = buildTournamentData([
      {
        id: "landorus-therian",
        name: "Landorus-Therian",
        item: "Choice Scarf",
        ability: "Intimidate",
        attacks: ["Earthquake", "U-turn", "Stone Edge", "Superpower"],
        nature: "Jolly",
        tera: "Flying",
      },
      {
        id: "incineroar",
        name: "Incineroar",
        item: "Sitrus Berry",
        ability: "Intimidate",
        attacks: ["Fake Out", "Knock Off", "Parting Shot", "Flare Blitz"],
        // nature intentionally omitted — this is the exact regression Copilot flagged
        tera: "Dark",
      },
    ]);

    await importTournament(supabase, data, "M-B");

    expect(teamPokemonInsert).toHaveBeenCalledTimes(1);
    const insertedRows = teamPokemonInsert.mock.calls[0]?.[0] as Array<{
      species: string;
      nature: string | null;
    }>;

    const jolly = insertedRows.find((r) => r.species === "landorus-therian");
    const noNature = insertedRows.find((r) => r.species === "incineroar");

    expect(jolly?.nature).toBe("Jolly");
    expect(noNature?.nature).toBeNull();
    // Regression guard: must be `null`, not `undefined` — PostgREST/Supabase
    // treats an `undefined` field differently from an explicit `null` column value.
    expect(noNature).toHaveProperty("nature", null);
    expect("nature" in (noNature as object)).toBe(true);
  });

  it("maps decklist nature: null explicitly to nature: null (not dropped)", async () => {
    const { supabase, teamPokemonInsert } = createImportMock();

    const data = buildTournamentData([
      {
        id: "flutter-mane",
        name: "Flutter Mane",
        item: "Booster Energy",
        ability: "Protosynthesis",
        attacks: ["Moonblast", "Shadow Ball", "Icy Wind", "Protect"],
        nature: null,
        tera: "Fairy",
      },
    ]);

    await importTournament(supabase, data, "M-B");

    const insertedRows = teamPokemonInsert.mock.calls[0]?.[0] as Array<{
      species: string;
      nature: string | null;
    }>;
    expect(insertedRows[0]?.nature).toBeNull();
  });

  it("skips team_pokemon insert entirely when no standings have a decklist", async () => {
    const { supabase, teamPokemonInsert } = createImportMock();

    const data = buildTournamentData(null);

    await importTournament(supabase, data, "M-B");

    expect(teamPokemonInsert).not.toHaveBeenCalled();
  });

  it("throws a descriptive error when the team_pokemon insert fails", async () => {
    const { supabase, teamPokemonInsert } = createImportMock();
    teamPokemonInsert.mockResolvedValue({
      error: { message: "constraint violation" },
    });

    const data = buildTournamentData([
      {
        id: "landorus-therian",
        name: "Landorus-Therian",
        nature: "Jolly",
      },
    ]);

    await expect(importTournament(supabase, data, "M-B")).rejects.toThrow(
      "Team pokemon batch at offset 0: constraint violation"
    );
  });

  it("resolves the Limitless format code through LIMITLESS_TO_FORMAT for the tournament upsert", async () => {
    const { supabase, tournamentsUpsert } = createImportMock();

    const data = buildTournamentData([
      { id: "flutter-mane", name: "Flutter Mane", nature: "Timid" },
    ]);

    await importTournament(supabase, data, "M-B");

    expect(tournamentsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ format_id: "gen9championsvgc2026regmb" }),
      expect.anything()
    );
  });
});
