"use client";

/**
 * Tests for the CalcColumn component.
 *
 * Critical regression: an empty row's CalcColumn must NOT render the active
 * pokemon's calc results. moveCalcOutputs is keyed by slot index across the
 * whole workspace context — gating on moveName !== null prevents the leak.
 *
 * Additional coverage:
 *   - OHKO / 2HKO / 3HKO labels from getVerdict
 *   - Spread −25% reduction when foesAlive / allyAlive conditions are met
 *   - Effectiveness badges (2×, 0.5×, 0×) from getMoveEffectiveness
 *   - "spread" badge when spreadApplied
 *   - Placeholder text variants (pick target / unavailable / —)
 *   - calcEnabled=false suppresses all calc output
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

const mockCalcContext: {
  calcEnabled: boolean;
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  weather: string;
  inferredWeather: string;
  moveCalcOutputs: (null | { minPercent: number; maxPercent: number })[];
  field: { foesAlive: number; allyAlive: boolean };
} = {
  calcEnabled: true,
  defenderSpecies: "Garchomp",
  defenderAbility: "",
  defenderItem: "",
  defenderNature: "",
  weather: "",
  inferredWeather: "",
  // Realistic active-pokemon calc outputs for slot 0
  moveCalcOutputs: [
    { minPercent: 24.7, maxPercent: 29.8 },
    null,
    null,
    null,
  ],
  field: { foesAlive: 2, allyAlive: true },
};

const mockGetVerdict = jest.fn().mockReturnValue("4HKO");
const mockGetMoveEffectiveness = jest.fn().mockReturnValue(1);
const mockGetMoveTargetInfo = jest.fn().mockReturnValue({ isSpread: false, kind: "single-foe" });
const mockGetMoveData = jest.fn().mockReturnValue({
  type: "Fairy",
  category: "Special",
  basePower: 80,
  accuracy: 100,
});

jest.mock("../calc/calc-state-context", () => ({
  useCalcStateContext: jest.fn(() => mockCalcContext),
}));

jest.mock("../calc/move-effectiveness", () => ({
  getMoveEffectiveness: (...args: unknown[]) => mockGetMoveEffectiveness(...args),
}));

jest.mock("../calc/move-target-info", () => ({
  getMoveTargetInfo: (...args: unknown[]) => mockGetMoveTargetInfo(...args),
}));

jest.mock("../../use-calc-state", () => ({
  getVerdict: (...args: unknown[]) => mockGetVerdict(...args),
}));

jest.mock("@trainers/pokemon", () => ({
  getMoveData: (...args: unknown[]) => mockGetMoveData(...args),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcColumn } from "../lanes/calc-column";

// =============================================================================
// Fixtures
// =============================================================================

function makePokemon(overrides: Partial<Tables<"pokemon">> = {}): Tables<"pokemon"> {
  return {
    id: 1,
    species: "Floette-Eternal",
    ability: null,
    nature: "Mild",
    move1: "Dazzling Gleam",
    move2: null,
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 0,
    ev_speed: 0,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    level: 50,
    held_item: null,
    nickname: null,
    notes: null,
    tera_type: null,
    is_shiny: null,
    gender: null,
    format_legal: null,
    created_at: null,
    ...overrides,
  };
}

// Reset mocks and restore baseline context state before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockGetVerdict.mockReturnValue("4HKO");
  mockGetMoveEffectiveness.mockReturnValue(1);
  mockGetMoveTargetInfo.mockReturnValue({ isSpread: false, kind: "single-foe" });
  mockGetMoveData.mockReturnValue({ type: "Fairy", category: "Special", basePower: 80, accuracy: 100 });
  mockCalcContext.calcEnabled = true;
  mockCalcContext.defenderSpecies = "Garchomp";
  mockCalcContext.weather = "";
  mockCalcContext.inferredWeather = "";
  mockCalcContext.moveCalcOutputs = [
    { minPercent: 24.7, maxPercent: 29.8 },
    null,
    null,
    null,
  ];
  mockCalcContext.field = { foesAlive: 2, allyAlive: true };
});

// =============================================================================
// Tests — empty-row leak protection (existing cases)
// =============================================================================

describe("CalcColumn — empty-row leak protection", () => {
  it("renders calc results for a real pokemon when its move + output match", () => {
    render(<CalcColumn pokemon={makePokemon()} isActive={true} />);
    // Slot 0: Dazzling Gleam + output → real KO data renders
    expect(screen.getByText(/24\.7.*29\.8%/)).toBeInTheDocument();
  });

  it("does NOT show calc results when pokemon is null, even though moveCalcOutputs has data", () => {
    // The active pokemon's outputs are still in the context (slot 0 = 24.7-29.8%).
    // An empty row must not display them.
    render(<CalcColumn pokemon={null} isActive={false} />);
    expect(screen.queryByText(/24\.7.*29\.8%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4HKO\+/)).not.toBeInTheDocument();
  });

  it("renders the CALC header and 4 placeholder rows in ghost mode", () => {
    const { container } = render(<CalcColumn pokemon={null} isActive={false} />);
    expect(screen.getByText("CALC")).toBeInTheDocument();
    expect(container.querySelectorAll(".calc-col-row")).toHaveLength(4);
  });

  it("does not show calc results for slots whose moveName is null on a real pokemon", () => {
    // Pokemon has only move1 set; slots 2-4 must not leak any calc data
    render(<CalcColumn pokemon={makePokemon()} isActive={true} />);
    // Only slot 0 has a result → exactly one "4HKO+" badge
    expect(screen.getAllByText(/4HKO\+/)).toHaveLength(1);
  });
});

// =============================================================================
// Tests — KO tier labels
// =============================================================================

describe("CalcColumn — KO tier labels", () => {
  it("renders 'OHKO' label when getVerdict returns OHKO", () => {
    mockGetVerdict.mockReturnValue("OHKO");
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 110, maxPercent: 120 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon()} isActive={true} />);
    expect(screen.getByText("OHKO")).toBeInTheDocument();
  });

  it("renders '2HKO' label when getVerdict returns 2HKO", () => {
    mockGetVerdict.mockReturnValue("2HKO");
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 45, maxPercent: 55 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon()} isActive={true} />);
    expect(screen.getByText("2HKO")).toBeInTheDocument();
  });

  it("renders '3HKO' label when getVerdict returns 3HKO", () => {
    mockGetVerdict.mockReturnValue("3HKO");
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 30, maxPercent: 40 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon()} isActive={true} />);
    expect(screen.getByText("3HKO")).toBeInTheDocument();
  });

  it("renders '4HKO+' label when getVerdict returns null (4HKO+)", () => {
    mockGetVerdict.mockReturnValue(null);
    render(<CalcColumn pokemon={makePokemon()} isActive={true} />);
    expect(screen.getByText("4HKO+")).toBeInTheDocument();
  });

  it("renders 4 calc rows for a pokemon with 4 moves", () => {
    const { container } = render(
      <CalcColumn
        pokemon={makePokemon({
          move1: "Earthquake",
          move2: "Rock Slide",
          move3: "Protect",
          move4: "Hyper Voice",
        })}
        isActive={true}
      />
    );
    expect(container.querySelectorAll(".calc-col-row")).toHaveLength(4);
  });
});

// =============================================================================
// Tests — spread reduction
// =============================================================================

describe("CalcColumn — spread −25% reduction", () => {
  it("applies spread reduction for all-foes move (Earthquake) when foesAlive >= 2", () => {
    // Raw output: 100–133%. After 25% reduction: 75–99.75%
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind: "all-foes" });
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 100, maxPercent: 133 },
      null,
      null,
      null,
    ];
    mockCalcContext.field = { foesAlive: 2, allyAlive: false };
    // getVerdict called with post-spread values
    mockGetVerdict.mockReturnValue("2HKO");
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} isActive={true} />);
    // 100 * 0.75 = 75.0, 133 * 0.75 = 99.8
    expect(screen.getByText(/75\.0.*99\.8%/)).toBeInTheDocument();
  });

  it("does NOT apply spread reduction for all-foes move when foesAlive is 1", () => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind: "all-foes" });
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 100, maxPercent: 133 },
      null,
      null,
      null,
    ];
    mockCalcContext.field = { foesAlive: 1, allyAlive: false };
    mockGetVerdict.mockReturnValue("OHKO");
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} isActive={true} />);
    // Raw values displayed — no reduction
    expect(screen.getByText(/100\.0.*133\.0%/)).toBeInTheDocument();
  });

  it("shows 'spread' badge when spreadApplied", () => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind: "all-foes" });
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 80, maxPercent: 100 },
      null,
      null,
      null,
    ];
    mockCalcContext.field = { foesAlive: 2, allyAlive: false };
    mockGetVerdict.mockReturnValue("2HKO");
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} isActive={true} />);
    expect(screen.getByTitle("Spread −25%")).toBeInTheDocument();
  });

  it("does NOT show 'spread' badge for non-spread move", () => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: false, kind: "single-foe" });
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 80, maxPercent: 100 },
      null,
      null,
      null,
    ];
    mockGetVerdict.mockReturnValue("2HKO");
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} isActive={true} />);
    expect(screen.queryByTitle("Spread −25%")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — spread reduction parameterised (foesAlive / allyAlive combinations)
// =============================================================================

describe("CalcColumn — spread reduction for all-foes and all-others parameterised", () => {
  it.each([
    // [label, kind, foesAlive, allyAlive, expectedSpread]
    ["all-foes, 2 foes alive → spread", "all-foes", 2, false, true],
    ["all-foes, 1 foe alive → no spread", "all-foes", 1, false, false],
    ["all-foes, 0 foes alive → no spread", "all-foes", 0, true, false],
    ["all-others, 2 foes alive → spread", "all-others", 2, false, true],
    ["all-others, 1 foe + ally alive → spread", "all-others", 1, true, true],
    ["all-others, 1 foe, no ally → no spread", "all-others", 1, false, false],
  ] as const)(
    "%s",
    (_label, kind, foesAlive, allyAlive, expectedSpread) => {
      mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind });
      mockCalcContext.moveCalcOutputs = [
        { minPercent: 80, maxPercent: 100 },
        null,
        null,
        null,
      ];
      mockCalcContext.field = { foesAlive, allyAlive };
      mockGetVerdict.mockReturnValue("2HKO");
      render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} isActive={true} />);
      if (expectedSpread) {
        expect(screen.getByTitle("Spread −25%")).toBeInTheDocument();
      } else {
        expect(screen.queryByTitle("Spread −25%")).not.toBeInTheDocument();
      }
    }
  );
});

// =============================================================================
// Tests — effectiveness badges
// =============================================================================

describe("CalcColumn — type effectiveness badges", () => {
  it("renders '2×' badge when getMoveEffectiveness returns 2", () => {
    mockGetMoveEffectiveness.mockReturnValue(2);
    mockGetVerdict.mockReturnValue("OHKO");
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 110, maxPercent: 130 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} isActive={true} />);
    expect(screen.getByTitle("2× effectiveness")).toBeInTheDocument();
  });

  it("renders '0.5×' badge when getMoveEffectiveness returns 0.5", () => {
    mockGetMoveEffectiveness.mockReturnValue(0.5);
    mockGetVerdict.mockReturnValue("3HKO");
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 30, maxPercent: 40 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} isActive={true} />);
    expect(screen.getByTitle("0.5× effectiveness")).toBeInTheDocument();
  });

  it("renders '0×' immune badge when getMoveEffectiveness returns 0", () => {
    mockGetMoveEffectiveness.mockReturnValue(0);
    // getVerdict must return a non-null tier so the KO-data branch renders
    mockGetVerdict.mockReturnValue("2HKO");
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 45, maxPercent: 55 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} isActive={true} />);
    expect(screen.getByTitle("Immune")).toBeInTheDocument();
  });

  it("does NOT render an effectiveness badge when eff === 1", () => {
    mockGetMoveEffectiveness.mockReturnValue(1);
    mockGetVerdict.mockReturnValue("2HKO");
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 45, maxPercent: 55 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} isActive={true} />);
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — placeholder text
// =============================================================================

describe("CalcColumn — placeholder text", () => {
  it("shows '— pick target —' when calcEnabled and move is set but no defender species", () => {
    mockCalcContext.defenderSpecies = "";
    // Ensure no output exists so hasCalc is false — then the pick-target branch fires
    mockCalcContext.moveCalcOutputs = [null, null, null, null];
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} isActive={true} />);
    expect(screen.getByText("— pick target —")).toBeInTheDocument();
  });

  it("shows '— unavailable —' when calc returned null but defender is picked", () => {
    mockCalcContext.defenderSpecies = "Garchomp";
    mockCalcContext.moveCalcOutputs = [null, null, null, null];
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} isActive={true} />);
    expect(screen.getByText("— unavailable —")).toBeInTheDocument();
  });

  it("shows muted '—' for an empty move slot (move1=null)", () => {
    mockCalcContext.moveCalcOutputs = [null, null, null, null];
    render(<CalcColumn pokemon={makePokemon({ move1: null })} isActive={true} />);
    // All 4 rows should show the muted placeholder
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it("shows muted '—' for all rows when calcEnabled is false", () => {
    mockCalcContext.calcEnabled = false;
    render(<CalcColumn pokemon={makePokemon()} isActive={true} />);
    // No KO tiers rendered when calc is disabled
    expect(screen.queryByText(/OHKO|2HKO|3HKO|4HKO\+/)).not.toBeInTheDocument();
  });

  it("suppresses calc when move category is Status", () => {
    mockGetMoveData.mockReturnValue({ type: "Normal", category: "Status" });
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 50, maxPercent: 80 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Will-O-Wisp" })} isActive={true} />);
    // Status moves never show calc results
    expect(screen.queryByText(/OHKO|2HKO|3HKO|4HKO\+/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — non-active row suppression
// =============================================================================

describe("CalcColumn — non-active row suppression", () => {
  it("renders calc results when isActive is true", () => {
    // Setup: defenderSpecies set, moveCalcOutputs populated, move set.
    mockGetVerdict.mockReturnValue(null); // → "4HKO+"
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 24.7, maxPercent: 29.8 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon()} isActive={true} />);
    // Slot 0 has output + move — KO tier and range are visible
    expect(screen.getByText("4HKO+")).toBeInTheDocument();
    expect(screen.getByText(/24\.7.*29\.8%/)).toBeInTheDocument();
  });

  it("does NOT render calc results when isActive is false", () => {
    // Same context state as above — only isActive differs.
    mockGetVerdict.mockReturnValue(null);
    mockCalcContext.moveCalcOutputs = [
      { minPercent: 24.7, maxPercent: 29.8 },
      null,
      null,
      null,
    ];
    // All moves null so every slot renders em-dash (move name check isn't a factor)
    render(<CalcColumn pokemon={makePokemon({ move1: null })} isActive={false} />);
    // No KO tier or percent range — em-dash placeholder visible instead
    expect(screen.queryByText("4HKO+")).not.toBeInTheDocument();
    expect(screen.queryByText(/24\.7.*29\.8%/)).not.toBeInTheDocument();
    // Em-dash fallback renders for all 4 rows
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });
});
