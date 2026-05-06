"use client";

/**
 * Tests for the CalcColumn component.
 *
 * Critical regression: an empty row's CalcColumn must NOT render any calc
 * results — gating on `pokemon !== null` prevents the leak.
 *
 * Per-row architecture: every CalcColumn calls
 * `calc.computeForwardOutputsForRow(pokemon)` to get its own 4 outputs against
 * the shared defender. This test mocks that function so each test can supply
 * the outputs that should appear for `makePokemon()`.
 *
 * Additional coverage:
 *   - OHKO / 2HKO / 3HKO labels from getDisplayRangeAndKoTier
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

type RowOutputs = readonly (null | {
  minPercent: number;
  maxPercent: number;
})[];

const mockCalcContext: {
  calcEnabled: boolean;
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  weather: string;
  inferredWeather: string;
  // Per-row outputs returned by computeForwardOutputsForRow(pokemon). The mock
  // ignores the pokemon arg and returns these 4 outputs for any non-null row,
  // and 4 nulls for an empty row — matching the engine's contract.
  rowOutputs: RowOutputs;
  computeForwardOutputsForRow: (
    rowPokemon: Tables<"pokemon"> | null
  ) => RowOutputs;
  field: { foesAlive: number; allyAlive: boolean };
} = {
  calcEnabled: true,
  defenderSpecies: "Garchomp",
  defenderAbility: "",
  defenderItem: "",
  defenderNature: "",
  weather: "",
  inferredWeather: "",
  rowOutputs: [{ minPercent: 24.7, maxPercent: 29.8 }, null, null, null],
  computeForwardOutputsForRow: (rowPokemon) =>
    rowPokemon === null ? [null, null, null, null] : mockCalcContext.rowOutputs,
  field: { foesAlive: 2, allyAlive: true },
};

const mockGetDisplayRangeAndKoTier = jest.fn(() => ({
  spreadApplied: false,
  displayMin: 25,
  displayMax: 30,
  koTier: "4" as string | null,
}));

const mockGetMoveEffectiveness = jest.fn().mockReturnValue(1);
const mockGetMoveTargetInfo = jest
  .fn()
  .mockReturnValue({ isSpread: false, kind: "single-foe" });
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
  getMoveEffectiveness: (...args: unknown[]) =>
    mockGetMoveEffectiveness(...args),
}));

jest.mock("../calc/move-target-info", () => ({
  getMoveTargetInfo: (...args: unknown[]) => mockGetMoveTargetInfo(...args),
}));

jest.mock("../lanes/calc-display-helpers", () => ({
  getDisplayRangeAndKoTier: (args: unknown) =>
    mockGetDisplayRangeAndKoTier(args),
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

function makePokemon(
  overrides: Partial<Tables<"pokemon">> = {}
): Tables<"pokemon"> {
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
  mockGetDisplayRangeAndKoTier.mockReturnValue({
    spreadApplied: false,
    displayMin: 25,
    displayMax: 30,
    koTier: "4",
  });
  mockGetMoveEffectiveness.mockReturnValue(1);
  mockGetMoveTargetInfo.mockReturnValue({
    isSpread: false,
    kind: "single-foe",
  });
  mockGetMoveData.mockReturnValue({
    type: "Fairy",
    category: "Special",
    basePower: 80,
    accuracy: 100,
  });
  mockCalcContext.calcEnabled = true;
  mockCalcContext.defenderSpecies = "Garchomp";
  mockCalcContext.weather = "";
  mockCalcContext.inferredWeather = "";
  mockCalcContext.rowOutputs = [
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
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 24.7,
      displayMax: 29.8,
      koTier: "4",
    });
    render(<CalcColumn pokemon={makePokemon()} />);
    // Slot 0: Dazzling Gleam + output → real KO data renders
    expect(screen.getByText(/24\.7.*29\.8%/)).toBeInTheDocument();
  });

  it("does NOT show calc results when pokemon is null, even though moveCalcOutputs has data", () => {
    // The active pokemon's outputs are still in the context (slot 0 = 24.7-29.8%).
    // An empty row must not display them.
    render(<CalcColumn pokemon={null} />);
    expect(screen.queryByText(/24\.7.*29\.8%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4HKO\+/)).not.toBeInTheDocument();
  });

  it("renders the CALC header and 4 placeholder rows in ghost mode", () => {
    const { container } = render(<CalcColumn pokemon={null} />);
    expect(screen.getByText("CALC")).toBeInTheDocument();
    expect(container.querySelectorAll(".calc-col-row")).toHaveLength(4);
  });

  it("does not show calc results for slots whose moveName is null on a real pokemon", () => {
    // Pokemon has only move1 set; slots 2-4 must not leak any calc data
    render(<CalcColumn pokemon={makePokemon()} />);
    // Only slot 0 has a result → exactly one "4HKO+" badge
    expect(screen.getAllByText(/4HKO\+/)).toHaveLength(1);
  });
});

// =============================================================================
// Tests — KO tier labels
// =============================================================================

describe("CalcColumn — KO tier labels", () => {
  it("renders 'OHKO' label when koTier is '1'", () => {
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 110,
      displayMax: 120,
      koTier: "1",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 110, maxPercent: 120 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon()} />);
    expect(screen.getByText("OHKO")).toBeInTheDocument();
  });

  it("renders '2HKO' label when koTier is '2'", () => {
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 45,
      displayMax: 55,
      koTier: "2",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 45, maxPercent: 55 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon()} />);
    expect(screen.getByText("2HKO")).toBeInTheDocument();
  });

  it("renders '3HKO' label when koTier is '3'", () => {
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 30,
      displayMax: 40,
      koTier: "3",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 30, maxPercent: 40 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon()} />);
    expect(screen.getByText("3HKO")).toBeInTheDocument();
  });

  it("renders '4HKO+' label when koTier is '4'", () => {
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 25,
      displayMax: 30,
      koTier: "4",
    });
    render(<CalcColumn pokemon={makePokemon()} />);
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
    mockCalcContext.rowOutputs = [
      { minPercent: 100, maxPercent: 133 },
      null,
      null,
      null,
    ];
    mockCalcContext.field = { foesAlive: 2, allyAlive: false };
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: true,
      displayMin: 75.0,
      displayMax: 99.8,
      koTier: "2",
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} />);
    // 100 * 0.75 = 75.0, 133 * 0.75 = 99.8
    expect(screen.getByText(/75\.0.*99\.8%/)).toBeInTheDocument();
  });

  it("does NOT apply spread reduction for all-foes move when foesAlive is 1", () => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind: "all-foes" });
    mockCalcContext.rowOutputs = [
      { minPercent: 100, maxPercent: 133 },
      null,
      null,
      null,
    ];
    mockCalcContext.field = { foesAlive: 1, allyAlive: false };
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 100.0,
      displayMax: 133.0,
      koTier: "1",
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} />);
    // Raw values displayed — no reduction
    expect(screen.getByText(/100\.0.*133\.0%/)).toBeInTheDocument();
  });

  it("shows 'spread' badge when spreadApplied", () => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind: "all-foes" });
    mockCalcContext.rowOutputs = [
      { minPercent: 80, maxPercent: 100 },
      null,
      null,
      null,
    ];
    mockCalcContext.field = { foesAlive: 2, allyAlive: false };
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: true,
      displayMin: 60.0,
      displayMax: 75.0,
      koTier: "2",
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} />);
    expect(screen.getByTitle("Spread −25%")).toBeInTheDocument();
  });

  it("does NOT show 'spread' badge for non-spread move", () => {
    mockGetMoveTargetInfo.mockReturnValue({
      isSpread: false,
      kind: "single-foe",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 80, maxPercent: 100 },
      null,
      null,
      null,
    ];
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 80.0,
      displayMax: 100.0,
      koTier: "2",
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} />);
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
  ] as const)("%s", (_label, kind, foesAlive, allyAlive, expectedSpread) => {
    mockGetMoveTargetInfo.mockReturnValue({ isSpread: true, kind });
    mockCalcContext.rowOutputs = [
      { minPercent: 80, maxPercent: 100 },
      null,
      null,
      null,
    ];
    mockCalcContext.field = { foesAlive, allyAlive };
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: expectedSpread,
      displayMin: expectedSpread ? 60.0 : 80.0,
      displayMax: expectedSpread ? 75.0 : 100.0,
      koTier: "2",
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} />);
    if (expectedSpread) {
      expect(screen.getByTitle("Spread −25%")).toBeInTheDocument();
    } else {
      expect(screen.queryByTitle("Spread −25%")).not.toBeInTheDocument();
    }
  });
});

// =============================================================================
// Tests — effectiveness badges
// =============================================================================

describe("CalcColumn — type effectiveness badges", () => {
  it("renders '2×' badge when getMoveEffectiveness returns 2", () => {
    mockGetMoveEffectiveness.mockReturnValue(2);
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 110,
      displayMax: 130,
      koTier: "1",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 110, maxPercent: 130 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} />);
    expect(screen.getByTitle("2× effectiveness")).toBeInTheDocument();
  });

  it("renders '0.5×' badge when getMoveEffectiveness returns 0.5", () => {
    mockGetMoveEffectiveness.mockReturnValue(0.5);
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 30,
      displayMax: 40,
      koTier: "3",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 30, maxPercent: 40 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} />);
    expect(screen.getByTitle("0.5× effectiveness")).toBeInTheDocument();
  });

  it("renders '0×' immune badge when getMoveEffectiveness returns 0", () => {
    mockGetMoveEffectiveness.mockReturnValue(0);
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 45,
      displayMax: 55,
      koTier: "2",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 45, maxPercent: 55 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Earthquake" })} />);
    expect(screen.getByTitle("Immune")).toBeInTheDocument();
  });

  it("does NOT render an effectiveness badge when eff === 1", () => {
    mockGetMoveEffectiveness.mockReturnValue(1);
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 45,
      displayMax: 55,
      koTier: "2",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 45, maxPercent: 55 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} />);
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
    mockCalcContext.rowOutputs = [null, null, null, null];
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 0,
      displayMax: 0,
      koTier: null,
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} />);
    expect(screen.getByText("— pick target —")).toBeInTheDocument();
  });

  it("shows '— unavailable —' when calc returned null but defender is picked", () => {
    mockCalcContext.defenderSpecies = "Garchomp";
    mockCalcContext.rowOutputs = [null, null, null, null];
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 0,
      displayMax: 0,
      koTier: null,
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} />);
    expect(screen.getByText("— unavailable —")).toBeInTheDocument();
  });

  it("shows muted '—' for an empty move slot (move1=null)", () => {
    mockCalcContext.rowOutputs = [null, null, null, null];
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 0,
      displayMax: 0,
      koTier: null,
    });
    render(<CalcColumn pokemon={makePokemon({ move1: null })} />);
    // All 4 rows should show the muted placeholder
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it("shows muted '—' for all rows when calcEnabled is false", () => {
    mockCalcContext.calcEnabled = false;
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 0,
      displayMax: 0,
      koTier: null,
    });
    render(<CalcColumn pokemon={makePokemon()} />);
    // No KO tiers rendered when calc is disabled
    expect(screen.queryByText(/OHKO|2HKO|3HKO|4HKO\+/)).not.toBeInTheDocument();
  });

  it("suppresses calc when move category is Status", () => {
    mockGetMoveData.mockReturnValue({ type: "Normal", category: "Status" });
    mockCalcContext.rowOutputs = [
      { minPercent: 50, maxPercent: 80 },
      null,
      null,
      null,
    ];
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 0,
      displayMax: 0,
      koTier: null,
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Will-O-Wisp" })} />);
    // Status moves never show calc results
    expect(screen.queryByText(/OHKO|2HKO|3HKO|4HKO\+/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Tests — every-row rendering (per-row architecture)
//
// CalcColumn now calls computeForwardOutputsForRow(pokemon) rather than
// reading a single workspace-keyed moveCalcOutputs. Every non-empty row
// renders its own outputs whenever calc is enabled — there's no longer an
// "active row only" gate. Empty slots (pokemon === null) still render only
// neutral em-dashes so the placeholder column never leaks sibling data.
// =============================================================================

describe("CalcColumn — every-row rendering", () => {
  it("renders calc results for any non-empty row when calc is enabled", () => {
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 24.7,
      displayMax: 29.8,
      koTier: "4",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 24.7, maxPercent: 29.8 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={makePokemon()} />);
    expect(screen.getByText("4HKO+")).toBeInTheDocument();
    expect(screen.getByText(/24\.7.*29\.8%/)).toBeInTheDocument();
  });

  it("renders only neutral em-dashes for an empty row, even when rowOutputs has data", () => {
    // computeForwardOutputsForRow returns 4 nulls for pokemon=null, so an
    // empty placeholder column can never show a sibling's calc data.
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 24.7,
      displayMax: 29.8,
      koTier: "4",
    });
    mockCalcContext.rowOutputs = [
      { minPercent: 24.7, maxPercent: 29.8 },
      null,
      null,
      null,
    ];
    render(<CalcColumn pokemon={null} />);
    expect(screen.queryByText("4HKO+")).not.toBeInTheDocument();
    expect(screen.queryByText(/24\.7.*29\.8%/)).not.toBeInTheDocument();
    expect(screen.queryByText("— pick target —")).not.toBeInTheDocument();
    expect(screen.queryByText("— unavailable —")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("shows '— pick target —' on a non-empty row when defender is unset", () => {
    mockCalcContext.defenderSpecies = "";
    mockCalcContext.rowOutputs = [null, null, null, null];
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 0,
      displayMax: 0,
      koTier: null,
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} />);
    expect(screen.getByText("— pick target —")).toBeInTheDocument();
  });

  it("shows '— unavailable —' on a non-empty row when defender is set but output is null", () => {
    mockCalcContext.defenderSpecies = "Garchomp";
    mockCalcContext.rowOutputs = [null, null, null, null];
    mockGetDisplayRangeAndKoTier.mockReturnValue({
      spreadApplied: false,
      displayMin: 0,
      displayMax: 0,
      koTier: null,
    });
    render(<CalcColumn pokemon={makePokemon({ move1: "Flamethrower" })} />);
    expect(screen.getByText("— unavailable —")).toBeInTheDocument();
  });
});
