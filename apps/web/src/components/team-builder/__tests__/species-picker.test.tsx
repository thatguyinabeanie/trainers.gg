import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// searchSpecies drives the filtered list — control it in tests
jest.mock("@trainers/pokemon", () => ({
  searchSpecies: jest.fn(
    (index: unknown[], _query: string, _filters: unknown) => index
  ),
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

// Mock child components to isolate SpeciesPicker logic
jest.mock("../species-detail", () => ({
  SpeciesDetail: ({
    species,
    onSelect,
  }: {
    species: { species: string } | null;
    currentTeam: Array<{ species: string }>;
    onSelect: (species: string, mode: "defaults" | "blank") => void;
  }) => (
    <div data-testid="species-detail">
      {species ? (
        <>
          <span data-testid="detail-species-name">{species.species}</span>
          <button onClick={() => onSelect(species.species, "defaults")}>
            Select with defaults
          </button>
          <button onClick={() => onSelect(species.species, "blank")}>
            Select blank
          </button>
        </>
      ) : (
        <span>Select a species from the table to see details</span>
      )}
    </div>
  ),
}));

jest.mock("../species-table", () => ({
  SpeciesTable: ({
    entries,
    onPreview,
    onSelect,
  }: {
    entries: Array<{ species: string }>;
    previewedSpecies: string | null;
    currentSpecies: string | null;
    onPreview: (species: string) => void;
    onSelect: (species: string) => void;
  }) => (
    <div data-testid="species-table">
      {entries.map((e) => (
        <div key={e.species}>
          <button
            data-testid={`preview-${e.species}`}
            onClick={() => onPreview(e.species)}
          >
            Preview {e.species}
          </button>
          <button
            data-testid={`select-${e.species}`}
            onClick={() => onSelect(e.species)}
          >
            Select {e.species}
          </button>
        </div>
      ))}
    </div>
  ),
}));

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
    minBaseStat: {},
    maxBaseStat: {},
  },
}));

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

describe("SpeciesPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe("filters pane", () => {
    it("renders SpeciesFilters", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByTestId("species-filters")).toBeInTheDocument();
    });
  });

  describe("species table", () => {
    it("renders SpeciesTable", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByTestId("species-table")).toBeInTheDocument();
    });

    it("passes all speciesIndex entries to the table initially", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByTestId("preview-Incineroar")).toBeInTheDocument();
      expect(screen.getByTestId("preview-Rillaboom")).toBeInTheDocument();
      expect(screen.getByTestId("preview-Gastrodon")).toBeInTheDocument();
    });
  });

  describe("species detail panel", () => {
    it("renders SpeciesDetail with null when no species is previewed", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByTestId("species-detail")).toBeInTheDocument();
      expect(
        screen.getByText("Select a species from the table to see details")
      ).toBeInTheDocument();
    });

    it("shows the previewed species in the detail panel after clicking preview", async () => {
      const user = userEvent.setup();
      render(<SpeciesPicker {...defaultProps} />);
      await user.click(screen.getByTestId("preview-Incineroar"));
      expect(screen.getByTestId("detail-species-name")).toHaveTextContent(
        "Incineroar"
      );
    });

    it("updates the previewed species when a different species is previewed", async () => {
      const user = userEvent.setup();
      render(<SpeciesPicker {...defaultProps} />);
      await user.click(screen.getByTestId("preview-Incineroar"));
      await user.click(screen.getByTestId("preview-Rillaboom"));
      expect(screen.getByTestId("detail-species-name")).toHaveTextContent(
        "Rillaboom"
      );
    });
  });

  describe("selection flow", () => {
    it("calls onSelect with 'defaults' mode when table row is double-clicked (onSelect shortcut)", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<SpeciesPicker {...defaultProps} onSelect={onSelect} />);
      // SpeciesTable mock calls onSelect with just species; SpeciesPicker wraps it to add "defaults"
      await user.click(screen.getByTestId("select-Incineroar"));
      expect(onSelect).toHaveBeenCalledWith("Incineroar", "defaults");
    });

    it("calls onSelect with 'defaults' mode via detail panel button", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<SpeciesPicker {...defaultProps} onSelect={onSelect} />);
      // First preview to populate detail panel
      await user.click(screen.getByTestId("preview-Gastrodon"));
      await user.click(
        screen.getByRole("button", { name: /select with defaults/i })
      );
      expect(onSelect).toHaveBeenCalledWith("Gastrodon", "defaults");
    });

    it("calls onSelect with 'blank' mode via detail panel button", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<SpeciesPicker {...defaultProps} onSelect={onSelect} />);
      await user.click(screen.getByTestId("preview-Rillaboom"));
      await user.click(screen.getByRole("button", { name: /select blank/i }));
      expect(onSelect).toHaveBeenCalledWith("Rillaboom", "blank");
    });
  });

  describe("search / filter integration", () => {
    it("calls searchSpecies with the query when the search input changes", async () => {
      const user = userEvent.setup();
      const { searchSpecies } = jest.requireMock("@trainers/pokemon") as {
        searchSpecies: jest.Mock;
      };
      render(<SpeciesPicker {...defaultProps} />);
      await user.type(screen.getByTestId("search-input"), "inc");
      // searchSpecies should have been called at least once with the typed query
      expect(searchSpecies).toHaveBeenCalledWith(
        defaultProps.speciesIndex,
        "inc",
        expect.any(Object)
      );
    });
  });

  describe("previewed species cleared when filtered out", () => {
    it("shows null detail when previewed species is not in filtered results", async () => {
      const user = userEvent.setup();
      const { searchSpecies } = jest.requireMock("@trainers/pokemon") as {
        searchSpecies: jest.Mock;
      };

      // Default: returns all entries
      searchSpecies.mockImplementation((index: SpeciesSearchEntry[]) => index);

      render(<SpeciesPicker {...defaultProps} />);

      // Preview Incineroar
      await user.click(screen.getByTestId("preview-Incineroar"));
      expect(screen.getByTestId("detail-species-name")).toHaveTextContent(
        "Incineroar"
      );

      // Now filter returns only Rillaboom — Incineroar disappears from results
      searchSpecies.mockImplementation(() => [makeEntry("Rillaboom")]);
      await user.type(screen.getByTestId("search-input"), "rill");

      // The previewedEntry derivation should return null since Incineroar is gone
      expect(
        screen.queryByTestId("detail-species-name")
      ).not.toBeInTheDocument();
    });
  });

  describe("empty speciesIndex", () => {
    it("renders without crashing when speciesIndex is empty", () => {
      render(<SpeciesPicker {...defaultProps} speciesIndex={[]} />);
      expect(screen.getByText("Choose a species")).toBeInTheDocument();
    });
  });

  describe("currentSpecies prop", () => {
    it("passes currentSpecies to the table for highlighting", () => {
      // The mock SpeciesTable receives the prop; we verify SpeciesPicker renders without error
      render(<SpeciesPicker {...defaultProps} currentSpecies="Incineroar" />);
      expect(screen.getByTestId("species-table")).toBeInTheDocument();
    });
  });

  describe("currentTeam prop", () => {
    it("renders with a non-empty currentTeam without crashing", () => {
      render(
        <SpeciesPicker
          {...defaultProps}
          currentTeam={[{ species: "Rillaboom" }]}
        />
      );
      expect(screen.getByText("Choose a species")).toBeInTheDocument();
    });
  });
});
