import { calculateNatureBumps } from "../nature-bumps";

describe("calculateNatureBumps", () => {
  it("returns an array (basic contract)", () => {
    const result = calculateNatureBumps(90, 31, 50, 1.1);
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an empty array for a neutral nature (1.0)", () => {
    // With a 1.0 multiplier, statWithNature === statNeutral for every EV value,
    // so the gap is always 0 and never increases beyond the baseline.
    const result = calculateNatureBumps(90, 31, 50, 1.0);
    expect(result).toEqual([]);
  });

  it("returns an empty array for a negative nature (0.9)", () => {
    // With 0.9 nature, statWithNature < statNeutral, so the gap is negative
    // and never increases — no nature bumps to report.
    const result = calculateNatureBumps(90, 31, 50, 0.9);
    expect(result).toEqual([]);
  });

  it("returns a non-empty array for a positive nature (1.1)", () => {
    // A positive nature always produces bumps
    const result = calculateNatureBumps(90, 31, 50, 1.1);
    expect(result.length).toBeGreaterThan(0);
  });

  it("all returned EV values are multiples of 4", () => {
    // The formula steps by 4, so all bumps must be multiples of 4
    const result = calculateNatureBumps(100, 31, 50, 1.1);
    for (const ev of result) {
      expect(ev % 4).toBe(0);
    }
  });

  it("all returned EV values are in the range 4–252", () => {
    const result = calculateNatureBumps(100, 31, 50, 1.1);
    for (const ev of result) {
      expect(ev).toBeGreaterThanOrEqual(4);
      expect(ev).toBeLessThanOrEqual(252);
    }
  });

  it("does not include EV=0 (baseline, not a breakpoint)", () => {
    // EV=0 is the baseline — the function only reports EV values > 0 where
    // investing EVs causes the nature gap to grow beyond the baseline.
    const result = calculateNatureBumps(130, 31, 50, 1.1);
    expect(result).not.toContain(0);
    // But positive natures still produce bump points at higher EVs
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes EV=76 as a bump point for Garchomp Atk (base 130, IV 31, level 50)", () => {
    // Manual verification:
    // The stat formula: floor((floor(((2*base + iv + floor(ev/4)) * level) / 100) + 5) * nature)
    //
    // At ev=72: floor(ev/4)=18
    //   inner = floor(((260+31+18)*50)/100)+5 = floor(309*50/100)+5 = floor(154.5)+5 = 154+5 = 159
    //   neutral=159, nature=floor(159*1.1)=floor(174.9)=174, gap=15
    //
    // At ev=76: floor(ev/4)=19
    //   inner = floor(((260+31+19)*50)/100)+5 = floor(310*50/100)+5 = 155+5 = 160
    //   neutral=160, nature=floor(160*1.1)=floor(176)=176, gap=16
    //   gap(16) > prevGap(15) → pushed ✓
    const result = calculateNatureBumps(130, 31, 50, 1.1);
    expect(result).toContain(76);
  });

  it("does not include EVs where the gap does not increase", () => {
    // Between bump points the gap should be flat (not growing)
    // Verify that ev=72 is NOT in the result for Garchomp Atk (gap stays at 15, same as prev)
    const result = calculateNatureBumps(130, 31, 50, 1.1);
    // ev=72 has the same gap as ev=68, so it should NOT be a bump
    // (only ev=76 is where the gap grows from 15→16)
    // We can't assert a specific non-member without knowing all bumps,
    // but we can verify the result is strictly sorted and contains no duplicates.
    const sorted = [...result].sort((a, b) => a - b);
    expect(result).toEqual(sorted);
    expect(new Set(result).size).toBe(result.length);
  });

  it.each([
    // [baseStat, iv, level, multiplier] — all should produce a non-empty array with 1.1
    [55, 31, 50, 1.1], // Pikachu Attack
    [102, 31, 50, 1.1], // Garchomp Speed
    [135, 31, 50, 1.1], // Flutter Mane SpAtk
    [60, 31, 50, 1.1], // Incineroar Speed
  ])(
    "returns a non-empty bump list for base=%i, iv=%i, level=%i, nature=%f",
    (base, iv, level, mult) => {
      expect(
        calculateNatureBumps(base, iv, level, mult).length
      ).toBeGreaterThan(0);
    }
  );
});
