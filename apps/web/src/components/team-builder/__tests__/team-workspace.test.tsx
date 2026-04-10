import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
  } & Record<string, unknown>) => <img src={src} alt={alt} {...rest} />,
}));

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
  getValidAbilities: jest.fn(() => ["Intimidate"]),
  getLearnableMoves: jest.fn(() => ["Fake Out", "Flare Blitz"]),
  getValidNatures: jest.fn(() => ["Adamant", "Jolly"]),
  getValidTeraTypes: jest.fn(() => ["Fire", "Water"]),
  calculateStat: jest.fn(() => 150),
  calculateHP: jest.fn(() => 200),
  getNatureMultiplier: jest.fn(() => 1.0),
  calculateNatureBumps: jest.fn(() => [0, 40, 80]),
  buildSpeciesSearchIndex: jest.fn(() => []),
  searchSpecies: jest.fn(() => []),
  NATURE_EFFECTS: {
    Adamant: { boost: "attack", reduce: "specialAttack" },
  },
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({
    url: "https://example.com/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
}));

jest.mock("@pkmn/dex", () => ({
  Dex: {
    forGen: jest.fn(() => ({
      abilities: {
        get: jest.fn(() => ({ exists: true, shortDesc: "A test ability." })),
      },
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
        get: jest.fn(() => ({ exists: true, shortDesc: "Restores HP." })),
      },
    })),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/actions/teams", () => ({
  updatePokemonAction: jest.fn().mockResolvedValue({ success: true }),
  addPokemonToTeamAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: { pokemonId: 99 } }),
  reorderTeamPokemonAction: jest.fn().mockResolvedValue({ success: true }),
  removePokemonFromTeamAction: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock the tab components to avoid rendering their full implementations
jest.mock("../type-coverage-tab", () => ({
  TypeCoverageTab: () => (
    <div data-testid="type-coverage-tab">Type coverage content</div>
  ),
}));
jest.mock("../speed-tier-tab", () => ({
  SpeedTierTab: () => (
    <div data-testid="speed-tier-tab">Speed tier content</div>
  ),
}));
jest.mock("../damage-calc-tab", () => ({
  DamageCalcTab: () => (
    <div data-testid="damage-calc-tab">Damage calc content</div>
  ),
}));
jest.mock("../species-picker", () => ({
  SpeciesPicker: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="species-picker">
      <button onClick={onCancel}>Cancel</button>
    </div>
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

import { TeamWorkspace } from "../team-workspace";
import { type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Factories
// =============================================================================

function makePokemonEntry(
  id: number,
  position: number,
  species = "Incineroar"
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    team_id: 1,
    pokemon_id: id,
    team_position: position,
    pokemon: {
      id,
      species,
      is_shiny: false,
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
    },
  } as TeamWithPokemon["team_pokemon"][number];
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

const defaultProps = {
  handle: "ash_ketchum",
  format: { id: "gen9vgc2026regi", label: "SV: Reg I", generation: 9 },
};

// =============================================================================
// Tests
// =============================================================================

describe("TeamWorkspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("empty state", () => {
    it("shows empty state message when no pokemon exist", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      expect(screen.getByText("No Pokémon yet")).toBeInTheDocument();
    });

    it("shows import paste suggestion in empty state", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      expect(
        screen.getByText(
          "Import a Showdown paste or add Pokémon one by one to get started."
        )
      ).toBeInTheDocument();
    });

    it("shows Import Paste button in empty state", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      expect(
        screen.getByRole("button", { name: /import paste/i })
      ).toBeInTheDocument();
    });

    it("renders the team strip even with no pokemon", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      const strip = screen.getByLabelText("Team strip");
      expect(strip).toBeInTheDocument();
    });
  });

  describe("with pokemon", () => {
    it("renders the team strip when pokemon exist", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      // Team strip is a div with aria-label
      const strip = screen.getByLabelText("Team strip");
      expect(strip).toBeInTheDocument();
    });

    it("renders the first pokemon's editor by default", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      // The species name appears in both the strip chip and the editor header;
      // verify the editor header button (has the ▾ arrow indicator)
      const editorHeader = screen.getAllByText("Incineroar");
      expect(editorHeader.length).toBeGreaterThanOrEqual(2);
    });

    it("renders context panel with tab headers", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      expect(screen.getByRole("tab", { name: "Types" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Speed" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Calc" })).toBeInTheDocument();
    });

    it("shows 'Select a Pokémon to edit' when no pokemon is selected (no pokemon in strip entry with pokemon)", () => {
      // This case happens when the selected entry's pokemon is null
      const team: TeamWithPokemon = {
        ...makeTeam([]),
        team_pokemon: [
          {
            id: 1,
            team_id: 1,
            pokemon_id: null,
            team_position: 1,
            pokemon: null,
          } as unknown as TeamWithPokemon["team_pokemon"][number],
        ],
      };
      render(<TeamWorkspace {...defaultProps} team={team} />);
      expect(screen.getByText("Select a Pokémon to edit")).toBeInTheDocument();
    });
  });

  describe("context panel tab switching", () => {
    it("switches to Speed tab when clicked", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      await user.click(screen.getByRole("tab", { name: "Speed" }));
      expect(screen.getByTestId("speed-tier-tab")).toBeInTheDocument();
    });

    it("switches to Calc tab when clicked", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      await user.click(screen.getByRole("tab", { name: "Calc" }));
      expect(screen.getByTestId("damage-calc-tab")).toBeInTheDocument();
    });
  });
});
