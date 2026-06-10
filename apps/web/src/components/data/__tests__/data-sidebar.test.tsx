import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { pipelineSpeciesFactory } from "@trainers/test-utils";

import { DataSidebar } from "../data-sidebar";
import {
  type UsageFilters,
  DEFAULT_MIN_PLAYERS,
  applyPreset,
} from "../usage-filters";

// =============================================================================
// Module mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
    { id: "gen9vgc2024regh", label: "VGC 2024 Reg H", isChampions: false },
  ],
}));

// DataSidebar uses assignColor (usage-series)
jest.mock("../usage-series", () => ({
  assignColor: () => "#cccccc",
}));

// =============================================================================
// Fixtures & helpers
// =============================================================================

const DEFAULT_FILTERS: UsageFilters = {
  format: "gen9vgc2025regg",
  source: "all",
  periodType: "week",
};

const TWENTY_SPECIES = pipelineSpeciesFactory.buildList(20);

function renderSidebar(overrides?: {
  collapsed?: boolean;
  selectedSpecies?: string[];
  onSelectionChange?: jest.Mock;
  onFiltersChange?: jest.Mock;
  onMinPlayersChange?: jest.Mock;
}) {
  const onSelectionChange = overrides?.onSelectionChange ?? jest.fn();
  const onFiltersChange = overrides?.onFiltersChange ?? jest.fn();
  const onMinPlayersChange = overrides?.onMinPlayersChange ?? jest.fn();

  return {
    onSelectionChange,
    onFiltersChange,
    onMinPlayersChange,
    ...render(
      <DataSidebar
        filters={DEFAULT_FILTERS}
        allSpecies={TWENTY_SPECIES}
        selectedSpecies={overrides?.selectedSpecies ?? []}
        minPlayers={DEFAULT_MIN_PLAYERS}
        onFiltersChange={onFiltersChange}
        onSelectionChange={onSelectionChange}
        onMinPlayersChange={onMinPlayersChange}
      />
    ),
  };
}

// =============================================================================
// Reset localStorage between tests
// =============================================================================

beforeEach(() => {
  localStorage.clear();
});

// =============================================================================
// Collapse persistence
// =============================================================================

describe("DataSidebar — collapse persistence", () => {
  it("renders expanded by default when localStorage has no value", () => {
    renderSidebar();
    expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();
    expect(screen.queryByLabelText("Expand sidebar")).not.toBeInTheDocument();
  });

  it("restores collapsed state from localStorage before first paint", () => {
    localStorage.setItem("data-sidebar-collapsed", "true");
    renderSidebar();
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
    expect(screen.queryByLabelText("Collapse sidebar")).not.toBeInTheDocument();
  });

  it("saves collapsed=true to localStorage when the user collapses the sidebar", async () => {
    renderSidebar();
    await userEvent.click(screen.getByLabelText("Collapse sidebar"));
    expect(localStorage.getItem("data-sidebar-collapsed")).toBe("true");
    // After collapsing, the expand button appears
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
  });

  it("saves collapsed=false to localStorage when the user expands the sidebar", async () => {
    localStorage.setItem("data-sidebar-collapsed", "true");
    renderSidebar();
    await userEvent.click(screen.getByLabelText("Expand sidebar"));
    expect(localStorage.getItem("data-sidebar-collapsed")).toBe("false");
    expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();
  });
});

// =============================================================================
// Preset buttons
// =============================================================================

describe("DataSidebar — preset buttons", () => {
  it("calls onSelectionChange with the top 10 species when Top 10 is clicked", async () => {
    const onSelectionChange = jest.fn();
    renderSidebar({ onSelectionChange });
    await userEvent.click(screen.getByRole("button", { name: "Top 10" }));
    expect(onSelectionChange).toHaveBeenCalledWith(
      applyPreset(TWENTY_SPECIES, "top10")
    );
  });

  it("calls onSelectionChange with the top 20 species when Top 20 is clicked", async () => {
    const onSelectionChange = jest.fn();
    renderSidebar({ onSelectionChange });
    await userEvent.click(screen.getByRole("button", { name: "Top 20" }));
    expect(onSelectionChange).toHaveBeenCalledWith(
      applyPreset(TWENTY_SPECIES, "top20")
    );
  });

  it("calls onSelectionChange with all species when All is clicked", async () => {
    const onSelectionChange = jest.fn();
    renderSidebar({ onSelectionChange });
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onSelectionChange).toHaveBeenCalledWith(
      applyPreset(TWENTY_SPECIES, "all")
    );
  });
});

// =============================================================================
// Clear button
// =============================================================================

describe("DataSidebar — Clear button", () => {
  it("calls onSelectionChange with [] when Clear is clicked", async () => {
    const onSelectionChange = jest.fn();
    const selectedSpecies = applyPreset(TWENTY_SPECIES, "top10");
    renderSidebar({ selectedSpecies, onSelectionChange });
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });
});

// =============================================================================
// Footer counter
// =============================================================================

describe("DataSidebar — footer counter", () => {
  it("displays the count of selected and total species", () => {
    const selectedSpecies = applyPreset(TWENTY_SPECIES, "top10");
    renderSidebar({ selectedSpecies });
    expect(
      screen.getByText(
        `${selectedSpecies.length} selected · ${TWENTY_SPECIES.length} total`
      )
    ).toBeInTheDocument();
  });
});
