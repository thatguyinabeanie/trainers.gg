import { describe, it, expect } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
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

// Stable router object shared across all components and test assertions.
const mockRouter = { push: jest.fn(), refresh: jest.fn() };
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => mockRouter),
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
  getMegaStoneForSpecies: jest.fn(() => null),
  getFormatById: jest.fn(() => undefined),
  formatHasTera: jest.fn(() => false),
  getSpeciesTypes: jest.fn(() => ["Fire"]),
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
// TypeChartPanel is now mounted inside AnalyticsRail (Types tab) — no longer
// rendered directly by TeamWorkspace, so we only mock AnalyticsRail here.
jest.mock("../analytics-rail", () => ({
  AnalyticsRail: jest.fn(
    ({
      team,
      selectedPokemon,
      format,
    }: {
      team: {
        id: number;
        team_pokemon: Array<{ pokemon: { id: number } | null }>;
      };
      selectedPokemon: { id: number } | null;
      format: { id: string } | undefined;
    }) => (
      <div
        data-testid="analytics-rail"
        data-team-id={team.id}
        data-team-size={
          team.team_pokemon.filter((tp) => tp.pokemon !== null).length
        }
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
      onUpdate,
      onOpenSpeciesPicker,
      disabled,
      className,
    }: {
      pokemon: {
        id: number;
        species: string;
        move1: string | null;
        ability: string;
      };
      onUpdate: (field: string, value: unknown) => void;
      onOpenSpeciesPicker?: () => void;
      disabled?: boolean;
      className?: string;
    }) => (
      <div
        data-testid="pokemon-editor"
        data-pokemon-id={pokemon.id}
        data-species={pokemon.species}
        data-move1={pokemon.move1 ?? ""}
        data-ability={pokemon.ability}
        data-disabled={disabled ? "true" : "false"}
        data-classname={className ?? ""}
      >
        <button
          data-testid="editor-pick-move1"
          onClick={() => onUpdate("move1", "Tackle")}
        >
          pick-move1
        </button>
        <button
          data-testid="editor-pick-ability"
          onClick={() => onUpdate("ability", "Blaze")}
        >
          pick-ability
        </button>
        {onOpenSpeciesPicker && (
          <button
            data-testid="editor-open-species-picker"
            onClick={onOpenSpeciesPicker}
          >
            change-species
          </button>
        )}
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
  SpeciesPicker: ({
    onSelect,
    onCancel,
    currentSpecies,
  }: {
    onSelect: (species: string) => void;
    onCancel: () => void;
    currentSpecies: string | null;
  }) => (
    <div
      data-testid="species-picker"
      data-current-species={currentSpecies ?? "none"}
    >
      <button
        data-testid="species-picker-select"
        onClick={() => onSelect("Garchomp")}
      >
        Select Garchomp
      </button>
      <button
        data-testid="species-picker-select-charizard"
        onClick={() => onSelect("Charizard")}
      >
        Select Charizard
      </button>
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

  describe("2-column grid layout", () => {
    it("renders the outer 2-column grid wrapper (editor | analytics rail)", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      const grid = screen.getByTestId("team-workspace-grid");
      expect(grid).toBeInTheDocument();
      // grid template columns class — 1fr (with 0 min) / 460px rail.
      // TypeChartPanel lives inside the rail's Types tab now.
      expect(grid.className).toContain("grid-cols-[minmax(0,1fr)_28.75rem]");
    });

    it("uses the builder max-width container", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
      const container = screen.getByTestId("team-workspace");
      expect(container.className).toContain("max-w-builder");
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

    it("passes optimistically-patched team to AnalyticsRail (type chart sees live edits)", () => {
      const team = makeTeam([
        makePokemonEntry(1, 1, "Incineroar"),
        makePokemonEntry(2, 2, "Garchomp"),
      ]);
      render(<TeamWorkspace {...defaultProps} team={team} />);
      const rail = screen.getByTestId("analytics-rail");
      expect(rail).toBeInTheDocument();
      // Two filled slots → team_size attr should reflect the actual pokemon count
      expect(rail.getAttribute("data-team-size")).toBe("2");
    });

    it("mounts TeamStrip + PokemonEditor in the left column", () => {
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

    it("still mounts AnalyticsRail with empty team", () => {
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);
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

    it("when picker is open, the editor is unmounted but the analytics rail remains visible", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-add"));

      // Picker visible
      expect(screen.getByTestId("species-picker")).toBeInTheDocument();
      // Editor and team strip replaced by picker
      expect(screen.queryByTestId("pokemon-editor")).not.toBeInTheDocument();
      expect(screen.queryByTestId("team-strip")).not.toBeInTheDocument();
      // Analytics rail (which hosts the type chart in its Types tab) stays visible
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

  // ---------------------------------------------------------------------------
  // Optimistic field saves
  // ---------------------------------------------------------------------------

  describe("optimistic field updates", () => {
    it("reflects a move pick in the editor immediately (before the save resolves)", async () => {
      // Keep the save pending so the optimistic state stays visible.
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      // Initial state — move1 is "Fake Out" from the factory
      expect(
        screen.getByTestId("pokemon-editor").getAttribute("data-move1")
      ).toBe("Fake Out");

      await user.click(screen.getByTestId("editor-pick-move1"));

      // The editor should re-render with the new move IMMEDIATELY — this is
      // the optimistic-update guarantee. No await needed for the server action.
      expect(
        screen.getByTestId("pokemon-editor").getAttribute("data-move1")
      ).toBe("Tackle");
    });

    it("propagates an optimistic ability change without waiting for the save", async () => {
      // Keep the save pending so the optimistic state stays visible.
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      expect(
        screen.getByTestId("pokemon-editor").getAttribute("data-ability")
      ).toBe("Intimidate");

      await user.click(screen.getByTestId("editor-pick-ability"));

      expect(
        screen.getByTestId("pokemon-editor").getAttribute("data-ability")
      ).toBe("Blaze");
    });

    it("shows a toast and still refreshes when updatePokemonAction returns failure", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockResolvedValue({
        success: false,
        error: "DB write failed",
      });
      const { toast } = jest.requireMock("sonner");

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("editor-pick-move1"));

      expect(toast.error).toHaveBeenCalledWith("DB write failed");
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it("uses fallback error text when updatePokemonAction returns failure without a message", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockResolvedValue({ success: false, error: null });
      const { toast } = jest.requireMock("sonner");

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("editor-pick-move1"));

      expect(toast.error).toHaveBeenCalledWith("Failed to save changes.");
    });
  });

  // ---------------------------------------------------------------------------
  // handleStripSelect — re-click opens change picker
  // ---------------------------------------------------------------------------

  describe("handleStripSelect — re-clicking the selected chip", () => {
    it("opens the species picker in change mode when clicking the already-selected chip", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      // Click the chip that is already selected (pokemon_id 1 is default selection)
      await user.click(screen.getByTestId("team-strip-chip-1"));

      expect(screen.getByTestId("species-picker")).toBeInTheDocument();
      // currentSpecies is passed so picker knows what's already selected
      expect(
        screen
          .getByTestId("species-picker")
          .getAttribute("data-current-species")
      ).toBe("Incineroar");
    });

    it("does NOT open the picker when clicking a different (unselected) chip", async () => {
      const user = userEvent.setup();
      const team = makeTeam([
        makePokemonEntry(1, 1, "Incineroar"),
        makePokemonEntry(2, 2, "Garchomp"),
      ]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      // Chip 2 is not selected — should switch selection, not open picker
      await user.click(screen.getByTestId("team-strip-chip-2"));

      expect(screen.queryByTestId("species-picker")).not.toBeInTheDocument();
      expect(
        screen.getByTestId("pokemon-editor").getAttribute("data-pokemon-id")
      ).toBe("2");
    });
  });

  // ---------------------------------------------------------------------------
  // onOpenSpeciesPicker — editor button that opens change picker
  // ---------------------------------------------------------------------------

  describe("onOpenSpeciesPicker prop from PokemonEditor", () => {
    it("opens species picker in change mode when editor fires onOpenSpeciesPicker", async () => {
      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("editor-open-species-picker"));

      expect(screen.getByTestId("species-picker")).toBeInTheDocument();
      expect(
        screen
          .getByTestId("species-picker")
          .getAttribute("data-current-species")
      ).toBe("Incineroar");
    });
  });

  // ---------------------------------------------------------------------------
  // handleSpeciesSelect — add mode
  // ---------------------------------------------------------------------------

  describe("handleSpeciesSelect — add mode", () => {
    it("closes the picker immediately on species selection", async () => {
      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      expect(screen.getByTestId("species-picker")).toBeInTheDocument();

      await user.click(screen.getByTestId("species-picker-select"));

      expect(screen.queryByTestId("species-picker")).not.toBeInTheDocument();
    });

    it("calls addPokemonToTeamAction with the selected species and first available position", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");
      const { getValidAbilities } = jest.requireMock("@trainers/pokemon");
      getValidAbilities.mockReturnValue(["Rough Skin"]);

      const user = userEvent.setup();
      // Team has pokemon at positions 1 and 2 — next should be position 3
      const team = makeTeam([
        makePokemonEntry(1, 1, "Incineroar"),
        makePokemonEntry(2, 2, "Arcanine"),
      ]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      // Click a different chip first to make sure we're not in change mode
      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(addPokemonToTeamAction).toHaveBeenCalledWith(
        1, // team.id
        expect.objectContaining({ species: "Garchomp", ability: "Rough Skin" }),
        3 // next available position
      );
    });

    it("sets isSaving while addPokemonToTeamAction is pending", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");
      // Keep the promise pending to observe the saving state
      addPokemonToTeamAction.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(
        screen.getByTestId("team-workspace-save-indicator")
      ).toBeInTheDocument();
    });

    it("refreshes and selects the new pokemon on successful add", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");
      addPokemonToTeamAction.mockResolvedValue({
        success: true,
        data: { pokemonId: 42 },
      });

      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select"));

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it("shows toast on add failure with error message", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");
      addPokemonToTeamAction.mockResolvedValue({
        success: false,
        error: "Team is full",
      });
      const { toast } = jest.requireMock("sonner");

      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(toast.error).toHaveBeenCalledWith("Team is full");
    });

    it("uses fallback error message when add fails without an error string", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");
      addPokemonToTeamAction.mockResolvedValue({ success: false, error: null });
      const { toast } = jest.requireMock("sonner");

      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(toast.error).toHaveBeenCalledWith("Failed to add Pokémon.");
    });

    it("shows toast when addPokemonToTeamAction throws", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");
      addPokemonToTeamAction.mockRejectedValue(new Error("Network error"));
      const { toast } = jest.requireMock("sonner");

      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(toast.error).toHaveBeenCalledWith("Failed to add Pokémon.");
    });

    it("clears isSaving after addPokemonToTeamAction resolves", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");
      addPokemonToTeamAction.mockResolvedValue({
        success: true,
        data: { pokemonId: 99 },
      });

      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(
        screen.queryByTestId("team-workspace-save-indicator")
      ).not.toBeInTheDocument();
    });

    it("assigns mega stone as held_item when adding a mega species", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");
      const { getMegaStoneForSpecies } = jest.requireMock("@trainers/pokemon");
      getMegaStoneForSpecies.mockReturnValue("Charizardite Y");

      const user = userEvent.setup();
      render(<TeamWorkspace {...defaultProps} team={makeTeam([])} />);

      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select-charizard"));

      expect(addPokemonToTeamAction).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ held_item: "Charizardite Y" }),
        expect.any(Number)
      );
    });

    it("picks the first gap in positions rather than always using length+1", async () => {
      const { addPokemonToTeamAction } = jest.requireMock("@/actions/teams");

      const user = userEvent.setup();
      // Positions 1, 3 occupied — gap is position 2
      const team = makeTeam([
        makePokemonEntry(1, 1, "Incineroar"),
        makePokemonEntry(3, 3, "Arcanine"),
      ]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-add"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(addPokemonToTeamAction).toHaveBeenCalledWith(
        1,
        expect.any(Object),
        2 // first gap
      );
    });
  });

  // ---------------------------------------------------------------------------
  // handleSpeciesSelect — change mode
  // ---------------------------------------------------------------------------

  describe("handleSpeciesSelect — change mode", () => {
    it("calls updatePokemonAction with the new species fields", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      const { getValidAbilities } = jest.requireMock("@trainers/pokemon");
      getValidAbilities.mockReturnValue(["Sand Stream"]);

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      // Re-click the selected chip to open picker in change mode
      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(updatePokemonAction).toHaveBeenCalledWith(
        1, // team.id
        1, // pokemon.id
        expect.objectContaining({ species: "Garchomp", ability: "Sand Stream" })
      );
    });

    it("sets isSaving while updatePokemonAction is pending in change mode", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(
        screen.getByTestId("team-workspace-save-indicator")
      ).toBeInTheDocument();
    });

    it("refreshes after a successful species change", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it("shows toast when species change fails with error message", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockResolvedValue({
        success: false,
        error: "Species not allowed in format",
      });
      const { toast } = jest.requireMock("sonner");

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(toast.error).toHaveBeenCalledWith("Species not allowed in format");
    });

    it("uses fallback error text when species change fails without a message", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockResolvedValue({ success: false, error: null });
      const { toast } = jest.requireMock("sonner");

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(toast.error).toHaveBeenCalledWith("Failed to update species.");
    });

    it("shows toast when updatePokemonAction throws in change mode", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockRejectedValue(new Error("timeout"));
      const { toast } = jest.requireMock("sonner");

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(toast.error).toHaveBeenCalledWith("Failed to update species.");
    });

    it("shows the saving indicator while updatePokemonAction is in-flight in change mode", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      // Keep the promise pending to observe the saving indicator
      updatePokemonAction.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(
        screen.getByTestId("team-workspace-save-indicator")
      ).toBeInTheDocument();
    });

    it("includes mega stone in changeFields when changing to a mega species", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      const { getMegaStoneForSpecies } = jest.requireMock("@trainers/pokemon");
      getMegaStoneForSpecies.mockReturnValue("Garchompite");

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(updatePokemonAction).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ held_item: "Garchompite" })
      );
    });

    it("resets moves to null in changeFields", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      updatePokemonAction.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      const team = makeTeam([makePokemonEntry(1, 1, "Incineroar")]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      await user.click(screen.getByTestId("team-strip-chip-1"));
      await user.click(screen.getByTestId("species-picker-select"));

      expect(updatePokemonAction).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          move1: "",
          move2: null,
          move3: null,
          move4: null,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Mega stone auto-correct effect
  // ---------------------------------------------------------------------------

  describe("mega stone auto-correct effect", () => {
    it("calls updatePokemonAction to fix wrong mega stone on mount", async () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      const { getMegaStoneForSpecies } = jest.requireMock("@trainers/pokemon");
      // Species needs Charizardite Y but currently has nothing
      getMegaStoneForSpecies.mockImplementation((species: string) =>
        species === "Charizard" ? "Charizardite Y" : null
      );

      const team = makeTeam([makePokemonEntry(1, 1, "Charizard")]);
      // held_item is null — should be auto-corrected
      render(<TeamWorkspace {...defaultProps} team={team} />);

      // The effect runs on mount and issues a background save
      expect(updatePokemonAction).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ held_item: "Charizardite Y" })
      );
    });

    it("does NOT call updatePokemonAction when the mega stone is already correct", () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      const { getMegaStoneForSpecies } = jest.requireMock("@trainers/pokemon");
      getMegaStoneForSpecies.mockReturnValue("Charizardite Y");

      const entry = {
        ...makePokemonEntry(1, 1, "Charizard"),
        pokemon: {
          ...makePokemonEntry(1, 1, "Charizard").pokemon!,
          held_item: "Charizardite Y", // already correct
        },
      };
      const team = makeTeam([entry]);
      render(<TeamWorkspace {...defaultProps} team={team} />);

      expect(updatePokemonAction).not.toHaveBeenCalled();
    });

    it("skips team_pokemon entries with null pokemon", () => {
      const { updatePokemonAction } = jest.requireMock("@/actions/teams");
      const { getMegaStoneForSpecies } = jest.requireMock("@trainers/pokemon");
      getMegaStoneForSpecies.mockReturnValue("SomeMegaStone");

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

      // No pokemon object — effect should not call updatePokemonAction
      expect(updatePokemonAction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Format fallback
  // ---------------------------------------------------------------------------

  describe("format fallback", () => {
    it("renders without crashing when no format is provided", () => {
      const { getFormatById } = jest.requireMock("@trainers/pokemon");
      getFormatById.mockReturnValue({
        id: "gen9vgc2024regh",
        label: "Default",
      });

      render(<TeamWorkspace team={makeTeam([])} format={undefined} />);
      expect(screen.getByTestId("team-workspace")).toBeInTheDocument();
    });
  });
});
