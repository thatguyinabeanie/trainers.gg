/**
 * Tests for compileEventTeamSlots and compileSourceTeamSlots.
 *
 * Focus: DB orchestration — delete-before-insert order, chunking, pagination,
 * per-source playerKey/eventKey prefixes, rk9 is_legal filter, error
 * propagation, and compileSourceTeamSlots skip-already-compiled logic.
 *
 * The pure slot-row compilation math is covered by usage/__tests__/compile.test.ts.
 * The sequential mock client design mirrors usage.test.ts conventions.
 */

import { describe, it, expect, jest } from "@jest/globals";
import { compileEventTeamSlots, compileSourceTeamSlots } from "../team-slots";
import { type TypedClient } from "../../client";

// =============================================================================
// Sequential mock client (mirrors usage.test.ts pattern)
// =============================================================================

type CallMock = {
  data?: unknown;
  error?: unknown;
};

/**
 * Build a mock Supabase client that returns a fresh chain per .schema()/.from()
 * call, with each chain resolved to the corresponding entry in `calls`.
 *
 * Chains are thenable (awaitable directly) and expose .maybeSingle() so both
 * direct-await and .maybeSingle() call patterns are handled uniformly.
 */
function buildSequentialClient(
  calls: CallMock[],
  opts?: {
    onInsert?: (rows: unknown) => void;
    onDelete?: (chain: Record<string, ReturnType<typeof jest.fn>>) => void;
  }
) {
  let callIndex = 0;

  function makeChainForCall(callDef: CallMock) {
    const result = { data: callDef.data ?? null, error: callDef.error ?? null };
    const c: Record<string, unknown> = {};

    const returnSelf = () => c;
    c["schema"] = jest.fn().mockImplementation(returnSelf);
    c["from"] = jest.fn().mockImplementation(returnSelf);
    c["select"] = jest.fn().mockImplementation(returnSelf);
    c["insert"] = jest.fn().mockImplementation((rows: unknown) => {
      opts?.onInsert?.(rows);
      return c;
    });
    c["delete"] = jest.fn().mockImplementation(() => {
      opts?.onDelete?.(c as Record<string, ReturnType<typeof jest.fn>>);
      return c;
    });
    c["upsert"] = jest.fn().mockImplementation(returnSelf);
    c["eq"] = jest.fn().mockImplementation(returnSelf);
    c["gte"] = jest.fn().mockImplementation(returnSelf);
    c["gt"] = jest.fn().mockImplementation(returnSelf);
    c["in"] = jest.fn().mockImplementation(returnSelf);
    c["not"] = jest.fn().mockImplementation(returnSelf);
    c["range"] = jest.fn().mockImplementation(returnSelf);
    c["limit"] = jest.fn().mockImplementation(returnSelf);
    c["order"] = jest.fn().mockImplementation(returnSelf);
    c["maybeSingle"] = jest.fn().mockResolvedValue(result);
    c["single"] = jest.fn().mockResolvedValue(result);
    // Make chain directly thenable for direct await (delete/insert)
    c["then"] = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject);

    return c;
  }

  const topLevel: Record<string, unknown> = {};

  topLevel["schema"] = jest.fn().mockImplementation(() => {
    const callDef = calls[callIndex++] ?? {};
    return makeChainForCall(callDef);
  });

  topLevel["from"] = jest.fn().mockImplementation(() => {
    const callDef = calls[callIndex++] ?? {};
    return makeChainForCall(callDef);
  });

  return topLevel as unknown as TypedClient;
}

// =============================================================================
// Helper data
// =============================================================================

const rk9TeamPokemonRow = {
  standing_id: 10,
  position: 1,
  species: "flutter-mane",
  ability: "protosynthesis",
  held_item: "focus-sash",
  tera_type: "fairy",
  moves: ["moonblast", "shadow-ball"],
  stat_alignment: "timid",
  standings: {
    id: 10,
    division: "masters",
    placement: 3,
    players: { country: "US" },
  },
};

const limitlessTeamPokemonRow = {
  standing_id: 20,
  position: 1,
  species: "incineroar",
  ability: "intimidate",
  held_item: "safety-goggles",
  tera_type: "fire",
  moves: ["fake-out", "flare-blitz"],
  standings: {
    id: 20,
    placement: 1,
    record_wins: 7,
    record_losses: 1,
    record_ties: 0,
    players: { country: "JP" },
  },
};

const trainersTeamSheetRow = {
  registration_id: 42,
  position: 1,
  species: "miraidon",
  ability: "hadron-engine",
  held_item: "booster-energy",
  tera_type: "electric",
  move1: "electro-drift",
  move2: "draco-meteor",
  move3: "volt-switch",
  move4: "protect",
  nature: "timid",
};

// =============================================================================
// compileEventTeamSlots — rk9 error paths
// =============================================================================

describe("compileEventTeamSlots — rk9 error paths", () => {
  it("throws when rk9.events lookup fails", async () => {
    const client = buildSequentialClient([
      { error: { message: "connection refused" } }, // resolveEventMeta
    ]);

    await expect(
      compileEventTeamSlots(client, "rk9", "EVENT001")
    ).rejects.toThrow("failed to fetch event EVENT001");
  });

  it("throws when rk9 event is not found", async () => {
    const client = buildSequentialClient([{ data: null }]);

    await expect(
      compileEventTeamSlots(client, "rk9", "MISSING")
    ).rejects.toThrow("not found in rk9.events");
  });

  it("throws when rk9 event has no format_id", async () => {
    const client = buildSequentialClient([
      { data: { format_id: null, date_start: "2025-01-15", tier: "regional" } },
    ]);

    await expect(
      compileEventTeamSlots(client, "rk9", "EVT_NO_FORMAT")
    ).rejects.toThrow("has no format_id");
  });
});

// =============================================================================
// compileEventTeamSlots — limitless error paths
// =============================================================================

describe("compileEventTeamSlots — limitless error paths", () => {
  it("throws when limitless.tournaments lookup fails", async () => {
    const client = buildSequentialClient([{ error: { message: "timeout" } }]);

    await expect(
      compileEventTeamSlots(client, "limitless", "abc123")
    ).rejects.toThrow("failed to fetch tournament abc123");
  });

  it("throws when limitless tournament is not found", async () => {
    const client = buildSequentialClient([{ data: null }]);

    await expect(
      compileEventTeamSlots(client, "limitless", "MISSING")
    ).rejects.toThrow("not found in limitless.tournaments");
  });

  it("throws when limitless tournament has no format_id", async () => {
    const client = buildSequentialClient([
      { data: { format_id: null, date: "2025-03-01", is_online: true } },
    ]);

    await expect(
      compileEventTeamSlots(client, "limitless", "t999")
    ).rejects.toThrow("has no format_id");
  });
});

// =============================================================================
// compileEventTeamSlots — trainers.gg error paths
// =============================================================================

describe("compileEventTeamSlots — trainers.gg error paths", () => {
  it("throws when tournament_team_sheets lookup fails", async () => {
    const client = buildSequentialClient([
      { error: { message: "permission denied" } },
    ]);

    await expect(
      compileEventTeamSlots(client, "trainers.gg", "42")
    ).rejects.toThrow("failed to fetch team sheets");
  });

  it("throws when no team sheets exist for the tournament", async () => {
    const client = buildSequentialClient([{ data: null }]);

    await expect(
      compileEventTeamSlots(client, "trainers.gg", "99")
    ).rejects.toThrow("no team sheets found for tournament 99");
  });
});

// =============================================================================
// compileEventTeamSlots — delete error propagation
// =============================================================================

describe("compileEventTeamSlots — delete error", () => {
  it("throws when the DELETE from team_slots fails", async () => {
    // Call sequence for rk9:
    // 1. resolveEventMeta → rk9.events → maybeSingle → OK
    // 2. readRk9SlotRows page 1 → rk9.team_pokemon → OK (empty, so loop exits)
    // 3. DELETE team_slots → error
    const client = buildSequentialClient([
      {
        data: {
          format_id: "gen9vgc2025regg",
          date_start: "2025-03-01",
          tier: "regional",
        },
      },
      { data: [] }, // team_pokemon page 1 (empty)
      { error: { message: "delete failed" } }, // DELETE team_slots
    ]);

    await expect(
      compileEventTeamSlots(client, "rk9", "EVT001")
    ).rejects.toThrow("failed to delete existing rows");
  });
});

// =============================================================================
// compileEventTeamSlots — insert chunk error propagation
// =============================================================================

describe("compileEventTeamSlots — insert error", () => {
  it("throws when an INSERT chunk fails", async () => {
    // Call sequence for limitless with 1 team_pokemon row:
    // 1. resolveEventMeta → limitless.tournaments → maybeSingle → OK
    // 2. readLimitlessSlotRows page 1 → OK (1 row, then loop exits)
    // 3. DELETE team_slots → OK
    // 4. INSERT chunk 1 → error
    const client = buildSequentialClient([
      {
        data: {
          format_id: "gen9vgc2025regg",
          date: "2025-03-01",
          is_online: true,
        },
      },
      { data: [limitlessTeamPokemonRow] }, // page 1 (< 1000 rows → loop exits)
      { data: null, error: null }, // DELETE OK
      { error: { message: "insert failed" } }, // INSERT chunk
    ]);

    await expect(
      compileEventTeamSlots(client, "limitless", "t1")
    ).rejects.toThrow("failed to insert rows");
  });
});

// =============================================================================
// compileEventTeamSlots — delete-before-insert ordering
// =============================================================================

describe("compileEventTeamSlots — delete-before-insert order", () => {
  it("calls DELETE before INSERT", async () => {
    const callOrder: string[] = [];
    let onInsertCalled = false;

    const client = buildSequentialClient(
      [
        {
          data: {
            format_id: "gen9vgc2025regg",
            date_start: "2025-03-01",
            tier: "regional",
          },
        },
        { data: [rk9TeamPokemonRow] }, // page 1 with 1 row
        { data: null, error: null }, // DELETE OK
        { data: null, error: null }, // INSERT OK
      ],
      {
        onDelete: () => {
          callOrder.push("delete");
        },
        onInsert: () => {
          onInsertCalled = true;
          callOrder.push("insert");
        },
      }
    );

    await compileEventTeamSlots(client, "rk9", "EVT001");

    expect(callOrder[0]).toBe("delete");
    expect(callOrder[1]).toBe("insert");
    expect(onInsertCalled).toBe(true);
  });
});

// =============================================================================
// compileEventTeamSlots — chunking (>500 rows → multiple INSERT calls)
// =============================================================================

describe("compileEventTeamSlots — chunking", () => {
  it("issues multiple INSERT calls when rows exceed 500", async () => {
    // Build 501 rows so the first chunk is 500 and second chunk is 1
    const makeRow = (i: number) => ({
      standing_id: i,
      position: 1,
      species: `species-${i}`,
      ability: null,
      held_item: null,
      tera_type: null,
      moves: [],
      stat_alignment: null,
      standings: {
        id: i,
        division: "masters",
        placement: i,
        players: { country: "US" },
      },
    });

    const bigPage = Array.from({ length: 501 }, (_, i) => makeRow(i + 1));

    const insertCalls: unknown[][] = [];

    const client = buildSequentialClient(
      [
        {
          data: {
            format_id: "gen9vgc2025regg",
            date_start: "2025-03-01",
            tier: "regional",
          },
        },
        { data: bigPage }, // page 1 — 501 rows (< 1000 so loop exits)
        { data: null, error: null }, // DELETE OK
        { data: null, error: null }, // INSERT chunk 1 (500 rows)
        { data: null, error: null }, // INSERT chunk 2 (1 row)
      ],
      {
        onInsert: (rows) => {
          insertCalls.push(rows as unknown[]);
        },
      }
    );

    const result = await compileEventTeamSlots(client, "rk9", "BIGEV");
    expect(insertCalls).toHaveLength(2);
    expect((insertCalls[0] as unknown[]).length).toBe(500);
    expect((insertCalls[1] as unknown[]).length).toBe(1);
    expect(result.rowCount).toBe(501);
  });
});

// =============================================================================
// compileEventTeamSlots — pagination (first page exactly 1000 rows → second page fetched)
// =============================================================================

describe("compileEventTeamSlots — pagination", () => {
  it("fetches a second page when first page is exactly 1000 rows", async () => {
    const makeRow = (i: number) => ({
      standing_id: i,
      position: (i % 6) + 1,
      species: `species-${i}`,
      ability: null,
      held_item: null,
      tera_type: null,
      moves: [],
      stat_alignment: null,
      standings: {
        id: i,
        division: "masters",
        placement: i,
        players: { country: "US" },
      },
    });

    const fullPage = Array.from({ length: 1000 }, (_, i) => makeRow(i + 1));
    const secondPage = [makeRow(1001)];

    const client = buildSequentialClient([
      {
        data: {
          format_id: "gen9vgc2025regg",
          date_start: "2025-03-01",
          tier: "regional",
        },
      },
      { data: fullPage }, // page 1 — exactly 1000 rows → loop continues
      { data: secondPage }, // page 2 — 1 row → loop exits
      { data: null, error: null }, // DELETE OK
      { data: null, error: null }, // INSERT chunk 1 (500 rows)
      { data: null, error: null }, // INSERT chunk 2 (500 rows)
      { data: null, error: null }, // INSERT chunk 3 (1 row)
    ]);

    const result = await compileEventTeamSlots(client, "rk9", "PAGEV");
    expect(result.rowCount).toBe(1001);
  });

  it("throws when a pagination page errors", async () => {
    // First page succeeds, second page errors
    const fullPage = Array.from({ length: 1000 }, (_, i) => ({
      standing_id: i,
      position: 1,
      species: "species",
      ability: null,
      held_item: null,
      tera_type: null,
      moves: [],
      stat_alignment: null,
      standings: {
        id: i,
        division: "masters",
        placement: i,
        players: { country: "US" },
      },
    }));

    const client = buildSequentialClient([
      {
        data: {
          format_id: "gen9vgc2025regg",
          date_start: "2025-03-01",
          tier: "regional",
        },
      },
      { data: fullPage }, // page 1 OK
      { error: { message: "page 2 failed" } }, // page 2 error
    ]);

    await expect(
      compileEventTeamSlots(client, "rk9", "PAGEERR")
    ).rejects.toThrow("failed to read team_pokemon page at offset 1000");
  });
});

// =============================================================================
// compileEventTeamSlots — per-source playerKey and eventKey prefixes
// =============================================================================

describe("compileEventTeamSlots — playerKey prefixes", () => {
  it("uses 'rk9:<standing_id>' as playerKey for rk9 source", async () => {
    const capturedInserts: unknown[] = [];

    const client = buildSequentialClient(
      [
        {
          data: {
            format_id: "gen9vgc2025regg",
            date_start: "2025-03-01",
            tier: "regional",
          },
        },
        { data: [rk9TeamPokemonRow] },
        { data: null, error: null }, // DELETE OK
        { data: null, error: null }, // INSERT OK
      ],
      { onInsert: (rows) => capturedInserts.push(...(rows as unknown[])) }
    );

    await compileEventTeamSlots(client, "rk9", "EVT001");

    const inserts = capturedInserts as Array<{
      player_key: string;
      event_key: string;
      source: string;
    }>;
    expect(inserts[0]?.player_key).toBe("rk9:10");
    expect(inserts[0]?.event_key).toBe("rk9:EVT001");
    expect(inserts[0]?.source).toBe("rk9");
  });

  it("uses 'limitless:<standing_id>' as playerKey for limitless source", async () => {
    const capturedInserts: unknown[] = [];

    const client = buildSequentialClient(
      [
        {
          data: {
            format_id: "gen9vgc2025regg",
            date: "2025-03-01",
            is_online: true,
          },
        },
        { data: [limitlessTeamPokemonRow] },
        { data: null, error: null }, // DELETE OK
        { data: null, error: null }, // INSERT OK
      ],
      { onInsert: (rows) => capturedInserts.push(...(rows as unknown[])) }
    );

    await compileEventTeamSlots(client, "limitless", "t42");

    const inserts = capturedInserts as Array<{
      player_key: string;
      event_key: string;
      source: string;
    }>;
    expect(inserts[0]?.player_key).toBe("limitless:20");
    expect(inserts[0]?.event_key).toBe("limitless:t42");
    expect(inserts[0]?.source).toBe("limitless");
  });

  it("uses 'trainers.gg:<registration_id>' as playerKey for trainers.gg source", async () => {
    const capturedInserts: unknown[] = [];

    const metaSheetRow = {
      format: "gen9vgc2025regg",
      tournaments: { start_date: "2025-03-01T00:00:00Z" },
    };

    const client = buildSequentialClient(
      [
        { data: metaSheetRow }, // resolveEventMeta (maybeSingle)
        { data: [trainersTeamSheetRow] }, // readTrainersSlotRows page 1
        { data: null, error: null }, // DELETE OK
        { data: null, error: null }, // INSERT OK
      ],
      { onInsert: (rows) => capturedInserts.push(...(rows as unknown[])) }
    );

    await compileEventTeamSlots(client, "trainers.gg", "42");

    const inserts = capturedInserts as Array<{
      player_key: string;
      event_key: string;
      source: string;
    }>;
    expect(inserts[0]?.player_key).toBe("trainers.gg:42");
    expect(inserts[0]?.event_key).toBe("trainers.gg:42");
    expect(inserts[0]?.source).toBe("trainers.gg");
  });
});

// =============================================================================
// compileEventTeamSlots — rk9 is_legal filter
// =============================================================================

describe("compileEventTeamSlots — rk9 is_legal filter", () => {
  it("includes .eq('is_legal', true) in the rk9 team_pokemon query chain", async () => {
    const client = buildSequentialClient([
      {
        data: {
          format_id: "gen9vgc2025regg",
          date_start: "2025-03-01",
          tier: "regional",
        },
      },
      { data: [] }, // team_pokemon page (empty — triggers loop exit immediately)
      { data: null, error: null }, // DELETE OK
      // No INSERT (0 rows)
    ]);

    await compileEventTeamSlots(client, "rk9", "EVT_LEGAL");

    // The second .schema() call dispensed the team_pokemon chain.
    const schemaMock = (client as unknown as Record<string, unknown>)[
      "schema"
    ] as ReturnType<typeof jest.fn>;

    const teamPokemonChain = schemaMock.mock.results[1]?.value as Record<
      string,
      ReturnType<typeof jest.fn>
    >;

    expect(teamPokemonChain).toBeDefined();
    expect(teamPokemonChain["eq"]).toBeDefined();

    const eqCalls: Array<[unknown, unknown]> = teamPokemonChain["eq"].mock
      .calls as Array<[unknown, unknown]>;
    const hasIsLegalFilter = eqCalls.some(
      ([col, val]) => col === "is_legal" && val === true
    );
    expect(hasIsLegalFilter).toBe(true);
  });
});

// =============================================================================
// compileEventTeamSlots — rowCount
// =============================================================================

describe("compileEventTeamSlots — rowCount", () => {
  it("returns rowCount=0 when the event has no team_pokemon rows", async () => {
    const client = buildSequentialClient([
      {
        data: {
          format_id: "gen9vgc2025regg",
          date_start: "2025-03-01",
          tier: "regional",
        },
      },
      { data: [] }, // team_pokemon (empty)
      { data: null, error: null }, // DELETE OK
      // No INSERT
    ]);

    const result = await compileEventTeamSlots(client, "rk9", "EMPTY_EVT");
    expect(result.rowCount).toBe(0);
  });

  it("returns rowCount equal to compiled rows", async () => {
    const client = buildSequentialClient([
      {
        data: {
          format_id: "gen9vgc2025regg",
          date: "2025-03-01",
          is_online: true,
        },
      },
      { data: [limitlessTeamPokemonRow] },
      { data: null, error: null }, // DELETE OK
      { data: null, error: null }, // INSERT OK
    ]);

    const result = await compileEventTeamSlots(client, "limitless", "t42");
    expect(result.rowCount).toBe(1);
  });
});

// =============================================================================
// compileSourceTeamSlots — rk9
// =============================================================================

describe("compileSourceTeamSlots — rk9", () => {
  it("returns zeros when there are no candidate events", async () => {
    const client = buildSequentialClient([
      { data: [], error: null }, // rk9 events SELECT
    ]);

    const result = await compileSourceTeamSlots(client, "rk9");
    expect(result).toEqual({ eventsCompiled: 0, formats: [] });
  });

  it("throws when the rk9 events query fails", async () => {
    const client = buildSequentialClient([
      { data: null, error: { message: "timeout" } },
    ]);

    await expect(compileSourceTeamSlots(client, "rk9")).rejects.toThrow(
      "compileSourceTeamSlots[rk9]: failed to fetch events"
    );
  });

  it("throws when the team_slots existing-keys pagination fails", async () => {
    const client = buildSequentialClient([
      {
        data: [{ event_id: 1, format_id: "gen9vgc2025regg" }],
        error: null,
      }, // rk9 events
      { data: null, error: { message: "range failed" } }, // team_slots range(0,999)
    ]);

    await expect(compileSourceTeamSlots(client, "rk9")).rejects.toThrow(
      "compileSourceTeamSlots[rk9]: failed to read existing team_slots keys"
    );
  });

  it("skips already-compiled events and returns only newly touched formats", async () => {
    // Two candidates: event 1 already compiled, event 2 is new.
    // Existing key set contains "rk9:1" (returned by pagination).
    // For event 2 we drive a full compileEventTeamSlots call sequence.
    const client = buildSequentialClient([
      // Step 1: list candidates
      {
        data: [
          { event_id: 1, format_id: "gen9vgc2025regg" },
          { event_id: 2, format_id: "gen9vgc2025regg" },
        ],
        error: null,
      },
      // Step 2: paginate existing keys — single page (< 1000 rows)
      { data: [{ event_key: "rk9:1" }], error: null },
      // Step 3: compileEventTeamSlots for event "2"
      //   resolveEventMeta → rk9.events
      {
        data: {
          format_id: "gen9vgc2025regg",
          date_start: "2025-03-01",
          tier: "regional",
        },
        error: null,
      },
      //   readRk9SlotRows page 1 (empty)
      { data: [], error: null },
      //   DELETE team_slots → OK
      { data: null, error: null },
    ]);

    const result = await compileSourceTeamSlots(client, "rk9");
    expect(result.eventsCompiled).toBe(1);
    expect(result.formats).toEqual(["gen9vgc2025regg"]);
  });

  it("continues past a failing event and still compiles the rest", async () => {
    const client = buildSequentialClient([
      // Step 1: list candidates
      {
        data: [
          { event_id: 1, format_id: "gen9vgc2025regg" },
          { event_id: 2, format_id: "gen9vgc2025regg" },
        ],
        error: null,
      },
      // Step 2: pagination — no existing keys
      { data: [], error: null },
      // Step 3a: compileEventTeamSlots for event "1" → resolveEventMeta fails
      { data: null, error: { message: "event not found" } },
      // Step 3b: compileEventTeamSlots for event "2" → succeeds
      {
        data: {
          format_id: "gen9vgc2025regg",
          date_start: "2025-03-01",
          tier: "regional",
        },
        error: null,
      },
      { data: [], error: null }, // team_pokemon (empty)
      { data: null, error: null }, // DELETE OK
    ]);

    const result = await compileSourceTeamSlots(client, "rk9");
    // event 1 failed (skipped), event 2 succeeded
    expect(result.eventsCompiled).toBe(1);
    expect(result.formats).toEqual(["gen9vgc2025regg"]);
  });

  it("returns distinct formats across multiple events", async () => {
    const client = buildSequentialClient([
      // Step 1: list candidates
      {
        data: [
          { event_id: 10, format_id: "gen9vgc2025regg" },
          { event_id: 11, format_id: "gen9vgc2025regs" },
        ],
        error: null,
      },
      // Step 2: pagination — no existing keys
      { data: [], error: null },
      // Step 3a: event "10" — resolve meta
      {
        data: {
          format_id: "gen9vgc2025regg",
          date_start: "2025-03-01",
          tier: "regional",
        },
        error: null,
      },
      { data: [], error: null }, // team_pokemon
      { data: null, error: null }, // DELETE
      // Step 3b: event "11" — resolve meta
      {
        data: {
          format_id: "gen9vgc2025regs",
          date_start: "2025-04-01",
          tier: "regional",
        },
        error: null,
      },
      { data: [], error: null }, // team_pokemon
      { data: null, error: null }, // DELETE
    ]);

    const result = await compileSourceTeamSlots(client, "rk9");
    expect(result.eventsCompiled).toBe(2);
    expect(result.formats.sort()).toEqual([
      "gen9vgc2025regg",
      "gen9vgc2025regs",
    ]);
  });

  it("paginates existing keys correctly when first page is full (1000 rows)", async () => {
    // First page returns exactly 1000 rows → second page fetched (empty → loop exits).
    // The single candidate "rk9:1" is not in the existing-keys set → compile triggered.
    const fullPage = Array.from({ length: 1000 }, (_, i) => ({
      event_key: `rk9:existing${i}`,
    }));

    const client = buildSequentialClient([
      { data: [{ event_id: 1, format_id: "gen9vgc2025regg" }], error: null },
      // existing-keys page 1 — full (none match event 1)
      { data: fullPage, error: null },
      // existing-keys page 2 — empty → loop exits
      { data: [], error: null },
      // compileEventTeamSlots for event "1" — resolveEventMeta errors (no more mocks)
      // The error is caught by the best-effort wrapper → eventsCompiled stays 0
    ]);

    const result = await compileSourceTeamSlots(client, "rk9");
    // event 1 errored (no more mocks after empty page) → not counted
    expect(result.eventsCompiled).toBe(0);
    expect(result.formats).toEqual([]);
  });
});

// =============================================================================
// compileSourceTeamSlots — limitless
// =============================================================================

describe("compileSourceTeamSlots — limitless", () => {
  it("returns zeros when there are no candidate tournaments", async () => {
    const client = buildSequentialClient([
      { data: [], error: null }, // limitless tournaments SELECT
    ]);

    const result = await compileSourceTeamSlots(client, "limitless");
    expect(result).toEqual({ eventsCompiled: 0, formats: [] });
  });

  it("throws when the limitless tournaments query fails", async () => {
    const client = buildSequentialClient([
      { data: null, error: { message: "db error" } },
    ]);

    await expect(compileSourceTeamSlots(client, "limitless")).rejects.toThrow(
      "compileSourceTeamSlots[limitless]: failed to fetch tournaments"
    );
  });

  it("skips already-compiled tournaments and returns touched formats", async () => {
    // t100 already compiled, t101 is new.
    const client = buildSequentialClient([
      // Step 1: list candidates
      {
        data: [
          { tournament_id: "t100", format_id: "gen9vgc2025regg" },
          { tournament_id: "t101", format_id: "gen9vgc2025regg" },
        ],
        error: null,
      },
      // Step 2: pagination — t100 already exists
      { data: [{ event_key: "limitless:t100" }], error: null },
      // Step 3: compileEventTeamSlots for t101
      {
        data: {
          format_id: "gen9vgc2025regg",
          date: "2025-03-15",
          is_online: true,
        },
        error: null,
      },
      { data: [], error: null }, // team_pokemon (empty)
      { data: null, error: null }, // DELETE OK
    ]);

    const result = await compileSourceTeamSlots(client, "limitless");
    expect(result.eventsCompiled).toBe(1);
    expect(result.formats).toEqual(["gen9vgc2025regg"]);
  });
});
