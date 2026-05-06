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

  // Parameterized matrix — every SOUND_MOVES entry should become Water under Liquid Voice.
  // The source stores names lowercase; passing mixed case works because the source
  // lowercases the input internally.
  // Parameterized matrix: every sound move recognised by the Pokemon data returns
  // Water under Liquid Voice.  Moves that don't exist in the dex are excluded —
  // effectiveMoveType returns the base type (Normal / null-fallback) when getMoveType
  // returns null, so the Liquid Voice transformer never runs for unknown moves.
  it.each([
    "Boomburst",
    "Bug Buzz",
    "Echoed Voice",
    "Growl",
    "Hyper Voice",
    "Metal Sound",
    "Noble Roar",
    "Perish Song",
    "Relic Song",
    "Roar",
    "Round",
    "Screech",
    "Sing",
    "Snore",
    "Supersonic",
    "Uproar",
    "Clanging Scales",
    "Clangorous Soul",
    "Disarming Voice",
    "Overdrive",
    "Sparkling Aria",
    "Torch Song",
  ])(
    "Liquid Voice converts %s (sound move) to Water",
    (soundMove) => {
      expect(effectiveMoveType(soundMove, "Liquid Voice")).toBe("Water");
    }
  );

  it("Liquid Voice — non-sound move Tackle stays Normal (no ability transform)", () => {
    expect(effectiveMoveType("Tackle", "Liquid Voice")).toBe("Normal");
  });

  it("Liquid Voice — Boomburst with null ability returns base type Normal", () => {
    expect(effectiveMoveType("Boomburst", null)).toBe("Normal");
  });

  it("Liquid Voice — Boomburst with unknown ability Sturdy returns base type Normal", () => {
    expect(effectiveMoveType("Boomburst", "Sturdy")).toBe("Normal");
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
        move: "Freeze-Dry",
        defenderTypes: ["Water"],
      })
    ).toBe(2);
  });

  it("Freeze-Dry vs Grass (no water) = 2× (Ice is super-effective vs Grass)", () => {
    // Ice is 2× vs Grass — no water quirk applies
    expect(
      effectiveOffensiveMult({
        move: "Freeze-Dry",
        defenderTypes: ["Grass"],
      })
    ).toBe(2);
  });

  it("Freeze-Dry vs Water+Ground = 4× (Ice×Ground = 2×, ×2 from water quirk)", () => {
    // Water forced to ×2; Ground is also Ice super-effective (2×); result = 2 × 2 = 4
    expect(
      effectiveOffensiveMult({
        move: "Freeze-Dry",
        defenderTypes: ["Water", "Ground"],
      })
    ).toBe(4);
  });

  it("Freeze-Dry vs Water+Grass = 4× (Ice×Grass = 2×, ×2 from water quirk)", () => {
    // Water forced to ×2; Grass is also Ice super-effective (2×); result = 2 × 2 = 4
    expect(
      effectiveOffensiveMult({
        move: "Freeze-Dry",
        defenderTypes: ["Water", "Grass"],
      })
    ).toBe(4);
  });

  it("Freeze-Dry vs pure Ice = 0.5× (standard Ice vs Ice, no water bonus)", () => {
    expect(
      effectiveOffensiveMult({
        move: "Freeze-Dry",
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

  it("Thousand Arrows vs Flying/Steel = 2× (Flying stripped → Ground vs Steel = 2×)", () => {
    // Steel is normally Flying+Ground; Flying immunity is overridden.
    // nonFlyingTypes = [Steel]; Ground vs Steel = 2×
    expect(
      effectiveOffensiveMult({
        move: "thousand arrows",
        defenderTypes: ["Flying", "Steel"],
      })
    ).toBe(2);
  });

  it("Thousand Arrows vs Flying/Grass = 0.5× (Flying stripped → Ground vs Grass = 0.5×)", () => {
    // nonFlyingTypes = [Grass]; Ground vs Grass = 0.5×
    expect(
      effectiveOffensiveMult({
        move: "thousand arrows",
        defenderTypes: ["Flying", "Grass"],
      })
    ).toBe(0.5);
  });
});

// =============================================================================
// effectiveOffensiveMult — Flying Press additional cases
// =============================================================================

describe("effectiveOffensiveMult — Flying Press additional cases", () => {
  it("Flying Press vs Fighting = 2× (Fighting vs Fighting = 1 × Flying vs Fighting = 2)", () => {
    // Fighting vs Fighting is neutral (1×, not listed in chart); Flying is super-effective vs
    // Fighting (2×) → 1 × 2 = 2
    expect(
      effectiveOffensiveMult({
        move: "flying press",
        defenderTypes: ["Fighting"],
      })
    ).toBe(2);
  });

  it("Flying Press vs Bug/Grass = 2× (Fighting×0.5×1 × Flying×2×2 = 0.5 × 4 = 2)", () => {
    // Fighting vs Bug = 0.5, Fighting vs Grass = 1 → Fighting total = 0.5
    // Flying vs Bug = 2, Flying vs Grass = 2 → Flying total = 4
    // Final: 0.5 × 4 = 2
    expect(
      effectiveOffensiveMult({
        move: "flying press",
        defenderTypes: ["Bug", "Grass"],
      })
    ).toBe(2);
  });
});
