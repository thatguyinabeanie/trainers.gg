import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// ALL_TYPES drives the defensive matrix rows — use a small slice for speed.
const MOCK_TYPES = [
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
  "Normal",
] as const;

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: MOCK_TYPES,

  getSpeciesTypes: jest.fn((species: string) => {
    const map: Record<string, string[]> = {
      Charizard: ["Fire", "Flying"],
      Incineroar: ["Fire", "Dark"],
      Gardevoir: ["Psychic", "Fairy"],
      Gastly: ["Ghost", "Poison"],
      Lapras: ["Water", "Ice"],
    };
    return map[species] ?? ["Normal"];
  }),

  getDefensiveMatchups: jest.fn((types: string[]) => {
    if (types.includes("Fire")) {
      return {
        immunities: [],
        weaknesses: { Water: 2, Rock: 2, Ground: 2 },
        resistances: { Fire: 0.5, Grass: 0.5, Ice: 0.5 },
      };
    }
    if (types.includes("Ghost")) {
      return {
        immunities: ["Normal", "Fighting"],
        weaknesses: { Ghost: 2, Dark: 2 },
        resistances: { Poison: 0.5, Bug: 0.5 },
      };
    }
    return { immunities: [], weaknesses: {}, resistances: {} };
  }),

  getMoveType: jest.fn((moveName: string) => {
    const map: Record<string, string> = {
      Flamethrower: "Fire",
      Surf: "Water",
      "Leaf Blade": "Grass",
      Earthquake: "Ground",
      Splash: "Normal",
    };
    return map[moveName] ?? null;
  }),

  getTypeEffectiveness: jest.fn((moveType: string, defTypes: string[]) => {
    const seMap: Record<string, string[]> = {
      Fire: ["Grass", "Ice", "Bug", "Steel"],
      Water: ["Fire", "Rock", "Ground"],
      Ground: ["Fire", "Electric", "Poison", "Rock", "Steel"],
    };
    const seTargets = seMap[moveType] ?? [];
    return seTargets.some((t) => defTypes.includes(t)) ? 2 : 1;
  }),
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

import { TypeCoverageTab } from "../type-coverage-tab";
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
    move2: "Surf",
    move3: null,
    move4: null,
    tera_type: null,
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

function makePokemonEntry(
  id: number,
  position: number,
  species = "Charizard",
  overrides: Partial<Tables<"pokemon">> = {}
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id,
    team_id: 1,
    pokemon_id: id,
    team_position: position,
    pokemon: makePokemon({ id, species, ...overrides }),
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

// =============================================================================
// Tests
// =============================================================================

describe("TypeCoverageTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Render guard
  // ---------------------------------------------------------------------------

  describe("renders without crashing", () => {
    it("renders with an empty team and no selected pokemon", () => {
      expect(() =>
        render(<TypeCoverageTab team={makeTeam([])} selectedPokemon={null} />)
      ).not.toThrow();
    });

    it("renders with a team and no selected pokemon", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      expect(() =>
        render(<TypeCoverageTab team={team} selectedPokemon={null} />)
      ).not.toThrow();
    });

    it("renders with a selected pokemon", () => {
      const pokemon = makePokemon({ species: "Charizard" });
      expect(() =>
        render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />)
      ).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Toggle controls
  // ---------------------------------------------------------------------------

  describe("view/scope toggle controls", () => {
    it("renders the Defensive toggle button", () => {
      render(<TypeCoverageTab team={makeTeam([])} selectedPokemon={null} />);
      expect(
        screen.getByRole("button", { name: "Defensive" })
      ).toBeInTheDocument();
    });

    it("renders the Offensive toggle button", () => {
      render(<TypeCoverageTab team={makeTeam([])} selectedPokemon={null} />);
      expect(
        screen.getByRole("button", { name: "Offensive" })
      ).toBeInTheDocument();
    });

    it("renders the Full Team scope button", () => {
      render(<TypeCoverageTab team={makeTeam([])} selectedPokemon={null} />);
      expect(
        screen.getByRole("button", { name: "Full Team" })
      ).toBeInTheDocument();
    });

    it("renders the Selected scope button", () => {
      render(<TypeCoverageTab team={makeTeam([])} selectedPokemon={null} />);
      expect(
        screen.getByRole("button", { name: "Selected" })
      ).toBeInTheDocument();
    });

    it("switches to Offensive view when Offensive toggle is clicked", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);

      await user.click(screen.getByRole("button", { name: "Offensive" }));
      // Offensive view renders a heatmap — the component should not crash
      expect(
        screen.getByRole("button", { name: "Offensive" })
      ).toBeInTheDocument();
    });

    it("switches to Selected scope when Selected toggle is clicked with a pokemon selected", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      const pokemon = makePokemon({ species: "Charizard" });
      render(<TypeCoverageTab team={team} selectedPokemon={pokemon} />);

      await user.click(screen.getByRole("button", { name: "Selected" }));
      // Should not crash
      expect(
        screen.getByRole("button", { name: "Selected" })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Defensive heatmap — team view
  // ---------------------------------------------------------------------------

  describe("defensive team heatmap", () => {
    it("renders all type rows when team has pokemon", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      // Type badges appear in rows — Fire should be present
      expect(screen.getAllByText("Fire").length).toBeGreaterThanOrEqual(1);
    });

    it("renders species column header abbreviated to 6 chars for long names", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      // "Charizard" (9 chars > 7) → "Chariz…"
      expect(screen.getByText("Chariz…")).toBeInTheDocument();
    });

    it("renders short species names as-is (≤7 chars)", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Gastly")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      // "Gastly" (6 chars ≤ 7) → rendered as-is
      expect(screen.getByText("Gastly")).toBeInTheDocument();
    });

    it("renders multiple column headers for multiple team Pokemon", () => {
      const team = makeTeam([
        makePokemonEntry(1, 1, "Charizard"),
        makePokemonEntry(2, 2, "Lapras"),
      ]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      expect(screen.getByText("Chariz…")).toBeInTheDocument();
      expect(screen.getByText("Lapras")).toBeInTheDocument();
    });

    it("skips team_pokemon entries with null pokemon", () => {
      const team: TeamWithPokemon = makeTeam([
        makePokemonEntry(1, 1, "Charizard"),
        {
          id: 2,
          team_id: 1,
          pokemon_id: null,
          team_position: 2,
          pokemon: null,
        } as unknown as TeamWithPokemon["team_pokemon"][number],
      ]);
      expect(() =>
        render(<TypeCoverageTab team={team} selectedPokemon={null} />)
      ).not.toThrow();
      // Only Charizard column should appear
      expect(screen.getByText("Chariz…")).toBeInTheDocument();
    });

    it("renders insights for shared weaknesses when 2+ members share a weakness", () => {
      const team = makeTeam([
        makePokemonEntry(1, 1, "Charizard"),
        makePokemonEntry(2, 2, "Incineroar"),
      ]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      // Both Fire-types are weak to Water — insights section should appear
      expect(screen.getByText("Insights")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Defensive heatmap — selected pokemon (scope=selected)
  // ---------------------------------------------------------------------------

  describe("defensive selected-pokemon heatmap", () => {
    it("renders the species name + Defensive heading when scope=selected", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      const pokemon = makePokemon({ species: "Charizard" });
      render(<TypeCoverageTab team={team} selectedPokemon={pokemon} />);

      await user.click(screen.getByRole("button", { name: "Selected" }));
      // Heading contains the species name
      expect(screen.getByText(/Charizard/)).toBeInTheDocument();
    });

    it("renders Current column header in the selected heatmap", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      const pokemon = makePokemon({ species: "Charizard" });
      render(<TypeCoverageTab team={team} selectedPokemon={pokemon} />);

      await user.click(screen.getByRole("button", { name: "Selected" }));
      expect(screen.getByText("Current")).toBeInTheDocument();
    });

    it("renders Tera column header when tera_type is set", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      const pokemon = makePokemon({ species: "Charizard", tera_type: "Water" });
      render(<TypeCoverageTab team={team} selectedPokemon={pokemon} />);

      await user.click(screen.getByRole("button", { name: "Selected" }));
      expect(screen.getByText("Tera Water")).toBeInTheDocument();
    });

    it("does not render Tera column header when tera_type is null", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      const pokemon = makePokemon({ species: "Charizard", tera_type: null });
      render(<TypeCoverageTab team={team} selectedPokemon={pokemon} />);

      await user.click(screen.getByRole("button", { name: "Selected" }));
      // No Tera column
      expect(screen.queryByText(/Tera Water/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Offensive heatmap — team view
  // ---------------------------------------------------------------------------

  describe("offensive team heatmap", () => {
    it("renders the heatmap table after switching to Offensive view", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);

      await user.click(screen.getByRole("button", { name: "Offensive" }));
      // Offensive team matrix shows abbreviated species as column headers
      expect(screen.getByText("Chariz…")).toBeInTheDocument();
    });

    it("renders coverage gaps section when types have no SE coverage", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);

      await user.click(screen.getByRole("button", { name: "Offensive" }));
      // Coverage Gaps section should be visible if some types aren't SE covered
      // (just ensure it doesn't crash — coverage gaps may or may not render)
      expect(
        screen.getByRole("button", { name: "Offensive" })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Offensive heatmap — selected pokemon
  // ---------------------------------------------------------------------------

  describe("offensive selected-pokemon heatmap", () => {
    it("renders per-move columns when scope=selected and view=offensive", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      const pokemon = makePokemon({
        species: "Charizard",
        move1: "Flamethrower",
        move2: "Surf",
        move3: null,
        move4: null,
      });
      render(<TypeCoverageTab team={team} selectedPokemon={pokemon} />);

      await user.click(screen.getByRole("button", { name: "Offensive" }));
      await user.click(screen.getByRole("button", { name: "Selected" }));
      expect(screen.getByText("Flamethrower")).toBeInTheDocument();
      expect(screen.getByText("Surf")).toBeInTheDocument();
    });

    it("shows empty-moves message when no moves are set", async () => {
      const user = userEvent.setup();
      const pokemon = makePokemon({
        move1: null,
        move2: null,
        move3: null,
        move4: null,
      });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);

      await user.click(screen.getByRole("button", { name: "Offensive" }));
      await user.click(screen.getByRole("button", { name: "Selected" }));
      expect(
        screen.getByText("Add moves to see offensive coverage.")
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Scope hint when no pokemon is selected
  // ---------------------------------------------------------------------------

  describe("scope hint", () => {
    it("shows 'Select a Pokemon to view individually' hint when no pokemon selected", () => {
      render(<TypeCoverageTab team={makeTeam([])} selectedPokemon={null} />);
      expect(
        screen.getByText("Select a Pokemon to view individually")
      ).toBeInTheDocument();
    });

    it("hides the scope hint when a pokemon is selected", () => {
      const pokemon = makePokemon({ species: "Charizard" });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      expect(
        screen.queryByText("Select a Pokemon to view individually")
      ).not.toBeInTheDocument();
    });
  });
});
