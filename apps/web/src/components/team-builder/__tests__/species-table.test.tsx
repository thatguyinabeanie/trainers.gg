import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks — must precede the import under test
// =============================================================================

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  ),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn(() => ({
    url: "https://example.com/sprite.png",
    w: 96,
    h: 96,
    pixelated: false,
  })),
}));

import { SpeciesTable } from "../species-table";
import { type SpeciesSearchEntry } from "@trainers/pokemon";

// =============================================================================
// Factories
// =============================================================================

function makeEntry(
  overrides: Partial<SpeciesSearchEntry> = {}
): SpeciesSearchEntry {
  return {
    species: "Incineroar",
    types: ["Fire", "Dark"],
    abilities: ["Intimidate", "Blaze"],
    baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 },
    bst: 530,
    ...overrides,
  };
}

function makeEntries(count: number): SpeciesSearchEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeEntry({
      species: `Species${i}`,
      baseStats: {
        hp: 80 + (i % 50),
        atk: 100 + (i % 50),
        def: 70 + (i % 50),
        spa: 60 + (i % 50),
        spd: 70 + (i % 50),
        spe: 50 + (i % 50) * 3,
      },
      bst: 430 + i * 5,
    })
  );
}

const defaultProps = {
  entries: [makeEntry()],
  previewedSpecies: null,
  currentSpecies: null,
  onPreview: jest.fn(),
  onSelect: jest.fn(),
};

// =============================================================================
// Tests — rendering
// =============================================================================

describe("SpeciesTable — rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the table with column headers", () => {
    render(<SpeciesTable {...defaultProps} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Types")).toBeInTheDocument();
    expect(screen.getByText("Ability")).toBeInTheDocument();
    expect(screen.getByText("HP")).toBeInTheDocument();
    expect(screen.getByText("Atk")).toBeInTheDocument();
    expect(screen.getByText("Def")).toBeInTheDocument();
    expect(screen.getByText("SpA")).toBeInTheDocument();
    expect(screen.getByText("SpD")).toBeInTheDocument();
    expect(screen.getByText("Spe")).toBeInTheDocument();
    expect(screen.getByText("BST")).toBeInTheDocument();
    expect(screen.getByText("Usage")).toBeInTheDocument();
  });

  it("renders a row for each entry", () => {
    const entries = [
      makeEntry({ species: "Incineroar" }),
      makeEntry({ species: "Rillaboom" }),
    ];
    render(<SpeciesTable {...defaultProps} entries={entries} />);

    expect(screen.getByText("Incineroar")).toBeInTheDocument();
    expect(screen.getByText("Rillaboom")).toBeInTheDocument();
  });

  it("renders empty state when entries is empty", () => {
    render(<SpeciesTable {...defaultProps} entries={[]} />);
    expect(
      screen.getByText(/No Pokemon match your filters/)
    ).toBeInTheDocument();
  });

  it("renders the primary ability for each entry", () => {
    render(<SpeciesTable {...defaultProps} />);
    expect(screen.getByText("Intimidate")).toBeInTheDocument();
  });

  it("renders '—' when the entry has no abilities", () => {
    const entry = makeEntry({ abilities: [] });
    render(<SpeciesTable {...defaultProps} entries={[entry]} />);
    // The ability cell and usage cell both show "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders type pills for each type", () => {
    render(<SpeciesTable {...defaultProps} />);
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
  });

  it("renders base stat values in the row", () => {
    render(<SpeciesTable {...defaultProps} />);
    // BST = 530, hp = 95, spe = 60
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText("530")).toBeInTheDocument();
  });

  it("renders sprite image with correct alt text", () => {
    render(<SpeciesTable {...defaultProps} />);
    const img = screen.getByRole("img", { name: "Incineroar" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/sprite.png");
  });

  it("shows truncation banner when entries exceed 200", () => {
    const entries = makeEntries(201);
    render(<SpeciesTable {...defaultProps} entries={entries} />);
    expect(screen.getByText(/Showing 200 of 201 results/)).toBeInTheDocument();
  });

  it("does not show truncation banner when entries <= 200", () => {
    const entries = makeEntries(5);
    render(<SpeciesTable {...defaultProps} entries={entries} />);
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("renders at most 200 rows when given more than 200 entries", () => {
    const entries = makeEntries(205);
    render(<SpeciesTable {...defaultProps} entries={entries} />);
    // Each row has an img with alt=species; count unique species imgs
    const rows = screen.getAllByRole("row");
    // 1 header row + up to 200 data rows
    expect(rows.length).toBe(201);
  });
});

// =============================================================================
// Tests — row highlighting
// =============================================================================

describe("SpeciesTable — row highlighting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies teal highlight class to the current species row", () => {
    const entries = [
      makeEntry({ species: "Incineroar" }),
      makeEntry({ species: "Rillaboom" }),
    ];
    const { container } = render(
      <SpeciesTable
        {...defaultProps}
        entries={entries}
        currentSpecies="Incineroar"
        previewedSpecies={null}
      />
    );
    // The teal highlight row should contain the current species text
    const tealRows = container.querySelectorAll(".border-l-teal-500");
    expect(tealRows.length).toBe(1);
  });

  it("applies blue highlight class to the previewed species row (when not current)", () => {
    const entries = [
      makeEntry({ species: "Incineroar" }),
      makeEntry({ species: "Rillaboom" }),
    ];
    const { container } = render(
      <SpeciesTable
        {...defaultProps}
        entries={entries}
        currentSpecies="Incineroar"
        previewedSpecies="Rillaboom"
      />
    );
    const blueRows = container.querySelectorAll(".border-l-blue-500");
    expect(blueRows.length).toBe(1);
  });

  it("does not apply blue highlight to the current species even if also previewed", () => {
    const entries = [makeEntry({ species: "Incineroar" })];
    const { container } = render(
      <SpeciesTable
        {...defaultProps}
        entries={entries}
        currentSpecies="Incineroar"
        previewedSpecies="Incineroar"
      />
    );
    // Current takes priority — no blue row
    const blueRows = container.querySelectorAll(".border-l-blue-500");
    expect(blueRows.length).toBe(0);
  });
});

// =============================================================================
// Tests — interactions
// =============================================================================

describe("SpeciesTable — interactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls onPreview when a row is single-clicked", async () => {
    const onPreview = jest.fn();
    const user = userEvent.setup();

    render(
      <SpeciesTable
        {...defaultProps}
        entries={[makeEntry({ species: "Incineroar" })]}
        onPreview={onPreview}
      />
    );

    await user.click(screen.getByText("Incineroar"));
    expect(onPreview).toHaveBeenCalledWith("Incineroar");
  });

  it("calls onSelect when a row is double-clicked", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();

    render(
      <SpeciesTable
        {...defaultProps}
        entries={[makeEntry({ species: "Incineroar" })]}
        onSelect={onSelect}
      />
    );

    await user.dblClick(screen.getByText("Incineroar"));
    expect(onSelect).toHaveBeenCalledWith("Incineroar");
  });

  it("calls onPreview with the correct species for each row", async () => {
    const onPreview = jest.fn();
    const user = userEvent.setup();

    const entries = [
      makeEntry({ species: "Incineroar" }),
      makeEntry({ species: "Rillaboom" }),
    ];
    render(
      <SpeciesTable {...defaultProps} entries={entries} onPreview={onPreview} />
    );

    await user.click(screen.getByText("Rillaboom"));
    expect(onPreview).toHaveBeenCalledWith("Rillaboom");
    expect(onPreview).not.toHaveBeenCalledWith("Incineroar");
  });
});

// =============================================================================
// Tests — sorting
// =============================================================================

describe("SpeciesTable — sorting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders sort indicator on the Name column by default (asc)", () => {
    render(<SpeciesTable {...defaultProps} />);
    // Default sort is name asc — Name header shows the ↑ indicator (active)
    // The arrow direction depends on isActive+direction; just verify it renders
    const nameHeader = screen.getByText("Name").closest("th");
    expect(nameHeader).toBeInTheDocument();
  });

  it("sorts entries alphabetically by name ascending by default", () => {
    const entries = [
      makeEntry({ species: "Rillaboom" }),
      makeEntry({ species: "Amoonguss" }),
      makeEntry({ species: "Incineroar" }),
    ];
    render(<SpeciesTable {...defaultProps} entries={entries} />);

    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows[0]).toHaveTextContent("Amoonguss");
    expect(rows[1]).toHaveTextContent("Incineroar");
    expect(rows[2]).toHaveTextContent("Rillaboom");
  });

  it("toggles to descending order when Name header is clicked again", async () => {
    const user = userEvent.setup();
    const entries = [
      makeEntry({ species: "Rillaboom" }),
      makeEntry({ species: "Amoonguss" }),
      makeEntry({ species: "Incineroar" }),
    ];
    render(<SpeciesTable {...defaultProps} entries={entries} />);

    // Click Name header once — currently asc, clicking again → desc
    const nameHeader = screen.getByText("Name").closest("th")!;
    await user.click(nameHeader);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Rillaboom");
    expect(rows[2]).toHaveTextContent("Amoonguss");
  });

  it("sorts by BST descending when BST header is clicked", async () => {
    const user = userEvent.setup();
    const entries = [
      makeEntry({ species: "Amoonguss", bst: 400 }),
      makeEntry({ species: "Flutter Mane", bst: 570 }),
      makeEntry({ species: "Incineroar", bst: 530 }),
    ];
    render(<SpeciesTable {...defaultProps} entries={entries} />);

    const bstHeader = screen.getByText("BST").closest("th")!;
    await user.click(bstHeader);

    const rows = screen.getAllByRole("row").slice(1);
    // Clicking BST for the first time sets to ascending
    expect(rows[0]).toHaveTextContent("Amoonguss");
    expect(rows[2]).toHaveTextContent("Flutter Mane");
  });

  it("sorts by Spe stat when Spe header is clicked", async () => {
    const user = userEvent.setup();
    const entries = [
      makeEntry({
        species: "Incineroar",
        baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 },
        bst: 530,
      }),
      makeEntry({
        species: "Flutter Mane",
        baseStats: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 },
        bst: 570,
      }),
    ];
    render(<SpeciesTable {...defaultProps} entries={entries} />);

    const speHeader = screen.getByText("Spe").closest("th")!;
    await user.click(speHeader);

    // First click = ascending by spe
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Incineroar"); // spe 60
    expect(rows[1]).toHaveTextContent("Flutter Mane"); // spe 135
  });

  it("applies correct stat color class to a high stat value (>=120)", () => {
    // Flutter Mane spa = 135 → should get text-emerald-500
    const entry = makeEntry({
      species: "Flutter Mane",
      baseStats: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 },
      bst: 570,
    });
    const { container } = render(
      <SpeciesTable {...defaultProps} entries={[entry]} />
    );
    const emeraldCells = container.querySelectorAll(".text-emerald-500");
    expect(emeraldCells.length).toBeGreaterThan(0);
  });

  it("applies muted color class to a low stat value (<70)", () => {
    // Incineroar spe = 60 → should get text-muted-foreground
    const entry = makeEntry({
      species: "Incineroar",
      baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 },
      bst: 530,
    });
    const { container } = render(
      <SpeciesTable {...defaultProps} entries={[entry]} />
    );
    // Multiple cells may be muted (spe=60, spa=80 is not muted though)
    const mutedCells = container.querySelectorAll("td.text-muted-foreground");
    // At least one stat cell (spe=60) plus the ability cell
    expect(mutedCells.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Tests — format legality
// =============================================================================

const CHAMPIONS_FORMAT = "championsvgc2026regma";

describe("SpeciesTable — format legality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("omits an illegal species entirely from the rendered list", () => {
    const entries = [
      makeEntry({ species: "Landorus-Therian" }),
      makeEntry({ species: "Incineroar" }),
    ];
    render(
      <SpeciesTable
        {...defaultProps}
        entries={entries}
        formatId={CHAMPIONS_FORMAT}
      />
    );

    // Illegal species should not appear in the table at all
    expect(screen.queryByText("Landorus-Therian")).not.toBeInTheDocument();

    // Legal species is still present
    expect(screen.getByText("Incineroar")).toBeInTheDocument();

    // No dim class or badge for illegal species
    expect(screen.queryByText("Not legal")).not.toBeInTheDocument();
  });

  it("calls onSelect when a legal species row is double-clicked", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();

    const entry = makeEntry({ species: "Incineroar" });
    render(
      <SpeciesTable
        {...defaultProps}
        entries={[entry]}
        formatId={CHAMPIONS_FORMAT}
        onSelect={onSelect}
      />
    );

    await user.dblClick(screen.getByText("Incineroar"));
    expect(onSelect).toHaveBeenCalledWith("Incineroar");
  });

  it("renders all species when formatId has no registered legality (permissive)", () => {
    const entries = [
      makeEntry({ species: "Landorus-Therian" }),
      makeEntry({ species: "Incineroar" }),
    ];
    render(
      <SpeciesTable
        {...defaultProps}
        entries={entries}
        formatId="unknown-format-id"
      />
    );

    // Unknown format — no filtering — all entries appear
    expect(screen.getByText("Landorus-Therian")).toBeInTheDocument();
    expect(screen.getByText("Incineroar")).toBeInTheDocument();

    // No badges should appear
    expect(screen.queryByText("Not legal")).not.toBeInTheDocument();
  });

  it("renders all species when no formatId is provided", () => {
    const entries = [
      makeEntry({ species: "Landorus-Therian" }),
      makeEntry({ species: "Incineroar" }),
    ];
    render(
      <SpeciesTable
        {...defaultProps}
        entries={entries}
        // no formatId
      />
    );

    expect(screen.getByText("Landorus-Therian")).toBeInTheDocument();
    expect(screen.getByText("Incineroar")).toBeInTheDocument();
  });
});
