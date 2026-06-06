import { render, screen } from "@testing-library/react";

import type * as TrainersPokemon from "@trainers/pokemon";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Mock @trainers/pokemon ability functions
// =============================================================================

const mockGetValidAbilities = jest.fn();
const mockGetLegalAbilities = jest.fn();
const mockGetAbilityShortDesc = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  ...jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon"),
  getValidAbilities: (...args: unknown[]) => mockGetValidAbilities(...args),
  getLegalAbilities: (...args: unknown[]) => mockGetLegalAbilities(...args),
  getAbilityShortDesc: (...args: unknown[]) => mockGetAbilityShortDesc(...args),
}));

// =============================================================================
// Mock useUsageData — ability-picker now calls this hook; return empty by default
// so existing tests are unaffected. Override per-test when testing usage.
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

import { AbilityPicker } from "../pickers/ability-picker";
import { type GameFormat } from "@trainers/pokemon";

// =============================================================================
// Helpers
// =============================================================================

function makeMockFormat(): GameFormat {
  return {
    id: "gen9vgc2024reg",
    label: "VGC 2024 Reg G",
    generation: 9,
    isChampions: false,
    isChampionsTeamSize: false,
    legalLevelCap: 50,
  } as unknown as GameFormat;
}

const GARCHOMP_ABILITIES = ["Rough Skin", "Sand Veil", "Sand Force"];

// =============================================================================
// AbilityPicker tests
// =============================================================================

describe("AbilityPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetValidAbilities.mockReturnValue(GARCHOMP_ABILITIES);
    mockGetLegalAbilities.mockReturnValue(null); // fallback to valid abilities
    mockGetAbilityShortDesc.mockImplementation((ability: string) => {
      if (ability === "Rough Skin") return "Damages on contact.";
      if (ability === "Sand Veil") return "Raises evasion in sandstorm.";
      return undefined;
    });
    // Default: no usage data
    mockUseUsageData.mockReturnValue({ data: undefined });
  });

  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders the title 'Ability'", () => {
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Ability")).toBeInTheDocument();
  });

  it("renders all abilities returned by getValidAbilities", () => {
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    for (const ability of GARCHOMP_ABILITIES) {
      expect(screen.getByText(ability)).toBeInTheDocument();
    }
  });

  it("renders ability short descriptions when available", () => {
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Damages on contact.")).toBeInTheDocument();
    expect(screen.getByText("Raises evasion in sandstorm.")).toBeInTheDocument();
  });

  it("renders the search input with placeholder 'Search abilities…'", () => {
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByPlaceholderText("Search abilities…")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Format-aware fetching
  // ---------------------------------------------------------------------------

  it("calls getLegalAbilities when format is provided", () => {
    const format = makeMockFormat();
    mockGetLegalAbilities.mockReturnValue(new Set(["Rough Skin"]));
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={format}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(mockGetLegalAbilities).toHaveBeenCalledWith("Garchomp", format.id);
  });

  it("falls back to getValidAbilities when getLegalAbilities returns null", () => {
    const format = makeMockFormat();
    mockGetLegalAbilities.mockReturnValue(null);
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={format}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(mockGetValidAbilities).toHaveBeenCalledWith("Garchomp");
  });

  // ---------------------------------------------------------------------------
  // Search filtering
  // ---------------------------------------------------------------------------

  it("filters ability list as user types in search", async () => {
    const user = userEvent.setup();
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search abilities…");
    await user.type(input, "rough");
    // Only matching abilities should remain
    expect(screen.getByText("Rough Skin")).toBeInTheDocument();
    expect(screen.queryByText("Sand Veil")).not.toBeInTheDocument();
  });

  it("shows 'No abilities found' when search matches nothing", async () => {
    const user = userEvent.setup();
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search abilities…");
    await user.type(input, "zzz");
    expect(screen.getByText("No abilities found")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  it("clicking an ability calls onPick with the ability name and then onClose", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={onPick}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole("button", { name: /rough skin/i }));
    expect(onPick).toHaveBeenCalledWith("Rough Skin");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the currently selected ability button has a highlighted style class", () => {
    render(
      <AbilityPicker
        value="Rough Skin"
        species="Garchomp"
        format={undefined}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const button = screen.getByRole("button", { name: /rough skin/i });
    expect(button.className).toContain("bg-accent");
  });

  // ---------------------------------------------------------------------------
  // Close
  // ---------------------------------------------------------------------------

  it("clicking close calls onClose without calling onPick", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(
      <AbilityPicker
        value={null}
        species="Garchomp"
        format={undefined}
        onPick={onPick}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Usage data display
  // ---------------------------------------------------------------------------

  describe("usage data", () => {
    const format = makeMockFormat();

    /** Build a minimal SpeciesUsagePeriod-shaped object for testing. */
    function makeUsagePeriod(
      abilities: Array<{ value: string; pct: number }>
    ) {
      return {
        period: "2024-01",
        total_battles: 1000,
        moves: [],
        items: [],
        tera: [],
        natures: [],
        abilities: abilities.map((a) => ({
          value: a.value,
          count: a.pct * 10,
          pct: a.pct,
        })),
      };
    }

    it("shows usage % when usage data is present for an ability", () => {
      mockUseUsageData.mockReturnValue({
        data: [makeUsagePeriod([{ value: "Rough Skin", pct: 72 }])],
      });

      render(
        <AbilityPicker
          value={null}
          species="Garchomp"
          format={format}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText("72%")).toBeInTheDocument();
    });

    it("shows '—' for abilities with no usage data when usage data exists for others", () => {
      // Rough Skin has data; Sand Veil and Sand Force show '—'
      mockUseUsageData.mockReturnValue({
        data: [makeUsagePeriod([{ value: "Rough Skin", pct: 72 }])],
      });

      render(
        <AbilityPicker
          value={null}
          species="Garchomp"
          format={format}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Sand Veil and Sand Force have no usage data → muted "—"
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it("does not render usage % column when no usage data is available", () => {
      mockUseUsageData.mockReturnValue({ data: [] });

      render(
        <AbilityPicker
          value={null}
          species="Garchomp"
          format={format}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // No "%" text should appear (hasUsageData is false)
      expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument();
    });

    it("renders sparklines for abilities with ≥2 usage period data points", () => {
      // Two periods → UsageSparkline should render
      mockUseUsageData.mockReturnValue({
        data: [
          makeUsagePeriod([{ value: "Rough Skin", pct: 60 }]),
          makeUsagePeriod([{ value: "Rough Skin", pct: 72 }]),
        ],
      });

      render(
        <AbilityPicker
          value={null}
          species="Garchomp"
          format={format}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByTestId("usage-sparkline")).toBeInTheDocument();
    });

    it("does NOT render sparkline when only 1 usage period is present", () => {
      mockUseUsageData.mockReturnValue({
        data: [makeUsagePeriod([{ value: "Rough Skin", pct: 72 }])],
      });

      render(
        <AbilityPicker
          value={null}
          species="Garchomp"
          format={format}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.queryByTestId("usage-sparkline")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Usage-based sorting
  // ---------------------------------------------------------------------------

  describe("usage-based sorting", () => {
    const format = makeMockFormat();

    function makeUsagePeriod(
      abilities: Array<{ value: string; pct: number }>
    ) {
      return {
        period: "2024-01",
        total_battles: 1000,
        moves: [],
        items: [],
        tera: [],
        natures: [],
        abilities: abilities.map((a) => ({
          value: a.value,
          count: a.pct * 10,
          pct: a.pct,
        })),
      };
    }

    it("sorts abilities by descending usage % when usage data is present", () => {
      // Rough Skin: 72%, Sand Veil: 20%, Sand Force: 8%
      mockUseUsageData.mockReturnValue({
        data: [
          makeUsagePeriod([
            { value: "Rough Skin", pct: 72 },
            { value: "Sand Veil", pct: 20 },
            { value: "Sand Force", pct: 8 },
          ]),
        ],
      });

      render(
        <AbilityPicker
          value={null}
          species="Garchomp"
          format={format}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // The buttons inside the picker list (excluding Close)
      const buttons = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-label") !== "Close");
      const names = buttons.map((b) => {
        // First line of the button text is the ability name
        const text = b.textContent ?? "";
        for (const ability of GARCHOMP_ABILITIES) {
          if (text.includes(ability)) return ability;
        }
        return "";
      });
      const roughIdx = names.findIndex((n) => n === "Rough Skin");
      const veilIdx = names.findIndex((n) => n === "Sand Veil");
      const forceIdx = names.findIndex((n) => n === "Sand Force");
      expect(roughIdx).toBeLessThan(veilIdx);
      expect(veilIdx).toBeLessThan(forceIdx);
    });

    it("preserves original list order when no usage data is available", () => {
      mockGetValidAbilities.mockReturnValue([
        "Sand Veil",
        "Rough Skin",
        "Sand Force",
      ]);
      mockUseUsageData.mockReturnValue({ data: undefined });

      render(
        <AbilityPicker
          value={null}
          species="Garchomp"
          format={undefined}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const buttons = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-label") !== "Close");
      const names = buttons.map((b) => {
        const text = b.textContent ?? "";
        for (const ability of ["Sand Veil", "Rough Skin", "Sand Force"]) {
          if (text.includes(ability)) return ability;
        }
        return "";
      });
      const veilIdx = names.findIndex((n) => n === "Sand Veil");
      const roughIdx = names.findIndex((n) => n === "Rough Skin");
      const forceIdx = names.findIndex((n) => n === "Sand Force");
      // Original order: Sand Veil, Rough Skin, Sand Force
      expect(veilIdx).toBeLessThan(roughIdx);
      expect(roughIdx).toBeLessThan(forceIdx);
    });
  });
});
