import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Mock @smogon/calc — these classes do real computation against bundled data
// that is unavailable in jsdom. We return stable fake objects so the component
// logic (sorting, capping, verdict labels) can be exercised without the engine.
const mockRange = jest.fn(() => [40, 60]);
const mockMaxHP = jest.fn(() => 200);
const mockDesc = jest.fn(() => "40 - 60 (40% - 60%) -- guaranteed 2HKO");
const mockCalculate = jest.fn(() => ({
  range: mockRange,
  desc: mockDesc,
  damage: [40, 60],
}));

jest.mock("@smogon/calc", () => {
  const MockPokemon = jest.fn(function (
    this: Record<string, unknown>,
    _gen: unknown,
    species: string
  ) {
    this.name = species;
    this.maxHP = mockMaxHP;
  });
  const MockMove = jest.fn(function (
    this: Record<string, unknown>,
    _gen: unknown,
    name: string
  ) {
    this.name = name;
  });
  const MockSide = jest.fn(function (this: Record<string, unknown>) {});
  const MockField = jest.fn(function (this: Record<string, unknown>) {});

  return {
    calculate: mockCalculate,
    Pokemon: MockPokemon,
    Move: MockMove,
    Side: MockSide,
    Field: MockField,
    Generations: {
      get: jest.fn(() => ({
        species: {
          get: jest.fn(() => ({ types: ["Fire"] })),
        },
      })),
    },
  };
});

jest.mock("@trainers/pokemon", () => ({
  getBaseStats: jest.fn(() => ({
    hp: 78,
    attack: 84,
    defense: 78,
    specialAttack: 109,
    specialDefense: 85,
    speed: 100,
  })),
  getValidAbilities: jest.fn(() => ["Blaze", "Solar Power"]),
  getValidNatures: jest.fn(() => ["Hardy", "Timid", "Adamant"]),
  getMoveData: jest.fn((name: string) => ({
    name,
    type: "Fire",
    category: "Special",
    basePower: 90,
    accuracy: 100,
    shortDesc: "A test move.",
  })),
  getAllItems: jest.fn(() => ["Sitrus Berry", "Leftovers"]),
  NATURE_EFFECTS: {
    Hardy: {},
    Timid: { boost: "speed", reduce: "attack" },
    Adamant: { boost: "attack", reduce: "specialAttack" },
  },
  ALL_TYPES: ["Fire", "Water", "Grass", "Normal"],
  getTypeColor: jest.fn(() => "#ff0000"),
  buildSpeciesSearchIndex: jest.fn(() => [
    { species: "Charizard" },
    { species: "Incineroar" },
    { species: "Landorus-Therian" },
  ]),
  calculateChampionsHP: jest.fn(() => 160),
  calculateChampionsStat: jest.fn(() => 100),
  getNatureMultiplier: jest.fn(() => 1.0),
  // Returns false for Landorus-Therian so legality tests have an illegal species.
  isLegalSpecies: jest.fn(
    (species: string, _formatId: string) => species !== "Landorus-Therian"
  ),
}));

jest.mock("lucide-react", () => {
  const mock = (name: string) => {
    const Icon = (props: Record<string, unknown>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy({}, { get: (_target, prop: string) => mock(prop) });
});

import { DamageCalcTab } from "../damage-calc-tab";
import { type TeamWithPokemon, type Tables } from "@trainers/supabase";

// =============================================================================
// Factories
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
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeTeam(
  teamPokemon: TeamWithPokemon["team_pokemon"] = []
): TeamWithPokemon {
  return {
    id: 1,
    alt_id: 10,
    name: "Test Team",
    format: "gen9vgc2026regi",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_public: false,
    description: null,
    fork_source_id: null,
    team_pokemon: teamPokemon,
  } as TeamWithPokemon;
}

const defaultFormat = {
  id: "gen9vgc2026regi",
  label: "SV: Reg I",
  generation: 9,
};

// =============================================================================
// Tests
// =============================================================================

describe("DamageCalcTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRange.mockReturnValue([40, 60]);
    mockMaxHP.mockReturnValue(200);
    mockDesc.mockReturnValue("40 - 60 (40% - 60%)");
    mockCalculate.mockReturnValue({
      range: mockRange,
      desc: mockDesc,
      damage: [40, 60],
    });
  });

  // ---------------------------------------------------------------------------
  // No attacker (selectedPokemon null) — scaffold render
  // ---------------------------------------------------------------------------

  describe("no Pokemon selected", () => {
    it("renders 'Pick an attacker to calculate.' in the result area", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      expect(
        screen.getByText("Pick an attacker to calculate.")
      ).toBeInTheDocument();
    });

    it("does not render the direction toggle when no Pokemon is selected", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      // Direction toggle buttons (with → arrow) only show when a Pokemon is selected
      const dirButtons = screen
        .queryAllByRole("button")
        .filter((b) => b.textContent?.includes("→"));
      expect(dirButtons.length).toBe(0);
    });

    it("renders the Moves section in a dimmed container (opacity-50)", () => {
      const { container } = render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      // The wrapper div around the moves card should have opacity-50
      const dimmedDiv = container.querySelector(".opacity-50");
      expect(dimmedDiv).not.toBeNull();
    });

    it("renders the Moves section header even without an attacker", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Moves")).toBeInTheDocument();
    });

    it("renders the Defender section while no attacker is selected", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Defender")).toBeInTheDocument();
    });

    it("renders the Field Conditions section while no attacker is selected", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      expect(screen.getByText(/field conditions/i)).toBeInTheDocument();
    });

    it("renders weather toggle buttons even without an attacker", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Rain")).toBeInTheDocument();
    });

    it("does not render old full-page 'select a pokemon' message", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      expect(
        screen.queryByText("Select a Pokémon to use the calculator")
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Happy path — Pokemon selected
  // ---------------------------------------------------------------------------

  describe("with a selected Pokemon", () => {
    it("shows the attacker species name in the direction toggle", () => {
      const pokemon = makePokemon({ species: "Charizard" });
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // The direction toggle shows attacker name
      expect(screen.getAllByText(/Charizard/).length).toBeGreaterThanOrEqual(1);
    });

    it("renders the offense direction toggle button", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // Direction toggle: "Charizard → Incineroar" for offense
      expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
    });

    it("renders the Moves section header", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Moves")).toBeInTheDocument();
    });

    it("renders the Defender section header", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Defender")).toBeInTheDocument();
    });

    it("renders Field Conditions section", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getByText(/field conditions/i)).toBeInTheDocument();
    });

    it("renders weather toggle buttons with all options", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Sun")).toBeInTheDocument();
      expect(screen.getByText("Rain")).toBeInTheDocument();
      expect(screen.getByText("Sand")).toBeInTheDocument();
      expect(screen.getByText("Snow")).toBeInTheDocument();
    });

    it("renders terrain toggle buttons with abbreviated labels", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // Terrain labels from TERRAIN_LABELS constant — "Grass" may also appear in
      // select option lists, so use getAllByText
      expect(screen.getByText("Elec")).toBeInTheDocument();
      expect(screen.getAllByText("Grass").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Misty")).toBeInTheDocument();
      expect(screen.getByText("Psych")).toBeInTheDocument();
    });

    it("renders Your Side and Their Side sections", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getByText(/your side/i)).toBeInTheDocument();
      expect(screen.getByText(/their side/i)).toBeInTheDocument();
    });

    it("renders Reflect chip in both sides", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getAllByText("Reflect").length).toBeGreaterThanOrEqual(2);
    });

    it("renders helping hand chip (abbreviated H.Hand)", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // The component uses abbreviated "H.Hand" not "Helping Hand"
      expect(screen.getAllByText("H.Hand").length).toBeGreaterThanOrEqual(1);
    });

    it("renders light screen chip (abbreviated L.Screen)", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // The component uses abbreviated "L.Screen" not "Light Screen"
      expect(screen.getAllByText("L.Screen").length).toBeGreaterThanOrEqual(1);
    });

    it("renders the move slots for the selected Pokemon", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // Move names appear in both move selector rows and result panel
      expect(screen.getAllByText("Flamethrower").length).toBeGreaterThanOrEqual(
        1
      );
      expect(screen.getAllByText("Air Slash").length).toBeGreaterThanOrEqual(1);
    });

    it("renders the Your Modifiers section", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Your Modifiers")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Verdict labels — based on calc output
  // ---------------------------------------------------------------------------

  describe("verdict labels from calc output", () => {
    it("shows OHKO verdict when min damage >= 100%", () => {
      // 200/200 = 100% — OHKO
      mockRange.mockReturnValue([200, 200]);
      mockMaxHP.mockReturnValue(200);
      mockCalculate.mockReturnValue({
        range: mockRange,
        desc: mockDesc,
        damage: [200, 200],
      });

      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getAllByText("OHKO").length).toBeGreaterThanOrEqual(1);
    });

    it("shows 2HKO verdict when max damage is 50-99%", () => {
      // 100/200 = 50%, 120/200 = 60% → 2HKO
      mockRange.mockReturnValue([100, 120]);
      mockMaxHP.mockReturnValue(200);
      mockCalculate.mockReturnValue({
        range: mockRange,
        desc: mockDesc,
        damage: [100, 120],
      });

      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getAllByText("2HKO").length).toBeGreaterThanOrEqual(1);
    });

    it("shows 3HKO verdict when max damage is 34-49%", () => {
      // 68/200 = 34%, 80/200 = 40% → 3HKO
      mockRange.mockReturnValue([68, 80]);
      mockMaxHP.mockReturnValue(200);
      mockCalculate.mockReturnValue({
        range: mockRange,
        desc: mockDesc,
        damage: [68, 80],
      });

      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getAllByText("3HKO").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("handles a Pokemon with no moves without crashing", () => {
      const pokemon = makePokemon({
        move1: null,
        move2: null,
        move3: null,
        move4: null,
      });
      expect(() =>
        render(
          <DamageCalcTab
            team={makeTeam()}
            selectedPokemon={pokemon}
            format={defaultFormat}
          />
        )
      ).not.toThrow();
    });

    it("handles maxHP returning 0 gracefully", () => {
      mockMaxHP.mockReturnValue(0);
      mockCalculate.mockReturnValue({
        range: mockRange,
        desc: mockDesc,
        damage: [40, 60],
      });

      const pokemon = makePokemon();
      expect(() =>
        render(
          <DamageCalcTab
            team={makeTeam()}
            selectedPokemon={pokemon}
            format={defaultFormat}
          />
        )
      ).not.toThrow();
    });

    it("handles calculate throwing an error gracefully", () => {
      mockCalculate.mockImplementation(() => {
        throw new Error("Unknown Pokemon");
      });

      const pokemon = makePokemon();
      expect(() =>
        render(
          <DamageCalcTab
            team={makeTeam()}
            selectedPokemon={pokemon}
            format={defaultFormat}
          />
        )
      ).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Field condition interactions
  // ---------------------------------------------------------------------------

  describe("field condition toggles", () => {
    it("toggles Reflect chip without crashing", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      const reflects = screen.getAllByText("Reflect");
      fireEvent.click(reflects[0]!);
      expect(reflects[0]).toBeInTheDocument();
    });

    it("toggles H.Hand chip without crashing", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      const helpingHands = screen.getAllByText("H.Hand");
      fireEvent.click(helpingHands[0]!);
      expect(helpingHands[0]).toBeInTheDocument();
    });

    it("toggles L.Screen chip without crashing", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      const lightScreens = screen.getAllByText("L.Screen");
      fireEvent.click(lightScreens[0]!);
      expect(lightScreens[0]).toBeInTheDocument();
    });

    it("toggles weather button without crashing", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      const sunButton = screen.getByText("Sun");
      await user.click(sunButton);
      expect(sunButton).toBeInTheDocument();
    });

    it("toggles terrain button without crashing", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      const elecButton = screen.getByText("Elec");
      await user.click(elecButton);
      expect(elecButton).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Direction toggle
  // ---------------------------------------------------------------------------

  describe("direction toggle", () => {
    it("switches direction when defense button is clicked", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon({ species: "Charizard" });
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // Both offense and defense toggle buttons are rendered
      const buttons = screen.getAllByRole("button");
      // The direction toggle has 2 buttons — find the one with defense text
      const directionButtons = buttons.filter((b) =>
        b.textContent?.includes("→")
      );
      expect(directionButtons.length).toBeGreaterThanOrEqual(2);
      await user.click(directionButtons[1]!);
      // Should not crash
      expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Format prop
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Defender species search legality
  // ---------------------------------------------------------------------------

  describe("damage calc — defender species search legality", () => {
    const championsFormat = {
      id: "championsvgc2026regma",
      label: "Champions VGC 2026 Reg MA",
      generation: 9,
    };

    it("dims illegal species in the search results and blocks selection", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon({ species: "Charizard" });

      render(
        <DamageCalcTab
          team={makeTeam([
            { sort_order: 0, pokemon },
          ] as TeamWithPokemon["team_pokemon"])}
          selectedPokemon={pokemon}
          format={championsFormat}
        />
      );

      // Open the defender species search by clicking the ▾ button
      const speciesButtons = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("title") === "Click to change species");
      // The defender InlineSpeciesSearch button is the last one (defender section)
      const defenderButton = speciesButtons[speciesButtons.length - 1]!;
      await user.click(defenderButton);

      // Use fireEvent.change to set the query — avoids async userEvent sequencing
      const input = screen.getByPlaceholderText("Search species…");
      fireEvent.change(input, { target: { value: "lando" } });

      // Landorus-Therian row should be present and disabled
      const landoButton = screen
        .getAllByRole("button", { hidden: true })
        .find((b) => b.textContent?.includes("Landorus-Therian"));
      expect(landoButton).toBeDefined();
      expect(landoButton).toBeDisabled();
      expect(landoButton).toHaveClass("opacity-50");

      // "Not legal" badge appears within that row
      expect(screen.getByText("Not legal")).toBeInTheDocument();

      // MouseDown on the disabled row does NOT select — search stays open
      if (landoButton) {
        fireEvent.mouseDown(landoButton);
      }
      // The search input should still be visible (Landorus-Therian was not selected)
      expect(
        screen.getByPlaceholderText("Search species…")
      ).toBeInTheDocument();
    });

    it("allows selection of a legal species", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon({ species: "Charizard" });

      render(
        <DamageCalcTab
          team={makeTeam([
            { sort_order: 0, pokemon },
          ] as TeamWithPokemon["team_pokemon"])}
          selectedPokemon={pokemon}
          format={championsFormat}
        />
      );

      // Open the defender species search
      const speciesButtons = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("title") === "Click to change species");
      const defenderButton = speciesButtons[speciesButtons.length - 1]!;
      await user.click(defenderButton);

      // Use fireEvent.change to set the query — avoids async userEvent sequencing
      const input = screen.getByPlaceholderText("Search species…");
      fireEvent.change(input, { target: { value: "incin" } });

      // Incineroar row should be present and enabled (legal)
      const incineroarButton = screen
        .getAllByRole("button")
        .find((b) => b.textContent?.includes("Incineroar"));
      expect(incineroarButton).toBeDefined();
      expect(incineroarButton).not.toBeDisabled();
      expect(incineroarButton).not.toHaveClass("opacity-50");

      // Click Incineroar — defender species should update (input closes)
      if (incineroarButton) {
        fireEvent.mouseDown(incineroarButton);
      }
      // The input should be closed (search mode exits on selection)
      expect(
        screen.queryByPlaceholderText("Search species…")
      ).not.toBeInTheDocument();
    });
  });

  it("renders correctly when format is undefined", () => {
    const pokemon = makePokemon();
    expect(() =>
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={undefined}
        />
      )
    ).not.toThrow();
  });

  it("renders SP mode for Champions format (generation 10)", () => {
    const pokemon = makePokemon();
    render(
      <DamageCalcTab
        team={makeTeam()}
        selectedPokemon={pokemon}
        format={{ id: "champions", label: "Champions", generation: 10 }}
      />
    );
    // SP mode shows "SP" column header in defender panel
    expect(screen.getByText("SP")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Move selector interactions
  // ---------------------------------------------------------------------------

  describe("move selector", () => {
    it("selects a different move when clicked", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon({
        move1: "Flamethrower",
        move2: "Air Slash",
        move3: null,
        move4: null,
      });
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // Move names appear in both move selector and result panel — click via row button
      const allAirSlash = screen.getAllByText("Air Slash");
      await user.click(allAirSlash[0]!);
      // Should not crash after selecting a move
      expect(screen.getAllByText("Air Slash").length).toBeGreaterThanOrEqual(1);
    });

    it("shows damage range for moves with calc output", () => {
      mockRange.mockReturnValue([40, 60]);
      mockMaxHP.mockReturnValue(200);
      mockCalculate.mockReturnValue({
        range: mockRange,
        desc: mockDesc,
        damage: [40, 60],
      });

      const pokemon = makePokemon({
        move1: "Flamethrower",
        move2: null,
        move3: null,
        move4: null,
      });
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // Damage range: 40/200*100=20, 60/200*100=30 — rendered as "20–30%"
      // The range span renders its text across child nodes so use a text content matcher
      const rangeSpans = screen.getAllByText(
        (_content, el) => el?.textContent?.replace(/\s+/g, "") === "20–30%"
      );
      expect(rangeSpans.length).toBeGreaterThanOrEqual(1);
    });
  });
});
