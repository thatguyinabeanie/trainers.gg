import React from "react";
import { render, screen } from "@testing-library/react";

import { type ConversionRow } from "@trainers/supabase";

import { UsageTopShareDumbbell } from "../usage-top-share-dumbbell";

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
  usagePct: number,
  topSharePct: number,
  conversionPct: number | null = 0.5
): ConversionRow {
  return {
    species,
    players: 100,
    usagePct,
    topPlayers: 10,
    topField: 10,
    topSharePct,
    conversionPct,
    rankedPlayers: 50,
  };
}

function makeRows(count: number): ConversionRow[] {
  return Array.from({ length: count }, (_, i) => ({
    species: `Species${String(i + 1).padStart(2, "0")}`,
    players: 100,
    usagePct: count - i,
    topPlayers: 10,
    topField: 10,
    topSharePct: (count - i) * 1.1,
    conversionPct: 0.5,
    rankedPlayers: 50,
  }));
}

// =============================================================================
// Dynamic title (Decision 2)
// =============================================================================

describe("UsageTopShareDumbbell — dynamic title", () => {
  it.each([
    { topPct: 0.1, expectedLabel: "Overall vs. Top 10% usage" },
    { topPct: 0.05, expectedLabel: "Overall vs. Top 5% usage" },
    { topPct: 0.25, expectedLabel: "Overall vs. Top 25% usage" },
  ])("renders '$expectedLabel' for topPct=$topPct", ({ topPct, expectedLabel }) => {
    render(
      <UsageTopShareDumbbell
        rows={[makeRow("Koraidon", 30, 40)]}
        topPct={topPct}
      />
    );
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it("never uses the phrase 'top cut'", () => {
    const { container } = render(
      <UsageTopShareDumbbell rows={makeRows(5)} topPct={0.1} />
    );
    expect((container.textContent ?? "").toLowerCase()).not.toContain(
      "top cut"
    );
  });
});

// =============================================================================
// NULL-placement rows dropped
// =============================================================================

describe("UsageTopShareDumbbell — null conversionPct filtering", () => {
  it("drops rows where conversionPct is null", () => {
    const rows = [
      makeRow("Koraidon", 30, 40, 0.5), // has placement data
      makeRow("Miraidon", 20, 35, null), // no placement data — should be dropped
    ];
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);

    // Koraidon should appear; Miraidon (null conversionPct) should not.
    expect(screen.getByAltText("Koraidon")).toBeInTheDocument();
    expect(screen.queryByAltText("Miraidon")).not.toBeInTheDocument();
  });

  it("shows empty state when all rows have null conversionPct", () => {
    const rows = [
      makeRow("Koraidon", 30, 40, null),
      makeRow("Miraidon", 20, 35, null),
    ];
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);
    expect(
      screen.getByText("No top-share data available.")
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Two dots per row (overall + top-share)
// =============================================================================

describe("UsageTopShareDumbbell — dot pairing", () => {
  it("renders exactly 2 dots (buttons) per species row", () => {
    const rows = [makeRow("Koraidon", 30, 40)];
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);
    // DumbbellRow renders one <button> per dot.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("renders 2 buttons per row when multiple species are present", () => {
    const rows = [makeRow("Koraidon", 30, 40), makeRow("Miraidon", 20, 35)];
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4); // 2 per row × 2 rows
  });

  it("labels the left dot 'Overall' and right dot with the dynamic topPctLabel", () => {
    const rows = [makeRow("Koraidon", 30, 40)];
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);
    // aria-label from DumbbellDot buttons includes the label and value
    expect(screen.getByRole("button", { name: /Overall/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Top 10%/ })).toBeInTheDocument();
  });
});

// =============================================================================
// Row ordering — sorted by usagePct desc
// =============================================================================

describe("UsageTopShareDumbbell — row ordering", () => {
  it("renders rows in descending usagePct order", () => {
    const rows = [
      makeRow("LowUsage", 5, 10),
      makeRow("HighUsage", 40, 45),
      makeRow("MidUsage", 20, 25),
    ];
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);

    const imgs = screen.getAllByRole("img");
    expect(imgs[0]).toHaveAttribute("alt", "HighUsage");
    expect(imgs[1]).toHaveAttribute("alt", "MidUsage");
    expect(imgs[2]).toHaveAttribute("alt", "LowUsage");
  });
});

// =============================================================================
// Top-N cap
// =============================================================================

describe("UsageTopShareDumbbell — top-N cap", () => {
  it.each([
    { isMobile: false, expectedCap: 20, label: "desktop" },
    { isMobile: true, expectedCap: 15, label: "mobile" },
  ])("caps to $expectedCap rows on $label", ({ isMobile, expectedCap }) => {
    mockUseIsMobile.mockReturnValue(isMobile);
    const rows = makeRows(30);
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);
    expect(screen.getAllByRole("img")).toHaveLength(expectedCap);
  });

  it("renders fewer rows than the cap when input is smaller", () => {
    mockUseIsMobile.mockReturnValue(false);
    const rows = makeRows(5);
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(5);
  });
});

// =============================================================================
// speciesHref prop (Phase 3 gating)
// =============================================================================

describe("UsageTopShareDumbbell — speciesHref", () => {
  it("renders a species link when speciesHref is provided", () => {
    const rows = [makeRow("Koraidon", 30, 40)];
    render(
      <UsageTopShareDumbbell
        rows={rows}
        topPct={0.1}
        speciesHref={(s) => `/data/species/${s}`}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/data/species/Koraidon");
  });

  it("does NOT render links when speciesHref is absent", () => {
    const rows = [makeRow("Koraidon", 30, 40)];
    render(<UsageTopShareDumbbell rows={rows} topPct={0.1} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Empty state
// =============================================================================

describe("UsageTopShareDumbbell — empty state", () => {
  it("renders an empty-state message when rows is empty", () => {
    render(<UsageTopShareDumbbell rows={[]} topPct={0.1} />);
    expect(
      screen.getByText("No top-share data available.")
    ).toBeInTheDocument();
  });
});
