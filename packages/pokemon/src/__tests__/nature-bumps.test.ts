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
  // 2. Neutral nature returns [] — only +nature has bonus breakpoints
  // -------------------------------------------------------------------------
  it("VGC neutral non-HP stat returns []", () => {
    const result = findStatBreakpoints(
      vgcArgs({ base: 100, iv: 31, level: 50, natureMultiplier: 1.0 })
    );
    expect(result).toEqual([]);
  });

  it("VGC −nature non-HP stat returns []", () => {
    const result = findStatBreakpoints(
      vgcArgs({ base: 100, iv: 31, level: 50, natureMultiplier: 0.9 })
    );
    expect(result).toEqual([]);
  });

  it("Champions neutral non-HP stat returns []", () => {
    const result = findStatBreakpoints(
      champArgs({ base: 100, natureMultiplier: 1.0 })
    );
    expect(result).toEqual([]);
  });

  it("Champions −nature non-HP stat returns []", () => {
    const result = findStatBreakpoints(
      champArgs({ base: 100, natureMultiplier: 0.9 })
    );
    expect(result).toEqual([]);
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
  // 4. HP always returns [] regardless of nature (HP doesn't apply nature)
  // -------------------------------------------------------------------------
  it("VGC HP returns [] for any natureMultiplier", () => {
    const neutral = findStatBreakpoints(
      vgcArgs({ statKey: "hp", base: 108, iv: 31, level: 50, natureMultiplier: 1.0 })
    );
    const boosted = findStatBreakpoints(
      vgcArgs({ statKey: "hp", base: 108, iv: 31, level: 50, natureMultiplier: 1.1 })
    );
    expect(neutral).toEqual([]);
    expect(boosted).toEqual([]);
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
  // 7. Champions HP returns [] for any nature
  // -------------------------------------------------------------------------
  it("Champions HP returns [] for any natureMultiplier", () => {
    const neutral = findStatBreakpoints(
      champArgs({ statKey: "hp", base: 108, natureMultiplier: 1.0 })
    );
    const boosted = findStatBreakpoints(
      champArgs({ statKey: "hp", base: 108, natureMultiplier: 1.1 })
    );
    expect(neutral).toEqual([]);
    expect(boosted).toEqual([]);
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
