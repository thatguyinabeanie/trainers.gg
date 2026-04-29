import {
  effectiveMoveType,
  effectiveOffensiveMult,
} from "../dock/move-type-overrides";

// =============================================================================
// effectiveMoveType — ability-driven type changes
// =============================================================================

describe("effectiveMoveType — ability transforms", () => {
  it("Pixilate converts Normal-type Tackle to Fairy", () => {
    expect(effectiveMoveType("tackle", "Pixilate")).toBe("Fairy");
  });

  it("Aerilate converts Normal-type Tackle to Flying", () => {
    expect(effectiveMoveType("tackle", "Aerilate")).toBe("Flying");
  });

  it("Refrigerate converts Normal-type Tackle to Ice", () => {
    expect(effectiveMoveType("tackle", "Refrigerate")).toBe("Ice");
  });

  it("Galvanize converts Normal-type Tackle to Electric", () => {
    expect(effectiveMoveType("tackle", "Galvanize")).toBe("Electric");
  });

  it("Normalize converts Flamethrower (Fire) to Normal", () => {
    expect(effectiveMoveType("flamethrower", "Normalize")).toBe("Normal");
  });

  it("Normalize converts Surf (Water) to Normal", () => {
    expect(effectiveMoveType("surf", "Normalize")).toBe("Normal");
  });

  it("Pixilate does NOT change a non-Normal move type (Flamethrower stays Fire)", () => {
    expect(effectiveMoveType("flamethrower", "Pixilate")).toBe("Fire");
  });

  it("Aerilate does NOT change a non-Normal move type (Surf stays Water)", () => {
    expect(effectiveMoveType("surf", "Aerilate")).toBe("Water");
  });

  it("Liquid Voice converts Boomburst (sound, Normal) to Water", () => {
    expect(effectiveMoveType("boomburst", "Liquid Voice")).toBe("Water");
  });

  it("Liquid Voice converts Hyper Voice (sound, Normal) to Water", () => {
    expect(effectiveMoveType("hyper voice", "Liquid Voice")).toBe("Water");
  });

  it("Liquid Voice does NOT change a non-sound move (Tackle stays Normal)", () => {
    expect(effectiveMoveType("tackle", "Liquid Voice")).toBe("Normal");
  });

  it("Liquid Voice does NOT change a non-sound move (Flamethrower stays Fire)", () => {
    expect(effectiveMoveType("flamethrower", "Liquid Voice")).toBe("Fire");
  });

  it("returns base type when ability is null", () => {
    expect(effectiveMoveType("tackle", null)).toBe("Normal");
  });

  it("returns base type when ability is undefined", () => {
    expect(effectiveMoveType("tackle", undefined)).toBe("Normal");
  });

  it("returns Normal for an unrecognised move", () => {
    expect(effectiveMoveType("notareal move", null)).toBe("Normal");
  });
});

// =============================================================================
// effectiveOffensiveMult — standard path
// =============================================================================

describe("effectiveOffensiveMult — standard path", () => {
  it("Pixilate Tackle vs Dragon = 2× (Fairy is super-effective)", () => {
    expect(
      effectiveOffensiveMult({
        move: "tackle",
        attackerAbility: "Pixilate",
        defenderTypes: ["Dragon"],
      })
    ).toBe(2);
  });

  it("Aerilate Tackle vs Fighting = 2× (Flying beats Fighting)", () => {
    expect(
      effectiveOffensiveMult({
        move: "tackle",
        attackerAbility: "Aerilate",
        defenderTypes: ["Fighting"],
      })
    ).toBe(2);
  });

  it("Galvanize Tackle vs Water = 2× (Electric beats Water)", () => {
    expect(
      effectiveOffensiveMult({
        move: "tackle",
        attackerAbility: "Galvanize",
        defenderTypes: ["Water"],
      })
    ).toBe(2);
  });

  it("Normalize Flamethrower vs Ghost = 0 (Normal cannot hit Ghost)", () => {
    expect(
      effectiveOffensiveMult({
        move: "flamethrower",
        attackerAbility: "Normalize",
        defenderTypes: ["Ghost"],
      })
    ).toBe(0);
  });

  it("no ability — Flamethrower vs Grass = 2×", () => {
    expect(
      effectiveOffensiveMult({
        move: "flamethrower",
        defenderTypes: ["Grass"],
      })
    ).toBe(2);
  });
});

// =============================================================================
// effectiveOffensiveMult — Quirk: Freeze-Dry
// =============================================================================

describe("effectiveOffensiveMult — Freeze-Dry", () => {
  it("Freeze-Dry vs pure Water = 2× (forced super-effective)", () => {
    expect(
      effectiveOffensiveMult({
        move: "freeze dry",
        defenderTypes: ["Water"],
      })
    ).toBe(2);
  });

  it("Freeze-Dry vs Grass (no water) = 2× (Ice is super-effective vs Grass)", () => {
    // Ice is 2× vs Grass — no water quirk applies
    expect(
      effectiveOffensiveMult({
        move: "freeze dry",
        defenderTypes: ["Grass"],
      })
    ).toBe(2);
  });

  it("Freeze-Dry vs Water+Ground = 4× (Ice×Ground = 2×, ×2 from water quirk)", () => {
    // Water forced to ×2; Ground is also Ice super-effective (2×); result = 2 × 2 = 4
    expect(
      effectiveOffensiveMult({
        move: "freeze dry",
        defenderTypes: ["Water", "Ground"],
      })
    ).toBe(4);
  });

  it("Freeze-Dry vs Water+Grass = 4× (Ice×Grass = 2×, ×2 from water quirk)", () => {
    // Water forced to ×2; Grass is also Ice super-effective (2×); result = 2 × 2 = 4
    expect(
      effectiveOffensiveMult({
        move: "freeze dry",
        defenderTypes: ["Water", "Grass"],
      })
    ).toBe(4);
  });

  it("Freeze-Dry vs pure Ice = 0.5× (standard Ice vs Ice, no water bonus)", () => {
    expect(
      effectiveOffensiveMult({
        move: "freeze dry",
        defenderTypes: ["Ice"],
      })
    ).toBe(0.5);
  });
});

// =============================================================================
// effectiveOffensiveMult — Quirk: Flying Press
// =============================================================================

describe("effectiveOffensiveMult — Flying Press", () => {
  it("Flying Press vs Steel = 1× (Fighting×2 × Flying×0.5 = 1)", () => {
    // Fighting is super-effective vs Steel (2×), Flying is resisted by Steel (0.5×)
    expect(
      effectiveOffensiveMult({
        move: "flying press",
        defenderTypes: ["Steel"],
      })
    ).toBe(1);
  });

  it("Flying Press vs Grass = 2× (Fighting×1 × Flying×2 = 2)", () => {
    // Fighting neutral vs Grass (1×), Flying super-effective vs Grass (2×)
    expect(
      effectiveOffensiveMult({
        move: "flying press",
        defenderTypes: ["Grass"],
      })
    ).toBe(2);
  });

  it("Flying Press vs Rock = 1× (Fighting×2 × Flying×0.5 = 1)", () => {
    // Fighting is super-effective vs Rock (2×), but Flying is resisted by Rock (0.5×)
    expect(
      effectiveOffensiveMult({
        move: "flying press",
        defenderTypes: ["Rock"],
      })
    ).toBe(1);
  });

  it("Flying Press vs Ghost = 0 (Fighting immune to Ghost)", () => {
    expect(
      effectiveOffensiveMult({
        move: "flying press",
        defenderTypes: ["Ghost"],
      })
    ).toBe(0);
  });
});

// =============================================================================
// effectiveOffensiveMult — Quirk: Thousand Arrows
// =============================================================================

describe("effectiveOffensiveMult — Thousand Arrows", () => {
  it("Thousand Arrows vs pure Flying = 1× (not immune — grounded)", () => {
    expect(
      effectiveOffensiveMult({
        move: "thousand arrows",
        defenderTypes: ["Flying"],
      })
    ).toBe(1);
  });

  it("Thousand Arrows vs Normal/Flying = at least 1× (groundable)", () => {
    // Normal: Ground is neutral (1×); Flying stripped → groundMult = 1, Math.max(1, 1) = 1
    const result = effectiveOffensiveMult({
      move: "thousand arrows",
      defenderTypes: ["Normal", "Flying"],
    });
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it("Thousand Arrows vs Rock = 2× (no Flying — standard Ground vs Rock)", () => {
    expect(
      effectiveOffensiveMult({
        move: "thousand arrows",
        defenderTypes: ["Rock"],
      })
    ).toBe(2);
  });

  it("Thousand Arrows vs Ground = 1× (standard Ground vs Ground)", () => {
    expect(
      effectiveOffensiveMult({
        move: "thousand arrows",
        defenderTypes: ["Ground"],
      })
    ).toBe(1);
  });

  it("Thousand Arrows vs Grass = 0.5× (no Flying — standard Ground vs Grass is resisted)", () => {
    // Ground is not very effective vs Grass (0.5×) — no Flying immunity override applies
    expect(
      effectiveOffensiveMult({
        move: "thousand arrows",
        defenderTypes: ["Grass"],
      })
    ).toBe(0.5);
  });
});
