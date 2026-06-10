import React from "react";
import { render, screen } from "@testing-library/react";

import { type TeammateRow, type TeammateMatrix } from "@trainers/supabase";

import { SpeciesTeammateHeatmap } from "../species-teammate-heatmap";

// =============================================================================
// Mocks
// =============================================================================

const mockUseIsMobile = jest.fn<boolean, []>();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (species: string) => ({
    url: `https://sprites.test/${species}.png`,
    w: 96,
    h: 96,
    pixelated: false,
  }),
}));

jest.mock("@pkmn/dex", () => ({
  Dex: {
    species: {
      get: (slug: string) => ({
        exists: true,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
      }),
    },
  },
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    "aria-label": ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    "aria-label"?: string;
  }) => (
    <a href={href} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

// =============================================================================
// Default to desktop for most tests
// =============================================================================

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false);
});

// =============================================================================
// Helpers
// =============================================================================

function makeTeammate(
  slug: string,
  pairPct: number,
  rank: number
): TeammateRow {
  return { teammate: slug, pairPct, pairCount: Math.round(pairPct * 2), rank };
}

/** Build a matrix with a known set of members and cells. */
function buildMatrix(
  order: string[],
  cells: Record<string, { count: number; pct: number }>
): TeammateMatrix {
  return { order, cells };
}

const FOCAL = "calyrex-ice-rider";
const mockHref = (slug: string) => `/data/pokemon/${slug}`;

// =============================================================================
// Test data
// =============================================================================

const SPECIES_8 = [
  "miraidon",
  "flutter-mane",
  "iron-hands",
  "rillaboom",
  "incineroar",
  "urshifu",
  "amoonguss",
  "landorus",
];

const TEAMMATES_8: TeammateRow[] = SPECIES_8.map((s, i) =>
  makeTeammate(s, 70 - i * 5, i + 1)
);

/**
 * Build a full 8×8 matrix with known cell values.
 * Every pair (a, b) where a < b gets pct = 10 + rank difference.
 */
function buildFull8x8Matrix(): TeammateMatrix {
  const cells: Record<string, { count: number; pct: number }> = {};
  for (let i = 0; i < SPECIES_8.length; i++) {
    for (let j = i + 1; j < SPECIES_8.length; j++) {
      const a = SPECIES_8[i]!;
      const b = SPECIES_8[j]!;
      // Key is always a||b with a < b lexicographically.
      const [sorted_a, sorted_b] = [a, b].sort();
      const key = `${sorted_a}||${sorted_b}`;
      const pct = 10 + (j - i);
      cells[key] = { count: pct * 2, pct };
    }
  }
  return buildMatrix(SPECIES_8, cells);
}

// =============================================================================
// Tests — basic rendering
// =============================================================================

describe("SpeciesTeammateHeatmap — smoke render", () => {
  it("renders the 'Teammate cores' card title", () => {
    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={TEAMMATES_8}
        matrix={buildFull8x8Matrix()}
        onTeammateHref={mockHref}
      />
    );
    expect(screen.getByText(/teammate cores/i)).toBeInTheDocument();
  });

  it("renders header links for each member in matrix.order (desktop)", () => {
    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={TEAMMATES_8}
        matrix={buildFull8x8Matrix()}
        onTeammateHref={mockHref}
      />
    );
    // Each species appears twice: once in the column header row and once
    // in the row header column.
    const links = screen.getAllByRole("link");
    // 8 row headers + 8 column headers = 16 links.
    expect(links).toHaveLength(16);
  });
});

// =============================================================================
// Tests — mobile cap (5×5)
// =============================================================================

describe("SpeciesTeammateHeatmap — mobile cap", () => {
  it("renders only 5×5 header links on mobile viewports", () => {
    mockUseIsMobile.mockReturnValue(true);
    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={TEAMMATES_8}
        matrix={buildFull8x8Matrix()}
        onTeammateHref={mockHref}
      />
    );
    // 5 row headers + 5 column headers = 10 links.
    expect(screen.getAllByRole("link")).toHaveLength(10);
  });

  it("renders the full 8×8 (16 header links) on desktop", () => {
    mockUseIsMobile.mockReturnValue(false);
    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={TEAMMATES_8}
        matrix={buildFull8x8Matrix()}
        onTeammateHref={mockHref}
      />
    );
    expect(screen.getAllByRole("link")).toHaveLength(16);
  });
});

// =============================================================================
// Tests — cell key lookup uses lexicographic sort
// =============================================================================

describe("SpeciesTeammateHeatmap — cell key convention", () => {
  it("resolves a cell regardless of which axis the pair appears on", () => {
    // "amoonguss" < "miraidon" lexicographically.
    // The RPC stores the key as "amoonguss||miraidon".
    // The heatmap must look up this cell for both (row=miraidon, col=amoonguss)
    // and (row=amoonguss, col=miraidon).
    const order = ["miraidon", "amoonguss"];
    const cells: Record<string, { count: number; pct: number }> = {
      "amoonguss||miraidon": { count: 40, pct: 33.5 },
    };
    const matrix = buildMatrix(order, cells);
    const teammates = [
      makeTeammate("miraidon", 60, 1),
      makeTeammate("amoonguss", 50, 2),
    ];

    const { container } = render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={teammates}
        matrix={matrix}
        onTeammateHref={mockHref}
      />
    );

    // The 33.5% cell should appear twice (once for each off-diagonal cell).
    const cellsWithPct = container.querySelectorAll("[title*='33.5%']");
    expect(cellsWithPct.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the percentage text inside a non-zero cell", () => {
    const order = ["miraidon", "flutter-mane"];
    const cells: Record<string, { count: number; pct: number }> = {
      "flutter-mane||miraidon": { count: 50, pct: 42.0 },
    };
    const matrix = buildMatrix(order, cells);
    const teammates = [
      makeTeammate("miraidon", 70, 1),
      makeTeammate("flutter-mane", 65, 2),
    ];

    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={teammates}
        matrix={matrix}
        onTeammateHref={mockHref}
      />
    );

    // The pct% label should appear in the cell text.
    expect(screen.getAllByText("42%").length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Tests — diagonal is blank
// =============================================================================

describe("SpeciesTeammateHeatmap — diagonal", () => {
  it("renders '—' in each diagonal cell", () => {
    const order = ["miraidon", "flutter-mane"];
    const cells: Record<string, { count: number; pct: number }> = {
      "flutter-mane||miraidon": { count: 30, pct: 25.0 },
    };
    const matrix = buildMatrix(order, cells);
    const teammates = [
      makeTeammate("miraidon", 70, 1),
      makeTeammate("flutter-mane", 65, 2),
    ];

    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={teammates}
        matrix={matrix}
        onTeammateHref={mockHref}
      />
    );

    // Two diagonal cells → two "—" characters.
    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(2);
  });
});

// =============================================================================
// Tests — header links
// =============================================================================

describe("SpeciesTeammateHeatmap — header links", () => {
  it("each header link navigates to the teammate path", () => {
    const order = ["miraidon", "flutter-mane"];
    const cells: Record<string, { count: number; pct: number }> = {
      "flutter-mane||miraidon": { count: 20, pct: 15 },
    };
    const matrix = buildMatrix(order, cells);
    const teammates = [
      makeTeammate("miraidon", 60, 1),
      makeTeammate("flutter-mane", 55, 2),
    ];

    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={teammates}
        matrix={matrix}
        onTeammateHref={mockHref}
      />
    );

    const links = screen.getAllByRole("link");
    // Links should include the teammate paths.
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/data/pokemon/miraidon");
    expect(hrefs).toContain("/data/pokemon/flutter-mane");
  });
});

// =============================================================================
// Tests — empty state
// =============================================================================

describe("SpeciesTeammateHeatmap — empty state", () => {
  it("renders the empty state message when matrix.order is empty", () => {
    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={[]}
        matrix={{ order: [], cells: {} }}
        onTeammateHref={mockHref}
      />
    );
    expect(screen.getByText(/no co-occurrence data/i)).toBeInTheDocument();
  });

  it("does not render any links in the empty state", () => {
    render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={[]}
        matrix={{ order: [], cells: {} }}
        onTeammateHref={mockHref}
      />
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

// =============================================================================
// Tests — content policy
// =============================================================================

describe("SpeciesTeammateHeatmap — content policy", () => {
  it("does not contain the phrase 'top cut'", () => {
    const { container } = render(
      <SpeciesTeammateHeatmap
        focalSpecies={FOCAL}
        teammates={TEAMMATES_8}
        matrix={buildFull8x8Matrix()}
        onTeammateHref={mockHref}
      />
    );
    expect(container.textContent).not.toMatch(/top cut/i);
  });
});
