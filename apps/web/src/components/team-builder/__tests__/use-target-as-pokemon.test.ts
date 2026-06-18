/**
 * Tests for useTargetAsPokemon — the adapter that presents calc defender state
 * as a synthetic Tables<"pokemon"> row so the versus view can share the same
 * showcase components used for team Pokémon.
 *
 * The exported function is a plain factory (not a stateful hook) so we call it
 * directly rather than using renderHook.
 */

import {
  type DefenderEvs,
  type DefenderIvs,
  type UseCalcStateReturn,
} from "../use-calc-state";
import { useTargetAsPokemon } from "../calc/use-target-as-pokemon";

// =============================================================================
// Helpers / fixtures
// =============================================================================

type DefenderMoves = UseCalcStateReturn["defenderMoves"];

function makeCalcState(
  overrides: Partial<{
    defenderSpecies: string;
    defenderAbility: string;
    defenderItem: string;
    defenderNature: string;
    defenderTera: string;
    defenderEvs: DefenderEvs;
    defenderIvs: DefenderIvs;
    defenderMoves: DefenderMoves;
    resetDefenderForSpecies: jest.Mock;
    setDefenderAbility: jest.Mock;
    setDefenderItem: jest.Mock;
    setDefenderNature: jest.Mock;
    setDefenderTera: jest.Mock;
    setDefenderEv: jest.Mock;
    setDefenderIv: jest.Mock;
    setDefenderMove: jest.Mock;
  }> = {}
) {
  return {
    defenderSpecies: "Garchomp",
    defenderAbility: "Rough Skin",
    defenderItem: "Rocky Helmet",
    defenderNature: "Jolly",
    defenderTera: "Dragon",
    defenderEvs: {
      hp: 252,
      atk: 0,
      def: 4,
      spa: 0,
      spd: 0,
      spe: 252,
    } as DefenderEvs,
    defenderIvs: {
      hp: 31,
      atk: 31,
      def: 31,
      spa: 0,
      spd: 31,
      spe: 31,
    } as DefenderIvs,
    defenderMoves: ["Dragon Claw", "Earthquake", null, null] as DefenderMoves,
    resetDefenderForSpecies: jest.fn(),
    setDefenderAbility: jest.fn(),
    setDefenderItem: jest.fn(),
    setDefenderNature: jest.fn(),
    setDefenderTera: jest.fn(),
    setDefenderEv: jest.fn(),
    setDefenderIv: jest.fn(),
    setDefenderMove: jest.fn(),
    ...overrides,
  };
}

// =============================================================================
// Synthetic pokemon row mapping
// =============================================================================

describe("useTargetAsPokemon — synthetic pokemon row", () => {
  it("maps defender fields to pokemon columns correctly (species/ability/nature/tera/item)", () => {
    const calc = makeCalcState({
      defenderSpecies: "Charizard",
      defenderAbility: "Blaze",
      defenderNature: "Timid",
      defenderTera: "Fire",
      defenderItem: "Life Orb",
    });
    const { pokemon } = useTargetAsPokemon(calc);

    expect(pokemon.species).toBe("Charizard");
    expect(pokemon.ability).toBe("Blaze");
    expect(pokemon.nature).toBe("Timid");
    expect(pokemon.tera_type).toBe("Fire");
    expect(pokemon.held_item).toBe("Life Orb");
  });

  it("uses sentinel id=-1 (never collides with real pokemon rows)", () => {
    const { pokemon } = useTargetAsPokemon(makeCalcState());
    expect(pokemon.id).toBe(-1);
  });

  it("maps defender EVs → pokemon ev_* columns correctly", () => {
    const calc = makeCalcState({
      defenderEvs: { hp: 252, atk: 4, def: 0, spa: 128, spd: 64, spe: 252 },
    });
    const { pokemon } = useTargetAsPokemon(calc);

    expect(pokemon.ev_hp).toBe(252);
    expect(pokemon.ev_attack).toBe(4);
    expect(pokemon.ev_defense).toBe(0);
    expect(pokemon.ev_special_attack).toBe(128);
    expect(pokemon.ev_special_defense).toBe(64);
    expect(pokemon.ev_speed).toBe(252);
  });

  it("maps defender IVs → pokemon iv_* columns correctly", () => {
    const calc = makeCalcState({
      defenderIvs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
    });
    const { pokemon } = useTargetAsPokemon(calc);

    expect(pokemon.iv_hp).toBe(31);
    expect(pokemon.iv_attack).toBe(0);
    expect(pokemon.iv_defense).toBe(31);
    expect(pokemon.iv_special_attack).toBe(31);
    expect(pokemon.iv_special_defense).toBe(31);
    expect(pokemon.iv_speed).toBe(31);
  });

  it("maps defenderMoves → move1–move4 slots correctly", () => {
    const calc = makeCalcState({
      defenderMoves: ["Hydro Pump", "Ice Beam", "Surf", null] as DefenderMoves,
    });
    const { pokemon } = useTargetAsPokemon(calc);

    expect(pokemon.move1).toBe("Hydro Pump");
    expect(pokemon.move2).toBe("Ice Beam");
    expect(pokemon.move3).toBe("Surf");
    expect(pokemon.move4).toBeNull();
  });

  it("coerces empty defenderItem string to null in held_item", () => {
    const calc = makeCalcState({ defenderItem: "" });
    const { pokemon } = useTargetAsPokemon(calc);
    expect(pokemon.held_item).toBeNull();
  });

  it("coerces empty defenderTera string to null in tera_type", () => {
    const calc = makeCalcState({ defenderTera: "" });
    const { pokemon } = useTargetAsPokemon(calc);
    expect(pokemon.tera_type).toBeNull();
  });

  it("sets level=50 (engine hard-locks defender at 50)", () => {
    const { pokemon } = useTargetAsPokemon(makeCalcState());
    expect(pokemon.level).toBe(50);
  });

  it("sets inert safe defaults for hidden fields (gender=null, is_shiny=false, etc.)", () => {
    const { pokemon } = useTargetAsPokemon(makeCalcState());

    expect(pokemon.gender).toBeNull();
    expect(pokemon.is_shiny).toBe(false);
    expect(pokemon.nickname).toBeNull();
    expect(pokemon.notes).toBeNull();
    expect(pokemon.format_legal).toBeNull();
    expect(pokemon.created_at).toBeNull();
  });

  it("maps empty-string move slot to '' for move1, null for move2–4", () => {
    const calc = makeCalcState({
      defenderMoves: ["", null, null, null] as DefenderMoves,
    });
    const { pokemon } = useTargetAsPokemon(calc);

    expect(pokemon.move1).toBe(""); // empty string maps to "" (move1 is required)
    expect(pokemon.move2).toBeNull();
    expect(pokemon.move3).toBeNull();
    expect(pokemon.move4).toBeNull();
  });
});

// =============================================================================
// onUpdate → setter routing
// =============================================================================

describe("useTargetAsPokemon — onUpdate routing", () => {
  // ---------------------------------------------------------------------------
  // species → resetDefenderForSpecies
  // ---------------------------------------------------------------------------
  it("onUpdate({ species }) calls resetDefenderForSpecies with the species name", () => {
    const resetDefenderForSpecies = jest.fn();
    const calc = makeCalcState({ resetDefenderForSpecies });
    const { onUpdate } = useTargetAsPokemon(calc);

    onUpdate({ species: "Pikachu" });

    expect(resetDefenderForSpecies).toHaveBeenCalledWith("Pikachu");
    expect(resetDefenderForSpecies).toHaveBeenCalledTimes(1);
  });

  it("species reset short-circuits — other setters are NOT called on the same patch", () => {
    const resetDefenderForSpecies = jest.fn();
    const setDefenderAbility = jest.fn();
    const setDefenderEv = jest.fn();
    const calc = makeCalcState({
      resetDefenderForSpecies,
      setDefenderAbility,
      setDefenderEv,
    });
    const { onUpdate } = useTargetAsPokemon(calc);

    // Even though ability and ev_hp are in the patch, resetDefenderForSpecies blanks
    // everything — so the other setters must NOT fire.
    onUpdate({ species: "Raichu", ability: "Static", ev_hp: 252 });

    expect(resetDefenderForSpecies).toHaveBeenCalledWith("Raichu");
    expect(setDefenderAbility).not.toHaveBeenCalled();
    expect(setDefenderEv).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // EV fields → setDefenderEv with long→short translation
  // ---------------------------------------------------------------------------
  it.each([
    ["ev_hp", "hp", 252],
    ["ev_attack", "atk", 4],
    ["ev_defense", "def", 128],
    ["ev_special_attack", "spa", 200],
    ["ev_special_defense", "spd", 64],
    ["ev_speed", "spe", 252],
  ] as const)(
    "onUpdate({ %s: %i }) calls setDefenderEv('%s', %i)",
    (col, shortKey, value) => {
      const setDefenderEv = jest.fn();
      const calc = makeCalcState({ setDefenderEv });
      const { onUpdate } = useTargetAsPokemon(calc);

      onUpdate({ [col]: value });

      expect(setDefenderEv).toHaveBeenCalledWith(shortKey, value);
      expect(setDefenderEv).toHaveBeenCalledTimes(1);
    }
  );

  it("onUpdate({ ev_special_attack: 252 }) calls setDefenderEv('spa', 252)", () => {
    const setDefenderEv = jest.fn();
    const { onUpdate } = useTargetAsPokemon(makeCalcState({ setDefenderEv }));

    onUpdate({ ev_special_attack: 252 });

    expect(setDefenderEv).toHaveBeenCalledWith("spa", 252);
  });

  // ---------------------------------------------------------------------------
  // Move slots
  // ---------------------------------------------------------------------------
  it("onUpdate({ move1: 'Surf' }) calls setDefenderMove(0, 'Surf')", () => {
    const setDefenderMove = jest.fn();
    const { onUpdate } = useTargetAsPokemon(makeCalcState({ setDefenderMove }));

    onUpdate({ move1: "Surf" });

    expect(setDefenderMove).toHaveBeenCalledWith(0, "Surf");
  });

  it("onUpdate({ move2: 'Surf' }) calls setDefenderMove(1, 'Surf')", () => {
    const setDefenderMove = jest.fn();
    const { onUpdate } = useTargetAsPokemon(makeCalcState({ setDefenderMove }));

    onUpdate({ move2: "Surf" });

    expect(setDefenderMove).toHaveBeenCalledWith(1, "Surf");
  });

  it.each([
    ["move1", 0, "Dragon Claw"],
    ["move2", 1, "Earthquake"],
    ["move3", 2, "Iron Head"],
    ["move4", 3, "Protect"],
  ] as const)(
    "onUpdate({ %s: '...' }) calls setDefenderMove(%i, ...)",
    (col, slotIdx, moveName) => {
      const setDefenderMove = jest.fn();
      const { onUpdate } = useTargetAsPokemon(
        makeCalcState({ setDefenderMove })
      );

      onUpdate({ [col]: moveName });

      expect(setDefenderMove).toHaveBeenCalledWith(slotIdx, moveName);
    }
  );

  it("null move value coerces to '' when calling setDefenderMove", () => {
    const setDefenderMove = jest.fn();
    const { onUpdate } = useTargetAsPokemon(makeCalcState({ setDefenderMove }));

    onUpdate({ move3: null });

    expect(setDefenderMove).toHaveBeenCalledWith(2, "");
  });

  // ---------------------------------------------------------------------------
  // Loadout fields
  // ---------------------------------------------------------------------------
  it("onUpdate({ ability: 'Levitate' }) calls setDefenderAbility('Levitate')", () => {
    const setDefenderAbility = jest.fn();
    const { onUpdate } = useTargetAsPokemon(
      makeCalcState({ setDefenderAbility })
    );

    onUpdate({ ability: "Levitate" });

    expect(setDefenderAbility).toHaveBeenCalledWith("Levitate");
  });

  it("onUpdate({ ability: null }) calls setDefenderAbility('') (null coerces to empty string)", () => {
    const setDefenderAbility = jest.fn();
    const { onUpdate } = useTargetAsPokemon(
      makeCalcState({ setDefenderAbility })
    );

    onUpdate({ ability: null });

    expect(setDefenderAbility).toHaveBeenCalledWith("");
  });

  it("onUpdate({ held_item: 'Choice Band' }) calls setDefenderItem('Choice Band')", () => {
    const setDefenderItem = jest.fn();
    const { onUpdate } = useTargetAsPokemon(makeCalcState({ setDefenderItem }));

    onUpdate({ held_item: "Choice Band" });

    expect(setDefenderItem).toHaveBeenCalledWith("Choice Band");
  });

  it("onUpdate({ held_item: null }) calls setDefenderItem('') (null coerces to empty string)", () => {
    const setDefenderItem = jest.fn();
    const { onUpdate } = useTargetAsPokemon(makeCalcState({ setDefenderItem }));

    onUpdate({ held_item: null });

    expect(setDefenderItem).toHaveBeenCalledWith("");
  });

  it("onUpdate({ tera_type: 'Water' }) calls setDefenderTera('Water')", () => {
    const setDefenderTera = jest.fn();
    const { onUpdate } = useTargetAsPokemon(makeCalcState({ setDefenderTera }));

    onUpdate({ tera_type: "Water" });

    expect(setDefenderTera).toHaveBeenCalledWith("Water");
  });

  it("onUpdate({ nature: 'Timid' }) calls setDefenderNature('Timid')", () => {
    const setDefenderNature = jest.fn();
    const { onUpdate } = useTargetAsPokemon(
      makeCalcState({ setDefenderNature })
    );

    onUpdate({ nature: "Timid" });

    expect(setDefenderNature).toHaveBeenCalledWith("Timid");
  });

  // ---------------------------------------------------------------------------
  // No-op fields (level, gender, is_shiny, nickname, notes, format_legal, created_at)
  // ---------------------------------------------------------------------------
  it.each([
    { level: 100 },
    { gender: "M" },
    { is_shiny: true },
    { nickname: "Garchompy" },
    { notes: "some note" },
    { format_legal: true },
    { created_at: "2026-06-17T00:00:00Z" },
  ])("onUpdate(%j) is a no-op — no setter is called", (patch) => {
    const resetDefenderForSpecies = jest.fn();
    const setDefenderAbility = jest.fn();
    const setDefenderItem = jest.fn();
    const setDefenderNature = jest.fn();
    const setDefenderTera = jest.fn();
    const setDefenderEv = jest.fn();
    const setDefenderIv = jest.fn();
    const setDefenderMove = jest.fn();
    const calc = makeCalcState({
      resetDefenderForSpecies,
      setDefenderAbility,
      setDefenderItem,
      setDefenderNature,
      setDefenderTera,
      setDefenderEv,
      setDefenderIv,
      setDefenderMove,
    });
    const { onUpdate } = useTargetAsPokemon(calc);

    onUpdate(patch);

    expect(resetDefenderForSpecies).not.toHaveBeenCalled();
    expect(setDefenderAbility).not.toHaveBeenCalled();
    expect(setDefenderItem).not.toHaveBeenCalled();
    expect(setDefenderNature).not.toHaveBeenCalled();
    expect(setDefenderTera).not.toHaveBeenCalled();
    expect(setDefenderEv).not.toHaveBeenCalled();
    expect(setDefenderIv).not.toHaveBeenCalled();
    expect(setDefenderMove).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Only setters for keys present in the patch are called
  // ---------------------------------------------------------------------------
  it("only setters for keys present in the patch are called", () => {
    const setDefenderEv = jest.fn();
    const setDefenderAbility = jest.fn();
    const setDefenderItem = jest.fn();
    const calc = makeCalcState({
      setDefenderEv,
      setDefenderAbility,
      setDefenderItem,
    });
    const { onUpdate } = useTargetAsPokemon(calc);

    // Only ev_speed is in the patch
    onUpdate({ ev_speed: 252 });

    expect(setDefenderEv).toHaveBeenCalledWith("spe", 252);
    expect(setDefenderEv).toHaveBeenCalledTimes(1);
    expect(setDefenderAbility).not.toHaveBeenCalled();
    expect(setDefenderItem).not.toHaveBeenCalled();
  });

  it("patches multiple EV stats in a single call — each triggers its own setter", () => {
    const setDefenderEv = jest.fn();
    const { onUpdate } = useTargetAsPokemon(makeCalcState({ setDefenderEv }));

    onUpdate({ ev_hp: 252, ev_speed: 252 });

    expect(setDefenderEv).toHaveBeenCalledWith("hp", 252);
    expect(setDefenderEv).toHaveBeenCalledWith("spe", 252);
    expect(setDefenderEv).toHaveBeenCalledTimes(2);
  });
});
