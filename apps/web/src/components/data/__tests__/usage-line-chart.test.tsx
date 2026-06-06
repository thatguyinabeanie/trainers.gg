import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  highlight: "",
  threshold: 2,
  events: [] as FormatEvent[],
  onSpeciesClick: jest.fn(),
  onRangeChange: jest.fn(),
  onSelectAll: jest.fn(),
  onClearSelection: jest.fn(),
};

function renderChart(overrides: Partial<typeof DEFAULT_PROPS> = {}) {
  const props = {
    ...DEFAULT_PROPS,
    onSpeciesClick: jest.fn(),
    onRangeChange: jest.fn(),
    onSelectAll: jest.fn(),
    onClearSelection: jest.fn(),
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

  it("does not render the header or buttons when points is empty", () => {
    renderChart({ points: [] });
    expect(screen.queryByText("Usage Over Time")).not.toBeInTheDocument();
    expect(screen.queryByText("Select All")).not.toBeInTheDocument();
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

  it("renders the Pokémon count readout", () => {
    renderChart();
    // 2 species above the default threshold of 2%
    expect(screen.getByText("2 Pokémon")).toBeInTheDocument();
  });

  it("renders the 'Select All' button", () => {
    renderChart();
    expect(
      screen.getByRole("button", { name: "Select All" })
    ).toBeInTheDocument();
  });

  it("renders the 'Clear' button", () => {
    renderChart();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });
});

// =============================================================================
// Callback wiring
// =============================================================================

describe("UsageLineChart — callbacks", () => {
  it("calls onSelectAll when 'Select All' is clicked", async () => {
    const { props } = renderChart();
    await userEvent.click(screen.getByRole("button", { name: "Select All" }));
    expect(props.onSelectAll).toHaveBeenCalledTimes(1);
  });

  it("calls onClearSelection when 'Clear' is clicked", async () => {
    const { props } = renderChart();
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(props.onClearSelection).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Threshold filtering
// =============================================================================

describe("UsageLineChart — threshold filtering", () => {
  it("shows 0 Pokémon when threshold exceeds all series peaks", () => {
    renderChart({
      points: TWO_POINTS,
      threshold: 99,
    });
    expect(screen.getByText("0 Pokémon")).toBeInTheDocument();
  });

  it("shows 1 Pokémon when only one series is above threshold", () => {
    renderChart({
      points: [makePoint("2025-01-01", { Sneasler: 30, Koraidon: 1 })],
      threshold: 5,
    });
    expect(screen.getByText("1 Pokémon")).toBeInTheDocument();
  });
});

// =============================================================================
// Selected species (legend strip)
// =============================================================================

describe("UsageLineChart — selected species legend", () => {
  it("renders the selected-species legend strip when selectedSpecies is non-empty", () => {
    renderChart({ selectedSpecies: ["Sneasler"] });
    expect(screen.getByText("Sneasler")).toBeInTheDocument();
  });

  it("renders multiple chips in the legend when multiple species are selected", () => {
    renderChart({ selectedSpecies: ["Sneasler", "Koraidon"] });
    expect(screen.getByText("Sneasler")).toBeInTheDocument();
    expect(screen.getByText("Koraidon")).toBeInTheDocument();
  });

  it("does not render the legend strip when no species are selected", () => {
    renderChart({ selectedSpecies: [] });
    // The two species labels should not appear as standalone chips
    // (they would only show up in the Recharts axis/tooltip which JSDOM may not render)
    const legendArea = screen
      .queryAllByText("Sneasler")
      .filter((el) => el.tagName.toLowerCase() === "span");
    expect(legendArea.length).toBe(0);
  });
});

// =============================================================================
// Highlight / dim logic (series rendering)
// =============================================================================

describe("UsageLineChart — highlight/dim logic", () => {
  it("renders without error when highlight filters out all species", () => {
    renderChart({ highlight: "zzz_no_match_zzz" });
    // Component should still render the header even with no visible series
    expect(screen.getByText("Usage Over Time")).toBeInTheDocument();
  });

  it("renders normally when highlight matches a species name", () => {
    renderChart({ highlight: "Sneasler" });
    expect(screen.getByText("Usage Over Time")).toBeInTheDocument();
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
// buildUsageSeries + filterByThreshold integration
// =============================================================================

describe("UsageLineChart — series data integration", () => {
  it("correctly counts visible series for three species with varying usage", () => {
    renderChart({
      points: [
        makePoint("2025-01-01", { Sneasler: 30, Koraidon: 20, Raichu: 1 }),
        makePoint("2025-01-08", { Sneasler: 28, Koraidon: 22, Raichu: 0.5 }),
      ],
      threshold: 5,
    });
    // Only Sneasler and Koraidon peak above 5%
    expect(screen.getByText("2 Pokémon")).toBeInTheDocument();
  });

  it("shows all 3 series when threshold is below all peaks", () => {
    renderChart({
      points: [
        makePoint("2025-01-01", { Sneasler: 30, Koraidon: 20, Raichu: 10 }),
      ],
      threshold: 5,
    });
    expect(screen.getByText("3 Pokémon")).toBeInTheDocument();
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
