import { applyStage } from "../stage-helpers";

// =============================================================================
// applyStage
// =============================================================================

describe("applyStage", () => {
  describe("stage = 0", () => {
    it("returns base unchanged", () => {
      expect(applyStage(100, 0)).toBe(100);
    });
  });

  describe("positive stages", () => {
    it.each([
      [100, 1, Math.floor((100 * 3) / 2)],  // ×1.5 → 150
      [100, 2, Math.floor((100 * 4) / 2)],  // ×2   → 200
      [100, 6, Math.floor((100 * 8) / 2)],  // ×4   → 400
      [75, 1, Math.floor((75 * 3) / 2)],    // floor: 112
    ])("base=%i stage=+%i → %i", (base, stage, expected) => {
      expect(applyStage(base, stage)).toBe(expected);
    });
  });

  describe("negative stages", () => {
    it.each([
      [100, -1, Math.floor((100 * 2) / 3)],  // ×2/3 → 66
      [100, -2, Math.floor((100 * 2) / 4)],  // ×1/2 → 50
      [100, -6, Math.floor((100 * 2) / 8)],  // ×1/4 → 25
      [75, -1, Math.floor((75 * 2) / 3)],    // floor: 50
    ])("base=%i stage=%i → %i", (base, stage, expected) => {
      expect(applyStage(base, stage)).toBe(expected);
    });
  });
});
