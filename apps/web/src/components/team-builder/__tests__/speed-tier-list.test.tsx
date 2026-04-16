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
    ...overrides,
  };
}

// Tiers are sorted descending — partition logic depends on speed comparison only,
// not on input order, so this fixture covers normal play.
function makeTiers(): SpeedTier[] {
  return [
    {
      speed: 200,
      mons: [mon({ id: "a", name: "Iron Bundle" })],
    },
    {
      speed: 150,
      mons: [
        mon({ id: "b", name: "Garchomp", isYours: true, isSelected: true }),
        mon({ id: "c", name: "Volcarona" }),
      ],
    },
    {
      speed: 80,
      mons: [mon({ id: "d", name: "Incineroar" })],
    },
  ];
}

// =============================================================================
// Tests
// =============================================================================

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
    expect(within(opponent).getByText("tie")).toBeInTheDocument();
  });
});

describe("SpeedTierList — collapsed neighborCount", () => {
  it("respects neighborCount when expandedAllMeta=false", () => {
    const tiers: SpeedTier[] = [
      { speed: 300, mons: [mon({ id: "a", name: "A" })] },
      { speed: 250, mons: [mon({ id: "b", name: "B" })] },
      { speed: 220, mons: [mon({ id: "c", name: "C" })] },
      { speed: 200, mons: [mon({ id: "d", name: "D" })] },
      {
        speed: 150,
        mons: [
          mon({ id: "you", name: "You", isYours: true, isSelected: true }),
        ],
      },
      { speed: 100, mons: [mon({ id: "e", name: "E" })] },
      { speed: 90, mons: [mon({ id: "f", name: "F" })] },
      { speed: 80, mons: [mon({ id: "g", name: "G" })] },
      { speed: 60, mons: [mon({ id: "h", name: "H" })] },
    ];

    render(
      <SpeedTierList
        tiers={tiers}
        selectedSpeed={150}
        neighborCount={2}
        expandedAllMeta={false}
      />
    );

    // 2 above + your tier + 2 below = 5 visible tiers.
    // The 2 closest above are 220 and 200 (not 300 and 250).
    expect(screen.queryByTestId("tier-300")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tier-250")).not.toBeInTheDocument();
    expect(screen.getByTestId("tier-220")).toBeInTheDocument();
    expect(screen.getByTestId("tier-200")).toBeInTheDocument();
    expect(screen.getByTestId("tier-150")).toBeInTheDocument();
    expect(screen.getByTestId("tier-100")).toBeInTheDocument();
    expect(screen.getByTestId("tier-90")).toBeInTheDocument();
    expect(screen.queryByTestId("tier-80")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tier-60")).not.toBeInTheDocument();
  });

  it("renders all tiers when expandedAllMeta=true", () => {
    const tiers: SpeedTier[] = [
      { speed: 300, mons: [mon({ id: "a", name: "A" })] },
      { speed: 200, mons: [mon({ id: "b", name: "B" })] },
      {
        speed: 150,
        mons: [
          mon({ id: "you", name: "You", isYours: true, isSelected: true }),
        ],
      },
      { speed: 100, mons: [mon({ id: "c", name: "C" })] },
      { speed: 60, mons: [mon({ id: "d", name: "D" })] },
    ];

    render(
      <SpeedTierList
        tiers={tiers}
        selectedSpeed={150}
        neighborCount={1}
        expandedAllMeta
      />
    );

    expect(screen.getByTestId("tier-300")).toBeInTheDocument();
    expect(screen.getByTestId("tier-200")).toBeInTheDocument();
    expect(screen.getByTestId("tier-150")).toBeInTheDocument();
    expect(screen.getByTestId("tier-100")).toBeInTheDocument();
    expect(screen.getByTestId("tier-60")).toBeInTheDocument();
  });
});

describe("SpeedTierList — section labels", () => {
  it("uses normal section labels in default play", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} />);

    expect(screen.getByText("↑ Faster than you")).toBeInTheDocument();
    expect(screen.getByText("→ Your tier")).toBeInTheDocument();
    expect(screen.getByText("↓ Slower than you")).toBeInTheDocument();
  });

  it("uses Trick-Room labels when trickRoom=true", () => {
    render(<SpeedTierList tiers={makeTiers()} selectedSpeed={150} trickRoom />);

    expect(screen.getByText("Moves later")).toBeInTheDocument();
    expect(screen.getByText("Same priority")).toBeInTheDocument();
    expect(screen.getByText("Moves first")).toBeInTheDocument();
  });
});
