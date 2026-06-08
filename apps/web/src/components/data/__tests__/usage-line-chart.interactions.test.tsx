/**
 * Interaction tests for UsageLineChart — line-click and debounced brush.
 *
 * These tests use a fully-stubbed Recharts so Line and Brush render as simple
 * DOM buttons that fire callbacks. This is a separate file from
 * usage-line-chart.test.tsx because real Recharts (used there for event-pin
 * rendering) rejects stub children in LineChart.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsageLineChart } from "../usage-line-chart";
import {
  type FormatUsageTimeseriesPoint,
  type FormatEvent,
} from "@trainers/supabase";

// =============================================================================
// JSDOM polyfill
// =============================================================================
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// =============================================================================
// Fully-stubbed Recharts
//
// Real Recharts' LineChart rejects stub children (throws in getAxisMapByAxes).
// This full stub replaces all chart primitives so Line and Brush render as
// simple DOM buttons that fire their callbacks directly.
// =============================================================================
jest.mock("recharts", () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="rc-container">{children}</div>
    ),
    LineChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ),
    Line: ({
      dataKey,
      onClick,
    }: {
      dataKey: string;
      onClick?: (d: unknown) => void;
    }) => (
      <button
        type="button"
        data-testid={`line-${dataKey}`}
        onClick={() => onClick?.({ dataKey })}
      >
        {dataKey}
      </button>
    ),
    Brush: ({
      onChange,
    }: {
      onChange?: (r: { startIndex: number; endIndex: number }) => void;
    }) => (
      <button
        type="button"
        data-testid="brush"
        onClick={() => onChange?.({ startIndex: 0, endIndex: 1 })}
      >
        brush
      </button>
    ),
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
  };
});

// =============================================================================
// Test data helpers
// =============================================================================

function makePoint(
  periodStart: string,
  usage: Record<string, number> = {}
): FormatUsageTimeseriesPoint {
  const start = new Date(periodStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    periodStart,
    periodEnd: end.toISOString().slice(0, 10),
    usage,
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
// Callbacks — line click
// =============================================================================

describe("UsageLineChart interactions — line click", () => {
  it("calls onSpeciesClick with the species name when a line is clicked", async () => {
    const onSpeciesClick = jest.fn();
    renderChart({ onSpeciesClick });
    await userEvent.click(screen.getByTestId("line-Sneasler"));
    expect(onSpeciesClick).toHaveBeenCalledWith("Sneasler");
  });

  it("calls onSpeciesClick with the correct species for each line", async () => {
    const onSpeciesClick = jest.fn();
    renderChart({ onSpeciesClick });
    await userEvent.click(screen.getByTestId("line-Koraidon"));
    expect(onSpeciesClick).toHaveBeenCalledWith("Koraidon");
  });
});

// =============================================================================
// Callbacks — debounced brush
// =============================================================================

describe("UsageLineChart interactions — debounced brush", () => {
  it("does not call onRangeChange immediately when brush fires", () => {
    jest.useFakeTimers();
    try {
      const onRangeChange = jest.fn();
      renderChart({ onRangeChange });
      fireEvent.click(screen.getByTestId("brush"));
      // Debounced — should not have been called yet
      expect(onRangeChange).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("emits periodStart/periodEnd after the 250 ms debounce", () => {
    jest.useFakeTimers();
    try {
      const onRangeChange = jest.fn();
      renderChart({ onRangeChange });
      fireEvent.click(screen.getByTestId("brush")); // startIndex=0, endIndex=1
      jest.advanceTimersByTime(250);
      // TWO_POINTS[0].periodStart = "2025-01-01", TWO_POINTS[1].periodEnd = "2025-01-14"
      expect(onRangeChange).toHaveBeenCalledWith("2025-01-01", "2025-01-14");
    } finally {
      jest.useRealTimers();
    }
  });

  it("debounces multiple rapid brush changes into one call", () => {
    jest.useFakeTimers();
    try {
      const onRangeChange = jest.fn();
      renderChart({ onRangeChange });
      // Fire brush three times in quick succession
      fireEvent.click(screen.getByTestId("brush"));
      jest.advanceTimersByTime(100);
      fireEvent.click(screen.getByTestId("brush"));
      jest.advanceTimersByTime(100);
      fireEvent.click(screen.getByTestId("brush"));
      // 100+100 = 200ms, timer keeps resetting; advance the remaining 250ms
      jest.advanceTimersByTime(250);
      // Only one call — debounce collapsed the rapid events
      expect(onRangeChange).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
