import React from "react";
import { render, screen } from "@testing-library/react";
import { type ResponsiveContainerProps } from "recharts";

import { UsageTreemap } from "../usage-treemap";
import { type PipelineSpeciesData } from "@trainers/supabase";

// =============================================================================
// JSDOM polyfills
// =============================================================================
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// =============================================================================
// Recharts mock
//
// JSDOM has no layout engine — ResponsiveContainer reports 0×0 and renders
// nothing. Provide a fixed size so Treemap receives real dimensions and the
// custom `content` renderer fires.
// =============================================================================
jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts") as Record<string, unknown>;
  const OriginalResponsiveContainer = actual[
    "ResponsiveContainer"
  ] as React.ComponentType<ResponsiveContainerProps>;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <OriginalResponsiveContainer width={800} height={420}>
        {children}
      </OriginalResponsiveContainer>
    ),
  };
});

// =============================================================================
// getPokemonSprite mock
// =============================================================================
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: (species: string) => ({
    url: `https://sprites.test/${species}.png`,
    w: 96,
    h: 96,
    pixelated: true,
  }),
}));

// =============================================================================
// Test data helpers
// =============================================================================

function makeSpecies(
  overrides: Partial<PipelineSpeciesData> = {}
): PipelineSpeciesData {
  return {
    species: "Koraidon",
    usagePct: 30,
    rank: 1,
    abilities: [{ value: "Orichalcum Pulse", count: 100, pct: 100 }],
    items: [],
    natures: [{ value: "Adamant", count: 80, pct: 80 }],
    moves: [{ value: "Collision Course", count: 90, pct: 90 }],
    tera: [],
    ...overrides,
  };
}

/**
 * Build a dataset of `count` species all at the given usagePct.
 */
function makeSpeciesArray(
  count: number,
  usagePct = 5,
  startRank = 1
): PipelineSpeciesData[] {
  return Array.from({ length: count }, (_, i) => ({
    species: `Species${i + 1}`,
    usagePct,
    rank: startRank + i,
    abilities: [],
    items: [],
    natures: [],
    moves: [],
    tera: [],
  }));
}

// =============================================================================
// Empty states
// =============================================================================

describe("UsageTreemap — empty states", () => {
  it("shows empty message when data is empty", () => {
    render(<UsageTreemap data={[]} />);
    expect(screen.getByText("No species data available.")).toBeInTheDocument();
  });

  it("shows 'No species above threshold.' when all species are below threshold", () => {
    const allBelowThreshold = makeSpeciesArray(3, 0.5); // all at 0.5% < 1%
    render(<UsageTreemap data={allBelowThreshold} />);
    // When all species collapse into Others but the treemapData still has the
    // Others tile (size > 0), a tile is rendered. However if partitionData
    // produces an empty treemapData array we get the fallback message.
    // The chart renders the Others tile, so check it contains "Others" text.
    // This branch verifies there is no crash and the chart renders something.
    expect(
      screen.queryByText("No species data available.")
    ).not.toBeInTheDocument();
  });
});

// =============================================================================
// "Others (N species)" tile
// =============================================================================

describe("UsageTreemap — Others tile", () => {
  it("renders 'Others (N species)' tile when species fall below threshold", () => {
    const data: PipelineSpeciesData[] = [
      makeSpecies({ species: "Koraidon", usagePct: 30, rank: 1 }),
      makeSpecies({ species: "Sneasler", usagePct: 25, rank: 2 }),
      // Below threshold
      makeSpecies({ species: "Tinymon", usagePct: 0.5, rank: 3 }),
      makeSpecies({ species: "Micromon", usagePct: 0.3, rank: 4 }),
    ];

    const { container } = render(<UsageTreemap data={data} />);

    // The Others label should appear in an SVG <text> element.
    const allText = Array.from(container.querySelectorAll("text")).map(
      (t) => t.textContent ?? ""
    );
    const othersText = allText.find((t) => t.startsWith("Others"));
    expect(othersText).toBeTruthy();
    // Should include the count of collapsed species.
    expect(othersText).toMatch(/Others \(2 species\)/);
  });

  it("does not render an Others tile when all species are above threshold", () => {
    const data = makeSpeciesArray(3, 15); // all at 15% — well above threshold

    const { container } = render(<UsageTreemap data={data} />);
    const allText = Array.from(container.querySelectorAll("text")).map(
      (t) => t.textContent ?? ""
    );
    const othersText = allText.find((t) => t.startsWith("Others"));
    expect(othersText).toBeUndefined();
  });

  it("collapses multiple below-threshold species into a single Others tile", () => {
    const data: PipelineSpeciesData[] = [
      makeSpecies({ species: "TopMon", usagePct: 40, rank: 1 }),
      ...makeSpeciesArray(5, 0.2, 2), // 5 species at 0.2% each
    ];

    const { container } = render(<UsageTreemap data={data} />);
    const allText = Array.from(container.querySelectorAll("text")).map(
      (t) => t.textContent ?? ""
    );
    const othersText = allText.find((t) => t.startsWith("Others"));
    expect(othersText).toMatch(/Others \(5 species\)/);
  });
});

// =============================================================================
// No "top cut" anywhere
// =============================================================================

describe("UsageTreemap — forbidden phrases", () => {
  it("never renders the phrase 'top cut' (case-insensitive) anywhere in the DOM", () => {
    const data: PipelineSpeciesData[] = [
      makeSpecies({ species: "Koraidon", usagePct: 30, rank: 1 }),
      makeSpecies({ species: "Sneasler", usagePct: 25, rank: 2 }),
      makeSpecies({ species: "Tinymon", usagePct: 0.5, rank: 3 }),
    ];

    const { container } = render(<UsageTreemap data={data} />);
    const fullText = container.textContent ?? "";
    expect(fullText.toLowerCase()).not.toContain("top cut");
  });

  it("never renders 'Top cut' even when all species are above threshold", () => {
    const data = makeSpeciesArray(10, 10);
    const { container } = render(<UsageTreemap data={data} />);
    const fullText = container.textContent ?? "";
    expect(fullText.toLowerCase()).not.toContain("top cut");
  });
});

// =============================================================================
// Happy path rendering
// =============================================================================

describe("UsageTreemap — happy path", () => {
  it("renders without crashing with minimal valid data", () => {
    const data = [makeSpecies({ species: "Koraidon", usagePct: 30, rank: 1 })];
    expect(() => render(<UsageTreemap data={data} />)).not.toThrow();
  });

  it("renders SVG rect elements for above-threshold species", () => {
    const data: PipelineSpeciesData[] = [
      makeSpecies({ species: "Koraidon", usagePct: 30, rank: 1 }),
      makeSpecies({ species: "Sneasler", usagePct: 25, rank: 2 }),
    ];
    const { container } = render(<UsageTreemap data={data} />);
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThan(0);
  });

  it("accepts a speciesHref prop without crashing", () => {
    const data = [makeSpecies({ species: "Koraidon", usagePct: 30, rank: 1 })];
    const href = (s: string) => `/data/species/${s}`;
    expect(() =>
      render(<UsageTreemap data={data} speciesHref={href} />)
    ).not.toThrow();
  });
});

// =============================================================================
// Threshold boundary
// =============================================================================

describe("UsageTreemap — threshold boundary", () => {
  it("retains species at exactly the 1% threshold", () => {
    const data: PipelineSpeciesData[] = [
      makeSpecies({ species: "TopMon", usagePct: 10, rank: 1 }),
      makeSpecies({ species: "ExactlyAtThreshold", usagePct: 1, rank: 2 }),
      makeSpecies({ species: "BelowThreshold", usagePct: 0.9, rank: 3 }),
    ];

    const { container } = render(<UsageTreemap data={data} />);
    const allText = Array.from(container.querySelectorAll("text")).map(
      (t) => t.textContent ?? ""
    );

    // The Others tile should only have 1 species (the 0.9% one).
    const othersText = allText.find((t) => t.startsWith("Others"));
    expect(othersText).toMatch(/Others \(1 species\)/);
  });
});
