/**
 * @jest-environment node
 */

// Mock the API module before importing the subject
jest.mock("../api", () => ({
  LIMITLESS_TO_FORMAT: { "VGC 2024": "gen9vgc2024regulationg" },
  fetchTournamentList: jest.fn(),
  fetchTournamentData: jest.fn(),
}));

import { processImportQueue } from "../import";
import { fetchTournamentData } from "../api";

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

type MockChain = Record<string, jest.Mock>;

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

function createMockSupabase() {
  // We need to track calls to route them properly
  const chains: MockChain[] = [];
  let currentChain: MockChain;

  const newChain = (terminal?: Record<string, unknown>) => {
    currentChain = createChain(terminal);
    chains.push(currentChain);
    return currentChain;
  };

  // The supabase mock: each .schema() call starts a new chain
  const supabase = {
    schema: jest.fn().mockImplementation(() => {
      return newChain();
    }),
    _chains: chains,
    _setNextChain: (terminal: Record<string, unknown>) => {
      // Pre-configure next chain's terminal result
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

    const result = await processImportQueue(supabase as any, "key", 1);

    expect(result.results[0].processed).toBe(false);
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

    const result = await processImportQueue(supabase as any, "key", 1);

    expect(result.totalProcessed).toBe(1);
    expect(result.results[0].processed).toBe(true);
    expect(result.results[0].tournamentId).toBe("t1");
    expect(result.results[0].error).toBeUndefined();
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

    supabase.schema
      .mockReturnValueOnce(staleChain)
      .mockReturnValueOnce(pickChain)
      .mockReturnValueOnce(claimChain);

    const result = await processImportQueue(supabase as any, "key", 1);

    expect(result.results[0].processed).toBe(false);
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

    supabase.schema
      .mockReturnValueOnce(staleChain)
      .mockReturnValueOnce(updateChain);

    const result = await processImportQueue(supabase as any, "key", 1);

    expect(result.results[0].recovered).toBe(true);
    expect(result.results[0].processed).toBe(false);
    // Verify update was called with "queued" status
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

    supabase.schema
      .mockReturnValueOnce(staleChain)
      .mockReturnValueOnce(updateChain);

    const result = await processImportQueue(supabase as any, "key", 1);

    expect(result.results[0].recovered).toBe(true);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        import_status: "failed",
        import_attempts: 3,
      })
    );
  });
});
