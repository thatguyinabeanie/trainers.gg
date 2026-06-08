import React from "react";
import { render, screen } from "@testing-library/react";
import { type ResponsiveContainerProps } from "recharts";

import { UsageLineChart } from "../usage-line-chart";
import {
  type FormatUsageTimeseriesPoint,
  type FormatEvent,
} from "@trainers/supabase";

// =============================================================================
// JSDOM polyfills
//
// Recharts uses ResizeObserver internally; JSDOM doesn't implement it.
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
//
// JSDOM has no layout engine, so ResizeObserver reports 0×0 and
// ResponsiveContainer renders nothing. Providing a fixed width/height forces
// Recharts to render its children and exercises series-mapping + XAxisTick code.
// =============================================================================
jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts") as Record<string, unknown>;
  const OriginalResponsiveContainer = actual[
    "ResponsiveContainer"
  ] as React.ComponentType<ResponsiveContainerProps>;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <OriginalResponsiveContainer width={800} height={180}>
        {children}
      </OriginalResponsiveContainer>
    ),
  };
});

// =============================================================================
// Test data helpers
// =============================================================================

function makePoint(
  periodStart: string,
  usage: Record<string, number> = {}
): FormatUsageTimeseriesPoint {
  // periodEnd is the day after periodStart for weekly buckets
  const start = new Date(periodStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    periodStart,
    periodEnd: end.toISOString().slice(0, 10),
    usage,
  };
}

function makeEvent(overrides: Partial<FormatEvent> = {}): FormatEvent {
  return {
    eventKey: "rk9:12345",
    eventDate: "2025-01-01",
    source: "rk9",
    ...overrides,
  };
}

const TWO_POINTS: FormatUsageTimeseriesPoint[] = [
  makePoint("2025-01-01", { Sneasler: 30, Koraidon: 20 }),
  makePoint("2025-01-08", { Sneasler: 28, Koraidon: 22 }),
];

const DEFAULT_PROPS = {
  points: TWO_POINTS,
  selectedSpecies: [] as string[],
  events: [] as FormatEvent[],
  onSpeciesClick: jest.fn(),
  onRangeChange: jest.fn(),
};

function renderChart(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
  const props = {
    ...DEFAULT_PROPS,
    onSpeciesClick: jest.fn(),
    onRangeChange: jest.fn(),
    ...overrides,
  };
  return { ...render(<UsageLineChart {...props} />), props };
}

// =============================================================================
// Empty state
// =============================================================================

describe("UsageLineChart — empty state", () => {
  it("shows 'No usage data for this format.' when points is empty", () => {
    renderChart({ points: [] });
    expect(
      screen.getByText("No usage data for this format.")
    ).toBeInTheDocument();
  });

  it("does not render the header when points is empty", () => {
    renderChart({ points: [] });
    expect(screen.queryByText("Usage Over Time")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Happy path rendering
// =============================================================================

describe("UsageLineChart — happy path", () => {
  it("renders the 'Usage Over Time' header", () => {
    renderChart();
    expect(screen.getByText("Usage Over Time")).toBeInTheDocument();
  });

  it("renders the Pokémon count readout (all species when none selected)", () => {
    renderChart();
    // 2 species in the dataset, none selected → all visible
    expect(screen.getByText("2 Pokémon")).toBeInTheDocument();
  });

  it("does not render 'Select All' or 'Clear' buttons", () => {
    renderChart();
    expect(
      screen.queryByRole("button", { name: "Select All" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear" })
    ).not.toBeInTheDocument();
  });
});

// =============================================================================
// Selected species filtering
// =============================================================================

describe("UsageLineChart — selectedSpecies filtering", () => {
  it("shows 1 Pokémon when only one species is selected", () => {
    renderChart({
      points: TWO_POINTS,
      selectedSpecies: ["Sneasler"],
    });
    expect(screen.getByText("1 Pokémon")).toBeInTheDocument();
  });

  it("shows all Pokémon when selectedSpecies is empty", () => {
    renderChart({
      points: TWO_POINTS,
      selectedSpecies: [],
    });
    expect(screen.getByText("2 Pokémon")).toBeInTheDocument();
  });
});

// =============================================================================
// Selected species (legend strip)
// =============================================================================

describe("UsageLineChart — inline legend", () => {
  it("renders the inline legend when selectedSpecies is non-empty", () => {
    renderChart({ selectedSpecies: ["Sneasler"] });
    expect(screen.getByText("Sneasler")).toBeInTheDocument();
  });

  it("renders all selected species in the legend", () => {
    renderChart({ selectedSpecies: ["Sneasler", "Koraidon"] });
    expect(screen.getByText("Sneasler")).toBeInTheDocument();
    expect(screen.getByText("Koraidon")).toBeInTheDocument();
  });

  it("does not render the legend when no species are selected", () => {
    renderChart({ selectedSpecies: [] });
    // Species names should not appear as legend labels
    const legendSpans = screen
      .queryAllByText("Sneasler")
      .filter((el) => el.tagName.toLowerCase() === "span");
    expect(legendSpans.length).toBe(0);
  });

  it("shows '+N more' when more than 10 species are selected", () => {
    const manySpecies = Array.from({ length: 12 }, (_, i) => `Species${i}`);
    renderChart({ selectedSpecies: manySpecies });
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });
});

// =============================================================================
// Events — pin rendering via XAxisTickWithPin
// =============================================================================

describe("UsageLineChart — event pins", () => {
  it("renders without error when an event falls within the time range", () => {
    // The event date 2025-01-03 falls within the first point's range (2025-01-01 to 2025-01-07)
    renderChart({
      events: [makeEvent({ eventDate: "2025-01-03", source: "rk9" })],
    });
    expect(screen.getByText("Usage Over Time")).toBeInTheDocument();
  });

  it("renders the 🏆 pin emoji for an rk9 event mapped to a visible tick", () => {
    // Event on 2025-01-03 is closest to the 2025-01-01 tick (first point).
    // After Fix 2, eventsForTick("2025-01-01") returns [event], and pin = events[0],
    // so the XAxisTickWithPin renders the emoji into the SVG <text> node.
    renderChart({
      events: [makeEvent({ eventDate: "2025-01-03", source: "rk9" })],
    });
    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("renders the 🌐 pin emoji for a limitless event mapped to a visible tick", () => {
    renderChart({
      events: [makeEvent({ eventDate: "2025-01-03", source: "limitless" })],
    });
    expect(screen.getByText("🌐")).toBeInTheDocument();
  });

  it("renders without error when an event falls outside the time range (filtered out)", () => {
    renderChart({
      events: [makeEvent({ eventDate: "2024-01-01", source: "limitless" })],
    });
    expect(screen.getByText("Usage Over Time")).toBeInTheDocument();
  });

  it("renders without error when an event source is 'limitless'", () => {
    renderChart({
      events: [makeEvent({ eventDate: "2025-01-03", source: "limitless" })],
    });
    expect(screen.getByText("Usage Over Time")).toBeInTheDocument();
  });
});

// =============================================================================
// buildUsageSeries integration
// =============================================================================

describe("UsageLineChart — series data integration", () => {
  it("shows all species when none are selected (no filtering)", () => {
    renderChart({
      points: [
        makePoint("2025-01-01", { Sneasler: 30, Koraidon: 20, Raichu: 1 }),
        makePoint("2025-01-08", { Sneasler: 28, Koraidon: 22, Raichu: 0.5 }),
      ],
      selectedSpecies: [],
    });
    // All 3 species shown when selectedSpecies is empty
    expect(screen.getByText("3 Pokémon")).toBeInTheDocument();
  });

  it("filters to only selected species when selectedSpecies is provided", () => {
    renderChart({
      points: [
        makePoint("2025-01-01", { Sneasler: 30, Koraidon: 20, Raichu: 10 }),
      ],
      selectedSpecies: ["Sneasler", "Koraidon"],
    });
    expect(screen.getByText("2 Pokémon")).toBeInTheDocument();
  });
});

// =============================================================================
// Multiple data points (brush range exercised)
// =============================================================================

describe("UsageLineChart — multiple data points", () => {
  it("renders correctly with three time points", () => {
    renderChart({
      points: [
        makePoint("2025-01-01", { Sneasler: 30 }),
        makePoint("2025-01-08", { Sneasler: 28 }),
        makePoint("2025-01-15", { Sneasler: 25 }),
      ],
    });
    expect(screen.getByText("Usage Over Time")).toBeInTheDocument();
    expect(screen.getByText("1 Pokémon")).toBeInTheDocument();
  });
});
