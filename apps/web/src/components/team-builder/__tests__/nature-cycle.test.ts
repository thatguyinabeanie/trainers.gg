/**
 * Unit tests for nature-cycle.ts — the shared helpers extracted from
 * stats-lane.tsx (computeNatureForSuffix) and calc-defender-stats.tsx
 * (cycleNature). Pure module, no React.
 */

import { NATURE_EFFECTS } from "@trainers/pokemon";

import {
  ALL_NATURE_STATS,
  DEFAULT_BOOST_FOR_REDUCE,
  DEFAULT_REDUCE_FOR_BOOST,
  NEUTRAL_NATURE,
  SHORT_TO_LONG,
  computeNatureForSuffix,
  cycleNature,
  findNatureFor,
  pickFreshPartner,
} from "../nature-cycle";

// =============================================================================
// NEUTRAL_NATURE
// =============================================================================

describe("NEUTRAL_NATURE", () => {
  it("is 'Serious'", () => {
    expect(NEUTRAL_NATURE).toBe("Serious");
  });

  it("exists in NATURE_EFFECTS and has no boost/reduce", () => {
    expect(NATURE_EFFECTS[NEUTRAL_NATURE]).toBeDefined();
    const eff = NATURE_EFFECTS[NEUTRAL_NATURE]!;
    expect(eff.boost).toBeUndefined();
    expect(eff.reduce).toBeUndefined();
  });
});

// =============================================================================
// DEFAULT partner maps
// =============================================================================

describe("DEFAULT_REDUCE_FOR_BOOST", () => {
  it.each([
    ["attack", "specialAttack", "Adamant"],
    ["defense", "specialAttack", "Impish"],
    ["specialAttack", "attack", "Modest"],
    ["specialDefense", "attack", "Calm"],
    ["speed", "specialAttack", "Jolly"],
  ] as const)(
    "%s → reduces %s (resulting in %s)",
    (boostStat, expectedReduceStat, expectedNature) => {
      expect(DEFAULT_REDUCE_FOR_BOOST[boostStat]).toBe(expectedReduceStat);
      // Verify the named nature actually matches boost/reduce
      const eff = NATURE_EFFECTS[expectedNature];
      expect(eff?.boost).toBe(boostStat);
      expect(eff?.reduce).toBe(expectedReduceStat);
    }
  );
});

describe("DEFAULT_BOOST_FOR_REDUCE", () => {
  it.each([
    ["attack", "specialAttack"], // → Modest (−Atk)
    ["defense", "specialAttack"], // → Mild (−Def)
    ["specialAttack", "attack"], // → Adamant (−SpA)
    ["specialDefense", "attack"], // → Naughty (−SpD)
    ["speed", "attack"], // → Brave (−Spe)
  ] as const)(
    "%s reduced → default boost is %s",
    (reduceStat, expectedBoostStat) => {
      expect(DEFAULT_BOOST_FOR_REDUCE[reduceStat]).toBe(expectedBoostStat);
    }
  );
});

describe("SHORT_TO_LONG", () => {
  it.each([
    ["atk", "attack"],
    ["def", "defense"],
    ["spa", "specialAttack"],
    ["spd", "specialDefense"],
    ["spe", "speed"],
  ] as const)("%s → %s", (short, long) => {
    expect(SHORT_TO_LONG[short]).toBe(long);
  });

  it("covers all 5 non-HP battle stats", () => {
    expect(Object.keys(SHORT_TO_LONG)).toHaveLength(5);
  });
});

// =============================================================================
// findNatureFor
// =============================================================================

describe("findNatureFor", () => {
  it.each([
    ["attack", "specialAttack", "Adamant"],
    ["specialAttack", "attack", "Modest"],
    ["speed", "specialAttack", "Jolly"],
    ["speed", "attack", "Timid"],
    ["defense", "attack", "Bold"],
  ] as const)("findNatureFor(%s, %s) → %s", (boost, reduce, expectedNature) => {
    expect(findNatureFor(boost, reduce)).toBe(expectedNature);
  });

  it("returns null when no nature matches the given boost/reduce pair", () => {
    // A nature can't boost and reduce the same stat
    expect(findNatureFor("attack", "attack")).toBeNull();
  });
});

// =============================================================================
// pickFreshPartner
// =============================================================================

describe("pickFreshPartner", () => {
  it("returns the default when it does not conflict with avoid", () => {
    // Default for +attack is specialAttack; avoid = defense → no conflict
    expect(
      pickFreshPartner("attack", "defense", DEFAULT_REDUCE_FOR_BOOST)
    ).toBe("specialAttack");
  });

  it("falls back to another stat when the default IS the avoid target", () => {
    // Default for +attack is specialAttack; if we must avoid specialAttack,
    // it should pick something else (not attack itself, not specialAttack)
    const result = pickFreshPartner(
      "attack",
      "specialAttack",
      DEFAULT_REDUCE_FOR_BOOST
    );
    expect(result).not.toBe("attack"); // can't boost and reduce same stat
    expect(result).not.toBe("specialAttack"); // this is the avoided one
    expect(ALL_NATURE_STATS).toContain(result); // must be a valid stat
  });

  it("handles null avoid (no conflict possible) — returns default", () => {
    expect(pickFreshPartner("speed", null, DEFAULT_REDUCE_FOR_BOOST)).toBe(
      "specialAttack"
    ); // Jolly default
  });
});

// =============================================================================
// computeNatureForSuffix
// =============================================================================

describe("computeNatureForSuffix", () => {
  // ---------------------------------------------------------------------------
  // HP always returns null
  // ---------------------------------------------------------------------------
  it.each(["+", "-", null] as const)(
    "returns null for HP regardless of suffix '%s'",
    (suffix) => {
      expect(
        computeNatureForSuffix({
          currentNature: "Hardy",
          statKey: "hp",
          suffix,
        })
      ).toBeNull();
    }
  );

  // ---------------------------------------------------------------------------
  // suffix === "+"
  // ---------------------------------------------------------------------------
  describe("suffix='+'", () => {
    it("sets a boosting nature with fresh − partner when starting from neutral (Hardy)", () => {
      // +attack from neutral → Adamant (+Atk/−SpA)
      const result = computeNatureForSuffix({
        currentNature: "Hardy",
        statKey: "attack",
        suffix: "+",
      });
      expect(result).toBe("Adamant");
    });

    it.each([
      ["attack", "Adamant"], // +Atk (default partner −SpA)
      ["defense", "Impish"], // +Def (default partner −SpA)
      ["specialAttack", "Modest"], // +SpA (default partner −Atk)
      ["specialDefense", "Calm"], // +SpD (default partner −Atk)
      ["speed", "Jolly"], // +Spe (default partner −SpA)
    ] as const)("Hardy + suffix='+' on %s → %s", (stat, expectedNature) => {
      const result = computeNatureForSuffix({
        currentNature: "Hardy",
        statKey: stat,
        suffix: "+",
      });
      expect(result).toBe(expectedNature);
    });

    it("returns null when the stat is already the boost stat (no change needed)", () => {
      // Adamant already boosts attack — applying '+' to attack is a no-op
      expect(
        computeNatureForSuffix({
          currentNature: "Adamant",
          statKey: "attack",
          suffix: "+",
        })
      ).toBeNull();
    });

    it("keeps the existing − partner when adding + to a neutral stat (no conflict)", () => {
      // Jolly = +Spe / −SpA. Apply '+' to defense (neutral, no conflict with −SpA).
      // Result should keep −SpA → Impish (+Def/−SpA)
      const result = computeNatureForSuffix({
        currentNature: "Jolly",
        statKey: "defense",
        suffix: "+",
      });
      const eff = NATURE_EFFECTS[result!];
      expect(eff?.boost).toBe("defense");
      expect(eff?.reduce).toBe("specialAttack");
    });

    it("picks a fresh − partner when adding + to the currently-reduced stat (avoids flip)", () => {
      // Modest = +SpA / −Atk. Apply '+' to attack (currently −Atk).
      // Must NOT produce Adamant (+Atk/−SpA) — that would make SpA reduced,
      // which is a flip of the old boost. Instead pick a partner ≠ SpA.
      const result = computeNatureForSuffix({
        currentNature: "Modest",
        statKey: "attack",
        suffix: "+",
      });
      const eff = NATURE_EFFECTS[result!];
      expect(eff?.boost).toBe("attack");
      expect(eff?.reduce).not.toBe("specialAttack"); // no-flip assertion
    });
  });

  // ---------------------------------------------------------------------------
  // suffix === "-"
  // ---------------------------------------------------------------------------
  describe("suffix='-'", () => {
    it.each([
      // Starting from Hardy (neutral): reduce stat → pick a default boost partner
      ["attack", "specialAttack", "Modest"], // −Atk, default +SpA
      ["specialAttack", "attack", "Adamant"], // −SpA, default +Atk
      ["speed", "attack", "Brave"], // −Spe, default +Atk
    ] as const)(
      "Hardy + suffix='-' on %s → boost %s → %s",
      (stat, _boostStat, expectedNature) => {
        const result = computeNatureForSuffix({
          currentNature: "Hardy",
          statKey: stat,
          suffix: "-",
        });
        expect(result).toBe(expectedNature);
      }
    );

    it("returns null when the stat is already the reduce stat (no change needed)", () => {
      // Adamant already reduces specialAttack — applying '-' is a no-op
      expect(
        computeNatureForSuffix({
          currentNature: "Adamant",
          statKey: "specialAttack",
          suffix: "-",
        })
      ).toBeNull();
    });

    it("keeps the existing + partner when adding - to a neutral stat", () => {
      // Adamant = +Atk / −SpA. Apply '-' to defense (neutral, no conflict with +Atk).
      // Result keeps +Atk → Lonely (+Atk/−Def)
      const result = computeNatureForSuffix({
        currentNature: "Adamant",
        statKey: "defense",
        suffix: "-",
      });
      const eff = NATURE_EFFECTS[result!];
      expect(eff?.boost).toBe("attack");
      expect(eff?.reduce).toBe("defense");
    });

    it("picks a fresh + partner when reducing the currently-boosted stat", () => {
      // Adamant = +Atk / −SpA. Apply '-' to attack (currently +Atk).
      // Must NOT produce Modest (+SpA/−Atk) — that would make SpA boosted,
      // i.e. a flip. Instead pick a boost partner ≠ SpA.
      const result = computeNatureForSuffix({
        currentNature: "Adamant",
        statKey: "attack",
        suffix: "-",
      });
      const eff = NATURE_EFFECTS[result!];
      expect(eff?.reduce).toBe("attack");
      expect(eff?.boost).not.toBe("specialAttack"); // no-flip assertion
    });
  });

  // ---------------------------------------------------------------------------
  // suffix === null (clear modifier)
  // ---------------------------------------------------------------------------
  describe("suffix=null (clear)", () => {
    it("returns NEUTRAL_NATURE when clearing the currently-boosted stat", () => {
      // Adamant boosts attack — clearing '+' on attack → Serious
      expect(
        computeNatureForSuffix({
          currentNature: "Adamant",
          statKey: "attack",
          suffix: null,
        })
      ).toBe(NEUTRAL_NATURE);
    });

    it("returns NEUTRAL_NATURE when clearing the currently-reduced stat", () => {
      // Adamant reduces specialAttack — clearing '-' on specialAttack → Serious
      expect(
        computeNatureForSuffix({
          currentNature: "Adamant",
          statKey: "specialAttack",
          suffix: null,
        })
      ).toBe(NEUTRAL_NATURE);
    });

    it("returns null when the stat has no nature modifier (already neutral)", () => {
      // Hardy is already neutral; clearing '+' on defense is a no-op
      expect(
        computeNatureForSuffix({
          currentNature: "Hardy",
          statKey: "defense",
          suffix: null,
        })
      ).toBeNull();
    });

    it("returns null when clearing a stat that is neither boosted nor reduced", () => {
      // Adamant = +Atk/−SpA. Clearing '+' on defense (not involved) → null
      expect(
        computeNatureForSuffix({
          currentNature: "Adamant",
          statKey: "defense",
          suffix: null,
        })
      ).toBeNull();
    });
  });
});

// =============================================================================
// cycleNature
// =============================================================================

describe("cycleNature", () => {
  // ---------------------------------------------------------------------------
  // HP always returns null
  // ---------------------------------------------------------------------------
  it("returns null for 'hp' (long key)", () => {
    expect(cycleNature("Hardy", "hp")).toBeNull();
  });

  // No short key for HP — 'hp' is both the long key and what the stat map uses
  it("returns null when statKey='hp' regardless of current nature", () => {
    expect(cycleNature("Adamant", "hp")).toBeNull();
    expect(cycleNature("Serious", "hp")).toBeNull();
  });

  it("returns null for an unrecognized stat key", () => {
    expect(cycleNature("Hardy", "unknown_stat")).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Short key normalization
  // ---------------------------------------------------------------------------
  describe("short key support", () => {
    it.each([
      // From neutral (Hardy) via short key → should produce a boosting nature
      ["atk", "Hardy", "attack"],
      ["def", "Hardy", "defense"],
      ["spa", "Hardy", "specialAttack"],
      ["spd", "Hardy", "specialDefense"],
      ["spe", "Hardy", "speed"],
    ] as const)(
      "short key '%s' from Hardy → produces a +%s nature",
      (shortKey, currentNature, expectedBoost) => {
        const result = cycleNature(currentNature, shortKey);
        expect(result).not.toBeNull();
        const eff = NATURE_EFFECTS[result!];
        expect(eff?.boost).toBe(expectedBoost);
      }
    );

    it.each([
      ["atk", "Adamant"],
      ["spa", "Modest"],
      ["spe", "Jolly"],
    ] as const)(
      "short key '%s' produces the same result as the long key",
      (shortKey, currentNature) => {
        const longKey = SHORT_TO_LONG[shortKey]!;
        const viaShort = cycleNature(currentNature, shortKey);
        const viaLong = cycleNature(currentNature, longKey);
        expect(viaShort).toBe(viaLong);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Cycle: neutral → boosted → reduced → neutral
  // ---------------------------------------------------------------------------
  describe("neutral → boosted", () => {
    it("from Hardy (neutral), cycling attack → Adamant (+Atk/−SpA)", () => {
      const result = cycleNature("Hardy", "attack");
      expect(result).toBe("Adamant");
    });

    it.each([
      ["attack", "Hardy", "Adamant"],
      ["specialAttack", "Hardy", "Modest"],
      ["speed", "Hardy", "Jolly"],
      ["defense", "Hardy", "Impish"],
      ["specialDefense", "Hardy", "Calm"],
    ] as const)(
      "Hardy + cycleNature(%s) → %s (default boost nature)",
      (stat, currentNature, expectedNature) => {
        expect(cycleNature(currentNature, stat)).toBe(expectedNature);
      }
    );
  });

  describe("boosted → reduced", () => {
    it("from Adamant (+Atk/−SpA), cycling attack → a −Atk nature", () => {
      // Adamant has +Atk; cycling Atk again switches to −Atk
      const result = cycleNature("Adamant", "attack");
      expect(result).not.toBeNull();
      const eff = NATURE_EFFECTS[result!];
      expect(eff?.reduce).toBe("attack");
    });

    it("from Jolly (+Spe/−SpA), cycling speed → a −Spe nature", () => {
      const result = cycleNature("Jolly", "speed");
      expect(result).not.toBeNull();
      const eff = NATURE_EFFECTS[result!];
      expect(eff?.reduce).toBe("speed");
    });
  });

  describe("reduced → neutral", () => {
    it("from Adamant (+Atk/−SpA), cycling specialAttack → Serious", () => {
      // specialAttack is the reduced stat in Adamant; cycling it clears to neutral
      expect(cycleNature("Adamant", "specialAttack")).toBe(NEUTRAL_NATURE);
    });

    it("from Modest (+SpA/−Atk), cycling attack → Serious", () => {
      expect(cycleNature("Modest", "attack")).toBe(NEUTRAL_NATURE);
    });

    it("from Timid (+Spe/−Atk), cycling attack → Serious", () => {
      expect(cycleNature("Timid", "attack")).toBe(NEUTRAL_NATURE);
    });
  });

  // ---------------------------------------------------------------------------
  // Long keys directly
  // ---------------------------------------------------------------------------
  describe("long key support", () => {
    it("accepts 'attack' (long) and produces the same result as 'atk' (short)", () => {
      const viaLong = cycleNature("Hardy", "attack");
      const viaShort = cycleNature("Hardy", "atk");
      expect(viaLong).toBe(viaShort);
    });

    it("accepts 'specialAttack' (long) and produces the same result as 'spa' (short)", () => {
      const viaLong = cycleNature("Hardy", "specialAttack");
      const viaShort = cycleNature("Hardy", "spa");
      expect(viaLong).toBe(viaShort);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge: cycling a neutral stat on a non-neutral nature
  // ---------------------------------------------------------------------------
  it("cycling a neutral stat (defense) on Adamant (+Atk/−SpA) → +Def, keeps existing −SpA", () => {
    // defense is neither boosted nor reduced in Adamant → goes to boosted
    const result = cycleNature("Adamant", "defense");
    expect(result).not.toBeNull();
    const eff = NATURE_EFFECTS[result!];
    expect(eff?.boost).toBe("defense");
    // Should keep the existing −SpA partner since it doesn't conflict
    expect(eff?.reduce).toBe("specialAttack");
  });
});
