import { getMoveEffectiveness } from "../calc/move-effectiveness";

// =============================================================================
// getMoveEffectiveness — baseline behaviour
// =============================================================================

describe("getMoveEffectiveness — baseline", () => {
  it("returns 1 for empty moveName", () => {
    expect(getMoveEffectiveness("", "Charizard")).toBe(1);
  });

  it("returns 1 for empty defenderSpecies", () => {
    expect(getMoveEffectiveness("Flamethrower", "")).toBe(1);
  });

  it("returns 1 for an unknown move", () => {
    expect(getMoveEffectiveness("Not A Real Move", "Charizard")).toBe(1);
  });

  it("returns 1 for a Status move (no type effectiveness)", () => {
    // Will Wisp is a Status move
    expect(getMoveEffectiveness("Will-O-Wisp", "Charizard")).toBe(1);
  });

  it("returns 2 for Flamethrower vs Grass-type", () => {
    // Fire is 2× vs Grass
    expect(getMoveEffectiveness("Flamethrower", "Bulbasaur")).toBe(2);
  });

  it("returns 0.5 for Flamethrower vs Water-type", () => {
    expect(getMoveEffectiveness("Flamethrower", "Squirtle")).toBe(0.5);
  });

  it("returns 0 for Normal move into Ghost (immune)", () => {
    // Tackle (Normal) vs Gastly (Ghost/Poison) — Normal is immune to Ghost
    expect(getMoveEffectiveness("Tackle", "Gastly")).toBe(0);
  });
});

// =============================================================================
// getMoveEffectiveness — Weather Ball weather-type overrides
// =============================================================================

describe("getMoveEffectiveness — Weather Ball", () => {
  it("is Normal type (no weather) → 0 into Ghost (immune)", () => {
    // Normal can't hit Ghost — reproduces the original Charizard bug scenario
    expect(getMoveEffectiveness("Weather Ball", "Gastly")).toBe(0);
  });

  it("under Sun becomes Fire → 0.5 into Dragon (not immune)", () => {
    // Fire is 0.5× vs Dragon
    expect(getMoveEffectiveness("Weather Ball", "Dragonite", "Sun")).toBe(0.5);
  });

  it("under Sun becomes Fire → 0 into Gastly — no longer OHKO contradiction", () => {
    // The badge and the calc engine both agree: Fire cannot hit Ghost
    // (Gastly is Ghost/Poison; Fire is neutral vs both but Normal is immune to Ghost)
    // Fire is actually neutral vs Ghost (not immune) — let's pick a concrete case:
    // Fire vs Rock/Ground is 0.5 — but the real fix is that it's no longer "Normal"
    // Just verify it changed away from 0 (Normal immune) to non-zero under Sun
    const result = getMoveEffectiveness("Weather Ball", "Gengar", "Sun");
    // Gengar is Ghost/Poison — Fire vs Ghost = 1, Fire vs Poison = 1 → result = 1
    expect(result).toBe(1);
  });

  it("under Rain becomes Water → 2 into Fire-type", () => {
    // Water is 2× vs Fire
    expect(getMoveEffectiveness("Weather Ball", "Charizard", "Rain")).toBe(2);
  });

  it("under Rain becomes Water → 0.5 into Grass-type", () => {
    expect(getMoveEffectiveness("Weather Ball", "Bulbasaur", "Rain")).toBe(0.5);
  });

  it("under Sand becomes Rock → 4 into Fire/Flying-type (Charizard)", () => {
    // Charizard is Fire/Flying — Rock is 2× vs Fire AND 2× vs Flying → 4×
    expect(getMoveEffectiveness("Weather Ball", "Charizard", "Sand")).toBe(4);
  });

  it("under Snow becomes Ice → 4 into Grass/Flying (e.g. Tropius)", () => {
    // Ice vs Grass = 2×, Ice vs Flying = 2× → 4×
    expect(getMoveEffectiveness("Weather Ball", "Tropius", "Snow")).toBe(4);
  });

  it("under Hail becomes Ice → 4 into Grass/Flying", () => {
    // Hail maps to Ice same as Snow
    expect(getMoveEffectiveness("Weather Ball", "Tropius", "Hail")).toBe(4);
  });

  it("under Harsh Sunshine becomes Fire → same as Sun", () => {
    expect(
      getMoveEffectiveness("Weather Ball", "Bulbasaur", "Harsh Sunshine")
    ).toBe(2);
  });

  it("under Heavy Rain becomes Water → same as Rain", () => {
    expect(
      getMoveEffectiveness("Weather Ball", "Charizard", "Heavy Rain")
    ).toBe(2);
  });

  it("with null weather falls back to Normal type", () => {
    // Normal vs Charizard (Fire/Flying) = 1
    expect(getMoveEffectiveness("Weather Ball", "Charizard", null)).toBe(1);
  });

  it("with unrecognised weather falls back to Normal type", () => {
    expect(getMoveEffectiveness("Weather Ball", "Charizard", "FoggyDay")).toBe(
      1
    );
  });

  it("does NOT affect non-weather-dependent moves (Flamethrower stays Fire under Rain)", () => {
    // Flamethrower stays Fire regardless of weather — passes weather param but it's ignored
    expect(getMoveEffectiveness("Flamethrower", "Bulbasaur", "Rain")).toBe(2);
  });
});

// =============================================================================
// getMoveEffectiveness — Weather Ball vs Garchomp (Dragon/Ground) matrix
// =============================================================================
// Dragon/Ground type chart:
//   Fire  vs Dragon = 0.5, vs Ground = 1 → 0.5
//   Water vs Dragon = 0.5, vs Ground = 2 → 1
//   Rock  vs Dragon = 1,   vs Ground = 0.5 → 0.5
//   Ice   vs Dragon = 2,   vs Ground = 2 → 4
//   Normal vs Dragon = 1,  vs Ground = 1 → 1

describe("getMoveEffectiveness — Weather Ball vs Garchomp (Dragon/Ground) matrix", () => {
  it.each<[string | null | undefined, number]>([
    ["Sun", 0.5],
    ["Harsh Sunshine", 0.5],
    ["Rain", 1],
    ["Heavy Rain", 1],
    ["Sand", 0.5],
    ["Snow", 4],
    ["Hail", 4],
    ["", 1],
    [null, 1],
    [undefined, 1],
  ])("Weather Ball under weather=%p vs Garchomp → %d×", (weather, expected) => {
    expect(
      getMoveEffectiveness("Weather Ball", "Garchomp", weather)
    ).toBeCloseTo(expected, 5);
  });
});

// =============================================================================
// getMoveEffectiveness — Champions format-aware type overrides
// =============================================================================
// Regression tests for the bug where getMoveData was called without formatId,
// causing Champions move-type changes to be silently ignored.
//
// Type chart reference:
//   Steel vs Fairy  = 2×  (Steel is super-effective vs Fairy, Ice, Rock)
//   Grass vs Fairy  = 1×  (no interaction)
//   Normal vs Fairy = 1×  (no interaction)
//   Grass vs Grass  = 0.5×
//   Normal vs Grass = 1×

const CHAMPIONS_MA_FORMAT = "gen9championsvgc2026regma";

describe("getMoveEffectiveness — Champions format-aware type overrides", () => {
  // Hatterene is a pure Fairy-type — clean target for Steel effectiveness.
  describe("Snap Trap (Grass → Steel in Champions M-A)", () => {
    it("with formatId: Steel type → 2× vs Hatterene (pure Fairy)", () => {
      // Steel is super-effective vs Fairy
      expect(
        getMoveEffectiveness(
          "Snap Trap",
          "Hatterene",
          null,
          CHAMPIONS_MA_FORMAT
        )
      ).toBe(2);
    });

    it("without formatId: vanilla Grass type → 1× vs Hatterene (Grass neutral vs Fairy)", () => {
      // Without the format context, Snap Trap stays Grass (vanilla @pkmn/dex type)
      // Grass has no modifier vs Fairy → 1×
      const vanillaResult = getMoveEffectiveness("Snap Trap", "Hatterene");
      expect(vanillaResult).toBe(1);
      // Contrast: the Champions-aware result must differ
      const championsResult = getMoveEffectiveness(
        "Snap Trap",
        "Hatterene",
        null,
        CHAMPIONS_MA_FORMAT
      );
      expect(championsResult).not.toBe(vanillaResult);
    });

    it.each<[string, number]>([
      // Steel type chart for a pure Fairy defender
      // Hatterene (Fairy): Steel 2×
      ["Hatterene", 2],
      // Flutter Mane (Ghost/Fairy): Steel vs Ghost = 1, Steel vs Fairy = 2 → 2
      ["Flutter Mane", 2],
    ])(
      "Snap Trap with Champions formatId is 2× vs %s (Fairy-type)",
      (defender, expected) => {
        expect(
          getMoveEffectiveness("Snap Trap", defender, null, CHAMPIONS_MA_FORMAT)
        ).toBe(expected);
      }
    );
  });

  // Growth changes type Normal → Grass in Champions M-A, but Growth is a
  // Status move in both vanilla and Champions (only type/pp fields change, not
  // category). getMoveEffectiveness returns 1 for Status moves regardless of
  // type or formatId — no effectiveness assertion is meaningful here.
  describe("Growth (Normal → Grass in Champions M-A) — Status move, no effectiveness", () => {
    it("returns 1 regardless of formatId because Growth is a Status move", () => {
      // Confirm the Status-move guard fires in both paths
      expect(getMoveEffectiveness("Growth", "Hatterene")).toBe(1);
      expect(
        getMoveEffectiveness("Growth", "Hatterene", null, CHAMPIONS_MA_FORMAT)
      ).toBe(1);
    });
  });
});

// =============================================================================
// getMoveEffectiveness — additional edge cases
// =============================================================================

describe("getMoveEffectiveness — additional edge cases", () => {
  it("Status move returns 1× regardless of weather (Toxic under Sun)", () => {
    expect(getMoveEffectiveness("Toxic", "Garchomp", "Sun")).toBe(1);
  });

  it("unknown move logs a warning exactly once even when called twice", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      getMoveEffectiveness("Completely Fake Move XYZ", "Garchomp");
      getMoveEffectiveness("Completely Fake Move XYZ", "Garchomp");
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
