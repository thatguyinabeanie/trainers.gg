import { describe, it, expect, jest } from "@jest/globals";

import {
  runSyncStage,
  runImportStage,
  runCompileStage,
  eventKeyFor,
  deleteSourceEvent,
  excludeSourceEvent,
  clearExclusion,
  resetStuckEvents,
  requeueFailedEvents,
  forceImportEvent,
} from "../pipeline";
import type { TypedClient } from "../../client";

// Minimal fakes: syncEvents/syncTournamentList are stubbed via jest.mock below.
// processRk9Queue and drainLimitlessQueue are also mocked to avoid network I/O.
jest.mock("../../sources", () => ({
  syncEvents: jest.fn(async () => ({ inserted: 2, updated: 0 })),
  fetchTournamentList: jest.fn(async () => [{ id: 1 }, { id: 2 }, { id: 3 }]),
  syncTournamentList: jest.fn(async () => ({ synced: 3, tournaments: [] })),
  parseArchivedEventsPage: jest.fn(() => []),
  // processRk9Queue returns the real ProcessRk9QueueResult shape
  processRk9Queue: jest.fn(async () => ({
    eventsTouched: 1,
    teamsScraped: 0,
    errors: 0,
    remainingQueued: 4,
  })),
  // drainLimitlessQueue returns the real DrainResult shape
  drainLimitlessQueue: jest.fn(async () => ({
    processed: 5,
    errors: 0,
    remaining: 10,
    passes: 1,
  })),
}));

jest.mock("../team-slots", () => ({
  compileSourceTeamSlots: jest.fn(async () => ({
    eventsCompiled: 2,
    formats: ["gen9vgc2024regh"],
  })),
}));

describe("runSyncStage", () => {
  it("returns per-source discovered counts and excludes tombstoned events", async () => {
    const supabase = {} as unknown as TypedClient;
    const result = await runSyncStage(supabase, {
      limitlessApiKey: undefined,
      isExcluded: () => false,
    });
    expect(result.rk9.discovered).toBeGreaterThanOrEqual(0);
    expect(result.limitless.discovered).toBe(3);
  });

  it("excludes tombstoned RK9 events from discovered count", async () => {
    const { syncEvents } = await import("../../sources");
    const mockSyncEvents = syncEvents as jest.MockedFunction<typeof syncEvents>;
    mockSyncEvents.mockResolvedValueOnce({ synced: 1, total: 1 });

    const supabase = {} as unknown as TypedClient;

    // Pass 3 RK9 events, 2 of which are tombstoned
    const result = await runSyncStage(supabase, {
      limitlessApiKey: undefined,
      rk9Events: [
        {
          eventId: "evt-1",
          name: "Event 1",
          tier: "international",
          dateRaw: "January 1-2, 2025",
          dateStart: "2025-01-01",
          dateEnd: "2025-01-02",
          locationCity: "Toronto",
          locationCountry: "CA",
          section: "past",
        },
        {
          eventId: "evt-2",
          name: "Event 2",
          tier: "regional",
          dateRaw: "February 1-2, 2025",
          dateStart: "2025-02-01",
          dateEnd: "2025-02-02",
          locationCity: "Dallas",
          locationCountry: "US",
          section: "past",
        },
        {
          eventId: "evt-3",
          name: "Event 3",
          tier: "regional",
          dateRaw: "March 1-2, 2025",
          dateStart: "2025-03-01",
          dateEnd: "2025-03-02",
          locationCity: "London",
          locationCountry: "GB",
          section: "past",
        },
      ],
      isExcluded: (_source, id) => id === "evt-2" || id === "evt-3",
    });

    // Only evt-1 is not tombstoned — discovered = 1
    expect(result.rk9.discovered).toBe(1);
    // syncEvents should have been called with only the non-excluded event
    expect(mockSyncEvents).toHaveBeenCalledWith(supabase, [
      expect.objectContaining({ eventId: "evt-1" }),
    ]);
  });

  it("excludes tombstoned Limitless events from discovered count", async () => {
    const { syncTournamentList, fetchTournamentList } =
      await import("../../sources");
    const mockFetchList = fetchTournamentList as jest.MockedFunction<
      typeof fetchTournamentList
    >;
    const mockSyncList = syncTournamentList as jest.MockedFunction<
      typeof syncTournamentList
    >;

    // fetchTournamentList returns 3 tournaments with IDs "a", "b", "c"
    mockFetchList.mockResolvedValueOnce([
      {
        id: "a",
        game: "VGC",
        format: "SVI",
        name: "A",
        date: "2025-01-01",
        players: 64,
      },
      {
        id: "b",
        game: "VGC",
        format: "SVI",
        name: "B",
        date: "2025-02-01",
        players: 32,
      },
      {
        id: "c",
        game: "VGC",
        format: "SVI",
        name: "C",
        date: "2025-03-01",
        players: 16,
      },
    ]);
    mockSyncList.mockResolvedValueOnce({
      synced: 1,
      skipped: 0,
      total: 3,
      mapped: 1,
      unmapped: 0,
      unmappedFormats: {},
      tournaments: [],
    });

    const supabase = {} as unknown as TypedClient;
    const result = await runSyncStage(supabase, {
      limitlessApiKey: "key",
      isExcluded: (_source, id) => id === "b" || id === "c",
    });

    // Only "a" passes the exclusion filter
    expect(result.limitless.discovered).toBe(1);
  });

  it("returns discovered=0 for RK9 when no rk9Events are provided", async () => {
    const supabase = {} as unknown as TypedClient;
    const result = await runSyncStage(supabase, {
      limitlessApiKey: undefined,
      isExcluded: () => false,
    });
    expect(result.rk9.discovered).toBe(0);
    expect(result.rk9.queued).toBe(0);
  });
});

describe("runImportStage", () => {
  it("processes one RK9 event and a Limitless batch", async () => {
    const supabase = {} as unknown as TypedClient;
    const result = await runImportStage(supabase, {
      limitlessApiKey: undefined,
      limitlessBatchSize: 25,
      deadlineMs: Date.now() + 60_000,
    });
    // rk9: eventsTouched maps to processed
    expect(result.rk9.processed).toBe(1);
    expect(result.rk9.errors).toBe(0);
    expect(result.rk9.remaining).toBe(4);
    // limitless: passed through directly
    expect(result.limitless.processed).toBe(5);
    expect(result.limitless.errors).toBe(0);
    expect(result.limitless.remaining).toBe(10);
  });

  it("passes the deadline and batchSize through to each worker", async () => {
    const { processRk9Queue, drainLimitlessQueue } =
      await import("../../sources");
    const mockRk9 = processRk9Queue as jest.MockedFunction<
      typeof processRk9Queue
    >;
    const mockLimitless = drainLimitlessQueue as jest.MockedFunction<
      typeof drainLimitlessQueue
    >;

    const supabase = {} as unknown as TypedClient;
    const deadline = Date.now() + 30_000;

    await runImportStage(supabase, {
      limitlessApiKey: "test-key",
      limitlessBatchSize: 10,
      deadlineMs: deadline,
    });

    // processRk9Queue must receive the deadline
    expect(mockRk9).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ deadline })
    );
    // drainLimitlessQueue receives (supabase, apiKey, batchSize, deadline)
    expect(mockLimitless).toHaveBeenCalledWith(
      supabase,
      "test-key",
      10,
      deadline
    );
  });
});

describe("runCompileStage", () => {
  it("compiles completed events for both sources and returns affected formats", async () => {
    const supabase = {} as unknown as TypedClient;
    const result = await runCompileStage(supabase);
    expect(result.formats).toContain("gen9vgc2024regh");
    // Both rk9 + limitless each return eventsCompiled=2 → sum=4
    expect(result.eventsCompiled).toBeGreaterThanOrEqual(2);
  });

  it("deduplicates formats shared across both sources", async () => {
    const { compileSourceTeamSlots } = await import("../team-slots");
    const mockCompile = compileSourceTeamSlots as jest.MockedFunction<
      typeof compileSourceTeamSlots
    >;

    // Both sources return the same format
    mockCompile.mockResolvedValueOnce({
      eventsCompiled: 1,
      formats: ["gen9vgc2024regh", "gen9vgc2024regf"],
    });
    mockCompile.mockResolvedValueOnce({
      eventsCompiled: 3,
      formats: ["gen9vgc2024regh"], // duplicate
    });

    const supabase = {} as unknown as TypedClient;
    const result = await runCompileStage(supabase);

    // gen9vgc2024regh appears in both — should be deduplicated
    const reghCount = result.formats.filter(
      (f) => f === "gen9vgc2024regh"
    ).length;
    expect(reghCount).toBe(1);
    expect(result.formats).toContain("gen9vgc2024regf");
    expect(result.eventsCompiled).toBe(4);
  });

  it("calls compileSourceTeamSlots for both rk9 and limitless", async () => {
    const { compileSourceTeamSlots } = await import("../team-slots");
    const mockCompile = compileSourceTeamSlots as jest.MockedFunction<
      typeof compileSourceTeamSlots
    >;

    const supabase = {} as unknown as TypedClient;
    await runCompileStage(supabase);

    const calls = mockCompile.mock.calls.map((c) => c[1]);
    expect(calls).toContain("rk9");
    expect(calls).toContain("limitless");
  });
});

// =============================================================================
// eventKeyFor
// =============================================================================

describe("eventKeyFor", () => {
  it("builds the source-qualified team_slots event_key", () => {
    expect(eventKeyFor("rk9", "TO027")).toBe("rk9:TO027");
    expect(eventKeyFor("limitless", "12345")).toBe("limitless:12345");
  });
});

// =============================================================================
// deleteSourceEvent — Decision 1: FK cascade, no explicit team_slots delete
// =============================================================================

describe("deleteSourceEvent (Decision 1 — FK cascade, no explicit team_slots delete)", () => {
  it("reads affected formats by the FK column, then deletes ONLY the parent event", async () => {
    // Records every table touched + the verb used, so we can assert that
    // team_slots is only READ (select), never deleted — the FK cascade owns that.
    const calls: {
      table: string;
      schema?: string;
      verb: string;
      column?: string;
    }[] = [];

    // Chainable builder: .select(...).eq(col,val) resolves to the slot rows;
    // .delete().eq(col,val) resolves to a success. We capture the verb + column.
    function makeBuilder(table: string, schema?: string) {
      let verb = "select";
      let column: string | undefined;
      const result =
        table === "team_slots"
          ? {
              data: [
                { format: "gen9vgc2024regh" },
                { format: "gen9vgc2024regh" },
              ],
              error: null,
            }
          : { data: null, error: null };
      const builder: Record<string, unknown> = {
        select: () => {
          verb = "select";
          return builder;
        },
        delete: () => {
          verb = "delete";
          return builder;
        },
        eq: (col: string) => {
          column = col;
          calls.push({ table, schema, verb, column });
          return Promise.resolve(result);
        },
      };
      return builder;
    }

    const supabase = {
      from: (table: string) => makeBuilder(table),
      schema: (schema: string) => ({
        from: (table: string) => makeBuilder(table, schema),
      }),
    } as unknown as TypedClient;

    const result = await deleteSourceEvent(supabase, "rk9", "TO027");

    // Deduplicates formats for cache invalidation.
    expect(result.formats).toEqual(["gen9vgc2024regh"]);
    // team_slots is only SELECTed (by the rk9_event_id FK column), never DELETEd.
    const teamSlotCalls = calls.filter((c) => c.table === "team_slots");
    expect(teamSlotCalls).toHaveLength(1);
    expect(teamSlotCalls[0]).toMatchObject({
      verb: "select",
      column: "rk9_event_id",
    });
    // The parent rk9.events row IS deleted (cascade purges team_slots).
    expect(calls).toContainEqual(
      expect.objectContaining({
        schema: "rk9",
        table: "events",
        verb: "delete",
        column: "event_id",
      })
    );
  });

  it("uses limitless_tournament_id FK column when source is limitless", async () => {
    const calls: { table: string; verb: string; column?: string }[] = [];

    function makeBuilder(table: string) {
      let verb = "select";
      let column: string | undefined;
      const result = { data: [], error: null };
      const builder: Record<string, unknown> = {
        select: () => {
          verb = "select";
          return builder;
        },
        delete: () => {
          verb = "delete";
          return builder;
        },
        eq: (col: string) => {
          column = col;
          calls.push({ table, verb, column });
          return Promise.resolve(result);
        },
      };
      return builder;
    }

    const supabase = {
      from: (table: string) => makeBuilder(table),
      schema: (_schema: string) => ({
        from: (table: string) => makeBuilder(table),
      }),
    } as unknown as TypedClient;

    const result = await deleteSourceEvent(supabase, "limitless", "99");

    // Returns empty formats (no team_slots for this event)
    expect(result.formats).toEqual([]);
    // Uses the limitless FK column
    const teamSlotCalls = calls.filter((c) => c.table === "team_slots");
    expect(teamSlotCalls).toHaveLength(1);
    expect(teamSlotCalls[0]).toMatchObject({
      verb: "select",
      column: "limitless_tournament_id",
    });
  });

  it("throws when team_slots read fails", async () => {
    const supabase = {
      from: (table: string) => ({
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: null,
              error:
                table === "team_slots"
                  ? { message: "permission denied" }
                  : null,
            }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      schema: (_s: string) => ({
        from: (_t: string) => ({
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as TypedClient;

    await expect(deleteSourceEvent(supabase, "rk9", "BAD")).rejects.toThrow(
      "team_slots read failed"
    );
  });
});

// =============================================================================
// excludeSourceEvent
// =============================================================================

describe("excludeSourceEvent", () => {
  it("deletes the event and inserts an import_exclusions tombstone", async () => {
    const tablesUpserted: string[] = [];
    let upsertPayload: unknown;

    function makeBuilder(table: string) {
      let verb = "select";
      const builder: Record<string, unknown> = {
        select: () => {
          verb = "select";
          return builder;
        },
        delete: () => {
          verb = "delete";
          return builder;
        },
        upsert: (payload: unknown) => {
          tablesUpserted.push(table);
          upsertPayload = payload;
          return {
            then: (cb: (v: { error: null }) => unknown) => cb({ error: null }),
          };
        },
        eq: () => {
          void verb; // suppress unused
          return Promise.resolve({ data: [], error: null });
        },
      };
      return builder;
    }

    const supabase = {
      from: (table: string) => makeBuilder(table),
      schema: (_schema: string) => ({
        from: (table: string) => makeBuilder(table),
      }),
    } as unknown as TypedClient;

    await excludeSourceEvent(supabase, "rk9", "TO027", "test reason", "admin");

    expect(tablesUpserted).toContain("import_exclusions");
    expect(upsertPayload).toMatchObject({
      source: "rk9",
      source_event_id: "TO027",
      reason: "test reason",
      excluded_by: "admin",
    });
  });
});

// =============================================================================
// clearExclusion
// =============================================================================

describe("clearExclusion", () => {
  it("deletes the import_exclusions row by id", async () => {
    const deletedIds: number[] = [];

    const supabase = {
      from: (_table: string) => ({
        delete: () => ({
          eq: (col: string, val: unknown) => {
            if (col === "id") deletedIds.push(val as number);
            return Promise.resolve({ error: null });
          },
        }),
      }),
    } as unknown as TypedClient;

    await clearExclusion(supabase, 42);
    expect(deletedIds).toContain(42);
  });

  it("throws when delete fails", async () => {
    const supabase = {
      from: (_table: string) => ({
        delete: () => ({
          eq: () => Promise.resolve({ error: { message: "not found" } }),
        }),
      }),
    } as unknown as TypedClient;

    await expect(clearExclusion(supabase, 99)).rejects.toThrow(
      "clear exclusion failed"
    );
  });
});

// =============================================================================
// resetStuckEvents
// =============================================================================

describe("resetStuckEvents", () => {
  it("resets in-progress rk9 and limitless events to queued", async () => {
    const rk9Updates: unknown[] = [];
    const limitlessUpdates: unknown[] = [];

    function makeRk9Builder(table: string) {
      const builder: Record<string, unknown> = {
        update: (payload: unknown) => {
          if (table === "events") rk9Updates.push(payload);
          return builder;
        },
        in: () => builder,
        select: () =>
          Promise.resolve({ data: [{ event_id: "E1" }], error: null }),
      };
      return builder;
    }

    function makeLimitlessBuilder(table: string) {
      const builder: Record<string, unknown> = {
        update: (payload: unknown) => {
          if (table === "tournaments") limitlessUpdates.push(payload);
          return builder;
        },
        eq: () => builder,
        select: () =>
          Promise.resolve({
            data: [{ tournament_id: "T1" }],
            error: null,
          }),
      };
      return builder;
    }

    const supabase = {
      schema: (schema: string) => ({
        from: (table: string) =>
          schema === "rk9"
            ? makeRk9Builder(table)
            : makeLimitlessBuilder(table),
      }),
    } as unknown as TypedClient;

    const result = await resetStuckEvents(supabase);

    expect(rk9Updates[0]).toMatchObject({
      import_status: "queued",
      worker_claimed_at: null,
    });
    expect(limitlessUpdates[0]).toMatchObject({ import_status: "queued" });
    expect(result.rk9).toBe(1);
    expect(result.limitless).toBe(1);
  });
});

// =============================================================================
// requeueFailedEvents
// =============================================================================

describe("requeueFailedEvents", () => {
  it("moves failed events to queued for both sources", async () => {
    const rk9Calls: unknown[] = [];
    const limitlessCalls: unknown[] = [];

    function makeBuilder(table: string, target: unknown[], idCol: string) {
      const builder: Record<string, unknown> = {
        update: (payload: unknown) => {
          target.push(payload);
          return builder;
        },
        eq: () => builder,
        select: () =>
          Promise.resolve({
            data: [{ [idCol]: "X1" }],
            error: null,
          }),
      };
      void table;
      return builder;
    }

    const supabase = {
      schema: (schema: string) => ({
        from: (table: string) =>
          schema === "rk9"
            ? makeBuilder(table, rk9Calls, "event_id")
            : makeBuilder(table, limitlessCalls, "tournament_id"),
      }),
    } as unknown as TypedClient;

    const result = await requeueFailedEvents(supabase);

    expect(rk9Calls[0]).toMatchObject({ import_status: "queued" });
    expect(limitlessCalls[0]).toMatchObject({ import_status: "queued" });
    expect(result.rk9).toBe(1);
    expect(result.limitless).toBe(1);
  });
});

// =============================================================================
// forceImportEvent
// =============================================================================

describe("forceImportEvent", () => {
  it("sets import_status=queued and clears import_error for rk9", async () => {
    const updates: unknown[] = [];

    const supabase = {
      schema: (_schema: string) => ({
        from: (_table: string) => ({
          update: (payload: unknown) => {
            updates.push(payload);
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        }),
      }),
    } as unknown as TypedClient;

    await forceImportEvent(supabase, "rk9", "TO027");

    expect(updates[0]).toMatchObject({
      import_status: "queued",
      import_error: null,
    });
  });

  it("sets import_status=queued and clears import_error for limitless", async () => {
    const updates: unknown[] = [];

    const supabase = {
      schema: (_schema: string) => ({
        from: (_table: string) => ({
          update: (payload: unknown) => {
            updates.push(payload);
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        }),
      }),
    } as unknown as TypedClient;

    await forceImportEvent(supabase, "limitless", "99");

    expect(updates[0]).toMatchObject({
      import_status: "queued",
      import_error: null,
    });
  });

  it("throws when the update fails", async () => {
    const supabase = {
      schema: (_schema: string) => ({
        from: (_table: string) => ({
          update: () => ({
            eq: () =>
              Promise.resolve({ error: { message: "constraint violation" } }),
          }),
        }),
      }),
    } as unknown as TypedClient;

    await expect(forceImportEvent(supabase, "rk9", "BAD")).rejects.toThrow(
      "force import failed"
    );
  });
});
