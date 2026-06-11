import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import {
  computeStatusCounts,
  toDisplayStatus,
  getPipelineMonitor,
  getImportExclusions,
  type PipelineEvent,
} from "../pipeline";
import type { TypedClient } from "../../client";

// ---------------------------------------------------------------------------
// computeStatusCounts — pure helper, no DB required
// ---------------------------------------------------------------------------

describe("computeStatusCounts", () => {
  it("buckets events into the five display statuses", () => {
    const events: PipelineEvent[] = [
      {
        source: "rk9",
        sourceEventId: "A",
        name: "A",
        displayStatus: "queued",
        format: null,
        importStatus: "queued",
        playerCount: 0,
        dateStart: "2026-01-01",
        skipReason: null,
      },
      {
        source: "limitless",
        sourceEventId: "1",
        name: "B",
        displayStatus: "processing",
        format: "x",
        importStatus: "importing",
        playerCount: 1,
        dateStart: "2026-01-02",
        skipReason: null,
      },
      {
        source: "limitless",
        sourceEventId: "2",
        name: "C",
        displayStatus: "skipped",
        format: "CUSTOM",
        importStatus: "skipped",
        playerCount: 1,
        dateStart: "2026-01-02",
        skipReason: "format: CUSTOM — not importable",
      },
    ];
    const counts = computeStatusCounts(events);
    expect(counts.queued).toBe(1);
    expect(counts.processing).toBe(1);
    expect(counts.skipped).toBe(1);
    expect(counts.failed).toBe(0);
    expect(counts.complete).toBe(0);
  });

  it("returns all-zero counts for an empty event list", () => {
    const counts = computeStatusCounts([]);
    expect(counts).toEqual({
      queued: 0,
      processing: 0,
      failed: 0,
      skipped: 0,
      complete: 0,
    });
  });

  it("counts each display status independently", () => {
    const make = (
      displayStatus: PipelineEvent["displayStatus"]
    ): PipelineEvent => ({
      source: "rk9",
      sourceEventId: displayStatus,
      name: displayStatus,
      displayStatus,
      format: null,
      importStatus: displayStatus,
      playerCount: 0,
      dateStart: null,
      skipReason: null,
    });

    const counts = computeStatusCounts([
      make("queued"),
      make("queued"),
      make("processing"),
      make("failed"),
      make("failed"),
      make("failed"),
      make("skipped"),
      make("complete"),
      make("complete"),
    ]);
    expect(counts.queued).toBe(2);
    expect(counts.processing).toBe(1);
    expect(counts.failed).toBe(3);
    expect(counts.skipped).toBe(1);
    expect(counts.complete).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// toDisplayStatus — pure helper, no DB required
// ---------------------------------------------------------------------------

describe("toDisplayStatus", () => {
  it.each([
    // [source, importStatus, expected]
    ["rk9", "queued", "queued"],
    ["rk9", "failed", "failed"],
    ["rk9", "skipped", "skipped"],
    ["rk9", "complete", "complete"],
    ["rk9", "completed", "complete"],
    ["rk9", "roster", "processing"],
    ["rk9", "teams", "processing"],
    ["rk9", "pairings", "processing"],
    ["limitless", "queued", "queued"],
    ["limitless", "failed", "failed"],
    ["limitless", "skipped", "skipped"],
    ["limitless", "complete", "complete"],
    ["limitless", "importing", "processing"],
    ["limitless", "unknown_state", "processing"],
  ] as const)("%s / %s → %s", (source, importStatus, expected) => {
    expect(toDisplayStatus(source, importStatus)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Mock client builder for DB-dependent functions
// ---------------------------------------------------------------------------

type Resolved = { data: unknown; error: unknown };

/**
 * Builds a mock supabase client that simulates the `.schema().from().select().order().limit()`
 * chain used by getPipelineMonitor for both rk9 and limitless schemas.
 *
 * We return distinct resolved values per schema so tests can assert each path.
 */
function createSchemaMockClient(resolvedBySchema: Record<string, Resolved>) {
  // Each schema mock needs its own chainable builder.
  const schemaClients: Record<string, ReturnType<typeof makeChain>> = {};

  function makeChain(resolved: Resolved) {
    const limit = jest.fn().mockReturnValue(Promise.resolve(resolved));
    const order = jest.fn().mockReturnValue({ limit });
    const select = jest.fn().mockReturnValue({ order });
    const from = jest.fn().mockReturnValue({ select });
    return { from, select, order, limit };
  }

  for (const [schema, resolved] of Object.entries(resolvedBySchema)) {
    schemaClients[schema] = makeChain(resolved);
  }

  const schema = jest.fn((name: string) => {
    const chain = schemaClients[name];
    if (!chain) throw new Error(`Unexpected schema: ${name}`);
    return chain;
  });

  return {
    client: { schema } as unknown as TypedClient,
    schema,
    schemaClients,
  };
}

/** Simple client mock for getImportExclusions (public schema, no .schema() call). */
function createSimpleMockClient(resolved: Resolved) {
  const order = jest.fn().mockReturnValue(Promise.resolve(resolved));
  const select = jest.fn().mockReturnValue({ order });
  const from = jest.fn().mockReturnValue({ select });
  return {
    client: { from } as unknown as TypedClient,
    from,
    select,
    order,
  };
}

// ---------------------------------------------------------------------------
// getPipelineMonitor
// ---------------------------------------------------------------------------

describe("getPipelineMonitor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("merges rk9 and limitless rows into events with computed displayStatus", async () => {
    const mock = createSchemaMockClient({
      rk9: {
        data: [
          {
            event_id: "EV1",
            name: "Regional A",
            format_id: "vgc_2026_reg_h",
            import_status: "complete",
            import_error: null,
            player_count: 256,
            date_start: "2026-03-01",
          },
        ],
        error: null,
      },
      limitless: {
        data: [
          {
            tournament_id: "T1",
            name: "Online Cup",
            format_id: "vgc_2026_reg_h",
            import_status: "importing",
            import_error: null,
            player_count: 64,
            date: "2026-03-05",
          },
        ],
        error: null,
      },
    });

    const result = await getPipelineMonitor(mock.client);

    expect(result.events).toHaveLength(2);

    const rk9Event = result.events.find((e) => e.source === "rk9");
    expect(rk9Event).toMatchObject({
      source: "rk9",
      sourceEventId: "EV1",
      name: "Regional A",
      displayStatus: "complete",
      importStatus: "complete",
      playerCount: 256,
      dateStart: "2026-03-01",
      skipReason: null,
    });

    const limitlessEvent = result.events.find((e) => e.source === "limitless");
    expect(limitlessEvent).toMatchObject({
      source: "limitless",
      sourceEventId: "T1",
      name: "Online Cup",
      displayStatus: "processing",
      importStatus: "importing",
      playerCount: 64,
      dateStart: "2026-03-05",
      skipReason: null,
    });
  });

  it("derives counts from the same events array (no disagreement)", async () => {
    const mock = createSchemaMockClient({
      rk9: {
        data: [
          {
            event_id: "A",
            name: "A",
            format_id: null,
            import_status: "queued",
            import_error: null,
            player_count: 0,
            date_start: "2026-01-01",
          },
          {
            event_id: "B",
            name: "B",
            format_id: null,
            import_status: "failed",
            import_error: "network error",
            player_count: 0,
            date_start: "2026-01-02",
          },
        ],
        error: null,
      },
      limitless: {
        data: [
          {
            tournament_id: "C",
            name: "C",
            format_id: "vgc",
            import_status: "skipped",
            import_error: "format not supported",
            player_count: 10,
            date: "2026-01-03",
          },
        ],
        error: null,
      },
    });

    const result = await getPipelineMonitor(mock.client);

    expect(result.counts.queued).toBe(1);
    expect(result.counts.failed).toBe(1);
    expect(result.counts.skipped).toBe(1);
    expect(result.counts.processing).toBe(0);
    expect(result.counts.complete).toBe(0);
    expect(result.events).toHaveLength(3);
  });

  it("sets skipReason for limitless skipped rows", async () => {
    const mock = createSchemaMockClient({
      rk9: { data: [], error: null },
      limitless: {
        data: [
          {
            tournament_id: "T2",
            name: "Legacy Cup",
            format_id: "CUSTOM",
            import_status: "skipped",
            import_error: "format: CUSTOM — not importable",
            player_count: 5,
            date: "2026-02-01",
          },
        ],
        error: null,
      },
    });

    const result = await getPipelineMonitor(mock.client);
    const ev = result.events[0];
    expect(ev).toBeDefined();
    expect(ev?.skipReason).toBe("format: CUSTOM — not importable");
  });

  it("falls back to source_event_id as name when name is missing (rk9)", async () => {
    const mock = createSchemaMockClient({
      rk9: {
        data: [
          {
            event_id: "NAMELESS",
            name: null,
            format_id: null,
            import_status: "queued",
            import_error: null,
            player_count: null,
            date_start: "2026-01-01",
          },
        ],
        error: null,
      },
      limitless: { data: [], error: null },
    });

    const result = await getPipelineMonitor(mock.client);
    expect(result.events[0]?.name).toBe("NAMELESS");
    expect(result.events[0]?.playerCount).toBe(0);
  });

  it("excludes rk9 rows with pending status", async () => {
    // per the spec note: pending is pre-discovery and should not appear in the queue list
    const mock = createSchemaMockClient({
      rk9: {
        data: [
          {
            event_id: "P1",
            name: "Pending Event",
            format_id: null,
            import_status: "pending",
            import_error: null,
            player_count: 0,
            date_start: "2026-01-01",
          },
          {
            event_id: "Q1",
            name: "Queued Event",
            format_id: null,
            import_status: "queued",
            import_error: null,
            player_count: 0,
            date_start: "2026-01-02",
          },
        ],
        error: null,
      },
      limitless: { data: [], error: null },
    });

    const result = await getPipelineMonitor(mock.client);
    // Only queued event; pending is filtered out
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.sourceEventId).toBe("Q1");
  });

  it("throws on rk9 query error", async () => {
    const mock = createSchemaMockClient({
      rk9: { data: null, error: { message: "rk9 connection refused" } },
      limitless: { data: [], error: null },
    });

    await expect(getPipelineMonitor(mock.client)).rejects.toThrow(
      /rk9 events read failed: rk9 connection refused/
    );
  });

  it("throws on limitless query error", async () => {
    const mock = createSchemaMockClient({
      rk9: { data: [], error: null },
      limitless: {
        data: null,
        error: { message: "limitless connection refused" },
      },
    });

    await expect(getPipelineMonitor(mock.client)).rejects.toThrow(
      /limitless read failed: limitless connection refused/
    );
  });

  it("returns empty events and zero counts when both sources return empty", async () => {
    const mock = createSchemaMockClient({
      rk9: { data: [], error: null },
      limitless: { data: [], error: null },
    });

    const result = await getPipelineMonitor(mock.client);
    expect(result.events).toHaveLength(0);
    expect(result.counts).toEqual({
      queued: 0,
      processing: 0,
      failed: 0,
      skipped: 0,
      complete: 0,
    });
  });

  it("queries each schema with order desc + limit 500", async () => {
    const mock = createSchemaMockClient({
      rk9: { data: [], error: null },
      limitless: { data: [], error: null },
    });

    await getPipelineMonitor(mock.client);

    expect(mock.schema).toHaveBeenCalledWith("rk9");
    expect(mock.schema).toHaveBeenCalledWith("limitless");

    const rk9Chain = mock.schemaClients["rk9"];
    const limitlessChain = mock.schemaClients["limitless"];

    expect(rk9Chain?.order).toHaveBeenCalledWith("date_start", {
      ascending: false,
    });
    expect(rk9Chain?.limit).toHaveBeenCalledWith(500);
    expect(limitlessChain?.order).toHaveBeenCalledWith("date", {
      ascending: false,
    });
    expect(limitlessChain?.limit).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// getImportExclusions
// ---------------------------------------------------------------------------

describe("getImportExclusions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns exclusion rows ordered by excluded_at desc", async () => {
    const rows = [
      {
        id: 2,
        source: "rk9",
        source_event_id: "EV2",
        reason: "spam",
        excluded_at: "2026-03-02",
      },
      {
        id: 1,
        source: "limitless",
        source_event_id: "T1",
        reason: null,
        excluded_at: "2026-03-01",
      },
    ];
    const mock = createSimpleMockClient({ data: rows, error: null });

    const result = await getImportExclusions(mock.client);

    expect(mock.from).toHaveBeenCalledWith("import_exclusions");
    expect(mock.order).toHaveBeenCalledWith("excluded_at", {
      ascending: false,
    });
    expect(result).toBe(rows);
  });

  it("returns empty array when data is null", async () => {
    const mock = createSimpleMockClient({ data: null, error: null });

    const result = await getImportExclusions(mock.client);

    expect(result).toEqual([]);
  });

  it("throws on query error", async () => {
    const mock = createSimpleMockClient({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(getImportExclusions(mock.client)).rejects.toThrow(
      /exclusions read failed: permission denied/
    );
  });
});
