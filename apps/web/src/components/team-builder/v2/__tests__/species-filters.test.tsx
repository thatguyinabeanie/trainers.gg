import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";

// =============================================================================
// Mock @trainers/pokemon — calculateTeamSynergy and ALL_TYPES.
// =============================================================================

const mockCalculateTeamSynergy = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    calculateTeamSynergy: (...args: unknown[]) =>
      mockCalculateTeamSynergy(...args),
  };
});

// =============================================================================
// Mock shadcn Popover — render children directly so popover content is always
// in the DOM and we can assert on it without pointer-event tricks.
// =============================================================================

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    children,
    render: renderProp,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) => {
    if (renderProp) {
      return React.cloneElement(renderProp, {}, children);
    }
    return <div>{children}</div>;
  },
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// =============================================================================
// Mock shadcn Tooltip — render children directly.
// =============================================================================

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({
    children,
    render: renderProp,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) => {
    if (renderProp) {
      return React.cloneElement(renderProp, {}, children);
    }
    return <div>{children}</div>;
  },
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// =============================================================================
// Mock CSS module
// =============================================================================

jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

import {
  SpeciesFilters,
  DEFAULT_FILTERS,
  type SpeciesFilterState,
} from "../pickers/species-filters";

// =============================================================================
// Helpers
// =============================================================================

function buildProps(overrides: Partial<Parameters<typeof SpeciesFilters>[0]> = {}) {
  return {
    query: "",
    onQueryChange: jest.fn(),
    filters: { ...DEFAULT_FILTERS },
    onFiltersChange: jest.fn(),
    currentTeam: [],
    totalCount: 100,
    filteredCount: 100,
    ...overrides,
  };
}

// =============================================================================
// SpeciesFilters tests
// =============================================================================

describe("SpeciesFilters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateTeamSynergy.mockReturnValue(null);
  });

  // ---------------------------------------------------------------------------
  // Search input
  // ---------------------------------------------------------------------------

  it("renders the search input with placeholder text", () => {
    render(<SpeciesFilters {...buildProps()} />);
    expect(
      screen.getByPlaceholderText(
        "Search species, abilities, types, moves..."
      )
    ).toBeInTheDocument();
  });

  it("displays the current query value in the search input", () => {
    render(<SpeciesFilters {...buildProps({ query: "Garcho" })} />);
    const input = screen.getByPlaceholderText(
      "Search species, abilities, types, moves..."
    );
    expect((input as HTMLInputElement).value).toBe("Garcho");
  });

  it("calls onQueryChange when user types in the search input", async () => {
    const user = userEvent.setup();
    const onQueryChange = jest.fn();
    render(<SpeciesFilters {...buildProps({ onQueryChange })} />);
    const input = screen.getByPlaceholderText(
      "Search species, abilities, types, moves..."
    );
    await user.type(input, "Dragon");
    expect(onQueryChange).toHaveBeenCalled();
    // Last call should contain the last character typed
    const lastCallArg = onQueryChange.mock.calls.at(-1)?.[0] as string;
    expect(lastCallArg).toContain("n");
  });

  // ---------------------------------------------------------------------------
  // Tier chips
  // ---------------------------------------------------------------------------

  it("renders the 'All' tier button as active", () => {
    render(<SpeciesFilters {...buildProps()} />);
    expect(
      screen.getByRole("button", { name: "All" })
    ).toBeInTheDocument();
  });

  it("renders the Top 20, Rising, and Niche tier labels as disabled", () => {
    render(<SpeciesFilters {...buildProps()} />);
    expect(screen.getByText("Top 20")).toBeInTheDocument();
    expect(screen.getByText("Rising")).toBeInTheDocument();
    expect(screen.getByText("Niche")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Type filter — all 18 types render
  // ---------------------------------------------------------------------------

  it("renders all 18 type buttons inside the Type filter", () => {
    render(<SpeciesFilters {...buildProps()} />);
    // All 18 standard Pokemon types
    const expectedTypes = [
      "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
      "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
      "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy",
    ];
    for (const type of expectedTypes) {
      expect(screen.getByRole("button", { name: type })).toBeInTheDocument();
    }
  });

  it("clicking a type button calls onFiltersChange with the type added", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(<SpeciesFilters {...buildProps({ onFiltersChange })} />);
    await user.click(screen.getByRole("button", { name: "Fire" }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["Fire"] })
    );
  });

  it("clicking an already-active type removes it from the filter", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    const filters: SpeciesFilterState = {
      ...DEFAULT_FILTERS,
      types: ["Fire"],
    };
    render(
      <SpeciesFilters {...buildProps({ filters, onFiltersChange })} />
    );
    await user.click(screen.getByRole("button", { name: "Fire" }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: [] })
    );
  });

  it("toggling two types adds both to the filter", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();

    // Simulate controlled updates by re-rendering with updated filter state
    const { rerender } = render(
      <SpeciesFilters {...buildProps({ onFiltersChange })} />
    );
    await user.click(screen.getByRole("button", { name: "Fire" }));
    const firstFilters = onFiltersChange.mock.calls[0]?.[0] as SpeciesFilterState;

    rerender(
      <SpeciesFilters
        {...buildProps({ filters: firstFilters, onFiltersChange })}
      />
    );
    await user.click(screen.getByRole("button", { name: "Dragon" }));
    const secondFilters = onFiltersChange.mock.calls[1]?.[0] as SpeciesFilterState;
    expect(secondFilters.types).toEqual(expect.arrayContaining(["Fire", "Dragon"]));
  });

  // ---------------------------------------------------------------------------
  // Role filter
  // ---------------------------------------------------------------------------

  it("renders the Role filter button", () => {
    render(<SpeciesFilters {...buildProps()} />);
    expect(
      screen.getByRole("button", { name: /^Role/i })
    ).toBeInTheDocument();
  });

  it("renders role options inside the role popover", () => {
    render(<SpeciesFilters {...buildProps()} />);
    // Since Popover is mocked to always render children, role buttons are in DOM.
    // "Speed Control" and "Weather Setter" are role-only labels — they don't
    // appear anywhere else in the component.
    expect(screen.getByRole("button", { name: "Speed Control" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weather Setter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terrain Setter" })).toBeInTheDocument();
  });

  it("clicking a role calls onFiltersChange with that role and its abilities", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(<SpeciesFilters {...buildProps({ onFiltersChange })} />);
    // "Intimidate" only appears in the role popover (not in quick pick moves)
    await user.click(screen.getByRole("button", { name: "Intimidate" }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Intimidate",
        abilities: ["Intimidate"],
        moves: [],
      })
    );
  });

  it("clicking an active role deactivates it and clears moves/abilities", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    const filters: SpeciesFilterState = {
      ...DEFAULT_FILTERS,
      role: "Intimidate",
      abilities: ["Intimidate"],
    };
    render(
      <SpeciesFilters {...buildProps({ filters, onFiltersChange })} />
    );
    // "Intimidate" only appears in the role popover — safe unambiguous target
    await user.click(screen.getByRole("button", { name: "Intimidate" }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ role: null, moves: [], abilities: [] })
    );
  });

  it("clicking Intimidate role sets abilities to ['Intimidate']", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(<SpeciesFilters {...buildProps({ onFiltersChange })} />);
    await user.click(screen.getByRole("button", { name: "Intimidate" }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Intimidate",
        abilities: ["Intimidate"],
        moves: [],
      })
    );
  });

  it("role button label shows active role name", () => {
    render(
      <SpeciesFilters
        {...buildProps({ filters: { ...DEFAULT_FILTERS, role: "Trick Room" } })}
      />
    );
    // Role trigger should display the active role name
    expect(screen.getByText("Role: Trick Room")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Learns Move filter
  // ---------------------------------------------------------------------------

  it("renders the 'Learns Move' filter button", () => {
    render(<SpeciesFilters {...buildProps()} />);
    expect(
      screen.getByRole("button", { name: /^Learns Move/i })
    ).toBeInTheDocument();
  });

  it("renders quick pick move buttons inside the move popover", () => {
    render(<SpeciesFilters {...buildProps()} />);
    // "Spore" and "Protect" only appear in quick pick moves (not in role list)
    expect(
      screen.getByRole("button", { name: "Protect" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Spore" })
    ).toBeInTheDocument();
  });

  it("clicking a quick pick move calls onFiltersChange with that move added", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(<SpeciesFilters {...buildProps({ onFiltersChange })} />);
    await user.click(screen.getByRole("button", { name: "Protect" }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ moves: ["Protect"] })
    );
  });

  it("clicking a quick pick move that is already active does not duplicate it", () => {
    const onFiltersChange = jest.fn();
    const filters: SpeciesFilterState = {
      ...DEFAULT_FILTERS,
      moves: ["Protect"],
    };
    render(
      <SpeciesFilters {...buildProps({ filters, onFiltersChange })} />
    );
    // Protect quick pick is disabled when already in filter
    const protectBtn = screen.getByRole("button", { name: "Protect" });
    expect(protectBtn).toBeDisabled();
  });

  it("renders active moves as removable badges", () => {
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, moves: ["Tailwind"] },
        })}
      />
    );
    expect(screen.getByText("Tailwind ×")).toBeInTheDocument();
  });

  it("clicking a move badge removes the move from the filter", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, moves: ["Tailwind"] },
          onFiltersChange,
        })}
      />
    );
    await user.click(screen.getByText("Tailwind ×"));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ moves: [] })
    );
  });

  it("shows move count in the Learns Move button label when moves are active", () => {
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, moves: ["Protect", "Fake Out"] },
        })}
      />
    );
    expect(screen.getByText("Learns Move (2)")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Stats filter
  // ---------------------------------------------------------------------------

  it("renders the Stats filter button", () => {
    render(<SpeciesFilters {...buildProps()} />);
    expect(
      screen.getByRole("button", { name: /^Stats/i })
    ).toBeInTheDocument();
  });

  it("renders min and max inputs for each of the 6 stats", () => {
    render(<SpeciesFilters {...buildProps()} />);
    // 6 stats × 2 inputs = 12 number inputs, plus the moves search input
    const numberInputs = screen
      .getAllByRole("spinbutton")
      .filter((el) => el.getAttribute("type") === "number");
    expect(numberInputs).toHaveLength(12);
  });

  it("changing a min stat input calls onFiltersChange with parsed value", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(<SpeciesFilters {...buildProps({ onFiltersChange })} />);
    // HP min input — first spinbutton. Each keystroke fires individually,
    // so we type a single digit and assert on the last call.
    const hpMinInput = screen.getAllByRole("spinbutton")[0]!;
    await user.clear(hpMinInput);
    await user.type(hpMinInput, "8");
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        minBaseStat: expect.objectContaining({ hp: 8 }),
      })
    );
  });

  it("changing a max stat input calls onFiltersChange with parsed value", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(<SpeciesFilters {...buildProps({ onFiltersChange })} />);
    // HP max input — second spinbutton. Single digit to keep assertion simple.
    const hpMaxInput = screen.getAllByRole("spinbutton")[1]!;
    await user.clear(hpMaxInput);
    await user.type(hpMaxInput, "5");
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        maxBaseStat: expect.objectContaining({ hp: 5 }),
      })
    );
  });

  it("clearing a stat input removes the key from minBaseStat", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, minBaseStat: { hp: 80 } },
          onFiltersChange,
        })}
      />
    );
    const hpMinInput = screen.getAllByRole("spinbutton")[0]!;
    await user.clear(hpMinInput);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        minBaseStat: expect.objectContaining({ hp: undefined }),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // Clear filters button
  // ---------------------------------------------------------------------------

  it("does NOT render a Clear button when no filters are active", () => {
    render(<SpeciesFilters {...buildProps()} />);
    expect(
      screen.queryByRole("button", { name: /clear/i })
    ).not.toBeInTheDocument();
  });

  it("renders a Clear button when type filter is active", () => {
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, types: ["Fire"] },
        })}
      />
    );
    expect(
      screen.getByRole("button", { name: /clear/i })
    ).toBeInTheDocument();
  });

  it("renders a Clear button when move filter is active", () => {
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, moves: ["Protect"] },
        })}
      />
    );
    expect(
      screen.getByRole("button", { name: /clear/i })
    ).toBeInTheDocument();
  });

  it("renders a Clear button when role is active", () => {
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, role: "Tailwind", moves: ["Tailwind"] },
        })}
      />
    );
    expect(
      screen.getByRole("button", { name: /clear/i })
    ).toBeInTheDocument();
  });

  it("clicking Clear calls onFiltersChange with DEFAULT_FILTERS", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, types: ["Dragon"] },
          onFiltersChange,
        })}
      />
    );
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onFiltersChange).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });

  // ---------------------------------------------------------------------------
  // Result count
  // ---------------------------------------------------------------------------

  it("does NOT show result count when filteredCount equals totalCount", () => {
    render(
      <SpeciesFilters
        {...buildProps({ totalCount: 100, filteredCount: 100 })}
      />
    );
    expect(screen.queryByText(/of 100/)).not.toBeInTheDocument();
  });

  it("shows result count when filteredCount is less than totalCount", () => {
    render(
      <SpeciesFilters
        {...buildProps({ totalCount: 100, filteredCount: 42 })}
      />
    );
    expect(screen.getByText("42 of 100")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Team need suggestions (synergy)
  // ---------------------------------------------------------------------------

  it("does NOT render team needs section when currentTeam is empty", () => {
    mockCalculateTeamSynergy.mockReturnValue(null);
    render(<SpeciesFilters {...buildProps({ currentTeam: [] })} />);
    expect(screen.queryByText("Team needs:")).not.toBeInTheDocument();
  });

  it("calls calculateTeamSynergy when currentTeam has members", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: {},
      uncoveredTypes: new Set(),
    });
    const team = [{ species: "Garchomp" }, { species: "Arcanine" }];
    render(<SpeciesFilters {...buildProps({ currentTeam: team })} />);
    expect(mockCalculateTeamSynergy).toHaveBeenCalledWith(team);
  });

  it("renders 'Team needs:' label when neededTypes are present", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Water: 3, Ice: 2 },
      uncoveredTypes: new Set(["Water", "Ice"]),
    });
    render(
      <SpeciesFilters
        {...buildProps({ currentTeam: [{ species: "Garchomp" }] })}
      />
    );
    expect(screen.getByText("Team needs:")).toBeInTheDocument();
  });

  it("renders a 'Covers Type' button for each needed type", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Water: 2 },
      uncoveredTypes: new Set(["Water"]),
    });
    render(
      <SpeciesFilters
        {...buildProps({ currentTeam: [{ species: "Garchomp" }] })}
      />
    );
    expect(screen.getByText("✦ Covers Water")).toBeInTheDocument();
  });

  it("clicking a needed type calls onFiltersChange with that type added", async () => {
    const user = userEvent.setup();
    const onFiltersChange = jest.fn();
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Water: 2 },
      uncoveredTypes: new Set(["Water"]),
    });
    render(
      <SpeciesFilters
        {...buildProps({
          currentTeam: [{ species: "Garchomp" }],
          onFiltersChange,
        })}
      />
    );
    await user.click(screen.getByText("✦ Covers Water"));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["Water"] })
    );
  });

  it("does NOT show a type as needed when its weakCount is < 2", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Water: 1 },
      uncoveredTypes: new Set(["Water"]),
    });
    render(
      <SpeciesFilters
        {...buildProps({ currentTeam: [{ species: "Garchomp" }] })}
      />
    );
    expect(screen.queryByText("✦ Covers Water")).not.toBeInTheDocument();
  });

  it("does NOT show a type as needed when it is covered (not in uncoveredTypes)", () => {
    mockCalculateTeamSynergy.mockReturnValue({
      sharedWeaknesses: { Water: 3 },
      uncoveredTypes: new Set<string>(),
    });
    render(
      <SpeciesFilters
        {...buildProps({ currentTeam: [{ species: "Garchomp" }] })}
      />
    );
    expect(screen.queryByText("✦ Covers Water")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Type filter — count label and state
  // ---------------------------------------------------------------------------

  it("shows type count in the Type button label when types are active", () => {
    render(
      <SpeciesFilters
        {...buildProps({
          filters: { ...DEFAULT_FILTERS, types: ["Fire", "Dragon"] },
        })}
      />
    );
    expect(screen.getByText("Type (2)")).toBeInTheDocument();
  });

  it("does not show type count when no types are active", () => {
    render(<SpeciesFilters {...buildProps()} />);
    // Should just say "Type" with no count suffix
    const typeButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent === "Type");
    expect(typeButtons.length).toBeGreaterThan(0);
  });
});
