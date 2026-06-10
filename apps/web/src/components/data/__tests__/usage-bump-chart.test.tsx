import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { type ResponsiveContainerProps } from "recharts";

import { type FormatUsageTimeseriesPoint } from "@trainers/supabase";

import { UsageBumpChart } from "../usage-bump-chart";

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
      <OriginalResponsiveContainer width={800} height={320}>
        {children}
      </OriginalResponsiveContainer>
    ),
  };
});

// useIsMobile: default desktop
const mockUseIsMobile = jest.fn<boolean, []>();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false);
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

const THREE_POINTS: FormatUsageTimeseriesPoint[] = [
  makePoint("2025-01-01", { Sneasler: 30, Koraidon: 20, Raichu: 10 }),
  makePoint("2025-01-08", { Sneasler: 28, Koraidon: 22, Raichu: 9 }),
  makePoint("2025-01-15", { Sneasler: 25, Koraidon: 24, Raichu: 8 }),
];

// =============================================================================
// Smoke render
// =============================================================================

describe("UsageBumpChart — smoke render", () => {
  it("renders the chart title", () => {
    render(
      <UsageBumpChart
        points={THREE_POINTS}
        topN={20}
        onTopNChange={jest.fn()}
      />
    );
    expect(screen.getByText("Usage Rank Over Time")).toBeInTheDocument();
  });

  it("renders the Top-N control buttons", () => {
    render(
      <UsageBumpChart
        points={THREE_POINTS}
        topN={20}
        onTopNChange={jest.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Show top 8" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show top 12" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show top 20" })
    ).toBeInTheDocument();
  });

  it("shows empty state when points is empty", () => {
    render(<UsageBumpChart points={[]} topN={20} onTopNChange={jest.fn()} />);
    expect(
      screen.getByText("No usage data for this format.")
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Top-N control
// =============================================================================

describe("UsageBumpChart — Top-N control", () => {
  it("calls onTopNChange with 8 when 'Show top 8' is clicked", () => {
    const onTopNChange = jest.fn();
    render(
      <UsageBumpChart
        points={THREE_POINTS}
        topN={20}
        onTopNChange={onTopNChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Show top 8" }));
    expect(onTopNChange).toHaveBeenCalledWith(8);
  });

  it("calls onTopNChange with 12 when 'Show top 12' is clicked", () => {
    const onTopNChange = jest.fn();
    render(
      <UsageBumpChart
        points={THREE_POINTS}
        topN={20}
        onTopNChange={onTopNChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Show top 12" }));
    expect(onTopNChange).toHaveBeenCalledWith(12);
  });

  it("calls onTopNChange with 20 when 'Show top 20' is clicked", () => {
    const onTopNChange = jest.fn();
    render(
      <UsageBumpChart
        points={THREE_POINTS}
        topN={8}
        onTopNChange={onTopNChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Show top 20" }));
    expect(onTopNChange).toHaveBeenCalledWith(20);
  });

  it("marks the active topN button as aria-pressed=true", () => {
    render(
      <UsageBumpChart
        points={THREE_POINTS}
        topN={12}
        onTopNChange={jest.fn()}
      />
    );
    const btn12 = screen.getByRole("button", { name: "Show top 12" });
    const btn8 = screen.getByRole("button", { name: "Show top 8" });
    expect(btn12).toHaveAttribute("aria-pressed", "true");
    expect(btn8).toHaveAttribute("aria-pressed", "false");
  });
});

// =============================================================================
// onSpeciesClick passthrough
// =============================================================================

describe("UsageBumpChart — onSpeciesClick passthrough", () => {
  it("is optional — renders without onSpeciesClick prop", () => {
    expect(() =>
      render(
        <UsageBumpChart
          points={THREE_POINTS}
          topN={20}
          onTopNChange={jest.fn()}
        />
      )
    ).not.toThrow();
  });
});

// =============================================================================
// Mobile rendering
// =============================================================================

describe("UsageBumpChart — mobile", () => {
  it("renders without error on mobile viewport", () => {
    mockUseIsMobile.mockReturnValue(true);
    render(
      <UsageBumpChart points={THREE_POINTS} topN={8} onTopNChange={jest.fn()} />
    );
    expect(screen.getByText("Usage Rank Over Time")).toBeInTheDocument();
  });
});
