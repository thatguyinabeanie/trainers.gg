import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// searchSpecies drives the filtered list — control it in tests.
jest.mock("@trainers/pokemon", () => ({
  searchSpecies: jest.fn(
    (index: unknown[], _query: string, _filters: unknown) => index
  ),
  // Real legality logic: Landorus-Therian is banned in Champions M-A,
  // Incineroar is legal everywhere we test.
  isLegalSpecies: jest.fn((species: string, formatId: string) => {
    if (formatId === "championsvgc2026regma") {
      return species !== "Landorus-Therian";
    }
    return true;
  }),
  ALL_TYPES: [
    "Normal",
    "Fire",
    "Water",
    "Grass",
    "Electric",
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
  ],
  calculateTeamSynergy: jest.fn(() => ({
    sharedWeaknesses: {},
    uncoveredTypes: new Set(),
  })),
}));

// next/image renders an <img> for ease of testing.
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    unoptimized: _unoptimized,
    priority: _priority,
    fill: _fill,
    loader: _loader,
    placeholder: _placeholder,
    ...rest
  }: Record<string, unknown>) => {
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

// Stub the sprite resolver — the picker only needs the URL to render.
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn((species: string) => ({
    url: `https://example.test/${species}.png`,
    w: 96,
    h: 96,
    pixelated: false,
  })),
}));

// Keep SpeciesFilters lightweight — only need a search input that drives
// onQueryChange so we can assert searchSpecies receives the query.
jest.mock("../species-filters", () => ({
  SpeciesFilters: ({
    query,
    onQueryChange,
  }: {
    query: string;
    onQueryChange: (q: string) => void;
    filters: unknown;
    onFiltersChange: (f: unknown) => void;
    currentTeam: Array<{ species: string }>;
    totalCount: number;
    filteredCount: number;
  }) => (
    <div data-testid="species-filters">
      <input
        data-testid="search-input"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search..."
      />
    </div>
  ),
  DEFAULT_FILTERS: {
    types: [],
    abilities: [],
    moves: [],
    role: null,
    minBaseStat: {},
    maxBaseStat: {},
  },
}));

// TypeSymbolIcon uses a Tooltip (requires provider in tests). Stub it to a
// simple <span role="img" aria-label={type}> so aria-label assertions work
// without setting up Tooltip providers.
jest.mock("../type-symbol-icon", () => ({
  TypeSymbolIcon: ({ type, size }: { type: string; size?: number }) => (
    <span role="img" aria-label={type} data-testid="type-icon" data-size={size}>
      {type}
    </span>
  ),
}));

import { within } from "@testing-library/react";

import { SpeciesPicker } from "../species-picker";
import { type SpeciesSearchEntry } from "@trainers/pokemon";

// =============================================================================
// Factories
// =============================================================================

function makeEntry(
  species: string,
  overrides: Partial<SpeciesSearchEntry> = {}
): SpeciesSearchEntry {
  return {
    species,
    types: ["Normal"],
    abilities: ["Intimidate"],
    baseStats: { hp: 90, atk: 100, def: 80, spa: 80, spd: 80, spe: 75 },
    bst: 505,
    ...overrides,
  };
}

const defaultProps = {
  speciesIndex: [
    makeEntry("Incineroar", { types: ["Fire", "Dark"] }),
    makeEntry("Rillaboom", { types: ["Grass"] }),
    makeEntry("Gastrodon", { types: ["Water", "Ground"] }),
  ],
  currentTeam: [] as Array<{ species: string }>,
  currentSpecies: null as string | null,
  onSelect: jest.fn(),
  onCancel: jest.fn(),
};

// =============================================================================
// Tests
// =============================================================================

describe("SpeciesPicker (rich rows)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset searchSpecies to its default pass-through.
    const { searchSpecies } = jest.requireMock("@trainers/pokemon") as {
      searchSpecies: jest.Mock;
    };
    searchSpecies.mockImplementation(
      (index: unknown[], _query: string, _filters: unknown) => index
    );
  });

  describe("header", () => {
    it("renders the 'Choose a species' heading", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByText("Choose a species")).toBeInTheDocument();
    });

    it("renders the Cancel button", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it("calls onCancel when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();
      render(<SpeciesPicker {...defaultProps} onCancel={onCancel} />);
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("filters", () => {
    it("renders SpeciesFilters", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByTestId("species-filters")).toBeInTheDocument();
    });
  });

  describe("rich rows", () => {
    it("renders one row per matched species with name, abilities, and stats", () => {
      render(<SpeciesPicker {...defaultProps} />);
      // Names visible
      expect(screen.getByText("Incineroar")).toBeInTheDocument();
      expect(screen.getByText("Rillaboom")).toBeInTheDocument();
      expect(screen.getByText("Gastrodon")).toBeInTheDocument();
      // Each row exposes a Select button labeled with the species
      expect(
        screen.getByRole("button", { name: /Select Incineroar/ })
      ).toBeInTheDocument();
    });

    it("renders the BST value once per row", () => {
      render(<SpeciesPicker {...defaultProps} />);
      // Scope each BST assertion to its row button so the check is bound to
      // the BST column and won't collide with other cells that share the value.
      const rows = screen.getAllByRole("button", { name: /^Select / });
      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(within(row).getByText("505")).toBeInTheDocument();
      }
    });

    it("renders the column header (Types + HP / Atk / Def / SpA / SpD / Spe / BST)", () => {
      render(<SpeciesPicker {...defaultProps} />);
      // Types now lives in its own column with a dedicated header.
      expect(screen.getByText("Types")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sort by HP/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sort by Atk/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sort by Def/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sort by SpA/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sort by SpD/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sort by Spe/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Sort by BST/i })
      ).toBeInTheDocument();
    });

    it("renders type icons (not text pills) in the types column via aria-label", () => {
      render(<SpeciesPicker {...defaultProps} />);
      // TypeSymbolIcon renders role="img" with aria-label={type}.
      // Fire/Dark for Incineroar, Grass for Rillaboom, Water/Ground for Gastrodon.
      expect(screen.getByRole("img", { name: "Fire" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Dark" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Grass" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Water" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Ground" })).toBeInTheDocument();
    });

    it("header and body rows share the same grid template constant (ROW_GRID)", () => {
      render(<SpeciesPicker {...defaultProps} />);
      // The sticky header and the first data row both use the shared ROW_GRID
      // constant — verify they carry the same grid-cols class.
      const rowsContainer = screen.getByTestId("species-rows");
      // The header is the first child of the rows container.
      const header = rowsContainer.firstElementChild as HTMLElement;
      const firstRow = screen.getByRole("button", {
        name: /Select Gastrodon/,
      }) as HTMLElement;
      // Both must use the same grid-cols value (grid-cols-[2.75rem_minmax(0,1fr)_3rem_auto]).
      const expectedGridCols = "grid-cols-[2.75rem_minmax(0,1fr)_3rem_auto]";
      expect(header.className).toContain(expectedGridCols);
      expect(firstRow.className).toContain(expectedGridCols);
    });
  });

  describe("default sort — alphabetical by name", () => {
    it("renders rows in alphabetical order by default", () => {
      render(<SpeciesPicker {...defaultProps} />);
      const rows = screen.getAllByRole("button", { name: /^Select / });
      // Alphabetical: Gastrodon < Incineroar < Rillaboom
      expect(rows[0]).toHaveAccessibleName("Select Gastrodon");
      expect(rows[1]).toHaveAccessibleName("Select Incineroar");
      expect(rows[2]).toHaveAccessibleName("Select Rillaboom");
    });
  });

  describe("sortable column headers", () => {
    it("clicking the BST header sorts descending by BST", async () => {
      const user = userEvent.setup();
      const index = [
        makeEntry("Charizard", { bst: 534 }),
        makeEntry("Bulbasaur", { bst: 318 }),
        makeEntry("Mewtwo", { bst: 680 }),
      ];
      render(<SpeciesPicker {...defaultProps} speciesIndex={index} />);

      await user.click(screen.getByRole("button", { name: /Sort by BST/i }));

      const rows = screen.getAllByRole("button", { name: /^Select / });
      // Descending: Mewtwo (680) > Charizard (534) > Bulbasaur (318)
      expect(rows[0]).toHaveAccessibleName("Select Mewtwo");
      expect(rows[1]).toHaveAccessibleName("Select Charizard");
      expect(rows[2]).toHaveAccessibleName("Select Bulbasaur");
    });

    it("clicking the BST header a second time sorts ascending by BST", async () => {
      const user = userEvent.setup();
      const index = [
        makeEntry("Charizard", { bst: 534 }),
        makeEntry("Bulbasaur", { bst: 318 }),
        makeEntry("Mewtwo", { bst: 680 }),
      ];
      render(<SpeciesPicker {...defaultProps} speciesIndex={index} />);

      const bstBtn = screen.getByRole("button", { name: /Sort by BST/i });
      await user.click(bstBtn); // → desc
      await user.click(bstBtn); // → asc

      const rows = screen.getAllByRole("button", { name: /^Select / });
      // Ascending: Bulbasaur (318) < Charizard (534) < Mewtwo (680)
      expect(rows[0]).toHaveAccessibleName("Select Bulbasaur");
      expect(rows[1]).toHaveAccessibleName("Select Charizard");
      expect(rows[2]).toHaveAccessibleName("Select Mewtwo");
    });

    it("clicking the Name header toggles asc/desc", async () => {
      const user = userEvent.setup();
      render(<SpeciesPicker {...defaultProps} />);

      // Default is alphabetical asc (Gastrodon < Incineroar < Rillaboom).
      const nameBtn = screen.getByRole("button", { name: /Sort by name/i });

      // Click once — toggles to desc (Z→A).
      await user.click(nameBtn);
      let rows = screen.getAllByRole("button", { name: /^Select / });
      expect(rows[0]).toHaveAccessibleName("Select Rillaboom");
      expect(rows[1]).toHaveAccessibleName("Select Incineroar");
      expect(rows[2]).toHaveAccessibleName("Select Gastrodon");

      // Click again — back to asc (A→Z).
      await user.click(nameBtn);
      rows = screen.getAllByRole("button", { name: /^Select / });
      expect(rows[0]).toHaveAccessibleName("Select Gastrodon");
      expect(rows[1]).toHaveAccessibleName("Select Incineroar");
      expect(rows[2]).toHaveAccessibleName("Select Rillaboom");
    });

    it("switching from BST sort to Name sort resets to alpha-asc", async () => {
      const user = userEvent.setup();
      const index = [
        makeEntry("Charizard", { bst: 534 }),
        makeEntry("Bulbasaur", { bst: 318 }),
        makeEntry("Mewtwo", { bst: 680 }),
      ];
      render(<SpeciesPicker {...defaultProps} speciesIndex={index} />);

      // Sort by BST desc first.
      await user.click(screen.getByRole("button", { name: /Sort by BST/i }));
      // Then switch to Name.
      await user.click(screen.getByRole("button", { name: /Sort by name/i }));

      const rows = screen.getAllByRole("button", { name: /^Select / });
      expect(rows[0]).toHaveAccessibleName("Select Bulbasaur");
      expect(rows[1]).toHaveAccessibleName("Select Charizard");
      expect(rows[2]).toHaveAccessibleName("Select Mewtwo");
    });

    it("shows sort arrow on the active column header", async () => {
      const user = userEvent.setup();
      render(<SpeciesPicker {...defaultProps} />);

      // Default: Name column shows ascending arrow.
      const nameBtn = screen.getByRole("button", { name: /Sort by name/i });
      expect(nameBtn.textContent).toContain("↑");

      // Click BST — arrow moves there (descending).
      await user.click(screen.getByRole("button", { name: /Sort by BST/i }));
      const bstBtn = screen.getByRole("button", { name: /Sort by BST/i });
      expect(bstBtn.textContent).toContain("↓");
      // Name no longer has an arrow.
      expect(
        screen.getByRole("button", { name: /Sort by name/i }).textContent
      ).not.toContain("↑");
    });
  });

  describe("scroll", () => {
    it("rows container is scrollable (capped height + overflow-y-auto)", () => {
      render(<SpeciesPicker {...defaultProps} />);
      const rows = screen.getByTestId("species-rows");
      // The rows container caps its own height so it scrolls independently
      // of the picker chrome. We check the class names directly because the
      // rendered max-h is in arbitrary-value form (max-h-[60vh]) and JSDOM
      // does not compute layout.
      expect(rows.className).toContain("overflow-y-auto");
      expect(rows.className).toContain("max-h-[60vh]");
    });
  });

  describe("selection", () => {
    it("calls onSelect with 'defaults' mode on a single click anywhere on the row", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<SpeciesPicker {...defaultProps} onSelect={onSelect} />);

      // Single click selects with defaults — no separate "blank" flow exists.
      await user.click(
        screen.getByRole("button", { name: /Select Incineroar/ })
      );
      expect(onSelect).toHaveBeenCalledWith("Incineroar", "defaults");
    });
  });

  describe("search integration", () => {
    it("calls searchSpecies with the typed query", async () => {
      const user = userEvent.setup();
      const { searchSpecies } = jest.requireMock("@trainers/pokemon") as {
        searchSpecies: jest.Mock;
      };
      render(<SpeciesPicker {...defaultProps} />);
      await user.type(screen.getByTestId("search-input"), "inc");
      expect(searchSpecies).toHaveBeenCalledWith(
        defaultProps.speciesIndex,
        "inc",
        expect.any(Object)
      );
    });

    it("forwards the active formatId so move-name matching activates", async () => {
      const user = userEvent.setup();
      const { searchSpecies } = jest.requireMock("@trainers/pokemon") as {
        searchSpecies: jest.Mock;
      };
      render(<SpeciesPicker {...defaultProps} formatId="gen9vgc2026regi" />);
      await user.type(screen.getByTestId("search-input"), "tail");
      expect(searchSpecies).toHaveBeenCalledWith(
        defaultProps.speciesIndex,
        "tail",
        expect.objectContaining({ formatId: "gen9vgc2026regi" })
      );
    });
  });

  describe("format legality", () => {
    const championsIndex = [
      makeEntry("Incineroar", { types: ["Fire", "Dark"] }),
      makeEntry("Landorus-Therian", { types: ["Ground", "Flying"] }),
    ];

    it("hides species that are not legal in the active format", () => {
      render(
        <SpeciesPicker
          {...defaultProps}
          speciesIndex={championsIndex}
          formatId="championsvgc2026regma"
        />
      );
      // Incineroar is legal — its select button is rendered.
      expect(
        screen.getByRole("button", { name: /Select Incineroar/ })
      ).toBeInTheDocument();
      // Landorus-Therian is banned in M-A — filtered out entirely.
      expect(
        screen.queryByRole("button", { name: /Select Landorus-Therian/ })
      ).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders without crashing when speciesIndex is empty", () => {
      render(<SpeciesPicker {...defaultProps} speciesIndex={[]} />);
      expect(screen.getByText("Choose a species")).toBeInTheDocument();
      expect(
        screen.getByText(/No Pokémon match your filters/i)
      ).toBeInTheDocument();
    });
  });
});
