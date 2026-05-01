"use client";

// =============================================================================
// Unit tests for getWorstCaseVerdict — the aggregation logic that bubbles
// the highest-damage KO tier across all 4 move calc outputs in the dockbar.
//
// getVerdict contract (from use-calc-state.ts):
//   minPercent >= 100  → "OHKO"
//   maxPercent >= 50   → "2HKO"
//   maxPercent >= 34   → "3HKO"
//   else               → null
//
// getWorstCaseVerdict contract (from dockbar.tsx):
//   OHKO > 2HKO > 3HKO > null
//   Only OHKO/2HKO/3HKO bubble up; 4HKO+ (verdict = null) never surfaces.
// =============================================================================

import { getWorstCaseVerdict } from "../dock/dockbar";
import { type CalcOutput } from "../../use-calc-state";

// ---------------------------------------------------------------------------
// Helpers — build CalcOutput fixtures that produce a known verdict.
// ---------------------------------------------------------------------------

/** Produces a CalcOutput whose getVerdict() result is "OHKO" (min >= 100). */
function ohko(): CalcOutput {
  return { minPercent: 110, maxPercent: 120, desc: "", rolls: [], defenderMaxHP: 100 };
}

/** Produces a CalcOutput whose getVerdict() result is "2HKO" (max >= 50, min < 100). */
function twoHko(): CalcOutput {
  return { minPercent: 45, maxPercent: 55, desc: "", rolls: [], defenderMaxHP: 100 };
}

/** Produces a CalcOutput whose getVerdict() result is "3HKO" (max >= 34, max < 50). */
function threeHko(): CalcOutput {
  return { minPercent: 30, maxPercent: 40, desc: "", rolls: [], defenderMaxHP: 100 };
}

/** Produces a CalcOutput whose getVerdict() result is null (max < 34, i.e., 4HKO+). */
function fourHkoPlus(): CalcOutput {
  return { minPercent: 10, maxPercent: 25, desc: "", rolls: [], defenderMaxHP: 100 };
}

// =============================================================================
// Tests
// =============================================================================

describe("getWorstCaseVerdict", () => {
  // ---------------------------------------------------------------------------
  // Edge cases — empty / all-null inputs
  // ---------------------------------------------------------------------------

  it("returns null for an empty array", () => {
    expect(getWorstCaseVerdict([])).toBeNull();
  });

  it("returns null when all outputs are null", () => {
    expect(getWorstCaseVerdict([null, null, null, null])).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Single KO tier present
  // ---------------------------------------------------------------------------

  it("returns 'OHKO' when only an OHKO output is present", () => {
    expect(getWorstCaseVerdict([null, null, ohko(), null])).toBe("OHKO");
  });

  it("returns '2HKO' when only a 2HKO output is present", () => {
    expect(getWorstCaseVerdict([null, twoHko(), null, null])).toBe("2HKO");
  });

  it("returns '3HKO' when only a 3HKO output is present", () => {
    expect(getWorstCaseVerdict([threeHko(), null, null, null])).toBe("3HKO");
  });

  // ---------------------------------------------------------------------------
  // 4HKO+ never bubbles up (verdict from getVerdict = null)
  // ---------------------------------------------------------------------------

  it("returns null when only a 4HKO+ output is present", () => {
    // A CalcOutput where maxPercent < 34 → getVerdict returns null.
    expect(getWorstCaseVerdict([null, fourHkoPlus(), null])).toBeNull();
  });

  it("returns null for [null, fourHkoPlus, null]", () => {
    expect(getWorstCaseVerdict([null, fourHkoPlus(), null])).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Ordering / priority
  // ---------------------------------------------------------------------------

  it("returns 'OHKO' when OHKO + 3HKO are present (OHKO wins)", () => {
    expect(getWorstCaseVerdict([null, threeHko(), ohko(), null])).toBe("OHKO");
  });

  it("returns '2HKO' when 3HKO + 2HKO are present (2HKO wins)", () => {
    expect(getWorstCaseVerdict([null, threeHko(), twoHko(), null])).toBe("2HKO");
  });

  it("returns 'OHKO' when all tiers present: [null, 3HKO, OHKO, 2HKO]", () => {
    expect(getWorstCaseVerdict([null, threeHko(), ohko(), twoHko()])).toBe("OHKO");
  });

  // ---------------------------------------------------------------------------
  // 4HKO+ mixed with real KO tiers — 4HKO+ should not degrade the result
  // ---------------------------------------------------------------------------

  it("returns '3HKO' when 4HKO+ and 3HKO are mixed", () => {
    expect(getWorstCaseVerdict([fourHkoPlus(), threeHko(), null, null])).toBe("3HKO");
  });

  it("returns '2HKO' when 4HKO+ and 2HKO are mixed", () => {
    expect(getWorstCaseVerdict([fourHkoPlus(), twoHko(), null, null])).toBe("2HKO");
  });

  // ---------------------------------------------------------------------------
  // Parameterised priority table
  // ---------------------------------------------------------------------------

  it.each([
    ["all null", [null, null, null, null] as const, null],
    ["OHKO only", [ohko(), null, null, null], "OHKO"],
    ["2HKO only", [null, twoHko(), null, null], "2HKO"],
    ["3HKO only", [null, null, threeHko(), null], "3HKO"],
    ["4HKO+ only", [null, fourHkoPlus(), null, null], null],
    ["2HKO > 3HKO", [null, threeHko(), twoHko(), null], "2HKO"],
    ["OHKO > 2HKO", [twoHko(), ohko(), null, null], "OHKO"],
    ["OHKO > 3HKO", [threeHko(), ohko(), null, null], "OHKO"],
  ] as const)(
    "%s → %s",
    (_label, outputs, expected) => {
      expect(getWorstCaseVerdict(outputs as readonly (CalcOutput | null)[])).toBe(expected);
    }
  );
});
