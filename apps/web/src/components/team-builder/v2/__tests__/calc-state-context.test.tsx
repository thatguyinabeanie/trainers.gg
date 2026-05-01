"use client";

import { act, render, renderHook, screen } from "@testing-library/react";
import React, { useState } from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mock @smogon/calc so the hook doesn't need real Pokemon data tables.
// We only test the PROVIDER CONTRACT — not the calc engine itself.
// =============================================================================

jest.mock("@smogon/calc", () => {
  const MockPokemon = jest.fn().mockImplementation(() => ({}));
  const MockField = jest.fn().mockImplementation(() => ({}));
  const MockMove = jest.fn().mockImplementation(() => ({}));
  const MockSide = jest.fn().mockImplementation(() => ({}));
  const mockCalculate = jest.fn().mockReturnValue({
    damage: [0],
    desc: () => "mocked",
  });

  const MockGenerations = {
    get: jest.fn().mockReturnValue({
      num: 9,
    }),
  };

  return {
    Pokemon: MockPokemon,
    Field: MockField,
    Move: MockMove,
    Side: MockSide,
    calculate: mockCalculate,
    Generations: MockGenerations,
  };
});

// =============================================================================
// Import AFTER mocks are in place
// =============================================================================

import {
  CalcStateProvider,
  useCalcStateContext,
} from "../calc/calc-state-context";

// =============================================================================
// Fixtures
// =============================================================================

const DEFAULT_FIELD = {
  doubles: true,
  tailwind: false,
  foesAlive: 2,
  allyAlive: 2,
  atkTera: false,
};

function makeSetField() {
  return jest.fn();
}

/** Minimal Tables<"pokemon"> row. */
function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Incineroar",
    ability: "Intimidate",
    nature: "Careful",
    move1: "Fake Out",
    move2: null,
    move3: null,
    move4: null,
    ev_hp: 252,
    ev_attack: 0,
    ev_defense: 4,
    ev_special_attack: 0,
    ev_special_defense: 252,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: "Sitrus Berry",
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

/** Test wrapper that provides CalcStateProvider. */
function makeWrapper(
  initialPokemon: Tables<"pokemon"> | null = null,
  field = DEFAULT_FIELD,
  setField = makeSetField()
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <CalcStateProvider
        selectedPokemon={initialPokemon}
        format={undefined}
        field={field}
        setField={setField}
        calcEnabled={true}
      >
        {children}
      </CalcStateProvider>
    );
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("useCalcStateContext — outside provider", () => {
  it("throws the canonical error when called outside <CalcStateProvider>", () => {
    // Suppress the React error boundary console.error for this test
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCalcStateContext());
    }).toThrow("useCalcStateContext must be used within a <CalcStateProvider>");

    spy.mockRestore();
  });
});

describe("useCalcStateContext — inside provider", () => {
  // ---------------------------------------------------------------------------
  // 1. Smoke-test: provider returns an object with the expected v2-specific fields
  // ---------------------------------------------------------------------------

  it("returns an object with calcEnabled field from props", () => {
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.calcEnabled).toBe(true);
  });

  it("returns the field state passed from props", () => {
    const field = { ...DEFAULT_FIELD, tailwind: true };
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(null, field),
    });

    expect(result.current.field.tailwind).toBe(true);
  });

  it("returns the setField function from props", () => {
    const setField = jest.fn();
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(null, DEFAULT_FIELD, setField),
    });

    result.current.setField({ ...DEFAULT_FIELD, doubles: false });
    expect(setField).toHaveBeenCalledWith({ ...DEFAULT_FIELD, doubles: false });
  });

  it("returns defenderSpecies string (from useCalcState internal default)", () => {
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(),
    });

    // useCalcState initialises defenderSpecies to "Incineroar"
    expect(typeof result.current.defenderSpecies).toBe("string");
    expect(result.current.defenderSpecies.length).toBeGreaterThan(0);
  });

  it("returns setDefenderMove as a function", () => {
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(),
    });

    expect(typeof result.current.setDefenderMove).toBe("function");
  });

  it("returns defenderMoves as a 4-element tuple", () => {
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.defenderMoves).toHaveLength(4);
  });

  it("returns moveCalcOutputs as a 4-element array", () => {
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.moveCalcOutputs).toHaveLength(4);
  });

  // ---------------------------------------------------------------------------
  // 2. setDefenderMove mutates the correct slot
  // ---------------------------------------------------------------------------

  it("setDefenderMove(0, 'Knock Off') updates defenderMoves[0]", () => {
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setDefenderMove(0, "Knock Off");
    });

    expect(result.current.defenderMoves[0]).toBe("Knock Off");
  });

  it("setDefenderMove(2, 'U-turn') only changes slot 2", () => {
    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: makeWrapper(),
    });

    const before1 = result.current.defenderMoves[1];

    act(() => {
      result.current.setDefenderMove(2, "U-turn");
    });

    expect(result.current.defenderMoves[2]).toBe("U-turn");
    expect(result.current.defenderMoves[1]).toBe(before1);
  });

  // ---------------------------------------------------------------------------
  // 3. Critical contract: provider does NOT reset calc state when selectedPokemon
  //    changes.
  //
  //    Background: The PR explicitly removed key={selectedPokemon.id} from
  //    CalcDrawerInner to prevent defender state from resetting on every row switch.
  //    If someone re-adds a key at the provider level this test will catch it.
  // ---------------------------------------------------------------------------

  it("defender moves persist across selectedPokemon prop changes", () => {
    const garchomp = makePokemon({ id: 1, species: "Garchomp" });
    const flutter = makePokemon({ id: 2, species: "Flutter Mane" });

    /**
     * Wrapper that controls selectedPokemon externally so we can simulate
     * a parent component switching which row is active.
     */
    function SwitchableWrapper({ children }: { children: React.ReactNode }) {
      const [pokemon, setPokemon] = useState<Tables<"pokemon"> | null>(garchomp);

      return (
        <>
          <button
            data-testid="switch-pokemon"
            onClick={() => setPokemon(flutter)}
          >
            Switch
          </button>
          <CalcStateProvider
            selectedPokemon={pokemon}
            format={undefined}
            field={DEFAULT_FIELD}
            setField={jest.fn()}
            calcEnabled={true}
          >
            {children}
          </CalcStateProvider>
        </>
      );
    }

    const captured: {
      setDefenderMove: ((slot: number, name: string) => void) | null;
      moves: readonly [string, string, string, string] | null;
    } = { setDefenderMove: null, moves: null };

    function Consumer() {
      const ctx = useCalcStateContext();
      React.useEffect(() => {
        captured.setDefenderMove = ctx.setDefenderMove;
        captured.moves = ctx.defenderMoves;
      });
      return null;
    }

    const { getByTestId } = render(
      <SwitchableWrapper>
        <Consumer />
      </SwitchableWrapper>
    );

    // Set a defender move while Garchomp is selected
    act(() => {
      captured.setDefenderMove!(0, "Parting Shot");
    });

    expect(captured.moves![0]).toBe("Parting Shot");

    // Switch the active pokemon (parent re-renders with flutter mane)
    act(() => {
      getByTestId("switch-pokemon").click();
    });

    // Defender move must still be "Parting Shot" — provider did NOT reset
    expect(captured.moves![0]).toBe("Parting Shot");
  });

  // ---------------------------------------------------------------------------
  // 4. calcEnabled=false is correctly surfaced
  // ---------------------------------------------------------------------------

  it("propagates calcEnabled=false to consumers", () => {
    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <CalcStateProvider
          selectedPokemon={null}
          format={undefined}
          field={DEFAULT_FIELD}
          setField={jest.fn()}
          calcEnabled={false}
        >
          {children}
        </CalcStateProvider>
      );
    }

    const { result } = renderHook(() => useCalcStateContext(), {
      wrapper: Wrapper,
    });

    expect(result.current.calcEnabled).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Children render successfully inside the provider
  // ---------------------------------------------------------------------------

  it("renders children inside the provider without errors", () => {
    render(
      <CalcStateProvider
        selectedPokemon={null}
        format={undefined}
        field={DEFAULT_FIELD}
        setField={jest.fn()}
        calcEnabled={true}
      >
        <span data-testid="child">hello</span>
      </CalcStateProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
