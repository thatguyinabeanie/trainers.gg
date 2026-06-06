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

import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { syncTournamentList, processImportQueue } from "@/lib/limitless";
import {
  queueTournamentForImport,
  batchQueueTournaments,
  triggerLimitlessSync,
  triggerImportQueue,
} from "../limitless";

const mockGetUserId = getUserId as jest.Mock;
const mockIsSiteAdmin = isSiteAdmin as jest.Mock;
const mockCreateClient = createServiceRoleClient as jest.Mock;
const mockSync = syncTournamentList as jest.Mock;
const mockProcess = processImportQueue as jest.Mock;

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
          select: jest
            .fn()
            .mockResolvedValue({
              data: [{ tournament_id: "t1" }],
              error: null,
            }),
        };

        // queueTournamentForImport needs .select().maybeSingle()
        // Override select to return an object that is both thenable AND has .maybeSingle
        const selectWithMaybeSingle = jest.fn().mockImplementation(() => {
          const p = Promise.resolve({
            data: { tournament_id: "t1" },
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
