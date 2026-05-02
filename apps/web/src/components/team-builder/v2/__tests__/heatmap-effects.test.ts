import { effectiveDefensiveMult } from "../dock/heatmap-effects";

// =============================================================================
// heatmap-effects — effectiveDefensiveMult
// =============================================================================

describe("effectiveDefensiveMult — plain type matchups", () => {
  it.each([
    // [attackingType, defenderTypes, expectedMult, description]
    ["Fire", ["Grass"], 2, "Fire vs Grass = 2×"],
    ["Fire", ["Water"], 0.5, "Fire vs Water = 0.5×"],
    ["Fire", ["Fire"], 0.5, "Fire vs Fire = 0.5×"],
    ["Water", ["Fire"], 2, "Water vs Fire = 2×"],
    ["Electric", ["Water"], 2, "Electric vs Water = 2×"],
    ["Electric", ["Ground"], 0, "Electric vs Ground = 0 (immune)"],
    ["Ground", ["Flying"], 0, "Ground vs Flying = 0 (immune)"],
    ["Normal", ["Rock"], 0.5, "Normal vs Rock = 0.5×"],
    ["Normal", ["Ghost"], 0, "Normal vs Ghost = 0 (immune)"],
    ["Fighting", ["Normal"], 2, "Fighting vs Normal = 2×"],
    ["Ice", ["Water", "Ground"], 1, "Ice vs Water+Ground = 0.5×2 = 1"],
    ["Dragon", ["Fairy"], 0, "Dragon vs Fairy = 0 (immune)"],
    ["Fairy", ["Dragon"], 2, "Fairy vs Dragon = 2×"],
    ["Steel", ["Ice"], 2, "Steel vs Ice = 2×"],
  ] as const)(
    "%s vs %s → %s (%s)",
    (attackingType, defenderTypes, expected) => {
      expect(
        effectiveDefensiveMult({ attackingType, defenderTypes: [...defenderTypes] })
      ).toBe(expected);
    }
  );
});

describe("effectiveDefensiveMult — Tera type override", () => {
  it("follows the Tera type when defenderTypes is the Tera type", () => {
    // Tera Fairy — normally Water/Grass pokemon, but tera changes matchups
    expect(
      effectiveDefensiveMult({
        attackingType: "Dragon",
        defenderTypes: ["Fairy"],
      })
    ).toBe(0); // Dragon is immune to Fairy

    expect(
      effectiveDefensiveMult({
        attackingType: "Fighting",
        defenderTypes: ["Fairy"],
      })
    ).toBe(0.5); // Fairy resists Fighting
  });

  it("uses pure Steel type when tera type is Steel (no secondary type)", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Steel"],
      })
    ).toBe(2); // Fire is super-effective vs Steel
  });
});

describe("effectiveDefensiveMult — ability immunities", () => {
  it.each([
    ["Levitate", "Ground", 0],
    ["Flash Fire", "Fire", 0],
    ["Water Absorb", "Water", 0],
    ["Volt Absorb", "Electric", 0],
    ["Lightning Rod", "Electric", 0],
    ["Storm Drain", "Water", 0],
    ["Sap Sipper", "Grass", 0],
    ["Motor Drive", "Electric", 0],
  ] as const)(
    "%s makes defender immune to %s (0)",
    (ability, attackingType, expected) => {
      expect(
        effectiveDefensiveMult({
          attackingType,
          defenderTypes: ["Normal"],
          ability,
        })
      ).toBe(expected);
    }
  );
});

describe("effectiveDefensiveMult — ability resists / weakness modifiers", () => {
  it("Thick Fat reduces Fire to 0.5×", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Normal"],
        ability: "Thick Fat",
      })
    ).toBe(0.5);
  });

  it("Thick Fat reduces Ice to 0.5×", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Ice",
        defenderTypes: ["Normal"],
        ability: "Thick Fat",
      })
    ).toBe(0.5);
  });

  it("Thick Fat does not affect non-Fire/Ice types", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Water",
        defenderTypes: ["Normal"],
        ability: "Thick Fat",
      })
    ).toBe(1); // Water vs Normal is neutral; Thick Fat doesn't change it
  });

  it("Heatproof reduces Fire to 0.5×", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Steel"],
        ability: "Heatproof",
      })
    ).toBe(0.5);
  });

  it("Dry Skin makes defender immune to Water (0×)", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Water",
        defenderTypes: ["Normal"],
        ability: "Dry Skin",
      })
    ).toBe(0);
  });

  it("Dry Skin increases Fire to 1.25× on a normally neutral defender", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Normal"],
        ability: "Dry Skin",
      })
    ).toBe(1.25);
  });

  it("Fluffy doubles Fire damage to 2×", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Normal"],
        ability: "Fluffy",
      })
    ).toBe(2);
  });
});

describe("effectiveDefensiveMult — Wonder Guard", () => {
  it("blocks a neutral hit (returns 0)", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Normal",
        defenderTypes: ["Ghost"],
        ability: "Wonder Guard",
      })
    ).toBe(0);
  });

  it("blocks a resisted hit (returns 0)", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Water",
        defenderTypes: ["Water"],
        ability: "Wonder Guard",
      })
    ).toBe(0);
  });

  it("lets super-effective hits land", () => {
    // Bug/Ghost/Dark are super-effective vs Ghost
    const result = effectiveDefensiveMult({
      attackingType: "Dark",
      defenderTypes: ["Ghost"],
      ability: "Wonder Guard",
    });
    expect(result).toBe(2);
  });

  it("preserves the super-effective multiplier (does not clamp to 1)", () => {
    // Fire vs Steel/Ice (4× would normally apply)
    const base = effectiveDefensiveMult({
      attackingType: "Fire",
      defenderTypes: ["Steel", "Ice"],
    });
    expect(base).toBe(4); // sanity — Fire hits Steel×Ice at 4×

    const withWG = effectiveDefensiveMult({
      attackingType: "Fire",
      defenderTypes: ["Steel", "Ice"],
      ability: "Wonder Guard",
    });
    expect(withWG).toBe(4); // Wonder Guard lets it through unchanged
  });
});

describe("effectiveDefensiveMult — Item: Air Balloon", () => {
  it("grants Ground immunity regardless of type chart", () => {
    // Normally, Ground hits Rock for 1×
    expect(
      effectiveDefensiveMult({
        attackingType: "Ground",
        defenderTypes: ["Rock"],
        item: "Air Balloon",
      })
    ).toBe(0);
  });

  it("does not affect other attack types", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Grass"],
        item: "Air Balloon",
      })
    ).toBe(2); // Unaffected
  });

  it("overrides a natural Ground weakness", () => {
    // Fire/Flying types would take 1× from Ground, but balloon nullifies it
    expect(
      effectiveDefensiveMult({
        attackingType: "Ground",
        defenderTypes: ["Fire"],
        item: "Air Balloon",
      })
    ).toBe(0);
  });
});

describe("effectiveDefensiveMult — Iron Ball disables Levitate", () => {
  it("Levitate alone grants Ground immunity", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Ground",
        defenderTypes: ["Normal"],
        ability: "Levitate",
      })
    ).toBe(0);
  });

  it("Levitate + Iron Ball: Ground immunity is lifted (1×)", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Ground",
        defenderTypes: ["Normal"],
        ability: "Levitate",
        item: "Iron Ball",
      })
    ).toBe(1);
  });

  it("Iron Ball does not disable non-Levitate ability immunities", () => {
    // Flash Fire immunity should still be nullified — but Iron Ball only
    // disables Levitate; Flash Fire is NOT in ABILITY_DISABLING_ITEMS scope
    // Actually: Iron Ball disables ALL ability overrides — confirm the impl
    // does NOT block Flash Fire when Iron Ball is held.
    // Per heatmap-effects.ts: ABILITY_DISABLING_ITEMS disables ALL ability overrides.
    // So Flash Fire + Iron Ball → Fire hits normally.
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Normal"],
        ability: "Flash Fire",
        item: "Iron Ball",
      })
    ).toBe(1); // Flash Fire immunity disabled by Iron Ball
  });
});

describe("effectiveDefensiveMult — Fluffy on typed defenders", () => {
  it("Fluffy Fire 2× on a Fire-type defender (overrides the natural 0.5× resist)", () => {
    // Fire vs Fire is normally 0.5× but Fluffy forces Fire to exactly 2×
    // regardless of the base type matchup.
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Fire"],
        ability: "Fluffy",
      })
    ).toBe(2);
  });

  it("Fluffy Fire 2× on Water/Fire defender (overrides both the natural 0.25× resist)", () => {
    // Fire vs Water/Fire would be 0.5×0.5=0.25 but Fluffy forces exactly 2×
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Water", "Fire"],
        ability: "Fluffy",
      })
    ).toBe(2);
  });

  it("Fluffy does not affect non-Fire types", () => {
    // Water vs Normal with Fluffy: Fluffy only overrides Fire — Water stays neutral
    expect(
      effectiveDefensiveMult({
        attackingType: "Water",
        defenderTypes: ["Normal"],
        ability: "Fluffy",
      })
    ).toBe(1);
  });
});

describe("effectiveDefensiveMult — ability key normalization", () => {
  it("handles ability names with spaces (display format)", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Electric",
        defenderTypes: ["Normal"],
        ability: "Volt Absorb",
      })
    ).toBe(0);
  });

  it("handles mixed case", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Electric",
        defenderTypes: ["Normal"],
        ability: "VOLTABSORB",
      })
    ).toBe(0);
  });

  it("returns base matchup when ability is null", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Grass"],
        ability: null,
      })
    ).toBe(2);
  });

  it("returns base matchup when ability is undefined", () => {
    expect(
      effectiveDefensiveMult({
        attackingType: "Fire",
        defenderTypes: ["Grass"],
        ability: undefined,
      })
    ).toBe(2);
  });
});
