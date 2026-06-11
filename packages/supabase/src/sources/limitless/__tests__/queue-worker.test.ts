/**
 * @jest-environment node
 *
 * Tests for drainLimitlessQueue — the Limitless queue drain loop in queue-worker.ts.
 *
 * IMPORTANT: Every test whose mock sequence does not immediately break must
 * ensure the final fallback `mockResolvedValue` returns `remaining: 0`.
 * If a break condition is never satisfied, `while (Date.now() < deadline)`
 * loops until Jest's timeout — a 60-second hang.
 */

import type * as ImportModule from "../import";

// =============================================================================
// Mock declarations — before imports (Jest hoisting)
// =============================================================================

const mockProcessImportQueue = jest.fn();
jest.mock("../import", () => ({
  ...jest.requireActual<typeof ImportModule>("../import"),
  processImportQueue: (...args: unknown[]) => mockProcessImportQueue(...args),
}));

// =============================================================================
// Imports — after mocks
// =============================================================================

import { drainLimitlessQueue } from "../queue-worker";

// =============================================================================
// Helpers
// =============================================================================

/** A minimal supabase stub — drainLimitlessQueue passes it straight to
 * processImportQueue, which is fully mocked. */
const fakeSupabase = {} as never;
const FUTURE_DEADLINE = () => Date.now() + 60_000;
const PAST_DEADLINE = () => Date.now() - 1;

// =============================================================================
// beforeEach
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  // Safe default: nothing in the queue.
  mockProcessImportQueue.mockResolvedValue({
    totalProcessed: 0,
    totalErrors: 0,
    remaining: 0,
  });
});

// =============================================================================
// Tests
// =============================================================================

describe("drainLimitlessQueue", () => {
  // ---------------------------------------------------------------------------
  // 1. Deadline already past — loop guard fires before first call
  // ---------------------------------------------------------------------------
  describe("deadline already past", () => {
    it("returns all-zero stats and does not call processImportQueue", async () => {
      const result = await drainLimitlessQueue(
        fakeSupabase,
        "api-key",
        20,
        PAST_DEADLINE()
      );

      expect(mockProcessImportQueue).not.toHaveBeenCalled();
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.passes).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Drains to empty on first pass (remaining === 0)
  // ---------------------------------------------------------------------------
  describe("drains to empty in one pass", () => {
    it("returns correct stats and stops after remaining hits 0", async () => {
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 10,
        totalErrors: 2,
        remaining: 0,
      });

      const result = await drainLimitlessQueue(
        fakeSupabase,
        "api-key",
        20,
        FUTURE_DEADLINE()
      );

      expect(mockProcessImportQueue).toHaveBeenCalledTimes(1);
      expect(result.processed).toBe(10);
      expect(result.errors).toBe(2);
      expect(result.remaining).toBe(0);
      expect(result.passes).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. No-progress stop — totalProcessed === 0 with remaining > 0
  // ---------------------------------------------------------------------------
  describe("no-progress stop", () => {
    it("stops after first pass when totalProcessed is 0 but remaining > 0", async () => {
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 0,
        totalErrors: 0,
        remaining: 5,
      });
      // Fallback must still break to be safe — remaining: 0
      mockProcessImportQueue.mockResolvedValue({
        totalProcessed: 0,
        totalErrors: 0,
        remaining: 0,
      });

      const result = await drainLimitlessQueue(
        fakeSupabase,
        "api-key",
        20,
        FUTURE_DEADLINE()
      );

      // Should stop after one pass (no-progress guard fires)
      expect(mockProcessImportQueue).toHaveBeenCalledTimes(1);
      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(5);
      expect(result.passes).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. All-failure stop — totalErrors === totalProcessed (and > 0)
  // ---------------------------------------------------------------------------
  describe("all-failure stop", () => {
    it("stops after a pass where every processed item errored", async () => {
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 5,
        totalErrors: 5, // all failures
        remaining: 10,
      });
      // Fallback: safe break
      mockProcessImportQueue.mockResolvedValue({
        totalProcessed: 0,
        totalErrors: 0,
        remaining: 0,
      });

      const result = await drainLimitlessQueue(
        fakeSupabase,
        undefined,
        20,
        FUTURE_DEADLINE()
      );

      expect(mockProcessImportQueue).toHaveBeenCalledTimes(1);
      expect(result.processed).toBe(5);
      expect(result.errors).toBe(5);
      expect(result.remaining).toBe(10);
      expect(result.passes).toBe(1);
    });

    it("does not stop when only some items errored (partial failure)", async () => {
      // pass 1: 3 processed, 2 errors — not all failures → continue
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 3,
        totalErrors: 2,
        remaining: 5,
      });
      // pass 2: remaining → 0 → break
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 5,
        totalErrors: 0,
        remaining: 0,
      });

      const result = await drainLimitlessQueue(
        fakeSupabase,
        "api-key",
        20,
        FUTURE_DEADLINE()
      );

      expect(mockProcessImportQueue).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(8);
      expect(result.errors).toBe(2);
      expect(result.remaining).toBe(0);
      expect(result.passes).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Accumulates across multiple passes
  // ---------------------------------------------------------------------------
  describe("multi-pass accumulation", () => {
    it("sums processed and errors across passes and returns last remaining", async () => {
      // pass 1: progress made, not all failures, remaining > 0 → continue
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 5,
        totalErrors: 1,
        remaining: 10,
      });
      // pass 2: drains to empty → break
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 3,
        totalErrors: 0,
        remaining: 0,
      });

      const result = await drainLimitlessQueue(
        fakeSupabase,
        "api-key",
        20,
        FUTURE_DEADLINE()
      );

      expect(mockProcessImportQueue).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(8); // 5 + 3
      expect(result.errors).toBe(1); // 1 + 0
      expect(result.remaining).toBe(0); // last pass
      expect(result.passes).toBe(2);
    });

    it("passes supabase, apiKey, and batchSize through to processImportQueue", async () => {
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 1,
        totalErrors: 0,
        remaining: 0,
      });

      const supabase = { client: "mock" } as never;
      await drainLimitlessQueue(supabase, "my-api-key", 42, FUTURE_DEADLINE());

      expect(mockProcessImportQueue).toHaveBeenCalledWith(
        supabase,
        "my-api-key",
        42
      );
    });

    it("works without an apiKey (undefined)", async () => {
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 2,
        totalErrors: 0,
        remaining: 0,
      });

      const result = await drainLimitlessQueue(
        fakeSupabase,
        undefined,
        20,
        FUTURE_DEADLINE()
      );

      expect(mockProcessImportQueue).toHaveBeenCalledWith(
        fakeSupabase,
        undefined,
        20
      );
      expect(result.processed).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Remaining value comes from the last pass
  // ---------------------------------------------------------------------------
  describe("remaining from last pass", () => {
    it("reports the remaining count from the final pass (not accumulated)", async () => {
      // pass 1: remaining 10
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 5,
        totalErrors: 0,
        remaining: 10,
      });
      // pass 2: no-progress stop with remaining 7
      mockProcessImportQueue.mockResolvedValueOnce({
        totalProcessed: 0,
        totalErrors: 0,
        remaining: 7,
      });

      const result = await drainLimitlessQueue(
        fakeSupabase,
        "api-key",
        20,
        FUTURE_DEADLINE()
      );

      // remaining is overwritten each pass — should be from pass 2
      expect(result.remaining).toBe(7);
    });
  });
});
