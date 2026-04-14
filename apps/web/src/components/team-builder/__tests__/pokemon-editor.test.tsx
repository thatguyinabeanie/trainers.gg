import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getBaseStats: jest.fn(() => ({
    hp: 95,
    attack: 115,
    defense: 90,
    specialAttack: 80,
    specialDefense: 90,
    speed: 60,
  })),
  getSpeciesTypes: jest.fn(() => ["Fire", "Dark"]),
  getValidAbilities: jest.fn(() => ["Intimidate", "Flash Fire"]),
  getLearnableMoves: jest.fn(() => [
    "Fake Out",
    "Flare Blitz",
    "Knock Off",
    "U-turn",
  ]),
  getValidNatures: jest.fn(() => ["Adamant", "Jolly", "Hardy"]),
  getValidTeraTypes: jest.fn(() => ["Fire", "Water", "Normal"]),
  calculateStat: jest.fn(() => 150),
  calculateHP: jest.fn(() => 200),
  getNatureMultiplier: jest.fn(() => 1.0),
  calculateNatureBumps: jest.fn(() => [0, 40, 80, 120, 160, 200, 240]),
  NATURE_EFFECTS: {
    Adamant: { boost: "attack", reduce: "specialAttack" },
    Jolly: { boost: "speed", reduce: "specialAttack" },
    Hardy: {},
  },
  getMoveData: jest.fn((name: string) => ({
    name,
    type: "Normal",
    category: "Physical",
    basePower: 80,
    accuracy: 100,
    shortDesc: "A test move.",
  })),
  getAllItems: jest.fn(() => ["Leftovers"]),
  getItemShortDesc: jest.fn(() => "Restores HP."),
  getAbilityShortDesc: jest.fn(() => "A test ability."),
}));

jest.mock("@pkmn/dex", () => ({
  Dex: {
    forGen: jest.fn(() => ({
      moves: {
        get: jest.fn((name: string) => ({
          exists: true,
          name,
          type: "Normal",
          category: "Physical",
          basePower: 80,
          accuracy: 100,
          shortDesc: "A test move.",
        })),
      },
      items: {
        all: jest.fn(() => [
          { exists: true, name: "Leftovers", shortDesc: "Restores HP." },
        ]),
        get: jest.fn(() => ({
          exists: true,
          shortDesc: "Restores HP.",
        })),
      },
    })),
  },
}));

// Mock pokemon-import-export to avoid pulling in next/cache via @/actions/teams
jest.mock("../pokemon-import-export", () => ({
  PokemonImportExport: () => null,
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

import { PokemonEditor } from "../pokemon-editor";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Factories
// =============================================================================

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Incineroar",
    ability: "Intimidate",
    nature: "Adamant",
    held_item: null,
    nickname: null,
    gender: null,
    level: 50,
    move1: "Fake Out",
    move2: "Flare Blitz",
    move3: null,
    move4: null,
    tera_type: "Fire",
    is_shiny: false,
    ev_hp: 0,
    ev_attack: 252,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 4,
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

const defaultProps = {
  teamId: 1,
  pokemon: makePokemon(),
  format: { id: "gen9vgc2026regi", label: "SV: Reg I", generation: 9 },
  teamPokemon: [{ pokemon: makePokemon() }],
  onUpdate: jest.fn(),
  onSpeciesClick: jest.fn(),
  onImport: jest.fn(),
};

// =============================================================================
// Tests
// =============================================================================

describe("PokemonEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("species header", () => {
    it("renders the pokemon species name", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Incineroar")).toBeInTheDocument();
    });

    it("renders type pills for the species", () => {
      render(<PokemonEditor {...defaultProps} />);
      // getSpeciesTypes mocked to return ["Fire", "Dark"]
      // "Fire" may appear multiple times (type pill + tera type), use getAllByText
      expect(screen.getAllByText("Fire").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Dark")).toBeInTheDocument();
    });

    it("renders the level input with current value", () => {
      render(<PokemonEditor {...defaultProps} />);
      const levelInput = screen.getByLabelText("Pokemon level");
      expect(levelInput).toHaveValue(50);
    });

    it("calls onSpeciesClick when species name button is clicked", async () => {
      const user = userEvent.setup();
      const onSpeciesClick = jest.fn();
      render(
        <PokemonEditor {...defaultProps} onSpeciesClick={onSpeciesClick} />
      );
      await user.click(screen.getByText("Incineroar"));
      expect(onSpeciesClick).toHaveBeenCalled();
    });
  });

  describe("field display labels", () => {
    it("renders Ability label", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Ability")).toBeInTheDocument();
    });

    it("renders Held Item label", () => {
      render(<PokemonEditor {...defaultProps} />);
      // The field label is "Item" (uppercase, abbreviated) in the new layout
      expect(screen.getByText("Item")).toBeInTheDocument();
    });

    it("renders Nature label", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Nature")).toBeInTheDocument();
    });

    it("renders Tera Type label", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Tera Type")).toBeInTheDocument();
    });

    it("renders Moves label", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Moves")).toBeInTheDocument();
    });

    it("renders EVs label", () => {
      render(<PokemonEditor {...defaultProps} />);
      // "EVs" appears as both a section header and column header
      expect(screen.getAllByText("EVs").length).toBeGreaterThanOrEqual(1);
    });

    it("renders IVs label", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("IVs")).toBeInTheDocument();
    });
  });

  describe("current field values", () => {
    it("displays current ability value", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
    });

    it("displays None when no held item is set", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("None")).toBeInTheDocument();
    });

    it("displays current nature value", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Adamant")).toBeInTheDocument();
    });

    it("displays current tera type value", () => {
      render(<PokemonEditor {...defaultProps} />);
      // "Fire" appears as both the type pill and the tera type value
      expect(screen.getAllByText("Fire").length).toBeGreaterThanOrEqual(2);
    });

    it("displays current moves in move slots", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Fake Out")).toBeInTheDocument();
      expect(screen.getByText("Flare Blitz")).toBeInTheDocument();
    });

    it("displays Move N placeholder for empty slots", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Move 3")).toBeInTheDocument();
      expect(screen.getByText("Move 4")).toBeInTheDocument();
    });
  });

  describe("picker open/close", () => {
    it("opens ability picker when ability field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      await user.click(screen.getByText("Intimidate"));
      // AbilityPicker renders the search input
      expect(
        screen.getByPlaceholderText("Search abilities…")
      ).toBeInTheDocument();
    });

    it("opens nature picker when nature field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      await user.click(screen.getByText("Adamant"));
      expect(
        screen.getByPlaceholderText("Search natures…")
      ).toBeInTheDocument();
    });

    it("opens tera picker when tera type field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      // Find the button next to the "Tera Type" label
      const teraSection = screen.getByText("Tera Type").closest("div");
      const teraFieldButton = teraSection?.querySelector("button");
      if (teraFieldButton) {
        await user.click(teraFieldButton);
      }
      // TeraPicker renders type grid buttons
      expect(screen.getByRole("button", { name: "Water" })).toBeInTheDocument();
    });

    it("opens move picker when a move slot is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      await user.click(screen.getByText("Fake Out"));
      // MovePicker renders the search input
      expect(screen.getByPlaceholderText("Search moves…")).toBeInTheDocument();
    });
  });

  describe("Notes section", () => {
    it("renders the Notes toggle button", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Notes")).toBeInTheDocument();
    });

    it("notes textarea is hidden by default", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.queryByLabelText("Pokemon notes")).not.toBeInTheDocument();
    });

    it("reveals notes textarea when Notes toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      const notesButton = screen.getByRole("button", { name: /notes/i });
      await user.click(notesButton);
      expect(screen.getByLabelText("Pokemon notes")).toBeInTheDocument();
    });
  });

  describe("optional fields", () => {
    it("renders the nickname input", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByLabelText("Pokemon nickname")).toBeInTheDocument();
    });

    it("renders shiny toggle button", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Toggle shiny" })
      ).toBeInTheDocument();
    });

    it("calls onUpdate with is_shiny true when shiny button is clicked", async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();
      render(
        <PokemonEditor
          {...defaultProps}
          pokemon={makePokemon({ is_shiny: false })}
          onUpdate={onUpdate}
        />
      );
      await user.click(screen.getByRole("button", { name: "Toggle shiny" }));
      expect(onUpdate).toHaveBeenCalledWith("is_shiny", true);
    });

    it("shows gender buttons when pokemon has gender", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          pokemon={makePokemon({ gender: "Male" })}
        />
      );
      expect(screen.getByText("♂")).toBeInTheDocument();
      expect(screen.getByText("♀")).toBeInTheDocument();
    });

    it("hides gender buttons when pokemon gender is null", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          pokemon={makePokemon({ gender: null })}
        />
      );
      expect(screen.queryByText("♂")).not.toBeInTheDocument();
    });
  });

  describe("format-specific behavior", () => {
    it("hides the IV editor for champions format", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          format={{ id: "champions", label: "Champions", generation: 9 }}
        />
      );
      // IvEditor renders "IVs" header
      expect(screen.queryByText("IVs")).not.toBeInTheDocument();
    });

    it("shows the IV editor for non-champions formats", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("IVs")).toBeInTheDocument();
    });
  });

  describe("level input", () => {
    it("calls onUpdate with clamped level value on change", async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();
      render(<PokemonEditor {...defaultProps} onUpdate={onUpdate} />);
      const levelInput = screen.getByLabelText("Pokemon level");
      await user.clear(levelInput);
      await user.type(levelInput, "75");
      expect(onUpdate).toHaveBeenCalledWith("level", expect.any(Number));
    });
  });
});
