import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Popover uses Base UI portals — mock to simple inline wrappers so popover
// content renders inline in JSDOM without needing a portal DOM node.
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// Tooltip uses Base UI portals — mock to simple pass-through wrappers.
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
    className,
    disabled,
  }: {
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
  }) => (
    <button type="button" className={className} disabled={disabled}>
      {children}
    </button>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const MOCK_TYPES = [
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
] as const;

const mockCalculateTeamSynergy = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: MOCK_TYPES,
  calculateTeamSynergy: mockCalculateTeamSynergy,
}));

import {
  SpeciesFilters,
  DEFAULT_FILTERS,
  type SpeciesFilterState,
} from "../species-filters";

// =============================================================================
// Helpers
// =============================================================================

function makeFilters(
  overrides: Partial<SpeciesFilterState> = {}
): SpeciesFilterState {
  return { ...DEFAULT_FILTERS, ...overrides };
}

interface RenderOptions {
  query?: string;
  filters?: SpeciesFilterState;
  currentTeam?: Array<{ species: string }>;
  totalCount?: number;
  filteredCount?: number;
}

function renderFilters(opts: RenderOptions = {}) {
  const {
    query = "",
    filters = makeFilters(),
    currentTeam = [],
    totalCount = 100,
    filteredCount = 100,
  } = opts;

  const handlers = {
    onQueryChange: jest.fn(),
    onFiltersChange: jest.fn(),
  };

  render(
    <SpeciesFilters
      query={query}
      onQueryChange={handlers.onQueryChange}
      filters={filters}
      onFiltersChange={handlers.onFiltersChange}
      currentTeam={currentTeam}
      totalCount={totalCount}
      filteredCount={filteredCount}
    />
  );

  return handlers;
}

// =============================================================================
// Tests — default render
// =============================================================================

describe("SpeciesFilters — default render", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("renders the search input with placeholder text", () => {
    renderFilters();
    expect(
      screen.getByPlaceholderText("Search species, abilities, types, moves...")
    ).toBeInTheDocument();
  });

  it("shows the current query value in the input", () => {
    renderFilters({ query: "Charizard" });
    expect(
      screen.getByPlaceholderText("Search species, abilities, types, moves...")
    ).toHaveValue("Charizard");
  });

  it("renders the All tier chip", () => {
    renderFilters();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  it("renders the disabled tier chips: Top 20, Rising, Niche", () => {
    renderFilters();
    expect(screen.getByText("Top 20")).toBeInTheDocument();
    expect(screen.getByText("Rising")).toBeInTheDocument();
    expect(screen.getByText("Niche")).toBeInTheDocument();
  });

  it("renders the Role filter trigger with default label", () => {
    renderFilters();
    expect(screen.getByText("Role")).toBeInTheDocument();
  });

  it("renders the Type filter trigger with default label", () => {
    renderFilters();
    expect(screen.getByText("Type")).toBeInTheDocument();
  });

  it("renders the Learns Move filter trigger", () => {
    renderFilters();
    expect(screen.getByText("Learns Move")).toBeInTheDocument();
  });

  it("renders the Stats filter trigger", () => {
    renderFilters();
    expect(screen.getByText("Stats")).toBeInTheDocument();
  });

  it("does not render the Clear button when no active filters", () => {
    renderFilters();
    expect(
      screen.queryByRole("button", { name: "Clear" })
    ).not.toBeInTheDocument();
  });

  it("does not render team needs section when team is empty", () => {
    renderFilters({ currentTeam: [] });
    expect(screen.queryByText("Team needs:")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — result count display
// =============================================================================

describe("SpeciesFilters — result count", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("shows total count when filteredCount equals totalCount", () => {
    renderFilters({ totalCount: 50, filteredCount: 50 });
    expect(screen.getByText("50 species")).toBeInTheDocument();
  });

  it("shows filtered / total when counts differ", () => {
    renderFilters({ totalCount: 100, filteredCount: 23 });
    expect(screen.getByText("23 of 100")).toBeInTheDocument();
  });

  it("shows 0 of total when nothing matches", () => {
    renderFilters({ totalCount: 100, filteredCount: 0 });
    expect(screen.getByText("0 of 100")).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — search input
// =============================================================================

describe("SpeciesFilters — search input", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("calls onQueryChange when the user types", async () => {
    const user = userEvent.setup();
    const { onQueryChange } = renderFilters({ query: "" });

    const input = screen.getByPlaceholderText(
      "Search species, abilities, types, moves..."
    );
    await user.type(input, "char");

    // userEvent.type fires one change per character
    expect(onQueryChange).toHaveBeenCalledWith("c");
    expect(onQueryChange).toHaveBeenCalledWith("h");
    expect(onQueryChange).toHaveBeenCalledWith("a");
    expect(onQueryChange).toHaveBeenCalledWith("r");
  });

  it("calls onQueryChange with empty string when input is cleared", async () => {
    const user = userEvent.setup();
    const { onQueryChange } = renderFilters({ query: "Char" });

    const input = screen.getByPlaceholderText(
      "Search species, abilities, types, moves..."
    );
    await user.clear(input);

    expect(onQueryChange).toHaveBeenCalledWith("");
  });
});

// =============================================================================
// Tests — type filter
// =============================================================================

describe("SpeciesFilters — type filter", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("shows type count in trigger when types are active", () => {
    renderFilters({
      filters: makeFilters({ types: ["Fire", "Water"] }),
    });
    expect(screen.getByText("Type (2)")).toBeInTheDocument();
  });

  it("renders all 18 types in the popover content", () => {
    renderFilters();
    for (const type of MOCK_TYPES) {
      expect(screen.getByRole("button", { name: type })).toBeInTheDocument();
    }
  });

  it("calls onFiltersChange adding a type when an unselected type is clicked", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ types: [] }),
    });

    await user.click(screen.getByRole("button", { name: "Fire" }));

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.types).toContain("Fire");
    expect(next.types).toHaveLength(1);
  });

  it("calls onFiltersChange removing a type when an active type is clicked again", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ types: ["Fire", "Water"] }),
    });

    await user.click(screen.getByRole("button", { name: "Fire" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.types).not.toContain("Fire");
    expect(next.types).toContain("Water");
    expect(next.types).toHaveLength(1);
  });

  it("accumulates multiple selected types correctly", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ types: ["Fire"] }),
    });

    await user.click(screen.getByRole("button", { name: "Water" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.types).toEqual(["Fire", "Water"]);
  });

  it("does not mutate other filter fields when toggling a type", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({
        types: [],
        role: "Tailwind",
        moves: ["Tailwind"],
      }),
    });

    await user.click(screen.getByRole("button", { name: "Grass" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.role).toBe("Tailwind");
    expect(next.moves).toEqual(["Tailwind"]);
  });
});

// =============================================================================
// Tests — role filter
// =============================================================================

describe("SpeciesFilters — role filter", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("shows the active role name in the trigger when a role is selected", () => {
    renderFilters({
      filters: makeFilters({ role: "Tailwind", moves: ["Tailwind"] }),
    });
    expect(screen.getByText("Role: Tailwind")).toBeInTheDocument();
  });

  it("renders all role buttons that are unique to the role list", () => {
    renderFilters();
    // These role labels do NOT appear in QUICK_PICK_MOVES, so they are
    // unambiguous even when Popover content renders inline.
    const uniqueRoleNames = [
      "Intimidate",
      "Follow Me/Redirection",
      "Speed Control",
      "Weather Setter",
      "Terrain Setter",
      "Priority",
    ];
    for (const name of uniqueRoleNames) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    // Roles that share a name with quick-pick buttons appear at least once
    expect(
      screen.getAllByRole("button", { name: "Tailwind" }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: "Trick Room" }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: "Fake Out" }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("calls onFiltersChange with role+moves when a move-based role (Speed Control) is applied", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ role: null }),
    });

    // "Speed Control" is unique to the role list — no quick-pick collision
    await user.click(screen.getByRole("button", { name: "Speed Control" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.role).toBe("Speed Control");
    expect(next.moves).toEqual(["Tailwind", "Icy Wind", "Electroweb"]);
    expect(next.abilities).toEqual([]);
  });

  it("calls onFiltersChange with role+abilities when an ability-based role is applied", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ role: null }),
    });

    await user.click(screen.getByRole("button", { name: "Intimidate" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.role).toBe("Intimidate");
    expect(next.abilities).toEqual(["Intimidate"]);
    expect(next.moves).toEqual([]);
  });

  it("calls onFiltersChange with role+moves+abilities for Weather Setter", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ role: null }),
    });

    await user.click(screen.getByRole("button", { name: "Weather Setter" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.role).toBe("Weather Setter");
    expect(next.abilities).toEqual([
      "Drizzle",
      "Drought",
      "Sand Stream",
      "Snow Warning",
    ]);
    expect(next.moves).toEqual([]);
  });

  it("clears role, moves, and abilities when the active role is clicked again (toggle off)", async () => {
    const user = userEvent.setup();
    // "Speed Control" is unique to the role list — no quick-pick collision
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({
        role: "Speed Control",
        moves: ["Tailwind", "Icy Wind", "Electroweb"],
        abilities: [],
      }),
    });

    await user.click(screen.getByRole("button", { name: "Speed Control" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.role).toBeNull();
    expect(next.moves).toEqual([]);
    expect(next.abilities).toEqual([]);
  });

  it("does not mutate other filter fields when applying a role", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ types: ["Fire"], role: null }),
    });

    // "Speed Control" is unique — no quick-pick collision
    await user.click(screen.getByRole("button", { name: "Speed Control" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.types).toEqual(["Fire"]);
  });
});

// =============================================================================
// Tests — move filter (quick picks + keyboard input)
// =============================================================================

describe("SpeciesFilters — learns move filter", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("shows move count in trigger when moves are active", () => {
    renderFilters({
      filters: makeFilters({ moves: ["Tailwind", "Fake Out"] }),
    });
    expect(screen.getByText("Learns Move (2)")).toBeInTheDocument();
  });

  it("renders all 6 quick-pick move buttons", () => {
    renderFilters();
    // "Protect" and "Spore" are unique to quick-picks — no role collision.
    // "Tailwind", "Trick Room", "Fake Out", "Follow Me" may appear in both
    // the role list and quick-picks. Use getAllByRole and assert at least one.
    expect(screen.getByRole("button", { name: "Protect" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Spore" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Tailwind" }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: "Trick Room" }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: "Fake Out" }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: "Follow Me" }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("adds a quick-pick move when clicked and it is not already active", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ moves: [] }),
    });

    await user.click(screen.getByRole("button", { name: "Protect" }));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.moves).toContain("Protect");
  });

  it("quick-pick button is disabled when the move is already active", () => {
    // Use "Protect" — unique to quick-picks, not a role button name
    renderFilters({
      filters: makeFilters({ moves: ["Protect"] }),
    });
    expect(screen.getByRole("button", { name: "Protect" })).toBeDisabled();
  });

  it("does not call onFiltersChange when a disabled quick-pick is clicked", async () => {
    const user = userEvent.setup();
    // Use "Protect" — unique to quick-picks, no ambiguity
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ moves: ["Protect"] }),
    });

    await user.click(screen.getByRole("button", { name: "Protect" }));

    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it("renders active move badges with × suffix when moves are in filters", () => {
    renderFilters({
      filters: makeFilters({ moves: ["Protect", "Spore"] }),
    });
    // Badges render as "<move> ×" — the × suffix distinguishes them from buttons
    expect(screen.getByText("Protect ×")).toBeInTheDocument();
    expect(screen.getByText("Spore ×")).toBeInTheDocument();
  });

  it("removes a move when its badge (× suffix) is clicked", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ moves: ["Protect", "Spore"] }),
    });

    // Click the badge — identified by the exact "Protect ×" text
    await user.click(screen.getByText("Protect ×"));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.moves).not.toContain("Protect");
    expect(next.moves).toContain("Spore");
  });

  it("adds a custom move via Enter key in the search input", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ moves: [] }),
    });

    const moveInput = screen.getByPlaceholderText("Search moves...");
    await user.click(moveInput);
    await user.keyboard("Flamethrower{Enter}");

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.moves).toContain("Flamethrower");
  });

  it("does not call onFiltersChange when Enter is pressed with empty input", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ moves: [] }),
    });

    const moveInput = screen.getByPlaceholderText("Search moves...");
    await user.click(moveInput);
    await user.keyboard("{Enter}");

    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it("does not add a duplicate move via Enter key", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ moves: ["Tailwind"] }),
    });

    const moveInput = screen.getByPlaceholderText("Search moves...");
    await user.click(moveInput);
    await user.keyboard("Tailwind{Enter}");

    // addMove has an early return for duplicates — onFiltersChange not called
    expect(onFiltersChange).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Tests — stats filter
// =============================================================================

describe("SpeciesFilters — stats filter", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("renders Min and Max labels in the stats popover", () => {
    renderFilters();
    expect(screen.getByText("Min")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("renders a row for each of the 6 stat labels", () => {
    renderFilters();
    expect(screen.getByText("HP")).toBeInTheDocument();
    expect(screen.getByText("Atk")).toBeInTheDocument();
    expect(screen.getByText("Def")).toBeInTheDocument();
    expect(screen.getByText("SpA")).toBeInTheDocument();
    expect(screen.getByText("SpD")).toBeInTheDocument();
    expect(screen.getByText("Spe")).toBeInTheDocument();
  });

  it("calls onFiltersChange with minBaseStat when a min input fires change", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters(),
    });

    // There are 12 number inputs (6 stats × min/max). HP min is index 0.
    // userEvent.type on a number input fires onChange for the single digit.
    const inputs = screen.getAllByRole("spinbutton");
    await user.type(inputs[0]!, "8");

    // The onChange fires with the single digit "8" → parseInt("8") = 8
    expect(onFiltersChange).toHaveBeenCalled();
    const last = onFiltersChange.mock.calls.at(-1)![0] as SpeciesFilterState;
    expect(last.minBaseStat.hp).toBe(8);
  });

  it("calls onFiltersChange with maxBaseStat when a max input fires change", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters(),
    });

    // Max HP input is the second spinbutton (index 1)
    const inputs = screen.getAllByRole("spinbutton");
    await user.type(inputs[1]!, "9");

    expect(onFiltersChange).toHaveBeenCalled();
    const last = onFiltersChange.mock.calls.at(-1)![0] as SpeciesFilterState;
    expect(last.maxBaseStat.hp).toBe(9);
  });

  it("sets stat to undefined when input is cleared", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ minBaseStat: { hp: 80 } }),
    });

    const inputs = screen.getAllByRole("spinbutton");
    await user.clear(inputs[0]!);

    const last = onFiltersChange.mock.calls.at(-1)![0] as SpeciesFilterState;
    expect(last.minBaseStat.hp).toBeUndefined();
  });

  it("shows the current min stat value in the input", () => {
    renderFilters({
      filters: makeFilters({ minBaseStat: { spe: 100 } }),
    });
    // Spe is the 6th stat, min input is index 10 (0-indexed pairs: hp=0,1 atk=2,3 def=4,5 spa=6,7 spd=8,9 spe=10,11)
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[10]).toHaveValue(100);
  });
});

// =============================================================================
// Tests — hasActiveFilters and Clear button
// =============================================================================

describe("SpeciesFilters — active filters and Clear", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it.each([
    ["types", makeFilters({ types: ["Fire"] })],
    ["moves", makeFilters({ moves: ["Tailwind"] })],
    ["abilities", makeFilters({ abilities: ["Intimidate"] })],
    ["role", makeFilters({ role: "Tailwind", moves: ["Tailwind"] })],
    ["minBaseStat", makeFilters({ minBaseStat: { hp: 50 } })],
    ["maxBaseStat", makeFilters({ maxBaseStat: { spe: 100 } })],
  ] as const)(
    "renders the Clear button when %s filter is active",
    (_label, filters) => {
      renderFilters({ filters });
      expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    }
  );

  it("calls onFiltersChange with DEFAULT_FILTERS when Clear is clicked", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ types: ["Fire"], role: "Tailwind" }),
    });

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0]![0]).toEqual(DEFAULT_FILTERS);
  });

  it("does not render Clear when all filters are at default", () => {
    renderFilters({ filters: DEFAULT_FILTERS });
    expect(
      screen.queryByRole("button", { name: "Clear" })
    ).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — team needs suggestions
// =============================================================================

describe("SpeciesFilters — team needs suggestions", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("does not call calculateTeamSynergy when team is empty", () => {
    renderFilters({ currentTeam: [] });
    expect(mockCalculateTeamSynergy).not.toHaveBeenCalled();
  });

  it("calls calculateTeamSynergy when team has members", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: {},
      uncoveredTypes: new Set(),
    });

    renderFilters({ currentTeam: [{ species: "Charizard" }] });

    expect(mockCalculateTeamSynergy).toHaveBeenCalledTimes(1);
    expect(mockCalculateTeamSynergy).toHaveBeenCalledWith([
      { species: "Charizard" },
    ]);
  });

  it("renders team needs section when synergy finds needed types", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Rock: 2 },
      uncoveredTypes: new Set(["Rock"]),
    });

    renderFilters({ currentTeam: [{ species: "Charizard" }] });

    expect(screen.getByText("Team needs:")).toBeInTheDocument();
    expect(screen.getByText("✦ Covers Rock")).toBeInTheDocument();
  });

  it("does not render team needs when no type meets both conditions (weak 2+ AND uncovered)", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      // weak to Rock twice but Rock IS covered (not in uncoveredTypes)
      sharedWeaknesses: { Rock: 2 },
      uncoveredTypes: new Set<string>(),
    });

    renderFilters({ currentTeam: [{ species: "Charizard" }] });

    expect(screen.queryByText("Team needs:")).not.toBeInTheDocument();
  });

  it("does not render a type that is weak only once even if uncovered", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Water: 1 },
      uncoveredTypes: new Set(["Water"]),
    });

    renderFilters({ currentTeam: [{ species: "Charizard" }] });

    expect(screen.queryByText("Team needs:")).not.toBeInTheDocument();
  });

  it("renders multiple needed types when synergy data contains several", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Rock: 3, Electric: 2 },
      uncoveredTypes: new Set(["Rock", "Electric"]),
    });

    renderFilters({
      currentTeam: [{ species: "Charizard" }, { species: "Gyarados" }],
    });

    expect(screen.getByText("✦ Covers Rock")).toBeInTheDocument();
    expect(screen.getByText("✦ Covers Electric")).toBeInTheDocument();
  });

  it("adds a needed type to filters when its suggestion is clicked", async () => {
    const user = userEvent.setup();
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Rock: 2 },
      uncoveredTypes: new Set(["Rock"]),
    });

    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ types: [] }),
      currentTeam: [{ species: "Charizard" }],
    });

    await user.click(screen.getByText("✦ Covers Rock"));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.types).toContain("Rock");
  });

  it("removes a needed type from filters when its suggestion is clicked while already selected", async () => {
    const user = userEvent.setup();
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Rock: 2 },
      uncoveredTypes: new Set(["Rock"]),
    });

    const { onFiltersChange } = renderFilters({
      filters: makeFilters({ types: ["Rock"] }),
      currentTeam: [{ species: "Charizard" }],
    });

    await user.click(screen.getByText("✦ Covers Rock"));

    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.types).not.toContain("Rock");
  });
});

// =============================================================================
// Tests — edge cases
// =============================================================================

describe("SpeciesFilters — edge cases", () => {
  beforeEach(() => {
    mockCalculateTeamSynergy.mockReset();
  });

  it("handles zero totalCount without crashing", () => {
    renderFilters({ totalCount: 0, filteredCount: 0 });
    expect(screen.getByText("0 species")).toBeInTheDocument();
  });

  it("renders correctly with all 18 types selected", () => {
    renderFilters({
      filters: makeFilters({ types: [...MOCK_TYPES] }),
    });
    expect(screen.getByText(`Type (${MOCK_TYPES.length})`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("does not crash when synergy returns empty sharedWeaknesses", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: {},
      uncoveredTypes: new Set(MOCK_TYPES),
    });

    renderFilters({ currentTeam: [{ species: "Arceus" }] });

    // No needed types because weakCount is 0 for all, which is < 2
    expect(screen.queryByText("Team needs:")).not.toBeInTheDocument();
  });

  it("Clear resets all active filters back to DEFAULT_FILTERS", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({
        types: ["Fire"],
        role: "Trick Room",
        moves: ["Trick Room"],
      }),
    });

    // Clear resets everything to DEFAULT_FILTERS
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onFiltersChange.mock.calls[0]![0]).toEqual(DEFAULT_FILTERS);
  });

  it("Learns Move trigger shows count 0 label (no count suffix) with empty moves", () => {
    renderFilters({ filters: makeFilters({ moves: [] }) });
    // The trigger should read just "Learns Move" with no count
    expect(screen.getByText("Learns Move")).toBeInTheDocument();
    expect(screen.queryByText(/Learns Move \(/)).not.toBeInTheDocument();
  });

  it("Role trigger shows default 'Role' label when no role is selected", () => {
    renderFilters({ filters: makeFilters({ role: null }) });
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.queryByText(/Role:/)).not.toBeInTheDocument();
  });

  it("Role trigger reflects the Follow Me/Redirection role label in the trigger", () => {
    renderFilters({
      filters: makeFilters({
        role: "Follow Me/Redirection",
        moves: ["Follow Me", "Rage Powder"],
      }),
    });
    expect(screen.getByText("Role: Follow Me/Redirection")).toBeInTheDocument();
  });

  it("clicking the active Follow Me/Redirection role clears it", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderFilters({
      filters: makeFilters({
        role: "Follow Me/Redirection",
        moves: ["Follow Me", "Rage Powder"],
      }),
    });
    await user.click(
      screen.getByRole("button", { name: "Follow Me/Redirection" })
    );
    const next = onFiltersChange.mock.calls[0]![0] as SpeciesFilterState;
    expect(next.role).toBeNull();
  });
});
