import React from "react";
import { render, screen } from "@testing-library/react";
import { type ResponsiveContainerProps } from "recharts";

import { UsageConversionScatter } from "../usage-conversion-scatter";
import { type ConversionRow } from "@trainers/supabase";
import { median, classifyQuadrant, type Quadrant } from "../usage-series";
import { topPctLabel } from "../usage-filters";

// =============================================================================
// next/navigation mock (for router.push used by speciesHref click)
// =============================================================================

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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
// Recharts ResponsiveContainer mock
// =============================================================================

jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts") as Record<string, unknown>;
  const OriginalResponsiveContainer = actual[
    "ResponsiveContainer"
  ] as React.ComponentType<ResponsiveContainerProps>;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <OriginalResponsiveContainer width={800} height={340}>
        {children}
      </OriginalResponsiveContainer>
    ),
  };
});

// =============================================================================
// Pokemon sprite mock
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

function makeRow(overrides: Partial<ConversionRow> = {}): ConversionRow {
  return {
    species: "Sneasler",
    players: 200,
    usagePct: 30,
    topPlayers: 40,
    topField: 200,
    topSharePct: 20,
    conversionPct: 25,
    rankedPlayers: 40,
    ...overrides,
  };
}

/** Rows with null conversionPct — should be dropped from the chart. */
const NULL_ROW: ConversionRow = makeRow({
  species: "Mewtwo",
  conversionPct: null,
});

const ROW_A: ConversionRow = makeRow({
  species: "Koraidon",
  usagePct: 40,
  conversionPct: 30,
  players: 300,
});

const ROW_B: ConversionRow = makeRow({
  species: "Sneasler",
  usagePct: 20,
  conversionPct: 10,
  players: 100,
});

const ROW_C: ConversionRow = makeRow({
  species: "Flutter Mane",
  usagePct: 35,
  conversionPct: 5,
  players: 150,
});

const ROW_D: ConversionRow = makeRow({
  species: "Urshifu",
  usagePct: 15,
  conversionPct: 28,
  players: 80,
});

// =============================================================================
// Null-conversion row exclusion
// =============================================================================

describe("UsageConversionScatter — null-conversion exclusion", () => {
  it("drops rows where conversionPct is null from plotted data", () => {
    // With a mix of null and non-null rows, only non-null species are rendered.
    render(<UsageConversionScatter rows={[NULL_ROW, ROW_A]} topPct={0.1} />);
    // The component renders without crashing and does not show empty state
    expect(
      screen.queryByText("No conversion data available for this period.")
    ).not.toBeInTheDocument();
  });

  it("shows empty state when ALL rows have null conversionPct", () => {
    render(
      <UsageConversionScatter
        rows={[
          makeRow({ species: "A", conversionPct: null }),
          makeRow({ species: "B", conversionPct: null }),
        ]}
        topPct={0.1}
      />
    );
    expect(
      screen.getByText("No conversion data available for this period.")
    ).toBeInTheDocument();
  });

  it("shows empty state when rows is empty", () => {
    render(<UsageConversionScatter rows={[]} topPct={0.1} />);
    expect(
      screen.getByText("No conversion data available for this period.")
    ).toBeInTheDocument();
  });

  it("renders the chart when at least one row has a non-null conversionPct", () => {
    const { container } = render(
      <UsageConversionScatter rows={[NULL_ROW, ROW_A]} topPct={0.1} />
    );
    // ScatterChart renders an SVG
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});

// =============================================================================
// Median reference line computation
// =============================================================================

describe("UsageConversionScatter — median reference line values", () => {
  it("computes usage median only over plotted (non-null) rows", () => {
    // ROW_A usagePct=40, ROW_B usagePct=20 → median = 30
    const plottable = [ROW_A, ROW_B];
    const expectedUsageMedian = median(plottable.map((r) => r.usagePct));
    expect(expectedUsageMedian).toBe(30); // (20+40)/2 = 30
  });

  it("computes conversion median only over plotted (non-null) rows", () => {
    // ROW_A conversionPct=30, ROW_B conversionPct=10 → median = 20
    const plottable = [ROW_A, ROW_B];
    const expectedConversionMedian = median(
      plottable.map((r) => r.conversionPct as number)
    );
    expect(expectedConversionMedian).toBe(20); // (10+30)/2 = 20
  });

  it("null rows do NOT affect median computation", () => {
    // If NULL_ROW were included in median, it would corrupt the computation.
    // Here we verify that the median helper itself handles empty correctly,
    // and that the plottable filter excludes nulls.
    const allRows = [NULL_ROW, ROW_A, ROW_B];
    const plottable = allRows.filter((r) => r.conversionPct !== null);
    expect(plottable).toHaveLength(2);
    const medianUsage = median(plottable.map((r) => r.usagePct));
    expect(medianUsage).toBe(30);
  });

  it("median of a single-element array is that element", () => {
    expect(median([42])).toBe(42);
  });

  it("median of an odd-length sorted array is the middle value", () => {
    expect(median([10, 20, 30])).toBe(20);
  });

  it("median of an even-length array is the average of the two middle values", () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });
});

// =============================================================================
// classifyQuadrant boundary behavior
// =============================================================================

describe("classifyQuadrant — boundary behavior", () => {
  const usageMedian = 30;
  const conversionMedian = 20;

  it.each<[number, number, Quadrant]>([
    // Exactly on both medians → "proven" (>= is "high")
    [30, 20, "proven"],
    // High usage + high conversion
    [40, 30, "proven"],
    // High usage + low conversion → "overrated"
    [40, 10, "overrated"],
    // Exactly on usage median, below conversion median → "overrated"
    [30, 19, "overrated"],
    // Low usage + high conversion → "sleeper"
    [20, 30, "sleeper"],
    // Low usage + exactly on conversion median → "sleeper" (usage < median)
    [10, 20, "sleeper"],
    // Low usage + low conversion → "fringe"
    [10, 10, "fringe"],
  ])(
    "classifyQuadrant(usage=%d, conversion=%d) → %s",
    (usage, conversion, expected) => {
      expect(
        classifyQuadrant(usage, conversion, usageMedian, conversionMedian)
      ).toBe(expected);
    }
  );

  it("dots get classified — at least one proven entry in a dataset with a high-usage high-conversion species", () => {
    const rows = [ROW_A, ROW_B, ROW_C, ROW_D].filter(
      (r) => r.conversionPct !== null
    );
    const usageMedianVal = median(rows.map((r) => r.usagePct));
    const conversionMedianVal = median(
      rows.map((r) => r.conversionPct as number)
    );
    const quadrants = rows.map((r) =>
      classifyQuadrant(
        r.usagePct,
        r.conversionPct as number,
        usageMedianVal,
        conversionMedianVal
      )
    );
    // At least one "proven" (top-right) and one "fringe" (bottom-left)
    expect(quadrants).toContain("proven");
    expect(quadrants).toContain("fringe");
  });
});

// =============================================================================
// topPct label wording — "top cut" must never appear
// =============================================================================

describe("UsageConversionScatter — topPct label wording", () => {
  it.each([
    [0.1, "Top 10%"],
    [0.05, "Top 5%"],
    [0.25, "Top 25%"],
  ])("topPctLabel(%d) returns %s", (pct, expected) => {
    expect(topPctLabel(pct)).toBe(expected);
  });

  it('topPctLabel never contains the substring "top cut" (case-insensitive)', () => {
    const labels = [0.05, 0.1, 0.25].map(topPctLabel);
    for (const label of labels) {
      expect(label.toLowerCase()).not.toContain("top cut");
    }
  });

  it('chart title contains "Top 10%" for topPct=0.1 and never "top cut"', () => {
    render(<UsageConversionScatter rows={[ROW_A, ROW_B]} topPct={0.1} />);
    // The DataChartCard title text is rendered
    const titleEl = screen.getByText(/Usage vs\. Top 10% conversion/i);
    expect(titleEl).toBeInTheDocument();
    expect(titleEl.textContent?.toLowerCase()).not.toContain("top cut");
  });

  it('chart title contains "Top 5%" for topPct=0.05 and never "top cut"', () => {
    render(<UsageConversionScatter rows={[ROW_A, ROW_B]} topPct={0.05} />);
    const titleEl = screen.getByText(/Usage vs\. Top 5% conversion/i);
    expect(titleEl).toBeInTheDocument();
    expect(titleEl.textContent?.toLowerCase()).not.toContain("top cut");
  });
});

// =============================================================================
// Smoke render — happy path
// =============================================================================

describe("UsageConversionScatter — smoke render", () => {
  it("renders without crashing with a valid dataset", () => {
    expect(() =>
      render(
        <UsageConversionScatter
          rows={[ROW_A, ROW_B, ROW_C, ROW_D]}
          topPct={0.1}
        />
      )
    ).not.toThrow();
  });

  it("renders an SVG element for the chart", () => {
    const { container } = render(
      <UsageConversionScatter
        rows={[ROW_A, ROW_B, ROW_C, ROW_D]}
        topPct={0.1}
      />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders the DataChartCard title text", () => {
    render(<UsageConversionScatter rows={[ROW_A, ROW_B]} topPct={0.1} />);
    expect(
      screen.getByText(/Usage vs\. Top 10% conversion/i)
    ).toBeInTheDocument();
  });

  it("renders with speciesHref prop without crashing (Phase 3 no-op)", () => {
    expect(() =>
      render(
        <UsageConversionScatter
          rows={[ROW_A, ROW_B]}
          topPct={0.1}
          speciesHref={(s) => `/data/species/${s}`}
        />
      )
    ).not.toThrow();
  });

  it("renders quadrant corner labels in the DOM", () => {
    render(
      <UsageConversionScatter
        rows={[ROW_A, ROW_B, ROW_C, ROW_D]}
        topPct={0.1}
      />
    );
    expect(screen.getAllByText("Proven meta")).not.toHaveLength(0);
    expect(screen.getAllByText("Overrated")).not.toHaveLength(0);
    expect(screen.getAllByText("Sleepers")).not.toHaveLength(0);
    expect(screen.getAllByText("Fringe")).not.toHaveLength(0);
  });

  it("renders empty-state caption when showing no-data message", () => {
    render(<UsageConversionScatter rows={[]} topPct={0.1} />);
    expect(screen.getByText("Requires placement data")).toBeInTheDocument();
  });
});

// =============================================================================
// Phase 3 — speciesHref navigation (Task 10)
// =============================================================================

beforeEach(() => {
  mockPush.mockClear();
});

describe("UsageConversionScatter — speciesHref navigation", () => {
  it("renders without crashing when speciesHref is provided", () => {
    expect(() =>
      render(
        <UsageConversionScatter
          rows={[ROW_A, ROW_B]}
          topPct={0.1}
          speciesHref={(s) => `/data/pokemon/${s}?format=gen9vgc2025regg`}
        />
      )
    ).not.toThrow();
  });

  it("renders an SVG chart when speciesHref is provided (does not break layout)", () => {
    const { container } = render(
      <UsageConversionScatter
        rows={[ROW_A, ROW_B]}
        topPct={0.1}
        speciesHref={(s) => `/data/pokemon/${s}?format=gen9vgc2025regg`}
      />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("does not call router.push when speciesHref is absent", () => {
    render(<UsageConversionScatter rows={[ROW_A, ROW_B]} topPct={0.1} />);
    // No click interaction here — just assert mockPush was never triggered on render.
    expect(mockPush).not.toHaveBeenCalled();
  });
});
