import React from "react";
import { render, screen } from "@testing-library/react";

import { UsageSourceDumbbell } from "../usage-source-dumbbell";
import { type SourceComparisonRow } from "../data-shared";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (species: string) => ({
    url: `https://sprites.test/${species}.png`,
    w: 96,
    h: 96,
    pixelated: true,
  }),
}));

// useIsMobile: default desktop (false); overridden per describe block where needed.
const mockUseIsMobile = jest.fn<boolean, []>();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false); // desktop by default
});

// =============================================================================
// Test data helpers
// =============================================================================

function makeRow(
  species: string,
  overallPeak: number,
  sources: Partial<SourceComparisonRow["bySource"]> = {}
): SourceComparisonRow {
  return {
    species,
    bySource: {
      rk9: { usagePct: overallPeak, players: 100 },
      ...sources,
    },
    overallPeak,
  };
}

/**
 * Build N rows with descending overallPeak (top species = highest peak).
 */
function makeRows(count: number): SourceComparisonRow[] {
  return Array.from({ length: count }, (_, i) => ({
    species: `Species${String(i + 1).padStart(2, "0")}`,
    bySource: {
      rk9: { usagePct: count - i, players: 100 },
    },
    overallPeak: count - i,
  }));
}

// =============================================================================
// Caption text
// =============================================================================

describe("UsageSourceDumbbell — caption", () => {
  it("renders the expected caption text", () => {
    render(<UsageSourceDumbbell rows={[makeRow("Koraidon", 30)]} />);
    expect(
      screen.getByText(
        "Always compares all sources — ignores the Source filter."
      )
    ).toBeInTheDocument();
  });

  it("never contains the phrase 'top cut'", () => {
    const rows = makeRows(5);
    const { container } = render(<UsageSourceDumbbell rows={rows} />);
    expect((container.textContent ?? "").toLowerCase()).not.toContain(
      "top cut"
    );
  });
});

// =============================================================================
// Row ordering — sorted by overallPeak desc
// =============================================================================

describe("UsageSourceDumbbell — row ordering", () => {
  it("renders rows in descending overallPeak order", () => {
    // Intentionally out-of-order input.
    const rows: SourceComparisonRow[] = [
      makeRow("LowPeak", 5),
      makeRow("HighPeak", 40),
      makeRow("MidPeak", 20),
    ];
    render(<UsageSourceDumbbell rows={rows} />);

    // Collect rendered species names in DOM order.
    const names = screen
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt") ?? "");

    expect(names[0]).toBe("HighPeak");
    expect(names[1]).toBe("MidPeak");
    expect(names[2]).toBe("LowPeak");
  });

  it("uses species name as a tiebreaker when overallPeak is equal", () => {
    const rows: SourceComparisonRow[] = [
      makeRow("Zubat", 10),
      makeRow("Aipom", 10),
      makeRow("Mew", 10),
    ];
    render(<UsageSourceDumbbell rows={rows} />);
    const names = screen
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt") ?? "");
    expect(names).toEqual(["Aipom", "Mew", "Zubat"]);
  });
});

// =============================================================================
// Top-N cap
// =============================================================================

describe("UsageSourceDumbbell — top-N cap", () => {
  it.each([
    { isMobile: false, expectedCap: 30, label: "desktop" },
    { isMobile: true, expectedCap: 15, label: "mobile" },
  ])("caps to $expectedCap rows on $label", ({ isMobile, expectedCap }) => {
    mockUseIsMobile.mockReturnValue(isMobile);
    const rows = makeRows(50);
    render(<UsageSourceDumbbell rows={rows} />);
    expect(screen.getAllByRole("img")).toHaveLength(expectedCap);
  });

  it("renders fewer rows than the cap when input is smaller", () => {
    mockUseIsMobile.mockReturnValue(false);
    const rows = makeRows(10);
    render(<UsageSourceDumbbell rows={rows} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(10);
  });

  it("shows the top-peak species after the cap, not arbitrary ones", () => {
    mockUseIsMobile.mockReturnValue(true); // cap = 15
    const rows = makeRows(30); // Species01 has peak=30, Species16 has peak=15
    render(<UsageSourceDumbbell rows={rows} />);
    // Species01 (peak=30) should appear; Species16 (peak=15) should not.
    expect(screen.getByAltText("Species01")).toBeInTheDocument();
    expect(screen.queryByAltText("Species16")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Per-source dot rendering
// =============================================================================

describe("UsageSourceDumbbell — source dots", () => {
  it("renders 3 dots when all 3 sources have data", () => {
    const rows: SourceComparisonRow[] = [
      {
        species: "Koraidon",
        bySource: {
          rk9: { usagePct: 30, players: 200 },
          limitless: { usagePct: 25, players: 150 },
          "trainers.gg": { usagePct: 20, players: 100 },
        },
        overallPeak: 30,
      },
    ];
    render(<UsageSourceDumbbell rows={rows} />);
    // Each dot is a <button> with an aria-label containing the usage pct.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("renders only 1 dot when only 1 source has data", () => {
    const rows: SourceComparisonRow[] = [
      {
        species: "Koraidon",
        bySource: { rk9: { usagePct: 30, players: 200 } },
        overallPeak: 30,
      },
    ];
    render(<UsageSourceDumbbell rows={rows} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
  });
});

// =============================================================================
// Empty state
// =============================================================================

describe("UsageSourceDumbbell — empty state", () => {
  it("renders an empty-state message when rows is empty", () => {
    render(<UsageSourceDumbbell rows={[]} />);
    expect(
      screen.getByText("No source comparison data available.")
    ).toBeInTheDocument();
  });
});

// =============================================================================
// speciesHref prop (Phase 3 gating)
// =============================================================================

describe("UsageSourceDumbbell — speciesHref", () => {
  it("renders species name links when speciesHref is provided", () => {
    const rows = [makeRow("Koraidon", 30)];
    render(
      <UsageSourceDumbbell
        rows={rows}
        speciesHref={(s) => `/data/species/${s}`}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/data/species/Koraidon");
  });

  it("does NOT render links when speciesHref is absent", () => {
    const rows = [makeRow("Koraidon", 30)];
    render(<UsageSourceDumbbell rows={rows} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
