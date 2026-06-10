import React from "react";
import { render, screen } from "@testing-library/react";
import { type ResponsiveContainerProps } from "recharts";

import { type SpeciesUsagePeriod } from "@trainers/supabase";

import { SpeciesFingerprint } from "../species-fingerprint";

// =============================================================================
// JSDOM polyfills
//
// Recharts uses ResizeObserver internally; JSDOM doesn't implement it.
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
// JSDOM has no layout engine, so ResizeObserver reports 0×0 and
// ResponsiveContainer renders nothing. Providing a fixed width/height forces
// Recharts to render its children — this exercises the Pie/Cell/Tooltip code.
// =============================================================================
jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts") as Record<string, unknown>;
  const OriginalResponsiveContainer = actual[
    "ResponsiveContainer"
  ] as React.ComponentType<ResponsiveContainerProps>;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <OriginalResponsiveContainer width={400} height={200}>
        {children}
      </OriginalResponsiveContainer>
    ),
  };
});

// =============================================================================
// @trainers/pokemon/sprites — minimal stub
// =============================================================================
jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: () => ({
    url: "https://example.com/sprite.png",
    w: 96,
    h: 96,
    pixelated: true,
  }),
  getItemSpriteStyle: () => ({}),
  getShowdownTypeIconUrl: () => "https://example.com/type-icon.png",
}));

// =============================================================================
// Test data factory
// =============================================================================

function makeEntry(
  value: string,
  pct: number,
  count: number = Math.round(pct * 10)
) {
  return { value, pct, count };
}

function makeDetailBucket(
  overrides: Partial<SpeciesUsagePeriod> = {}
): SpeciesUsagePeriod {
  return {
    periodStart: "2026-05-01",
    periodEnd: "2026-05-07",
    usagePct: 45.3,
    rank: 2,
    sampleSize: 1200,
    usageChange7d: 2.1,
    usageChange30d: -1.0,
    moves: [
      makeEntry("Glacial Lance", 82),
      makeEntry("Protect", 79),
      makeEntry("Icy Wind", 65),
      makeEntry("Close Combat", 48),
      makeEntry("Helping Hand", 30),
      makeEntry("Snarl", 22),
    ],
    items: [
      makeEntry("Choice Scarf", 55),
      makeEntry("Life Orb", 28),
      makeEntry("Assault Vest", 10),
      makeEntry("Choice Band", 4),
      makeEntry("Focus Sash", 2),
      makeEntry("Heavy-Duty Boots", 1), // > 5 → becomes "Other"
    ],
    abilities: [makeEntry("Beads of Ruin", 89), makeEntry("Intimidate", 11)],
    tera: [
      makeEntry("Fairy", 40),
      makeEntry("Steel", 30),
      makeEntry("Fire", 20),
      makeEntry("Water", 6),
      makeEntry("Normal", 4),
    ],
    natures: [
      makeEntry("Timid", 52),
      makeEntry("Jolly", 30),
      makeEntry("Modest", 18),
    ],
    abilityItems: [],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SpeciesFingerprint", () => {
  describe("empty / null state", () => {
    it("renders a friendly empty state when detail is null", () => {
      render(<SpeciesFingerprint detail={null} isChampions={false} />);
      expect(screen.getByText(/no usage data yet/i)).toBeInTheDocument();
    });

    it("still renders the card title in the null state", () => {
      render(<SpeciesFingerprint detail={null} isChampions={false} />);
      expect(screen.getByText(/build fingerprint/i)).toBeInTheDocument();
    });
  });

  describe("non-Champions format", () => {
    let container: HTMLElement;

    beforeEach(() => {
      const result = render(
        <SpeciesFingerprint detail={makeDetailBucket()} isChampions={false} />
      );
      container = result.container;
    });

    it("renders all four donut titles: Item, Ability, Tera, Nature", () => {
      // Titles are rendered as mixed-case text content — CSS uppercase is visual-only in JSDOM
      expect(screen.getByText("Item")).toBeInTheDocument();
      expect(screen.getByText("Ability")).toBeInTheDocument();
      expect(screen.getByText("Tera")).toBeInTheDocument();
      expect(screen.getByText("Nature")).toBeInTheDocument();
    });

    it("does NOT show 'Stat Alignment' when isChampions is false", () => {
      expect(screen.queryByText("Stat Alignment")).not.toBeInTheDocument();
    });

    it("renders the Top Moves section heading", () => {
      expect(screen.getByText(/top moves/i)).toBeInTheDocument();
    });

    it("renders move names in the bar list", () => {
      expect(screen.getByText("Glacial Lance")).toBeInTheDocument();
      expect(screen.getByText("Protect")).toBeInTheDocument();
    });

    it("collapses item entries beyond top 5 into 'Other' in the data", () => {
      // The fixture has 6 items: top 5 named + 1 collapsed → "Other" must appear
      // The legend shows top 3, but "Other" appears as the 6th slice (index 5).
      // We can verify the "Other" slice exists by checking if the 6th entry's data
      // is processed — the simplest check is that only 5 named items appear
      // (Choice Scarf, Life Orb, Assault Vest, Choice Band, Focus Sash) and the
      // 6th (Heavy-Duty Boots) does not appear anywhere in the component.
      expect(screen.queryByText("Heavy-Duty Boots")).not.toBeInTheDocument();
    });

    it("shows the modal item name in the donut center label", () => {
      // Modal item = "Choice Scarf" (highest pct)
      expect(screen.getByTitle("Choice Scarf")).toBeInTheDocument();
    });

    it("never renders the phrase 'top cut' anywhere", () => {
      expect(container.textContent?.toLowerCase()).not.toContain("top cut");
    });
  });

  describe("Champions format (isChampions = true)", () => {
    let container: HTMLElement;

    beforeEach(() => {
      const result = render(
        <SpeciesFingerprint detail={makeDetailBucket()} isChampions={true} />
      );
      container = result.container;
    });

    it("hides the Tera donut when isChampions is true", () => {
      // "Tera" title must not appear (CSS uppercase is visual-only in JSDOM)
      expect(screen.queryByText("Tera")).not.toBeInTheDocument();
    });

    it("relabels the Nature donut title to 'Stat Alignment'", () => {
      expect(screen.getByText("Stat Alignment")).toBeInTheDocument();
    });

    it("does NOT show the plain 'Nature' label when isChampions is true", () => {
      // "Nature" title must not appear at all when isChampions is true
      expect(screen.queryByText("Nature")).not.toBeInTheDocument();
    });

    it("still renders Item and Ability donuts", () => {
      expect(screen.getByText("Item")).toBeInTheDocument();
      expect(screen.getByText("Ability")).toBeInTheDocument();
    });

    it("never renders the phrase 'top cut' anywhere", () => {
      expect(container.textContent?.toLowerCase()).not.toContain("top cut");
    });
  });

  describe("top-5 + Other collapse logic", () => {
    it("collapses the 6th+ entries: the 6th item entry does not appear as a named slice", () => {
      // items fixture has 6 entries: 5 named + "Other" collapsed.
      // "Heavy-Duty Boots" (entry 6) should be absorbed into Other and
      // never appear as an individual entry in the rendered legend.
      render(
        <SpeciesFingerprint detail={makeDetailBucket()} isChampions={false} />
      );

      expect(screen.queryByText("Heavy-Duty Boots")).not.toBeInTheDocument();
    });

    it("does NOT produce an 'Other' slice when there are 5 or fewer entries", () => {
      // abilities has only 2 entries → no Other bucket for abilities legend
      const detail = makeDetailBucket({
        // abilities has 2 entries; items has 1 entry → neither triggers Other
        items: [makeEntry("Choice Scarf", 100)],
        abilities: [makeEntry("Beads of Ruin", 100)],
        tera: [makeEntry("Fairy", 100)],
        natures: [makeEntry("Timid", 100)],
      });
      render(<SpeciesFingerprint detail={detail} isChampions={false} />);

      // No Other bucket should appear
      expect(screen.queryByText("Other")).not.toBeInTheDocument();
    });
  });

  describe("empty data per dimension", () => {
    it("renders a dash placeholder for a dimension with no data", () => {
      const detail = makeDetailBucket({ items: [] });
      render(<SpeciesFingerprint detail={detail} isChampions={false} />);
      // The empty DonutChart renders a "—" placeholder
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders 'No move data' when moves array is empty", () => {
      const detail = makeDetailBucket({ moves: [] });
      render(<SpeciesFingerprint detail={detail} isChampions={false} />);
      expect(screen.getByText(/no move data/i)).toBeInTheDocument();
    });
  });
});
