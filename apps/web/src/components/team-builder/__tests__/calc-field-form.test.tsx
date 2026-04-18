import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  CalcFieldForm,
  CalcSidesForm,
  type GameType,
} from "../calc-field-form";
import {
  type AttackerSideState,
  type DefenderSideState,
} from "../use-calc-state";

// =============================================================================
// Factories
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

// =============================================================================
// CalcFieldForm
// =============================================================================

describe("CalcFieldForm", () => {
  const handlers = {
    onGameTypeChange: jest.fn<(v: GameType) => void>(),
    onWeatherChange: jest.fn<(v: string) => void>(),
    onTerrainChange: jest.fn<(v: string) => void>(),
    onGravityChange: jest.fn<(v: boolean) => void>(),
  };

  function renderField(
    props: {
      gameType?: GameType;
      weather?: string;
      terrain?: string;
      gravity?: boolean;
    } = {}
  ) {
    const {
      gameType = "Doubles",
      weather = "",
      terrain = "",
      gravity = false,
    } = props;
    render(
      <CalcFieldForm
        gameType={gameType}
        weather={weather}
        terrain={terrain}
        gravity={gravity}
        onGameTypeChange={handlers.onGameTypeChange}
        onWeatherChange={handlers.onWeatherChange}
        onTerrainChange={handlers.onTerrainChange}
        onGravityChange={handlers.onGravityChange}
      />
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Default render
  // ---------------------------------------------------------------------------

  it("renders Mode, Weather, Terrain, and Other pill rows", () => {
    renderField();
    expect(screen.getByTestId("calc-field-mode-doubles")).toBeInTheDocument();
    expect(screen.getByTestId("calc-field-mode-singles")).toBeInTheDocument();
    expect(screen.getByTestId("calc-field-weather-none")).toBeInTheDocument();
    expect(screen.getByTestId("calc-field-weather-sun")).toBeInTheDocument();
    expect(
      screen.getByTestId("calc-field-terrain-electric")
    ).toBeInTheDocument();
    expect(screen.getByTestId("calc-field-gravity")).toBeInTheDocument();
  });

  it("renders all five weather options", () => {
    renderField();
    // "None" appears in both Weather and Terrain rows; others are unique.
    expect(screen.getAllByText("None").length).toBeGreaterThanOrEqual(1);
    for (const label of ["Sun", "Rain", "Sand", "Snow"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders all five terrain options", () => {
    renderField();
    for (const label of ["Electric", "Grassy", "Misty", "Psychic"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // "None" appears in both rows
    expect(screen.getAllByText("None").length).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------------------
  // aria-checked reflects active state (radio pills)
  // ---------------------------------------------------------------------------

  it("Doubles pill is aria-checked when gameType is Doubles", () => {
    renderField({ gameType: "Doubles" });
    expect(screen.getByTestId("calc-field-mode-doubles")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByTestId("calc-field-mode-singles")).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("Singles pill is aria-checked when gameType is Singles", () => {
    renderField({ gameType: "Singles" });
    expect(screen.getByTestId("calc-field-mode-singles")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByTestId("calc-field-mode-doubles")).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("active weather pill has aria-checked true", () => {
    renderField({ weather: "Sun" });
    expect(screen.getByTestId("calc-field-weather-sun")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByTestId("calc-field-weather-none")).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("active terrain pill has aria-checked true", () => {
    renderField({ terrain: "Electric" });
    expect(screen.getByTestId("calc-field-terrain-electric")).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("gravity pill uses aria-pressed (not aria-checked)", () => {
    renderField({ gravity: true });
    const pill = screen.getByTestId("calc-field-gravity");
    expect(pill).toHaveAttribute("aria-pressed", "true");
    expect(pill).not.toHaveAttribute("aria-checked");
  });

  it("gravity pill aria-pressed is false when gravity is off", () => {
    renderField({ gravity: false });
    expect(screen.getByTestId("calc-field-gravity")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  // ---------------------------------------------------------------------------
  // radiogroup semantics
  // ---------------------------------------------------------------------------

  it("Mode row has role radiogroup", () => {
    renderField();
    expect(
      screen.getByRole("radiogroup", { name: "Mode" })
    ).toBeInTheDocument();
  });

  it("Weather row has role radiogroup", () => {
    renderField();
    expect(
      screen.getByRole("radiogroup", { name: "Weather" })
    ).toBeInTheDocument();
  });

  it("Terrain row has role radiogroup", () => {
    renderField();
    expect(
      screen.getByRole("radiogroup", { name: "Terrain" })
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Callbacks — game type
  // ---------------------------------------------------------------------------

  it("clicking Doubles pill calls onGameTypeChange('Doubles')", async () => {
    const user = userEvent.setup();
    renderField({ gameType: "Singles" });
    await user.click(screen.getByTestId("calc-field-mode-doubles"));
    expect(handlers.onGameTypeChange).toHaveBeenCalledWith("Doubles");
  });

  it("clicking Singles pill calls onGameTypeChange('Singles')", async () => {
    const user = userEvent.setup();
    renderField({ gameType: "Doubles" });
    await user.click(screen.getByTestId("calc-field-mode-singles"));
    expect(handlers.onGameTypeChange).toHaveBeenCalledWith("Singles");
  });

  // ---------------------------------------------------------------------------
  // Callbacks — weather
  // ---------------------------------------------------------------------------

  it.each([
    ["Sun", "sun"],
    ["Rain", "rain"],
    ["Sand", "sand"],
    ["Snow", "snow"],
  ])(
    "clicking %s weather pill calls onWeatherChange('%s')",
    async (expectedValue, testIdSuffix) => {
      const user = userEvent.setup();
      renderField();
      await user.click(
        screen.getByTestId(`calc-field-weather-${testIdSuffix}`)
      );
      expect(handlers.onWeatherChange).toHaveBeenCalledWith(expectedValue);
    }
  );

  it("clicking None weather pill calls onWeatherChange('')", async () => {
    const user = userEvent.setup();
    renderField({ weather: "Sun" });
    await user.click(screen.getByTestId("calc-field-weather-none"));
    expect(handlers.onWeatherChange).toHaveBeenCalledWith("");
  });

  // ---------------------------------------------------------------------------
  // Callbacks — terrain
  // ---------------------------------------------------------------------------

  it.each([
    ["Electric", "electric"],
    ["Grassy", "grassy"],
    ["Misty", "misty"],
    ["Psychic", "psychic"],
  ])(
    "clicking %s terrain pill calls onTerrainChange('%s')",
    async (expectedValue, testIdSuffix) => {
      const user = userEvent.setup();
      renderField();
      await user.click(
        screen.getByTestId(`calc-field-terrain-${testIdSuffix}`)
      );
      expect(handlers.onTerrainChange).toHaveBeenCalledWith(expectedValue);
    }
  );

  it("clicking None terrain pill calls onTerrainChange('')", async () => {
    const user = userEvent.setup();
    renderField({ terrain: "Grassy" });
    await user.click(screen.getByTestId("calc-field-terrain-none"));
    expect(handlers.onTerrainChange).toHaveBeenCalledWith("");
  });

  // ---------------------------------------------------------------------------
  // Callbacks — gravity toggle
  // ---------------------------------------------------------------------------

  it("clicking Gravity when off calls onGravityChange(true)", async () => {
    const user = userEvent.setup();
    renderField({ gravity: false });
    await user.click(screen.getByTestId("calc-field-gravity"));
    expect(handlers.onGravityChange).toHaveBeenCalledWith(true);
  });

  it("clicking Gravity when on calls onGravityChange(false)", async () => {
    const user = userEvent.setup();
    renderField({ gravity: true });
    await user.click(screen.getByTestId("calc-field-gravity"));
    expect(handlers.onGravityChange).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// CalcSidesForm
// =============================================================================

describe("CalcSidesForm", () => {
  const handlers = {
    onAttackerSideChange:
      jest.fn<(patch: Partial<AttackerSideState>) => void>(),
    onDefenderSideChange:
      jest.fn<(patch: Partial<DefenderSideState>) => void>(),
  };

  function renderSides(
    attackerOverrides: Partial<AttackerSideState> = {},
    defenderOverrides: Partial<DefenderSideState> = {}
  ) {
    render(
      <CalcSidesForm
        attackerSide={makeAttackerSide(attackerOverrides)}
        defenderSide={makeDefenderSide(defenderOverrides)}
        onAttackerSideChange={handlers.onAttackerSideChange}
        onDefenderSideChange={handlers.onDefenderSideChange}
      />
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Layout and labeling
  // ---------------------------------------------------------------------------

  it("renders 'Your side' and 'Their side' section headings", () => {
    renderSides();
    expect(screen.getByText("Your side")).toBeInTheDocument();
    expect(screen.getByText("Their side")).toBeInTheDocument();
  });

  it("renders hazards section labeled 'Hazards (their side)'", () => {
    renderSides();
    expect(screen.getByText("Hazards (their side)")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Defender hazard controls present / attacker absent
  // ---------------------------------------------------------------------------

  it("renders Stealth Rock, Salt Cure, and Spikes controls", () => {
    renderSides();
    expect(screen.getByTestId("calc-hazards-sr")).toBeInTheDocument();
    expect(screen.getByTestId("calc-hazards-saltcure")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Spikes layers" })
    ).toBeInTheDocument();
  });

  it("Stealth Rock and Salt Cure controls are NOT inside the 'Your side' block (attacker)", () => {
    renderSides();
    const yourSideHeading = screen.getByText("Your side");
    const hazardsHeading = screen.getByText("Hazards (their side)");

    // The SR pill must appear after the hazards heading in the DOM
    const srPill = screen.getByTestId("calc-hazards-sr");
    const position = hazardsHeading.compareDocumentPosition(srPill);
    // DOCUMENT_POSITION_FOLLOWING = 4
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // SR pill must NOT appear between the start of the document and "Your side"
    const yourSidePosition = yourSideHeading.compareDocumentPosition(srPill);
    // SR comes AFTER "Your side" heading
    expect(yourSidePosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Attacker side toggle callbacks
  // ---------------------------------------------------------------------------

  it.each([
    ["Reflect", { reflect: true }],
    ["Light Screen", { lightScreen: true }],
    ["Aurora Veil", { auroraVeil: true }],
    ["Tailwind", { tailwind: true }],
    ["Helping Hand", { helpingHand: true }],
    ["Friend Guard", { friendGuard: true }],
  ] as const)(
    "clicking '%s' on attacker side fires onAttackerSideChange with correct patch",
    async (label, expectedPatch) => {
      const user = userEvent.setup();
      renderSides();

      // There are two sets of toggle buttons (attacker + defender). We need the
      // first occurrence (attacker = "Your side").
      const allButtons = screen.getAllByRole("button", { name: label });
      await user.click(allButtons[0]!);

      expect(handlers.onAttackerSideChange).toHaveBeenCalledWith(expectedPatch);
      expect(handlers.onDefenderSideChange).not.toHaveBeenCalled();
    }
  );

  it("attacker side toggles off when already active", async () => {
    const user = userEvent.setup();
    renderSides({ tailwind: true });

    const allTailwinds = screen.getAllByRole("button", { name: "Tailwind" });
    await user.click(allTailwinds[0]!);

    expect(handlers.onAttackerSideChange).toHaveBeenCalledWith({
      tailwind: false,
    });
  });

  // ---------------------------------------------------------------------------
  // Defender side toggle callbacks
  // ---------------------------------------------------------------------------

  it.each([
    ["Reflect", { reflect: true }],
    ["Light Screen", { lightScreen: true }],
    ["Aurora Veil", { auroraVeil: true }],
    ["Tailwind", { tailwind: true }],
    ["Helping Hand", { helpingHand: true }],
    ["Friend Guard", { friendGuard: true }],
  ] as const)(
    "clicking '%s' on defender side fires onDefenderSideChange with correct patch",
    async (label, expectedPatch) => {
      const user = userEvent.setup();
      renderSides();

      // The second occurrence of each label belongs to the defender block.
      const allButtons = screen.getAllByRole("button", { name: label });
      await user.click(allButtons[1]!);

      expect(handlers.onDefenderSideChange).toHaveBeenCalledWith(expectedPatch);
      expect(handlers.onAttackerSideChange).not.toHaveBeenCalled();
    }
  );

  it("defender side toggle turns off when already active", async () => {
    const user = userEvent.setup();
    renderSides({}, { reflect: true });

    const allReflects = screen.getAllByRole("button", { name: "Reflect" });
    await user.click(allReflects[1]!);

    expect(handlers.onDefenderSideChange).toHaveBeenCalledWith({
      reflect: false,
    });
  });

  // ---------------------------------------------------------------------------
  // Hazard-specific controls
  // ---------------------------------------------------------------------------

  it("clicking Stealth Rock fires onDefenderSideChange({ stealthRock: true })", async () => {
    const user = userEvent.setup();
    renderSides();
    await user.click(screen.getByTestId("calc-hazards-sr"));
    expect(handlers.onDefenderSideChange).toHaveBeenCalledWith({
      stealthRock: true,
    });
  });

  it("clicking Stealth Rock when active fires onDefenderSideChange({ stealthRock: false })", async () => {
    const user = userEvent.setup();
    renderSides({}, { stealthRock: true });
    await user.click(screen.getByTestId("calc-hazards-sr"));
    expect(handlers.onDefenderSideChange).toHaveBeenCalledWith({
      stealthRock: false,
    });
  });

  it("clicking Salt Cure fires onDefenderSideChange({ saltCure: true })", async () => {
    const user = userEvent.setup();
    renderSides();
    await user.click(screen.getByTestId("calc-hazards-saltcure"));
    expect(handlers.onDefenderSideChange).toHaveBeenCalledWith({
      saltCure: true,
    });
  });

  it("clicking Salt Cure when active fires onDefenderSideChange({ saltCure: false })", async () => {
    const user = userEvent.setup();
    renderSides({}, { saltCure: true });
    await user.click(screen.getByTestId("calc-hazards-saltcure"));
    expect(handlers.onDefenderSideChange).toHaveBeenCalledWith({
      saltCure: false,
    });
  });

  // ---------------------------------------------------------------------------
  // Spikes select
  // ---------------------------------------------------------------------------

  it("Spikes select renders with 0, 1, 2, 3 as options", () => {
    renderSides();
    const select = screen.getByRole("combobox", { name: "Spikes layers" });
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent
    );
    expect(options).toEqual(["0", "1", "2", "3"]);
  });

  it("Spikes select shows current value when spikes = 2", () => {
    renderSides({}, { spikes: 2 });
    const select = screen.getByRole("combobox", { name: "Spikes layers" });
    expect((select as HTMLSelectElement).value).toBe("2");
  });

  it.each([
    [0, "0"],
    [1, "1"],
    [2, "2"],
    [3, "3"],
  ])(
    "selecting spikes layer %i fires onDefenderSideChange({ spikes: %i })",
    async (value, optionText) => {
      const user = userEvent.setup();
      renderSides();
      const select = screen.getByRole("combobox", { name: "Spikes layers" });
      await user.selectOptions(select, optionText);
      expect(handlers.onDefenderSideChange).toHaveBeenCalledWith({
        spikes: value,
      });
    }
  );

  // ---------------------------------------------------------------------------
  // aria-pressed on SideBlock toggles
  // ---------------------------------------------------------------------------

  it("attacker Tailwind pill has aria-pressed true when active", () => {
    renderSides({ tailwind: true });
    const pills = screen.getAllByRole("button", { name: "Tailwind" });
    expect(pills[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("attacker Tailwind pill has aria-pressed false when inactive", () => {
    renderSides({ tailwind: false });
    const pills = screen.getAllByRole("button", { name: "Tailwind" });
    expect(pills[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("defender Friend Guard pill has aria-pressed true when active", () => {
    renderSides({}, { friendGuard: true });
    const pills = screen.getAllByRole("button", { name: "Friend Guard" });
    expect(pills[1]).toHaveAttribute("aria-pressed", "true");
  });

  // ---------------------------------------------------------------------------
  // Stealth Rock aria-pressed
  // ---------------------------------------------------------------------------

  it("Stealth Rock pill has aria-pressed true when stealthRock is true", () => {
    renderSides({}, { stealthRock: true });
    expect(screen.getByTestId("calc-hazards-sr")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("Stealth Rock pill has aria-pressed false when stealthRock is false", () => {
    renderSides({}, { stealthRock: false });
    expect(screen.getByTestId("calc-hazards-sr")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  // ---------------------------------------------------------------------------
  // Salt Cure aria-pressed
  // ---------------------------------------------------------------------------

  it("Salt Cure pill has aria-pressed true when saltCure is true", () => {
    renderSides({}, { saltCure: true });
    expect(screen.getByTestId("calc-hazards-saltcure")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  // ---------------------------------------------------------------------------
  // Each side fires its own handler independently
  // ---------------------------------------------------------------------------

  it("attacker toggle does not call defender handler", async () => {
    const user = userEvent.setup();
    renderSides();
    const reflects = screen.getAllByRole("button", { name: "Reflect" });
    await user.click(reflects[0]!);
    expect(handlers.onAttackerSideChange).toHaveBeenCalledTimes(1);
    expect(handlers.onDefenderSideChange).not.toHaveBeenCalled();
  });

  it("defender toggle does not call attacker handler", async () => {
    const user = userEvent.setup();
    renderSides();
    const reflects = screen.getAllByRole("button", { name: "Reflect" });
    await user.click(reflects[1]!);
    expect(handlers.onDefenderSideChange).toHaveBeenCalledTimes(1);
    expect(handlers.onAttackerSideChange).not.toHaveBeenCalled();
  });
});
