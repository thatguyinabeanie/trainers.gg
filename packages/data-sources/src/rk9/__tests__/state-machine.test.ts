/**
 * @jest-environment node
 *
 * Unit tests for the RK9 import state machine.
 * Verifies legal and illegal transitions and the RK9_QUEUEABLE constant.
 */

import { canTransition, RK9_QUEUEABLE } from "../state-machine";
import type { Rk9ImportStatus } from "../state-machine";

// =============================================================================
// canTransition — legal forward transitions
// =============================================================================

describe("canTransition — legal transitions", () => {
  it.each<[Rk9ImportStatus, Rk9ImportStatus]>([
    ["pending", "queued"],
    ["queued", "roster"],
    ["queued", "failed"],
    ["roster", "teams"],
    ["roster", "complete"],
    ["roster", "failed"],
    ["teams", "teams"],
    ["teams", "complete"],
    ["teams", "failed"],
    ["complete", "queued"],
    ["failed", "queued"],
  ])("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });
});

// =============================================================================
// canTransition — illegal transitions
// =============================================================================

describe("canTransition — illegal transitions", () => {
  it.each<[Rk9ImportStatus, Rk9ImportStatus]>([
    // Nothing goes back to pending once queued
    ["queued", "pending"],
    ["roster", "pending"],
    ["teams", "pending"],
    ["complete", "pending"],
    ["failed", "pending"],
    // roster cannot skip to queued (must go via complete/failed then re-queue)
    ["roster", "queued"],
    // teams cannot jump back to roster or queued
    ["teams", "queued"],
    ["teams", "roster"],
    // complete cannot transition to non-queued states
    ["complete", "roster"],
    ["complete", "teams"],
    ["complete", "complete"],
    ["complete", "failed"],
    // failed can only be re-queued
    ["failed", "roster"],
    ["failed", "teams"],
    ["failed", "complete"],
    ["failed", "failed"],
    // pending cannot jump ahead past queued
    ["pending", "roster"],
    ["pending", "teams"],
    ["pending", "complete"],
    ["pending", "failed"],
  ])("rejects %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

// =============================================================================
// RK9_QUEUEABLE constant
// =============================================================================

describe("RK9_QUEUEABLE", () => {
  it("contains exactly 'pending' and 'failed'", () => {
    expect(RK9_QUEUEABLE).toHaveLength(2);
    expect(RK9_QUEUEABLE).toContain("pending");
    expect(RK9_QUEUEABLE).toContain("failed");
  });

  it("does not include in-flight or terminal-without-retry statuses", () => {
    const queueable = RK9_QUEUEABLE as readonly string[];
    expect(queueable).not.toContain("queued");
    expect(queueable).not.toContain("roster");
    expect(queueable).not.toContain("teams");
    expect(queueable).not.toContain("complete");
  });

  it("each queueable status can legally transition to 'queued'", () => {
    for (const status of RK9_QUEUEABLE) {
      expect(canTransition(status, "queued")).toBe(true);
    }
  });
});
