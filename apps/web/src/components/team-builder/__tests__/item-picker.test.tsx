import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";

// =============================================================================
// Mock @trainers/pokemon item functions.
// getAllItems is called at module load (top-level const), so we mock the module.
// =============================================================================

const MOCK_ITEMS = [
  "Choice Band",
  "Choice Specs",
  "Choice Scarf",
  "Leftovers",
  "Life Orb",
  "Focus Sash",
  "Assault Vest",
  "Sitrus Berry",
];

const mockGetAllItems = jest.fn(() => MOCK_ITEMS);
const mockGetLegalItems = jest.fn();
const mockGetItemShortDesc = jest.fn();

jest.mock("@trainers/pokemon", () => ({
  ...jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon"),
  getAllItems: (...args: unknown[]) => mockGetAllItems(...args),
  getLegalItems: (...args: unknown[]) => mockGetLegalItems(...args),
  getItemShortDesc: (...args: unknown[]) => mockGetItemShortDesc(...args),
}));

// =============================================================================
// Mock useUsageData — item-picker now calls this hook; return empty by default
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

// JSDOM doesn't implement layout/scroll APIs, so @tanstack/react-virtual
// reports zero visible items. Mock it to render every row.
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 40,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 40,
        size: 40,
      })),
  }),
}));

import { ItemPicker } from "../pickers/item-picker";
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

/** Build a minimal SpeciesUsagePeriod-shaped object for testing. */
function makeUsagePeriod(
  items: Array<{ value: string; pct: number }>
) {
  return {
    period: "2024-01",
    total_battles: 1000,
    moves: [],
    items: items.map((i) => ({ value: i.value, count: i.pct * 10, pct: i.pct })),
    tera: [],
  };
}

// =============================================================================
// ItemPicker tests
// =============================================================================

describe("ItemPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllItems.mockReturnValue(MOCK_ITEMS);
    mockGetLegalItems.mockReturnValue(undefined);
    mockGetItemShortDesc.mockImplementation((item: string) => {
      if (item === "Choice Band") return "Boosts Attack by 1.5×; locks move.";
      if (item === "Leftovers") return "Restores HP each turn.";
      return undefined;
    });
    // Default: no usage data
    mockUseUsageData.mockReturnValue({ data: undefined });
  });

  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders the title 'ITEM'", () => {
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Item")).toBeInTheDocument();
  });

  it("renders the search input with placeholder 'Search items…'", () => {
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByPlaceholderText("Search items…")).toBeInTheDocument();
  });

  it("renders a close button", () => {
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Search filtering
  // ---------------------------------------------------------------------------

  it("shows all items when search is empty", () => {
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // All items appear (via virtualizer — check at least one visible item)
    expect(screen.getByText("Choice Band")).toBeInTheDocument();
  });

  it("filters items when user types in the search box", async () => {
    const user = userEvent.setup();
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search items…");
    await user.type(input, "leftovers");
    expect(screen.getByText("Leftovers")).toBeInTheDocument();
    expect(screen.queryByText("Choice Band")).not.toBeInTheDocument();
  });

  it("shows 'No items found' when search matches nothing", async () => {
    const user = userEvent.setup();
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search items…");
    await user.type(input, "zzznotanitem");
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("search is case-insensitive", async () => {
    const user = userEvent.setup();
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search items…");
    await user.type(input, "CHOICE");
    expect(screen.getByText("Choice Band")).toBeInTheDocument();
    expect(screen.getByText("Choice Specs")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  it("clicking an item calls onPick with the item name and then onClose", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={onPick}
        onClose={onClose}
      />
    );
    // Search to make only the target item visible
    const input = screen.getByPlaceholderText("Search items…");
    await user.type(input, "Choice Band");
    await user.click(screen.getByText("Choice Band").closest("button")!);
    expect(onPick).toHaveBeenCalledWith("Choice Band");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Duplicate warning badge
  // ---------------------------------------------------------------------------

  it("shows 'held' badge when item is already held by a teammate", async () => {
    const user = userEvent.setup();
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={["Leftovers"]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search items…");
    await user.type(input, "Leftovers");
    expect(screen.getByText("held")).toBeInTheDocument();
  });

  it("does NOT show 'held' badge when item is not held by a teammate", async () => {
    const user = userEvent.setup();
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search items…");
    await user.type(input, "Leftovers");
    expect(screen.queryByText("held")).not.toBeInTheDocument();
  });

  it("does NOT show 'held' badge for the currently selected item", async () => {
    // When it's the selected item, the badge is suppressed
    const user = userEvent.setup();
    render(
      <ItemPicker
        value="Leftovers"
        species={undefined}
        format={undefined}
        teamItems={["Leftovers"]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Search items…");
    await user.type(input, "Leftovers");
    expect(screen.queryByText("held")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Format-scoped filtering
  // ---------------------------------------------------------------------------

  it("restricts items to legal set when format is provided", () => {
    const format = makeMockFormat();
    // Only Choice Band is legal in this format
    mockGetLegalItems.mockReturnValue(new Set(["Choice Band"]));

    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={format}
        teamItems={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Choice Band")).toBeInTheDocument();
    expect(screen.queryByText("Leftovers")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Close
  // ---------------------------------------------------------------------------

  it("clicking close calls onClose without calling onPick", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(
      <ItemPicker
        value={null}
        species={undefined}
        format={undefined}
        teamItems={[]}
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

    it("shows usage % when usage data is present for an item", () => {
      mockUseUsageData.mockReturnValue({
        data: [makeUsagePeriod([{ value: "Choice Band", pct: 45 }])],
      });

      render(
        <ItemPicker
          value={null}
          species="Garchomp"
          format={format}
          teamItems={[]}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText("45%")).toBeInTheDocument();
    });

    it("shows '—' for items with no usage data when usage data exists for others", () => {
      // Only Choice Band has data; Life Orb shows '—'
      mockGetAllItems.mockReturnValue(["Choice Band", "Life Orb"]);
      mockUseUsageData.mockReturnValue({
        data: [makeUsagePeriod([{ value: "Choice Band", pct: 30 }])],
      });

      render(
        <ItemPicker
          value={null}
          species="Garchomp"
          format={format}
          teamItems={[]}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Life Orb has no usage data → shows "—"
      expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    });

    it("does not render usage % column when no usage data is available", () => {
      mockUseUsageData.mockReturnValue({ data: [] });

      render(
        <ItemPicker
          value={null}
          species="Garchomp"
          format={format}
          teamItems={[]}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // No "%" text should appear in usage column (% is only rendered when
      // hasUsageData is true and item has a non-zero pct)
      expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument();
    });

    it("renders sparklines for items with ≥2 usage period data points", () => {
      mockGetAllItems.mockReturnValue(["Choice Band"]);
      // Two periods → UsageSparkline should render
      mockUseUsageData.mockReturnValue({
        data: [
          makeUsagePeriod([{ value: "Choice Band", pct: 30 }]),
          makeUsagePeriod([{ value: "Choice Band", pct: 45 }]),
        ],
      });

      render(
        <ItemPicker
          value={null}
          species="Garchomp"
          format={format}
          teamItems={[]}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(screen.getByTestId("usage-sparkline")).toBeInTheDocument();
    });

    it("does NOT render sparkline when only 1 usage period is present", () => {
      mockGetAllItems.mockReturnValue(["Choice Band"]);
      // One period only → series has length 1 → no sparkline
      mockUseUsageData.mockReturnValue({
        data: [makeUsagePeriod([{ value: "Choice Band", pct: 45 }])],
      });

      render(
        <ItemPicker
          value={null}
          species="Garchomp"
          format={format}
          teamItems={[]}
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

    it("sorts items by descending usage % when usage data is present", () => {
      mockGetAllItems.mockReturnValue([
        "Life Orb",
        "Leftovers",
        "Choice Band",
      ]);
      // Choice Band: 50%, Leftovers: 30%, Life Orb: 10%
      mockUseUsageData.mockReturnValue({
        data: [
          makeUsagePeriod([
            { value: "Choice Band", pct: 50 },
            { value: "Leftovers", pct: 30 },
            { value: "Life Orb", pct: 10 },
          ]),
        ],
      });

      render(
        <ItemPicker
          value={null}
          species="Garchomp"
          format={format}
          teamItems={[]}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const buttons = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-label") !== "Close");
      const names = buttons.map((b) => b.textContent?.trim() ?? "");
      const choiceIdx = names.findIndex((n) => n.startsWith("Choice Band"));
      const leftIdx = names.findIndex((n) => n.startsWith("Leftovers"));
      const lifeIdx = names.findIndex((n) => n.startsWith("Life Orb"));
      // Higher usage should appear earlier
      expect(choiceIdx).toBeLessThan(leftIdx);
      expect(leftIdx).toBeLessThan(lifeIdx);
    });

    it("preserves original ordering when no usage data is available", () => {
      mockGetAllItems.mockReturnValue(["Leftovers", "Choice Band", "Life Orb"]);
      mockUseUsageData.mockReturnValue({ data: undefined });

      render(
        <ItemPicker
          value={null}
          species={undefined}
          format={undefined}
          teamItems={[]}
          onPick={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const buttons = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-label") !== "Close");
      const names = buttons.map((b) => b.textContent?.trim() ?? "");
      const leftIdx = names.findIndex((n) => n.startsWith("Leftovers"));
      const choiceIdx = names.findIndex((n) => n.startsWith("Choice Band"));
      const lifeIdx = names.findIndex((n) => n.startsWith("Life Orb"));
      // Original order: Leftovers, Choice Band, Life Orb
      expect(leftIdx).toBeLessThan(choiceIdx);
      expect(choiceIdx).toBeLessThan(lifeIdx);
    });
  });
});
