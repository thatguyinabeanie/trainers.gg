/**
 * Unit tests for calc-display-helpers — spread logic, KO-tier derivation,
 * and display range calculation.
 */

// =============================================================================
// Mocks
// =============================================================================

// getMoveTargetInfo — controlled per test
const mockGetMoveTargetInfo = jest.fn();
jest.mock("../calc/move-target-info", () => ({
  getMoveTargetInfo: (name: string) => mockGetMoveTargetInfo(name),
}));

// getVerdict — real thresholds are tested via getKoTier; stub here to keep
// tests fast and avoid duplicating the verdict logic.
jest.mock("../../use-calc-state", () => ({
  getVerdict: jest.fn((min: number, _max: number) => {
    if (min >= 100) return "OHKO";
    if (min >= 50) return "2HKO";
    if (min >= 34) return "3HKO";
    return null;
  }),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { getDisplayRangeAndKoTier, getKoTier } from "../lanes/calc-display-helpers";

// =============================================================================
// getKoTier
// =============================================================================

describe("getKoTier", () => {
  it("returns '1' for OHKO (min >= 100)", () => {
    expect(getKoTier(100, 120)).toBe("1");
  });

  it("returns '2' for 2HKO (min >= 50)", () => {
    expect(getKoTier(55, 65)).toBe("2");
  });

  it("returns '3' for 3HKO (min >= 34)", () => {
    expect(getKoTier(35, 45)).toBe("3");
  });

  it("returns '4' when maxPct > 0 but no tier matched", () => {
    expect(getKoTier(10, 15)).toBe("4");
  });

  it("returns null when maxPct is 0 (immune / no damage)", () => {
    expect(getKoTier(0, 0)).toBe(null);
  });
});

// =============================================================================
// Spread logic — "all-others" kind
// =============================================================================

describe("getDisplayRangeAndKoTier — spread logic for all-others moves", () => {
  const baseOutput = { minPercent: 40, maxPercent: 50 };

  beforeEach(() => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind: "all-others" });
  });

  it.each([
    // foesAlive | allyAlive | spreadApplied
    [0, false, false], // no targets at all
    [1, false, false], // only 1 foe — not enough
    [0, true, false],  // only ally alive — only 1 target, spread must NOT apply
    [1, true, true],   // ally + 1 foe = 2 targets
    [2, false, true],  // 2 foes
    [2, true, true],   // 2 foes + ally (still spread applies)
  ] as const)(
    "foesAlive=%i allyAlive=%s → spreadApplied=%s",
    (foesAlive, allyAlive, expectedSpread) => {
      const result = getDisplayRangeAndKoTier({
        moveName: "Earthquake",
        output: baseOutput,
        hasCalc: true,
        foesAlive,
        allyAlive,
      });
      expect(result.spreadApplied).toBe(expectedSpread);
    }
  );

  it("applies 0.75 multiplier to min/max when spread fires", () => {
    const result = getDisplayRangeAndKoTier({
      moveName: "Earthquake",
      output: { minPercent: 40, maxPercent: 60 },
      hasCalc: true,
      foesAlive: 2,
      allyAlive: false,
    });
    expect(result.displayMin).toBeCloseTo(30);
    expect(result.displayMax).toBeCloseTo(45);
  });

  it("does NOT apply multiplier when spread does not fire", () => {
    const result = getDisplayRangeAndKoTier({
      moveName: "Earthquake",
      output: { minPercent: 40, maxPercent: 60 },
      hasCalc: true,
      foesAlive: 1,
      allyAlive: false,
    });
    expect(result.displayMin).toBe(40);
    expect(result.displayMax).toBe(60);
  });
});

// =============================================================================
// Spread logic — "all-foes" kind
// =============================================================================

describe("getDisplayRangeAndKoTier — spread logic for all-foes moves", () => {
  beforeEach(() => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind: "all-foes" });
  });

  it("applies spread when foesAlive >= 2", () => {
    const result = getDisplayRangeAndKoTier({
      moveName: "Rock Slide",
      output: { minPercent: 40, maxPercent: 50 },
      hasCalc: true,
      foesAlive: 2,
      allyAlive: false,
    });
    expect(result.spreadApplied).toBe(true);
  });

  it("does NOT apply spread when foesAlive < 2 (ally doesn't count)", () => {
    const result = getDisplayRangeAndKoTier({
      moveName: "Rock Slide",
      output: { minPercent: 40, maxPercent: 50 },
      hasCalc: true,
      foesAlive: 1,
      allyAlive: true, // ally alive but all-foes only counts foe slots
    });
    expect(result.spreadApplied).toBe(false);
  });
});

// =============================================================================
// Non-spread move
// =============================================================================

describe("getDisplayRangeAndKoTier — non-spread move", () => {
  it("never applies spread regardless of alive counts", () => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: false, kind: "selected-foe" });
    const result = getDisplayRangeAndKoTier({
      moveName: "Thunderbolt",
      output: { minPercent: 40, maxPercent: 50 },
      hasCalc: true,
      foesAlive: 2,
      allyAlive: true,
    });
    expect(result.spreadApplied).toBe(false);
    expect(result.displayMin).toBe(40);
    expect(result.displayMax).toBe(50);
  });
});

// =============================================================================
// hasCalc = false
// =============================================================================

describe("getDisplayRangeAndKoTier — hasCalc=false", () => {
  it("returns null koTier when hasCalc is false", () => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: false, kind: "selected-foe" });
    const result = getDisplayRangeAndKoTier({
      moveName: "Thunderbolt",
      output: { minPercent: 100, maxPercent: 120 },
      hasCalc: false,
      foesAlive: 2,
      allyAlive: false,
    });
    expect(result.koTier).toBe(null);
  });
});

// =============================================================================
// output = null
// =============================================================================

describe("getDisplayRangeAndKoTier — output=null", () => {
  it("returns 0 for displayMin/displayMax when output is null", () => {
    mockGetMoveTargetInfo.mockReturnValue(null);
    const result = getDisplayRangeAndKoTier({
      moveName: null,
      output: null,
      hasCalc: false,
      foesAlive: 0,
      allyAlive: false,
    });
    expect(result.displayMin).toBe(0);
    expect(result.displayMax).toBe(0);
    expect(result.koTier).toBe(null);
  });
});
