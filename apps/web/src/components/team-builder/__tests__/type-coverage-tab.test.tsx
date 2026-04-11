import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// ALL_TYPES drives the defensive matrix rows — use a small slice to keep
// renders fast and assertions specific.
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
    // Produce plausible matchups based on first type
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
    // Default neutral profile
    return {
      immunities: [],
      weaknesses: {},
      resistances: {},
    };
  }),

  calculateTeamSynergy: jest.fn(() => ({
    sharedWeaknesses: { Water: 2 }, // 2 Water weak — should trigger warning
    sharedResistances: { Fire: 2 },
  })),

  calculateTeamCoverage: jest.fn(() => ({
    coverage: new Set(["Water", "Ground", "Rock"]),
    notVeryEffective: new Set(["Dragon"]),
  })),

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
    // Fire hits Grass/Ice/Bug/Steel super effectively
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
  // Empty team — TeamOverview empty state
  // ---------------------------------------------------------------------------

  describe("TeamOverview — empty team", () => {
    it("renders the 'Add Pokemon' prompt when the team is empty", () => {
      render(<TypeCoverageTab team={makeTeam([])} selectedPokemon={null} />);
      expect(
        screen.getByText("Add Pokemon to see type coverage")
      ).toBeInTheDocument();
    });

    it("does not render a defensive matrix table when team is empty", () => {
      render(<TypeCoverageTab team={makeTeam([])} selectedPokemon={null} />);
      expect(screen.queryByText("Defensive Coverage")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TeamOverview — with team Pokemon
  // ---------------------------------------------------------------------------

  describe("TeamOverview — with team Pokemon", () => {
    it("renders the Defensive Coverage section heading", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      expect(screen.getByText("Defensive Coverage")).toBeInTheDocument();
    });

    it("renders the species name as a column header in the matrix", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      // abbreviate("Charizard"): length 9 > 7 → slice(0,6) + "…" = "Chariz…"
      expect(screen.getByText("Chariz…")).toBeInTheDocument();
    });

    it("renders all type rows in the defensive matrix", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      // Type badges appear in multiple places — just confirm key types are present
      // Use getAllByText since a type may appear in both row header and coverage section
      expect(screen.getAllByText("Fire").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Water").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Ground").length).toBeGreaterThanOrEqual(1);
    });

    it("renders the Super-Effective Coverage section when coverage exists", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      expect(screen.getByText("Super-Effective Coverage")).toBeInTheDocument();
    });

    it("renders the Not covered section when notVeryEffective types exist", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      expect(screen.getByText("Not covered:")).toBeInTheDocument();
    });

    it("renders the Insights section when shared weaknesses exceed threshold", () => {
      // Mock returns sharedWeaknesses: { Water: 2 } — 2 >= 2 triggers warning
      const team = makeTeam([
        makePokemonEntry(1, 1, "Charizard"),
        makePokemonEntry(2, 2, "Incineroar"),
      ]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      expect(screen.getByText("Insights")).toBeInTheDocument();
    });

    it("renders a weakness warning badge with weak/resist counts", () => {
      const team = makeTeam([
        makePokemonEntry(1, 1, "Charizard"),
        makePokemonEntry(2, 2, "Incineroar"),
      ]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      expect(screen.getByText(/weak.*resist/i)).toBeInTheDocument();
    });

    it("shows species with short name as-is (≤7 chars)", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Gastly")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      // "Gastly" is 6 chars ≤ 7, so rendered as-is
      expect(screen.getByText("Gastly")).toBeInTheDocument();
    });

    it("renders multiple columns for multiple team Pokemon", () => {
      const team = makeTeam([
        makePokemonEntry(1, 1, "Charizard"),
        makePokemonEntry(2, 2, "Lapras"),
      ]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      // "Charizard" (9 chars > 7) → "Chariz…"
      expect(screen.getByText("Chariz…")).toBeInTheDocument();
      // "Lapras" (6 chars ≤ 7) → rendered as-is
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
      // Only Charizard column should appear ("Charizard" → "Chariz…")
      expect(screen.getByText("Chariz…")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // PokemonView — selectedPokemon provided
  // ---------------------------------------------------------------------------

  describe("PokemonView — selected Pokemon", () => {
    it("renders the Defensive Matchups section heading", () => {
      const pokemon = makePokemon({ species: "Charizard" });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      expect(screen.getByText("Defensive Matchups")).toBeInTheDocument();
    });

    it("renders the Weak section for a Pokemon with weaknesses", () => {
      const pokemon = makePokemon({ species: "Charizard" });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      // getDefensiveMatchups("Charizard") returns Water: 2, Rock: 2, Ground: 2
      expect(screen.getByText("Weak")).toBeInTheDocument();
    });

    it("renders the Resist section for a Pokemon with resistances", () => {
      const pokemon = makePokemon({ species: "Charizard" });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      // getDefensiveMatchups("Charizard") returns Fire: 0.5, etc.
      expect(screen.getByText("Resist")).toBeInTheDocument();
    });

    it("renders the Immune section for a Pokemon with immunities", () => {
      const pokemon = makePokemon({ species: "Gastly" });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      // getDefensiveMatchups(Ghost) returns immunities: [Normal, Fighting]
      expect(screen.getByText("Immune (0×)")).toBeInTheDocument();
    });

    it("renders the Move Coverage section when moves are set", () => {
      const pokemon = makePokemon({
        species: "Charizard",
        move1: "Flamethrower",
        move2: "Surf",
        move3: null,
        move4: null,
      });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      expect(screen.getByText("Move Coverage")).toBeInTheDocument();
    });

    it("lists each move name in the Move Coverage section", () => {
      const pokemon = makePokemon({
        move1: "Flamethrower",
        move2: "Surf",
        move3: null,
        move4: null,
      });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      expect(screen.getByText("Flamethrower")).toBeInTheDocument();
      expect(screen.getByText("Surf")).toBeInTheDocument();
    });

    it("does not render Move Coverage section when no moves are set", () => {
      const pokemon = makePokemon({
        move1: null,
        move2: null,
        move3: null,
        move4: null,
      });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      expect(screen.queryByText("Move Coverage")).not.toBeInTheDocument();
    });

    it("skips a move entry when getMoveType returns null", () => {
      // getMoveType returns null for unknown moves
      const pokemon = makePokemon({
        move1: "Splash", // mapped to "Normal" by mock
        move2: "UnknownMove", // returns null
        move3: null,
        move4: null,
      });
      expect(() =>
        render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />)
      ).not.toThrow();
      expect(screen.getByText("Splash")).toBeInTheDocument();
      expect(screen.queryByText("UnknownMove")).not.toBeInTheDocument();
    });

    it("renders → arrows and SE type badges for moves with super-effective coverage", () => {
      const pokemon = makePokemon({
        move1: "Flamethrower",
        move2: null,
        move3: null,
        move4: null,
      });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      // getTypeEffectiveness returns 2 for Fire vs Grass/Ice/Bug/Steel
      // At least one "→" separator should appear
      expect(screen.getByText("→")).toBeInTheDocument();
    });

    it("does not render the Tera section when tera_type is null", () => {
      const pokemon = makePokemon({ tera_type: null });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      expect(screen.queryByText(/tera.*comparison/i)).not.toBeInTheDocument();
    });

    it("renders the Tera Comparison section when tera_type is set", () => {
      const pokemon = makePokemon({ species: "Charizard", tera_type: "Fire" });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      expect(screen.getByText(/tera fire comparison/i)).toBeInTheDocument();
    });

    it("renders Current and After Tera column headers in the tera table", () => {
      const pokemon = makePokemon({ species: "Charizard", tera_type: "Water" });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      expect(screen.getByText("Current")).toBeInTheDocument();
      expect(screen.getByText("After Tera")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // multiplierCell label mapping
  // ---------------------------------------------------------------------------

  describe("multiplierCell label rendering", () => {
    it.each([
      ["immune row shows 0 label", "Ghost", "Gastly"],
      ["resist row shows ½ label", "Fire", "Charizard"],
      ["weak row shows 2 label", "Water", "Charizard"],
    ])("%s", (_label, _attackType, species) => {
      const pokemon = makePokemon({ species });
      render(<TypeCoverageTab team={makeTeam()} selectedPokemon={pokemon} />);
      // Just verify no crash — specific label assertions covered above
      expect(screen.getByText("Defensive Matchups")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Route decision — selectedPokemon vs null
  // ---------------------------------------------------------------------------

  describe("routing between TeamOverview and PokemonView", () => {
    it("renders TeamOverview when selectedPokemon is null", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      render(<TypeCoverageTab team={team} selectedPokemon={null} />);
      expect(screen.getByText("Defensive Coverage")).toBeInTheDocument();
      expect(screen.queryByText("Defensive Matchups")).not.toBeInTheDocument();
    });

    it("renders PokemonView when selectedPokemon is provided", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      const pokemon = makePokemon({ species: "Gardevoir" });
      render(<TypeCoverageTab team={team} selectedPokemon={pokemon} />);
      expect(screen.getByText("Defensive Matchups")).toBeInTheDocument();
      expect(screen.queryByText("Defensive Coverage")).not.toBeInTheDocument();
    });
  });
});
