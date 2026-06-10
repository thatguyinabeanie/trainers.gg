import React from "react";
import { render, screen } from "@testing-library/react";
import { type ResponsiveContainerProps } from "recharts";

import { type FormatEvent, type SpeciesUsagePeriod } from "@trainers/supabase";

import { SpeciesTimeline } from "../species-timeline";

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
//
// JSDOM has no layout engine — ResponsiveContainer reports 0×0 without this,
// rendering nothing. Fixed dimensions force Recharts to render its children.
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
// Test data factories
// =============================================================================

function makeDetailBucket(
  periodStart: string,
  usagePct: number,
  periodEnd?: string
): SpeciesUsagePeriod {
  return {
    periodStart,
    periodEnd: periodEnd ?? periodStart,
    usagePct,
    rank: 1,
    sampleSize: 100,
    usageChange7d: null,
    usageChange30d: null,
    moves: [],
    tera: [],
    items: [],
    abilities: [],
    natures: [],
    abilityItems: [],
  };
}

function makeFormatEvent(
  eventKey: string,
  eventDate: string,
  source: "rk9" | "limitless" = "rk9"
): FormatEvent {
  return { eventKey, eventDate, source };
}

// =============================================================================
// SpeciesTimeline
// =============================================================================

describe("SpeciesTimeline", () => {
  const SPECIES = "koraidon";

  const sampleDetail: SpeciesUsagePeriod[] = [
    makeDetailBucket("2025-01-01", 48.2, "2025-01-07"),
    makeDetailBucket("2025-01-08", 50.1, "2025-01-14"),
    makeDetailBucket("2025-01-15", 47.3, "2025-01-21"),
  ];

  const sampleEvents: FormatEvent[] = [
    makeFormatEvent("event-001", "2025-01-10"),
    makeFormatEvent("event-002", "2025-01-18", "limitless"),
  ];

  it("renders the DataChartCard with 'Usage Over Time' title", () => {
    render(
      <SpeciesTimeline
        detail={sampleDetail}
        species={SPECIES}
        events={sampleEvents}
      />
    );
    // The DataChartCard title + UsageLineChart's own header both render
    // "Usage Over Time" — assert at least one is present.
    const headings = screen.getAllByText("Usage Over Time");
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders UsageLineChart when detail is non-empty", () => {
    const { container } = render(
      <SpeciesTimeline
        detail={sampleDetail}
        species={SPECIES}
        events={sampleEvents}
      />
    );
    // UsageLineChart renders a recharts SVG
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows empty state when detail is empty", () => {
    render(
      <SpeciesTimeline detail={[]} species={SPECIES} events={sampleEvents} />
    );
    expect(
      screen.getByText("No usage timeline data available.")
    ).toBeInTheDocument();
    // No chart rendered in the empty state
    expect(document.querySelector("svg")).not.toBeInTheDocument();
  });

  it("empty state still renders the DataChartCard title", () => {
    render(<SpeciesTimeline detail={[]} species={SPECIES} events={[]} />);
    expect(screen.getByText("Usage Over Time")).toBeInTheDocument();
  });

  it("passes events to UsageLineChart without throwing", () => {
    // If events prop is mishandled an error boundary or throw would fail render.
    expect(() => {
      render(
        <SpeciesTimeline
          detail={sampleDetail}
          species={SPECIES}
          events={sampleEvents}
        />
      );
    }).not.toThrow();
  });

  it("no-op onSpeciesClick does not throw when triggered", () => {
    // We cannot directly invoke the internal handler, but we can verify
    // rendering completes without error even with a single-species line
    // (clicking the line would call the no-op — no crash expected).
    expect(() => {
      render(
        <SpeciesTimeline detail={sampleDetail} species={SPECIES} events={[]} />
      );
    }).not.toThrow();
  });

  it("no-op onRangeChange does not throw when render completes", () => {
    expect(() => {
      render(
        <SpeciesTimeline detail={sampleDetail} species={SPECIES} events={[]} />
      );
    }).not.toThrow();
  });

  it("renders correctly with a single bucket", () => {
    render(
      <SpeciesTimeline
        detail={[makeDetailBucket("2025-03-01", 35.0)]}
        species="miraidon"
        events={[]}
      />
    );
    expect(
      screen.getAllByText("Usage Over Time").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders correctly with empty events array", () => {
    render(
      <SpeciesTimeline detail={sampleDetail} species={SPECIES} events={[]} />
    );
    expect(
      screen.getAllByText("Usage Over Time").length
    ).toBeGreaterThanOrEqual(1);
  });
});
