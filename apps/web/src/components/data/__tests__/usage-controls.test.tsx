import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  UsageControls,
  type UsageFilters,
  type ChartMode,
} from "../usage-controls";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
  ],
  getFormatById: (id: string) => ({ id }),
}));

// =============================================================================
// Helpers
// =============================================================================

function makeFilters(overrides: Partial<UsageFilters> = {}): UsageFilters {
  return {
    format: "gen9vgc2025regg",
    source: "all",
    periodType: "week",
    threshold: 1,
    ...overrides,
  };
}

function renderControls(
  overrides: {
    filters?: Partial<UsageFilters>;
    mode?: ChartMode;
    highlight?: string;
    totalCount?: number;
    visibleCount?: number;
    onFiltersChange?: jest.Mock;
    onModeChange?: jest.Mock;
    onHighlightChange?: jest.Mock;
  } = {}
) {
  const props = {
    filters: makeFilters(overrides.filters),
    mode: overrides.mode ?? ("stream" as ChartMode),
    highlight: overrides.highlight ?? "",
    totalCount: overrides.totalCount ?? 100,
    visibleCount: overrides.visibleCount ?? 20,
    onFiltersChange: overrides.onFiltersChange ?? jest.fn(),
    onModeChange: overrides.onModeChange ?? jest.fn(),
    onHighlightChange: overrides.onHighlightChange ?? jest.fn(),
  };
  return render(<UsageControls {...props} />);
}

// =============================================================================
// Tests
// =============================================================================

describe("UsageControls", () => {
  it("renders without crashing with default props", () => {
    renderControls();
    // The component renders without throwing — spot-check a stable label
    expect(screen.getByText(/Highlight/i)).toBeInTheDocument();
  });

  it("renders the highlight input with the correct placeholder", () => {
    renderControls();
    expect(
      screen.getByPlaceholderText("Type a Pokemon...")
    ).toBeInTheDocument();
  });

  it("displays the current threshold percentage", () => {
    renderControls({ filters: { threshold: 3 } });
    expect(screen.getByText("3%")).toBeInTheDocument();
  });

  it("displays visible/total count readout", () => {
    renderControls({ totalCount: 150, visibleCount: 42 });
    expect(screen.getByText("42")).toBeInTheDocument();
    // The readout renders "42 of 150 Pokemon ≥ X% usage"
    expect(screen.getByText(/150 Pokemon/i)).toBeInTheDocument();
  });

  it("calls onHighlightChange when the highlight input changes", async () => {
    const onHighlightChange = jest.fn();
    renderControls({ onHighlightChange });
    const input = screen.getByPlaceholderText("Type a Pokemon...");
    await userEvent.type(input, "Pikachu");
    // Each character triggers onHighlightChange — just assert at least one call
    expect(onHighlightChange).toHaveBeenCalled();
  });

  it("calls onModeChange when a mode tab is clicked", async () => {
    const onModeChange = jest.fn();
    renderControls({ mode: "stream", onModeChange });
    const stackedTab = screen.getByRole("tab", { name: /Stacked/i });
    await userEvent.click(stackedTab);
    expect(onModeChange).toHaveBeenCalledWith("stacked");
  });

  it("renders all three chart mode tabs", () => {
    renderControls();
    expect(screen.getByRole("tab", { name: /Stream/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Stacked/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Lines/i })).toBeInTheDocument();
  });

  it("renders section labels for all control groups", () => {
    renderControls();
    // Labels are styled with CSS text-transform:uppercase but textContent is mixed case
    expect(screen.getByText("Min usage")).toBeInTheDocument();
    expect(screen.getByText("Chart type")).toBeInTheDocument();
    expect(screen.getByText("Granularity")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Format")).toBeInTheDocument();
  });

  it("renders the highlight input as aria-labelled correctly", () => {
    renderControls();
    expect(
      screen.getByRole("textbox", { name: /Highlight a Pokemon/i })
    ).toBeInTheDocument();
  });

  it("renders the threshold slider", () => {
    renderControls();
    // Slider renders as a range input — query by the wrapper aria-label
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });
});
