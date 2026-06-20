"use client";

/**
 * Tests for CalcReverseColumn component.
 * Verifies: renders nothing without defender, renders "Incoming" label,
 * renders move rows with damage ranges, handles status moves.
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { type Tables } from "@trainers/supabase";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getMoveData: jest.fn((move: string) => {
    if (move === "Will-O-Wisp") return { type: "Fire", category: "Status" };
    if (move === "Thunderbolt")
      return { type: "Electric", category: "Special" };
    if (move === "Earthquake") return { type: "Ground", category: "Physical" };
    if (move === "Ice Beam") return { type: "Ice", category: "Special" };
    return { type: "Normal", category: "Physical" };
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock TypeSymbolIcon
jest.mock("../type-symbol-icon", () => ({
  TypeSymbolIcon: ({ type }: { type: string }) => (
    <span data-testid={`type-icon-${type}`}>{type}</span>
  ),
}));

// Mock calc-display-helpers
jest.mock("../lanes/calc-display-helpers", () => ({
  getDisplayRangeAndKoTier: jest.fn(({ hasCalc }) => ({
    spreadApplied: false,
    displayMin: hasCalc ? 45.2 : 0,
    displayMax: hasCalc ? 53.8 : 0,
    koTier: hasCalc ? "2" : null,
  })),
}));

// Mock useDefenderMoves
const mockEffectiveMoves = ["Thunderbolt", "Earthquake", "", ""];
jest.mock("../calc/use-defender-moves", () => ({
  useDefenderMoves: () => ({
    effectiveMoves: mockEffectiveMoves,
  }),
}));

// Mock useCalcStateContext
const mockCalcContext = {
  defenderSpecies: "Garchomp",
  defenderMoves: ["Thunderbolt", "Earthquake", "", ""],
  field: { foesAlive: 2, allyAlive: true },
  computeReverseOutputsForRow: jest.fn(() => [
    {
      minPercent: 45.2,
      maxPercent: 53.8,
      koChance: null,
      desc: "252 SpA Garchomp Thunderbolt vs. 0 HP / 4 SpD Pikachu: 45.2 - 53.8%",
    },
    {
      minPercent: 80.1,
      maxPercent: 95.0,
      koChance: 75,
      desc: "252 Atk Garchomp Earthquake vs. 0 HP / 0 Def Pikachu: 80.1 - 95.0%",
    },
    null,
    null,
  ]),
};
jest.mock("../calc/calc-state-context", () => ({
  useCalcStateContext: () => mockCalcContext,
}));

// Mock Tooltip components
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({
    children,
    render,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <div data-testid="tooltip-trigger">
      {render ? React.cloneElement(render, {}, children) : children}
    </div>
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcReverseColumn } from "../lanes/calc-reverse-card";

// =============================================================================
// Fixtures
// =============================================================================

function makePokemon(
  overrides?: Partial<Tables<"pokemon">>
): Tables<"pokemon"> {
  return {
    id: -1,
    species: "Pikachu",
    ability: "Static",
    move1: "Thunderbolt",
    move2: null,
    move3: null,
    move4: null,
    nature: "Timid",
    nickname: null,
    notes: null,
    held_item: null,
    tera_type: null,
    gender: null,
    is_shiny: false,
    level: 50,
    format_legal: null,
    created_at: "2024-01-01T00:00:00.000Z",
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 252,
    ev_special_defense: 4,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("CalcReverseColumn — no defender", () => {
  beforeEach(() => {
    mockCalcContext.defenderSpecies = "";
  });

  afterEach(() => {
    mockCalcContext.defenderSpecies = "Garchomp";
  });

  it("renders nothing when there is no defender", () => {
    const { container } = render(
      <CalcReverseColumn pokemon={makePokemon()} teammates={[]} />
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("CalcReverseColumn — vertical layout", () => {
  beforeEach(() => {
    mockCalcContext.defenderSpecies = "Garchomp";
  });

  it("renders 'Incoming' label", () => {
    render(<CalcReverseColumn pokemon={makePokemon()} teammates={[]} />);
    expect(screen.getByText("Incoming")).toBeInTheDocument();
  });

  it("renders move names for active moves", () => {
    render(<CalcReverseColumn pokemon={makePokemon()} teammates={[]} />);
    expect(screen.getByText("Thunderbolt")).toBeInTheDocument();
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
  });

  it("renders type icons for moves", () => {
    render(<CalcReverseColumn pokemon={makePokemon()} teammates={[]} />);
    expect(screen.getByTestId("type-icon-Electric")).toBeInTheDocument();
    expect(screen.getByTestId("type-icon-Ground")).toBeInTheDocument();
  });

  it("does not render when pokemon is null but calc runs", () => {
    mockCalcContext.computeReverseOutputsForRow.mockReturnValueOnce([
      null,
      null,
      null,
      null,
    ]);
    render(<CalcReverseColumn pokemon={null} teammates={[]} />);
    // Should still render the "Incoming" label (since defender exists)
    expect(screen.getByText("Incoming")).toBeInTheDocument();
  });
});

describe("CalcReverseColumn — status moves", () => {
  beforeEach(() => {
    mockCalcContext.defenderSpecies = "Garchomp";
    mockEffectiveMoves[0] = "Will-O-Wisp";
    mockEffectiveMoves[1] = "";
    mockEffectiveMoves[2] = "";
    mockEffectiveMoves[3] = "";
    mockCalcContext.computeReverseOutputsForRow.mockReturnValue([
      null,
      null,
      null,
      null,
    ]);
  });

  afterEach(() => {
    mockEffectiveMoves[0] = "Thunderbolt";
    mockEffectiveMoves[1] = "Earthquake";
  });

  it("renders status moves with a dash for damage", () => {
    render(<CalcReverseColumn pokemon={makePokemon()} teammates={[]} />);
    expect(screen.getByText("Will-O-Wisp")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
