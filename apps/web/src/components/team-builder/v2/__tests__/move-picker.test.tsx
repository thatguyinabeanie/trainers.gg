"use client";

/**
 * Behavioral tests for MovePicker.
 *
 * Covers: search filtering, type filter dropdown, category filter dropdown,
 * column sort headers, legal vs learnable move sets, click-to-select behavior,
 * close button, and empty-result state.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";

// =============================================================================
// Mock @trainers/pokemon — move-picker imports ALL_TYPES, getLearnableMoves,
// getLegalMoves, and getMoveData.
// =============================================================================

const mockGetLearnableMoves = jest.fn();
const mockGetLegalMoves = jest.fn();
const mockGetMoveData = jest.fn();

const MOCK_ALL_TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
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
];

jest.mock("@trainers/pokemon", () => ({
  ...jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon"),
  ALL_TYPES: MOCK_ALL_TYPES,
  getLearnableMoves: (...args: unknown[]) => mockGetLearnableMoves(...args),
  getLegalMoves: (...args: unknown[]) => mockGetLegalMoves(...args),
  getMoveData: (...args: unknown[]) => mockGetMoveData(...args),
}));

// =============================================================================
// Mock @trainers/pokemon/sprites
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getShowdownTypeIconUrl: (type: string) =>
    `https://example.com/sprites/${type}.png`,
}));

// =============================================================================
// Mock @tanstack/react-virtual — JSDOM has no layout/scroll APIs, so the
// virtualizer reports zero visible items. This mock renders every row.
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
// Mock @/components/ui/popover — render children directly so PopoverContent
// is queryable in JSDOM without a real portal/positioning layer.
// The Base UI PopoverTrigger accepts a `render` prop for composition; we
// forward its children so the trigger label text is still in the DOM.
// =============================================================================

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover">{children}</div>
  ),
  PopoverTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
    className?: string;
    "aria-label"?: string;
  }) => {
    // When render prop is provided (Base UI pattern), clone it and inject
    // the trigger children as its own children so the label text is visible.
    if (renderProp) {
      return React.cloneElement(renderProp, {}, children);
    }
    return <button data-testid="popover-trigger">{children}</button>;
  },
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// =============================================================================
// Import component after mocks
// =============================================================================

import { MovePicker } from "../pickers/move-picker";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Fixtures
// =============================================================================

/**
 * Minimal move data shapes used across tests. Each entry covers a distinct
 * type/category/BP/accuracy combination so sort and filter branches are hit.
 */
const MOCK_MOVE_DATA: Record<string, ReturnType<typeof mockGetMoveData>> = {
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
    accuracy: true as unknown as number, // "always hits" sentinel
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
    // Default: no format — use learnable moves, all mock moves available
    mockGetLearnableMoves.mockReturnValue(ALL_MOCK_MOVES);
    mockGetLegalMoves.mockReturnValue(null);
    mockGetMoveData.mockImplementation(
      (name: string) => MOCK_MOVE_DATA[name] ?? null
    );
  });

  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders the 'Move' header label", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(screen.getByText("Move")).toBeInTheDocument();
  });

  it("renders the search input with the correct placeholder", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(
      screen.getByPlaceholderText(
        "Search by name, effect, type, or category…"
      )
    ).toBeInTheDocument();
  });

  it("renders the close button", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("clicking the close button calls onClose without calling onPick", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(<MovePicker {...defaultProps({ onPick, onClose })} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("renders all learnable moves when no format is provided", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
    expect(screen.getByText("Surf")).toBeInTheDocument();
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Column headers
  // ---------------------------------------------------------------------------

  it.each([
    ["Sort by name", "name"],
    ["Sort by base power", "bp"],
    ["Sort by accuracy", "acc"],
  ])("renders column header button '%s'", (_label, _ariaLabel) => {
    render(<MovePicker {...defaultProps()} />);
    expect(
      screen.getByRole("button", { name: _label })
    ).toBeInTheDocument();
  });

  it("renders the Type header trigger with 'Filter by type' label", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(
      screen.getByRole("button", { name: "Filter by type" })
    ).toBeInTheDocument();
  });

  it("renders the Category header trigger with 'Filter by category' label", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(
      screen.getByRole("button", { name: "Filter by category" })
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Search filtering
  // ---------------------------------------------------------------------------

  it("filters moves by name as user types", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    const input = screen.getByPlaceholderText(
      "Search by name, effect, type, or category…"
    );
    await user.type(input, "surf");
    expect(screen.getByText("Surf")).toBeInTheDocument();
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
  });

  it("search is case-insensitive", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    const input = screen.getByPlaceholderText(
      "Search by name, effect, type, or category…"
    );
    await user.type(input, "FLAME");
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
  });

  it("filters moves by shortDesc content", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    const input = screen.getByPlaceholderText(
      "Search by name, effect, type, or category…"
    );
    // "adjacent" appears in Surf and Earthquake shortDescs
    await user.type(input, "adjacent");
    expect(screen.getByText("Surf")).toBeInTheDocument();
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
  });

  it("filters moves by type name", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    const input = screen.getByPlaceholderText(
      "Search by name, effect, type, or category…"
    );
    await user.type(input, "ground");
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
    // Fire moves should not appear (their type is "Fire", not "ground")
    expect(screen.queryByText("Surf")).not.toBeInTheDocument();
  });

  it("filters moves by category name", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    const input = screen.getByPlaceholderText(
      "Search by name, effect, type, or category…"
    );
    await user.type(input, "status");
    expect(screen.getByText("Will-O-Wisp")).toBeInTheDocument();
    // Physical/Special moves should not appear
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
  });

  it("shows 'No moves found' when search matches nothing", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    const input = screen.getByPlaceholderText(
      "Search by name, effect, type, or category…"
    );
    await user.type(input, "zzznomatch");
    expect(screen.getByText("No moves found")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Type filter (dropdown inside popover content)
  // ---------------------------------------------------------------------------

  it("renders 'All types' filter option in the type popover content", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(screen.getByText("All types")).toBeInTheDocument();
  });

  it("renders type filter buttons for each type in ALL_TYPES", () => {
    render(<MovePicker {...defaultProps()} />);
    // Each type renders as an img with alt=typeName inside the filter popover
    for (const type of MOCK_ALL_TYPES) {
      // The type icon is inside a button with aria-label=type
      const buttons = screen.getAllByRole("button", { name: type });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("clicking a type filter button filters the move list to that type", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    // Click the Water type filter button
    const waterButton = screen.getByRole("button", { name: "Water" });
    await user.click(waterButton);
    expect(screen.getByText("Surf")).toBeInTheDocument();
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
    expect(screen.queryByText("Earthquake")).not.toBeInTheDocument();
  });

  it("clicking 'All types' resets the type filter", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    // Apply Water filter, then clear it
    await user.click(screen.getByRole("button", { name: "Water" }));
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
    await user.click(screen.getByText("All types"));
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
    expect(screen.getByText("Surf")).toBeInTheDocument();
  });

  it("combining type filter with search further narrows results", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    // Filter to Fire type
    await user.click(screen.getByRole("button", { name: "Fire" }));
    // All Fire moves: Flamethrower, Fire Punch, Will-O-Wisp should show
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
    expect(screen.getByText("Will-O-Wisp")).toBeInTheDocument();
    // Then also search by name — should further narrow
    const input = screen.getByPlaceholderText(
      "Search by name, effect, type, or category…"
    );
    await user.type(input, "punch");
    expect(screen.getByText("Fire Punch")).toBeInTheDocument();
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Category filter (dropdown inside popover content)
  // ---------------------------------------------------------------------------

  it("renders category filter options in the category popover content", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(screen.getByText("All categories")).toBeInTheDocument();
    expect(screen.getByText("Physical")).toBeInTheDocument();
    expect(screen.getByText("Special")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("clicking the Physical category filter shows only Physical moves", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    await user.click(screen.getByText("Physical"));
    // Physical moves: Fire Punch, Earthquake, "No additional effect move"
    expect(screen.getByText("Fire Punch")).toBeInTheDocument();
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
    // Special moves should not appear
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
    expect(screen.queryByText("Surf")).not.toBeInTheDocument();
  });

  it("clicking the Special category filter shows only Special moves", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    await user.click(screen.getByText("Special"));
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
    expect(screen.getByText("Surf")).toBeInTheDocument();
    expect(screen.queryByText("Earthquake")).not.toBeInTheDocument();
    expect(screen.queryByText("Will-O-Wisp")).not.toBeInTheDocument();
  });

  it("clicking the Status category filter shows only Status moves", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    await user.click(screen.getByText("Status"));
    expect(screen.getByText("Will-O-Wisp")).toBeInTheDocument();
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
    expect(screen.queryByText("Fire Punch")).not.toBeInTheDocument();
  });

  it("clicking 'All categories' resets the category filter", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    await user.click(screen.getByText("Physical"));
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
    await user.click(screen.getByText("All categories"));
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
    expect(screen.getByText("Will-O-Wisp")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  it("clicking 'Sort by name' twice toggles to descending sort", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    // Default sort is name asc — click once to go desc
    await user.click(screen.getByRole("button", { name: "Sort by name" }));
    // Sort arrow should now show descending indicator
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  it("clicking 'Sort by name' starts ascending (asc is the default for name)", () => {
    render(<MovePicker {...defaultProps()} />);
    // Already on name/asc by default — arrow should show ↑
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("clicking 'Sort by base power' applies BP sort in descending order by default", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    await user.click(screen.getByRole("button", { name: "Sort by base power" }));
    // Sort arrow should be descending
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  it("clicking 'Sort by accuracy' applies accuracy sort in descending order by default", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    await user.click(screen.getByRole("button", { name: "Sort by accuracy" }));
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  it("clicking the same sort column twice toggles direction", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    // Click BP once — should be desc
    await user.click(screen.getByRole("button", { name: "Sort by base power" }));
    expect(screen.getByText("↓")).toBeInTheDocument();
    // Click BP again — should toggle to asc
    await user.click(screen.getByRole("button", { name: "Sort by base power" }));
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("clicking 'Sort by type' in the type popover applies type sort", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    await user.click(screen.getByRole("button", { name: /sort by type/i }));
    // Sort arrow (asc by default for type) should appear
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("clicking 'Sort by category' in the category popover applies category sort descending", async () => {
    const user = userEvent.setup();
    render(<MovePicker {...defaultProps()} />);
    await user.click(screen.getByRole("button", { name: /sort by category/i }));
    // category is not name/type, so default direction is desc
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selection behavior
  // ---------------------------------------------------------------------------

  it("clicking a move row calls onPick with the move name and then onClose", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(<MovePicker {...defaultProps({ onPick, onClose })} />);
    // Search to isolate a single row
    const input = screen.getByPlaceholderText(
      "Search by name, effect, type, or category…"
    );
    await user.type(input, "surf");
    const moveButton = screen.getByText("Surf").closest("button")!;
    await user.click(moveButton);
    expect(onPick).toHaveBeenCalledWith("Surf");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the currently selected move row has the selected style class", () => {
    render(<MovePicker {...defaultProps({ value: "Flamethrower" })} />);
    // Find the row button for Flamethrower
    const nameSpan = screen.getByTitle("Flamethrower");
    const rowButton = nameSpan.closest("button")!;
    expect(rowButton.className).toContain("bg-accent");
  });

  it("a non-selected move row does not have the unconditional bg-accent class (only the hover variant)", () => {
    render(<MovePicker {...defaultProps({ value: "Flamethrower" })} />);
    const nameSpan = screen.getByTitle("Surf");
    const rowButton = nameSpan.closest("button")!;
    // hover:bg-accent is always present; only the selected row gets bare bg-accent
    // Check the className does not contain a standalone "bg-accent" token
    const classes = rowButton.className.split(" ");
    expect(classes).not.toContain("bg-accent");
  });

  // ---------------------------------------------------------------------------
  // Move row data display
  // ---------------------------------------------------------------------------

  it("displays base power for moves with BP > 0", () => {
    render(<MovePicker {...defaultProps()} />);
    // Flamethrower has BP 90
    expect(screen.getAllByText("90").length).toBeGreaterThan(0);
  });

  it("displays '—' for moves with BP = 0 (Status moves)", () => {
    render(<MovePicker {...defaultProps()} />);
    // Will-O-Wisp has basePower 0 — should display em-dash in BP column
    // (multiple em-dashes may exist for acc and bp of 0-BP moves)
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("displays accuracy as percentage string for moves with numeric accuracy", () => {
    render(<MovePicker {...defaultProps()} />);
    // Will-O-Wisp has accuracy 85
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("displays '—' for accuracy when move always hits (accuracy === true)", () => {
    render(<MovePicker {...defaultProps()} />);
    // "Never-Miss Move" has accuracy: true — should show '—' in acc column
    // We filter to isolate that move's row
    const nameSpan = screen.getByTitle("Never-Miss Move");
    const rowButton = nameSpan.closest("button")!;
    // The last cell in the row should be '—'
    const cells = rowButton.querySelectorAll("span");
    const accCell = cells[cells.length - 1];
    expect(accCell?.textContent).toBe("—");
  });

  it("does not display shortDesc when it is 'No additional effect.'", () => {
    render(<MovePicker {...defaultProps()} />);
    expect(
      screen.queryByText("No additional effect.")
    ).not.toBeInTheDocument();
  });

  it("displays non-trivial shortDesc text in the description column", () => {
    // Use a move with a unique shortDesc to avoid multiple-match errors
    mockGetLearnableMoves.mockReturnValue(["Will-O-Wisp"]);
    render(<MovePicker {...defaultProps()} />);
    expect(screen.getByText("Burns the target.")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Legal vs. learnable move sets
  // ---------------------------------------------------------------------------

  it("uses getLegalMoves when format is provided and it returns a set", () => {
    const format = makeMockFormat();
    mockGetLegalMoves.mockReturnValue(new Set(["Flamethrower", "Surf"]));
    render(<MovePicker {...defaultProps({ format })} />);
    expect(mockGetLegalMoves).toHaveBeenCalledWith(
      "Charizard",
      format.id
    );
  });

  it("restricts move list to legal set when format is provided", () => {
    const format = makeMockFormat();
    mockGetLegalMoves.mockReturnValue(new Set(["Surf"]));
    render(<MovePicker {...defaultProps({ format })} />);
    expect(screen.getByText("Surf")).toBeInTheDocument();
    expect(screen.queryByText("Flamethrower")).not.toBeInTheDocument();
  });

  it("falls back to getLearnableMoves when getLegalMoves returns null", () => {
    const format = makeMockFormat();
    mockGetLegalMoves.mockReturnValue(null);
    mockGetLearnableMoves.mockReturnValue(["Earthquake"]);
    render(<MovePicker {...defaultProps({ format })} />);
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
  });

  it("uses getLearnableMoves directly when no format is provided", () => {
    mockGetLearnableMoves.mockReturnValue(["Flamethrower"]);
    render(<MovePicker {...defaultProps({ format: undefined })} />);
    expect(mockGetLegalMoves).not.toHaveBeenCalled();
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it("shows 'No moves found' when all moves are filtered out by type + category", async () => {
    const user = userEvent.setup();
    // Only Water moves in learnable set
    mockGetLearnableMoves.mockReturnValue(["Surf"]);
    render(<MovePicker {...defaultProps()} />);
    // Filter to Physical — Surf is Special, so nothing matches
    await user.click(screen.getByText("Physical"));
    expect(screen.getByText("No moves found")).toBeInTheDocument();
  });

  it("shows 'No moves found' when the move set is empty", () => {
    mockGetLearnableMoves.mockReturnValue([]);
    render(<MovePicker {...defaultProps()} />);
    expect(screen.getByText("No moves found")).toBeInTheDocument();
  });
});
