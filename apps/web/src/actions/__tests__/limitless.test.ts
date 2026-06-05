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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserId.mockResolvedValue("user-1");
  mockIsSiteAdmin.mockResolvedValue(true);
  mockCreateClient.mockReturnValue({
    schema: () => ({
      from: () => {
        const chain = {
          update: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: [{ tournament_id: "t1" }], error: null }),
          }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
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
});

describe("batchQueueTournaments", () => {
  it("queues multiple tournaments", async () => {
    const result = await batchQueueTournaments(["t1", "t2"]);
    expect(result.success).toBe(true);
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
