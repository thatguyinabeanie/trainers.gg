"use client";

/**
 * Behavioral tests for FieldControlSurface.
 *
 * Covers:
 *   - Renders section labels (Field, Weather, Terrain, Other, Sides)
 *   - Singles/Doubles toggle → setGameType called
 *   - Weather pills: clicking inactive → setWeather(value), clicking active → setWeather("")
 *   - Terrain pills: clicking inactive → setTerrain(value), clicking active → setTerrain("")
 *   - Gravity pill toggle → setGravity(!gravity)
 *   - Fairy Aura pill toggle → setFairyAura(!fairyAura)
 *   - Screen switches (Reflect, Light Screen, Aurora Veil) on both sides
 *   - Stealth Rock switch on both sides
 *   - Spikes stepper (attackerSide + defenderSide)
 *   - inferredWeather hint shows when weather=="" and inferredWeather is set
 *   - inferredTerrain hint shows when terrain=="" and inferredTerrain is set
 *   - Inferred hints hidden when explicit values are set
 *   - aria-pressed state on pill toggles
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { type UseCalcStateReturn, type BaseSideState } from "../use-calc-state";

// =============================================================================
// Mocks — ToggleGroup renders as plain buttons so fireEvent works in JSDOM
// =============================================================================

jest.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({
    children,
    onValueChange,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onValueChange?: (next: string[]) => void;
    "aria-label"?: string;
    value?: string[];
    size?: string;
  }) => (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid="toggle-group"
      data-onvaluechange={String(!!onValueChange)}
    >
      {/* Pass onValueChange down via context-like data-attribute trick */}
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<Record<string, unknown>>,
              {
                "data-onvaluechange": onValueChange,
              }
            )
          : child
      )}
    </div>
  ),
  ToggleGroupItem: ({
    children,
    value,
    "aria-label": ariaLabel,
    "data-onvaluechange": onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    "aria-label"?: string;
    "data-onvaluechange"?: (next: string[]) => void;
  }) => (
    <button
      type="button"
      aria-label={
        ariaLabel ?? (typeof children === "string" ? children : undefined)
      }
      onClick={() => {
        if (onValueChange && value) {
          onValueChange([value]);
        }
      }}
    >
      {children}
    </button>
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { FieldControlSurface } from "../calc/field-control-surface";

// =============================================================================
// Fixtures
// =============================================================================

function makeBaseSide(overrides: Partial<BaseSideState> = {}): BaseSideState {
  return {
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    protect: false,
    stealthRock: false,
    spikes: 0,
    saltCure: false,
    ...overrides,
  };
}

interface CalcStub extends Partial<UseCalcStateReturn> {
  gameType?: "Doubles" | "Singles";
  setGameType?: jest.Mock;
  weather?: string;
  setWeather?: jest.Mock;
  inferredWeather?: string | null;
  terrain?: string;
  setTerrain?: jest.Mock;
  inferredTerrain?: string | null;
  gravity?: boolean;
  setGravity?: jest.Mock;
  fairyAura?: boolean;
  setFairyAura?: jest.Mock;
  attackerSide?: BaseSideState;
  setAttackerSide?: jest.Mock;
  defenderSide?: BaseSideState;
  setDefenderSide?: jest.Mock;
}

function makeCalcStub(overrides: CalcStub = {}): UseCalcStateReturn {
  return {
    // Field
    gameType: overrides.gameType ?? "Doubles",
    setGameType: overrides.setGameType ?? jest.fn(),
    weather: overrides.weather ?? "",
    setWeather: overrides.setWeather ?? jest.fn(),
    inferredWeather: overrides.inferredWeather ?? null,
    terrain: overrides.terrain ?? "",
    setTerrain: overrides.setTerrain ?? jest.fn(),
    inferredTerrain: overrides.inferredTerrain ?? null,
    gravity: overrides.gravity ?? false,
    setGravity: overrides.setGravity ?? jest.fn(),
    fairyAura: overrides.fairyAura ?? false,
    setFairyAura: overrides.setFairyAura ?? jest.fn(),
    attackerSide: overrides.attackerSide ?? makeBaseSide(),
    setAttackerSide: overrides.setAttackerSide ?? jest.fn(),
    defenderSide: overrides.defenderSide ?? makeBaseSide(),
    setDefenderSide: overrides.setDefenderSide ?? jest.fn(),
    // Required by UseCalcStateReturn interface — minimal stubs
    direction: "offense",
    setDirection: jest.fn(),
    selectedMoveIdx: 0,
    setSelectedMoveIdx: jest.fn(),
    critMoves: [false, false, false, false],
    toggleCrit: jest.fn(),
    attackerStatus: "Healthy",
    setAttackerStatus: jest.fn(),
    attackerBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    setAttackerBoost: jest.fn(),
    defenderSpecies: "",
    defenderAbility: "",
    defenderItem: "",
    defenderNature: "Hardy",
    defenderTera: "",
    defenderEvs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    defenderIvs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    defenderBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    defenderStatus: "Healthy",
    defenderHpPercent: 100,
    defenderMoves: ["", "", "", ""],
    setDefenderSpecies: jest.fn(),
    setDefenderAbility: jest.fn(),
    setDefenderItem: jest.fn(),
    setDefenderNature: jest.fn(),
    setDefenderTera: jest.fn(),
    setDefenderEv: jest.fn(),
    setDefenderIv: jest.fn(),
    setDefenderBoost: jest.fn(),
    setDefenderStatus: jest.fn(),
    setDefenderHpPercent: jest.fn(),
    attackerMegaActive: false,
    setAttackerMegaActive: jest.fn(),
    defenderMegaActive: false,
    setDefenderMegaActive: jest.fn(),
    setDefenderMove: jest.fn(),
    resetDefenderForSpecies: jest.fn(),
    moves: [null, null, null, null],
    moveCalcOutputs: [null, null, null, null],
    computeForwardOutputsForRow: jest.fn(() => [null, null, null, null]),
    computeReverseOutputsForRow: jest.fn(() => [null, null, null, null]),
    moveCalcOutputsReverse: [null, null, null, null],
    computeReverseOutput: jest.fn(() => null),
    selectedMoveName: null,
    selectedMoveOutput: null,
    ...overrides,
  } as UseCalcStateReturn;
}

function renderSurface(overrides: CalcStub = {}) {
  const calc = makeCalcStub(overrides);
  render(<FieldControlSurface calc={calc} />);
  return calc;
}

// =============================================================================
// Tests — basic render
// =============================================================================

describe("FieldControlSurface — basic render", () => {
  it("renders the Field section label", () => {
    renderSurface();
    expect(screen.getByText("Field")).toBeInTheDocument();
  });

  it("renders the Sides fieldset legend", () => {
    renderSurface();
    expect(screen.getByText("Sides")).toBeInTheDocument();
  });

  it("renders Ours and Theirs column headers", () => {
    renderSurface();
    expect(screen.getByText(/Ours/i)).toBeInTheDocument();
    expect(screen.getByText(/Theirs/i)).toBeInTheDocument();
  });

  it("renders the Weather section label", () => {
    renderSurface();
    expect(screen.getByText("Weather")).toBeInTheDocument();
  });

  it("renders the Terrain section label", () => {
    renderSurface();
    expect(screen.getByText("Terrain")).toBeInTheDocument();
  });

  it("renders the Other section label", () => {
    renderSurface();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("renders Singles and Doubles toggle items", () => {
    renderSurface();
    expect(screen.getByRole("button", { name: "Singles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Doubles" })).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — game type toggle
// =============================================================================

describe("FieldControlSurface — game type toggle", () => {
  it("clicking Singles calls setGameType('Singles')", () => {
    const setGameType = jest.fn();
    renderSurface({ gameType: "Doubles", setGameType });
    fireEvent.click(screen.getByRole("button", { name: "Singles" }));
    expect(setGameType).toHaveBeenCalledWith("Singles");
  });

  it("clicking Doubles calls setGameType('Doubles')", () => {
    const setGameType = jest.fn();
    renderSurface({ gameType: "Singles", setGameType });
    fireEvent.click(screen.getByRole("button", { name: "Doubles" }));
    expect(setGameType).toHaveBeenCalledWith("Doubles");
  });
});

// =============================================================================
// Tests — weather pills
// =============================================================================

describe("FieldControlSurface — weather pills", () => {
  it.each(["Sun", "Rain", "Sand", "Snow"] as const)(
    "renders the %s weather pill",
    (w) => {
      renderSurface();
      expect(screen.getByRole("button", { name: w })).toBeInTheDocument();
    }
  );

  it("clicking an inactive weather pill calls setWeather(value)", () => {
    const setWeather = jest.fn();
    renderSurface({ weather: "", setWeather });
    fireEvent.click(screen.getByRole("button", { name: "Sun" }));
    expect(setWeather).toHaveBeenCalledWith("Sun");
  });

  it("clicking the active weather pill calls setWeather('') to clear", () => {
    const setWeather = jest.fn();
    renderSurface({ weather: "Rain", setWeather });
    fireEvent.click(screen.getByRole("button", { name: "Rain" }));
    expect(setWeather).toHaveBeenCalledWith("");
  });

  it.each(["Sun", "Rain", "Sand", "Snow"] as const)(
    "active weather '%s' pill has aria-pressed=true",
    (w) => {
      renderSurface({ weather: w });
      expect(screen.getByRole("button", { name: w })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    }
  );

  it("inactive weather pill has aria-pressed=false", () => {
    renderSurface({ weather: "" });
    expect(screen.getByRole("button", { name: "Sun" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("clicking Sand when no weather is active calls setWeather('Sand')", () => {
    const setWeather = jest.fn();
    renderSurface({ weather: "", setWeather });
    fireEvent.click(screen.getByRole("button", { name: "Sand" }));
    expect(setWeather).toHaveBeenCalledWith("Sand");
  });
});

// =============================================================================
// Tests — terrain pills
// =============================================================================

describe("FieldControlSurface — terrain pills", () => {
  it.each(["Grassy", "Electric", "Psychic", "Misty"] as const)(
    "renders the %s terrain pill",
    (t) => {
      renderSurface();
      expect(screen.getByRole("button", { name: t })).toBeInTheDocument();
    }
  );

  it("clicking an inactive terrain pill calls setTerrain(value)", () => {
    const setTerrain = jest.fn();
    renderSurface({ terrain: "", setTerrain });
    fireEvent.click(screen.getByRole("button", { name: "Grassy" }));
    expect(setTerrain).toHaveBeenCalledWith("Grassy");
  });

  it("clicking the active terrain pill calls setTerrain('') to clear", () => {
    const setTerrain = jest.fn();
    renderSurface({ terrain: "Electric", setTerrain });
    fireEvent.click(screen.getByRole("button", { name: "Electric" }));
    expect(setTerrain).toHaveBeenCalledWith("");
  });

  it("active terrain pill has aria-pressed=true", () => {
    renderSurface({ terrain: "Psychic" });
    expect(screen.getByRole("button", { name: "Psychic" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("clicking Misty calls setTerrain('Misty')", () => {
    const setTerrain = jest.fn();
    renderSurface({ terrain: "", setTerrain });
    fireEvent.click(screen.getByRole("button", { name: "Misty" }));
    expect(setTerrain).toHaveBeenCalledWith("Misty");
  });
});

// =============================================================================
// Tests — gravity toggle
// =============================================================================

describe("FieldControlSurface — Gravity pill", () => {
  it("renders Gravity pill with aria-pressed=false by default", () => {
    renderSurface({ gravity: false });
    expect(screen.getByRole("button", { name: /^gravity$/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("renders Gravity pill with aria-pressed=true when gravity=true", () => {
    renderSurface({ gravity: true });
    expect(screen.getByRole("button", { name: /^gravity$/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("clicking inactive Gravity calls setGravity(true)", () => {
    const setGravity = jest.fn();
    renderSurface({ gravity: false, setGravity });
    fireEvent.click(screen.getByRole("button", { name: /^gravity$/i }));
    expect(setGravity).toHaveBeenCalledWith(true);
  });

  it("clicking active Gravity calls setGravity(false)", () => {
    const setGravity = jest.fn();
    renderSurface({ gravity: true, setGravity });
    fireEvent.click(screen.getByRole("button", { name: /^gravity$/i }));
    expect(setGravity).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// Tests — fairy aura toggle
// =============================================================================

describe("FieldControlSurface — Fairy Aura pill", () => {
  it("renders Fairy Aura pill with aria-pressed=false by default", () => {
    renderSurface({ fairyAura: false });
    expect(screen.getByRole("button", { name: /fairy aura/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("renders Fairy Aura pill with aria-pressed=true when fairyAura=true", () => {
    renderSurface({ fairyAura: true });
    expect(screen.getByRole("button", { name: /fairy aura/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("clicking inactive Fairy Aura calls setFairyAura(true)", () => {
    const setFairyAura = jest.fn();
    renderSurface({ fairyAura: false, setFairyAura });
    fireEvent.click(screen.getByRole("button", { name: /fairy aura/i }));
    expect(setFairyAura).toHaveBeenCalledWith(true);
  });

  it("clicking active Fairy Aura calls setFairyAura(false)", () => {
    const setFairyAura = jest.fn();
    renderSurface({ fairyAura: true, setFairyAura });
    fireEvent.click(screen.getByRole("button", { name: /fairy aura/i }));
    expect(setFairyAura).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// Tests — side screen switches (Ours = attackerSide, Theirs = defenderSide)
// =============================================================================

describe("FieldControlSurface — screen switches (Ours side)", () => {
  it("clicking Reflect (ours) calls setAttackerSide({ reflect: true })", () => {
    const setAttackerSide = jest.fn();
    renderSurface({
      attackerSide: makeBaseSide({ reflect: false }),
      setAttackerSide,
    });
    fireEvent.click(screen.getByRole("switch", { name: /reflect \(ours\)/i }));
    expect(setAttackerSide).toHaveBeenCalledWith({ reflect: true });
  });

  it("clicking Reflect (ours) when true calls setAttackerSide({ reflect: false })", () => {
    const setAttackerSide = jest.fn();
    renderSurface({
      attackerSide: makeBaseSide({ reflect: true }),
      setAttackerSide,
    });
    fireEvent.click(screen.getByRole("switch", { name: /reflect \(ours\)/i }));
    expect(setAttackerSide).toHaveBeenCalledWith({ reflect: false });
  });

  it("clicking Light Screen (ours) calls setAttackerSide({ lightScreen: true })", () => {
    const setAttackerSide = jest.fn();
    renderSurface({
      attackerSide: makeBaseSide({ lightScreen: false }),
      setAttackerSide,
    });
    fireEvent.click(
      screen.getByRole("switch", { name: /light screen \(ours\)/i })
    );
    expect(setAttackerSide).toHaveBeenCalledWith({ lightScreen: true });
  });

  it("clicking Aurora Veil (ours) calls setAttackerSide({ auroraVeil: true })", () => {
    const setAttackerSide = jest.fn();
    renderSurface({
      attackerSide: makeBaseSide({ auroraVeil: false }),
      setAttackerSide,
    });
    fireEvent.click(
      screen.getByRole("switch", { name: /aurora veil \(ours\)/i })
    );
    expect(setAttackerSide).toHaveBeenCalledWith({ auroraVeil: true });
  });

  it("clicking Stealth Rock (ours) calls setAttackerSide({ stealthRock: true })", () => {
    const setAttackerSide = jest.fn();
    renderSurface({
      attackerSide: makeBaseSide({ stealthRock: false }),
      setAttackerSide,
    });
    fireEvent.click(
      screen.getByRole("switch", { name: /stealth rock \(ours\)/i })
    );
    expect(setAttackerSide).toHaveBeenCalledWith({ stealthRock: true });
  });
});

describe("FieldControlSurface — screen switches (Theirs side)", () => {
  it("clicking Reflect (theirs) calls setDefenderSide({ reflect: true })", () => {
    const setDefenderSide = jest.fn();
    renderSurface({
      defenderSide: makeBaseSide({ reflect: false }),
      setDefenderSide,
    });
    fireEvent.click(
      screen.getByRole("switch", { name: /reflect \(theirs\)/i })
    );
    expect(setDefenderSide).toHaveBeenCalledWith({ reflect: true });
  });

  it("clicking Light Screen (theirs) calls setDefenderSide({ lightScreen: true })", () => {
    const setDefenderSide = jest.fn();
    renderSurface({
      defenderSide: makeBaseSide({ lightScreen: false }),
      setDefenderSide,
    });
    fireEvent.click(
      screen.getByRole("switch", { name: /light screen \(theirs\)/i })
    );
    expect(setDefenderSide).toHaveBeenCalledWith({ lightScreen: true });
  });

  it("clicking Aurora Veil (theirs) calls setDefenderSide({ auroraVeil: true })", () => {
    const setDefenderSide = jest.fn();
    renderSurface({
      defenderSide: makeBaseSide({ auroraVeil: false }),
      setDefenderSide,
    });
    fireEvent.click(
      screen.getByRole("switch", { name: /aurora veil \(theirs\)/i })
    );
    expect(setDefenderSide).toHaveBeenCalledWith({ auroraVeil: true });
  });

  it("clicking Stealth Rock (theirs) calls setDefenderSide({ stealthRock: true })", () => {
    const setDefenderSide = jest.fn();
    renderSurface({
      defenderSide: makeBaseSide({ stealthRock: false }),
      setDefenderSide,
    });
    fireEvent.click(
      screen.getByRole("switch", { name: /stealth rock \(theirs\)/i })
    );
    expect(setDefenderSide).toHaveBeenCalledWith({ stealthRock: true });
  });
});

// =============================================================================
// Tests — switch checked state
// =============================================================================

describe("FieldControlSurface — switch checked state", () => {
  it.each([
    [false, false],
    [true, true],
  ] as const)(
    "reflect=%s → Reflect (ours) switch checked=%s",
    (reflect, expected) => {
      renderSurface({ attackerSide: makeBaseSide({ reflect }) });
      const sw = screen.getByRole("switch", { name: /reflect \(ours\)/i });
      if (expected) {
        expect(sw).toBeChecked();
      } else {
        expect(sw).not.toBeChecked();
      }
    }
  );

  it.each([
    [false, false],
    [true, true],
  ] as const)(
    "stealthRock=%s → Stealth Rock (theirs) switch checked=%s",
    (stealthRock, expected) => {
      renderSurface({ defenderSide: makeBaseSide({ stealthRock }) });
      const sw = screen.getByRole("switch", {
        name: /stealth rock \(theirs\)/i,
      });
      if (expected) {
        expect(sw).toBeChecked();
      } else {
        expect(sw).not.toBeChecked();
      }
    }
  );
});

// =============================================================================
// Tests — spikes stepper
// =============================================================================

describe("FieldControlSurface — spikes stepper (Ours side)", () => {
  it("clicking Spikes '1' on Ours calls setAttackerSide({ spikes: 1 })", () => {
    const setAttackerSide = jest.fn();
    renderSurface({
      attackerSide: makeBaseSide({ spikes: 0 }),
      setAttackerSide,
    });
    // Spikes stepper renders options 0,1,2,3. Find buttons with text "1"
    // and click the first one in Ours side (the Ours stepper comes first in DOM)
    const allButtons = screen.getAllByRole("button");
    const spikesOnesOurs = allButtons.filter((btn) => btn.textContent === "1");
    fireEvent.click(spikesOnesOurs[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ spikes: 1 });
  });

  it("clicking Spikes '3' on Ours calls setAttackerSide({ spikes: 3 })", () => {
    const setAttackerSide = jest.fn();
    renderSurface({
      attackerSide: makeBaseSide({ spikes: 0 }),
      setAttackerSide,
    });
    const allButtons = screen.getAllByRole("button");
    const threes = allButtons.filter((btn) => btn.textContent === "3");
    fireEvent.click(threes[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ spikes: 3 });
  });

  it("clicking Spikes '0' on Ours calls setAttackerSide({ spikes: 0 })", () => {
    const setAttackerSide = jest.fn();
    renderSurface({
      attackerSide: makeBaseSide({ spikes: 2 }),
      setAttackerSide,
    });
    const allButtons = screen.getAllByRole("button");
    const zeros = allButtons.filter((btn) => btn.textContent === "0");
    fireEvent.click(zeros[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ spikes: 0 });
  });
});

describe("FieldControlSurface — spikes stepper (Theirs side)", () => {
  it("clicking Spikes '2' on Theirs calls setDefenderSide({ spikes: 2 })", () => {
    const setDefenderSide = jest.fn();
    renderSurface({
      defenderSide: makeBaseSide({ spikes: 0 }),
      setDefenderSide,
    });
    // The Theirs spikes stepper is the second stepper in DOM order
    const allButtons = screen.getAllByRole("button");
    const twos = allButtons.filter((btn) => btn.textContent === "2");
    // twos[0] = Ours, twos[1] = Theirs
    fireEvent.click(twos[1]);
    expect(setDefenderSide).toHaveBeenCalledWith({ spikes: 2 });
  });
});

// =============================================================================
// Tests — inferred weather hint
// =============================================================================

describe("FieldControlSurface — inferredWeather hint", () => {
  it("shows 'auto: Sun' hint when weather='' and inferredWeather='Sun'", () => {
    renderSurface({ weather: "", inferredWeather: "Sun" });
    expect(screen.getByText("auto: Sun")).toBeInTheDocument();
  });

  it("shows 'auto: Rain' hint when inferredWeather='Rain'", () => {
    renderSurface({ weather: "", inferredWeather: "Rain" });
    expect(screen.getByText("auto: Rain")).toBeInTheDocument();
  });

  it("does NOT show hint when explicit weather is set", () => {
    renderSurface({ weather: "Sun", inferredWeather: "Sun" });
    expect(screen.queryByText(/auto:/)).not.toBeInTheDocument();
  });

  it("does NOT show hint when inferredWeather is null", () => {
    renderSurface({ weather: "", inferredWeather: null });
    expect(screen.queryByText(/auto:/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — inferred terrain hint
// =============================================================================

describe("FieldControlSurface — inferredTerrain hint", () => {
  it("shows 'auto: Electric' hint when terrain='' and inferredTerrain='Electric'", () => {
    renderSurface({ terrain: "", inferredTerrain: "Electric" });
    expect(screen.getByText("auto: Electric")).toBeInTheDocument();
  });

  it("does NOT show terrain hint when explicit terrain is set", () => {
    renderSurface({ terrain: "Grassy", inferredTerrain: "Electric" });
    expect(screen.queryByText(/auto:/)).not.toBeInTheDocument();
  });

  it("does NOT show terrain hint when inferredTerrain is null", () => {
    renderSurface({ terrain: "", inferredTerrain: null });
    expect(screen.queryByText(/auto:/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — symmetric rendering of all side rows
// =============================================================================

describe("FieldControlSurface — symmetric side rows present", () => {
  it("renders Reflect switch on both Ours and Theirs sides", () => {
    renderSurface();
    expect(
      screen.getByRole("switch", { name: /reflect \(ours\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /reflect \(theirs\)/i })
    ).toBeInTheDocument();
  });

  it("renders Light Screen switch on both sides", () => {
    renderSurface();
    expect(
      screen.getByRole("switch", { name: /light screen \(ours\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /light screen \(theirs\)/i })
    ).toBeInTheDocument();
  });

  it("renders Aurora Veil switch on both sides", () => {
    renderSurface();
    expect(
      screen.getByRole("switch", { name: /aurora veil \(ours\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /aurora veil \(theirs\)/i })
    ).toBeInTheDocument();
  });

  it("renders Stealth Rock switch on both sides", () => {
    renderSurface();
    expect(
      screen.getByRole("switch", { name: /stealth rock \(ours\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /stealth rock \(theirs\)/i })
    ).toBeInTheDocument();
  });

  it("renders Spikes label", () => {
    renderSurface();
    expect(screen.getByText("Spikes")).toBeInTheDocument();
  });
});
