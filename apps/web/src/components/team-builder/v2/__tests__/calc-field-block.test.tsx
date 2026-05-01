"use client";

/**
 * Behavioral tests for CalcFieldBlock.
 *
 * Covers:
 *   - Weather chip buttons render and toggle correctly
 *   - Terrain chip buttons render and toggle correctly
 *   - Singles/Doubles game type toggle
 *   - Gravity toggle button (aria-pressed)
 *   - Tailwind (TW), Reflect, Light Screen toggles for each side
 *   - Helping Hand toggle (Yours side only)
 *   - Stealth Rock toggle (Theirs side only)
 *   - Foes alive stepper (Doubles mode only)
 *   - Ally alive toggle (Doubles mode only)
 *   - Fainted stepper for each side
 *   - Inferred weather / terrain badge text
 *   - setWeather clears weather when same value clicked again
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import {
  type AttackerSideState,
  type DefenderSideState,
} from "../../use-calc-state";

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

function makeAttackerSide(
  overrides: Partial<AttackerSideState> = {}
): AttackerSideState {
  return {
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    ...overrides,
  };
}

function makeDefenderSide(
  overrides: Partial<DefenderSideState> = {}
): DefenderSideState {
  return {
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    stealthRock: false,
    spikes: 0,
    saltCure: false,
    ...overrides,
  };
}

interface RenderProps {
  gameType?: "Doubles" | "Singles";
  setGameType?: jest.Mock;
  attackerSide?: AttackerSideState;
  setAttackerSide?: jest.Mock;
  defenderSide?: DefenderSideState;
  setDefenderSide?: jest.Mock;
  weather?: string;
  setWeather?: jest.Mock;
  terrain?: string;
  setTerrain?: jest.Mock;
  gravity?: boolean;
  setGravity?: jest.Mock;
  foesAlive?: 1 | 2;
  allyAlive?: boolean;
  setFoesAlive?: jest.Mock;
  setAllyAlive?: jest.Mock;
  inferredWeather?: string | null;
  inferredTerrain?: string | null;
  attackerAbility?: string | null;
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
  const setFoesAlive = props.setFoesAlive ?? jest.fn();
  const setAllyAlive = props.setAllyAlive ?? jest.fn();
  const setFaintedYours = props.setFaintedYours ?? jest.fn();
  const setFaintedTheirs = props.setFaintedTheirs ?? jest.fn();

  const result = render(
    <CalcFieldBlock
      gameType={props.gameType ?? "Doubles"}
      setGameType={setGameType}
      attackerSide={props.attackerSide ?? makeAttackerSide()}
      setAttackerSide={setAttackerSide}
      defenderSide={props.defenderSide ?? makeDefenderSide()}
      setDefenderSide={setDefenderSide}
      weather={props.weather ?? ""}
      setWeather={setWeather}
      terrain={props.terrain ?? ""}
      setTerrain={setTerrain}
      gravity={props.gravity ?? false}
      setGravity={setGravity}
      foesAlive={props.foesAlive ?? 2}
      allyAlive={props.allyAlive ?? true}
      setFoesAlive={setFoesAlive}
      setAllyAlive={setAllyAlive}
      inferredWeather={props.inferredWeather ?? null}
      inferredTerrain={props.inferredTerrain ?? null}
      attackerAbility={props.attackerAbility ?? null}
      faintedYours={props.faintedYours ?? 0}
      setFaintedYours={setFaintedYours}
      faintedTheirs={props.faintedTheirs ?? 0}
      setFaintedTheirs={setFaintedTheirs}
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

  it("shows FOES stepper in Doubles mode", () => {
    renderBlock({ gameType: "Doubles" });
    expect(screen.getByText("FOES")).toBeInTheDocument();
  });

  it("hides FOES stepper in Singles mode", () => {
    renderBlock({ gameType: "Singles" });
    expect(screen.queryByText("FOES")).not.toBeInTheDocument();
  });

  it("shows ALLY toggle in Doubles mode", () => {
    renderBlock({ gameType: "Doubles", allyAlive: true });
    expect(screen.getByText("ALLY")).toBeInTheDocument();
  });

  it("hides ALLY toggle in Singles mode", () => {
    renderBlock({ gameType: "Singles" });
    expect(screen.queryByText("ALLY")).not.toBeInTheDocument();
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
  it("renders the Gravity toggle button", () => {
    renderBlock();
    expect(screen.getByRole("button", { name: /Grav/i })).toBeInTheDocument();
  });

  it("gravity button is NOT pressed by default", () => {
    renderBlock({ gravity: false });
    const btn = screen.getByRole("button", { name: /Grav/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("gravity button is pressed when gravity=true", () => {
    renderBlock({ gravity: true });
    const btn = screen.getByRole("button", { name: /Grav/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls setGravity(!gravity) when Gravity button is clicked", () => {
    const { setGravity } = renderBlock({ gravity: false });
    fireEvent.click(screen.getByRole("button", { name: /Grav/i }));
    expect(setGravity).toHaveBeenCalledWith(true);
  });
});

// =============================================================================
// Tests — side card toggles
// =============================================================================

describe("CalcFieldBlock — Yours side toggles", () => {
  it("TW button calls setAttackerSide with tailwind toggled", () => {
    const { setAttackerSide } = renderBlock({
      attackerSide: makeAttackerSide({ tailwind: false }),
    });
    // "TW" appears in both side cards; click the first (Yours)
    const twBtns = screen.getAllByRole("button", { name: "TW" });
    fireEvent.click(twBtns[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ tailwind: true });
  });

  it("Refl button calls setAttackerSide with reflect toggled", () => {
    const { setAttackerSide } = renderBlock({
      attackerSide: makeAttackerSide({ reflect: false }),
    });
    const reflBtns = screen.getAllByRole("button", { name: "Refl" });
    fireEvent.click(reflBtns[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ reflect: true });
  });

  it("L.Scr button calls setAttackerSide with lightScreen toggled", () => {
    const { setAttackerSide } = renderBlock({
      attackerSide: makeAttackerSide({ lightScreen: false }),
    });
    const lscrBtns = screen.getAllByRole("button", { name: "L.Scr" });
    fireEvent.click(lscrBtns[0]);
    expect(setAttackerSide).toHaveBeenCalledWith({ lightScreen: true });
  });

  it("H.Hand button calls setAttackerSide with helpingHand toggled", () => {
    const { setAttackerSide } = renderBlock({
      attackerSide: makeAttackerSide({ helpingHand: false }),
    });
    fireEvent.click(screen.getByRole("button", { name: "H.Hand" }));
    expect(setAttackerSide).toHaveBeenCalledWith({ helpingHand: true });
  });

  it("H.Hand button is only visible in Yours side (not in Theirs)", () => {
    renderBlock();
    // H.Hand appears only once (Yours side only)
    expect(screen.getAllByRole("button", { name: "H.Hand" })).toHaveLength(1);
  });
});

describe("CalcFieldBlock — Theirs side toggles", () => {
  it("⛰ Rocks button calls setDefenderSide with stealthRock toggled", () => {
    const { setDefenderSide } = renderBlock({
      defenderSide: makeDefenderSide({ stealthRock: false }),
    });
    fireEvent.click(screen.getByRole("button", { name: /Rocks/i }));
    expect(setDefenderSide).toHaveBeenCalledWith({ stealthRock: true });
  });

  it("Rocks button is only visible in Theirs side (not in Yours)", () => {
    renderBlock();
    expect(screen.getAllByRole("button", { name: /Rocks/i })).toHaveLength(1);
  });

  it("TW button for Theirs calls setDefenderSide with tailwind toggled", () => {
    const { setDefenderSide } = renderBlock({
      defenderSide: makeDefenderSide({ tailwind: false }),
    });
    // "TW" is in both sides; second button is Theirs
    const twBtns = screen.getAllByRole("button", { name: "TW" });
    fireEvent.click(twBtns[1]);
    expect(setDefenderSide).toHaveBeenCalledWith({ tailwind: true });
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
    // Click the first "1" button near the FOES label
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
  it("ally toggle shows 'alive' text when allyAlive=true", () => {
    renderBlock({ gameType: "Doubles", allyAlive: true });
    const allyBtn = screen.getByRole("button", { name: "alive" });
    expect(allyBtn).toBeInTheDocument();
  });

  it("ally toggle shows 'fainted' text when allyAlive=false", () => {
    renderBlock({ gameType: "Doubles", allyAlive: false });
    const allyBtn = screen.getByRole("button", { name: "fainted" });
    expect(allyBtn).toBeInTheDocument();
  });

  it("clicking ally alive/fainted toggle calls setAllyAlive", () => {
    const { setAllyAlive } = renderBlock({ gameType: "Doubles", allyAlive: true });
    fireEvent.click(screen.getByRole("button", { name: "alive" }));
    expect(setAllyAlive).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// Tests — fainted stepper
// =============================================================================

describe("CalcFieldBlock — fainted stepper", () => {
  it("renders FAINTED label in side cards", () => {
    renderBlock();
    const faintedLabels = screen.getAllByText("FAINTED");
    // One per side card
    expect(faintedLabels.length).toBe(2);
  });

  it("clicking fainted '3' in Yours calls setFaintedYours(3)", () => {
    const { setFaintedYours } = renderBlock({ faintedYours: 0 });
    // Fainted stepper options: 0,1,2,3,4,5 — buttons with text "3"
    const threes = screen.getAllByRole("button").filter(
      (btn) => btn.textContent === "3"
    );
    // First "3" button is in Yours side fainted stepper
    fireEvent.click(threes[0]);
    expect(setFaintedYours).toHaveBeenCalledWith(3);
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
    "tailwind=%s → TW button aria-pressed=%s",
    (tailwind, expected) => {
      renderBlock({ attackerSide: makeAttackerSide({ tailwind }) });
      const twBtns = screen.getAllByRole("button", { name: "TW" });
      expect(twBtns[0]).toHaveAttribute("aria-pressed", expected);
    }
  );

  it.each([
    [false, "false"],
    [true, "true"],
  ] as const)(
    "stealthRock=%s → Rocks button aria-pressed=%s",
    (stealthRock, expected) => {
      renderBlock({ defenderSide: makeDefenderSide({ stealthRock }) });
      expect(
        screen.getByRole("button", { name: /Rocks/i })
      ).toHaveAttribute("aria-pressed", expected);
    }
  );
});
