"use client";

import { renderHook } from "@testing-library/react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mock CALC_TARGETS so tests are deterministic and don't rely on the full
// meta-spread list. We inject a controlled subset covering the cases we need.
// =============================================================================

jest.mock("../calc/calc-target-options", () => ({
  CALC_TARGETS: [
    {
      name: "Incineroar",
      species: "Incineroar",
      ability: "Intimidate",
      item: "Sitrus Berry",
      nature: "Careful",
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
      moves: ["Knock Off", "Flare Blitz", "U-turn", "Fake Out"],
    },
    {
      name: "Flutter Mane",
      species: "Flutter Mane",
      ability: "Protosynthesis",
      item: "Booster Energy",
      nature: "Timid",
      evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
      // No moves field — to test preset without moves
      moves: ["Moonblast", "Shadow Ball", "Dazzling Gleam", "Icy Wind"],
    },
  ],
}));

import { useDefenderMoves } from "../calc/use-defender-moves";

// =============================================================================
// Helpers
// =============================================================================

const EMPTY_MOVES: [string, string, string, string] = ["", "", "", ""];

/** Minimal Tables<"pokemon"> fixture. Only fields consumed by useDefenderMoves. */
function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Garchomp",
    ability: "Rough Skin",
    nature: "Hardy",
    move1: "Dragon Claw",
    move2: "Earthquake",
    move3: "Scale Shot",
    move4: "Protect",
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: null,
    nickname: null,
    notes: null,
    tera_type: null,
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("useDefenderMoves", () => {
  // ---------------------------------------------------------------------------
  // 1. All slots empty, species not in CALC_TARGETS, no teammates
  //    → all 4 effective moves are ""; hasOverrides false
  // ---------------------------------------------------------------------------

  it("returns empty effective moves and hasOverrides=false when nothing is set", () => {
    const { result } = renderHook(() =>
      useDefenderMoves({
        defenderSpecies: "Garchomp",
        defenderMoves: EMPTY_MOVES,
        teammates: [],
      })
    );

    expect(result.current.effectiveMoves).toEqual(["", "", "", ""]);
    expect(result.current.hasOverrides).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 2. All slots empty, species IS in CALC_TARGETS (Incineroar)
  //    → effective moves come from preset; hasOverrides false
  // ---------------------------------------------------------------------------

  it("fills moves from CALC_TARGETS preset when defenderMoves are all empty", () => {
    const { result } = renderHook(() =>
      useDefenderMoves({
        defenderSpecies: "Incineroar",
        defenderMoves: EMPTY_MOVES,
        teammates: [],
      })
    );

    expect(result.current.effectiveMoves).toEqual([
      "Knock Off",
      "Flare Blitz",
      "U-turn",
      "Fake Out",
    ]);
    expect(result.current.hasOverrides).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 3. Explicit override in slot 0 ("Knock Off"), species "Incineroar"
  //    → slot 0 is "Knock Off" (same as preset here, but it's the override),
  //      slots 1-3 from preset; hasOverrides true
  //
  // Note: the override is only "override" when it differs from the default.
  // We use a custom move "Parting Shot" to guarantee it differs.
  // ---------------------------------------------------------------------------

  it("slot 0 explicit override beats the CALC_TARGETS preset for that slot", () => {
    const overrideMoves: [string, string, string, string] = [
      "Parting Shot",
      "",
      "",
      "",
    ];

    const { result } = renderHook(() =>
      useDefenderMoves({
        defenderSpecies: "Incineroar",
        defenderMoves: overrideMoves,
        teammates: [],
      })
    );

    expect(result.current.effectiveMoves[0]).toBe("Parting Shot");
    // Slots 1-3 fall through to preset
    expect(result.current.effectiveMoves[1]).toBe("Flare Blitz");
    expect(result.current.effectiveMoves[2]).toBe("U-turn");
    expect(result.current.effectiveMoves[3]).toBe("Fake Out");
    expect(result.current.hasOverrides).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Empty slots, species "Garchomp" not in CALC_TARGETS,
  //    "Garchomp" present in teammates with moves
  //    → effective moves come from teammate
  // ---------------------------------------------------------------------------

  it("falls back to teammate moves when species is not in CALC_TARGETS", () => {
    const garchomp = makePokemon({
      species: "Garchomp",
      move1: "Dragon Claw",
      move2: "Earthquake",
      move3: "Scale Shot",
      move4: "Protect",
    });

    const { result } = renderHook(() =>
      useDefenderMoves({
        defenderSpecies: "Garchomp",
        defenderMoves: EMPTY_MOVES,
        teammates: [garchomp],
      })
    );

    expect(result.current.effectiveMoves).toEqual([
      "Dragon Claw",
      "Earthquake",
      "Scale Shot",
      "Protect",
    ]);
    expect(result.current.hasOverrides).toBe(false);
  });

  it("teammate with null moves produces empty strings for those slots", () => {
    const garChmop = makePokemon({
      species: "Garchomp",
      move1: "Dragon Claw",
      move2: null,
      move3: null,
      move4: null,
    });

    const { result } = renderHook(() =>
      useDefenderMoves({
        defenderSpecies: "Garchomp",
        defenderMoves: EMPTY_MOVES,
        teammates: [garChmop],
      })
    );

    expect(result.current.effectiveMoves).toEqual([
      "Dragon Claw",
      "",
      "",
      "",
    ]);
    expect(result.current.hasOverrides).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Explicit override in slot 0, species in BOTH CALC_TARGETS and teammates
  //    → slot 0 explicit wins; slots 1-3 from CALC_TARGETS (beats teammate)
  // ---------------------------------------------------------------------------

  it("CALC_TARGETS beats teammates for non-overridden slots", () => {
    // Incineroar is in CALC_TARGETS (mocked above); also provide it as a teammate
    const incineroarTeammate = makePokemon({
      species: "Incineroar",
      move1: "Fake Out",
      move2: "Darkest Lariat",
      move3: "Will-O-Wisp",
      move4: "Protect",
    });

    const overrideMoves: [string, string, string, string] = [
      "Parting Shot",
      "",
      "",
      "",
    ];

    const { result } = renderHook(() =>
      useDefenderMoves({
        defenderSpecies: "Incineroar",
        defenderMoves: overrideMoves,
        teammates: [incineroarTeammate],
      })
    );

    // Slot 0: explicit override wins
    expect(result.current.effectiveMoves[0]).toBe("Parting Shot");
    // Slots 1-3: CALC_TARGETS, NOT the teammate moves
    expect(result.current.effectiveMoves[1]).toBe("Flare Blitz"); // from preset
    expect(result.current.effectiveMoves[2]).toBe("U-turn");      // from preset
    expect(result.current.effectiveMoves[3]).toBe("Fake Out");    // from preset
    expect(result.current.hasOverrides).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. Override that matches the default does NOT set hasOverrides
  // ---------------------------------------------------------------------------

  it("hasOverrides is false when override value matches the preset default", () => {
    // "Knock Off" is already the CALC_TARGETS slot-0 value for Incineroar
    const overrideMoves: [string, string, string, string] = [
      "Knock Off",
      "",
      "",
      "",
    ];

    const { result } = renderHook(() =>
      useDefenderMoves({
        defenderSpecies: "Incineroar",
        defenderMoves: overrideMoves,
        teammates: [],
      })
    );

    // The move is non-empty and matches the preset, so not considered an override
    expect(result.current.hasOverrides).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 7. Parameterised: priority across different configurations
  // ---------------------------------------------------------------------------

  it.each([
    {
      label: "no preset, no teammate, no override → all empty",
      defenderSpecies: "Unknown Species",
      defenderMoves: EMPTY_MOVES,
      teammates: [],
      expected: ["", "", "", ""],
      hasOverrides: false,
    },
    {
      label: "preset species, no override → preset moves used",
      defenderSpecies: "Incineroar",
      defenderMoves: EMPTY_MOVES,
      teammates: [],
      expected: ["Knock Off", "Flare Blitz", "U-turn", "Fake Out"],
      hasOverrides: false,
    },
  ] as const)(
    "$label",
    ({ defenderSpecies, defenderMoves, teammates, expected, hasOverrides }) => {
      const { result } = renderHook(() =>
        useDefenderMoves({
          defenderSpecies,
          defenderMoves: defenderMoves as [string, string, string, string],
          teammates: teammates as Tables<"pokemon">[],
        })
      );

      expect(result.current.effectiveMoves).toEqual(expected);
      expect(result.current.hasOverrides).toBe(hasOverrides);
    }
  );
});
