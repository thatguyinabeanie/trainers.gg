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

import {
  type Tables,
  type TablesUpdate,
  type TeamWithPokemon,
} from "@trainers/supabase";

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
    field: {
      doubles: true,
      tailwind: false,
      foesAlive: 2,
      allyAlive: 2,
      atkTera: false,
    },
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
      fields: Partial<TablesUpdate<"pokemon">>
    ) => void;
  }) => (
    <div data-testid={`poke-row-${idx}`} data-sortable-id={sortableId}>
      <span data-testid={`species-${idx}`}>{pokemon?.species ?? "empty"}</span>
      <span data-testid={`nickname-${idx}`}>{pokemon?.nickname ?? ""}</span>
      <button data-testid={`add-${idx}`} onClick={() => onAdd(idx, "Pikachu")}>
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

jest.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

jest.mock("../import-dialog", () => ({
  ImportDialog: ({ open }: { open: boolean }) => (
    <div data-testid="import-dialog" data-open={String(open)} />
  ),
}));

jest.mock("../export-menu", () => ({
  ExportMenu: () => <div data-testid="export-menu" />,
}));

const mockValidate = jest.fn();
let mockValidationErrors: Array<{
  severity: "error" | "warning";
  message: string;
  pokemonId: number;
}> = [];

jest.mock("../validation-hooks", () => ({
  useTeamValidation: () => ({
    errors: mockValidationErrors,
    pokemonErrors: new Map(),
    validate: mockValidate,
  }),
}));

jest.mock("../validation/validation-popover", () => ({
  ValidationPopover: ({
    errors,
  }: {
    errors: unknown[];
    onJumpToPokemon: (id: number) => void;
  }) => <div data-testid="validation-popover" data-count={errors.length} />,
}));

// Controllable drawer state — default closed, tests can override
const mockSetActiveIdx = jest.fn();
const mockSetSideDrawer = jest.fn();
const mockSetRightDrawer = jest.fn();
const mockSetBottomDrawer = jest.fn();
const mockBuilderState = {
  activeIdx: 0,
  setActiveIdx: mockSetActiveIdx,
  sideDrawer: null as "speed" | null,
  setSideDrawer: mockSetSideDrawer,
  rightDrawer: null as "calc" | null,
  setRightDrawer: mockSetRightDrawer,
  bottomDrawer: null as "matchups" | null,
  setBottomDrawer: mockSetBottomDrawer,
  sideWidthPx: 380,
  setSideWidthPx: jest.fn(),
  rightWidthPx: 480,
  setRightWidthPx: jest.fn(),
  field: {
    doubles: true,
    tailwind: false,
    foesAlive: 2,
    allyAlive: 2,
    atkTera: false,
  },
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
const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh, push: mockRouterPush }),
}));

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

// Action mocks — no longer used; workspace now calls persistence.*
// (kept as dead mock to avoid unmocking @/actions/teams which may be
//  transitively imported)
jest.mock("@/actions/teams", () => ({
  updatePokemonAction: jest.fn(),
  addPokemonToTeamAction: jest.fn(),
  removePokemonFromTeamAction: jest.fn(),
  reorderTeamPokemonAction: jest.fn(),
}));

// =============================================================================
// Import AFTER mocks
// =============================================================================

import { TeamWorkspaceV2, type WorkspaceHeaderActions } from "../team-workspace";
import { type BuilderPersistence } from "../persistence/types";

// =============================================================================
// Fixtures
// =============================================================================

const MOCK_PERSISTENCE: BuilderPersistence = {
  mode: "api",
  addPokemon: jest
    .fn()
    .mockResolvedValue({ success: true, data: { pokemonId: 99 } }),
  updatePokemon: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
  removePokemon: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
  reorderPokemon: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
  updateTeam: jest.fn().mockResolvedValue({ success: true, data: undefined }),
  onMutationSuccess: jest.fn(),
};

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

function makeTeam(
  teamPokemon: TeamWithPokemon["team_pokemon"]
): TeamWithPokemon {
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
  const alts = [
    {
      id: 1,
      username: "ash_ketchum",
      user_id: "u1",
      avatar_url: null,
      bio: null,
      is_public: true,
      tier: null,
      tier_expires_at: null,
      tier_started_at: null,
      created_at: null,
      updated_at: null,
    },
  ] as unknown as Tables<"alts">[];
  return render(
    <TeamWorkspaceV2
      team={team}
      format={format}
      alts={alts}
      persistence={MOCK_PERSISTENCE}
      renderHeader={(actions: WorkspaceHeaderActions) => (
        <div data-testid="topbar">
          <button onClick={actions.onOpenImport} data-testid="open-import">
            Import
          </button>
          <button
            onClick={() => actions.onJumpToPokemon(10)}
            data-testid="jump-to-pokemon"
          >
            Jump to 10
          </button>
        </div>
      )}
    />
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
  mockBuilderState.sideDrawer = null;
  mockBuilderState.rightDrawer = null;
  mockBuilderState.bottomDrawer = null;
  mockBuilderState.activeIdx = 0;
  mockBuilderState.attackerSlot = null;
  mockUseIsMobile.mockReturnValue(false);
  mockValidationErrors = [];
  // Default: all persistence methods succeed
  (MOCK_PERSISTENCE.addPokemon as jest.Mock).mockResolvedValue({
    success: true,
    data: { pokemonId: 99 },
  });
  (MOCK_PERSISTENCE.updatePokemon as jest.Mock).mockResolvedValue({
    success: true,
    data: undefined,
  });
  (MOCK_PERSISTENCE.removePokemon as jest.Mock).mockResolvedValue({
    success: true,
    data: undefined,
  });
  (MOCK_PERSISTENCE.reorderPokemon as jest.Mock).mockResolvedValue({
    success: true,
    data: undefined,
  });
  (MOCK_PERSISTENCE.updateTeam as jest.Mock).mockResolvedValue({
    success: true,
    data: undefined,
  });
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
      {
        id: 100,
        pokemon_id: 10,
        team_position: 1,
        pokemon: makePokemon(10, "Pikachu"),
      },
      {
        id: 101,
        pokemon_id: 20,
        team_position: 2,
        pokemon: makePokemon(20, "Raichu"),
      },
      {
        id: 102,
        pokemon_id: 30,
        team_position: 3,
        pokemon: makePokemon(30, "Mewtwo"),
      },
      {
        id: 103,
        pokemon_id: 40,
        team_position: 4,
        pokemon: makePokemon(40, "Mew"),
      },
      {
        id: 104,
        pokemon_id: 50,
        team_position: 5,
        pokemon: makePokemon(50, "Lugia"),
      },
      {
        id: 105,
        pokemon_id: 60,
        team_position: 6,
        pokemon: makePokemon(60, "Ho-Oh"),
      },
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
  it("calls persistence.addPokemon with correct position (1-indexed) on success", async () => {
    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("add-2")); // slot index 2 → position 3

    await waitFor(() => {
      expect(MOCK_PERSISTENCE.addPokemon).toHaveBeenCalledWith(
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

  it("shows a success toast and calls onMutationSuccess on add success", async () => {
    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("add-0"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining("added to slot 1")
      );
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("renders the new pokemon in the slot optimistically before persistence resolves", async () => {
    const { promise, resolve } = deferred<{
      success: true;
      data: { pokemonId: number };
    }>();
    (MOCK_PERSISTENCE.addPokemon as jest.Mock).mockImplementationOnce(
      () => promise
    );

    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    expect(screen.getByTestId("species-0")).toHaveTextContent("empty");

    await user.click(screen.getByTestId("add-0"));

    await waitFor(() => {
      expect(screen.getByTestId("species-0")).toHaveTextContent("Pikachu");
    });
    expect(MOCK_PERSISTENCE.onMutationSuccess).not.toHaveBeenCalled();

    resolve({ success: true, data: { pokemonId: 99 } });
    await waitFor(() => {
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("shows an error toast on add failure", async () => {
    (MOCK_PERSISTENCE.addPokemon as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: "Slot is full.",
    });

    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("add-0"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Slot is full.");
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("falls back to generic add error message when error field is missing", async () => {
    (MOCK_PERSISTENCE.addPokemon as jest.Mock).mockResolvedValueOnce({
      success: false,
    });

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
  it("calls persistence.removePokemon when remove is clicked", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));

    await waitFor(() => {
      expect(MOCK_PERSISTENCE.removePokemon).toHaveBeenCalledWith(1, 10);
    });
  });

  it("shows success toast and calls onMutationSuccess after successful removal", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Pokémon removed.");
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("empties the slot optimistically before persistence resolves", async () => {
    const { promise, resolve } = deferred<{
      success: true;
      data: undefined;
    }>();
    (MOCK_PERSISTENCE.removePokemon as jest.Mock).mockImplementationOnce(
      () => promise
    );

    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.getByTestId("species-0")).toHaveTextContent("Garchomp");

    await user.click(screen.getByTestId("remove-0"));

    await waitFor(() => {
      expect(screen.getByTestId("species-0")).toHaveTextContent("empty");
    });
    expect(MOCK_PERSISTENCE.onMutationSuccess).not.toHaveBeenCalled();

    resolve({ success: true, data: undefined });
    await waitFor(() => {
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("shows error toast on removal failure", async () => {
    (MOCK_PERSISTENCE.removePokemon as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: "Permission denied.",
    });

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Permission denied.");
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("falls back to generic remove error message when error field is missing", async () => {
    (MOCK_PERSISTENCE.removePokemon as jest.Mock).mockResolvedValueOnce({
      success: false,
    });

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("remove-0"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to remove Pokémon.");
    });
  });

  it("does nothing when remove is clicked on an empty slot", async () => {
    const user = userEvent.setup();
    renderWorkspace(EMPTY_TEAM);

    await user.click(screen.getByTestId("remove-0"));

    await waitFor(() => {
      expect(MOCK_PERSISTENCE.removePokemon).not.toHaveBeenCalled();
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
    expect(MOCK_PERSISTENCE.updatePokemon).not.toHaveBeenCalled();
  });

  it("remove on a pending placeholder is skipped and shows an info toast", async () => {
    const user = userEvent.setup();
    renderWorkspace(PENDING_TEAM);

    await user.click(screen.getByTestId("remove-0"));

    await waitFor(() => {
      expect(mockToastInfo).toHaveBeenCalledWith(
        expect.stringContaining("Still saving")
      );
    });
    expect(MOCK_PERSISTENCE.removePokemon).not.toHaveBeenCalled();
  });
});

// =============================================================================
// optimistic update + rollback
// =============================================================================

describe("TeamWorkspaceV2 — optimistic update flow", () => {
  it("calls persistence.updatePokemon with the team id, pokemon id, and patch fields", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("update-0")); // updates pokemon id 10

    await waitFor(() => {
      expect(MOCK_PERSISTENCE.updatePokemon).toHaveBeenCalledWith(1, 10, {
        nickname: "Sparky",
      });
    });
  });

  it("renders the patched field optimistically before persistence resolves", async () => {
    const { promise, resolve } = deferred<{ success: true; data: undefined }>();
    (MOCK_PERSISTENCE.updatePokemon as jest.Mock).mockImplementationOnce(
      () => promise
    );

    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.getByTestId("nickname-0")).toHaveTextContent("");

    await user.click(screen.getByTestId("update-0"));

    await waitFor(() => {
      expect(screen.getByTestId("nickname-0")).toHaveTextContent("Sparky");
    });
    expect(MOCK_PERSISTENCE.onMutationSuccess).not.toHaveBeenCalled();

    resolve({ success: true, data: undefined });
    await waitFor(() => {
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("toasts on update failure", async () => {
    (MOCK_PERSISTENCE.updatePokemon as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: "Validation failed.",
    });

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByTestId("update-0"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Validation failed.");
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("falls back to a generic message when the failure shape omits an error string", async () => {
    (MOCK_PERSISTENCE.updatePokemon as jest.Mock).mockResolvedValueOnce({
      success: false,
    });

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
  it("renders the heatmap panel when bottomDrawer is 'matchups'", () => {
    mockBuilderState.bottomDrawer = "matchups";

    renderWorkspace();

    expect(screen.getByTestId("heatmap-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("speed-tiers-panel")).not.toBeInTheDocument();
  });

  it("renders the speed tiers panel when sideDrawer is 'speed'", () => {
    mockBuilderState.sideDrawer = "speed";

    renderWorkspace();

    expect(screen.getByTestId("speed-tiers-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("heatmap-panel")).not.toBeInTheDocument();
  });

  it("renders the calc bottom panel when rightDrawer is 'calc' on desktop", () => {
    mockBuilderState.rightDrawer = "calc";
    mockUseIsMobile.mockReturnValue(false);

    renderWorkspace();

    expect(screen.getByTestId("calc-bottom-panel")).toBeInTheDocument();
  });

  it("renders calc bottom panel on mobile when rightDrawer is 'calc'", () => {
    mockBuilderState.rightDrawer = "calc";
    mockUseIsMobile.mockReturnValue(true);

    renderWorkspace();

    expect(screen.getByTestId("calc-bottom-panel")).toBeInTheDocument();
  });

  it("renders no panel when all drawers are null", () => {
    mockBuilderState.sideDrawer = null;
    mockBuilderState.rightDrawer = null;
    mockBuilderState.bottomDrawer = null;

    renderWorkspace();

    expect(screen.queryByTestId("heatmap-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("speed-tiers-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("calc-bottom-panel")).not.toBeInTheDocument();
  });

  it("shows 'Speed Tiers' header when speed drawer is open", () => {
    mockBuilderState.sideDrawer = "speed";

    renderWorkspace();

    expect(screen.getByText("Speed Tiers")).toBeInTheDocument();
  });

  it("close button in side panel header calls setSideDrawer(null)", async () => {
    mockBuilderState.sideDrawer = "speed";

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(
      screen.getByRole("button", { name: /close speed tiers/i })
    );

    expect(mockSetSideDrawer).toHaveBeenCalledWith(null);
  });
});

// =============================================================================
// resizer — side panel
// =============================================================================

describe("TeamWorkspaceV2 — side panel resizer", () => {
  it("renders a resize handle when side drawer is open", () => {
    mockBuilderState.sideDrawer = "speed";

    renderWorkspace();

    // The resizable handle is rendered between the side panel and editor
    expect(screen.getAllByTestId("resizable-handle").length).toBeGreaterThan(0);
  });
});

// =============================================================================
// transferTeam / onAltChange
// =============================================================================

describe("TeamWorkspaceV2 — alt transfer", () => {
  const MULTI_ALT_LIST = [
    {
      id: 1,
      username: "ash_ketchum",
      user_id: "u1",
      avatar_url: null,
      bio: null,
      is_public: true,
      tier: null,
      tier_expires_at: null,
      tier_started_at: null,
      created_at: null,
      updated_at: null,
    },
    {
      id: 2,
      username: "gary_oak",
      user_id: "u1",
      avatar_url: null,
      bio: null,
      is_public: true,
      tier: null,
      tier_expires_at: null,
      tier_started_at: null,
      created_at: null,
      updated_at: null,
    },
  ] as unknown as Tables<"alts">[];

  function renderWithTransfer() {
    const mockTransferTeam = jest.fn().mockResolvedValue({
      success: true,
      data: undefined,
    });
    const persistence: BuilderPersistence = {
      ...MOCK_PERSISTENCE,
      transferTeam: mockTransferTeam,
    };
    render(
      <TeamWorkspaceV2
        team={TWO_POKEMON_TEAM}
        format={undefined}
        alts={MULTI_ALT_LIST}
        persistence={persistence}
        renderHeader={(actions: WorkspaceHeaderActions) => (
          <div data-testid="topbar">
            <button onClick={actions.onOpenImport} data-testid="open-import">
              Import
            </button>
          </div>
        )}
      />
    );
    return { mockTransferTeam };
  }

  it("calls transferTeam and pushes to the new alt URL on success", async () => {
    const user = userEvent.setup();
    const { mockTransferTeam } = renderWithTransfer();

    // Find the alt select dropdown (contains alt usernames, not formats)
    const altSelect = screen.getAllByRole("combobox").find((el) =>
      el.querySelector('option[value="1"]')?.textContent?.includes("ash_ketchum")
    )!;
    await user.selectOptions(altSelect, "2");

    expect(mockTransferTeam).toHaveBeenCalledWith(1, 2);
    expect(mockRouterPush).toHaveBeenCalledWith(
      "/dashboard/alts/gary_oak/teams/1"
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Team transferred to gary_oak."
    );
  });

  it("shows error toast when transferTeam fails", async () => {
    const user = userEvent.setup();
    const mockTransferTeam = jest.fn().mockResolvedValue({
      success: false,
      error: "Transfer denied",
    });
    const persistence: BuilderPersistence = {
      ...MOCK_PERSISTENCE,
      transferTeam: mockTransferTeam,
    };
    render(
      <TeamWorkspaceV2
        team={TWO_POKEMON_TEAM}
        format={undefined}
        alts={MULTI_ALT_LIST}
        persistence={persistence}
        renderHeader={(actions: WorkspaceHeaderActions) => (
          <div data-testid="topbar">
            <button onClick={actions.onOpenImport} data-testid="open-import">
              Import
            </button>
          </div>
        )}
      />
    );

    const altSelect = screen.getAllByRole("combobox").find((el) =>
      el.querySelector('option[value="1"]')?.textContent?.includes("ash_ketchum")
    )!;
    await user.selectOptions(altSelect, "2");

    expect(mockTransferTeam).toHaveBeenCalledWith(1, 2);
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith("Transfer denied");
  });
});

// =============================================================================
// Mobile header row — team name + validate
// =============================================================================

describe("TeamWorkspaceV2 — mobile header row", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(true);
  });

  it("renders the team name in the content area on mobile", () => {
    renderWorkspace();
    const nameBtn = screen.getByRole("button", { name: /edit team name/i });
    expect(nameBtn).toBeInTheDocument();
    expect(nameBtn).toHaveTextContent("Test Team");
  });

  it("renders the Validate button in the content area on mobile", () => {
    renderWorkspace();
    expect(screen.getByRole("button", { name: /validate/i })).toBeInTheDocument();
  });

  it("calls validate when the mobile Validate popover is opened", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /validate/i }));

    expect(mockValidate).toHaveBeenCalled();
  });

  it("calls persistence.updateTeam with new name when team name is saved", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /edit team name/i }));
    const input = screen.getByRole("textbox", { name: /team name/i });
    await user.clear(input);
    await user.type(input, "My Renamed Team");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(MOCK_PERSISTENCE.updateTeam).toHaveBeenCalledWith(1, {
        name: "My Renamed Team",
      });
    });
  });

  it("calls persistence.onMutationSuccess after a successful rename", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /edit team name/i }));
    const input = screen.getByRole("textbox", { name: /team name/i });
    await user.clear(input);
    await user.type(input, "Renamed Team");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(MOCK_PERSISTENCE.onMutationSuccess).toHaveBeenCalled();
    });
  });

  it("shows error toast when rename fails", async () => {
    (MOCK_PERSISTENCE.updateTeam as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: "Name is too long.",
    });

    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: /edit team name/i }));
    const input = screen.getByRole("textbox", { name: /team name/i });
    await user.clear(input);
    await user.type(input, "A Very Long Team Name That Fails Validation");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Name is too long.");
    });
  });

  it("applies error styling to Validate button when there are validation errors", () => {
    mockValidationErrors = [
      { severity: "error", message: "Invalid move", pokemonId: 10 },
    ];
    renderWorkspace();
    const validateBtn = screen.getByRole("button", { name: /validate/i });
    expect(validateBtn).toHaveClass("text-destructive");
  });

  it("applies warning styling to Validate button when there are only warnings", () => {
    mockValidationErrors = [
      { severity: "warning", message: "Unusual item", pokemonId: 10 },
    ];
    renderWorkspace();
    const validateBtn = screen.getByRole("button", { name: /validate/i });
    expect(validateBtn).toHaveClass("text-amber-600");
  });
});
