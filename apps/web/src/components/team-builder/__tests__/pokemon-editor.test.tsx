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
  getStatTier: jest.fn(() => "good"),
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
  getMoveHelperText: jest.fn(() => ""),
  getMoveHelperInput: jest.fn(() => null),
  getAllItems: jest.fn(() => ["Leftovers"]),
  getItemShortDesc: jest.fn(() => "Restores HP."),
  getAbilityShortDesc: jest.fn(() => "A test ability."),
  getLegalItems: jest.fn(() => undefined),
  getLegalMoves: jest.fn(() => undefined),
  getLegalTeraTypes: jest.fn(() => undefined),
  getLegalAbilities: jest.fn(() => undefined),
  // Gate Tera UI based on generation (9 = Scarlet & Violet, 10 = Champions).
  formatHasTera: jest.fn(
    (format: { generation?: number } | null | undefined) => {
      if (!format) return false;
      return format.generation === 9;
    }
  ),
  getMegaStoneForSpecies: jest.fn(() => null),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({
    url: "https://example.test/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
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

// next/image renders an <img> in tests so the EditorHeaderBand sprite alt
// remains queryable.
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    unoptimized: _unoptimized,
    priority: _priority,
    fill: _fill,
    loader: _loader,
    placeholder: _placeholder,
    ...rest
  }: Record<string, unknown>) => {
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
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

  // ---------------------------------------------------------------------------
  // Header band — composition smoke test
  // ---------------------------------------------------------------------------

  describe("header band", () => {
    it("renders sprite, species name, and the four loadout fields", () => {
      render(<PokemonEditor {...defaultProps} />);

      // Sprite is delegated to next/image and queryable by alt text.
      expect(screen.getByAltText("Incineroar")).toBeInTheDocument();
      // Species name in the identity column.
      expect(screen.getByText("Incineroar")).toBeInTheDocument();

      // All four loadout field labels render in the band.
      expect(screen.getByText("Ability")).toBeInTheDocument();
      expect(screen.getByText("Item")).toBeInTheDocument();
      expect(screen.getByText("Tera")).toBeInTheDocument();
      expect(screen.getByText("Nature")).toBeInTheDocument();

      // Current values flow through.
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
      expect(screen.getByText("None")).toBeInTheDocument(); // held_item
      expect(screen.getByText("Adamant")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Body — Moves section
  // ---------------------------------------------------------------------------

  describe("moves section", () => {
    it("renders a MoveRow per slot — 2 filled, 2 empty for the fixture", () => {
      render(<PokemonEditor {...defaultProps} />);

      // Filled rows render move names.
      expect(screen.getByText("Fake Out")).toBeInTheDocument();
      expect(screen.getByText("Flare Blitz")).toBeInTheDocument();

      // Empty slots render the MoveRow empty-slot affordance ("+ Add move")
      // — there are exactly two for this fixture.
      const emptySlots = screen.getAllByText("+ Add move");
      expect(emptySlots).toHaveLength(2);
    });

    it("shows the filled / 4 counter in the Moves section header", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("2 / 4")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Body — StatsTable
  // ---------------------------------------------------------------------------

  describe("stats section", () => {
    it("renders the StatsTable surface (Base / Points / Final headers)", () => {
      render(<PokemonEditor {...defaultProps} />);
      // StatsTable column headers — proves the new component is mounted.
      expect(screen.getByText("Base")).toBeInTheDocument();
      expect(screen.getByText("Points")).toBeInTheDocument();
      expect(screen.getByText("Final")).toBeInTheDocument();
    });

    it("renders the Stat Points label for Champions format", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          format={{ id: "champions", label: "Champions", generation: 10 }}
        />
      );
      expect(screen.getByText("Stat Points")).toBeInTheDocument();
    });

    it("does NOT render the legacy IVs editor (removed in stats-table refactor)", () => {
      render(<PokemonEditor {...defaultProps} />);
      // The legacy IvEditor exposed an "IVs" header — it should be gone now.
      expect(screen.queryByText("IVs")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Picker overlays — open/close round-trip
  // ---------------------------------------------------------------------------

  describe("picker overlays", () => {
    it("opens the ability picker when the ability field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /edit ability/i }));
      expect(
        screen.getByPlaceholderText("Search abilities…")
      ).toBeInTheDocument();
    });

    it("opens the nature picker when the nature field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /edit nature/i }));
      expect(
        screen.getByPlaceholderText("Search natures…")
      ).toBeInTheDocument();
    });

    it("opens the tera picker when the tera field is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /edit tera/i }));
      // TeraPicker renders type grid buttons.
      expect(screen.getByRole("button", { name: "Water" })).toBeInTheDocument();
    });

    it("opens the move picker when a move slot is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      await user.click(screen.getByText("Fake Out"));
      expect(screen.getByPlaceholderText("Search moves…")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Notes section
  // ---------------------------------------------------------------------------

  describe("notes section", () => {
    it("renders the Notes toggle button", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.getByText("Notes")).toBeInTheDocument();
    });

    it("hides the textarea by default", () => {
      render(<PokemonEditor {...defaultProps} />);
      expect(screen.queryByLabelText("Pokemon notes")).not.toBeInTheDocument();
    });

    it("reveals the textarea when the toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /notes/i }));
      expect(screen.getByLabelText("Pokemon notes")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Disabled state — cascades to header band, moves, stats, notes
  // ---------------------------------------------------------------------------

  describe("disabled prop", () => {
    it("renders header-band fields as static text (no edit buttons) when disabled", () => {
      render(<PokemonEditor {...defaultProps} disabled={true} />);
      // No FieldButtons for the four loadout fields when disabled.
      expect(
        screen.queryByRole("button", { name: /edit ability/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /edit item/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /edit tera/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /edit nature/i })
      ).not.toBeInTheDocument();
    });

    it("does NOT open the move picker when a move slot is clicked while disabled", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} disabled={true} />);
      await user.click(screen.getByText("Fake Out"));
      expect(
        screen.queryByPlaceholderText("Search moves…")
      ).not.toBeInTheDocument();
    });

    it("opens the move picker normally when disabled=false (regression)", async () => {
      const user = userEvent.setup();
      render(<PokemonEditor {...defaultProps} disabled={false} />);
      await user.click(screen.getByText("Fake Out"));
      expect(screen.getByPlaceholderText("Search moves…")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Tera field gating — Champions format hides all Tera UI
  // ---------------------------------------------------------------------------

  describe("Tera field gating (Champions format)", () => {
    const championsFormat = {
      id: "championsvgc2026regma",
      label: "Champions: Reg M-A",
      generation: 10,
    };

    it("does not render the Tera field in the header band for Champions format", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          format={
            championsFormat as Parameters<typeof PokemonEditor>[0]["format"]
          }
        />
      );
      // Tera label and button should be absent for Champions
      expect(screen.queryByText("Tera")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /edit tera/i })
      ).not.toBeInTheDocument();
    });

    it("does not open the TeraPicker overlay for Champions format when tera callback fires", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          format={
            championsFormat as Parameters<typeof PokemonEditor>[0]["format"]
          }
        />
      );
      // Since Tera field is hidden there's no way to trigger the picker —
      // confirm the type grid is not in the DOM at all.
      expect(
        screen.queryByRole("button", { name: "Water" })
      ).not.toBeInTheDocument();
    });

    it("still renders Ability, Item, and Nature fields for Champions format", () => {
      render(
        <PokemonEditor
          {...defaultProps}
          format={
            championsFormat as Parameters<typeof PokemonEditor>[0]["format"]
          }
        />
      );
      expect(screen.getByText("Ability")).toBeInTheDocument();
      expect(screen.getByText("Item")).toBeInTheDocument();
      expect(screen.getByText("Nature")).toBeInTheDocument();
    });
  });
});
