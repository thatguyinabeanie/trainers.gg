import React from "react";
import { render, screen } from "@testing-library/react";

import { UsageInspector } from "../usage-inspector";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getActiveFormats: () => [
    { id: "gen9vgc2025regg", label: "VGC 2025 Reg G", isChampions: false },
  ],
  getFormatById: (id: string) => ({ id }),
  VGC_FORMATS: [{ id: "gen9vgc2025regg", label: "VGC 2025 Reg G" }],
}));

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: (s: string) => `ago(${s})`,
}));

// Mock @/lib/supabase to avoid creating a real Supabase client in JSDOM.
// useSupabaseQuery returns the loading=false + no-data state so each of the
// three query branches renders its empty-state UI path.
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: () => ({
    data: undefined,
    isLoading: false,
    error: null,
    isFetching: false,
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe("UsageInspector", () => {
  it("renders without crashing", () => {
    render(<UsageInspector />);
    // Component mounted — the species table header is always present
    expect(screen.getByText(/Species/)).toBeInTheDocument();
  });

  it("renders the stat strip empty state when no meta bucket is available", () => {
    render(<UsageInspector />);
    expect(screen.getByText(/No usage computed/i)).toBeInTheDocument();
  });

  it("renders the species table empty state when no usage rows are available", () => {
    render(<UsageInspector />);
    expect(
      screen.getByText(/No species data for this selection/i)
    ).toBeInTheDocument();
  });

  it("renders the column headers in the species ranking table", () => {
    render(<UsageInspector />);
    // Table header row labels
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Species")).toBeInTheDocument();
    expect(screen.getByText(/USG %/i)).toBeInTheDocument();
  });

  it("renders the filter controls area", () => {
    const { container } = render(<UsageInspector />);
    // Three select controls render: Format, Source, Period.
    // Base UI Select renders triggers as buttons with aria-haspopup="listbox".
    const triggers = container.querySelectorAll(
      "button[aria-haspopup='listbox']"
    );
    expect(triggers.length).toBeGreaterThanOrEqual(3);
  });
});
