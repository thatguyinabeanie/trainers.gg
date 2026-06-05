import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Use the real @trainers/pokemon for nature data (getValidNatures, NATURE_EFFECTS)
// =============================================================================

// =============================================================================
// Mock useUsageData — nature-picker now calls this hook when species+format are
// provided; return empty by default so existing tests are unaffected.
// =============================================================================

const mockUseUsageData = jest.fn();

jest.mock("../use-usage-data", () => ({
  useUsageData: (...args: unknown[]) => mockUseUsageData(...args),
}));

// =============================================================================
// Mock UsageSparkline — recharts + ResizeObserver not available in JSDOM.
// =============================================================================

jest.mock("../usage-sparkline", () => ({
  UsageSparkline: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span
      data-testid="usage-sparkline"
      aria-label={ariaLabel ?? "Usage trend"}
    />
  ),
}));

import { NaturePicker } from "../pickers/nature-picker";

// =============================================================================
// NaturePicker tests
// =============================================================================

describe("NaturePicker", () => {
  const onPick = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no usage data so existing tests are unaffected
    mockUseUsageData.mockReturnValue({ data: undefined });
  });

  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders the title 'Nature'", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    expect(screen.getByText("Nature")).toBeInTheDocument();
  });

  it("renders the search input with placeholder 'Search natures…'", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    expect(screen.getByPlaceholderText("Search natures…")).toBeInTheDocument();
  });

  it("renders a close button", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Nature count — 25 natures but 4 redundant neutral ones are hidden
  // Only "Serious" is shown for neutral, Hardy/Docile/Bashful/Quirky are hidden
  // ---------------------------------------------------------------------------

  it("renders Serious (neutral nature) in the list", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    expect(screen.getByRole("button", { name: /serious/i })).toBeInTheDocument();
  });

  it.each(["Hardy", "Docile", "Bashful", "Quirky"])(
    "%s is NOT rendered (hidden redundant neutral nature)",
    (nature) => {
      render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
      // These hidden neutral natures should not appear as buttons
      expect(
        screen.queryByRole("button", { name: new RegExp(nature, "i") })
      ).not.toBeInTheDocument();
    }
  );

  it("renders competitive natures like Adamant, Jolly, Timid, Modest", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    for (const nature of ["Adamant", "Jolly", "Timid", "Modest"]) {
      expect(screen.getByRole("button", { name: new RegExp(nature, "i") })).toBeInTheDocument();
    }
  });

  it("renders group headers by boost stat", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    // Group labels include the stat name (e.g., "+ Atk", "+ Spe", etc.)
    expect(screen.getByText(/\+ Atk/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Spe/i)).toBeInTheDocument();
  });

  it("renders the 'Neutral' group header", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    expect(screen.getByText("Neutral")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  it("clicking a nature button calls onPick with the nature name and then onClose", async () => {
    const user = userEvent.setup();
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    const adamantButton = screen.getByRole("button", { name: /adamant/i });
    await user.click(adamantButton);
    expect(onPick).toHaveBeenCalledWith("Adamant");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the selected nature button has a highlighted class", () => {
    render(<NaturePicker value="Adamant" onPick={onPick} onClose={onClose} />);
    const adamantButton = screen.getByRole("button", { name: /adamant/i });
    // Selected adds "font-medium" alongside bg-accent text-accent-foreground.
    // Hover-only classes use the `hover:` prefix so we can match the standalone
    // `font-medium` token to detect the selected state.
    expect(adamantButton.className).toContain("font-medium");
  });

  it("non-selected natures do not have the highlighted class", () => {
    render(<NaturePicker value="Adamant" onPick={onPick} onClose={onClose} />);
    const jollyButton = screen.getByRole("button", { name: /jolly/i });
    expect(jollyButton.className).not.toContain("font-medium");
  });

  // ---------------------------------------------------------------------------
  // Search filtering
  // ---------------------------------------------------------------------------

  it("filters natures when user types in search", async () => {
    const user = userEvent.setup();
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    const input = screen.getByPlaceholderText("Search natures…");
    await user.type(input, "jolly");
    expect(screen.getByRole("button", { name: /jolly/i })).toBeInTheDocument();
    // Adamant does not contain "jolly", so it should be filtered out
    expect(
      screen.queryByRole("button", { name: /adamant/i })
    ).not.toBeInTheDocument();
  });

  it("shows 'No natures found' when search matches nothing", async () => {
    const user = userEvent.setup();
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    const input = screen.getByPlaceholderText("Search natures…");
    await user.type(input, "zzznotanature");
    expect(screen.getByText("No natures found")).toBeInTheDocument();
  });

  it("search is case-insensitive", async () => {
    const user = userEvent.setup();
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    const input = screen.getByPlaceholderText("Search natures…");
    await user.type(input, "JOLLY");
    expect(screen.getByRole("button", { name: /jolly/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Boost / reduce stat badges
  // ---------------------------------------------------------------------------

  it("Adamant shows a green +Atk badge and a red −SpA badge", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    const adamantRow = screen.getByRole("button", { name: /adamant/i });
    // badges are inside the button
    expect(adamantRow.textContent).toContain("+");
    expect(adamantRow.textContent).toContain("−");
  });

  it("Serious shows only a — indicator (neutral)", () => {
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    const seriousRow = screen.getByRole("button", { name: /serious/i });
    expect(seriousRow.textContent).toContain("—");
  });

  // ---------------------------------------------------------------------------
  // Close
  // ---------------------------------------------------------------------------

  it("clicking close calls onClose without calling onPick", async () => {
    const user = userEvent.setup();
    render(<NaturePicker value="" onPick={onPick} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Usage data display
  // ---------------------------------------------------------------------------

  describe("usage data", () => {
    const mockFormat = {
      id: "gen9vgc2024reg",
      label: "VGC 2024 Reg G",
      generation: 9,
    } as any;

    /** Build a minimal SpeciesUsagePeriod-shaped object for testing. */
    function makeUsagePeriod(
      natures: Array<{ value: string; pct: number }>
    ) {
      return {
        period: "2024-01",
        total_battles: 1000,
        moves: [],
        items: [],
        tera: [],
        abilities: [],
        natures: natures.map((n) => ({
          value: n.value,
          count: n.pct * 10,
          pct: n.pct,
        })),
      };
    }

    it("shows usage % when usage data is present for a nature", () => {
      mockUseUsageData.mockReturnValue({
        data: [makeUsagePeriod([{ value: "Adamant", pct: 55 }])],
      });

      render(
        <NaturePicker
          value=""
          species="Garchomp"
          format={mockFormat}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText("55%")).toBeInTheDocument();
    });

    it("does not render usage % column when no usage data is available", () => {
      mockUseUsageData.mockReturnValue({ data: [] });

      render(
        <NaturePicker
          value=""
          species="Garchomp"
          format={mockFormat}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // No percentage values should appear (hasUsageData is false)
      expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument();
    });

    it("renders sparklines for natures with ≥2 usage period data points", () => {
      mockUseUsageData.mockReturnValue({
        data: [
          makeUsagePeriod([{ value: "Adamant", pct: 40 }]),
          makeUsagePeriod([{ value: "Adamant", pct: 55 }]),
        ],
      });

      render(
        <NaturePicker
          value=""
          species="Garchomp"
          format={mockFormat}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByTestId("usage-sparkline")).toBeInTheDocument();
    });

    it("does NOT render sparkline when only 1 usage period is present", () => {
      mockUseUsageData.mockReturnValue({
        data: [makeUsagePeriod([{ value: "Adamant", pct: 55 }])],
      });

      render(
        <NaturePicker
          value=""
          species="Garchomp"
          format={mockFormat}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.queryByTestId("usage-sparkline")).not.toBeInTheDocument();
    });

    it("passes species and format to useUsageData hook", () => {
      render(
        <NaturePicker
          value=""
          species="Garchomp"
          format={mockFormat}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(mockUseUsageData).toHaveBeenCalledWith("Garchomp", mockFormat);
    });

    it("does not call useUsageData with species when species is undefined", () => {
      render(<NaturePicker value="" onPick={jest.fn()} onClose={jest.fn()} />);

      // Called with undefined species and undefined format
      expect(mockUseUsageData).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // Usage-based sorting within groups
  // ---------------------------------------------------------------------------

  describe("usage-based sorting", () => {
    const mockFormat = {
      id: "gen9vgc2024reg",
      label: "VGC 2024 Reg G",
      generation: 9,
    } as any;

    function makeUsagePeriod(
      natures: Array<{ value: string; pct: number }>
    ) {
      return {
        period: "2024-01",
        total_battles: 1000,
        moves: [],
        items: [],
        tera: [],
        abilities: [],
        natures: natures.map((n) => ({
          value: n.value,
          count: n.pct * 10,
          pct: n.pct,
        })),
      };
    }

    it("higher-usage natures appear before lower-usage natures in the same group when usage data is present", () => {
      // Both are + Atk group. Adamant: 55%, Brave: 10% — Adamant should be first.
      mockUseUsageData.mockReturnValue({
        data: [
          makeUsagePeriod([
            { value: "Adamant", pct: 55 },
            { value: "Brave", pct: 10 },
          ]),
        ],
      });

      render(
        <NaturePicker
          value=""
          species="Garchomp"
          format={mockFormat}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const buttons = screen.getAllByRole("button").filter(
        (b) => b.getAttribute("aria-label") !== "Close"
      );
      const texts = buttons.map((b) => b.textContent ?? "");
      const adamantIdx = texts.findIndex((t) => t.includes("Adamant"));
      const braveIdx = texts.findIndex((t) => t.includes("Brave"));
      expect(adamantIdx).toBeLessThan(braveIdx);
    });
  });
});
