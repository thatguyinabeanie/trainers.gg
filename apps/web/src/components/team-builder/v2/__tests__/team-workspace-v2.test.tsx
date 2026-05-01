"use client";

/**
 * Behavioral tests for TeamWorkspaceV2 — the root orchestrator component.
 *
 * Strategy: mock all heavy child components so each test focuses on a single
 * orchestration concern (save flow, optimistic update, error rollback, remove
 * dialog, add pokemon). DnD pointer events are not simulated in JSDOM; the
 * handleDragEnd path is exercised via the existing team-workspace-reorder tests.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

// =============================================================================
// Heavy module mocks — must be declared before any import that references them
// =============================================================================

jest.mock("../calc/calc-state-context", () => ({
  CalcStateProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useCalcStateContext: () => ({
    defenderSpecies: "",
    moveCalcOutputs: [null, null, null, null],
    field: { doubles: true, tailwind: false, foesAlive: 2, allyAlive: 2, atkTera: false },
    setField: jest.fn(),
    calcEnabled: false,
  }),
}));

jest.mock("../dock/dockbar", () => ({
  Dockbar: () => <div data-testid="dockbar" />,
}));

jest.mock("../dock/heatmap-panel", () => ({
  HeatmapPanel: () => <div data-testid="heatmap-panel" />,
  getTeamDefensiveSummary: () => ({ weakCount: 2, coveredCount: 16 }),
}));

jest.mock("../dock/speed-tiers-panel", () => ({
  SpeedTiersPanel: () => <div data-testid="speed-tiers-panel" />,
  getTeamFastestSpeed: () => 120,
}));

jest.mock("../topbar", () => ({
  Topbar: ({ onOpenImport, onJumpToPokemon }: {
    onOpenImport: () => void;
    onJumpToPokemon: (id: number) => void;
  }) => (
    <div data-testid="topbar">
      <button onClick={onOpenImport} data-testid="open-import">Import</button>
      <button onClick={() => onJumpToPokemon(10)} data-testid="jump-to-pokemon">
        Jump to 10
      </button>
    </div>
  ),
}));

jest.mock("../poke-row", () => ({
  PokeRow: ({
    idx,
    pokemon,
    sortableId,
    onAdd,
    onRemove,
    onPokemonUpdate,
  }: {
    idx: number;
    pokemon: Tables<"pokemon"> | null;
    sortableId: string;
    onAdd: (idx: number, speciesId: string) => void;
    onRemove: (idx: number) => void;
    onPokemonUpdate?: (
      pokemonId: number,
      fields: Partial<Tables<"pokemon">>
    ) => void;
  }) => (
    <div data-testid={`poke-row-${idx}`} data-sortable-id={sortableId}>
      <span data-testid={`species-${idx}`}>{pokemon?.species ?? "empty"}</span>
      <span data-testid={`nickname-${idx}`}>{pokemon?.nickname ?? ""}</span>
      <button
        data-testid={`add-${idx}`}
        onClick={() => onAdd(idx, "Pikachu")}
      >
        Add
      </button>
      <button data-testid={`remove-${idx}`} onClick={() => onRemove(idx)}>
        Remove
      </button>
      <button
        data-testid={`update-${idx}`}
        onClick={() =>
          pokemon && onPokemonUpdate?.(pokemon.id, { nickname: "Sparky" })
        }
      >
        Update nickname
      </button>
    </div>
  ),
}));

jest.mock("../calc/calc-bottom-panel", () => ({
  CalcBottomPanel: () => <div data-testid="calc-bottom-panel" />,
}));

jest.mock("../calc/calc-drawer", () => ({
  CalcDrawer: () => <div data-testid="calc-drawer" />,
}));

jest.mock("../../import-dialog", () => ({
  ImportDialog: ({ open }: { open: boolean }) => (
    <div data-testid="import-dialog" data-open={String(open)} />
  ),
}));

jest.mock("../../export-menu", () => ({
  ExportMenu: () => <div data-testid="export-menu" />,
}));

jest.mock("../../validation-hooks", () => ({
  useTeamValidation: () => ({
    errors: [],
    pokemonErrors: new Map(),
    validate: jest.fn(),
  }),
}));

// Controllable drawer state — default closed, tests can override
const mockSetDrawer = jest.fn();
const mockSetActiveIdx = jest.fn();
const mockBuilderState = {
  activeIdx: 0,
  setActiveIdx: mockSetActiveIdx,
  drawer: null as "matchups" | "speed" | "calc" | null,
  setDrawer: mockSetDrawer,
  field: { doubles: true, tailwind: false, foesAlive: 2, allyAlive: 2, atkTera: false },
  setField: jest.fn(),
  panelHeightPct: 40,
  setPanelHeightPct: jest.fn(),
  attackerSlot: null as number | null,
  setAttackerSlot: jest.fn(),
  faintedYours: 0,
  setFaintedYours: jest.fn(),
  faintedTheirs: 0,
  setFaintedTheirs: jest.fn(),
};

jest.mock("../use-builder-state", () => ({
  useBuilderState: () => mockBuilderState,
}));

// Mobile: default to desktop, override per test
const mockUseIsMobile = jest.fn().mockReturnValue(false);
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

const mockRouterRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

jest.mock("../builder.module.css", () => new Proxy({}, { get: (_t, k) => k }));

// Toast — capture calls
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastInfo = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

// Action mocks
const mockUpdatePokemonAction = jest.fn();
const mockAddPokemonToTeamAction = jest.fn();
const mockRemovePokemonFromTeamAction = jest.fn();
const mockReorderTeamPokemonAction = jest.fn();

jest.mock("@/actions/teams", () => ({
  updatePokemonAction: (...args: unknown[]) => mockUpdatePokemonAction(...args),
  addPokemonToTeamAction: (...args: unknown[]) =>
    mockAddPokemonToTeamAction(...args),
  removePokemonFromTeamAction: (...args: unknown[]) =>
    mockRemovePokemonFromTeamAction(...args),
  reorderTeamPokemonAction: (...args: unknown[]) =>
    mockReorderTeamPokemonAction(...args),
}));

// =============================================================================
// Import AFTER mocks
// =============================================================================

import { TeamWorkspaceV2 } from "../team-workspace-v2";

// =============================================================================
// Fixtures
// =============================================================================

function makePokemon(
  id: number,
  species: string,
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
  return {
    id,
    species,
    ability: "Intimidate",
    nature: "Hardy",
    move1: "Fake Out",
    move2: null,
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: null,
    nickname: null,
    notes: null,
    tera_type: null,
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

function makeTeam(teamPokemon: TeamWithPokemon["team_pokemon"]): TeamWithPokemon {
  return {
    id: 1,
    name: "Test Team",
    created_by: 1,
    format: "gen9vgc2026regi",
    description: null,
    format_legal: null,
    is_public: null,
    notes: null,
    parent_team_id: null,
    tags: null,
    created_at: null,
    updated_at: null,
    team_pokemon: teamPokemon,
  };
}

const GARCHOMP = makePokemon(10, "Garchomp");
const INCINEROAR = makePokemon(20, "Incineroar");
const FLUTTER_MANE = makePokemon(30, "Flutter Mane");

const TWO_POKEMON_TEAM = makeTeam([
  { id: 100, pokemon_id: 10, team_position: 1, pokemon: GARCHOMP },
  { id: 101, pokemon_id: 20, team_position: 2, pokemon: INCINEROAR },
]);

const EMPTY_TEAM = makeTeam([]);

function renderWorkspace(
  team: TeamWithPokemon = TWO_POKEMON_TEAM,
  format = undefined
) {
  return render(
    <TeamWorkspaceV2 team={team} format={format} username="ash_ketchum" />
  );
}

/**
 * Build a manually-resolvable promise for holding a server action open across
 * an `await`. Lets a test assert what the UI looks like during the pending
 * window — the optimistic-UI contract — before the action resolves.
 */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  // Reset builder state to defaults
  mockBuilderState.drawer = null;
  mockBuilderState.activeIdx = 0;
  mockBuilderState.attackerSlot = null;
  mockUseIsMobile.mockReturnValue(false);
  // Default: all actions succeed
  mockUpdatePokemonAction.mockResolvedValue({ success: true });
  mockAddPokemonToTeamAction.mockResolvedValue({ success: true });
  mockRemovePokemonFromTeamAction.mockResolvedValue({ success: true });
  mockReorderTeamPokemonAction.mockResolvedValue({ success: true });
});

// =============================================================================
// buildSlots — gap handling
// =============================================================================

describe("TeamWorkspaceV2 — buildSlots position mapping", () => {
  it("places pokemon into the slot matching team_position - 1", () => {
    const team = makeTeam([
      { id: 100, pokemon_id: 30, team_position: 4, pokemon: FLUTTER_MANE },
    ]);

    renderWorkspace(team);

    // Slots 0-2 are empty; slot 3 = Flutter Mane
    expect(screen.getByTestId("poke-row-0")).toHaveTextContent("empty");
    expect(screen.getByTestId("poke-row-3")).toHaveTextContent("Flutter Mane");
  });

  it("ignores out-of-range team_position values (≤ 0 or ≥ 7)", () => {
    const team = makeTeam([
      { id: 100, pokemon_id: 10, team_position: 7, pokemon: GARCHOMP },
      { id: 101, pokemon_id: 20, team_position: 0, pokemon: INCINEROAR },
    ]);

    renderWorkspace(team);

    // Both out-of-range positions are dropped — all 6 slots should be empty
    const rows = screen.getAllByTestId(/^poke-row-/);
    for (const row of rows) {
      expect(row).toHaveTextContent("empty");
    }
  });

  it("handles a full 6-pokemon team with no gaps", () => {
    const fullTeam = makeTeam([
      { id: 100, pokemon_id: 10, team_position: 1, pokemon: makePokemon(10, "Pikachu") },
      { id: 101, pokemon_id: 20, team_position: 2, pokemon: makePokemon(20, "Raichu") },
      { id: 102, pokemon_id: 30, team_position: 3, pokemon: makePokemon(30, "Mewtwo") },
      { id: 103, pokemon_id: 40, team_position: 4, pokemon: makePokemon(40, "Mew") },
      { id: 104, pokemon_id: 50, team_position: 5, pokemon: makePokemon(50, "Lugia") },
      { id: 105, pokemon_id: 60, team_position: 6, pokemon: makePokemon(60, "Ho-Oh") },
    ]);

    renderWorkspace(fullTeam);

    const rows = screen.getAllByTestId(/^poke-row-/);
    expect(rows).toHaveLength(6);
    const species = rows.map((r) => r.textContent);
    // None should be empty
    expect(species.some((s) => s?.includes("empty"))).toBe(false);
  });

  it("renders 6 empty slots for an empty team", () => {
    renderWorkspace(EMPTY_TEAM);

    const rows = screen.getAllByTestId(/^poke-row-/);
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      expect(row).toHaveTextContent("empty");
    }
  });
});

// =============================================================================
// add pokemon flow
// =============================================================================

describe("TeamWorkspaceV2 — add pokemon flow", () => {
  it("calls addPokemonToTeamAction with correct position (1-indexed) on success", async () => {
    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("add-2")); // slot index 2 → position 3

    await waitFor(() => {
      expect(mockAddPokemonToTeamAction).toHaveBeenCalledWith(
        1, // team id
        expect.objectContaining({
          species: "Pikachu",
          nature: "Serious",
          ability: "",
          move1: "",
        }),
        3 // position = idx + 1
      );
    });
  });

  it("shows a success toast and refreshes on add success", async () => {
    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("add-0"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining("added to slot 1")
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("renders the new pokemon in the slot optimistically before the server action resolves", async () => {
    const { promise, resolve } = deferred<{
      success: true;
      data: { pokemonId: number };
    }>();
    mockAddPokemonToTeamAction.mockImplementationOnce(() => promise);

    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    expect(screen.getByTestId("species-0")).toHaveTextContent("empty");

    await user.click(screen.getByTestId("add-0"));

    await waitFor(() => {
      expect(screen.getByTestId("species-0")).toHaveTextContent("Pikachu");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();

    resolve({ success: true, data: { pokemonId: 99 } });
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("shows an error toast and refreshes (rolling back the optimistic add) on add failure", async () => {
    mockAddPokemonToTeamAction.mockResolvedValueOnce({
      success: false,
      error: "Slot is full.",
    });

    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("add-0"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Slot is full.");
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("falls back to generic add error message when error field is missing", async () => {
    mockAddPokemonToTeamAction.mockResolvedValueOnce({ success: false });

    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("add-0"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to add Pokémon.");
    });
  });
});

// =============================================================================
// remove pokemon flow
// =============================================================================

describe("TeamWorkspaceV2 — remove pokemon flow", () => {
  it("opens the remove confirmation dialog when remove is clicked", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));

    // AlertDialog should be open
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/remove pokémon\?/i)).toBeInTheDocument();
  });

  it("calls removePokemonFromTeamAction after the user confirms removal", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0")); // open dialog
    await user.click(screen.getByRole("button", { name: /^remove$/i })); // confirm

    await waitFor(() => {
      expect(mockRemovePokemonFromTeamAction).toHaveBeenCalledWith(1, 10);
    });
  });

  it("shows success toast and refreshes after successful removal", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));
    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Pokémon removed.");
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("empties the slot optimistically before the server action resolves", async () => {
    const { promise, resolve } = deferred<{
      success: true;
      data: undefined;
    }>();
    mockRemovePokemonFromTeamAction.mockImplementationOnce(() => promise);

    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.getByTestId("species-0")).toHaveTextContent("Garchomp");

    await user.click(screen.getByTestId("remove-0"));
    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("species-0")).toHaveTextContent("empty");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();

    resolve({ success: true, data: undefined });
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("shows error toast and refreshes (rolling back the optimistic remove) on removal failure", async () => {
    mockRemovePokemonFromTeamAction.mockResolvedValueOnce({
      success: false,
      error: "Permission denied.",
    });

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));
    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Permission denied.");
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("falls back to generic remove error message when error field is missing", async () => {
    mockRemovePokemonFromTeamAction.mockResolvedValueOnce({ success: false });

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));
    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to remove Pokémon.");
    });
  });

  it("closes the dialog and does nothing when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(mockRemovePokemonFromTeamAction).not.toHaveBeenCalled();
    });
  });

  it("does nothing when remove is clicked on an empty slot", async () => {
    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("remove-0")); // opens dialog for empty slot
    await user.click(screen.getByRole("button", { name: /^remove$/i })); // confirm

    await waitFor(() => {
      // No pokemon in slot → action should not be called
      expect(mockRemovePokemonFromTeamAction).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// optimistic placeholder guards — block mutate/remove/reorder for negative ids
// =============================================================================

describe("TeamWorkspaceV2 — optimistic placeholder guards", () => {
  /** Team where slot 0 holds a not-yet-saved pokemon (negative id). */
  const PENDING_TEAM = makeTeam([
    {
      id: -1,
      pokemon_id: -1,
      team_position: 1,
      pokemon: makePokemon(-1, "Pikachu"),
    },
  ]);

  it("update on a pending placeholder is skipped and shows an info toast", async () => {
    const user = userEvent.setup();
    renderWorkspace(PENDING_TEAM);

    await user.click(screen.getByTestId("update-0"));

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith(
        expect.stringContaining("Still saving")
      );
    });
    expect(mockUpdatePokemonAction).not.toHaveBeenCalled();
  });

  it("remove on a pending placeholder is skipped and shows an info toast", async () => {
    const user = userEvent.setup();
    renderWorkspace(PENDING_TEAM);

    await user.click(screen.getByTestId("remove-0"));
    await user.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith(
        expect.stringContaining("Still saving")
      );
    });
    expect(mockRemovePokemonFromTeamAction).not.toHaveBeenCalled();
  });
});

// =============================================================================
// optimistic update + rollback
// =============================================================================

describe("TeamWorkspaceV2 — optimistic update flow", () => {
  it("calls updatePokemonAction with the team id, pokemon id, and patch fields", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("update-0")); // updates pokemon id 10

    await waitFor(() => {
      expect(mockUpdatePokemonAction).toHaveBeenCalledWith(1, 10, {
        nickname: "Sparky",
      });
    });
  });

  it("renders the patched field optimistically before the server action resolves", async () => {
    const { promise, resolve } = deferred<{ success: true; data: undefined }>();
    mockUpdatePokemonAction.mockImplementationOnce(() => promise);

    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.getByTestId("nickname-0")).toHaveTextContent("");

    await user.click(screen.getByTestId("update-0"));

    await waitFor(() => {
      expect(screen.getByTestId("nickname-0")).toHaveTextContent("Sparky");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();

    resolve({ success: true, data: undefined });
    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("toasts and refreshes (rolling back the optimistic patch) on update failure", async () => {
    mockUpdatePokemonAction.mockResolvedValueOnce({
      success: false,
      error: "Validation failed.",
    });

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("update-0"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Validation failed.");
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("falls back to a generic message when the failure shape omits an error string", async () => {
    mockUpdatePokemonAction.mockResolvedValueOnce({ success: false });

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("update-0"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to save changes.");
    });
  });
});

// =============================================================================
// import dialog
// =============================================================================

describe("TeamWorkspaceV2 — import dialog", () => {
  it("import dialog starts closed", () => {
    renderWorkspace();

    const dialog = screen.getByTestId("import-dialog");
    expect(dialog).toHaveAttribute("data-open", "false");
  });

  it("opens the import dialog when the Import button in topbar is clicked", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("open-import"));

    const dialog = screen.getByTestId("import-dialog");
    expect(dialog).toHaveAttribute("data-open", "true");
  });
});

// =============================================================================
// handleJumpToPokemon — navigation from validation popover
// =============================================================================

describe("TeamWorkspaceV2 — handleJumpToPokemon", () => {
  it("calls setActiveIdx with the correct slot index for a valid pokemon id", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    // The topbar mock fires onJumpToPokemon(10) — Garchomp is at slot 0
    await user.click(screen.getByTestId("jump-to-pokemon"));

    expect(mockSetActiveIdx).toHaveBeenCalledWith(0);
  });

  it("does not call setActiveIdx when the pokemon id is not in any slot", async () => {
    // Use a team where pokemon id 10 is not present
    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("jump-to-pokemon"));

    expect(mockSetActiveIdx).not.toHaveBeenCalled();
  });
});

// =============================================================================
// mobile layout — no DnD context
// =============================================================================

describe("TeamWorkspaceV2 — mobile layout", () => {
  it("renders all 6 poke-rows without DnD context on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);

    renderWorkspace();

    const rows = screen.getAllByTestId(/^poke-row-/);
    expect(rows).toHaveLength(6);
  });
});

// =============================================================================
// drawer panel rendering
// =============================================================================

describe("TeamWorkspaceV2 — drawer panel", () => {
  it("renders the heatmap panel when drawer is 'matchups'", () => {
    mockBuilderState.drawer = "matchups";

    renderWorkspace();

    expect(screen.getByTestId("heatmap-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("speed-tiers-panel")).not.toBeInTheDocument();
  });

  it("renders the speed tiers panel when drawer is 'speed'", () => {
    mockBuilderState.drawer = "speed";

    renderWorkspace();

    expect(screen.getByTestId("speed-tiers-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("heatmap-panel")).not.toBeInTheDocument();
  });

  it("renders the calc bottom panel when drawer is 'calc' on desktop", () => {
    mockBuilderState.drawer = "calc";
    mockUseIsMobile.mockReturnValue(false);

    renderWorkspace();

    expect(screen.getByTestId("calc-bottom-panel")).toBeInTheDocument();
  });

  it("renders the calc drawer (Sheet) instead of bottom panel on mobile", () => {
    mockBuilderState.drawer = "calc";
    mockUseIsMobile.mockReturnValue(true);

    renderWorkspace();

    expect(screen.getByTestId("calc-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("calc-bottom-panel")).not.toBeInTheDocument();
  });

  it("renders no panel when drawer is null", () => {
    mockBuilderState.drawer = null;

    renderWorkspace();

    expect(screen.queryByTestId("heatmap-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("speed-tiers-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("calc-bottom-panel")).not.toBeInTheDocument();
  });

  it("shows 'DEFENSIVE' eyebrow when matchups drawer is open", () => {
    mockBuilderState.drawer = "matchups";

    renderWorkspace();

    expect(screen.getByText("DEFENSIVE")).toBeInTheDocument();
  });

  it("shows 'SPEED' eyebrow when speed drawer is open", () => {
    mockBuilderState.drawer = "speed";

    renderWorkspace();

    expect(screen.getByText("SPEED")).toBeInTheDocument();
  });

  it("close button in panel header calls setDrawer(null)", async () => {
    mockBuilderState.drawer = "matchups";

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /close panel/i }));

    expect(mockSetDrawer).toHaveBeenCalledWith(null);
  });
});

// =============================================================================
// resizer keyboard interactions
// =============================================================================

describe("TeamWorkspaceV2 — resizer keyboard", () => {
  it.each([
    ["ArrowUp", 5],
    ["ArrowDown", -5],
  ] as const)(
    "%s adjusts panel height by ±5",
    async (key, delta) => {
      mockBuilderState.drawer = "matchups";
      mockBuilderState.panelHeightPct = 40;

      const user = userEvent.setup();
      renderWorkspace();

      const resizer = screen.getByRole("separator", { name: /resize analytics panel/i });
      resizer.focus();
      await user.keyboard(`{${key}}`);

      expect(mockBuilderState.setPanelHeightPct).toHaveBeenCalledWith(40 + delta);
    }
  );

  it("Home key sets panel height to 20", async () => {
    mockBuilderState.drawer = "matchups";
    mockBuilderState.panelHeightPct = 60;

    const user = userEvent.setup();
    renderWorkspace();

    const resizer = screen.getByRole("separator", { name: /resize analytics panel/i });
    resizer.focus();
    await user.keyboard("{Home}");

    expect(mockBuilderState.setPanelHeightPct).toHaveBeenCalledWith(20);
  });

  it("End key sets panel height to 80", async () => {
    mockBuilderState.drawer = "matchups";
    mockBuilderState.panelHeightPct = 40;

    const user = userEvent.setup();
    renderWorkspace();

    const resizer = screen.getByRole("separator", { name: /resize analytics panel/i });
    resizer.focus();
    await user.keyboard("{End}");

    expect(mockBuilderState.setPanelHeightPct).toHaveBeenCalledWith(80);
  });
});
