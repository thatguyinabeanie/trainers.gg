"use client";

/**
 * Behavioral tests for CalcFieldBlock.
 *
 * Covers:
 *   - Weather chip buttons render and toggle correctly
 *   - Terrain chip buttons render and toggle correctly
 *   - Singles/Doubles game type toggle
 *   - Gravity toggle button (aria-pressed)
 *   - Fairy Aura toggle button (aria-pressed)
 *   - Tailwind, Reflect, Light Screen, Aurora Veil toggles for each side (symmetric)
 *   - Helping Hand toggle (both sides)
 *   - Stealth Rock toggle (both sides)
 *   - Foes alive stepper (Doubles mode only)
 *   - Ally alive toggle (Doubles mode only)
 *   - Fainted stepper for each side
 *   - Inferred weather / terrain badge text
 *   - setWeather clears weather when same value clicked again
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { type BaseSideState } from "../../use-calc-state";
import {
  type FieldConditions,
  type FieldConditionSetters,
  type DoublesState,
  type DoublesStateSetters,
  type FaintedCounts,
  type FaintedCountSetters,
  type InferredConditions,
} from "../calc/calc-field-block";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcFieldBlock } from "../calc/calc-field-block";

// =============================================================================
// Fixtures
// =============================================================================

function makeSideState(overrides: Partial<BaseSideState> = {}): BaseSideState {
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

interface RenderProps {
  gameType?: "Doubles" | "Singles";
  setGameType?: jest.Mock;
  attackerSide?: BaseSideState;
  setAttackerSide?: jest.Mock;
  defenderSide?: BaseSideState;
  setDefenderSide?: jest.Mock;
  // Field conditions (flat for convenience — assembled into nested `field`/`setField`)
  weather?: string;
  setWeather?: jest.Mock;
  terrain?: string;
  setTerrain?: jest.Mock;
  gravity?: boolean;
  setGravity?: jest.Mock;
  fairyAura?: boolean;
  setFairyAura?: jest.Mock;
  // Doubles-specific (flat for convenience — assembled into nested `doubles`/`setDoubles`)
  foesAlive?: 1 | 2;
  allyAlive?: boolean;
  setFoesAlive?: jest.Mock;
  setAllyAlive?: jest.Mock;
  // Inferred conditions
  inferredWeather?: string | null;
  inferredTerrain?: string | null;
  attackerAbility?: string | null;
  // Fainted counters (flat for convenience — assembled into nested `fainted`/`setFainted`)
  faintedYours?: number;
  setFaintedYours?: jest.Mock;
  faintedTheirs?: number;
  setFaintedTheirs?: jest.Mock;
}

function renderBlock(props: RenderProps = {}) {
  const setGameType = props.setGameType ?? jest.fn();
  const setAttackerSide = props.setAttackerSide ?? jest.fn();
  const setDefenderSide = props.setDefenderSide ?? jest.fn();
  const setWeather = props.setWeather ?? jest.fn();
  const setTerrain = props.setTerrain ?? jest.fn();
  const setGravity = props.setGravity ?? jest.fn();
  const setFairyAura = props.setFairyAura ?? jest.fn();
  const setFoesAlive = props.setFoesAlive ?? jest.fn();
  const setAllyAlive = props.setAllyAlive ?? jest.fn();
  const setFaintedYours = props.setFaintedYours ?? jest.fn();
  const setFaintedTheirs = props.setFaintedTheirs ?? jest.fn();

  const field: FieldConditions = {
    weather: props.weather ?? "",
    terrain: props.terrain ?? "",
    gravity: props.gravity ?? false,
    fairyAura: props.fairyAura ?? false,
  };

  const setFieldObj: FieldConditionSetters = {
    setWeather,
    setTerrain,
    setGravity,
    setFairyAura,
  };

  const doubles: DoublesState = {
    foesAlive: props.foesAlive ?? 2,
    allyAlive: props.allyAlive ?? true,
  };

  const setDoubles: DoublesStateSetters = { setFoesAlive, setAllyAlive };

  const fainted: FaintedCounts = {
    yours: props.faintedYours ?? 0,
    theirs: props.faintedTheirs ?? 0,
  };

  const setFainted: FaintedCountSetters = {
    setYours: setFaintedYours,
    setTheirs: setFaintedTheirs,
  };

  const hasInferred =
    props.inferredWeather !== undefined ||
    props.inferredTerrain !== undefined ||
    props.attackerAbility !== undefined;

  const inferred: InferredConditions | undefined = hasInferred
    ? {
        weather: props.inferredWeather ?? null,
        terrain: props.inferredTerrain ?? null,
        attackerAbility: props.attackerAbility ?? null,
      }
    : undefined;

  const result = render(
    <CalcFieldBlock
      gameType={props.gameType ?? "Doubles"}
      setGameType={setGameType}
      attackerSide={props.attackerSide ?? makeSideState()}
      setAttackerSide={setAttackerSide}
      defenderSide={props.defenderSide ?? makeSideState()}
      setDefenderSide={setDefenderSide}
      field={field}
      setField={setFieldObj}
      doubles={doubles}
      setDoubles={setDoubles}
      fainted={fainted}
      setFainted={setFainted}
      inferred={inferred}
    />
  );

  return {
    ...result,
    setGameType,
    setAttackerSide,
    setDefenderSide,
    setWeather,
    setTerrain,
    setGravity,
    setFairyAura,
    setFoesAlive,
    setAllyAlive,
    setFaintedYours,
    setFaintedTheirs,
  };
}

// =============================================================================
// Tests — basic render
// =============================================================================

describe("CalcFieldBlock — basic render", () => {
  it("renders the 'Field' section eyebrow", () => {
    renderBlock();
    expect(screen.getByText("Field")).toBeInTheDocument();
  });

  it("renders Singles and Doubles toggle buttons", () => {
    renderBlock();
    expect(screen.getByRole("button", { name: "Singles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Doubles" })).toBeInTheDocument();
  });

  it("renders the Weather section label", () => {
    renderBlock();
    expect(screen.getByText("Weather")).toBeInTheDocument();
  });

  it("renders the Terrain section label", () => {
    renderBlock();
    expect(screen.getByText("Terrain")).toBeInTheDocument();
  });

  it("renders the Sides section label", () => {
    renderBlock();
    expect(screen.getByText("Sides")).toBeInTheDocument();
  });

  it("renders Yours and Theirs side cards", () => {
    renderBlock();
    expect(screen.getByText(/▸ Yours/i)).toBeInTheDocument();
    expect(screen.getByText(/▸ Theirs/i)).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — game type toggle
// =============================================================================

describe("CalcFieldBlock — game type toggle", () => {
  it("calls setGameType('Singles') when Singles button is clicked", () => {
    const { setGameType } = renderBlock({ gameType: "Doubles" });
    fireEvent.click(screen.getByRole("button", { name: "Singles" }));
    expect(setGameType).toHaveBeenCalledWith("Singles");
  });

  it("calls setGameType('Doubles') when Doubles button is clicked", () => {
    const { setGameType } = renderBlock({ gameType: "Singles" });
    fireEvent.click(screen.getByRole("button", { name: "Doubles" }));
    expect(setGameType).toHaveBeenCalledWith("Doubles");
  });

  it("shows Foes stepper in Doubles mode", () => {
    renderBlock({ gameType: "Doubles" });
    expect(screen.getByText("Foes")).toBeInTheDocument();
  });

  it("hides Foes stepper in Singles mode", () => {
    renderBlock({ gameType: "Singles" });
    expect(screen.queryByText("Foes")).not.toBeInTheDocument();
  });

  it("shows Ally toggle in Doubles mode", () => {
    renderBlock({ gameType: "Doubles", allyAlive: true });
    expect(screen.getByText("Ally")).toBeInTheDocument();
  });

  it("hides Ally toggle in Singles mode", () => {
    renderBlock({ gameType: "Singles" });
    expect(screen.queryByText("Ally")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — weather chips
// =============================================================================

describe("CalcFieldBlock — weather chips", () => {
  it.each(["Sun", "Rain", "Sand", "Snow"] as const)(
    "renders '%s' weather button",
    (w) => {
      renderBlock();
      expect(screen.getByRole("button", { name: w })).toBeInTheDocument();
    }
  );

  it("calls setWeather('Sun') when Sun button is clicked", () => {
    const { setWeather } = renderBlock({ weather: "" });
    fireEvent.click(screen.getByRole("button", { name: "Sun" }));
    expect(setWeather).toHaveBeenCalledWith("Sun");
  });

  it("calls setWeather('') (clear) when active weather is clicked again", () => {
    const { setWeather } = renderBlock({ weather: "Rain" });
    fireEvent.click(screen.getByRole("button", { name: "Rain" }));
    expect(setWeather).toHaveBeenCalledWith("");
  });

  it("calls setWeather('Sand') when Sand is clicked", () => {
    const { setWeather } = renderBlock({ weather: "" });
    fireEvent.click(screen.getByRole("button", { name: "Sand" }));
    expect(setWeather).toHaveBeenCalledWith("Sand");
  });

  it("shows inferred weather badge when weather='' and inferredWeather is set", () => {
    renderBlock({
      weather: "",
      inferredWeather: "Sun",
      attackerAbility: "Drought",
    });
    expect(screen.getByText("↳ inferred from Drought")).toBeInTheDocument();
  });

  it("does NOT show inferred badge when explicit weather is set", () => {
    renderBlock({
      weather: "Rain",
      inferredWeather: "Sun",
      attackerAbility: "Drought",
    });
    expect(screen.queryByText(/inferred from/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — terrain chips
// =============================================================================

describe("CalcFieldBlock — terrain chips", () => {
  it.each(["Grassy", "Electric", "Psychic", "Misty"] as const)(
    "renders '%s' terrain button",
    (t) => {
      renderBlock();
      expect(screen.getByRole("button", { name: t })).toBeInTheDocument();
    }
  );

  it("calls setTerrain('Grassy') when Grassy is clicked", () => {
    const { setTerrain } = renderBlock({ terrain: "" });
    fireEvent.click(screen.getByRole("button", { name: "Grassy" }));
    expect(setTerrain).toHaveBeenCalledWith("Grassy");
  });

  it("calls setTerrain('') when active terrain is clicked again", () => {
    const { setTerrain } = renderBlock({ terrain: "Electric" });
    fireEvent.click(screen.getByRole("button", { name: "Electric" }));
    expect(setTerrain).toHaveBeenCalledWith("");
  });

  it("shows inferred terrain badge when terrain='' and inferredTerrain is set", () => {
    renderBlock({
      terrain: "",
      inferredTerrain: "Electric",
      attackerAbility: "Hadron Engine",
    });
    expect(screen.getByText("↳ inferred from Hadron Engine")).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — gravity toggle
// =============================================================================

describe("CalcFieldBlock — gravity toggle", () => {
  it("renders the Gravity toggle button with full label", () => {
    renderBlock();
    expect(screen.getByRole("button", { name: /^gravity$/i })).toBeInTheDocument();
  });

  it("gravity button is NOT pressed by default", () => {
    renderBlock({ gravity: false });
    const btn = screen.getByRole("button", { name: /^gravity$/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("gravity button is pressed when gravity=true", () => {
    renderBlock({ gravity: true });
    const btn = screen.getByRole("button", { name: /^gravity$/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls setGravity(!gravity) when Gravity button is clicked", () => {
    const { setGravity } = renderBlock({ gravity: false });
    fireEvent.click(screen.getByRole("button", { name: /^gravity$/i }));
    expect(setGravity).toHaveBeenCalledWith(true);
  });
});

// =============================================================================
// Tests — fairy aura toggle
// =============================================================================

describe("CalcFieldBlock — fairy aura toggle", () => {
  it("renders Fairy Aura toggle inactive by default", () => {
    renderBlock();
    expect(screen.getByRole("button", { name: /fairy aura/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("renders Fairy Aura toggle active when fairyAura=true", () => {
    renderBlock({ fairyAura: true });
    expect(screen.getByRole("button", { name: /fairy aura/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("calls setFairyAura(true) when Fairy Aura clicked while inactive", () => {
    const setFairyAura = jest.fn();
    renderBlock({ fairyAura: false, setFairyAura });
    fireEvent.click(screen.getByRole("button", { name: /fairy aura/i }));
    expect(setFairyAura).toHaveBeenCalledWith(true);
  });

  it("calls setFairyAura(false) when Fairy Aura clicked while active", () => {
    const setFairyAura = jest.fn();
    renderBlock({ fairyAura: true, setFairyAura });
    fireEvent.click(screen.getByRole("button", { name: /fairy aura/i }));
    expect(setFairyAura).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// Tests — side card toggles (symmetric — both sides have all fields)
// =============================================================================

describe("CalcFieldBlock — Yours side toggles", () => {
  it("calls setAttackerSide with tailwind patch when Tailwind clicked on Yours side", () => {
    const setAttackerSide = jest.fn();
    renderBlock({
      attackerSide: makeSideState({ tailwind: false }),
      setAttackerSide,
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^tailwind$/i })[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ tailwind: true });
  });

  it("calls setAttackerSide with reflect patch when Reflect clicked on Yours side", () => {
    const setAttackerSide = jest.fn();
    renderBlock({
      attackerSide: makeSideState({ reflect: false }),
      setAttackerSide,
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^reflect$/i })[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ reflect: true });
  });

  it("calls setAttackerSide with lightScreen patch when Light Screen clicked on Yours side", () => {
    const setAttackerSide = jest.fn();
    renderBlock({
      attackerSide: makeSideState({ lightScreen: false }),
      setAttackerSide,
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^light screen$/i })[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ lightScreen: true });
  });

  it("calls setAttackerSide with helpingHand patch when Helping Hand clicked on Yours side", () => {
    const setAttackerSide = jest.fn();
    renderBlock({
      attackerSide: makeSideState({ helpingHand: false }),
      setAttackerSide,
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^helping hand$/i })[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ helpingHand: true });
  });
});

describe("CalcFieldBlock — Theirs side toggles", () => {
  it("calls setDefenderSide with tailwind patch when Tailwind clicked on Theirs side", () => {
    const setDefenderSide = jest.fn();
    renderBlock({
      defenderSide: makeSideState({ tailwind: false }),
      setDefenderSide,
    });
    // "Tailwind" appears in both side cards; second button is Theirs
    fireEvent.click(screen.getAllByRole("button", { name: /^tailwind$/i })[1]);
    expect(setDefenderSide).toHaveBeenCalledWith({ tailwind: true });
  });

  it("calls setDefenderSide with stealthRock patch when Stealth Rock clicked on Theirs side", () => {
    const setDefenderSide = jest.fn();
    renderBlock({
      defenderSide: makeSideState({ stealthRock: false }),
      setDefenderSide,
    });
    // "Stealth Rock" appears in both side cards; second button is Theirs
    fireEvent.click(screen.getAllByRole("button", { name: /^stealth rock$/i })[1]);
    expect(setDefenderSide).toHaveBeenCalledWith({ stealthRock: true });
  });
});

// =============================================================================
// Tests — symmetric side card fields (both sides have same buttons)
// =============================================================================

describe("CalcFieldBlock — symmetric side card fields", () => {
  it("renders Tailwind on both sides", () => {
    renderBlock();
    expect(screen.getAllByRole("button", { name: /^tailwind$/i })).toHaveLength(2);
  });

  it("renders Reflect on both sides", () => {
    renderBlock();
    expect(screen.getAllByRole("button", { name: /^reflect$/i })).toHaveLength(2);
  });

  it("renders Light Screen on both sides", () => {
    renderBlock();
    expect(screen.getAllByRole("button", { name: /^light screen$/i })).toHaveLength(2);
  });

  it("renders Aurora Veil on both sides", () => {
    renderBlock({ attackerSide: makeSideState({ auroraVeil: true }) });
    const buttons = screen.getAllByRole("button", { name: /aurora veil/i });
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true"); // Yours active
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false"); // Theirs inactive
  });

  it("renders Stealth Rock on both sides (was previously Theirs only)", () => {
    renderBlock({ attackerSide: makeSideState({ stealthRock: true }) });
    const srButtons = screen.getAllByRole("button", { name: /^stealth rock$/i });
    expect(srButtons).toHaveLength(2);
    expect(srButtons[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("renders Helping Hand on both sides (was previously Yours only)", () => {
    renderBlock({ defenderSide: makeSideState({ helpingHand: true }) });
    const hhButtons = screen.getAllByRole("button", { name: /^helping hand$/i });
    expect(hhButtons).toHaveLength(2);
    expect(hhButtons[1]).toHaveAttribute("aria-pressed", "true");
  });
});

// =============================================================================
// Tests — foes alive stepper (Doubles)
// =============================================================================

describe("CalcFieldBlock — foes alive stepper", () => {
  it("clicking foes '1' calls setFoesAlive(1)", () => {
    const { setFoesAlive } = renderBlock({ gameType: "Doubles", foesAlive: 2 });
    // There are Stepper buttons: 0,1,2,3,4,5 for fainted + 1,2 for foes
    // Foes stepper buttons "1" and "2" are in the foes area
    // We need to find the foes stepper buttons specifically
    const allButtons = screen.getAllByRole("button");
    // Find the button with text "1" inside the FOES area
    // The Stepper renders buttons with just the number text
    const foesOneBtns = allButtons.filter(
      (btn) => btn.textContent === "1" && btn.className.includes("font-mono")
    );
    // Click the first "1" button near the Foes label
    if (foesOneBtns.length > 0) {
      fireEvent.click(foesOneBtns[0]);
      expect(setFoesAlive).toHaveBeenCalledWith(1);
    } else {
      // Fallback: find all buttons with text "1"
      const ones = allButtons.filter((b) => b.textContent === "1");
      fireEvent.click(ones[0]);
      expect(setFoesAlive).toHaveBeenCalledWith(1);
    }
  });
});

// =============================================================================
// Tests — ally alive (Doubles)
// =============================================================================

describe("CalcFieldBlock — ally alive toggle", () => {
  it("ally toggle shows 'Alive' text when allyAlive=true", () => {
    renderBlock({ gameType: "Doubles", allyAlive: true });
    const allyBtn = screen.getByRole("button", { name: "Alive" });
    expect(allyBtn).toBeInTheDocument();
  });

  it("ally toggle shows 'Fainted' text when allyAlive=false", () => {
    renderBlock({ gameType: "Doubles", allyAlive: false });
    const allyBtn = screen.getByRole("button", { name: "Fainted" });
    expect(allyBtn).toBeInTheDocument();
  });

  it("clicking ally Alive toggle calls setAllyAlive(false)", () => {
    const { setAllyAlive } = renderBlock({ gameType: "Doubles", allyAlive: true });
    fireEvent.click(screen.getByRole("button", { name: "Alive" }));
    expect(setAllyAlive).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// Tests — fainted stepper
// =============================================================================

describe("CalcFieldBlock — fainted stepper", () => {
  it("renders Fainted label in side cards", () => {
    renderBlock();
    const faintedLabels = screen.getAllByText("Fainted");
    // One per side card (plus possibly ally toggle if allyAlive=false)
    expect(faintedLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("clicking fainted '5' in Yours calls setFaintedYours(5)", () => {
    const { setFaintedYours } = renderBlock({ faintedYours: 0 });
    // Fainted stepper options: 0,1,2,3,4,5. "5" only appears in Fainted
    // steppers (Spikes only goes 0-3), so the first "5" is Yours fainted.
    const fives = screen.getAllByRole("button").filter(
      (btn) => btn.textContent === "5"
    );
    fireEvent.click(fives[0]);
    expect(setFaintedYours).toHaveBeenCalledWith(5);
  });
});

// =============================================================================
// Tests — active state styling
// =============================================================================

describe("CalcFieldBlock — active state aria-pressed", () => {
  it.each([
    [false, "false"],
    [true, "true"],
  ] as const)(
    "tailwind=%s → Tailwind button aria-pressed=%s on Yours side",
    (tailwind, expected) => {
      renderBlock({ attackerSide: makeSideState({ tailwind }) });
      const twBtns = screen.getAllByRole("button", { name: /^tailwind$/i });
      expect(twBtns[0]).toHaveAttribute("aria-pressed", expected);
    }
  );

  it.each([
    [false, "false"],
    [true, "true"],
  ] as const)(
    "stealthRock=%s → Stealth Rock button aria-pressed=%s on Theirs side",
    (stealthRock, expected) => {
      renderBlock({ defenderSide: makeSideState({ stealthRock }) });
      const srBtns = screen.getAllByRole("button", { name: /^stealth rock$/i });
      expect(srBtns[1]).toHaveAttribute("aria-pressed", expected);
    }
  );
});
