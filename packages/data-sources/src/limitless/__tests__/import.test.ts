/**
 * @jest-environment node
 */

// Mock the API module before importing the subject
jest.mock("../api", () => ({
  fetchTournamentList: jest.fn(),
  fetchTournamentData: jest.fn(),
}));

// Must also mock format because import.ts sources these from "./format", not "./api"
jest.mock("../format", () => ({
  LIMITLESS_TO_FORMAT: { "VGC 2024": "gen9vgc2024regg" },
  KNOWN_FORMATS: new Set(["VGC 2024"]),
  SKIP_FORMATS: new Set(["CUSTOM"]),
}));

import type { SupabaseClient } from "@supabase/supabase-js";
import { processImportQueue } from "../import";
import { fetchTournamentData } from "../api";

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

type MockChain = {
  [key: string]: jest.Mock;
} & {
  schema: jest.Mock;
  from: jest.Mock;
  select: jest.Mock & { mockReturnValue: (val: unknown) => jest.Mock };
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  not: jest.Mock;
  lt: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  rpc: jest.Mock;
};

function createChain(terminal: Record<string, unknown> = {}): MockChain {
  const chain: MockChain = {} as MockChain;
  const methods = [
    "schema",
    "from",
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "not",
    "lt",
    "order",
    "limit",
    "maybeSingle",
    "single",
    "rpc",
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // Terminal methods return resolved values
  chain.maybeSingle.mockResolvedValue({ data: null, error: null, ...terminal });
  chain.single.mockResolvedValue({ data: null, error: null, ...terminal });
  return chain;
}

function _createMockSupabase() {
  const chains: MockChain[] = [];
  const newChain = (terminal?: Record<string, unknown>) => {
    const chain = createChain(terminal);
    chains.push(chain);
    return chain;
  };

  const supabase = {
    schema: jest.fn().mockImplementation(() => {
      return newChain();
    }),
    _chains: chains,
    _setNextChain: (terminal: Record<string, unknown>) => {
      supabase.schema.mockImplementationOnce(() => newChain(terminal));
    },
  };

  return supabase;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("processImportQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns { processed: false } when queue is empty", async () => {
    // Chain 1: stale rows query → no rows
    // Chain 2: pick queued tournament → null
    const supabase = {
      schema: jest.fn(),
    };

    // First call: stale imports check
    const staleChain = createChain();
    staleChain.limit.mockResolvedValue({ data: [], error: null });

    // Second call: pick queued tournament
    const queueChain = createChain();
    queueChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    supabase.schema
      .mockReturnValueOnce(staleChain) // stale check
      .mockReturnValueOnce(queueChain); // queue pick

    const result = await processImportQueue(
      supabase as unknown as Parameters<typeof processImportQueue>[0],
      "key",
      1
    );

    expect(result.results[0]!.processed).toBe(false);
    expect(result.totalProcessed).toBe(0);
  });

  it("claims a queued row and marks it completed on success", async () => {
    const supabase = { schema: jest.fn() };

    // Stale check → empty
    const staleChain = createChain();
    staleChain.limit.mockResolvedValue({ data: [], error: null });

    // Queue pick → found one
    const pickChain = createChain();
    pickChain.maybeSingle.mockResolvedValue({
      data: { tournament_id: "t1", format_id: "VGC 2024" },
      error: null,
    });

    // Claim → success
    const claimChain = createChain();
    claimChain.maybeSingle.mockResolvedValue({
      data: { tournament_id: "t1" },
      error: null,
    });

    supabase.schema
      .mockReturnValueOnce(staleChain)
      .mockReturnValueOnce(pickChain)
      .mockReturnValueOnce(claimChain);

    // Mock fetchTournamentData to return valid data
    (fetchTournamentData as jest.Mock).mockResolvedValue({
      details: {
        id: "t1",
        name: "Test Cup",
        date: "2024-01-01T00:00:00Z",
        players: 8,
        phases: [],
      },
      standings: [],
      pairings: [],
    });

    // importTournament calls many supabase methods — mock them all to succeed
    const genericChain = createChain();
    genericChain.single.mockResolvedValue({ data: { id: 1 }, error: null });
    genericChain.limit.mockResolvedValue({ data: [], error: null });
    // rpc for atomic_clear_tournament
    genericChain.rpc = jest.fn().mockResolvedValue({ data: null, error: null });

    supabase.schema.mockReturnValue(genericChain);

    const result = await processImportQueue(
      supabase as unknown as SupabaseClient,
      "key",
      1
    );

    expect(result.totalProcessed).toBe(1);
    expect(result.results[0]!.processed).toBe(true);
    expect(result.results[0]!.tournamentId).toBe("t1");
    expect(result.results[0]!.error).toBeUndefined();
  });

  it("returns { processed: false } when another worker claims the row", async () => {
    const supabase = { schema: jest.fn() };

    // Stale check → empty
    const staleChain = createChain();
    staleChain.limit.mockResolvedValue({ data: [], error: null });

    // Queue pick → found one
    const pickChain = createChain();
    pickChain.maybeSingle.mockResolvedValue({
      data: { tournament_id: "t1", format_id: "VGC 2024" },
      error: null,
    });

    // Claim → null (another worker got it)
    const claimChain = createChain();
    claimChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    // Default chain for remaining worker calls (concurrent pool)
    const emptyChain = createChain();
    emptyChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    supabase.schema
      .mockReturnValueOnce(staleChain)
      .mockReturnValueOnce(pickChain)
      .mockReturnValueOnce(claimChain)
      .mockReturnValue(emptyChain);

    const result = await processImportQueue(
      supabase as unknown as SupabaseClient,
      "key",
      1
    );

    expect(result.results[0]!.recovered).toBeUndefined();
    expect(result.results[0]!.processed).toBe(false);
    expect(result.totalProcessed).toBe(0);
  });

  it("requeues a stale import with attempts < MAX_ATTEMPTS", async () => {
    const supabase = { schema: jest.fn() };

    // Stale check → found one with 1 attempt
    const staleChain = createChain();
    staleChain.limit.mockResolvedValue({
      data: [{ tournament_id: "t-stale", import_attempts: 1 }],
      error: null,
    });

    // Update call for requeue
    const updateChain = createChain();

    // Default chain for subsequent processOne call — no queued tournament
    const waitChain = createChain();
    waitChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    supabase.schema
      .mockReturnValueOnce(staleChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValue(waitChain);

    const result = await processImportQueue(
      supabase as unknown as SupabaseClient,
      "key",
      1
    );

    expect(result.results[0]!.recovered).toBe(true);
    expect(result.results[0]!.processed).toBe(false);
    // Verify update
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        import_status: "queued",
        import_attempts: 2,
      })
    );
  });

  it("marks a stale import as failed when attempts >= MAX_ATTEMPTS", async () => {
    const supabase = { schema: jest.fn() };

    // Stale check → found one with 2 attempts (will be incremented to 3 = MAX)
    const staleChain = createChain();
    staleChain.limit.mockResolvedValue({
      data: [{ tournament_id: "t-stale", import_attempts: 2 }],
      error: null,
    });

    // Update call for fail
    const updateChain = createChain();

    // Default chain for subsequent processOne call — no queued tournament
    const waitChain = createChain();
    waitChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    supabase.schema
      .mockReturnValueOnce(staleChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValue(waitChain);

    const result = await processImportQueue(
      supabase as unknown as SupabaseClient,
      "key",
      1
    );

    expect(result.results[0]!.recovered).toBe(true);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        import_status: "failed",
        import_attempts: 3,
      })
    );
  });

  it("skips tournaments with unknown format", async () => {
    const supabase = { schema: jest.fn() };

    // Stale check → empty
    const staleChain = createChain();
    staleChain.limit.mockResolvedValue({ data: [], error: null });

    // Queue pick → found one with unknown format
    const pickChain = createChain();
    pickChain.maybeSingle.mockResolvedValue({
      data: {
        tournament_id: "t-unknown",
        format_id: "UNKNOWN_CODE",
        import_attempts: 0,
      },
      error: null,
    });

    // Default chain for other workers
    const emptyChain = createChain();
    emptyChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    supabase.schema
      .mockReturnValueOnce(staleChain)
      .mockReturnValueOnce(pickChain)
      .mockReturnValue(emptyChain);

    const result = await processImportQueue(
      supabase as unknown as SupabaseClient,
      "key",
      1
    );

    expect(result.totalProcessed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// syncTournamentList tests
// ---------------------------------------------------------------------------

import { syncTournamentList, importTournament } from "../import";

describe("syncTournamentList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("syncs tournaments from the API into the DB", async () => {
    const { fetchTournamentList: mockList } = jest.requireMock("../api");
    mockList.mockResolvedValue([
      {
        id: "t1",
        name: "Cup 1",
        format: "SVG",
        date: "2024-06-01T00:00:00Z",
        players: 100,
      },
      {
        id: "t2",
        name: "Cup 2",
        format: "SVI",
        date: "2025-01-15T00:00:00Z",
        players: 50,
      },
    ]);

    const chain = createChain();
    chain.upsert = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ upsert: chain.upsert });
    const schemaMock = jest.fn().mockReturnValue({ from: fromMock });
    const supabase = { schema: schemaMock } as unknown as SupabaseClient;

    const result = await syncTournamentList(supabase, "key");

    expect(result.synced).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.mapped).toBe(0);
    expect(result.unmapped).toBe(2);
    expect(chain.upsert).toHaveBeenCalled();
    const upsertArg = chain.upsert.mock.calls[0][0];
    expect(upsertArg).toHaveLength(2);
    expect(upsertArg[0].tournament_id).toBe("t1");
    expect(upsertArg[1].tournament_id).toBe("t2");
  });

  it("skips tournaments with empty format codes", async () => {
    const { fetchTournamentList: mockList } = jest.requireMock("../api");
    mockList.mockResolvedValue([
      {
        id: "t1",
        name: "No Format",
        format: "",
        date: "2024-01-01T00:00:00Z",
        players: 10,
      },
    ]);

    const chain = createChain();
    chain.upsert = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ upsert: chain.upsert });
    const schemaMock = jest.fn().mockReturnValue({ from: fromMock });
    const supabase = { schema: schemaMock } as unknown as SupabaseClient;

    const result = await syncTournamentList(supabase, "key");

    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(1);
    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it("deduplicates tournaments by id", async () => {
    const { fetchTournamentList: mockList } = jest.requireMock("../api");
    mockList.mockResolvedValue([
      {
        id: "t1",
        name: "Duplicate",
        format: "VGC 2024",
        date: "2024-06-01T00:00:00Z",
        players: 50,
      },
      {
        id: "t1",
        name: "Duplicate",
        format: "VGC 2024",
        date: "2024-06-01T00:00:00Z",
        players: 50,
      },
    ]);

    const chain = createChain();
    chain.upsert = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ upsert: chain.upsert });
    const schemaMock = jest.fn().mockReturnValue({ from: fromMock });
    const supabase = { schema: schemaMock } as unknown as SupabaseClient;

    const result = await syncTournamentList(supabase, "key");

    expect(result.synced).toBe(1);
    expect(chain.upsert.mock.calls[0][0]).toHaveLength(1);
  });

  it("reports unmapped formats", async () => {
    const { fetchTournamentList: mockList } = jest.requireMock("../api");
    mockList.mockResolvedValue([
      {
        id: "t1",
        name: "Unknown Format",
        format: "WEIRD-CODE",
        date: "2024-06-01T00:00:00Z",
        players: 10,
      },
    ]);

    const chain = createChain();
    chain.upsert = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ upsert: chain.upsert });
    const schemaMock = jest.fn().mockReturnValue({ from: fromMock });
    const supabase = { schema: schemaMock } as unknown as SupabaseClient;

    const result = await syncTournamentList(supabase, "key");

    expect(result.synced).toBe(1);
    expect(result.unmapped).toBe(1);
  });

  it("skips CUSTOM format tournaments", async () => {
    const { fetchTournamentList: mockList } = jest.requireMock("../api");
    mockList.mockResolvedValue([
      {
        id: "t1",
        name: "Custom Tour",
        format: "CUSTOM",
        date: "2024-06-01T00:00:00Z",
        players: 10,
      },
      {
        id: "t2",
        name: "Real Tour",
        format: "VGC 2024",
        date: "2025-01-15T00:00:00Z",
        players: 50,
      },
    ]);

    const chain = createChain();
    chain.upsert = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ upsert: chain.upsert });
    const schemaMock = jest.fn().mockReturnValue({ from: fromMock });
    const supabase = { schema: schemaMock } as unknown as SupabaseClient;

    const result = await syncTournamentList(supabase, "key");

    // Both rows are upserted, but the CUSTOM row goes in with import_status = 'skipped'
    expect(result.synced).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.unmappedFormats["CUSTOM"]).toBe(1);
    const upsertArg = chain.upsert.mock.calls[0][0];
    expect(upsertArg).toHaveLength(2);

    const customRow = upsertArg.find(
      (r: { tournament_id: string }) => r.tournament_id === "t1"
    );
    expect(customRow.import_status).toBe("skipped");
    expect(customRow.import_error).toBe("Skipped: CUSTOM format");

    const realRow = upsertArg.find(
      (r: { tournament_id: string }) => r.tournament_id === "t2"
    );
    expect(realRow.import_status).toBeUndefined();
  });
});

describe("importTournament", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("imports full tournament data with standings and pairings", async () => {
    const data = {
      details: {
        id: "t1",
        name: "Test Cup",
        date: "2024-06-01T00:00:00Z",
        game: "VGC",
        format: "SVG",
        players: 8,
        phases: [{ phase: 1, type: "swiss", rounds: 5, mode: "single" }],
        organizer: { id: 1, name: "Test Org" },
        platform: "limitless",
        isOnline: true,
        decklists: false,
      },
      standings: [
        {
          player: "player1",
          name: "Player One",
          country: "US",
          placing: 1,
          record: { wins: 5, losses: 0, ties: 0 },
          drop: null,
          decklist: [
            {
              id: "pikachu",
              name: "Pikachu",
              ability: undefined,
              item: undefined,
              tera: undefined,
              attacks: [],
            },
          ],
        },
        {
          player: "player2",
          name: "Player Two",
          country: "CA",
          placing: 2,
          record: { wins: 4, losses: 1, ties: 0 },
          drop: null,
          decklist: [],
        },
      ],
      pairings: [
        {
          phase: 1,
          round: 1,
          table: 1,
          match: "1",
          player1: "player1",
          player2: "player2",
          winner: "player1",
        },
      ],
    };

    const chain = createChain();
    chain.rpc = jest.fn().mockResolvedValue({ error: null });
    chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
    chain.maybeSingle.mockResolvedValue({ data: { id: 1 }, error: null });
    chain.limit.mockResolvedValue({ data: [], error: null });
    chain.select.mockReturnValue({
      single: chain.single,
      maybeSingle: chain.maybeSingle,
    });

    const fromMock = jest.fn().mockReturnValue(chain);
    const schemaMock = jest.fn().mockReturnValue({
      from: fromMock,
      rpc: chain.rpc,
    });
    const supabase = { schema: schemaMock } as unknown as SupabaseClient;

    const result = await importTournament(supabase, data, "VGC 2024");

    expect(result.tournamentId).toBe("t1");
    expect(result.standings).toBe(2);
    expect(schemaMock).toHaveBeenCalledWith("limitless");
    expect(chain.rpc).toHaveBeenCalledWith("atomic_clear_tournament", {
      p_tournament_id: "t1",
    });
  });

  it("imports tournament without phases or pairings", async () => {
    const data = {
      details: {
        id: "t2",
        name: "Minimal Cup",
        date: "2024-06-01T00:00:00Z",
        game: "VGC",
        format: "SVG",
        players: 4,
        phases: [],
        organizer: undefined,
        platform: undefined,
        isOnline: true,
        decklists: false,
      },
      standings: [
        {
          player: "p1",
          name: "P1",
          country: "US",
          placing: 1,
          record: { wins: 3, losses: 0, ties: 0 },
          drop: null,
          decklist: [],
        },
      ],
      pairings: [],
    };

    const chain = createChain();
    chain.rpc = jest.fn().mockResolvedValue({ error: null });
    chain.maybeSingle.mockResolvedValue({ data: { id: 1 }, error: null });
    chain.select.mockReturnValue({
      single: chain.single,
      maybeSingle: chain.maybeSingle,
    });
    chain.limit.mockResolvedValue({ data: [], error: null });

    const fromMock = jest.fn().mockReturnValue(chain);
    const schemaMock = jest.fn().mockReturnValue({
      from: fromMock,
      rpc: chain.rpc,
    });
    const supabase = { schema: schemaMock } as unknown as SupabaseClient;

    const result = await importTournament(supabase, data, "VGC 2024");

    expect(result.tournamentId).toBe("t2");
    expect(result.standings).toBe(1);
  });
});
