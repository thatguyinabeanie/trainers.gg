/**
 * @jest-environment node
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RK9Pokemon, RK9RosterEntry } from "../types";
import { importEvent, syncEvents, collectUniqueSpecies } from "../import";

// ---------------------------------------------------------------------------
// Chainable Supabase mock helpers
// ---------------------------------------------------------------------------

interface ChainResult {
  data?: unknown;
  error: { message: string } | null;
}

/** Creates a chainable object that resolves to `result` when awaited or `.single()`-ed. */
function chain(result: ChainResult): Record<string, unknown> {
  const node: Record<string, unknown> = {
    then(
      resolve: (v: ChainResult) => unknown,
      reject?: (e: unknown) => unknown
    ) {
      return Promise.resolve(result).then(resolve, reject);
    },
    single: () => Promise.resolve(result),
  };
  for (const m of [
    "delete",
    "select",
    "insert",
    "upsert",
    "update",
    "eq",
    "not",
    "in",
    "order",
    "limit",
  ]) {
    node[m] = () => chain(result);
  }
  return node;
}

/** Routes table-level method calls to per-operation handlers. */
function makeTableProxy(
  handlers: Record<string, (...args: unknown[]) => unknown>
): unknown {
  return new Proxy(
    {},
    {
      get(_, prop: string) {
        return (
          handlers[prop] ?? ((..._args: unknown[]) => chain({ error: null }))
        );
      },
    }
  );
}

interface MockConfig {
  standingsDelete?: ChainResult;
  standingsUpsert?: ChainResult;
  /** Plain result (same every call) or factory (called per insert). */
  playersSelect?: ChainResult | (() => ChainResult);
  playersInsert?: ChainResult | (() => ChainResult);
  playersUpdate?: ChainResult;
  teamPokemonInsert?: ChainResult;
  eventsUpdate?: ChainResult;
}

function buildSupabaseMock(config: MockConfig = {}): SupabaseClient {
  const {
    standingsDelete = { error: null },
    standingsUpsert = { data: [{ id: 1 }], error: null },
    playersSelect = { data: [], error: null },
    playersInsert = { data: { id: 1 }, error: null },
    playersUpdate = { error: null },
    teamPokemonInsert = { error: null },
    eventsUpdate = { error: null },
  } = config;

  const resolve = <T extends ChainResult>(v: T | (() => T)): T =>
    typeof v === "function" ? (v as () => T)() : v;

  const tables: Record<string, unknown> = {
    standings: makeTableProxy({
      delete: () => chain(standingsDelete),
      upsert: () => chain(standingsUpsert),
    }),
    players: makeTableProxy({
      select: () => chain(resolve(playersSelect)),
      insert: () => chain(resolve(playersInsert)),
      update: () => chain(playersUpdate),
    }),
    team_pokemon: makeTableProxy({
      insert: () => chain(teamPokemonInsert),
    }),
    events: makeTableProxy({
      update: () => chain(eventsUpdate),
    }),
  };

  return {
    schema: () => ({ from: (table: string) => tables[table] ?? makeTableProxy({}) }),
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makePokemon = (speciesRaw: string): RK9Pokemon => ({
  speciesRaw,
  ability: "Static",
  heldItem: "Oran Berry",
  teraType: null,
  statAlignment: null,
  moves: ["Thunderbolt", "Volt Switch", "Protect", "Fake Out"],
});

const makeEntry = (overrides: Partial<RK9RosterEntry> = {}): RK9RosterEntry => ({
  playerIdMasked: "p1...3",
  firstName: "Ash",
  lastName: "Ketchum",
  country: "US",
  trainerName: "PikachuTrainer",
  division: "masters",
  placement: 1,
  rosterEntryId: "r-001",
  ...overrides,
});

// Empty species map — forces resolveSpeciesSlug to fall back to normalizeSpecies
const EMPTY_MAP = new Map<string, string>();

// ---------------------------------------------------------------------------
// collectUniqueSpecies
// ---------------------------------------------------------------------------

describe("collectUniqueSpecies", () => {
  it("collects unique species from teams", () => {
    const teams: Record<string, RK9Pokemon[]> = {
      entry1: [
        {
          speciesRaw: "Pikachu",
          ability: "Static",
          heldItem: "",
          teraType: null,
          statAlignment: null,
          moves: [],
        },
        {
          speciesRaw: "Charizard",
          ability: "Blaze",
          heldItem: "",
          teraType: null,
          statAlignment: null,
          moves: [],
        },
      ],
      entry2: [
        {
          speciesRaw: "Pikachu",
          ability: "Lightning Rod",
          heldItem: "",
          teraType: null,
          statAlignment: null,
          moves: [],
        },
      ],
    };

    const result = collectUniqueSpecies(teams);

    expect(result.size).toBe(2);
    expect(result.get("Pikachu")).toBe("pikachu");
    expect(result.get("Charizard")).toBe("charizard");
  });
});

// ---------------------------------------------------------------------------
// syncEvents
// ---------------------------------------------------------------------------

describe("syncEvents", () => {
  it("upserts events", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });

    const supabase = {
      schema: () => ({
        from: () => ({ upsert }),
      }),
    };

    const result = await syncEvents(
      supabase as unknown as Parameters<typeof syncEvents>[0],
      [
        {
          eventId: "e1",
          name: "Event 1",
          tier: "regional",
          dateStart: "2024-01-01",
          dateEnd: "2024-01-02",
          locationCity: "City",
          locationCountry: "CO",
          dateRaw: "",
          section: "past",
        },
      ]
    );

    expect(result.synced).toBe(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ event_id: "e1" })]),
      { onConflict: "event_id" }
    );
  });
});

// ---------------------------------------------------------------------------
// importEvent
// ---------------------------------------------------------------------------

describe("importEvent", () => {
  const EVENT_ID = "evt-test-001";

  it("creates a new player when no existing record is found (new_player)", async () => {
    const supabase = buildSupabaseMock({
      playersSelect: { data: [], error: null },
      playersInsert: { data: { id: 42 }, error: null },
      standingsUpsert: { data: [{ id: 100 }], error: null },
    });

    const result = await importEvent(
      supabase,
      EVENT_ID,
      [makeEntry()],
      {},
      EMPTY_MAP
    );

    expect(result.playersUpserted).toBe(1);
    expect(result.standingsInserted).toBe(1);
    expect(result.teamsInserted).toBe(0);
  });

  it("uses an existing player whose trainer name is already known (null flag)", async () => {
    const supabase = buildSupabaseMock({
      playersSelect: {
        data: [{ id: 5, trainer_names: ["PikachuTrainer"] }],
        error: null,
      },
      standingsUpsert: { data: [{ id: 200 }], error: null },
    });

    const result = await importEvent(
      supabase,
      EVENT_ID,
      [makeEntry({ trainerName: "PikachuTrainer" })],
      {},
      EMPTY_MAP
    );

    expect(result.playersUpserted).toBe(1);
    expect(result.standingsInserted).toBe(1);
  });

  it("links to existing player and appends unknown trainer name (new_trainer)", async () => {
    const supabase = buildSupabaseMock({
      // One existing player with no trainer names on record
      playersSelect: { data: [{ id: 7, trainer_names: [] }], error: null },
      playersUpdate: { error: null },
      standingsUpsert: { data: [{ id: 300 }], error: null },
    });

    const result = await importEvent(
      supabase,
      EVENT_ID,
      [makeEntry({ trainerName: "BrandNewTrainer" })],
      {},
      EMPTY_MAP
    );

    expect(result.playersUpserted).toBe(1);
    expect(result.standingsInserted).toBe(1);
  });

  it("creates separate player records when the same identity appears twice (name_collision)", async () => {
    let insertIdx = 0;
    const insertResults = [
      { data: { id: 10 }, error: null },
      { data: { id: 11 }, error: null },
    ];

    const supabase = buildSupabaseMock({
      playersSelect: { data: [], error: null },
      playersInsert: () =>
        insertResults[insertIdx++] ?? { data: { id: 99 }, error: null },
      standingsUpsert: { data: [{ id: 400 }, { id: 401 }], error: null },
    });

    const shared = {
      playerIdMasked: "col...9",
      firstName: "Same",
      lastName: "Person",
      country: "JP",
    };
    const entries = [
      makeEntry({ ...shared, trainerName: "Trainer1", rosterEntryId: "r-c1" }),
      makeEntry({ ...shared, trainerName: "Trainer2", rosterEntryId: "r-c2" }),
    ];

    const result = await importEvent(
      supabase,
      EVENT_ID,
      entries,
      {},
      EMPTY_MAP
    );

    expect(result.playersUpserted).toBe(2);
    expect(result.standingsInserted).toBe(2);
  });

  it("records the standing as unlinked when player lookup fails", async () => {
    const supabase = buildSupabaseMock({
      playersSelect: { data: null, error: { message: "connection refused" } },
      // Standing still gets inserted (with null player_id and 'unlinked' flag)
      standingsUpsert: { data: [{ id: 500 }], error: null },
    });

    const result = await importEvent(
      supabase,
      EVENT_ID,
      [makeEntry({ rosterEntryId: "r-err" })],
      {},
      EMPTY_MAP
    );

    expect(result.playersUpserted).toBe(0);
    expect(result.standingsInserted).toBe(1);
  });

  it("inserts team pokemon and normalizes species via heuristic fallback", async () => {
    const supabase = buildSupabaseMock({
      playersSelect: {
        data: [{ id: 9, trainer_names: ["PikachuTrainer"] }],
        error: null,
      },
      standingsUpsert: { data: [{ id: 600 }], error: null },
      teamPokemonInsert: { error: null },
    });

    const entry = makeEntry({ trainerName: "PikachuTrainer", rosterEntryId: "r-team" });
    const teams: Record<string, RK9Pokemon[]> = {
      "r-team": [makePokemon("Pikachu"), makePokemon("Charizard")],
    };

    const result = await importEvent(
      supabase,
      EVENT_ID,
      [entry],
      teams,
      EMPTY_MAP // empty map → normalizeSpecies fallback (covers resolveSpeciesSlug branch)
    );

    expect(result.teamsInserted).toBe(1);
    expect(result.pokemonInserted).toBe(2);
  });

  it("sets event status to 'complete' when teams are imported", async () => {
    const supabase = buildSupabaseMock({
      playersSelect: {
        data: [{ id: 9, trainer_names: ["PikachuTrainer"] }],
        error: null,
      },
      standingsUpsert: { data: [{ id: 700 }], error: null },
    });

    const entry = makeEntry({
      trainerName: "PikachuTrainer",
      rosterEntryId: "r-status",
    });

    const result = await importEvent(
      supabase,
      EVENT_ID,
      [entry],
      { "r-status": [makePokemon("Bulbasaur")] },
      EMPTY_MAP
    );

    expect(result.teamsInserted).toBe(1);
  });

  it("skips roster entries that have no name", async () => {
    const supabase = buildSupabaseMock({
      standingsUpsert: { data: [], error: null },
    });

    const result = await importEvent(
      supabase,
      EVENT_ID,
      // firstName is an empty string → falsy → skipped by the guard
      [makeEntry({ firstName: "" })],
      {},
      EMPTY_MAP
    );

    expect(result.playersUpserted).toBe(0);
    expect(result.standingsInserted).toBe(0);
  });

  it("creates a new player when multiple candidates exist but none match trainer name (name_collision)", async () => {
    const supabase = buildSupabaseMock({
      // Two existing players with the same identity but neither knows the trainer name
      playersSelect: {
        data: [
          { id: 20, trainer_names: ["OtherTrainer"] },
          { id: 21, trainer_names: ["AnotherTrainer"] },
        ],
        error: null,
      },
      playersInsert: { data: { id: 22 }, error: null },
      standingsUpsert: { data: [{ id: 800 }], error: null },
    });

    const result = await importEvent(
      supabase,
      EVENT_ID,
      [makeEntry({ trainerName: "UnknownTrainer" })],
      {},
      EMPTY_MAP
    );

    expect(result.playersUpserted).toBe(1);
    expect(result.standingsInserted).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// importEvent error paths
// ---------------------------------------------------------------------------

describe("importEvent error paths", () => {
  it("throws when the initial standings delete fails", async () => {
    const supabase = buildSupabaseMock({
      standingsDelete: { error: { message: "delete failed" } },
    });

    await expect(importEvent(supabase, "EVT001", [], {})).rejects.toThrow(
      "Delete standings: delete failed"
    );
  });

  it("records the standing as unlinked when brand-new player insert fails (non-fatal)", async () => {
    // Player insert errors are caught inside the per-entry try/catch — the entry
    // is recorded with playerId=null and importFlag="unlinked" rather than aborting
    // the entire import. This covers the new_player createErr → catch path.
    const supabase = buildSupabaseMock({
      playersSelect: { data: [], error: null },
      playersInsert: { error: { message: "new player insert failed" } },
      standingsUpsert: { data: [{ id: 1 }], error: null },
    });

    const roster: RK9RosterEntry[] = [
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash",
        rosterEntryId: null,
        placement: 1,
      },
    ];

    const result = await importEvent(supabase, "EVT001", roster, {});

    // Import does NOT throw — the entry is unlinked, not fatal
    expect(result.playersUpserted).toBe(0);
    expect(result.standingsInserted).toBe(1);
    // Verify no teams were imported (standing exists but with no player_id due to error)
    expect(result.teamsInserted).toBe(0);
  });

  it("records standings as unlinked when conflict-group player insert fails (non-fatal)", async () => {
    // Two entries with identical identity = conflict group. When insert fails,
    // both entries are caught and recorded as unlinked — import still completes.
    const supabase = buildSupabaseMock({
      playersSelect: { data: [], error: null },
      playersInsert: { error: { message: "conflict insert failed" } },
      standingsUpsert: { data: [{ id: 1 }, { id: 2 }], error: null },
    });

    const roster: RK9RosterEntry[] = [
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash1",
        rosterEntryId: null,
        placement: 1,
      },
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash2",
        rosterEntryId: null,
        placement: 2,
      },
    ];

    const result = await importEvent(supabase, "EVT001", roster, {});

    // Import does NOT throw — both entries are unlinked, not fatal
    expect(result.playersUpserted).toBe(0);
    // Both standings inserted but with no player_id due to conflict group error
    expect(result.standingsInserted).toBe(2);
    // Verify no teams were imported (standings exist but with no player_id)
    expect(result.teamsInserted).toBe(0);
  });

  it("throws when the standings batch upsert fails", async () => {
    const supabase = buildSupabaseMock({
      playersSelect: { data: [], error: null },
      playersInsert: { data: { id: 1 }, error: null },
      standingsUpsert: { error: { message: "standings upsert failed" } },
    });

    const roster: RK9RosterEntry[] = [
      {
        playerIdMasked: "1....1",
        firstName: "Ash",
        lastName: "Ketchum",
        country: "JP",
        division: "masters",
        trainerName: "Ash",
        rosterEntryId: null,
        placement: 1,
      },
    ];

    await expect(
      importEvent(supabase, "EVT001", roster, {})
    ).rejects.toThrow("standings upsert failed");
  });
});
