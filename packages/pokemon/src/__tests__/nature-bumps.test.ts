import { findStatBreakpoints } from "../nature-bumps";
import { type FindStatBreakpointsArgs } from "../nature-bumps";

/** Shared VGC base args (non-HP, neutral nature) */
function vgcArgs(
  overrides: Partial<FindStatBreakpointsArgs> = {}
): FindStatBreakpointsArgs {
  return {
    statKey: "attack",
    base: 100,
    iv: 31,
    level: 50,
    natureMultiplier: 1.0,
    perStatMax: 252,
    step: 4,
    isChampions: false,
    ...overrides,
  };
}

/** Shared Champions base args (non-HP, neutral nature) */
function champArgs(
  overrides: Partial<FindStatBreakpointsArgs> = {}
): FindStatBreakpointsArgs {
  return {
    statKey: "attack",
    base: 100,
    iv: 0,
    level: 50,
    natureMultiplier: 1.0,
    perStatMax: 32,
    step: 1,
    isChampions: true,
    ...overrides,
  };
}

describe("findStatBreakpoints", () => {
  // -------------------------------------------------------------------------
  // 1. Basic contract
  // -------------------------------------------------------------------------
  it("returns an array (basic contract)", () => {
    const result = findStatBreakpoints(
      champArgs({ statKey: "attack", base: 100, natureMultiplier: 1.1 })
    );
    expect(Array.isArray(result)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. VGC neutral non-HP stat — all breakpoints are multiples of 4 within range
  // -------------------------------------------------------------------------
  it("VGC neutral non-HP stat returns multiples of 4 within [4, 252]", () => {
    const result = findStatBreakpoints(
      vgcArgs({ base: 100, iv: 31, level: 50, natureMultiplier: 1.0 })
    );
    for (const ev of result) {
      expect(ev % 4).toBe(0);
      expect(ev).toBeGreaterThanOrEqual(4);
      expect(ev).toBeLessThanOrEqual(252);
    }
  });

  // -------------------------------------------------------------------------
  // 3. VGC +nature non-HP stat (Garchomp Atk base 130)
  // -------------------------------------------------------------------------
  it("VGC +nature stat (Garchomp Atk) is non-empty, strictly increasing, multiples of 4", () => {
    const result = findStatBreakpoints(
      vgcArgs({ base: 130, iv: 31, level: 50, natureMultiplier: 1.1 })
    );

    expect(result.length).toBeGreaterThan(0);

    // Strictly increasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]!);
    }

    // All multiples of 4
    for (const ev of result) {
      expect(ev % 4).toBe(0);
    }
  });

  // -------------------------------------------------------------------------
  // 4. VGC HP (Garchomp HP base 108)
  // -------------------------------------------------------------------------
  it("VGC HP (Garchomp HP) is non-empty and strictly increasing", () => {
    const result = findStatBreakpoints(
      vgcArgs({ statKey: "hp", base: 108, iv: 31, level: 50 })
    );

    expect(result.length).toBeGreaterThan(0);

    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]!);
    }
  });

  // -------------------------------------------------------------------------
  // 5. VGC HP ignores natureMultiplier (HP formula skips nature)
  // -------------------------------------------------------------------------
  it("VGC HP ignores natureMultiplier — results are identical for 1.0 and 1.1", () => {
    const neutral = findStatBreakpoints(
      vgcArgs({ statKey: "hp", base: 108, iv: 31, level: 50, natureMultiplier: 1.0 })
    );
    const boosted = findStatBreakpoints(
      vgcArgs({ statKey: "hp", base: 108, iv: 31, level: 50, natureMultiplier: 1.1 })
    );

    expect(neutral).toEqual(boosted);
  });

  // -------------------------------------------------------------------------
  // 6. Champions +nature non-HP stat (Garchomp Atk base 130)
  // -------------------------------------------------------------------------
  it("Champions +nature stat (Garchomp Atk) is non-empty, in [1, 32], strictly increasing", () => {
    const result = findStatBreakpoints(
      champArgs({ base: 130, iv: 0, level: 50, natureMultiplier: 1.1 })
    );

    expect(result.length).toBeGreaterThan(0);

    for (const sp of result) {
      expect(sp).toBeGreaterThanOrEqual(1);
      expect(sp).toBeLessThanOrEqual(32);
    }

    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]!);
    }
  });

  // -------------------------------------------------------------------------
  // 7. Champions HP (Garchomp HP base 108)
  // -------------------------------------------------------------------------
  it("Champions HP (base 108) is non-empty and each entry is in [1, 32]", () => {
    const result = findStatBreakpoints(
      champArgs({ statKey: "hp", base: 108, iv: 0, level: 50, natureMultiplier: 1.0 })
    );

    expect(result.length).toBeGreaterThan(0);

    for (const sp of result) {
      expect(sp).toBeGreaterThanOrEqual(1);
      expect(sp).toBeLessThanOrEqual(32);
    }
  });

  // -------------------------------------------------------------------------
  // 8. Champions Shedinja-equivalent (HP base=1) — formula caps at HP=1, no breakpoints
  // -------------------------------------------------------------------------
  it("Champions HP base=1 (Shedinja-equivalent) returns empty array", () => {
    const result = findStatBreakpoints(
      champArgs({ statKey: "hp", base: 1, iv: 0, level: 50, natureMultiplier: 1.0 })
    );

    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 9. Empty array for impossible inputs (perStatMax=0)
  // -------------------------------------------------------------------------
  it("returns empty array when perStatMax=0", () => {
    const result = findStatBreakpoints(
      vgcArgs({ base: 100, perStatMax: 0, step: 4 })
    );

    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 10. it.each parametrize — common base stats, VGC mode, non-empty + strictly increasing
  // -------------------------------------------------------------------------
  it.each([
    ["Pikachu Atk", 55, "attack"],
    ["Flutter Mane SpAtk", 135, "specialAttack"],
    ["Garchomp Atk", 130, "attack"],
    ["Incineroar Speed", 60, "speed"],
  ] as const)(
    "%s (base %i) returns non-empty strictly increasing breakpoints in VGC mode",
    (_label, base, statKey) => {
      const result = findStatBreakpoints(
        vgcArgs({ base, statKey, iv: 31, level: 50, natureMultiplier: 1.1 })
      );

      expect(result.length).toBeGreaterThan(0);

      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThan(result[i - 1]!);
      }
    }
  );
});
