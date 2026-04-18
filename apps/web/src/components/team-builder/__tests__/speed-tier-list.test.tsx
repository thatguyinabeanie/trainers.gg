import { describe, it, expect } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import React from "react";

import {
  type SpeedTier,
  type SpeedTierMon,
  SpeedTierList,
} from "../speed-tier-list";

// =============================================================================
// Factories
// =============================================================================

function mon(overrides: Partial<SpeedTierMon> = {}): SpeedTierMon {
  return {
    id: "x",
    name: "Pikachu",
    isYours: false,
    isSelected: false,
    // Stat columns — use predictable values for column-render assertions.
    baseSpeed: 90,
    statMin: 81,
    statMaxNeutral: 152,
    statMaxPositive: 167,
    ...overrides,
  };
}

// Tiers sorted descending — the full meta is always shown flat.
function makeTiers(): SpeedTier[] {
  return [
    {
      speed: 200,
      mons: [mon({ id: "a", name: "Iron Bundle", baseSpeed: 136 })],
    },
    {
      speed: 150,
      mons: [
        mon({
          id: "b",
          name: "Garchomp",
          isYours: true,
          isSelected: true,
          baseSpeed: 102,
        }),
        mon({ id: "c", name: "Volcarona", baseSpeed: 100 }),
      ],
    },
    {
      speed: 80,
      mons: [mon({ id: "d", name: "Incineroar", baseSpeed: 60 })],
    },
  ];
}

// =============================================================================
// Tests
// =============================================================================

describe("SpeedTierList — always-on layout", () => {
  it("renders all tiers without any neighbor limit", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    // Every tier in the dataset is always visible.
    expect(screen.getByTestId("tier-200")).toBeInTheDocument();
    expect(screen.getByTestId("tier-150")).toBeInTheDocument();
    expect(screen.getByTestId("tier-80")).toBeInTheDocument();
  });

  it("renders the 5-column table header: BASE, POKÉMON, MIN, NEU, MAX", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    const header = screen.getByTestId("speed-table-header");
    expect(within(header).getByText(/base/i)).toBeInTheDocument();
    expect(within(header).getByText(/pokémon/i)).toBeInTheDocument();
    expect(within(header).getByText(/min/i)).toBeInTheDocument();
    expect(within(header).getByText(/neu/i)).toBeInTheDocument();
    expect(within(header).getByText(/max/i)).toBeInTheDocument();
  });

  it("renders stat columns (min / neutral / positive) for each mon", () => {
    const tiers: SpeedTier[] = [
      {
        speed: 120,
        mons: [
          mon({
            id: "floette",
            name: "Floette",
            isYours: true,
            isSelected: true,
            baseSpeed: 100,
            statMin: 76,
            statMaxNeutral: 152,
            statMaxPositive: 167,
          }),
        ],
      },
    ];

    render(<SpeedTierList tiers={tiers} selectedSpeed={120} />);

    expect(screen.getByTestId("stat-min-floette")).toHaveTextContent("76");
    expect(screen.getByTestId("stat-neutral-floette")).toHaveTextContent("152");
    expect(screen.getByTestId("stat-positive-floette")).toHaveTextContent(
      "167"
    );
  });
});

describe("SpeedTierList — grouping", () => {
  it("renders one row per group, regardless of mon count", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    expect(screen.getByTestId("tier-200")).toBeInTheDocument();
    expect(screen.getByTestId("tier-150")).toBeInTheDocument();
    expect(screen.getByTestId("tier-80")).toBeInTheDocument();
  });

  it("stacks mons that share a speed inside the same row", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    const yourTierRow = screen.getByTestId("tier-150");
    expect(within(yourTierRow).getByText("Garchomp")).toBeInTheDocument();
    expect(within(yourTierRow).getByText("Volcarona")).toBeInTheDocument();
  });

  it("shows the base speed from the first mon in each group", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    // Iron Bundle tier — baseSpeed 136 should appear in the BASE column.
    const bundleTier = screen.getByTestId("tier-200");
    expect(within(bundleTier).getByText("136")).toBeInTheDocument();
  });
});

describe("SpeedTierList — highlights", () => {
  it("highlights the selected mon's tier", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    expect(screen.getByTestId("tier-150")).toHaveAttribute(
      "data-your-tier",
      "true"
    );
    // Faster / slower tiers should not get the highlight.
    expect(screen.getByTestId("tier-200")).toHaveAttribute(
      "data-your-tier",
      "false"
    );
    expect(screen.getByTestId("tier-80")).toHaveAttribute(
      "data-your-tier",
      "false"
    );
  });

  it("renders a tie badge on opponents in the selected mon's tier when supplied", () => {
    const tiers: SpeedTier[] = [
      {
        speed: 150,
        mons: [
          mon({ id: "you", name: "Garchomp", isYours: true, isSelected: true }),
          mon({ id: "opp", name: "Volcarona", badge: "tie" }),
        ],
      },
    ];

    render(<SpeedTierList tiers={tiers} selectedSpeed={150} />);

    const opponent = screen.getByTestId("mon-opp");
    // Badge values are mapped through BADGE_LABELS — "tie" renders as "Tie".
    expect(within(opponent).getByText("Tie")).toBeInTheDocument();
  });
});

describe("SpeedTierList — hint labels removed", () => {
  it("does NOT render ↑ Faster / ↓ Slower hint row (removed)", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    // Hint row was removed — the list is a clean flat table.
    expect(screen.queryByText("↑ Faster")).not.toBeInTheDocument();
    expect(screen.queryByText("↓ Slower")).not.toBeInTheDocument();
  });

  it("does not render separate per-section labels (faster/your-tier/slower) — flat list only", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    // These old section headers no longer exist — the list is flat.
    expect(screen.queryByText("→ Your tier")).not.toBeInTheDocument();
    expect(screen.queryByText("Same priority")).not.toBeInTheDocument();
  });

  it("header and body rows share the same grid-cols class (TIER_GRID constant)", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    // data-tier-grid is applied to both the header <div> and each MonRow <div>.
    const tieredRows = document.querySelectorAll("[data-tier-grid]");
    expect(tieredRows.length).toBeGreaterThanOrEqual(2);

    const gridClasses = Array.from(tieredRows).map((el) => {
      const match = el.className.match(/grid-cols-\S+/);
      return match ? match[0] : null;
    });

    const unique = new Set(gridClasses.filter(Boolean));
    expect(unique.size).toBe(1);
  });
});
