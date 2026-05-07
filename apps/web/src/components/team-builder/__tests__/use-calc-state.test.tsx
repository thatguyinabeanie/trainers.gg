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
// Tracks all Pokemon constructor invocations: [gen, species, opts]. Lets tests
// verify which species was passed to new Pokemon() (e.g. mega vs base form).
const mockPokemonConstructor = jest.fn();

jest.mock("@smogon/calc", () => {
  const MockPokemon = jest.fn(function (
    this: Record<string, unknown>,
    gen: unknown,
    species: unknown,
    opts: unknown
  ) {
    mockPokemonConstructor(gen, species, opts);
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
    Generations: { get: jest.fn(() => ({
      species: { get: jest.fn(() => ({
        baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      })) },
    })) },
  };
});

/** Returns the opts passed to new Move(gen, moveName, opts) for a specific move name. */
function getMoveOptsFor(moveName: string): Record<string, unknown> | undefined {
  const call = mockMoveConstructor.mock.calls.find((c) => c[1] === moveName);
  return call ? (call[2] as Record<string, unknown>) : undefined;
}

/** Returns every species name passed to new Pokemon(gen, species, opts). */
function getPokemonSpeciesCalls(): string[] {
  return mockPokemonConstructor.mock.calls.map((c) => String(c[1]));
}

import { getFormatById } from "@trainers/pokemon";
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

// =============================================================================
// Format clamp on switch (Champions ↔ VGC)
// =============================================================================

describe("format clamp — switching from VGC to Champions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clamps EVs to Champions caps (32 per stat, 66 total) when format switches to Champions", () => {
    const vgcFormat = getFormatById("gen9vgc2026regi");
    const championsFormat = getFormatById("championsvgc2026regma");

    const { result, rerender } = renderHook(
      ({ format }: { format: typeof vgcFormat }) =>
        useCalcState({ selectedPokemon: makePokemon(), format }),
      { initialProps: { format: vgcFormat } }
    );

    // Seed high EVs that exceed Champions caps
    act(() =>
      result.current.resetDefenderForSpecies("Pikachu", {
        evs: { hp: 252, atk: 0, def: 4, spa: 252, spd: 0, spe: 0 },
      })
    );

    // Before switch: EVs are as seeded
    expect(result.current.defenderEvs.hp).toBe(252);

    // Switch to Champions format — render-time clamp fires
    rerender({ format: championsFormat });

    // Clamp iteration: hp→atk→def→spa→spd→spe, perStatCap=32, totalCap=66
    // hp=min(252,32)=32, running=32; atk=min(0,32)=0, running=32;
    // def=min(4,32)=4, running=36; spa=min(252,32)=32 but allowed=min(32,66-36)=30, running=66;
    // spd=min(0,66-66)=0; spe=min(0,66-66)=0
    expect(result.current.defenderEvs).toEqual({
      hp: 32,
      atk: 0,
      def: 4,
      spa: 30,
      spd: 0,
      spe: 0,
    });
  });

  it("switching back from Champions to VGC restores 252-per-stat cap (does not re-inflate EVs)", () => {
    const vgcFormat = getFormatById("gen9vgc2026regi");
    const championsFormat = getFormatById("championsvgc2026regma");

    const { result, rerender } = renderHook(
      ({ format }: { format: typeof vgcFormat }) =>
        useCalcState({ selectedPokemon: makePokemon(), format }),
      { initialProps: { format: championsFormat } }
    );

    // Seed EVs within Champions caps
    act(() =>
      result.current.resetDefenderForSpecies("Pikachu", {
        evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      })
    );

    rerender({ format: vgcFormat });

    // EVs at 32 are under VGC per-stat cap (252) and total (510) — should be preserved as-is
    expect(result.current.defenderEvs.hp).toBe(32);
  });

  it("first render with VGC format: default EVs {hp:252,spd:4} total=256 survive unchanged", () => {
    const vgcFormat = getFormatById("gen9vgc2026regi");

    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: vgcFormat })
    );

    // DEFAULT_DEFENDER_EVS = { hp:252, atk:0, def:0, spa:0, spd:4, spe:0 }
    // All ≤252 individually, total=256 ≤510 — clamp with VGC caps leaves them intact
    expect(result.current.defenderEvs.hp).toBe(252);
    expect(result.current.defenderEvs.spd).toBe(4);
  });
});

// =============================================================================
// setDefenderIv clamping
// =============================================================================

describe("setDefenderIv — clamping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<[number, number | typeof NaN]>([
    [-5, 0],
    [0, 0],
    [15, 15],
    [31, 31],
    [32, 31],
    [50, 31],
    [15.7, 16],
  ])(
    "setDefenderIv('hp', %i) → stored value %s",
    (input, expectedOrNaN) => {
      const { result } = renderHook(() =>
        useCalcState({ selectedPokemon: makePokemon() })
      );
      act(() => result.current.setDefenderIv("hp", input));
      expect(result.current.defenderIvs.hp).toBe(expectedOrNaN);
    }
  );

  it("NaN input: state becomes NaN (Math.round(NaN) = NaN)", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    act(() => result.current.setDefenderIv("hp", NaN));
    expect(Number.isNaN(result.current.defenderIvs.hp)).toBe(true);
  });
});

// =============================================================================
// setDefenderEv — Champions caps enforced after format flip
// =============================================================================

describe("setDefenderEv — Champions caps enforced after format flip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clamps a single per-stat assignment to 32", () => {
    const championsFormat = getFormatById("championsvgc2026regma");

    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: championsFormat })
    );

    // Default EVs after Champions format clamp: hp=32, spd=4 (total=36)
    // Setting hp to a value > 32 must be clamped to 32
    act(() => result.current.setDefenderEv("hp", 100));
    expect(result.current.defenderEvs.hp).toBe(32);
  });

  it("clamps to remaining headroom under the 66 total cap", () => {
    const championsFormat = getFormatById("championsvgc2026regma");

    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: championsFormat })
    );

    // Default Champions clamp leaves spd=4 from the VGC defaults — clear it
    // so the headroom math below is unambiguous.
    act(() => result.current.setDefenderEv("spd", 0));

    // Now bring hp and atk to 32 each (total = 64).
    act(() => result.current.setDefenderEv("hp", 32));
    act(() => result.current.setDefenderEv("atk", 32));

    // Total headroom remaining: 66 - 64 = 2. Requesting 32 for def must clamp to 2.
    act(() => result.current.setDefenderEv("def", 32));
    expect(result.current.defenderEvs.def).toBe(2);

    const total = Object.values(result.current.defenderEvs).reduce(
      (s, n) => s + n,
      0
    );
    expect(total).toBeLessThanOrEqual(66);
  });

  it("classic VGC format still clamps to 252 per stat and 510 total", () => {
    const vgcFormat = getFormatById("gen9vgc2026regi");

    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon(), format: vgcFormat })
    );

    // 300 > 252 per-stat cap for VGC
    act(() => result.current.setDefenderEv("atk", 300));
    expect(result.current.defenderEvs.atk).toBe(252);

    // Default EVs: hp=252, spd=4 → total=256 after initial clamp.
    // With atk now 252, total = 252+252+4 = 508.
    // Setting def to 252 must be clamped by headroom (510 - 508 = 2).
    act(() => result.current.setDefenderEv("def", 252));
    expect(result.current.defenderEvs.def).toBe(2);

    const total = Object.values(result.current.defenderEvs).reduce(
      (s, n) => s + n,
      0
    );
    expect(total).toBeLessThanOrEqual(510);
  });
});

// =============================================================================
// HP percent — raw state storage, no clamping at the setter
// =============================================================================

describe("setDefenderHpPercent — state stores raw value", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([150, -10, 0, 50, 100])(
    "setDefenderHpPercent(%i) stores that exact value in state",
    (pct) => {
      const { result } = renderHook(() =>
        useCalcState({ selectedPokemon: makePokemon() })
      );
      act(() => result.current.setDefenderHpPercent(pct));
      expect(result.current.defenderHpPercent).toBe(pct);
    }
  );

  it("hook does not throw and still produces calc output for out-of-range HP percent", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    // 150 is clamped internally in buildDefenderPokemon, but the hook keeps running
    act(() => result.current.setDefenderHpPercent(150));
    expect(result.current.moveCalcOutputs[0]).not.toBeNull();
  });
});

// =============================================================================
// Inferred weather / terrain from attacker ability
// =============================================================================

describe("inferredWeather / inferredTerrain", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Drought ability → inferredWeather='Sun' when no explicit weather set", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Drought" }),
      })
    );
    expect(result.current.inferredWeather).toBe("Sun");
  });

  it("Drizzle ability → inferredWeather='Rain'", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Drizzle" }),
      })
    );
    expect(result.current.inferredWeather).toBe("Rain");
  });

  it("Drought ability + explicit weather set → inferredWeather is null (explicit takes precedence)", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Drought" }),
      })
    );
    act(() => result.current.setWeather("Rain"));
    expect(result.current.inferredWeather).toBeNull();
  });

  it("Hadron Engine ability → inferredTerrain='Electric'", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Hadron Engine" }),
      })
    );
    expect(result.current.inferredTerrain).toBe("Electric");
  });

  it("Levitate ability → inferredWeather and inferredTerrain both null (not in maps)", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Levitate" }),
      })
    );
    expect(result.current.inferredWeather).toBeNull();
    expect(result.current.inferredTerrain).toBeNull();
  });

  it("null selectedPokemon → both inferred values are null", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: null })
    );
    expect(result.current.inferredWeather).toBeNull();
    expect(result.current.inferredTerrain).toBeNull();
  });

  it("setWeather('None') sentinel suppresses ability-based inference", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon({ ability: "Drought" }) })
    );
    expect(result.current.inferredWeather).toBe("Sun");
    act(() => result.current.setWeather("None"));
    expect(result.current.inferredWeather).toBeNull();
  });

  it("setTerrain('None') sentinel suppresses Hadron Engine inference", () => {
    const { result } = renderHook(() =>
      useCalcState({
        selectedPokemon: makePokemon({ ability: "Hadron Engine" }),
      })
    );
    expect(result.current.inferredTerrain).toBe("Electric");
    act(() => result.current.setTerrain("None"));
    expect(result.current.inferredTerrain).toBeNull();
  });
});

// =============================================================================
// resetDefenderForSpecies
// =============================================================================

describe("resetDefenderForSpecies — additional paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("without overrides: zeroes all EVs, resets IVs to 31, nature to Hardy", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    // First set some EVs so we can confirm they're zeroed
    act(() => result.current.setDefenderEv("hp", 100));
    act(() => result.current.resetDefenderForSpecies("Garchomp"));
    expect(result.current.defenderSpecies).toBe("Garchomp");
    expect(result.current.defenderEvs).toEqual({
      hp: 0,
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
    });
    expect(result.current.defenderIvs).toEqual({
      hp: 31,
      atk: 31,
      def: 31,
      spa: 31,
      spd: 31,
      spe: 31,
    });
    expect(result.current.defenderNature).toBe("Hardy");
    expect(result.current.defenderAbility).toBe("");
    expect(result.current.defenderItem).toBe("");
    expect(result.current.defenderBoosts).toEqual({
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
    });
  });

  it("with evs override: stores the provided EVs exactly", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    const customEvs = { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 };
    act(() =>
      result.current.resetDefenderForSpecies("Incineroar", {
        evs: customEvs,
        ability: "Intimidate",
        item: "Sitrus Berry",
        nature: "Careful",
      })
    );
    expect(result.current.defenderEvs).toEqual(customEvs);
    expect(result.current.defenderAbility).toBe("Intimidate");
    expect(result.current.defenderItem).toBe("Sitrus Berry");
    expect(result.current.defenderNature).toBe("Careful");
  });

  it("resets defenderMoves to all-empty slots", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    act(() => result.current.setDefenderMove(0, "Earthquake"));
    act(() => result.current.resetDefenderForSpecies("Garchomp"));
    expect(result.current.defenderMoves).toEqual(["", "", "", ""]);
  });
});

// =============================================================================
// computeReverseOutput short-circuits
// =============================================================================

describe("computeReverseOutput — short-circuits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null for empty string moveName", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    expect(result.current.computeReverseOutput("")).toBeNull();
  });

  it("returns null when selectedPokemon is null", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: null })
    );
    expect(result.current.computeReverseOutput("Flamethrower")).toBeNull();
  });

  it("moveCalcOutputsReverse is [null,null,null,null] when all defenderMoves are empty", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    // defenderMoves defaults to ["","","",""] — hasAnyDefenderMove is false
    expect(result.current.moveCalcOutputsReverse).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("moveCalcOutputsReverse computes output once a defender move is set", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    act(() => result.current.setDefenderMove(0, "Flamethrower"));
    // First slot should now have an output (mockCalculate returns a valid result)
    expect(result.current.moveCalcOutputsReverse[0]).not.toBeNull();
    // Remaining empty slots remain null
    expect(result.current.moveCalcOutputsReverse[1]).toBeNull();
    expect(result.current.moveCalcOutputsReverse[2]).toBeNull();
    expect(result.current.moveCalcOutputsReverse[3]).toBeNull();
  });
});

// =============================================================================
// Per-calc mega toggle (attackerMegaActive / defenderMegaActive)
// =============================================================================

describe("attackerMegaActive / defenderMegaActive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("attackerMegaActive defaults to true", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    expect(result.current.attackerMegaActive).toBe(true);
  });

  it("defenderMegaActive defaults to true", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    expect(result.current.defenderMegaActive).toBe(true);
  });

  it("setAttackerMegaActive updates the flag without affecting defender flag", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    act(() => result.current.setAttackerMegaActive(false));
    expect(result.current.attackerMegaActive).toBe(false);
    expect(result.current.defenderMegaActive).toBe(true);
  });

  it("setDefenderMegaActive updates the flag without affecting attacker flag", () => {
    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: makePokemon() })
    );
    act(() => result.current.setDefenderMegaActive(false));
    expect(result.current.defenderMegaActive).toBe(false);
    expect(result.current.attackerMegaActive).toBe(true);
  });
});

// =============================================================================
// Per-row mega scoping in computeReverseOutputsForRow
// Regression guard for the bug fixed at use-calc-state.ts:1355 — the panel's
// attackerMegaActive flag must only apply to the FOCUSED row. Non-focused team
// rows always build with megaActive=true so each species shows its raw matchup
// vs the defender (mirrors the forward-path symmetry at line 1276).
// =============================================================================

describe("computeReverseOutputsForRow — mega scoping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("non-focused row builds with mega species even when attackerMegaActive is false", () => {
    // Both rows are mega-capable Charizards (Charizardite Y → Charizard-Mega-Y).
    // Same species + same item lets us isolate the megaActive flag as the only
    // differentiator in effectiveSpecies between focused vs non-focused rows.
    const focusedCharizard = makePokemon({
      id: 1,
      species: "Charizard",
      held_item: "Charizardite Y",
    });
    const nonFocusedCharizard = makePokemon({
      id: 2,
      species: "Charizard",
      held_item: "Charizardite Y",
    });

    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: focusedCharizard })
    );

    // Turn off the panel-level mega flag for the focused row.
    act(() => result.current.setAttackerMegaActive(false));
    // Reverse calc requires a defender species to engage.
    act(() => result.current.setDefenderSpecies("Garchomp"));

    // Drop all prior Pokemon constructions (shared attacker/defender, etc.) so
    // we only inspect what the upcoming row-level call constructs.
    mockPokemonConstructor.mockClear();

    result.current.computeReverseOutputsForRow(nonFocusedCharizard, [
      "Earthquake",
      "",
      "",
      "",
    ] as const);

    // The non-focused row's defender Pokemon should be the Mega form because
    // the fix passes `true` for non-focused rows regardless of the panel flag.
    // Without the isFocused guard this would be base "Charizard" and the test
    // would fail — that's the exact regression we're guarding against.
    const speciesCalls = getPokemonSpeciesCalls();
    expect(speciesCalls).toContain("Charizard-Mega-Y");
    expect(speciesCalls).not.toContain("Charizard");
  });

  it("focused row honors attackerMegaActive=false (builds as base species)", () => {
    // Counterpart assertion: when the row IS focused, the panel flag governs.
    // This proves the isFocused branch is wired correctly in both directions.
    const focusedCharizard = makePokemon({
      id: 1,
      species: "Charizard",
      held_item: "Charizardite Y",
    });

    const { result } = renderHook(() =>
      useCalcState({ selectedPokemon: focusedCharizard })
    );

    act(() => result.current.setAttackerMegaActive(false));
    act(() => result.current.setDefenderSpecies("Garchomp"));

    mockPokemonConstructor.mockClear();

    // Pass the SAME pokemon instance so isFocused matches by id.
    result.current.computeReverseOutputsForRow(focusedCharizard, [
      "Earthquake",
      "",
      "",
      "",
    ] as const);

    const speciesCalls = getPokemonSpeciesCalls();
    expect(speciesCalls).toContain("Charizard");
    expect(speciesCalls).not.toContain("Charizard-Mega-Y");
  });
});
