import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsageControls, type UsageFilters } from "../usage-controls";

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
  ],
  getFormatById: (id: string) => ({ id }),
}));

function makeFilters(overrides: Partial<UsageFilters> = {}): UsageFilters {
  return {
    format: "gen9vgc2025regg",
    source: "all",
    periodType: "week",
    threshold: 2,
    ...overrides,
  };
}

function renderControls(
  overrides: {
    filters?: Partial<UsageFilters>;
    highlight?: string;
    totalCount?: number;
    visibleCount?: number;
    onFiltersChange?: jest.Mock;
    onHighlightChange?: jest.Mock;
  } = {}
) {
  const props = {
    filters: makeFilters(overrides.filters),
    highlight: overrides.highlight ?? "",
    totalCount: overrides.totalCount ?? 100,
    visibleCount: overrides.visibleCount ?? 20,
    onFiltersChange: overrides.onFiltersChange ?? jest.fn(),
    onHighlightChange: overrides.onHighlightChange ?? jest.fn(),
  };
  return render(<UsageControls {...props} />);
}

describe("UsageControls", () => {
  it("renders section labels for all control groups", () => {
    renderControls();
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Granularity")).toBeInTheDocument();
    expect(screen.getByText("Min usage")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
  });

  it("renders the search input with the correct placeholder", () => {
    renderControls();
    expect(screen.getByPlaceholderText("Search Pokémon...")).toBeInTheDocument();
  });

  it("displays the current threshold percentage", () => {
    renderControls({ filters: { threshold: 3 } });
    expect(screen.getByText("3%")).toBeInTheDocument();
  });

  it("displays the visible/total count readout", () => {
    renderControls({ totalCount: 150, visibleCount: 42 });
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/150 Pokémon/i)).toBeInTheDocument();
  });

  it("calls onHighlightChange when the search input changes", async () => {
    const onHighlightChange = jest.fn();
    renderControls({ onHighlightChange });
    const input = screen.getByPlaceholderText("Search Pokémon...");
    await userEvent.type(input, "Pikachu");
    expect(onHighlightChange).toHaveBeenCalled();
  });

  it("renders the search input aria-labelled correctly", () => {
    renderControls();
    expect(
      screen.getByRole("textbox", { name: /Search for a Pokemon by name/i })
    ).toBeInTheDocument();
  });

  it("renders the threshold slider with the correct aria-label", () => {
    const { container } = renderControls();
    // Base UI Slider in JSDOM does not expose role="slider" on the thumb — the
    // aria-label is present as an attribute on the thumb element. Query by
    // aria-label attribute directly to confirm the label is wired correctly.
    expect(
      container.querySelector('[aria-label="Minimum usage threshold"]')
    ).toBeInTheDocument();
  });
});
