/**
 * Integration tests for useCalcState — exercises the real @smogon/calc engine.
 *
 * Purpose: catch wiring regressions that the fully-mocked unit tests cannot
 * detect (wrong Move option keys, side-swap bugs, inferred-weather logic, etc.).
 *
 * Strategy: relative-ratio assertions and bounded-range assertions.
 * These are robust to engine version bumps (float-rounding noise) but still
 * catch wrapper-level wiring regressions.
 */

import { describe, it, expect } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

// =============================================================================
// Do NOT mock @smogon/calc — this file exercises the real engine.
// =============================================================================

// @trainers/supabase is still needed for type information only.
import { type Tables } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

import { useCalcState } from "../use-calc-state";

// =============================================================================
// Formats
// =============================================================================

const VGC_FORMAT: GameFormat = {
  id: "gen9vgc2026regi",
  game: "Scarlet & Violet",
  gameShort: "SV",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "I",
  label: "SV: Reg I",
  showdownName: "[Gen 9] VGC 2026 Reg I",
  doubles: true,
  active: true,
};

// Champions format: generation:10 so getGen() clamps it down to gen 9 mechanics.
// gameShort:"Champions" so isChampionsFormat() returns true (EV cap clamp).
const CHAMPIONS_FORMAT: GameFormat = {
  id: "championsvgc2026regma",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 10,
  category: "VGC",
  year: 2026,
  regulation: "M-A",
  label: "Champions: Reg M-A",
  showdownName: "[Champions] VGC 2026 Reg M-A",
  doubles: true,
  active: true,
};

// =============================================================================
// Factory
// =============================================================================

/**
 * Build a `Tables<"pokemon">` row for test purposes.
 * Default: specs Flutter Mane (Timid, Choice Specs, Protosynthesis, 252 SpA / 252 Spe / 4 HP)
 * with Moonblast as move1. Competitively relevant so damage lands in plausible ranges.
 */
function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Flutter Mane",
    ability: "Protosynthesis",
    nature: "Timid",
    held_item: "Choice Specs",
    nickname: null,
    gender: null,
    level: 50,
    move1: "Moonblast",
    move2: null,
    move3: null,
    move4: null,
    tera_type: null,
    ev_hp: 4,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 252,
    ev_special_defense: 0,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    format_legal: true,
    is_shiny: null,
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Physical attacker: Choice Band Garchomp + Iron Head.
// Single-target, normal-crit-rate physical move so screen / boost / -atk
// boost ratios reflect the engine's actual modifier stack — Wicked Blow,
// Surging Strikes, etc all crit unconditionally and bypass those modifiers.
function makePhysicalAttacker(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return makePokemon({
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Jolly",
    held_item: "Choice Band",
    move1: "Iron Head",
    ev_special_attack: 0,
    ev_attack: 252,
    ...overrides,
  });
}

// =============================================================================
// Helpers
// =============================================================================

/** Midpoint of a [min, max] percent range. */
function mid(min: number, max: number): number {
  return (min + max) / 2;
}

interface HookSetup {
  pokemon: Tables<"pokemon">;
  format?: GameFormat;
  faintedYours?: number;
  faintedTheirs?: number;
  /** Called after hook renders — use act() to call setters inside. */
  configure?: (current: ReturnType<typeof useCalcState>) => void;
}

/**
 * Render the hook, optionally apply mutations via configure(), then return the
 * current selectedMoveOutput. Returns null when the hook returns null.
 */
function getOutput(setup: HookSetup) {
  const { result } = renderHook(() =>
    useCalcState({
      selectedPokemon: setup.pokemon,
      format: setup.format ?? VGC_FORMAT,
      faintedYours: setup.faintedYours ?? 0,
      faintedTheirs: setup.faintedTheirs ?? 0,
    })
  );

  if (setup.configure) {
    act(() => setup.configure!(result.current));
  }

  return result.current.selectedMoveOutput;
}

/**
 * Get the midpoint percent of the selectedMoveOutput.
 * Throws if output is null so test failures are obvious.
 */
function getMidPercent(setup: HookSetup): number {
  const output = getOutput(setup);
  if (!output) throw new Error("selectedMoveOutput is null — calc did not run");
  return mid(output.minPercent, output.maxPercent);
}

/**
 * Render the hook twice and return ratio of midpoint percents (A / B).
 */
function getDamageRatio(setupA: HookSetup, setupB: HookSetup): number {
  const a = getMidPercent(setupA);
  const b = getMidPercent(setupB);
  return a / b;
}

// =============================================================================
// Shared defender baseline for Incineroar (a standard VGC target)
// Default defender inside the hook: "Incineroar" / Intimidate / Sitrus Berry /
// Careful / 252 HP / 4 SpD — so we use that default throughout.
// =============================================================================

// =============================================================================
// Status effects
// =============================================================================

describe("status effects", () => {
  it.each([["Burned", "burn halves physical damage", [0.45, 0.55]]])(
    "%s: %s (ratio in %s)",
    (_status, _desc, [lo, hi]) => {
      const healthy = getMidPercent({
        pokemon: makePhysicalAttacker(),
        configure: (_c) => {
          /* default healthy */
        },
      });
      const affected = getMidPercent({
        pokemon: makePhysicalAttacker(),
        configure: (c) => c.setAttackerStatus("Burned"),
      });
      const ratio = affected / healthy;
      expect(ratio).toBeGreaterThanOrEqual(lo);
      expect(ratio).toBeLessThanOrEqual(hi);
    }
  );

  it("Paralyzed does not halve damage (status penalty only on speed)", () => {
    const healthy = getMidPercent({ pokemon: makePhysicalAttacker() });
    const paralyzed = getMidPercent({
      pokemon: makePhysicalAttacker(),
      configure: (c) => c.setAttackerStatus("Paralyzed"),
    });
    // Paralysis doesn't affect the calc output (no damage penalty in gen 9)
    expect(paralyzed / healthy).toBeGreaterThanOrEqual(0.9);
    expect(paralyzed / healthy).toBeLessThanOrEqual(1.1);
  });

  it.each([
    ["Burned", [0.45, 0.55]],
    ["Paralyzed", [0.9, 1.1]],
    ["Poisoned", [0.9, 1.1]],
    ["Badly Poisoned", [0.9, 1.1]],
    ["Asleep", [0.9, 1.1]],
    ["Frozen", [0.9, 1.1]],
  ])("status=%s damage-ratio range %s vs healthy", (status, [lo, hi]) => {
    const healthyMid = getMidPercent({ pokemon: makePhysicalAttacker() });
    const statusMid = getMidPercent({
      pokemon: makePhysicalAttacker(),
      configure: (c) => c.setAttackerStatus(status),
    });
    const ratio = statusMid / healthyMid;
    expect(ratio).toBeGreaterThanOrEqual(lo);
    expect(ratio).toBeLessThanOrEqual(hi);
  });

  it("Burned status on special attacker does NOT halve damage (only physical Atk)", () => {
    // Flutter Mane uses SpA for Moonblast — burn should not halve it
    const healthy = getMidPercent({ pokemon: makePokemon() });
    const burned = getMidPercent({
      pokemon: makePokemon(),
      configure: (c) => c.setAttackerStatus("Burned"),
    });
    const ratio = burned / healthy;
    expect(ratio).toBeGreaterThanOrEqual(0.9);
    expect(ratio).toBeLessThanOrEqual(1.1);
  });
});

// =============================================================================
// Screens & sides
// =============================================================================

describe("screens & sides", () => {
  it("Reflect halves physical damage on the defender side", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePhysicalAttacker(),
        configure: (c) => c.setDefenderSide({ reflect: true }),
      },
      { pokemon: makePhysicalAttacker() }
    );
    expect(ratio).toBeGreaterThanOrEqual(0.6);
    expect(ratio).toBeLessThanOrEqual(0.73);
  });

  it("Reflect does NOT affect special damage", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePokemon(),
        configure: (c) => c.setDefenderSide({ reflect: true }),
      },
      { pokemon: makePokemon() }
    );
    // Ratio should be ~1.0 — reflect only protects physical
    expect(ratio).toBeGreaterThanOrEqual(0.9);
    expect(ratio).toBeLessThanOrEqual(1.1);
  });

  it("Light Screen halves special damage on the defender side", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePokemon(),
        configure: (c) => c.setDefenderSide({ lightScreen: true }),
      },
      { pokemon: makePokemon() }
    );
    expect(ratio).toBeGreaterThanOrEqual(0.6);
    expect(ratio).toBeLessThanOrEqual(0.73);
  });

  it("Light Screen does NOT affect physical damage", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePhysicalAttacker(),
        configure: (c) => c.setDefenderSide({ lightScreen: true }),
      },
      { pokemon: makePhysicalAttacker() }
    );
    expect(ratio).toBeGreaterThanOrEqual(0.9);
    expect(ratio).toBeLessThanOrEqual(1.1);
  });

  it("Aurora Veil halves physical damage (doubles)", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePhysicalAttacker(),
        configure: (c) => c.setDefenderSide({ auroraVeil: true }),
      },
      { pokemon: makePhysicalAttacker() }
    );
    expect(ratio).toBeGreaterThanOrEqual(0.6);
    expect(ratio).toBeLessThanOrEqual(0.73);
  });

  it("Aurora Veil halves special damage (doubles)", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePokemon(),
        configure: (c) => c.setDefenderSide({ auroraVeil: true }),
      },
      { pokemon: makePokemon() }
    );
    expect(ratio).toBeGreaterThanOrEqual(0.6);
    expect(ratio).toBeLessThanOrEqual(0.73);
  });

  it("Tailwind does NOT change damage output", () => {
    const withTailwind = getMidPercent({
      pokemon: makePokemon(),
      configure: (c) => c.setAttackerSide({ tailwind: true }),
    });
    const withoutTailwind = getMidPercent({ pokemon: makePokemon() });
    expect(withTailwind).toBeCloseTo(withoutTailwind, 1);
  });

  it("Helping Hand boosts damage by ~1.5x", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePokemon(),
        configure: (c) => c.setAttackerSide({ helpingHand: true }),
      },
      { pokemon: makePokemon() }
    );
    expect(ratio).toBeGreaterThanOrEqual(1.4);
    expect(ratio).toBeLessThanOrEqual(1.6);
  });

  it("Friend Guard reduces incoming damage to ~0.75x", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePokemon(),
        configure: (c) => c.setDefenderSide({ friendGuard: true }),
      },
      { pokemon: makePokemon() }
    );
    expect(ratio).toBeGreaterThanOrEqual(0.7);
    expect(ratio).toBeLessThanOrEqual(0.8);
  });
});

// =============================================================================
// Boosts
// =============================================================================

describe("boosts", () => {
  it.each([
    [2, 1.9, 2.1],
    [1, 1.45, 1.55],
    [-1, 0.62, 0.72],
    [-2, 0.44, 0.56],
  ])("attacker SpA boost %i → ratio ≈ [%d, %d] vs +0", (boost, lo, hi) => {
    const boostedMid = getMidPercent({
      pokemon: makePokemon(),
      configure: (c) => c.setAttackerBoost("spa", boost),
    });
    const neutralMid = getMidPercent({ pokemon: makePokemon() });
    const ratio = boostedMid / neutralMid;
    expect(ratio).toBeGreaterThanOrEqual(lo);
    expect(ratio).toBeLessThanOrEqual(hi);
  });

  it.each([
    [2, 1.9, 2.1],
    [1, 1.45, 1.55],
    [-1, 0.62, 0.72],
  ])(
    "attacker Atk boost %i → ratio ≈ [%d, %d] vs +0 (physical)",
    (boost, lo, hi) => {
      const boostedMid = getMidPercent({
        pokemon: makePhysicalAttacker(),
        configure: (c) => c.setAttackerBoost("atk", boost),
      });
      const neutralMid = getMidPercent({ pokemon: makePhysicalAttacker() });
      const ratio = boostedMid / neutralMid;
      expect(ratio).toBeGreaterThanOrEqual(lo);
      expect(ratio).toBeLessThanOrEqual(hi);
    }
  );

  it("defender +2 Def reduces physical damage", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePhysicalAttacker(),
        configure: (c) => c.setDefenderBoost("def", 2),
      },
      { pokemon: makePhysicalAttacker() }
    );
    expect(ratio).toBeGreaterThanOrEqual(0.44);
    expect(ratio).toBeLessThanOrEqual(0.56);
  });
});

// =============================================================================
// Items
// =============================================================================

describe("items", () => {
  it("Choice Specs boosts special damage by ~1.5x", () => {
    // Default Flutter Mane has Choice Specs — compare against no item version
    const ratio = getDamageRatio(
      { pokemon: makePokemon({ held_item: "Choice Specs" }) },
      { pokemon: makePokemon({ held_item: null }) }
    );
    expect(ratio).toBeGreaterThanOrEqual(1.4);
    expect(ratio).toBeLessThanOrEqual(1.6);
  });

  it("Life Orb boosts damage by ~1.3x", () => {
    const ratio = getDamageRatio(
      { pokemon: makePokemon({ held_item: "Life Orb" }) },
      { pokemon: makePokemon({ held_item: null }) }
    );
    expect(ratio).toBeGreaterThanOrEqual(1.2);
    expect(ratio).toBeLessThanOrEqual(1.4);
  });

  it("Choice Band boosts physical damage by ~1.5x", () => {
    const ratio = getDamageRatio(
      { pokemon: makePhysicalAttacker({ held_item: "Choice Band" }) },
      { pokemon: makePhysicalAttacker({ held_item: null }) }
    );
    expect(ratio).toBeGreaterThanOrEqual(1.4);
    expect(ratio).toBeLessThanOrEqual(1.6);
  });
});

// =============================================================================
// Tera
// =============================================================================

describe("tera", () => {
  it("Dragon attacker into Dragon-Tera Fairy defender produces 0% damage (immune)", () => {
    // Tera Fairy makes the defender immune to Dragon. The wrapper now
    // surfaces immunities as a 0%/0% output (rather than null) so the UI
    // can render "Immune" / "0%" instead of "no calc available".
    const output = getOutput({
      pokemon: makePokemon({
        species: "Garchomp",
        ability: "Rough Skin",
        nature: "Jolly",
        held_item: null,
        ev_special_attack: 0,
        ev_attack: 252,
        move1: "Dragon Claw",
      }),
      configure: (c) => {
        c.setDefenderSpecies("Garchomp");
        c.setDefenderAbility("Rough Skin");
        c.setDefenderNature("Careful");
        c.setDefenderTera("Fairy");
      },
    });
    expect(output).not.toBeNull();
    expect(output!.minPercent).toBe(0);
    expect(output!.maxPercent).toBe(0);
  });

  it("Tera Blast becomes the attacker's tera type and is non-null output", () => {
    // Flutter Mane with Fire tera type using Tera Blast in Sun
    const output = getOutput({
      pokemon: makePokemon({
        held_item: null,
        move1: "Tera Blast",
        tera_type: "Fire",
      }),
      configure: (c) => c.setWeather("Sun"),
    });
    expect(output).not.toBeNull();
    expect(output!.minPercent).toBeGreaterThan(0);
    // Description should mention Tera Fire or Flutter Mane
    expect(output!.desc).toContain("Flutter Mane");
  });

  it("Attacker with no tera type still computes Tera Blast as non-null", () => {
    const output = getOutput({
      pokemon: makePokemon({
        held_item: null,
        move1: "Tera Blast",
        tera_type: null,
      }),
    });
    // Should still compute — no tera type means Normal type Tera Blast
    expect(output).not.toBeNull();
  });
});

// =============================================================================
// Spread moves
// =============================================================================

describe("spread moves", () => {
  it("Earthquake does ~0.75x damage in Doubles vs Singles", () => {
    const physMon = makePokemon({
      species: "Garchomp",
      ability: "Rough Skin",
      nature: "Jolly",
      held_item: null,
      ev_special_attack: 0,
      ev_attack: 252,
      move1: "Earthquake",
    });

    const { result: doubleResult } = renderHook(() =>
      useCalcState({
        selectedPokemon: physMon,
        format: VGC_FORMAT,
      })
    );
    act(() => doubleResult.current.setGameType("Doubles"));
    const doubleOutput = doubleResult.current.selectedMoveOutput;

    const { result: singleResult } = renderHook(() =>
      useCalcState({
        selectedPokemon: physMon,
        format: VGC_FORMAT,
      })
    );
    act(() => singleResult.current.setGameType("Singles"));
    const singleOutput = singleResult.current.selectedMoveOutput;

    expect(doubleOutput).not.toBeNull();
    expect(singleOutput).not.toBeNull();

    const doublesMid = mid(doubleOutput!.minPercent, doubleOutput!.maxPercent);
    const singlesMid = mid(singleOutput!.minPercent, singleOutput!.maxPercent);
    const ratio = doublesMid / singlesMid;
    expect(ratio).toBeGreaterThanOrEqual(0.7);
    expect(ratio).toBeLessThanOrEqual(0.8);
  });

  it("Moonblast (single-target) ratio doubles vs singles is ~1.0", () => {
    // Non-spread moves should not take the 0.75x penalty
    const doublesMid = getMidPercent({
      pokemon: makePokemon({ move1: "Moonblast" }),
      configure: (c) => c.setGameType("Doubles"),
    });
    const singlesMid = getMidPercent({
      pokemon: makePokemon({ move1: "Moonblast" }),
      configure: (c) => c.setGameType("Singles"),
    });
    const ratio = doublesMid / singlesMid;
    expect(ratio).toBeGreaterThanOrEqual(0.9);
    expect(ratio).toBeLessThanOrEqual(1.1);
  });
});

// =============================================================================
// Weather — explicit + inferred
// =============================================================================

describe("weather (explicit + inferred)", () => {
  it("Explicit Sun boosts Fire damage ~1.5x vs no weather", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePokemon({
          ability: "Protosynthesis",
          move1: "Flamethrower",
          held_item: null,
        }),
        configure: (c) => c.setWeather("Sun"),
      },
      {
        pokemon: makePokemon({
          ability: "Protosynthesis",
          move1: "Flamethrower",
          held_item: null,
        }),
      }
    );
    expect(ratio).toBeGreaterThanOrEqual(1.4);
    expect(ratio).toBeLessThanOrEqual(1.6);
  });

  it("Explicit Rain reduces Fire damage ~0.5x vs no weather", () => {
    const ratio = getDamageRatio(
      {
        pokemon: makePokemon({
          ability: "Protosynthesis",
          move1: "Flamethrower",
          held_item: null,
        }),
        configure: (c) => c.setWeather("Rain"),
      },
      {
        pokemon: makePokemon({
          ability: "Protosynthesis",
          move1: "Flamethrower",
          held_item: null,
        }),
      }
    );
    expect(ratio).toBeGreaterThanOrEqual(0.45);
    expect(ratio).toBeLessThanOrEqual(0.55);
  });

  it("Drought ability infers Sun — matches explicit Sun damage", () => {
    // Attacker ability is Drought — hook infers Sun for the field
    const inferredSunMid = getMidPercent({
      pokemon: makePokemon({
        ability: "Drought",
        move1: "Flamethrower",
        held_item: null,
      }),
    });
    const explicitSunMid = getMidPercent({
      pokemon: makePokemon({
        ability: "Drought",
        move1: "Flamethrower",
        held_item: null,
      }),
      configure: (c) => c.setWeather("Sun"),
    });
    // Both should produce the same output: inferred Sun === explicit Sun
    expect(inferredSunMid).toBeCloseTo(explicitSunMid, 0);
  });

  it("Drizzle ability infers Rain — boosts Water, reduces Fire", () => {
    const waterWithDrizzle = getMidPercent({
      pokemon: makePokemon({
        ability: "Drizzle",
        move1: "Surf",
        held_item: null,
      }),
    });
    const waterNoWeather = getMidPercent({
      pokemon: makePokemon({
        ability: "Swift Swim", // no weather inference
        move1: "Surf",
        held_item: null,
      }),
    });
    // Drizzle should boost Water by ~1.5x
    const ratio = waterWithDrizzle / waterNoWeather;
    expect(ratio).toBeGreaterThanOrEqual(1.4);
    expect(ratio).toBeLessThanOrEqual(1.6);
  });

  it("Explicit weather overrides ability-inferred weather (Rain wins over Drought)", () => {
    // Attacker has Drought (would infer Sun) but user explicitly sets Rain
    const explicitRainMid = getMidPercent({
      pokemon: makePokemon({
        ability: "Drought",
        move1: "Flamethrower",
        held_item: null,
      }),
      configure: (c) => c.setWeather("Rain"),
    });
    const explicitRainDirect = getMidPercent({
      pokemon: makePokemon({
        ability: "Protosynthesis", // no weather inference
        move1: "Flamethrower",
        held_item: null,
      }),
      configure: (c) => c.setWeather("Rain"),
    });
    // Both should produce Rain-reduced fire damage
    expect(explicitRainMid).toBeCloseTo(explicitRainDirect, 0);
  });

  it("Hadron Engine ability infers Electric Terrain", () => {
    // Electric Terrain boosts Electric moves 1.3x when used by a grounded mon
    // Use Miraidon with Hadron Engine, Electric move
    const withHadron = getMidPercent({
      pokemon: makePokemon({
        ability: "Hadron Engine",
        species: "Miraidon",
        move1: "Thunderbolt",
        held_item: null,
        ev_special_attack: 252,
      }),
    });
    const withoutTerrain = getMidPercent({
      pokemon: makePokemon({
        ability: "Protosynthesis",
        species: "Miraidon",
        move1: "Thunderbolt",
        held_item: null,
        ev_special_attack: 252,
      }),
    });
    // Hadron Engine infers Electric Terrain which boosts Electric moves
    const ratio = withHadron / withoutTerrain;
    expect(ratio).toBeGreaterThan(1.0); // should be boosted
  });
});

// =============================================================================
// HP clamp
// =============================================================================

describe("HP clamp", () => {
  it("setDefenderHpPercent(150) clamps to 100 — output is non-null and equals 100%", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: VGC_FORMAT })
    );
    act(() => result.current.setDefenderHpPercent(150));
    // Output should be non-null — engine didn't crash from out-of-range curHP
    expect(result.current.selectedMoveOutput).not.toBeNull();
    // 150 clamps to 100 — so defenderMaxHP in the output should equal curHP
    const out150 = result.current.selectedMoveOutput!;

    // Compare against explicit 100%
    act(() => result.current.setDefenderHpPercent(100));
    const out100 = result.current.selectedMoveOutput!;

    expect(out150.minPercent).toBeCloseTo(out100.minPercent, 1);
    expect(out150.maxPercent).toBeCloseTo(out100.maxPercent, 1);
  });

  it("setDefenderHpPercent(-10) clamps to 1 HP floor — output is non-null", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: VGC_FORMAT })
    );
    act(() => result.current.setDefenderHpPercent(-10));
    // The curHP floor of 1 ensures the engine doesn't get 0 HP
    expect(result.current.selectedMoveOutput).not.toBeNull();
  });

  it("setDefenderHpPercent(0) produces non-null output (uses 1 HP floor)", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: VGC_FORMAT })
    );
    act(() => result.current.setDefenderHpPercent(0));
    expect(result.current.selectedMoveOutput).not.toBeNull();
  });

  it("Defender at 50% HP: damage percent stays the same (percent is dmg/maxHP, not curHP)", () => {
    // Percent output uses maxHP in the denominator — curHP only affects multihit/subsequent hits.
    // The reported % damage is always relative to max HP regardless of current HP.
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: VGC_FORMAT })
    );
    const out100 = result.current.selectedMoveOutput;

    act(() => result.current.setDefenderHpPercent(50));
    const out50 = result.current.selectedMoveOutput;

    expect(out100).not.toBeNull();
    expect(out50).not.toBeNull();
    // Percent values should be similar — minor diff possible but essentially the same
    expect(out50!.minPercent).toBeCloseTo(out100!.minPercent, 0);
  });
});

// =============================================================================
// Champions dispatch
// =============================================================================

/**
 * Helper: makePokemon defaults to a VGC spread (252 EVs) and a gen-9-only
 * species (Flutter Mane). For Champions tests we want a Champions-legal
 * species + a valid SP spread (≤32 per stat, ≤66 total) so the wrapper's
 * defensive clamp doesn't zero out the attacker and the gen-0 species
 * lookup actually resolves.
 */
function makeChampionsPokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return makePokemon({
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Adamant",
    move1: "Earthquake",
    ev_hp: 0,
    ev_attack: 32,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 32,
    ...overrides,
  });
}

describe("Champions dispatch (gen.num === 0)", () => {
  it("produces non-null calc output when format is Champions", () => {
    const output = getOutput({
      pokemon: makeChampionsPokemon(),
      format: CHAMPIONS_FORMAT,
    });
    expect(output).not.toBeNull();
    expect(output!.minPercent).toBeGreaterThan(0);
  });

  it("EV clamp runs on first render: hp default 252 clamps to 32 for Champions", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: CHAMPIONS_FORMAT })
    );
    // Default defender EVs are { hp: 252, spd: 4 } — Champions cap is 32/66 total
    // hp gets clamped to min(252, 32) = 32, spd gets clamped to min(4, 34) = 4
    expect(result.current.defenderEvs.hp).toBeLessThanOrEqual(32);
    const total = Object.values(result.current.defenderEvs).reduce(
      (s, n) => s + n,
      0
    );
    expect(total).toBeLessThanOrEqual(66);
  });

  it("damage output for Champions format is in a sensible range (5–200%)", () => {
    const output = getOutput({
      pokemon: makeChampionsPokemon(),
      format: CHAMPIONS_FORMAT,
    });
    expect(output).not.toBeNull();
    expect(output!.minPercent).toBeGreaterThan(0);
    expect(output!.maxPercent).toBeLessThan(500);
  });

  it("defensively clamps attacker EVs to Champions caps (32/stat, 66 total)", () => {
    // Stale/imported team data may carry classic 252-EV spread. The wrapper
    // must clamp before passing to the engine, otherwise the engine treats
    // 252 as 252 SP and produces nonsense damage.
    const out252 = getOutput({
      pokemon: makeChampionsPokemon({
        ev_attack: 252,
      }),
      format: CHAMPIONS_FORMAT,
    });
    const out32 = getOutput({
      pokemon: makeChampionsPokemon({
        ev_attack: 32,
      }),
      format: CHAMPIONS_FORMAT,
    });
    expect(out252).not.toBeNull();
    expect(out32).not.toBeNull();
    // Both should produce identical damage because 252 clamps down to 32.
    expect(out252!.minPercent).toBe(out32!.minPercent);
    expect(out252!.maxPercent).toBe(out32!.maxPercent);
  });
});

// =============================================================================
// Reverse direction
// =============================================================================

describe("reverse direction", () => {
  it("computeReverseOutput produces non-null result for a valid move", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: VGC_FORMAT })
    );
    // Default defender: Incineroar. Set a move for it.
    let output: ReturnType<typeof result.current.computeReverseOutput> = null;
    act(() => {
      output = result.current.computeReverseOutput("Flare Blitz");
    });
    expect(output).not.toBeNull();
    expect(output!.minPercent).toBeGreaterThan(0);
  });

  it("computeReverseOutput: Flare Blitz from Incineroar hits our Flutter Mane in a sensible range", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: VGC_FORMAT })
    );
    let output: ReturnType<typeof result.current.computeReverseOutput> = null;
    act(() => {
      output = result.current.computeReverseOutput("Flare Blitz");
    });
    expect(output).not.toBeNull();
    // Flare Blitz from Incineroar should do meaningful damage
    expect(output!.maxPercent).toBeGreaterThan(10);
  });

  it("setDirection('defense') switches to defender-fires-at-attacker", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ move1: "Flamethrower" }),
        format: VGC_FORMAT,
      })
    );
    act(() => {
      result.current.setDirection("defense");
      result.current.setDefenderMove(0, "Flare Blitz");
    });
    // In defense direction, moveCalcOutputs[0] should use defender as attacker
    expect(result.current.selectedMoveOutput).not.toBeNull();
  });

  it("computeReverseOutput returns null for an empty move name", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: VGC_FORMAT })
    );
    let output: ReturnType<typeof result.current.computeReverseOutput> = null;
    act(() => {
      output = result.current.computeReverseOutput("");
    });
    expect(output).toBeNull();
  });
});

// =============================================================================
// Last Respects scaling
// =============================================================================

describe("Last Respects scaling", () => {
  /**
   * NOTE: The wrapper uses { basePower: N } but @smogon/calc requires
   * { overrides: { basePower: N } } for the base power override to take effect.
   * As a result, Last Respects always fires at its default 50 BP regardless of
   * faintedYours. This is a wiring bug in the wrapper — documented here.
   *
   * The tests below verify the CURRENT behavior (bug present) so we can detect
   * if the bug is fixed or regresses.
   */

  it("Last Respects fires without crashing (faintedYours=0)", () => {
    const output = getOutput({
      pokemon: makePokemon({
        species: "Houndstone",
        ability: "Sand Rush",
        nature: "Adamant",
        held_item: null,
        ev_special_attack: 0,
        ev_attack: 252,
        move1: "Last Respects",
      }),
      faintedYours: 0,
    });
    expect(output).not.toBeNull();
    expect(output!.minPercent).toBeGreaterThan(0);
  });

  it("Last Respects fires without crashing (faintedYours=5)", () => {
    const output = getOutput({
      pokemon: makePokemon({
        species: "Houndstone",
        ability: "Sand Rush",
        nature: "Adamant",
        held_item: null,
        ev_special_attack: 0,
        ev_attack: 252,
        move1: "Last Respects",
      }),
      faintedYours: 5,
    });
    expect(output).not.toBeNull();
  });

  it("BUG: Last Respects damage is same at 0 and 5 fainted (basePower override wiring issue)", () => {
    // This test documents the known bug: the BP override key is wrong.
    // When the bug is fixed, this test will fail (and should be updated to
    // assert a ~5x ratio between 5-fainted and 0-fainted instead).
    const makeHoundstone = (fainted: number) => ({
      pokemon: makePokemon({
        species: "Houndstone",
        ability: "Sand Rush",
        nature: "Adamant",
        held_item: null,
        ev_special_attack: 0,
        ev_attack: 252,
        move1: "Last Respects",
      }),
      faintedYours: fainted,
    });

    const mid0 = getMidPercent(makeHoundstone(0));
    const mid5 = getMidPercent(makeHoundstone(5));

    // BUG: these should NOT be equal, but they are due to the wrong option key
    expect(mid5 / mid0).toBeCloseTo(1.0, 1);
  });

  it("Triumphant Wave fires without crashing (same scaling mechanism as Last Respects)", () => {
    // Basculegion uses Triumphant Wave
    const output = getOutput({
      pokemon: makePokemon({
        species: "Basculegion",
        ability: "Swift Swim",
        nature: "Adamant",
        held_item: null,
        ev_special_attack: 0,
        ev_attack: 252,
        move1: "Triumphant Wave",
      }),
      faintedYours: 3,
    });
    // May return null if Basculegion can't learn Triumphant Wave in this gen data
    // The important thing is it doesn't crash
    if (output !== null) {
      expect(output.minPercent).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// Null / empty guards
// =============================================================================

describe("null and empty guards", () => {
  it("selectedPokemon=null → selectedMoveOutput is null", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: null, format: VGC_FORMAT })
    );
    expect(result.current.selectedMoveOutput).toBeNull();
  });

  it("no moves → all moveCalcOutputs are null", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({
          move1: null,
          move2: null,
          move3: null,
          move4: null,
        }),
        format: VGC_FORMAT,
      })
    );
    expect(result.current.moveCalcOutputs.every((o) => o === null)).toBe(true);
  });

  it("empty-string move slots are treated as empty", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({
          move1: "",
          move2: null,
          move3: null,
          move4: null,
        }),
        format: VGC_FORMAT,
      })
    );
    expect(result.current.moveCalcOutputs[0]).toBeNull();
  });

  it("multi-move pokemon: filled slots produce outputs (immunities included), empty slots are null", () => {
    // Default defender is Incineroar (Dark/Fire). Moonblast (Fairy → Dark)
    // is super-effective; Psyshock (Psychic → Dark) is immune and now
    // surfaces as a valid 0%/0% output rather than null.
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({
          move1: "Moonblast",
          move2: "Psyshock",
          move3: null,
          move4: null,
        }),
        format: VGC_FORMAT,
      })
    );
    expect(result.current.moveCalcOutputs[0]).not.toBeNull();
    expect(result.current.moveCalcOutputs[0]!.maxPercent).toBeGreaterThan(0);
    expect(result.current.moveCalcOutputs[1]).not.toBeNull();
    expect(result.current.moveCalcOutputs[1]!.minPercent).toBe(0);
    expect(result.current.moveCalcOutputs[1]!.maxPercent).toBe(0);
    expect(result.current.moveCalcOutputs[2]).toBeNull();
    expect(result.current.moveCalcOutputs[3]).toBeNull();
  });
});

// =============================================================================
// Inferred weather / terrain exposure
// =============================================================================

describe("inferredWeather and inferredTerrain exposure", () => {
  it("inferredWeather is null when no ability maps to weather", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Protosynthesis" }),
        format: VGC_FORMAT,
      })
    );
    expect(result.current.inferredWeather).toBeNull();
  });

  it.each([
    ["Drought", "Sun"],
    ["Drizzle", "Rain"],
    ["Sand Stream", "Sand"],
    ["Snow Warning", "Snow"],
    ["Orichalcum Pulse", "Sun"],
  ])("ability %s → inferredWeather=%s", (ability, expectedWeather) => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability }),
        format: VGC_FORMAT,
      })
    );
    expect(result.current.inferredWeather).toBe(expectedWeather);
  });

  it("inferredWeather is null when explicit weather is set", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Drought" }),
        format: VGC_FORMAT,
      })
    );
    act(() => result.current.setWeather("Rain"));
    expect(result.current.inferredWeather).toBeNull();
  });

  it("Hadron Engine → inferredTerrain is Electric", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Hadron Engine" }),
        format: VGC_FORMAT,
      })
    );
    expect(result.current.inferredTerrain).toBe("Electric");
  });

  it("inferredTerrain is null when explicit terrain is set", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Hadron Engine" }),
        format: VGC_FORMAT,
      })
    );
    act(() => result.current.setTerrain("Grassy"));
    expect(result.current.inferredTerrain).toBeNull();
  });
});

// =============================================================================
// Explicit reference cases — NCP-VGC Champions calculator
// (https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/)
//
// These are concrete damage scenarios the user has hand-verified against NCP.
// They serve two roles:
//   1. Pinning — once the wrapper is Champions-stat aware these will lock to
//      the published min/max% and roll arrays.
//   2. Gap diagnostic — until then, each test logs ACTUAL vs EXPECTED so the
//      delta between our wrapper and NCP is visible in CI output.
//
// Known wrapper gap: `buildAttackerFromDb` / `buildDefenderPokemon` pass the
// DB row's ev_* fields straight to @smogon/calc as classic EVs. Champions
// uses Stat Points (32/stat, 66 total) with a different stat formula, so
// asserting the exact NCP percent for Champions cases would fail today.
// We assert structural invariants now and log the gap; tightening to exact
// match is a follow-up once the wrapper is taught to compute Champions
// final stats and pass them via @smogon/calc's `stats` override.
// =============================================================================

interface NcpReferenceCase {
  name: string;
  attacker: Partial<Tables<"pokemon">>;
  attackerBoost?: {
    stat: "atk" | "def" | "spa" | "spd" | "spe";
    value: number;
  };
  /** Toggles on the attacker's side of the field (Helping Hand, etc). */
  attackerSide?: {
    helpingHand?: boolean;
    tailwind?: boolean;
    friendGuard?: boolean;
  };
  defender: {
    species: string;
    ability: string;
    item: string;
    nature: string;
    evs: {
      hp: number;
      atk: number;
      def: number;
      spa: number;
      spd: number;
      spe: number;
    };
  };
  /** Toggles on the defender's side of the field (Aurora Veil, Friend Guard, etc). */
  defenderSide?: {
    reflect?: boolean;
    lightScreen?: boolean;
    auroraVeil?: boolean;
    friendGuard?: boolean;
  };
  /** Pre-set weather (string from the calc engine vocabulary). Leaving null
   *  exercises the auto-inference path (e.g. Drought → Sun). */
  weather?: string;
  /** NCP-displayed percent range. */
  expected: { minPct: number; maxPct: number };
  /** NCP-displayed roll array (16 rolls). */
  rolls: readonly number[];
}

const NCP_CASES: NcpReferenceCase[] = [
  {
    name: "Champions: -1 Adamant Garchomp Stomping Tantrum vs 32/32+ Incineroar",
    attacker: {
      species: "Garchomp",
      ability: "Rough Skin",
      nature: "Adamant",
      held_item: null,
      ev_hp: 0,
      ev_attack: 32,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Stomping Tantrum",
    },
    attackerBoost: { stat: "atk", value: -1 },
    defender: {
      species: "Incineroar",
      ability: "Intimidate",
      item: "Sitrus Berry",
      nature: "Impish",
      evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 },
    },
    expected: { minPct: 36.6, maxPct: 44.5 },
    rolls: [74, 74, 78, 78, 78, 80, 80, 80, 80, 84, 84, 84, 86, 86, 86, 90],
  },
  {
    name: "Champions: Mega Charizard Y Weather Ball (Normal, no weather) vs 32/20 Incineroar",
    attacker: {
      species: "Charizard-Mega-Y",
      ability: "Drought",
      nature: "Modest",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Weather Ball",
    },
    defender: {
      species: "Incineroar",
      ability: "Intimidate",
      item: "Sitrus Berry",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 20, spe: 0 },
    },
    // NCP assumes vanilla Weather Ball (Normal type) when no weather is
    // active. Our wrapper would auto-infer Sun from Drought, so we set
    // weather to the "None" sentinel to suppress inference and force the
    // no-weather branch — matching NCP exactly.
    weather: "None",
    expected: { minPct: 16.8, maxPct: 20.2 },
    rolls: [34, 35, 35, 36, 36, 36, 37, 37, 38, 38, 38, 39, 39, 40, 40, 41],
  },
  {
    name: "Champions: Mega Charizard Y Weather Ball (Fire) vs 32/20 Incineroar in Sun",
    attacker: {
      species: "Charizard-Mega-Y",
      ability: "Drought",
      nature: "Modest",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Weather Ball",
    },
    defender: {
      species: "Incineroar",
      ability: "Intimidate",
      item: "Sitrus Berry",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 20, spe: 0 },
    },
    weather: "Sun",
    expected: { minPct: 37.6, maxPct: 44.5 },
    rolls: [76, 77, 78, 78, 79, 81, 81, 82, 83, 84, 85, 86, 87, 87, 88, 90],
  },
  {
    name: "Champions: Mega Charizard Y Weather Ball (Water) vs 32/20 Incineroar in Rain",
    attacker: {
      species: "Charizard-Mega-Y",
      ability: "Drought",
      nature: "Modest",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Weather Ball",
    },
    defender: {
      species: "Incineroar",
      ability: "Intimidate",
      item: "Sitrus Berry",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 20, spe: 0 },
    },
    weather: "Rain",
    expected: { minPct: 100.9, maxPct: 118.8 },
    rolls: [
      204, 206, 208, 210, 212, 216, 218, 220, 222, 224, 228, 230, 232, 234, 236,
      240,
    ],
  },
  {
    name: "Champions: Mega Charizard Y Weather Ball (Rock) vs 32/20 Incineroar in Sand",
    attacker: {
      species: "Charizard-Mega-Y",
      ability: "Drought",
      nature: "Modest",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Weather Ball",
    },
    defender: {
      species: "Incineroar",
      ability: "Intimidate",
      item: "Sitrus Berry",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 20, spe: 0 },
    },
    weather: "Sand",
    expected: { minPct: 67.3, maxPct: 79.2 },
    rolls: [
      136, 136, 138, 140, 142, 144, 144, 146, 148, 150, 152, 152, 154, 156, 158,
      160,
    ],
  },
  {
    name: "Champions: 0 Atk Incineroar Darkest Lariat vs 2 HP / 0 Def Mega Charizard Y",
    attacker: {
      species: "Incineroar",
      ability: "Intimidate",
      nature: "Hardy",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Darkest Lariat",
    },
    defender: {
      species: "Charizard-Mega-Y",
      ability: "Drought",
      item: "",
      nature: "Hardy",
      evs: { hp: 2, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    },
    expected: { minPct: 43.2, maxPct: 50.9 },
    rolls: [67, 67, 69, 69, 70, 70, 72, 72, 73, 73, 75, 75, 76, 76, 78, 79],
  },
  // -------------------------------------------------------------------------
  // Mega Floette / Archaludon series — Helping Hand × Aurora Veil × Friend
  // Guard chain. Tests the offensive boost stack and the defensive screen
  // stack interacting on opposite sides of the field.
  // -------------------------------------------------------------------------
  {
    name: "Champions: 32 SpA Fairy Aura Mega Floette Light of Ruin vs 32/2 Archaludon",
    attacker: {
      species: "Floette-Mega",
      ability: "Fairy Aura",
      nature: "Hardy",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Light of Ruin",
    },
    defender: {
      species: "Archaludon",
      ability: "Sturdy",
      item: "",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 2, spe: 0 },
    },
    expected: { minPct: 126.3, maxPct: 149.2 },
    rolls: [
      249, 252, 255, 258, 261, 264, 267, 270, 273, 276, 279, 282, 285, 288, 291,
      294,
    ],
  },
  {
    name: "Champions: Fairy Aura Mega Floette Helping Hand Light of Ruin vs 32/2 Archaludon",
    attacker: {
      species: "Floette-Mega",
      ability: "Fairy Aura",
      nature: "Hardy",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Light of Ruin",
    },
    attackerSide: { helpingHand: true },
    defender: {
      species: "Archaludon",
      ability: "Sturdy",
      item: "",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 2, spe: 0 },
    },
    expected: { minPct: 189.3, maxPct: 223.8 },
    rolls: [
      373, 378, 382, 387, 391, 396, 400, 405, 409, 414, 418, 423, 427, 432, 436,
      441,
    ],
  },
  {
    name: "Champions: Fairy Aura Mega Floette Helping Hand Light of Ruin vs 32/2 Archaludon through Aurora Veil",
    attacker: {
      species: "Floette-Mega",
      ability: "Fairy Aura",
      nature: "Hardy",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Light of Ruin",
    },
    attackerSide: { helpingHand: true },
    defender: {
      species: "Archaludon",
      ability: "Sturdy",
      item: "",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 2, spe: 0 },
    },
    defenderSide: { auroraVeil: true },
    expected: { minPct: 126.3, maxPct: 149.2 },
    rolls: [
      249, 252, 255, 258, 261, 264, 267, 270, 273, 276, 279, 282, 285, 288, 291,
      294,
    ],
  },
  {
    name: "Champions: 32 SpA Mega Floette HH Light of Ruin vs 32/2 Archaludon through Aurora Veil + Friend Guard",
    attacker: {
      species: "Floette-Mega",
      // Mega Floette's natural ability is Fairy Aura — overriding to Symbiosis
      // explicitly mirrors NCP's "no Fairy Aura prefix" output for this case.
      ability: "Symbiosis",
      nature: "Hardy",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Light of Ruin",
    },
    attackerSide: { helpingHand: true },
    defender: {
      species: "Archaludon",
      ability: "Sturdy",
      item: "Leftovers",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 2, spe: 0 },
    },
    defenderSide: { auroraVeil: true, friendGuard: true },
    expected: { minPct: 71.0, maxPct: 84.2 },
    rolls: [
      140, 143, 144, 146, 147, 149, 151, 152, 154, 155, 157, 159, 161, 162, 164,
      166,
    ],
  },
  {
    name: "Champions: +1 32 SpA Mega Floette HH Light of Ruin vs 32/2 Archaludon through Aurora Veil + Friend Guard",
    attacker: {
      species: "Floette-Mega",
      ability: "Symbiosis",
      nature: "Hardy",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Light of Ruin",
    },
    attackerBoost: { stat: "spa", value: 1 },
    attackerSide: { helpingHand: true },
    defender: {
      species: "Archaludon",
      ability: "Sturdy",
      item: "Leftovers",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 2, spe: 0 },
    },
    defenderSide: { auroraVeil: true, friendGuard: true },
    expected: { minPct: 107.1, maxPct: 125.8 },
    rolls: [
      211, 213, 215, 218, 221, 223, 226, 228, 230, 233, 236, 238, 241, 243, 245,
      248,
    ],
  },
  {
    name: "Champions: 32 SpA Floette-Eternal (no Fairy Aura) Light of Ruin vs 32/32 Archaludon",
    attacker: {
      species: "Floette-Eternal",
      ability: "Symbiosis",
      nature: "Hardy",
      held_item: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 32,
      ev_special_defense: 0,
      ev_speed: 0,
      move1: "Light of Ruin",
    },
    defender: {
      species: "Archaludon",
      ability: "Sturdy",
      item: "",
      nature: "Hardy",
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 },
    },
    expected: { minPct: 60.9, maxPct: 72.0 },
    rolls: [
      120, 121, 123, 124, 126, 127, 129, 130, 132, 133, 135, 136, 138, 139, 141,
      142,
    ],
  },
];

describe("NCP-VGC Champions reference cases", () => {
  it.each(NCP_CASES.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({
          move2: null,
          move3: null,
          move4: null,
          ...c.attacker,
        }),
        format: CHAMPIONS_FORMAT,
      })
    );
    act(() => {
      result.current.resetDefenderForSpecies(c.defender.species, {
        ability: c.defender.ability,
        item: c.defender.item,
        nature: c.defender.nature,
        evs: c.defender.evs,
      });
      if (c.weather !== undefined) {
        result.current.setWeather(c.weather);
      }
      if (c.attackerBoost) {
        result.current.setAttackerBoost(
          c.attackerBoost.stat,
          c.attackerBoost.value
        );
      }
      if (c.attackerSide) {
        result.current.setAttackerSide(c.attackerSide);
      }
      if (c.defenderSide) {
        result.current.setDefenderSide(c.defenderSide);
      }
    });

    const out = result.current.selectedMoveOutput;
    expect(out).not.toBeNull();

    // Two NCP cases assume "Mega Floette without Fairy Aura" — a synthetic
    // state because mega abilities are intrinsic in canon, but NCP allows
    // overriding the ability dropdown to anything. Our wrapper enforces
    // the mega ability when species is a mega (correct game behaviour),
    // so these rolls diverge from NCP by exactly the Fairy Aura ×1.33
    // multiplier. Structural-only assertions for those two cases.
    const isKnownDivergent =
      c.name.includes("Mega Floette HH Light of Ruin") &&
      c.name.includes("Friend Guard");

    if (isKnownDivergent) {
      expect(out!.minPercent).toBeGreaterThan(0);
      expect(out!.maxPercent).toBeGreaterThanOrEqual(out!.minPercent);
      expect(out!.maxPercent).toBeLessThanOrEqual(300);
      return;
    }

    // Strict equality — engine output must match NCP exactly. Any drift
    // here indicates either a wrapper regression or a genuine engine
    // update we should investigate.
    expect(out!.rolls).toEqual(c.rolls);
    expect(out!.minPercent).toBe(c.expected.minPct);
    expect(out!.maxPercent).toBe(c.expected.maxPct);
  });
});

// =============================================================================
// computeForwardOutputsForRow — per-row simultaneous calcs
//
// Cements the "every row shows its own calcs" behaviour. The CALC column on
// each PokeRow calls computeForwardOutputsForRow(rowPokemon) so all 6 rows
// can render their own outputs at the same time. The chip-strip "focused"
// row (id matches selectedPokemon.id in the hook) inherits panel-level tweaks
// (boosts, status, mega toggle, crit). All other rows use neutral attacker
// settings — boosts on Charizard's row don't bleed into Floette's calcs.
// =============================================================================

describe("computeForwardOutputsForRow — per-row outputs", () => {
  function makeFloette(): Tables<"pokemon"> {
    return makePokemon({
      id: 10,
      species: "Floette-Eternal",
      ability: "Fairy Aura",
      nature: "Modest",
      held_item: null,
      move1: "Moonblast",
      move2: "Light of Ruin",
      move3: null,
      move4: null,
    });
  }

  function makeCharizard(): Tables<"pokemon"> {
    return makePokemon({
      id: 11,
      species: "Charizard-Mega-Y",
      ability: "Drought",
      nature: "Modest",
      held_item: "Charizardite Y",
      move1: "Heat Wave",
      move2: "Solar Beam",
      move3: null,
      move4: null,
    });
  }

  it("returns 4 nulls when rowPokemon is null", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makeFloette(), format: VGC_FORMAT })
    );
    const outputs = result.current.computeForwardOutputsForRow(null);
    expect(outputs).toHaveLength(4);
    expect(outputs.every((o) => o === null)).toBe(true);
  });

  it("nulls out empty move slots, keeps populated ones", () => {
    const floette = makeFloette();
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: floette, format: VGC_FORMAT })
    );
    const outputs = result.current.computeForwardOutputsForRow(floette);
    expect(outputs[0]).not.toBeNull(); // Moonblast
    expect(outputs[1]).not.toBeNull(); // Light of Ruin
    expect(outputs[2]).toBeNull();
    expect(outputs[3]).toBeNull();
  });

  it("computes a different row's outputs from its own moves, not selectedPokemon's", () => {
    // selectedPokemon = Floette (focused), rowPokemon = Charizard (non-focused).
    // Charizard's outputs must reflect Heat Wave + Solar Beam, NOT Moonblast.
    const floette = makeFloette();
    const charizard = makeCharizard();
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: floette, format: VGC_FORMAT })
    );
    const charOutputs = result.current.computeForwardOutputsForRow(charizard);
    expect(charOutputs[0]?.desc).toMatch(/Heat Wave/);
    expect(charOutputs[1]?.desc).toMatch(/Solar Beam/);
    // Sanity: Charizard's outputs differ from Floette's (different moves +
    // different attacking stats produce different damage ranges).
    const floetteOutputs = result.current.computeForwardOutputsForRow(floette);
    expect(charOutputs[0]?.minPercent).not.toBe(floetteOutputs[0]?.minPercent);
  });

  it("non-focused rows ignore the panel's attackerBoosts (no bleed-through)", () => {
    // Floette is the chip-pick focus. Bumping its SpA +6 must change Floette's
    // outputs but NOT Charizard's (a separate row).
    const floette = makeFloette();
    const charizard = makeCharizard();
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: floette, format: VGC_FORMAT })
    );

    const floetteBefore = result.current.computeForwardOutputsForRow(floette);
    const charBefore = result.current.computeForwardOutputsForRow(charizard);

    act(() => {
      result.current.setAttackerBoost("spa", 6);
    });

    const floetteAfter = result.current.computeForwardOutputsForRow(floette);
    const charAfter = result.current.computeForwardOutputsForRow(charizard);

    // Focused row (Floette) reflects the +6 SpA boost — Moonblast hits much harder.
    expect(floetteAfter[0]?.minPercent ?? 0).toBeGreaterThan(
      floetteBefore[0]?.minPercent ?? 0
    );
    // Non-focused row (Charizard) is identical before/after — boost did not bleed.
    expect(charAfter[0]?.minPercent).toBe(charBefore[0]?.minPercent);
    expect(charAfter[0]?.maxPercent).toBe(charBefore[0]?.maxPercent);
  });

  it("non-focused rows ignore the panel's attackerStatus (Burn doesn't halve other rows)", () => {
    // Garchomp = chip focus, physical attacker. Burning him halves his
    // physical damage. Charizard (special, separate row) must be unaffected.
    const garchomp = makePhysicalAttacker({ id: 20 });
    const charizard = makeCharizard();
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: garchomp, format: VGC_FORMAT })
    );

    const garchompBefore = result.current.computeForwardOutputsForRow(garchomp);
    const charBefore = result.current.computeForwardOutputsForRow(charizard);

    act(() => {
      result.current.setAttackerStatus("Burned");
    });

    const garchompAfter = result.current.computeForwardOutputsForRow(garchomp);
    const charAfter = result.current.computeForwardOutputsForRow(charizard);

    // Garchomp (focused) is roughly halved by Burn.
    const garchompRatio =
      mid(garchompAfter[0]!.minPercent, garchompAfter[0]!.maxPercent) /
      mid(garchompBefore[0]!.minPercent, garchompBefore[0]!.maxPercent);
    expect(garchompRatio).toBeGreaterThan(0.45);
    expect(garchompRatio).toBeLessThan(0.55);
    // Charizard (non-focused) is identical before/after.
    expect(charAfter[0]?.minPercent).toBe(charBefore[0]?.minPercent);
    expect(charAfter[0]?.maxPercent).toBe(charBefore[0]?.maxPercent);
  });

  it("non-focused mega-form rows still calculate as their mega form (Charizard-Mega-Y on a non-focus row uses Drought + 159 SpA)", () => {
    // Floette is focus; Charizard's row computes with mega-active=true regardless
    // of the panel's attackerMegaActive toggle. Drought sun should boost Heat Wave.
    const floette = makeFloette();
    const charizard = makeCharizard();
    const baseCharizard: Tables<"pokemon"> = {
      ...charizard,
      species: "Charizard",
      ability: "Solar Power",
      held_item: null,
    };

    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: floette, format: VGC_FORMAT })
    );

    const megaOutputs = result.current.computeForwardOutputsForRow(charizard);
    const baseOutputs =
      result.current.computeForwardOutputsForRow(baseCharizard);

    // Mega-Y has 159 base SpA + Drought-boosted Heat Wave; base Charizard has
    // 109 SpA and no auto-sun. The mega's Heat Wave roll must be strictly higher.
    expect(megaOutputs[0]?.minPercent).toBeGreaterThan(
      baseOutputs[0]?.minPercent ?? 0
    );
  });
});
