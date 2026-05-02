import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";

import type { FilterAction } from "../pickers/species-smart-search";

// =============================================================================
// Mock next/image — JSDOM cannot render Next.js Image; render a plain <img>.
// =============================================================================

jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    src,
    alt,
    width,
    height,
    ...rest
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    [key: string]: unknown;
  }) {
    return <img src={src} alt={alt} width={width} height={height} {...rest} />;
  },
}));

// =============================================================================
// Mock @trainers/pokemon — search, legality, index building, and helpers.
// buildSpeciesSearchIndex is called during render, so mock before import.
// =============================================================================

const mockBuildSpeciesSearchIndex = jest.fn();
const mockIsLegalSpecies = jest.fn();
const mockSearchSpecies = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  ...jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon"),
  buildSpeciesSearchIndex: (...args: unknown[]) =>
    mockBuildSpeciesSearchIndex(...args),
  isLegalSpecies: (...args: unknown[]) => mockIsLegalSpecies(...args),
  searchSpecies: (...args: unknown[]) => mockSearchSpecies(...args),
  isChampionsFormat: jest.fn(() => false),
  getAllLegalAbilities: jest.fn(() => []),
  getAllLegalMoves: jest.fn(() => []),
  calculateTeamSynergy: jest.fn(() => null),
  getAbilityShortDesc: jest.fn(() => null),
  ALL_TYPES: ["Normal", "Fire", "Water", "Electric", "Grass"],
}));

// =============================================================================
// Mock @trainers/pokemon/sprites
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({
    url: "/sprites/test.png",
    pixelated: false,
  })),
  getShowdownTypeIconUrl: jest.fn(
    (type: string) => `https://example.com/sprites/${type}.png`
  ),
}));

// =============================================================================
// Mock role-registry — tested separately
// =============================================================================

jest.mock("../pickers/role-registry", () => ({
  getRolesForSpecies: jest.fn(() => []),
  getRoleById: jest.fn(() => null),
  ROLE_PRESETS: [],
  ROLE_GROUP_LABELS: {},
  ROLE_GROUP_ORDER: [],
  GROUP_COLORS: {},
}));

// =============================================================================
// Mock sub-components to isolate SpeciesPicker logic
// =============================================================================

jest.mock("../pickers/species-sidebar", () => ({
  SpeciesSidebar: ({
    filters,
    onFiltersChange,
  }: {
    filters: {
      types: string[];
      ability: string | null;
      moves: string[];
      roles: string[];
      megaOnly: boolean;
    };
    onFiltersChange: (f: typeof filters) => void;
  }) => (
    <div data-testid="species-sidebar" data-filters={JSON.stringify(filters)}>
      <button
        data-testid="sidebar-type-fire"
        onClick={() =>
          onFiltersChange({ ...filters, types: [...filters.types, "Fire"] })
        }
      >
        Fire
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

jest.mock("../pickers/ability-cell", () => ({
  AbilityCell: ({
    name,
    onFilter,
  }: {
    name: string | null;
    slot: string;
    onFilter?: (n: string) => void;
  }) =>
    name ? (
      <span
        data-testid={`ability-${name}`}
        onClick={onFilter ? () => onFilter(name) : undefined}
      >
        {name}
      </span>
    ) : (
      <span>—</span>
    ),
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
      onClick={onClick ? () => onClick(roleId) : undefined}
    >
      {roleId}
    </button>
  ),
}));

// Pin the mock's emitted action shape to the real FilterAction via `satisfies`.
// If the real onFilter ever changes shape, these literals stop type-checking
// and the test forces an update — guarding against the "test asserts against
// the mock instead of behavior" failure mode.
const SMART_FILTER_TYPE = { type: "Fire" } satisfies FilterAction;
const SMART_FILTER_MOVE = { move: "Tailwind" } satisfies FilterAction;
const SMART_FILTER_ABILITY = { ability: "Drought" } satisfies FilterAction;

jest.mock("../pickers/species-smart-search", () => ({
  SpeciesSmartSearch: ({
    query,
    onFilter,
  }: {
    query: string;
    index: unknown[];
    format: unknown;
    onFilter: (action: FilterAction) => void;
  }) => (
    <div data-testid="species-smart-search" data-query={query}>
      <button
        data-testid="smart-filter-type"
        onClick={() => onFilter(SMART_FILTER_TYPE)}
      >
        Filter Fire
      </button>
      <button
        data-testid="smart-filter-move"
        onClick={() => onFilter(SMART_FILTER_MOVE)}
      >
        Filter Tailwind
      </button>
      <button
        data-testid="smart-filter-ability"
        onClick={() => onFilter(SMART_FILTER_ABILITY)}
      >
        Filter Drought
      </button>
    </div>
  ),
}));

// =============================================================================
// JSDOM doesn't implement layout/scroll APIs, so @tanstack/react-virtual
// reports zero visible items. Mock it to render every row.
// =============================================================================

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 60,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 60,
        size: 60,
      })),
  }),
}));

// =============================================================================
// Mock CSS module
// =============================================================================

jest.mock("../builder.module.css", () => new Proxy({}, { get: (_t, k) => k }));

import { SpeciesPicker } from "../pickers/species-picker";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Test data
// =============================================================================

function makeEntry(
  overrides: Partial<{
    species: string;
    types: string[];
    abilitySlot1: string | null;
    abilitySlot2: string | null;
    hiddenAbility: string | null;
    roles: string[];
    baseStats: Record<string, number>;
    bst: number;
  }> = {}
) {
  return {
    species: "Pikachu",
    types: ["Electric"],
    abilitySlot1: "Static",
    abilitySlot2: "Lightning Rod",
    hiddenAbility: null,
    roles: [],
    baseStats: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
    bst: 320,
    ...overrides,
  };
}

const BULBASAUR = makeEntry({
  species: "Bulbasaur",
  types: ["Grass", "Poison"],
  abilitySlot1: "Overgrow",
  abilitySlot2: null,
  hiddenAbility: "Chlorophyll",
  baseStats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
  bst: 318,
});

const GARCHOMP = makeEntry({
  species: "Garchomp",
  types: ["Dragon", "Ground"],
  abilitySlot1: "Rough Skin",
  abilitySlot2: "Sand Veil",
  hiddenAbility: "Sand Force",
  baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
  bst: 600,
});

const PIKACHU = makeEntry();

const MOCK_INDEX = [BULBASAUR, GARCHOMP, PIKACHU];

function makeMockFormat(): GameFormat {
  return {
    id: "gen9vgc2025regg",
    label: "VGC 2025 Reg G",
    generation: 9,
    isChampions: false,
    isChampionsTeamSize: false,
    legalLevelCap: 50,
  } as unknown as GameFormat;
}

// =============================================================================
// SpeciesPicker tests
// =============================================================================

describe("SpeciesPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: index returns all species, all legal, search returns full list
    mockBuildSpeciesSearchIndex.mockReturnValue(MOCK_INDEX);
    mockIsLegalSpecies.mockReturnValue(true);
    mockSearchSpecies.mockImplementation(
      (index: typeof MOCK_INDEX, query: string, _opts: unknown) => {
        if (!query) return index;
        const q = query.toLowerCase();
        return index.filter((e) => e.species.toLowerCase().includes(q));
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders the species rows container", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("species-rows")).toBeInTheDocument();
  });

  it("renders a row for each species in the index", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Bulbasaur")).toBeInTheDocument();
    expect(screen.getByText("Garchomp")).toBeInTheDocument();
    expect(screen.getByText("Pikachu")).toBeInTheDocument();
  });

  it("renders the SpeciesSidebar", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("species-sidebar")).toBeInTheDocument();
  });

  it("renders the RolePresetsPanel", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByTestId("role-presets-panel")).toBeInTheDocument();
  });

  it("shows count display in header: matched of total", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // 3 of 3 shown
    expect(
      screen.getByText(`${MOCK_INDEX.length} of ${MOCK_INDEX.length}`)
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  it("clicking a species row calls onPick with the species name", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={onPick}
        onClose={jest.fn()}
      />
    );
    // Each species row is `<div role="row" aria-label="Select <species>">`.
    // The overlay click target is aria-hidden (keyboard goes through the row's
    // own keydown handler), so we query the row directly.
    const row = screen.getByRole("row", { name: /select bulbasaur/i });
    await user.click(row);
    expect(onPick).toHaveBeenCalledWith("Bulbasaur");
  });

  it("clicking Garchomp calls onPick with 'Garchomp'", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={onPick}
        onClose={jest.fn()}
      />
    );
    const row = screen.getByRole("row", { name: /select garchomp/i });
    await user.click(row);
    expect(onPick).toHaveBeenCalledWith("Garchomp");
  });

  it("the currently-selected species row has a highlighted background class", () => {
    render(
      <SpeciesPicker
        value="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // The row div[role="row"] for Garchomp should have bg-primary/5
    const row = screen.getByRole("row", { name: /select garchomp/i });
    expect(row.className).toContain("bg-primary/5");
  });

  it("non-selected rows do not have the highlighted class", () => {
    render(
      <SpeciesPicker
        value="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const row = screen.getByRole("row", { name: /select bulbasaur/i });
    expect(row.className).not.toContain("bg-primary/5");
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it("shows an empty state message when no species match", () => {
    mockSearchSpecies.mockReturnValue([]);
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(
      screen.getByText(/no pokémon match your filters/i)
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Format legality filtering
  // ---------------------------------------------------------------------------

  it("pre-filters species by legality when a format is provided", () => {
    const format = makeMockFormat();
    // Only Garchomp is legal
    mockIsLegalSpecies.mockImplementation(
      (species: string, _formatId: string) => species === "Garchomp"
    );
    // searchSpecies receives only the legal subset
    mockSearchSpecies.mockImplementation((index: typeof MOCK_INDEX) => index);

    render(
      <SpeciesPicker
        value={null}
        format={format}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // searchSpecies is called — only Garchomp passes legality
    const [indexArg] = mockSearchSpecies.mock.calls[0] as [
      typeof MOCK_INDEX,
      ...unknown[],
    ];
    expect(indexArg).toHaveLength(1);
    expect(indexArg[0]?.species).toBe("Garchomp");
  });

  it("does not filter by legality when no format is provided", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(mockIsLegalSpecies).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Sprite rendering
  // ---------------------------------------------------------------------------

  it("renders an img element for each species row", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const imgs = screen.getAllByRole("img");
    // One img per species (3 in MOCK_INDEX)
    expect(imgs.length).toBeGreaterThanOrEqual(MOCK_INDEX.length);
  });

  it("img alt text matches the species name", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByAltText("Garchomp")).toBeInTheDocument();
    expect(screen.getByAltText("Bulbasaur")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // High-stat highlight (>=110)
  // ---------------------------------------------------------------------------

  it("applies high-stat class to stats >= 110", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // Garchomp has atk=130
    const statCell = screen.getAllByText("130")[0];
    expect(statCell?.className).toContain("text-stat-good");
  });

  it("does NOT apply high-stat class to stats < 110", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const lowStatCells = screen.getAllByText("35");
    const unhighlighted = lowStatCells.find(
      (el) => !el.className.includes("text-stat-good")
    );
    expect(unhighlighted).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Smart search — shown when query is non-empty
  // ---------------------------------------------------------------------------

  it("renders smart search panel above the table when query is non-empty", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByTestId("species-search");
    await user.type(input, "fire");
    // Smart-search panel and species table both render — Pokémon results
    // live in the table (filtered by query), the smart-search offers
    // Type / Moves / Abilities suggestions above.
    expect(screen.getByTestId("species-smart-search")).toBeInTheDocument();
    expect(screen.getByTestId("species-rows")).toBeInTheDocument();
  });

  it("hides smart search panel when query is cleared", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByTestId("species-search");
    await user.type(input, "fire");
    await user.clear(input);
    expect(
      screen.queryByTestId("species-smart-search")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("species-rows")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Filter chip integration tests
  // ---------------------------------------------------------------------------

  it("clicking type button in sidebar adds a filter chip", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    await user.click(screen.getByTestId("sidebar-type-fire"));
    // Active filters surface as a filter-count badge in the search header
    expect(
      screen.getByRole("button", { name: /Clear 1 active filter/i })
    ).toBeInTheDocument();
  });

  it("clicking role button in role panel adds a role filter", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    await user.click(screen.getByTestId("role-btn-spread"));
    expect(
      screen.getByRole("button", { name: /Clear 1 active filter/i })
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Click-to-filter: ability cell and role chip
  // ---------------------------------------------------------------------------

  it("clicking an ability in a row filters by ability", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // AbilityCell stub renders data-testid="ability-{name}"
    await user.click(screen.getByTestId("ability-Overgrow"));
    expect(
      screen.getByRole("button", { name: /Clear 1 active filter/i })
    ).toBeInTheDocument();
  });

  // Row-level role chips were removed from the species table — role filtering
  // is now driven exclusively by the RolePresetsPanel in the middle column.

  // ---------------------------------------------------------------------------
  // Enter key — exact species match → pick + close
  // ---------------------------------------------------------------------------

  it("pressing Enter on an exact species name calls onPick and onClose", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={onPick}
        onClose={onClose}
      />
    );
    const input = screen.getByTestId("species-search");
    await user.type(input, "Bulbasaur");
    await user.keyboard("{Enter}");
    expect(onPick).toHaveBeenCalledWith("Bulbasaur");
    expect(onClose).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Enter key — top type filter when no exact match
  // ---------------------------------------------------------------------------

  it("pressing Enter with a type prefix adds a type filter and clears query", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByTestId("species-search");
    // "Fire" is in the mocked ALL_TYPES; type "fir" to trigger prefix match
    await user.type(input, "fir");
    await user.keyboard("{Enter}");
    // Filter-count badge appears and query is cleared
    expect(
      screen.getByRole("button", { name: /Clear 1 active filter/i })
    ).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  // ---------------------------------------------------------------------------
  // Smart search filter integration
  // ---------------------------------------------------------------------------

  it("clicking Filter Fire in smart search adds type chip and clears query", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByTestId("species-search");
    await user.type(input, "fi");
    // Smart search is shown
    await user.click(screen.getByTestId("smart-filter-type"));
    // Query is cleared and filter-count badge appears
    expect(input).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /Clear 1 active filter/i })
    ).toBeInTheDocument();
  });

  // Pokémon results are no longer surfaced inside SpeciesSmartSearch — they
  // live in the main species table (filtered by the same query). The
  // smart-search panel only offers Type / Moves / Abilities suggestions.

  // ---------------------------------------------------------------------------
  // Default sort: Speed DESC
  // ---------------------------------------------------------------------------

  it("default sort is Speed descending — SPE column shows ↓ indicator", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // The SPE sort button should be active and show the descending arrow
    const speButton = screen.getByRole("button", { name: "Sort by SPE" });
    expect(speButton).toHaveAttribute("aria-pressed", "true");
    expect(speButton).toHaveTextContent("↓");
  });

  it("default sort renders rows in Speed DESC order (Garchomp > Pikachu > Bulbasaur)", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // Rows are role="row" with aria-label "Select <species>".
    // Filter to only species rows (not the header row).
    const rows = screen.getAllByRole("row", { name: /select/i });
    const names = rows.map((r) => r.getAttribute("aria-label") ?? "");
    // Garchomp spe=102, Pikachu spe=90, Bulbasaur spe=45 → DESC order.
    // Use indexOf-relative assertions so the test survives if faster species
    // are added to the fixture later.
    expect(names).toContain("Select Garchomp");
    expect(names).toContain("Select Pikachu");
    expect(names).toContain("Select Bulbasaur");
    expect(names.indexOf("Select Garchomp")).toBeLessThan(
      names.indexOf("Select Pikachu")
    );
    expect(names.indexOf("Select Pikachu")).toBeLessThan(
      names.indexOf("Select Bulbasaur")
    );
  });

  // ---------------------------------------------------------------------------
  // handleSmartFilter — move and ability branches
  // ---------------------------------------------------------------------------

  it("smart-filter with kind=move adds the move to filters and clears query", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByTestId("species-search");
    await user.type(input, "tail");
    // Smart-search panel is now visible
    await user.click(screen.getByTestId("smart-filter-move"));
    // Query must be cleared
    expect(input).toHaveValue("");
    // The sidebar mock serialises filters into data-filters; Tailwind move
    // should now be in filters.moves
    const sidebarEl = screen.getByTestId("species-sidebar");
    const filters = JSON.parse(
      (sidebarEl as HTMLElement).dataset.filters ?? "{}"
    ) as { moves?: string[] };
    expect(filters.moves).toContain("Tailwind");
    // Filter count badge reflects 1 active filter
    expect(
      screen.getByRole("button", { name: /Clear 1 active filter/i })
    ).toBeInTheDocument();
  });

  it("smart-filter-move is idempotent — clicking the same move twice does not duplicate it", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByTestId("species-search");

    await user.type(input, "tail");
    await user.click(screen.getByTestId("smart-filter-move"));

    // Re-trigger: re-type and click again. The handler at species-picker.tsx
    // guards `!prev.moves.includes(move)` — without it, Tailwind would land
    // in filters.moves twice.
    await user.type(input, "tail");
    await user.click(screen.getByTestId("smart-filter-move"));

    const sidebarEl = screen.getByTestId("species-sidebar");
    const filters = JSON.parse(
      (sidebarEl as HTMLElement).dataset.filters ?? "{}"
    ) as { moves?: string[] };
    expect(filters.moves).toEqual(["Tailwind"]);
  });

  it("smart-filter with kind=ability sets filters.ability and clears query", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByTestId("species-search");
    await user.type(input, "dro");
    // Smart-search panel is now visible
    await user.click(screen.getByTestId("smart-filter-ability"));
    // Query must be cleared
    expect(input).toHaveValue("");
    // filters.ability should be set to "Drought"
    const sidebarEl = screen.getByTestId("species-sidebar");
    const filters = JSON.parse(
      (sidebarEl as HTMLElement).dataset.filters ?? "{}"
    ) as { ability?: string | null };
    expect(filters.ability).toBe("Drought");
    // Filter count badge reflects 1 active filter
    expect(
      screen.getByRole("button", { name: /Clear 1 active filter/i })
    ).toBeInTheDocument();
  });
});
