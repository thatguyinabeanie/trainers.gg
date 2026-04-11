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
      get: jest.fn(() => ({})),
    },
  };
});

// Mock meta-threats to keep the test fast (10 real threats × 4 moves each
// would run 40+ calculations per render in the AutoSuggestions component).
jest.mock("../meta-threats", () => ({
  GEN9_VGC_META_THREATS: [
    {
      species: "Incineroar",
      ability: "Intimidate",
      nature: "Careful",
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
      moves: ["Fake Out", "Flare Blitz"],
    },
    {
      species: "Flutter Mane",
      ability: "Protosynthesis",
      nature: "Timid",
      evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
      moves: ["Moonblast", "Shadow Ball"],
    },
  ],
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
    // Default: calculations produce meaningful (non-zero) damage ranges
    mockRange.mockReturnValue([40, 60]);
    mockMaxHP.mockReturnValue(200);
    mockDesc.mockReturnValue("40 - 60 (40% - 60%)");
    mockCalculate.mockReturnValue({ range: mockRange, desc: mockDesc });
  });

  // ---------------------------------------------------------------------------
  // Empty state — no Pokemon selected
  // ---------------------------------------------------------------------------

  describe("no Pokemon selected", () => {
    it("renders the 'select a Pokemon' prompt", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      expect(
        screen.getByText("Select a Pokémon to see damage calculations")
      ).toBeInTheDocument();
    });

    it("does not render calc sections when no Pokemon is selected", () => {
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={null}
          format={defaultFormat}
        />
      );
      expect(screen.queryByText(/attacks/i)).not.toBeInTheDocument();
      expect(screen.queryByText("Manual Calc")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Happy path — Pokemon selected
  // ---------------------------------------------------------------------------

  describe("with a selected Pokemon", () => {
    it("shows the species name in the header", () => {
      const pokemon = makePokemon({ species: "Charizard" });
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Charizard")).toBeInTheDocument();
    });

    it("shows the 'Manual Calc' toggle button", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(
        screen.getByRole("button", { name: /manual calc/i })
      ).toBeInTheDocument();
    });

    it("renders the AutoSuggestions sections (attacks and taking hits)", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // Section headings are uppercase via CSS but text content is plain
      expect(screen.getByText(/attacks/i)).toBeInTheDocument();
      expect(screen.getByText(/taking hits/i)).toBeInTheDocument();
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

    it("renders weather toggle group with all options", () => {
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

    it("renders terrain toggle group with all options", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // Terrain names are sliced to 4 chars: Elec, Gras, Psyc, Mist
      expect(screen.getByText("Elec")).toBeInTheDocument();
      expect(screen.getByText("Gras")).toBeInTheDocument();
      expect(screen.getByText("Psyc")).toBeInTheDocument();
      expect(screen.getByText("Mist")).toBeInTheDocument();
    });

    it("renders Light Screen, Reflect, and Helping Hand checkboxes", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getByText("Light Screen")).toBeInTheDocument();
      expect(screen.getByText("Reflect")).toBeInTheDocument();
      expect(screen.getByText("Helping Hand")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Manual Calc form
  // ---------------------------------------------------------------------------

  describe("Manual Calc form", () => {
    it("is hidden by default", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.queryByText(/manual calc/i)).toBeInTheDocument();
      // The form itself has three labeled inputs; they should be hidden
      expect(
        screen.queryByPlaceholderText("e.g. Charizard")
      ).not.toBeInTheDocument();
    });

    it("opens the Manual Calc form when the toggle button is clicked", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      await user.click(screen.getByRole("button", { name: /manual calc/i }));
      expect(screen.getByPlaceholderText("e.g. Charizard")).toBeInTheDocument();
    });

    it("toggles button label to 'Close' when form is open", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      await user.click(screen.getByRole("button", { name: /manual calc/i }));
      expect(
        screen.getByRole("button", { name: /close/i })
      ).toBeInTheDocument();
    });

    it("closes the form when 'Close' button is clicked", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      await user.click(screen.getByRole("button", { name: /manual calc/i }));
      await user.click(screen.getByRole("button", { name: /close/i }));
      expect(
        screen.queryByPlaceholderText("e.g. Charizard")
      ).not.toBeInTheDocument();
    });

    it("renders Attacker, Move, and Defender inputs when open", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      await user.click(screen.getByRole("button", { name: /manual calc/i }));
      expect(screen.getByPlaceholderText("e.g. Charizard")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("e.g. Flamethrower")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g. Kingambit")).toBeInTheDocument();
    });

    it("renders the Calculate button inside the form", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      await user.click(screen.getByRole("button", { name: /manual calc/i }));
      expect(
        screen.getByRole("button", { name: /calculate/i })
      ).toBeInTheDocument();
    });

    it("does not run a calculation when fields are empty", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      await user.click(screen.getByRole("button", { name: /manual calc/i }));
      // Clear count of calls so far from AutoSuggestions render
      mockCalculate.mockClear();
      await user.click(screen.getByRole("button", { name: /calculate/i }));
      // calculate() should NOT be called with empty inputs
      expect(mockCalculate).not.toHaveBeenCalled();
    });

    it("runs a calculation and displays a result row when all inputs are filled", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      await user.click(screen.getByRole("button", { name: /manual calc/i }));

      await user.type(
        screen.getByPlaceholderText("e.g. Charizard"),
        "Charizard"
      );
      await user.type(
        screen.getByPlaceholderText("e.g. Flamethrower"),
        "Flamethrower"
      );
      await user.type(
        screen.getByPlaceholderText("e.g. Kingambit"),
        "Kingambit"
      );

      mockCalculate.mockClear();
      await user.click(screen.getByRole("button", { name: /calculate/i }));

      expect(mockCalculate).toHaveBeenCalledTimes(1);
      // The damage percent range (20.0–30.0%) should be displayed.
      // 40/200 * 100 = 20.0, 60/200 * 100 = 30.0
      // The span renders its text across child nodes, so use a function matcher.
      const rangeSpans = screen.getAllByText((_content, el) => {
        return el?.textContent === "20–30%";
      });
      expect(rangeSpans.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // DamageBar verdict labels — tested via AutoSuggestions (rendered on mount)
  // ---------------------------------------------------------------------------

  describe("DamageBar verdict labels", () => {
    it("shows OHKO verdict when min damage >= 100%", () => {
      // 200/200 = 100% — OHKO
      mockRange.mockReturnValue([200, 200]);
      mockMaxHP.mockReturnValue(200);

      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      // AutoSuggestions renders CalcRows with the verdict label
      expect(screen.getAllByText("OHKO").length).toBeGreaterThanOrEqual(1);
    });

    it("shows roll verdict when only max damage >= 100%", () => {
      // min 180/200 = 90%, max 210/200 = 105% → roll
      mockRange.mockReturnValue([180, 210]);
      mockMaxHP.mockReturnValue(200);

      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      expect(screen.getAllByText("roll").length).toBeGreaterThanOrEqual(1);
    });

    it("shows 2HKO verdict when max damage is 50-99%", () => {
      // 100/200 = 50%, 120/200 = 60% → 2HKO
      mockRange.mockReturnValue([100, 120]);
      mockMaxHP.mockReturnValue(200);

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

    it("shows 3HKO verdict when max damage is 33-49%", () => {
      // 66/200 = 33%, 80/200 = 40% → 3HKO
      mockRange.mockReturnValue([66, 80]);
      mockMaxHP.mockReturnValue(200);

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
  // AutoSuggestions edge cases
  // ---------------------------------------------------------------------------

  describe("AutoSuggestions edge cases", () => {
    it("shows 'No damage calcs available' when all calculations return 0% damage", () => {
      // maxPercent = 0 → filtered out
      mockRange.mockReturnValue([0, 0]);
      mockMaxHP.mockReturnValue(200);

      const pokemon = makePokemon({
        move1: "Splash",
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
      expect(screen.getAllByText("No damage calcs available")).toHaveLength(2); // one for offensive, one for defensive
    });

    it("shows a failed calculation notice when calculate throws", () => {
      mockCalculate.mockImplementation(() => {
        throw new Error("Unknown Pokemon");
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
      // The component counts failed calcs and renders a notice
      expect(
        screen.getByText(/calculation.*could not be computed/i)
      ).toBeInTheDocument();
    });

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

    it("handles null maxHP (returns null from runCalc) gracefully", () => {
      mockMaxHP.mockReturnValue(0);

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
  // Field controls
  // ---------------------------------------------------------------------------

  describe("field condition checkboxes", () => {
    // Base UI Checkbox renders a <button> element, not a native checkbox.
    // Click via the label <span> that is inside the <label> wrapper.
    it("toggles Light Screen checkbox without crashing", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      const label = screen.getByText("Light Screen");
      fireEvent.click(label);
      expect(label).toBeInTheDocument();
    });

    it("toggles Reflect checkbox without crashing", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      const label = screen.getByText("Reflect");
      fireEvent.click(label);
      expect(label).toBeInTheDocument();
    });

    it("toggles Helping Hand checkbox without crashing", () => {
      const pokemon = makePokemon();
      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );
      const label = screen.getByText("Helping Hand");
      fireEvent.click(label);
      expect(label).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Manual Calc error handling
  // ---------------------------------------------------------------------------

  describe("Manual Calc error handling", () => {
    it("does not show an error message before Calculate is clicked", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();

      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );

      await user.click(screen.getByRole("button", { name: /manual calc/i }));
      // Before clicking Calculate, no error text should be visible
      expect(
        screen.queryByText("Calculation failed — check your inputs")
      ).not.toBeInTheDocument();
    });

    it("does not display a result row before Calculate is clicked", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon();

      render(
        <DamageCalcTab
          team={makeTeam()}
          selectedPokemon={pokemon}
          format={defaultFormat}
        />
      );

      await user.click(screen.getByRole("button", { name: /manual calc/i }));
      await user.type(
        screen.getByPlaceholderText("e.g. Charizard"),
        "Charizard"
      );
      // Only the attacker input is filled — no result row yet
      expect(screen.queryByText(/calculation failed/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // format prop is optional
  // ---------------------------------------------------------------------------

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
});
