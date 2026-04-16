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
  calculateChampionsHP: jest.fn(() => 200),
  calculateChampionsStat: jest.fn(() => 150),
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

// PokemonEditor no longer accepts teamId, onSpeciesClick, or onImport.
const defaultProps = {
  pokemon: makePokemon(),
  format: { id: "gen9vgc2026regi", label: "SV: Reg I", generation: 9 },
  teamPokemon: [{ pokemon: makePokemon() }],
  onUpdate: jest.fn(),
};

// =============================================================================
// Tests
// =============================================================================

describe("PokemonEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      // "Fire" appears as tera type value
      expect(screen.getAllByText("Fire").length).toBeGreaterThanOrEqual(1);
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

  // ---------------------------------------------------------------------------
  // disabled prop
  // ---------------------------------------------------------------------------

  describe("disabled prop", () => {
    it("does NOT open ability picker when disabled=true and ability field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} disabled={true} />);
      // Clicking on the ability value should not open the picker
      await user.click(screen.getByText("Intimidate"));
      expect(
        screen.queryByPlaceholderText("Search abilities…")
      ).not.toBeInTheDocument();
    });

    it("does NOT open nature picker when disabled=true and nature field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} disabled={true} />);
      await user.click(screen.getByText("Adamant"));
      expect(
        screen.queryByPlaceholderText("Search natures…")
      ).not.toBeInTheDocument();
    });

    it("does NOT open tera picker when disabled=true and tera field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} disabled={true} />);
      // The tera section button is pointer-events-none so clicks on it should not fire
      // Verify tera picker (which renders type grid buttons like Water) is absent
      const teraSection = screen.getByText("Tera Type").closest("div");
      const teraFieldButton = teraSection?.querySelector("button");
      if (teraFieldButton) {
        await user.click(teraFieldButton);
      }
      expect(
        screen.queryByRole("button", { name: "Water" })
      ).not.toBeInTheDocument();
    });

    it("does NOT open move picker when disabled=true and a move slot is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} disabled={true} />);
      await user.click(screen.getByText("Fake Out"));
      expect(
        screen.queryByPlaceholderText("Search moves…")
      ).not.toBeInTheDocument();
    });

    it("opens ability picker normally when disabled=false (regression)", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} disabled={false} />);
      await user.click(screen.getByText("Intimidate"));
      expect(
        screen.getByPlaceholderText("Search abilities…")
      ).toBeInTheDocument();
    });

    it("opens move picker normally when disabled=false (regression)", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} disabled={false} />);
      await user.click(screen.getByText("Fake Out"));
      expect(screen.getByPlaceholderText("Search moves…")).toBeInTheDocument();
    });

    it("preset EV buttons are disabled when disabled=true", () => {
      render(<PokemonEditor {...defaultProps} disabled={true} />);
      expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
    });

    it("all IV inputs are disabled when disabled=true", () => {
      render(<PokemonEditor {...defaultProps} disabled={true} />);
      // IvEditor renders spinbuttons for each stat — all should be disabled
      const inputs = screen.getAllByRole("spinbutton");
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe("format-specific behavior", () => {
    it("hides the IV editor for champions format", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          format={{ id: "champions", label: "Champions", generation: 10 }}
        />
      );
      // IvEditor renders "IVs" header
      expect(screen.queryByText("IVs")).not.toBeInTheDocument();
    });

    it("shows the IV editor for non-champions formats", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("IVs")).toBeInTheDocument();
    });

    it("shows Stat Points label for champions format", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          format={{ id: "champions", label: "Champions", generation: 10 }}
        />
      );
      expect(screen.getByText("Stat Points")).toBeInTheDocument();
    });
  });
});
