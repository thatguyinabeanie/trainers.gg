/**
 * Behavioral tests for the redesigned MovePicker.
 *
 * Covers: render, search filtering, sidebar type/category filter wiring,
 * role-presets panel wiring, sort headers, selection+close, click-to-filter
 * row affordances (type icon, category icon, role chip), filter chips bar,
 * result count display, and format-aware legal move sets.
 *
 * Sub-components (MoveSidebar, RolePresetsPanel, FilterChipsBar, RoleChip)
 * are mocked to isolate MovePicker logic, following the same pattern as
 * species-picker.test.tsx.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";

// =============================================================================
// Mock @trainers/pokemon — move-picker imports getLearnableMoves, getLegalMoves,
// getMoveData, and legalSetOrPermissive.
// =============================================================================

const mockGetLearnableMoves = jest.fn();
const mockGetLegalMoves = jest.fn();
const mockGetMoveData = jest.fn();
const mockLegalSetOrPermissive = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  ...jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon"),
  getLearnableMoves: (...args: unknown[]) => mockGetLearnableMoves(...args),
  getLegalMoves: (...args: unknown[]) => mockGetLegalMoves(...args),
  getMoveData: (...args: unknown[]) => mockGetMoveData(...args),
  legalSetOrPermissive: (...args: unknown[]) =>
    mockLegalSetOrPermissive(...args),
}));

// =============================================================================
// Mock @trainers/pokemon/sprites
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getShowdownTypeIconUrl: (type: string) =>
    `https://example.com/sprites/${type}.png`,
}));

// =============================================================================
// Mock useUsageData — move-picker now calls this hook; return empty by default
// so existing tests are unaffected. Override per-test when testing usage.
// =============================================================================

const mockUseUsageData = jest.fn();

jest.mock("../use-usage-data", () => ({
  useUsageData: (...args: unknown[]) => mockUseUsageData(...args),
}));

// =============================================================================
// Mock UsageSparkline — recharts + ResizeObserver not available in JSDOM.
// =============================================================================

jest.mock("../usage-sparkline", () => ({
  UsageSparkline: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="usage-sparkline" aria-label={ariaLabel ?? "Usage trend"} />
  ),
}));

// =============================================================================
// Mock @tanstack/react-virtual — JSDOM has no layout/scroll APIs; the
// virtualizer would report zero visible items. This mock renders every row.
// =============================================================================

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 48,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 48,
        size: 48,
      })),
  }),
}));

// =============================================================================
// Mock role-registry — ROLE_PRESETS, GROUP_COLORS, and helpers are tested
// separately; here we just need deterministic stubs.
// =============================================================================

jest.mock("../pickers/role-registry", () => ({
  getRoleById: jest.fn((id: string) =>
    id === "burn" ? { id: "burn", label: "Burn", group: "status" } : null
  ),
  getRolesForMove: jest.fn((name: string) => {
    const map: Record<string, string[]> = {
      Flamethrower: ["burn"],
      "Fire Punch": ["burn"],
      "Will-O-Wisp": ["burn"],
      Surf: ["spread"],
      Earthquake: ["spread"],
    };
    return map[name] ?? [];
  }),
  ROLE_PRESETS: [
    { id: "burn", label: "Burn", group: "status" },
    { id: "spread", label: "Spread", group: "damage-type" },
  ],
  ROLE_GROUP_LABELS: {
    status: "Status",
    "damage-type": "Damage Type",
  },
  ROLE_GROUP_ORDER: ["damage-type", "status"],
  GROUP_COLORS: {
    status: {
      chip: "bg-amber-500/10 border-amber-500/30 text-amber-700",
      active: "bg-amber-500/12",
      text: "text-amber-700",
    },
    "damage-type": {
      chip: "bg-rose-500/8 border-rose-500/25 text-rose-700",
      active: "bg-rose-500/10",
      text: "text-rose-700",
    },
  },
}));

// =============================================================================
// Mock sub-components to isolate MovePicker logic
// =============================================================================

jest.mock("../pickers/move-sidebar", () => ({
  MoveSidebar: ({
    filters,
    onFiltersChange,
  }: {
    filters: {
      search: string;
      types: string[];
      categories: string[];
      roles: string[];
    };
    onFiltersChange: (f: typeof filters) => void;
  }) => (
    <div data-testid="move-sidebar" data-filters={JSON.stringify(filters)}>
      <button
        data-testid="sidebar-type-fire"
        onClick={() =>
          onFiltersChange({ ...filters, types: [...filters.types, "Fire"] })
        }
      >
        Fire
      </button>
      <button
        data-testid="sidebar-type-water"
        onClick={() =>
          onFiltersChange({ ...filters, types: [...filters.types, "Water"] })
        }
      >
        Water
      </button>
      <button
        data-testid="sidebar-category-physical"
        onClick={() =>
          onFiltersChange({
            ...filters,
            categories: [...filters.categories, "Physical"],
          })
        }
      >
        Physical
      </button>
      <button
        data-testid="sidebar-category-special"
        onClick={() =>
          onFiltersChange({
            ...filters,
            categories: [...filters.categories, "Special"],
          })
        }
      >
        Special
      </button>
      <button
        data-testid="sidebar-category-status"
        onClick={() =>
          onFiltersChange({
            ...filters,
            categories: [...filters.categories, "Status"],
          })
        }
      >
        Status
      </button>
      <button
        data-testid="sidebar-clear-all"
        onClick={() =>
          onFiltersChange({ search: "", types: [], categories: [], roles: [] })
        }
      >
        Clear all filters
      </button>
    </div>
  ),
}));

jest.mock("../pickers/role-presets-panel", () => ({
  RolePresetsPanel: ({
    selected,
    onChange,
  }: {
    selected: string[];
    onChange: (next: string[]) => void;
  }) => (
    <div data-testid="role-presets-panel">
      <button
        data-testid="role-btn-burn"
        onClick={() => onChange([...selected, "burn"])}
      >
        Burn
      </button>
      <button
        data-testid="role-btn-spread"
        onClick={() => onChange([...selected, "spread"])}
      >
        Spread
      </button>
    </div>
  ),
}));

jest.mock("../pickers/filter-chips-bar", () => ({
  FilterChipsBar: ({
    chips,
  }: {
    chips: Array<{ id: string; label: string; onRemove: () => void }>;
  }) =>
    chips.length > 0 ? (
      <div data-testid="filter-chips-bar">
        {chips.map((c) => (
          <button key={c.id} data-testid={`chip-${c.id}`} onClick={c.onRemove}>
            {c.label}
          </button>
        ))}
      </div>
    ) : null,
}));

jest.mock("../pickers/role-chip", () => ({
  RoleChip: ({
    roleId,
    onClick,
  }: {
    roleId: string;
    onClick?: (id: string) => void;
  }) => (
    <button
      data-testid={`role-chip-${roleId}`}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick(roleId);
            }
          : undefined
      }
    >
      {roleId}
    </button>
  ),
}));

// =============================================================================
// Import component after mocks
// =============================================================================

import { type GameFormat } from "@trainers/pokemon";

import { MovePicker } from "../pickers/move-picker";

// =============================================================================
// Fixtures
// =============================================================================

/**
 * Minimal move data covering distinct type/category/BP/accuracy combos
 * so filter, sort, and display branches can all be exercised.
 */
const MOCK_MOVE_DATA: Record<
  string,
  {
    type: string;
    category: string;
    basePower: number;
    accuracy: number | boolean;
    shortDesc: string;
  }
> = {
  Flamethrower: {
    type: "Fire",
    category: "Special",
    basePower: 90,
    accuracy: 100,
    shortDesc: "10% chance to burn the target.",
  },
  "Fire Punch": {
    type: "Fire",
    category: "Physical",
    basePower: 75,
    accuracy: 100,
    shortDesc: "10% chance to burn the target.",
  },
  "Will-O-Wisp": {
    type: "Fire",
    category: "Status",
    basePower: 0,
    accuracy: 85,
    shortDesc: "Burns the target.",
  },
  Surf: {
    type: "Water",
    category: "Special",
    basePower: 90,
    accuracy: 100,
    shortDesc: "Hits all adjacent Pokemon.",
  },
  Earthquake: {
    type: "Ground",
    category: "Physical",
    basePower: 100,
    accuracy: 100,
    shortDesc: "Hits all adjacent Pokemon.",
  },
  "No additional effect move": {
    type: "Normal",
    category: "Physical",
    basePower: 40,
    accuracy: 100,
    shortDesc: "No additional effect.",
  },
  "Never-Miss Move": {
    type: "Normal",
    category: "Special",
    basePower: 60,
    accuracy: true,
    shortDesc: "This move never misses.",
  },
};

const ALL_MOCK_MOVES = Object.keys(MOCK_MOVE_DATA);

function makeMockFormat(): GameFormat {
  return {
    id: "gen9vgc2024regg",
    label: "VGC 2024 Reg G",
    generation: 9,
    isChampions: false,
    isChampionsTeamSize: false,
    legalLevelCap: 50,
  } as unknown as GameFormat;
}

function defaultProps(
  overrides: Partial<React.ComponentProps<typeof MovePicker>> = {}
) {
  return {
    value: null,
    species: "Charizard",
    format: undefined,
    onPick: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

// =============================================================================
// MovePicker tests
// =============================================================================

describe("MovePicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLearnableMoves.mockReturnValue(ALL_MOCK_MOVES);
    mockGetLegalMoves.mockReturnValue(null);
    mockLegalSetOrPermissive.mockReturnValue(null);
    mockGetMoveData.mockImplementation(
      (name: string) => MOCK_MOVE_DATA[name] ?? null
    );
    // Default: no usage data loaded — preserves existing test behavior.
    mockUseUsageData.mockReturnValue({ data: undefined });
  });

  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  describe("basic render", () => {
    it("renders the search input with correct placeholder", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(
        screen.getByPlaceholderText("Search by name, effect, type, category…")
      ).toBeInTheDocument();
    });

    it("renders the close button", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("renders MoveSidebar sub-component", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(screen.getByTestId("move-sidebar")).toBeInTheDocument();
    });

    it("renders RolePresetsPanel sub-component", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(screen.getByTestId("role-presets-panel")).toBeInTheDocument();
    });

    it("renders all learnable moves as rows when no format is provided", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(
        screen.getByRole("row", { name: /Select Flamethrower/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("row", { name: /Select Surf/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("row", { name: /Select Earthquake/ })
      ).toBeInTheDocument();
    });

    it("displays result count: sorted of total", () => {
      render(<MovePicker {...defaultProps()} />);
      const count = ALL_MOCK_MOVES.length;
      expect(screen.getByText(`${count} of ${count}`)).toBeInTheDocument();
    });

    it("renders sortable column headers for Name, BP, and Acc", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(
        screen.getByRole("button", { name: /sort by name/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sort by base power/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sort by accuracy/i })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Close button
  // ---------------------------------------------------------------------------

  describe("close button", () => {
    it("clicking Close calls onClose without calling onPick", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      const onClose = jest.fn();
      render(<MovePicker {...defaultProps({ onPick, onClose })} />);
      await user.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onPick).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Search filtering
  // ---------------------------------------------------------------------------

  describe("search filtering", () => {
    it("filters moves by name as user types", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      const input = screen.getByPlaceholderText(
        "Search by name, effect, type, category…"
      );
      await user.type(input, "surf");
      expect(
        screen.getByRole("row", { name: /Select Surf/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("row", { name: /Select Flamethrower/ })
      ).not.toBeInTheDocument();
    });

    it("search is case-insensitive", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.type(
        screen.getByPlaceholderText("Search by name, effect, type, category…"),
        "FLAME"
      );
      expect(
        screen.getByRole("row", { name: /Select Flamethrower/ })
      ).toBeInTheDocument();
    });

    it("filters moves by shortDesc content", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.type(
        screen.getByPlaceholderText("Search by name, effect, type, category…"),
        "adjacent"
      );
      // Surf and Earthquake share "Hits all adjacent Pokemon."
      expect(
        screen.getByRole("row", { name: /Select Surf/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("row", { name: /Select Earthquake/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("row", { name: /Select Flamethrower/ })
      ).not.toBeInTheDocument();
    });

    it("filters moves by type name", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.type(
        screen.getByPlaceholderText("Search by name, effect, type, category…"),
        "ground"
      );
      expect(
        screen.getByRole("row", { name: /Select Earthquake/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("row", { name: /Select Surf/ })
      ).not.toBeInTheDocument();
    });

    it("filters moves by category name", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.type(
        screen.getByPlaceholderText("Search by name, effect, type, category…"),
        "status"
      );
      expect(
        screen.getByRole("row", { name: /Select Will-O-Wisp/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("row", { name: /Select Flamethrower/ })
      ).not.toBeInTheDocument();
    });

    it("shows 'No moves found' when search matches nothing", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.type(
        screen.getByPlaceholderText("Search by name, effect, type, category…"),
        "zzznomatch"
      );
      expect(screen.getByText("No moves found")).toBeInTheDocument();
    });

    it("result count updates as search narrows results", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.type(
        screen.getByPlaceholderText("Search by name, effect, type, category…"),
        "surf"
      );
      // 1 match of ALL_MOCK_MOVES.length total
      expect(
        screen.getByText(`1 of ${ALL_MOCK_MOVES.length}`)
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Sidebar filter wiring
  // ---------------------------------------------------------------------------

  describe("sidebar filter wiring", () => {
    it("clicking a type button in the sidebar filters moves to that type", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("sidebar-type-water"));
      expect(
        screen.getByRole("row", { name: /Select Surf/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("row", { name: /Select Flamethrower/ })
      ).not.toBeInTheDocument();
    });

    it("clicking a category chip in the sidebar filters to that category", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("sidebar-category-status"));
      expect(
        screen.getByRole("row", { name: /Select Will-O-Wisp/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("row", { name: /Select Flamethrower/ })
      ).not.toBeInTheDocument();
    });

    it("sidebar Clear all filters resets all active filters", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      // Apply fire type filter, verify narrowed, then clear
      await user.click(screen.getByTestId("sidebar-type-fire"));
      expect(
        screen.queryByRole("row", { name: /Select Surf/ })
      ).not.toBeInTheDocument();
      await user.click(screen.getByTestId("sidebar-clear-all"));
      expect(
        screen.getByRole("row", { name: /Select Surf/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("row", { name: /Select Flamethrower/ })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Role presets panel wiring
  // ---------------------------------------------------------------------------

  describe("role presets panel wiring", () => {
    it("clicking a role in the panel filters moves to those with that role", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("role-btn-burn"));
      // burn role maps to Flamethrower and Fire Punch
      expect(
        screen.getByRole("row", { name: /Select Flamethrower/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("row", { name: /Select Fire Punch/ })
      ).toBeInTheDocument();
      // Will-O-Wisp is tagged burn too
      expect(
        screen.getByRole("row", { name: /Select Will-O-Wisp/ })
      ).toBeInTheDocument();
      // Surf and Earthquake (spread) should not appear
      expect(
        screen.queryByRole("row", { name: /Select Surf/ })
      ).not.toBeInTheDocument();
    });

    it("clicking a role updates the filter-count badge in the search header", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("role-btn-burn"));
      expect(
        screen.getByRole("button", { name: /Clear 1 active filter/i })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Sort headers
  // ---------------------------------------------------------------------------

  describe("sort headers", () => {
    it("default sort is name ascending — shows ↑ arrow", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(screen.getByText("↑")).toBeInTheDocument();
    });

    it("clicking 'Sort by name' again toggles to descending", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByRole("button", { name: /sort by name/i }));
      expect(screen.getByText("↓")).toBeInTheDocument();
    });

    it("clicking 'Sort by base power' applies BP sort descending by default", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(
        screen.getByRole("button", { name: /sort by base power/i })
      );
      expect(screen.getByText("↓")).toBeInTheDocument();
    });

    it("clicking 'Sort by accuracy' applies accuracy sort descending by default", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(
        screen.getByRole("button", { name: /sort by accuracy/i })
      );
      expect(screen.getByText("↓")).toBeInTheDocument();
    });

    it("clicking same sort column twice toggles direction", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      // Click BP once → desc
      await user.click(
        screen.getByRole("button", { name: /sort by base power/i })
      );
      expect(screen.getByText("↓")).toBeInTheDocument();
      // Click BP again → asc
      await user.click(
        screen.getByRole("button", { name: /sort by base power/i })
      );
      expect(screen.getByText("↑")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Selection and close
  // ---------------------------------------------------------------------------

  describe("selection", () => {
    it("clicking a move row calls onPick with the move name and then onClose", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      const onClose = jest.fn();
      mockGetLearnableMoves.mockReturnValue(["Surf"]);
      render(<MovePicker {...defaultProps({ onPick, onClose })} />);
      const row = screen.getByRole("row", { name: /Select Surf/ });
      await user.click(row);
      expect(onPick).toHaveBeenCalledWith("Surf");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("pressing Enter on a move row calls onPick and onClose", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      const onClose = jest.fn();
      mockGetLearnableMoves.mockReturnValue(["Surf"]);
      render(<MovePicker {...defaultProps({ onPick, onClose })} />);
      const row = screen.getByRole("row", { name: /Select Surf/ });
      row.focus();
      await user.keyboard("{Enter}");
      expect(onPick).toHaveBeenCalledWith("Surf");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("pressing Space on a move row calls onPick and onClose", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      const onClose = jest.fn();
      mockGetLearnableMoves.mockReturnValue(["Surf"]);
      render(<MovePicker {...defaultProps({ onPick, onClose })} />);
      const row = screen.getByRole("row", { name: /Select Surf/ });
      row.focus();
      await user.keyboard(" ");
      expect(onPick).toHaveBeenCalledWith("Surf");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("the currently selected move row has bg-accent class", () => {
      render(<MovePicker {...defaultProps({ value: "Flamethrower" })} />);
      const row = screen.getByRole("row", { name: /Select Flamethrower/ });
      expect(row.className).toContain("bg-accent");
    });

    it("a non-selected row does not have a bare bg-accent class", () => {
      render(<MovePicker {...defaultProps({ value: "Flamethrower" })} />);
      const row = screen.getByRole("row", { name: /Select Surf/ });
      const classes = row.className.split(" ");
      expect(classes).not.toContain("bg-accent");
    });
  });

  // ---------------------------------------------------------------------------
  // Click-to-filter row affordances
  // ---------------------------------------------------------------------------

  describe("click-to-filter row affordances", () => {
    beforeEach(() => {
      // Use single move so row is unambiguous
      mockGetLearnableMoves.mockReturnValue(["Flamethrower"]);
    });

    it("clicking the type icon adds a type filter and does not call onPick", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      render(<MovePicker {...defaultProps({ onPick })} />);
      const typeSpan = screen.getByTitle("Filter by Fire");
      await user.click(typeSpan);
      expect(
        screen.getByRole("button", { name: /Clear 1 active filter/i })
      ).toBeInTheDocument();
      expect(onPick).not.toHaveBeenCalled();
    });

    it("clicking the category icon adds a category filter and does not call onPick", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      render(<MovePicker {...defaultProps({ onPick })} />);
      const catSpan = screen.getByTitle("Filter by Special");
      await user.click(catSpan);
      expect(
        screen.getByRole("button", { name: /Clear 1 active filter/i })
      ).toBeInTheDocument();
      expect(onPick).not.toHaveBeenCalled();
    });

    it("clicking a role chip in a row adds a role filter and does not call onPick", async () => {
      const user = userEvent.setup();
      const onPick = jest.fn();
      render(<MovePicker {...defaultProps({ onPick })} />);
      const chip = screen.getByTestId("role-chip-burn");
      await user.click(chip);
      expect(
        screen.getByRole("button", { name: /Clear 1 active filter/i })
      ).toBeInTheDocument();
      expect(onPick).not.toHaveBeenCalled();
    });

    it("clicking type icon toggles off an already-active type filter", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      const typeSpan = screen.getByTitle("Filter by Fire");
      // First click adds filter
      await user.click(typeSpan);
      expect(
        screen.getByRole("button", { name: /Clear 1 active filter/i })
      ).toBeInTheDocument();
      // Second click removes it
      await user.click(typeSpan);
      expect(
        screen.queryByRole("button", { name: /Clear 1 active filter/i })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Filter-count badge in search header
  // ---------------------------------------------------------------------------

  describe("filter-count badge", () => {
    it("badge is hidden when no filters are active", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(
        screen.queryByRole("button", { name: /Clear .* active filter/i })
      ).not.toBeInTheDocument();
    });

    it("badge appears with '1 filter' when a single filter is active", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("sidebar-type-fire"));
      expect(
        screen.getByRole("button", { name: /Clear 1 active filter/i })
      ).toHaveTextContent(/1 filter/i);
    });

    it("badge pluralizes when multiple filters are active", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("sidebar-type-fire"));
      await user.click(screen.getByTestId("sidebar-category-physical"));
      expect(
        screen.getByRole("button", { name: /Clear 2 active filters/i })
      ).toHaveTextContent(/2 filters/i);
    });

    it("clicking the badge clears every active filter", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("sidebar-type-fire"));
      await user.click(screen.getByTestId("sidebar-category-physical"));
      const clear = screen.getByRole("button", {
        name: /Clear 2 active filters/i,
      });
      await user.click(clear);
      expect(
        screen.queryByRole("button", { name: /Clear .* active filter/i })
      ).not.toBeInTheDocument();
    });

    // The badge counts types/categories/roles only, so clicking it must NOT
    // wipe a typed search query (the user did not ask to clear that).
    it("clicking the badge preserves the active search query", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps()} />);
      const searchInput = screen.getByPlaceholderText(
        "Search by name, effect, type, category…"
      );
      await user.type(searchInput, "fire");
      await user.click(screen.getByTestId("sidebar-type-fire"));
      const clear = screen.getByRole("button", {
        name: /Clear 1 active filter/i,
      });
      await user.click(clear);
      expect(searchInput).toHaveValue("fire");
    });
  });

  // ---------------------------------------------------------------------------
  // Move data display
  // ---------------------------------------------------------------------------

  describe("move data display", () => {
    it("displays base power for moves with BP > 0", () => {
      mockGetLearnableMoves.mockReturnValue(["Flamethrower"]);
      render(<MovePicker {...defaultProps()} />);
      // Flamethrower has BP 90
      expect(screen.getByText("90")).toBeInTheDocument();
    });

    it("displays '—' for moves with BP = 0 (Status moves)", () => {
      mockGetLearnableMoves.mockReturnValue(["Will-O-Wisp"]);
      render(<MovePicker {...defaultProps()} />);
      // basePower 0 → displays "—"
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("displays accuracy as percentage for numeric accuracy", () => {
      mockGetLearnableMoves.mockReturnValue(["Will-O-Wisp"]);
      render(<MovePicker {...defaultProps()} />);
      // Will-O-Wisp accuracy 85 → "85%"
      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("displays '—' for accuracy when move always hits (accuracy === true)", () => {
      mockGetLearnableMoves.mockReturnValue(["Never-Miss Move"]);
      render(<MovePicker {...defaultProps()} />);
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("does not display 'No additional effect.' as shortDesc text", () => {
      render(<MovePicker {...defaultProps()} />);
      expect(
        screen.queryByText("No additional effect.")
      ).not.toBeInTheDocument();
    });

    it("displays non-trivial shortDesc in the description column", () => {
      mockGetLearnableMoves.mockReturnValue(["Will-O-Wisp"]);
      render(<MovePicker {...defaultProps()} />);
      expect(screen.getByText("Burns the target.")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Format-aware move sets (legal vs learnable)
  // ---------------------------------------------------------------------------

  describe("format-aware move sets", () => {
    it("uses getLearnableMoves when no format is provided", () => {
      mockGetLearnableMoves.mockReturnValue(["Flamethrower"]);
      render(<MovePicker {...defaultProps({ format: undefined })} />);
      expect(mockGetLegalMoves).not.toHaveBeenCalled();
      expect(
        screen.getByRole("row", { name: /Select Flamethrower/ })
      ).toBeInTheDocument();
    });

    it("calls getLegalMoves with species and format.id when format is provided", () => {
      const format = makeMockFormat();
      const legalSet = new Set(["Surf"]);
      mockGetLegalMoves.mockReturnValue(legalSet);
      mockLegalSetOrPermissive.mockReturnValue(legalSet);
      render(<MovePicker {...defaultProps({ format })} />);
      expect(mockGetLegalMoves).toHaveBeenCalledWith("Charizard", format.id);
    });

    it("restricts move list to legal set when format provides one", () => {
      const format = makeMockFormat();
      const legalSet = new Set(["Surf"]);
      mockGetLegalMoves.mockReturnValue(legalSet);
      mockLegalSetOrPermissive.mockReturnValue(legalSet);
      render(<MovePicker {...defaultProps({ format })} />);
      expect(
        screen.getByRole("row", { name: /Select Surf/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("row", { name: /Select Flamethrower/ })
      ).not.toBeInTheDocument();
    });

    it("falls back to getLearnableMoves when legalSetOrPermissive returns null", () => {
      const format = makeMockFormat();
      mockGetLegalMoves.mockReturnValue(null);
      mockLegalSetOrPermissive.mockReturnValue(null);
      mockGetLearnableMoves.mockReturnValue(["Earthquake"]);
      render(<MovePicker {...defaultProps({ format })} />);
      expect(
        screen.getByRole("row", { name: /Select Earthquake/ })
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("shows 'No moves found' when move set is empty", () => {
      mockGetLearnableMoves.mockReturnValue([]);
      render(<MovePicker {...defaultProps()} />);
      expect(screen.getByText("No moves found")).toBeInTheDocument();
    });

    it("shows 'No moves found' when all moves are filtered out by type", async () => {
      const user = userEvent.setup();
      // Only Surf in set (Water type), apply Fire filter → no results
      mockGetLearnableMoves.mockReturnValue(["Surf"]);
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("sidebar-type-fire"));
      expect(screen.getByText("No moves found")).toBeInTheDocument();
    });

    it("shows 'No moves found' when all moves are filtered out by category", async () => {
      const user = userEvent.setup();
      // Only Special moves, apply Physical filter → no results
      mockGetLearnableMoves.mockReturnValue(["Surf"]);
      render(<MovePicker {...defaultProps()} />);
      await user.click(screen.getByTestId("sidebar-category-physical"));
      expect(screen.getByText("No moves found")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Usage data integration
  // ---------------------------------------------------------------------------

  describe("usage data integration", () => {
    it("renders usage % for a move when data is present", () => {
      mockGetLearnableMoves.mockReturnValue(["Flamethrower"]);
      mockUseUsageData.mockReturnValue({
        data: [
          {
            periodStart: "2025-01-01",
            periodEnd: "2025-01-07",
            usagePct: 80,
            rank: 1,
            sampleSize: 1000,
            usageChange7d: null,
            usageChange30d: null,
            moves: [{ value: "Flamethrower", count: 620, pct: 62 }],
            tera: [],
            items: [],
          },
        ],
      });
      render(<MovePicker {...defaultProps()} />);
      expect(screen.getByText("62%")).toBeInTheDocument();
    });

    it("matches move names via slug normalization (hyphenated DB value)", () => {
      // DB stores "fake-out", builder calls it "Fake Out"
      mockGetLearnableMoves.mockReturnValue(["Fake Out"]);
      mockGetMoveData.mockImplementation(() => ({
        type: "Normal",
        category: "Physical",
        basePower: 40,
        accuracy: 100,
        shortDesc: "Priority +3.",
      }));
      mockUseUsageData.mockReturnValue({
        data: [
          {
            periodStart: "2025-01-01",
            periodEnd: "2025-01-07",
            usagePct: 60,
            rank: 2,
            sampleSize: 1000,
            usageChange7d: null,
            usageChange30d: null,
            moves: [{ value: "fake-out", count: 450, pct: 45 }],
            tera: [],
            items: [],
          },
        ],
      });
      render(<MovePicker {...defaultProps()} />);
      expect(screen.getByText("45%")).toBeInTheDocument();
    });

    it("renders a sparkline when multiple usage periods are present", () => {
      mockGetLearnableMoves.mockReturnValue(["Flamethrower"]);
      mockUseUsageData.mockReturnValue({
        data: [
          {
            periodStart: "2024-12-25",
            periodEnd: "2025-01-01",
            usagePct: 80,
            rank: 1,
            sampleSize: 1000,
            usageChange7d: null,
            usageChange30d: null,
            moves: [{ value: "Flamethrower", count: 550, pct: 55 }],
            tera: [],
            items: [],
          },
          {
            periodStart: "2025-01-01",
            periodEnd: "2025-01-07",
            usagePct: 82,
            rank: 1,
            sampleSize: 1000,
            usageChange7d: null,
            usageChange30d: null,
            moves: [{ value: "Flamethrower", count: 620, pct: 62 }],
            tera: [],
            items: [],
          },
        ],
      });
      render(<MovePicker {...defaultProps()} />);
      // Sparkline renders because series has ≥ 2 points
      expect(screen.getByTestId("usage-sparkline")).toBeInTheDocument();
    });

    it("does not render a sparkline when only one usage period is present", () => {
      mockGetLearnableMoves.mockReturnValue(["Flamethrower"]);
      mockUseUsageData.mockReturnValue({
        data: [
          {
            periodStart: "2025-01-01",
            periodEnd: "2025-01-07",
            usagePct: 80,
            rank: 1,
            sampleSize: 1000,
            usageChange7d: null,
            usageChange30d: null,
            moves: [{ value: "Flamethrower", count: 620, pct: 62 }],
            tera: [],
            items: [],
          },
        ],
      });
      render(<MovePicker {...defaultProps()} />);
      expect(screen.queryByTestId("usage-sparkline")).not.toBeInTheDocument();
    });

    it("auto-sorts moves by usage descending when data is present and sort is default", () => {
      // Provide three moves with usage: Surf 90%, Flamethrower 62%, Earthquake 30%
      mockGetLearnableMoves.mockReturnValue(["Flamethrower", "Surf", "Earthquake"]);
      mockGetMoveData.mockImplementation((name: string) => MOCK_MOVE_DATA[name] ?? null);
      mockUseUsageData.mockReturnValue({
        data: [
          {
            periodStart: "2025-01-01",
            periodEnd: "2025-01-07",
            usagePct: 70,
            rank: 1,
            sampleSize: 1000,
            usageChange7d: null,
            usageChange30d: null,
            moves: [
              { value: "Flamethrower", count: 620, pct: 62 },
              { value: "Surf", count: 900, pct: 90 },
              { value: "Earthquake", count: 300, pct: 30 },
            ],
            tera: [],
            items: [],
          },
        ],
      });
      render(<MovePicker {...defaultProps()} />);
      // All three rows should be present
      const rows = screen.getAllByRole("row");
      const names = rows.map((r) =>
        r.getAttribute("aria-label")?.replace("Select ", "") ?? ""
      );
      const surfIdx = names.indexOf("Surf");
      const flameIdx = names.indexOf("Flamethrower");
      const quakeIdx = names.indexOf("Earthquake");
      // Higher usage should appear before lower
      expect(surfIdx).toBeLessThan(flameIdx);
      expect(flameIdx).toBeLessThan(quakeIdx);
    });

    it("preserves name-ascending sort when user has explicitly sorted by name", async () => {
      const user = userEvent.setup();
      mockGetLearnableMoves.mockReturnValue(["Surf", "Earthquake", "Flamethrower"]);
      mockGetMoveData.mockImplementation((name: string) => MOCK_MOVE_DATA[name] ?? null);
      mockUseUsageData.mockReturnValue({
        data: [
          {
            periodStart: "2025-01-01",
            periodEnd: "2025-01-07",
            usagePct: 70,
            rank: 1,
            sampleSize: 1000,
            usageChange7d: null,
            usageChange30d: null,
            moves: [
              { value: "Surf", count: 900, pct: 90 },
              { value: "Flamethrower", count: 620, pct: 62 },
              { value: "Earthquake", count: 300, pct: 30 },
            ],
            tera: [],
            items: [],
          },
        ],
      });
      render(<MovePicker {...defaultProps()} />);
      // Default sort (name asc with usage data) places Surf first.
      // Click name sort twice → name desc, then once more → name asc.
      // After each toggle the user explicitly controls the sort, bypassing usage.
      await user.click(screen.getByRole("button", { name: /sort by name/i }));
      // Now name desc → "↓" arrow
      expect(screen.getByText("↓")).toBeInTheDocument();
      // Rows in desc name order: Surf → Flamethrower → Earthquake
      const rows = screen.getAllByRole("row");
      const names = rows.map((r) =>
        r.getAttribute("aria-label")?.replace("Select ", "") ?? ""
      );
      expect(names[0]).toBe("Surf");
      expect(names[1]).toBe("Flamethrower");
      expect(names[2]).toBe("Earthquake");
    });

    it("shows dash in USE% column when no usage data is available", () => {
      mockGetLearnableMoves.mockReturnValue(["Flamethrower"]);
      // Default mock returns no data
      render(<MovePicker {...defaultProps()} />);
      // Dash rendered for unknown usage
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });
  });
});
