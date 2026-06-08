/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(),
  getUserId: jest.fn(),
}));

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: jest.fn(),
}));

jest.mock("@/lib/limitless", () => ({
  syncTournamentList: jest.fn(),
  processImportQueue: jest.fn(),
}));

// Partial mock: preserve real SKIP_FORMATS / format constants so existing tests
// that assert pgInList output remain correct; only override the async fetch/import.
jest.mock("@trainers/data-sources", () => ({
  ...jest.requireActual("@trainers/data-sources"),
  fetchTournamentData: jest.fn(),
  importTournament: jest.fn(),
}));

import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { syncTournamentList, processImportQueue } from "@/lib/limitless";
import { fetchTournamentData, importTournament } from "@trainers/data-sources";
import {
  queueTournamentForImport,
  batchQueueTournaments,
  triggerLimitlessSync,
  triggerImportQueue,
  importLimitlessTournament,
} from "../limitless";

const mockGetUserId = getUserId as jest.Mock;
const mockIsSiteAdmin = isSiteAdmin as jest.Mock;
const mockCreateClient = createServiceRoleClient as jest.Mock;
const mockSync = syncTournamentList as jest.Mock;
const mockProcess = processImportQueue as jest.Mock;
const mockFetchTournamentData = fetchTournamentData as jest.Mock;
const mockImportTournament = importTournament as jest.Mock;

// Hoisted spy so tests can assert .not() call args.
let notSpy: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  notSpy = jest.fn();

  mockGetUserId.mockResolvedValue("user-1");
  mockIsSiteAdmin.mockResolvedValue(true);

  mockCreateClient.mockReturnValue({
    schema: () => ({
      from: () => {
        // Terminal results for both execution paths:
        //   queueTournamentForImport  → .select(...).maybeSingle() → { data: {...}, error: null }
        //   batchQueueTournaments     → .select(...) resolved directly → { data: [...], error: null }
        const selectResult = {
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tournament_id: "t1" },
            error: null,
          }),
        };
        Object.assign(
          selectResult,
          Promise.resolve({ data: [{ tournament_id: "t1" }], error: null })
        );

        const chain: Record<string, jest.Mock> = {
          update: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          not: notSpy.mockReturnThis(),
          select: jest.fn().mockResolvedValue({
            data: [{ tournament_id: "t1" }],
            error: null,
          }),
        };

        // queueTournamentForImport needs .select().maybeSingle()
        // Override select to return an object that is both thenable AND has .maybeSingle
        const selectWithMaybeSingle = jest.fn().mockImplementation(() => {
          const p = Promise.resolve({
            data: [{ tournament_id: "t1" }],
            error: null,
          });
          (p as unknown as Record<string, unknown>).maybeSingle = jest
            .fn()
            .mockResolvedValue({ data: { tournament_id: "t1" }, error: null });
          return p;
        });

        chain.select = selectWithMaybeSingle;
        return chain;
      },
    }),
  });
});

describe("queueTournamentForImport", () => {
  it("queues a tournament successfully", async () => {
    const result = await queueTournamentForImport("t1");
    expect(result.success).toBe(true);
  });

  it("returns error when not authenticated", async () => {
    mockGetUserId.mockResolvedValue(null);
    const result = await queueTournamentForImport("t1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when not admin", async () => {
    mockIsSiteAdmin.mockResolvedValue(false);
    const result = await queueTournamentForImport("t1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Requires site admin");
  });

  it("passes a parenthesized in-list string to .not(), not a raw array", async () => {
    await queueTournamentForImport("t1");
    expect(notSpy).toHaveBeenCalledWith("format_id", "in", '("CUSTOM")');
  });
});

describe("batchQueueTournaments", () => {
  it("queues multiple tournaments", async () => {
    const result = await batchQueueTournaments(["t1", "t2"]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.queued).toBeGreaterThan(0);
    }
  });

  it("passes a parenthesized in-list string to .not(), not a raw array", async () => {
    await batchQueueTournaments(["t1", "t2"]);
    expect(notSpy).toHaveBeenCalledWith("format_id", "in", '("CUSTOM")');
  });

  it("returns queued: 0 for empty input without calling the DB", async () => {
    const result = await batchQueueTournaments([]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.queued).toBe(0);
    }
    expect(notSpy).not.toHaveBeenCalled();
  });
});

describe("triggerLimitlessSync", () => {
  it("triggers sync successfully", async () => {
    mockSync.mockResolvedValue({ synced: 10 });
    process.env.LIMITLESS_API_KEY = "test-key";

    const result = await triggerLimitlessSync();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ synced: 10 });
  });
});

describe("triggerImportQueue", () => {
  it("triggers import successfully and surfaces remaining count", async () => {
    mockProcess.mockResolvedValue({
      totalProcessed: 3,
      totalErrors: 0,
      remaining: 7,
    });
    process.env.LIMITLESS_API_KEY = "test-key";

    const result = await triggerImportQueue(5);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ processed: 3, errors: 0, remaining: 7 });
  });

  it("surfaces remaining: 0 when queue is drained", async () => {
    mockProcess.mockResolvedValue({
      totalProcessed: 2,
      totalErrors: 1,
      remaining: 0,
    });
    process.env.LIMITLESS_API_KEY = "test-key";

    const result = await triggerImportQueue(5);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.remaining).toBe(0);
    }
  });
});

describe("importLimitlessTournament", () => {
  // Per-describe Supabase mock: tracks update calls so we can assert status
  // transitions and confirm the row never stays at "importing" on error.
  let updateSpy: jest.Mock;
  let maybeSingleSpy: jest.Mock;

  beforeEach(() => {
    process.env.LIMITLESS_API_KEY = "test-key";
    updateSpy = jest.fn().mockReturnThis();
    maybeSingleSpy = jest.fn().mockResolvedValue({
      data: {
        tournament_id: "t1",
        format_id: "gen9vgc2025regi",
        import_attempts: 0,
      },
      error: null,
    });

    // The claim UPDATE chains through .eq().not().select().maybeSingle(),
    // so the mock must support all four methods on the same fluent chain.
    updateSpy.mockImplementation(() => {
      const chain: Record<string, jest.Mock> = {
        eq: jest.fn(),
        not: jest.fn(),
        select: jest.fn().mockImplementation(() => ({
          maybeSingle: jest
            .fn()
            .mockResolvedValue({ data: { tournament_id: "t1" }, error: null }),
        })),
      };
      chain.eq.mockReturnValue(chain);
      chain.not.mockReturnValue(chain);
      return chain;
    });

    mockCreateClient.mockReturnValue({
      schema: () => ({
        from: () => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: maybeSingleSpy,
            }),
          }),
          update: updateSpy,
        }),
      }),
    });

    mockFetchTournamentData.mockResolvedValue({
      details: { id: "t1" },
      standings: [],
      pairings: [],
    });
    mockImportTournament.mockResolvedValue({
      tournamentId: "t1",
      players: 0,
      standings: 0,
      pokemon: 0,
      matches: 0,
    });
  });

  it("(a) returns { success:false } and does NOT call importTournament when not admin", async () => {
    mockIsSiteAdmin.mockResolvedValue(false);

    const result = await importLimitlessTournament("t1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Requires site admin");
    expect(mockImportTournament).not.toHaveBeenCalled();
  });

  it("(a) returns { success:false } when not authenticated", async () => {
    mockGetUserId.mockResolvedValue(null);

    const result = await importLimitlessTournament("t1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
    expect(mockImportTournament).not.toHaveBeenCalled();
  });

  it("(b) calls importTournament with fetched data + formatId, writes completed status, returns { success:true }", async () => {
    const fakeData = { details: { id: "t1" }, standings: [], pairings: [] };
    mockFetchTournamentData.mockResolvedValue(fakeData);

    const result = await importLimitlessTournament("t1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ imported: true });
    }
    // importTournament must be called with the data and the format_id from the row
    expect(mockImportTournament).toHaveBeenCalledWith(
      expect.anything(),
      fakeData,
      "gen9vgc2025regi"
    );
    // A status write of "completed" must have occurred
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ import_status: "completed" })
    );
    // The "importing" write must include import_started_at so the stale-recovery
    // sweep can reclaim stuck rows via import_started_at < staleThreshold.
    const importingWrite = updateSpy.mock.calls.find(
      ([obj]: [Record<string, unknown>]) => obj.import_status === "importing"
    );
    expect(importingWrite?.[0]).toHaveProperty("import_started_at");
  });

  it("(c) on importTournament error: returns { success:false } and writes non-importing status", async () => {
    mockImportTournament.mockRejectedValue(new Error("fetch failed"));

    const result = await importLimitlessTournament("t1");

    expect(result.success).toBe(false);

    // Assert row NOT left at "importing": all update calls must use a status
    // other than "importing" in the failure write (should be "failed" or "queued")
    const statusWrites = updateSpy.mock.calls
      .map(
        (args: unknown[]) => (args[0] as Record<string, unknown>)?.import_status
      )
      .filter(Boolean);

    // At least one non-"importing" terminal status write must have occurred
    const terminalWrite = statusWrites.find(
      (s) => s === "failed" || s === "queued"
    );
    expect(terminalWrite).toBeDefined();
  });

  it("(d) returns { success:false } without touching the DB when format_id is in SKIP_FORMATS", async () => {
    maybeSingleSpy.mockResolvedValueOnce({
      data: { tournament_id: "t1", format_id: "CUSTOM", import_attempts: 0 },
      error: null,
    });

    const result = await importLimitlessTournament("t1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("CUSTOM");
    expect(mockImportTournament).not.toHaveBeenCalled();
    // Must not write "importing" — no UPDATE should have been called
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("(e) returns { success:false } when the atomic claim finds the row already being imported", async () => {
    // Simulate the claim UPDATE returning null (row had import_status="importing")
    updateSpy.mockImplementation(() => {
      const chain: Record<string, jest.Mock> = {
        eq: jest.fn(),
        not: jest.fn(),
        select: jest.fn().mockImplementation(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
      chain.eq.mockReturnValue(chain);
      chain.not.mockReturnValue(chain);
      return chain;
    });

    const result = await importLimitlessTournament("t1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("already in progress");
    expect(mockImportTournament).not.toHaveBeenCalled();
  });
});
