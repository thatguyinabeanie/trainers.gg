import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";
import type * as SpeciesFiltersModule from "../pickers/species-filters";

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
// Mock @trainers/pokemon — search, legality, and index building.
// buildSpeciesSearchIndex is called at module initialisation (getCachedIndex),
// so we must mock it before importing SpeciesPicker.
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
}));

// =============================================================================
// Mock @trainers/pokemon/sprites
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({
    url: "/sprites/test.png",
    pixelated: false,
  })),
}));

// =============================================================================
// Mock SpeciesFilters — tested separately in species-filters.test.tsx.
// The stub renders a div that surfaces its props via data-* so we can assert
// on them without pulling in SpeciesFilters' own dependencies.
// =============================================================================

jest.mock("../pickers/species-filters", () => {
  const speciesFiltersActual: typeof SpeciesFiltersModule = jest.requireActual(
    "../pickers/species-filters"
  );
  const { DEFAULT_FILTERS } = speciesFiltersActual;

  return {
    DEFAULT_FILTERS,
    SpeciesFilters: ({
      query,
      onQueryChange,
      totalCount,
      filteredCount,
    }: {
      query: string;
      onQueryChange: (q: string) => void;
      totalCount: number;
      filteredCount: number;
    }) => (
      <div data-testid="species-filters" data-query={query}>
        <input
          aria-label="Search species"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          data-testid="species-search"
        />
        <span data-testid="total-count">{totalCount}</span>
        <span data-testid="filtered-count">{filteredCount}</span>
      </div>
    ),
  };
});

// =============================================================================
// JSDOM doesn't implement layout/scroll APIs, so @tanstack/react-virtual
// reports zero visible items. Mock it to render every row.
// =============================================================================

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 64,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 64,
        size: 64,
      })),
  }),
}));

// =============================================================================
// Mock CSS module
// =============================================================================

jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

import { SpeciesPicker } from "../pickers/species-picker";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Test data
// =============================================================================

function makeEntry(
  overrides: Partial<{
    species: string;
    types: string[];
    abilities: string[];
    baseStats: Record<string, number>;
    bst: number;
  }> = {}
) {
  return {
    species: "Pikachu",
    types: ["Electric"],
    abilities: ["Static", "Lightning Rod"],
    baseStats: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
    bst: 320,
    ...overrides,
  };
}

const BULBASAUR = makeEntry({
  species: "Bulbasaur",
  types: ["Grass", "Poison"],
  abilities: ["Overgrow", "Chlorophyll"],
  baseStats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
  bst: 318,
});

const GARCHOMP = makeEntry({
  species: "Garchomp",
  types: ["Dragon", "Ground"],
  abilities: ["Rough Skin", "Sand Veil", "Sand Force"],
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
      (
        index: typeof MOCK_INDEX,
        query: string,
        _opts: unknown
      ) => {
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

  it("renders ability text for each species row", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(
      screen.getByText("Rough Skin · Sand Veil · Sand Force")
    ).toBeInTheDocument();
    expect(screen.getByText("Static · Lightning Rod")).toBeInTheDocument();
  });

  it("renders column header labels", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Types")).toBeInTheDocument();
    expect(screen.getByText("HP")).toBeInTheDocument();
    expect(screen.getByText("BST")).toBeInTheDocument();
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
    await user.click(
      screen.getByRole("button", { name: /select bulbasaur/i })
    );
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
    await user.click(
      screen.getByRole("button", { name: /select garchomp/i })
    );
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
    const row = screen.getByRole("button", { name: /select garchomp/i });
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
    const row = screen.getByRole("button", { name: /select bulbasaur/i });
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
      ...unknown[]
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
    // Garchomp has atk=130 — should get the highlight class
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // Find stat cells within Garchomp's row
    const garChompRow = screen
      .getByRole("button", { name: /select garchomp/i })
      .closest("div");
    expect(garChompRow).toBeTruthy();
    // The 130 atk value should be in the DOM
    const statCell = screen.getAllByText("130")[0];
    expect(statCell?.className).toContain("text-stat-good");
  });

  it("does NOT apply high-stat class to stats < 110", () => {
    // Pikachu has hp=35 — should not get highlight
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const lowStatCells = screen.getAllByText("35");
    // At least one of the "35" cells belongs to Pikachu's hp — no highlight class
    const unhighlighted = lowStatCells.find(
      (el) => !el.className.includes("text-stat-good")
    );
    expect(unhighlighted).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  it("renders a 'Sort by name' button in the header", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /sort by name/i })
    ).toBeInTheDocument();
  });

  it("renders a 'Sort by BST' button in the header", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /sort by bst/i })
    ).toBeInTheDocument();
  });

  it("clicking a stat sort header changes active sort indicator", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const bstBtn = screen.getByRole("button", { name: /sort by bst/i });
    await user.click(bstBtn);
    // After clicking BST, a sort arrow should appear next to BST
    expect(bstBtn.textContent).toMatch(/↓|↑/);
  });

  it("clicking name sort twice toggles direction", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const nameBtn = screen.getByRole("button", { name: /sort by name/i });
    // First click — already on name/asc so it shows ↑
    expect(nameBtn.textContent).toMatch(/↑/);
    await user.click(nameBtn);
    expect(nameBtn.textContent).toMatch(/↓/);
    await user.click(nameBtn);
    expect(nameBtn.textContent).toMatch(/↑/);
  });

  // ---------------------------------------------------------------------------
  // SpeciesFilters integration
  // ---------------------------------------------------------------------------

  it("passes totalCount to SpeciesFilters", () => {
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const total = screen.getByTestId("total-count");
    expect(total.textContent).toBe(String(MOCK_INDEX.length));
  });

  it("passes filteredCount matching matched species to SpeciesFilters", () => {
    // searchSpecies returns only 1 species
    mockSearchSpecies.mockReturnValue([GARCHOMP]);
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const filtered = screen.getByTestId("filtered-count");
    expect(filtered.textContent).toBe("1");
  });

  it("updating search in SpeciesFilters stub triggers re-render", async () => {
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
    await user.type(input, "Garc");
    // mockSearchSpecies should now be called with the new query
    const calls = mockSearchSpecies.mock.calls;
    const lastCall = calls[calls.length - 1] as [unknown, string, ...unknown[]];
    expect(lastCall[1]).toBe("Garc");
  });
});
