import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

// =============================================================================
// Mocks
// =============================================================================

const mockRange = jest.fn(() => [40, 60]);
const mockMaxHP = jest.fn(() => 200);
const mockDesc = jest.fn(() => "stub");
const mockCalculate = jest.fn(() => ({
  range: mockRange,
  desc: mockDesc,
  damage: [40, 60],
}));

// Tracks all Move constructor invocations: [gen, name, opts]
const mockMoveConstructor = jest.fn();

jest.mock("@smogon/calc", () => {
  const MockPokemon = jest.fn(function (this: Record<string, unknown>) {
    this.maxHP = mockMaxHP;
  });
  const MockMove = jest.fn(function (
    this: Record<string, unknown>,
    gen: unknown,
    name: unknown,
    opts: unknown
  ) {
    mockMoveConstructor(gen, name, opts);
  });
  const MockSide = jest.fn();
  const MockField = jest.fn();
  return {
    calculate: mockCalculate,
    Pokemon: MockPokemon,
    Move: MockMove,
    Side: MockSide,
    Field: MockField,
    Generations: { get: jest.fn(() => ({ species: { get: jest.fn() } })) },
  };
});

/** Returns the opts passed to new Move(gen, moveName, opts) for a specific move name. */
function getMoveOptsFor(moveName: string): Record<string, unknown> | undefined {
  const call = mockMoveConstructor.mock.calls.find((c) => c[1] === moveName);
  return call ? (call[2] as Record<string, unknown>) : undefined;
}

import { type Tables } from "@trainers/supabase";

import { getVerdict, useCalcState } from "../use-calc-state";

// =============================================================================
// Factory
// =============================================================================

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Charizard",
    is_shiny: false,
    ability: "Blaze",
    nature: "Timid",
    held_item: null,
    nickname: null,
    gender: null,
    level: 50,
    move1: "Flamethrower",
    move2: "Air Slash",
    move3: null,
    move4: null,
    tera_type: "Fire",
    ev_hp: 4,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 252,
    ev_special_defense: 0,
    ev_speed: 252,
    format_legal: true,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("useCalcState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null outputs when selectedPokemon is null", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: null })
    );
    expect(result.current.selectedMoveOutput).toBeNull();
    expect(result.current.moveCalcOutputs.every((o) => o === null)).toBe(true);
  });

  it("computes a calc output for each filled move slot", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    expect(result.current.moves).toEqual([
      "Flamethrower",
      "Air Slash",
      null,
      null,
    ]);
    expect(result.current.moveCalcOutputs[0]).not.toBeNull();
    expect(result.current.moveCalcOutputs[1]).not.toBeNull();
    expect(result.current.moveCalcOutputs[2]).toBeNull();
    expect(result.current.moveCalcOutputs[3]).toBeNull();
  });

  it("setSelectedMoveIdx switches the active move output", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    expect(result.current.selectedMoveName).toBe("Flamethrower");
    act(() => result.current.setSelectedMoveIdx(1));
    expect(result.current.selectedMoveName).toBe("Air Slash");
  });

  it("toggleCrit flips a single move's crit flag without affecting others", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    expect(result.current.critMoves).toEqual([false, false, false, false]);
    act(() => result.current.toggleCrit(1));
    expect(result.current.critMoves).toEqual([false, true, false, false]);
  });

  it("setDefenderEv caps at 252 per stat and 510 total", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    // Default defender EVs: hp=252, atk=0, def=0, spa=0, spd=4, spe=0 → total 256
    // Try to set atk to 300 → should cap at 252 individually
    act(() => result.current.setDefenderEv("atk", 300));
    expect(result.current.defenderEvs.atk).toBe(252);

    // Total now: 252+252+0+0+4+0 = 508. Setting spd higher should be capped to leave total ≤ 510
    act(() => result.current.setDefenderEv("spd", 100));
    expect(result.current.defenderEvs.spd).toBeLessThanOrEqual(252);
    const total = Object.values(result.current.defenderEvs).reduce(
      (s, n) => s + n,
      0
    );
    expect(total).toBeLessThanOrEqual(510);
  });

  it("resetDefenderForSpecies clears stats and applies overrides", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    act(() =>
      result.current.resetDefenderForSpecies("Pikachu", {
        ability: "Static",
        nature: "Timid",
      })
    );
    expect(result.current.defenderSpecies).toBe("Pikachu");
    expect(result.current.defenderAbility).toBe("Static");
    expect(result.current.defenderNature).toBe("Timid");
    expect(result.current.defenderHpPercent).toBe(100);
    expect(result.current.defenderStatus).toBe("Healthy");
  });

  it("setAttackerSide and setDefenderSide patch only the supplied keys", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    act(() => result.current.setAttackerSide({ tailwind: true }));
    expect(result.current.attackerSide.tailwind).toBe(true);
    expect(result.current.attackerSide.reflect).toBe(false);

    act(() => result.current.setDefenderSide({ stealthRock: true }));
    expect(result.current.defenderSide.stealthRock).toBe(true);
    expect(result.current.defenderSide.spikes).toBe(0);
  });
});

describe("Last Respects BP scaling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies 50 base BP when faintedYours=0 (forward direction)", () => {
    renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ move1: "Last Respects", move2: null }),
        faintedYours: 0,
      })
    );
    const opts = getMoveOptsFor("Last Respects");
    expect(opts).toBeDefined();
    expect(opts).toMatchObject({ basePower: 50 });
  });

  it("applies 150 base BP when faintedYours=2", () => {
    renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ move1: "Last Respects", move2: null }),
        faintedYours: 2,
      })
    );
    const opts = getMoveOptsFor("Last Respects");
    expect(opts).toMatchObject({ basePower: 150 });
  });

  it("caps at 250 BP when faintedYours=5", () => {
    renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ move1: "Last Respects", move2: null }),
        faintedYours: 5,
      })
    );
    const opts = getMoveOptsFor("Last Respects");
    expect(opts).toMatchObject({ basePower: 250 });
  });

  it("does NOT apply basePower override for non-scaling moves", () => {
    renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ move1: "Flamethrower", move2: null }),
        faintedYours: 3,
      })
    );
    const opts = getMoveOptsFor("Flamethrower");
    expect(opts).toBeDefined();
    expect(opts).not.toHaveProperty("basePower");
  });

  it("computeReverseOutput uses faintedTheirs for Last Respects", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ move1: "Flamethrower", move2: null }),
        faintedTheirs: 3,
      })
    );
    // Clear calls from the initial render, then call computeReverseOutput
    mockMoveConstructor.mockClear();
    result.current.computeReverseOutput("Last Respects");
    const opts = getMoveOptsFor("Last Respects");
    // faintedTheirs=3 → BP = 50 + 50*3 = 200
    expect(opts).toMatchObject({ basePower: 200 });
  });

  it.each<[number, number]>([
    [0, 50],
    [1, 100],
    [2, 150],
    [3, 200],
    [4, 250],
    [5, 250],
  ])("faintedYours=%i → BP=%i", (fainted, expectedBP) => {
    renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ move1: "Last Respects", move2: null }),
        faintedYours: fainted,
      })
    );
    const opts = getMoveOptsFor("Last Respects");
    expect(opts).toMatchObject({ basePower: expectedBP });
  });
});

describe("getVerdict", () => {
  it.each<[number, number, ReturnType<typeof getVerdict>]>([
    [120, 140, "OHKO"],
    [55, 80, "2HKO"],
    [25, 45, "3HKO"],
    [10, 20, null],
  ])("min=%i max=%i → %s", (min, max, expected) => {
    expect(getVerdict(min, max)).toBe(expected);
  });
});
