/**
 * Tests for computeEventUsage.
 *
 * Focus: error paths (event-not-found, DB errors on delete/insert/dirty) and
 * the rowCount return value. The aggregation math is fully covered by
 * usage/__tests__/aggregate.test.ts; we do not re-test it here.
 *
 * The mock client uses a sequential-call design: each call to .schema() or
 * .from() on the top-level client dispenses a fresh chain object whose
 * terminal methods (.maybeSingle, or direct thenable) resolve to the
 * corresponding entry in the `calls` array. This avoids complex shared-state
 * mocking while still faithfully exercising the full call chains in
 * computeEventUsage.
 */

import { describe, it, expect, jest } from "@jest/globals";
import { computeEventUsage, computeUsageRollups } from "../usage";
import type { TypedClient } from "../../client";

// =============================================================================
// Sequential mock client
// =============================================================================

type CallMock = {
  data?: unknown;
  error?: unknown;
};

/**
 * Build a mock Supabase client that returns a fresh chain per .schema()/.from()
 * call, with each chain resolved to the corresponding entry in `calls`.
 *
 * Chains are thenable (awaitable directly) and also expose .maybeSingle() so
 * both direct-await and .maybeSingle() call patterns are handled by the same
 * mock object — the correct terminal is invoked by the production code.
 */
function buildSequentialClient(calls: CallMock[]) {
  let callIndex = 0;

  function makeChainForCall(callDef: CallMock) {
    const result = { data: callDef.data ?? null, error: callDef.error ?? null };
    const c: Record<string, unknown> = {};

    // All builder methods return the same chain object
    const returnSelf = () => c;
    c["schema"] = jest.fn().mockImplementation(returnSelf);
    c["from"] = jest.fn().mockImplementation(returnSelf);
    c["select"] = jest.fn().mockImplementation(returnSelf);
    c["insert"] = jest.fn().mockImplementation(returnSelf);
    c["delete"] = jest.fn().mockImplementation(returnSelf);
    c["upsert"] = jest.fn().mockImplementation(returnSelf);
    c["eq"] = jest.fn().mockImplementation(returnSelf);
    c["gte"] = jest.fn().mockImplementation(returnSelf);
    c["limit"] = jest.fn().mockImplementation(returnSelf);

    // Terminals
    c["maybeSingle"] = jest.fn().mockResolvedValue(result);
    // .single() used by format_meta_stats INSERT + .select("id").single()
    c["single"] = jest.fn().mockResolvedValue(result);

    // Terminal: direct await (delete/insert/upsert are awaited without .maybeSingle)
    c["then"] = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject);

    return c;
  }

  // The client dispatches a new chain for each .schema() or .from() call.
  // Because production code calls .schema(...).from(...) as a chain,
  // only the initial .schema() or .from() call needs to dispense a new entry.
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
// RK9 — error paths
// =============================================================================

describe("computeEventUsage — rk9 error paths", () => {
  it("throws when rk9.events lookup fails", async () => {
    const client = buildSequentialClient([
      { error: { message: "connection refused" } }, // resolveEventMeta
    ]);

    await expect(
      computeEventUsage(client, "rk9", "EVENT001")
    ).rejects.toThrow("failed to fetch event EVENT001");
  });

  it("throws when rk9 event is not found", async () => {
    const client = buildSequentialClient([
      { data: null }, // resolveEventMeta → maybySingle returns null
    ]);

    await expect(
      computeEventUsage(client, "rk9", "MISSING")
    ).rejects.toThrow("not found in rk9.events");
  });

  it("throws when rk9 event has no format_id", async () => {
    const client = buildSequentialClient([
      { data: { format_id: null, date_start: "2025-01-15" } },
    ]);

    await expect(
      computeEventUsage(client, "rk9", "EVT_NO_FORMAT")
    ).rejects.toThrow("has no format_id");
  });
});

// =============================================================================
// Limitless — error paths
// =============================================================================

describe("computeEventUsage — limitless error paths", () => {
  it("throws when limitless.tournaments lookup fails", async () => {
    const client = buildSequentialClient([
      { error: { message: "timeout" } },
    ]);

    await expect(
      computeEventUsage(client, "limitless", "abc123")
    ).rejects.toThrow("failed to fetch tournament abc123");
  });

  it("throws when limitless tournament is not found", async () => {
    const client = buildSequentialClient([{ data: null }]);

    await expect(
      computeEventUsage(client, "limitless", "MISSING")
    ).rejects.toThrow("not found in limitless.tournaments");
  });
});

// =============================================================================
// first_party — error paths
// =============================================================================

describe("computeEventUsage — first_party error paths", () => {
  it("throws when tournament_team_sheets lookup fails", async () => {
    const client = buildSequentialClient([
      { error: { message: "permission denied" } },
    ]);

    await expect(
      computeEventUsage(client, "first_party", "42")
    ).rejects.toThrow("failed to fetch team sheets");
  });

  it("throws when no team sheets exist for the tournament", async () => {
    const client = buildSequentialClient([{ data: null }]);

    await expect(
      computeEventUsage(client, "first_party", "99")
    ).rejects.toThrow("no team sheets found for tournament 99");
  });
});

// =============================================================================
// Delete error path
// =============================================================================

describe("computeEventUsage — delete error", () => {
  it("throws when the DELETE from event_usage fails", async () => {
    // Call sequence for rk9 with 0 team_pokemon rows:
    // 1. resolveEventMeta → schema("rk9").from("events") → maybySingle → OK
    // 2. readRawTeamRows  → schema("rk9").from("team_pokemon") → direct resolve → OK (empty)
    // 3. DELETE from("event_usage") → direct resolve → error
    const client = buildSequentialClient([
      { data: { format_id: "gen9vgc2025regg", date_start: "2025-03-01" } }, // resolveEventMeta
      { data: [] }, // readRawTeamRows (empty)
      { error: { message: "delete failed" } }, // DELETE event_usage
    ]);

    await expect(
      computeEventUsage(client, "rk9", "EVT001")
    ).rejects.toThrow("failed to delete existing rows");
  });
});

// =============================================================================
// Insert error path
// =============================================================================

describe("computeEventUsage — insert error", () => {
  it("throws when the INSERT into event_usage fails (non-empty result set)", async () => {
    // Call sequence for limitless with 1 team:
    // 1. resolveEventMeta  → schema("limitless").from("tournaments") → maybySingle → OK
    // 2. readRawTeamRows   → schema("limitless").from("team_pokemon") → direct resolve → 1 row
    // 3. DELETE event_usage → direct resolve → OK
    // 4. INSERT event_usage → direct resolve → error
    const teamPokemonRow = {
      standing_id: 1,
      species: "flutter-mane",
      ability: "protosynthesis",
      held_item: "focus-sash",
      tera_type: "fairy",
      moves: ["moonblast"],
      standings: { id: 1, tournament_id: "t1" },
    };

    const client = buildSequentialClient([
      { data: { format_id: "gen9vgc2025regg", date: "2025-03-01" } }, // resolveEventMeta
      { data: [teamPokemonRow] }, // readRawTeamRows
      { data: null, error: null }, // DELETE OK
      { error: { message: "insert failed" } }, // INSERT
    ]);

    await expect(
      computeEventUsage(client, "limitless", "t1")
    ).rejects.toThrow("failed to insert rows");
  });
});

// =============================================================================
// usage_dirty upsert error path
// =============================================================================

describe("computeEventUsage — usage_dirty error", () => {
  it("throws when reading usage_dirty fails", async () => {
    // rk9 with 0 teams so delete/insert succeed trivially, but usage_dirty read errors
    // Call sequence:
    // 1. resolveEventMeta → rk9 events
    // 2. readRawTeamRows  → rk9 team_pokemon (empty)
    // 3. DELETE event_usage → OK
    // (no INSERT because rows = [])
    // 4. usage_dirty SELECT → error
    const client = buildSequentialClient([
      { data: { format_id: "gen9vgc2025regg", date_start: "2025-03-01" } },
      { data: [] },
      { data: null, error: null }, // DELETE OK
      { error: { message: "dirty read failed" } }, // usage_dirty SELECT
    ]);

    await expect(
      computeEventUsage(client, "rk9", "EVT002")
    ).rejects.toThrow("failed to read usage_dirty");
  });
});

// =============================================================================
// rowCount
// =============================================================================

describe("computeEventUsage — rowCount", () => {
  it("returns rowCount=0 when the event has no team pokemon", async () => {
    const client = buildSequentialClient([
      { data: { format_id: "gen9vgc2025regg", date_start: "2025-03-01" } }, // resolveEventMeta
      { data: [] }, // team_pokemon (empty)
      { data: null, error: null }, // DELETE OK
      // No INSERT (0 rows)
      { data: { dirty_since: "2025-02-01" }, error: null }, // usage_dirty SELECT
      { data: null, error: null }, // usage_dirty UPSERT
    ]);

    const result = await computeEventUsage(client, "rk9", "EMPTY_EVT");
    expect(result.rowCount).toBe(0);
  });

  it("returns rowCount equal to the number of distinct (division, species) rows", async () => {
    // 2 teams with different species → 2 aggregated rows
    const teamPokemon = [
      {
        standing_id: 1,
        species: "flutter-mane",
        ability: "protosynthesis",
        held_item: "focus-sash",
        tera_type: "fairy",
        moves: ["moonblast"],
        standings: { id: 1, tournament_id: "t42" },
      },
      {
        standing_id: 2,
        species: "incineroar",
        ability: "intimidate",
        held_item: "safety-goggles",
        tera_type: "fire",
        moves: ["fake-out"],
        standings: { id: 2, tournament_id: "t42" },
      },
    ];

    const client = buildSequentialClient([
      { data: { format_id: "gen9vgc2025regg", date: "2025-03-01" } }, // resolveEventMeta
      { data: teamPokemon }, // readRawTeamRows
      { data: null, error: null }, // DELETE OK
      { data: null, error: null }, // INSERT OK
      { data: null, error: null }, // usage_dirty SELECT (no existing row)
      { data: null, error: null }, // usage_dirty UPSERT
    ]);

    const result = await computeEventUsage(client, "limitless", "t42");
    expect(result.rowCount).toBe(2);
  });
});

// =============================================================================
// computeUsageRollups tests
//
// The pure math (bucketStart, rollupBucket, etc.) is exhaustively tested in
// usage/__tests__/rollup.test.ts. Here we focus on the DB orchestration:
// - early-exit when no dirty rows
// - error propagation from supabase calls
// - return value shape
//
// The sequential mock client is reused from the computeEventUsage section.
// =============================================================================

describe("computeUsageRollups — no dirty rows", () => {
  it("returns zeros immediately when usage_dirty is empty", async () => {
    const client = buildSequentialClient([
      { data: [], error: null }, // usage_dirty SELECT → empty
    ]);

    const result = await computeUsageRollups(client);
    expect(result).toEqual({ formatsProcessed: 0, bucketsWritten: 0 });
  });

  it("returns zeros when usage_dirty data is null", async () => {
    const client = buildSequentialClient([
      { data: null, error: null }, // usage_dirty SELECT → null
    ]);

    const result = await computeUsageRollups(client);
    expect(result).toEqual({ formatsProcessed: 0, bucketsWritten: 0 });
  });
});

describe("computeUsageRollups — usage_dirty read error", () => {
  it("throws when reading usage_dirty fails", async () => {
    const client = buildSequentialClient([
      { data: null, error: { message: "connection refused" } },
    ]);

    await expect(computeUsageRollups(client)).rejects.toThrow(
      "failed to read usage_dirty"
    );
  });
});

describe("computeUsageRollups — event_usage read error", () => {
  it("throws when reading event_usage fails for a dirty format", async () => {
    // Dirty row triggers one (format, source, periodType) computation.
    // The event_usage query for that combination fails.
    // Call sequence:
    // 1. usage_dirty SELECT → one dirty row
    // 2. event_usage SELECT for (format, rk9, day) → error
    const client = buildSequentialClient([
      {
        data: [
          {
            format: "gen9vgc2025regg",
            source: "rk9",
            dirty_since: "2025-03-01",
            updated_at: "2025-03-02T00:00:00Z",
          },
        ],
        error: null,
      }, // usage_dirty SELECT
      { data: null, error: { message: "query failed" } }, // event_usage rk9/day
    ]);

    await expect(computeUsageRollups(client)).rejects.toThrow(
      "failed to read event_usage"
    );
  });
});

describe("computeUsageRollups — no event_usage rows (empty result)", () => {
  it("returns formatsProcessed=1 bucketsWritten=0 when event_usage is empty for all period types and sources", async () => {
    // One dirty row → sources=[rk9, all], periods=[day,week,month] = 6 queries
    // all return empty → no buckets written
    // Then 1 usage_dirty DELETE
    //
    // Call sequence: usage_dirty + 6 event_usage reads + 1 delete
    const client = buildSequentialClient([
      {
        data: [
          {
            format: "gen9vgc2025regg",
            source: "rk9",
            dirty_since: "2025-03-01",
            updated_at: "2025-03-02T00:00:00Z",
          },
        ],
        error: null,
      }, // usage_dirty SELECT
      // 6 event_usage reads (rk9: day, week, month; all: day, week, month) — all empty
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      // usage_dirty DELETE for rk9
      { data: null, error: null },
    ]);

    const result = await computeUsageRollups(client);
    expect(result.formatsProcessed).toBe(1);
    expect(result.bucketsWritten).toBe(0);
  });
});
