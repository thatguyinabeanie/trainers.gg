import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockInvalidateQueries = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
}));

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
  buildSpeciesSearchIndex: jest.fn(() => []),
  getValidAbilities: jest.fn(() => ["Intimidate"]),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({
    url: "https://example.com/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
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

// Mock validation hook — keep behavior simple, return no errors.
jest.mock("../validation-hooks", () => ({
  useTeamValidation: jest.fn(() => ({ pokemonErrors: new Map() })),
}));

// Mock the heavy panels and the editor — assert prop pass-through via data-* attrs.
jest.mock("../type-chart-panel", () => ({
  TypeChartPanel: jest.fn(({ team }: { team: Array<{ id: number }> }) => (
    <div data-testid="type-chart-panel" data-team-size={team.length}>
      type-chart
    </div>
  )),
}));

jest.mock("../analytics-rail", () => ({
  AnalyticsRail: jest.fn(
    ({
      team,
      selectedPokemon,
      format,
    }: {
      team: { id: number };
      selectedPokemon: { id: number } | null;
      format: { id: string } | undefined;
    }) => (
      <div
        data-testid="analytics-rail"
        data-team-id={team.id}
        data-selected-id={selectedPokemon ? selectedPokemon.id : "none"}
        data-format-id={format ? format.id : "none"}
      >
        analytics-rail
      </div>
    )
  ),
}));

jest.mock("../pokemon-editor", () => ({
  PokemonEditor: jest.fn(
    ({
      pokemon,
      disabled,
      className,
    }: {
      pokemon: { id: number; species: string };
      disabled?: boolean;
      className?: string;
    }) => (
      <div
        data-testid="pokemon-editor"
        data-pokemon-id={pokemon.id}
        data-species={pokemon.species}
        data-disabled={disabled ? "true" : "false"}
        data-classname={className ?? ""}
      >
        pokemon-editor
      </div>
    )
  ),
}));

jest.mock("../team-strip", () => ({
  TeamStrip: jest.fn(
    ({
      pokemon,
      selectedPokemonId,
      onSelect,
      onAddNew,
    }: {
      pokemon: Array<{
        pokemon_id: number;
        pokemon: { species: string } | null;
      }>;
      selectedPokemonId: number | null;
      onSelect: (id: number) => void;
      onAddNew: () => void;
    }) => (
      <div
        data-testid="team-strip"
        data-selected-id={selectedPokemonId ?? "none"}
        data-count={pokemon.length}
      >
        <button data-testid="team-strip-add" onClick={onAddNew}>
          add
        </button>
        {pokemon.map((tp) => (
          <button
            key={tp.pokemon_id}
            data-testid={`team-strip-chip-${tp.pokemon_id}`}
            onClick={() => onSelect(tp.pokemon_id)}
          >
            {tp.pokemon?.species ?? "empty"}
          </button>
        ))}
      </div>
    )
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
  format: { id: "gen9vgc2026regi", label: "SV: Reg I", generation: 9 },
};

// =============================================================================
// Tests
// =============================================================================

describe("TeamWorkspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidateQueries.mockClear();
  });

  describe("3-column grid layout", () => {
    it("renders the outer 3-column grid wrapper", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      const grid = screen.getByTestId("team-workspace-grid");
      expect(grid).toBeInTheDocument();
      // grid template columns class — fixed 240 / 1fr (with 0 min) / 460
      expect(grid.className).toContain(
        "grid-cols-[15rem_minmax(0,1fr)_28.75rem]"
      );
    });

    it("uses the builder max-width container", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      const container = screen.getByTestId("team-workspace");
      expect(container.className).toContain("max-w-builder");
    });

    it("mounts TypeChartPanel on the left", () => {
      const team = makeTeam([
        makePokemonEntry(1, 1, "Incineroar"),
        makePokemonEntry(2, 2, "Garchomp"),
      ]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      const chart = screen.getByTestId("type-chart-panel");
      expect(chart).toBeInTheDocument();
      expect(chart.getAttribute("data-team-size")).toBe("2");
    });

    it("mounts AnalyticsRail on the right with team + selected pokemon + format", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      const rail = screen.getByTestId("analytics-rail");
      expect(rail).toBeInTheDocument();
      expect(rail.getAttribute("data-team-id")).toBe("1");
      expect(rail.getAttribute("data-selected-id")).toBe("1");
      expect(rail.getAttribute("data-format-id")).toBe("gen9vgc2026regi");
    });

    it("mounts TeamStrip + PokemonEditor in the center column", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      expect(screen.getByTestId("team-strip")).toBeInTheDocument();
      expect(screen.getByTestId("pokemon-editor")).toBeInTheDocument();
    });

    it("strips the editor's outer card chrome via className override", () => {
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      const editor = screen.getByTestId("pokemon-editor");
      // The override is the same pattern AnalyticsRail uses for its panels.
      expect(editor.getAttribute("data-classname")).toContain("bg-transparent");
      expect(editor.getAttribute("data-classname")).toContain("shadow-none");
    });
  });

  describe("placeholder shell (0 Pokémon)", () => {
    it("renders the disabled placeholder editor when team is empty", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      const editor = screen.getByTestId("pokemon-editor");
      expect(editor.getAttribute("data-disabled")).toBe("true");
      // Sentinel id: -1
      expect(editor.getAttribute("data-pokemon-id")).toBe("-1");
    });

    it("still mounts TypeChartPanel and AnalyticsRail with empty team", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      expect(screen.getByTestId("type-chart-panel")).toBeInTheDocument();
      expect(screen.getByTestId("analytics-rail")).toBeInTheDocument();
    });

    it("does NOT show the species picker before any interaction", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      expect(screen.queryByTestId("species-picker")).not.toBeInTheDocument();
    });
  });

  describe("with pokemon", () => {
    it("renders the first pokemon's editor by default", () => {
      const team = makeTeam([
        makePokemonEntry(1, 1, "Incineroar"),
        makePokemonEntry(2, 2, "Garchomp"),
      ]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      const editor = screen.getByTestId("pokemon-editor");
      // First sorted entry — pokemon_id 1 (Incineroar)
      expect(editor.getAttribute("data-pokemon-id")).toBe("1");
      expect(editor.getAttribute("data-species")).toBe("Incineroar");
      expect(editor.getAttribute("data-disabled")).toBe("false");
    });

    it("selecting a different chip in TeamStrip updates the editor's pokemon prop", async () => {
      const user = userEvent.setup();
      const team = makeTeam([
        makePokemonEntry(1, 1, "Incineroar"),
        makePokemonEntry(2, 2, "Garchomp"),
      ]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      // Default selection
      expect(
        screen.getByTestId("pokemon-editor").getAttribute("data-pokemon-id")
      ).toBe("1");

      await user.click(screen.getByTestId("team-strip-chip-2"));

      // After selecting Garchomp's chip, the editor should remount with pokemon_id 2
      expect(
        screen.getByTestId("pokemon-editor").getAttribute("data-pokemon-id")
      ).toBe("2");
      expect(
        screen.getByTestId("pokemon-editor").getAttribute("data-species")
      ).toBe("Garchomp");
    });

    it("selecting a chip propagates the new selection to AnalyticsRail", async () => {
      const user = userEvent.setup();
      const team = makeTeam([
        makePokemonEntry(1, 1, "Incineroar"),
        makePokemonEntry(2, 2, "Garchomp"),
      ]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-2"));

      expect(
        screen.getByTestId("analytics-rail").getAttribute("data-selected-id")
      ).toBe("2");
    });

    it("shows 'Select a Pokémon to edit' when the selected entry has no pokemon", () => {
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

  describe("species picker overlay", () => {
    it("clicking the team strip's add button opens the species picker", async () => {
      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      expect(screen.queryByTestId("species-picker")).not.toBeInTheDocument();

      await user.click(screen.getByTestId("team-strip-add"));

      expect(screen.getByTestId("species-picker")).toBeInTheDocument();
    });

    it("when picker is open, the editor is unmounted but type chart + rail remain visible", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-add"));

      // Picker visible
      expect(screen.getByTestId("species-picker")).toBeInTheDocument();
      // Editor and team strip replaced by picker
      expect(screen.queryByTestId("pokemon-editor")).not.toBeInTheDocument();
      expect(screen.queryByTestId("team-strip")).not.toBeInTheDocument();
      // Side rails still visible
      expect(screen.getByTestId("type-chart-panel")).toBeInTheDocument();
      expect(screen.getByTestId("analytics-rail")).toBeInTheDocument();
    });

    it("cancel restores the editor card", async () => {
      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      expect(screen.getByTestId("species-picker")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByTestId("species-picker")).not.toBeInTheDocument();
      expect(screen.getByTestId("team-strip")).toBeInTheDocument();
      expect(screen.getByTestId("pokemon-editor")).toBeInTheDocument();
    });
  });
});
