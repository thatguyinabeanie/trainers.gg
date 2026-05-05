"use client";

/**
 * Behavioral tests for CalcDefenderMoves.
 *
 * The component renders 4 move tile cards with:
 * - Move name (or "+ Add move" for empty slots)
 * - Type icon for moves with type data
 * - BP label for damaging moves
 * - A dialog-based move picker triggered on click
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

const mockGetMoveData = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getMoveData: (...args: unknown[]) => mockGetMoveData(...args),
  };
});

jest.mock("@trainers/pokemon/sprites", () => ({
  getSpriteUrl: jest.fn(() => ""),
}));

// Dialog — render children inline (no actual dialog behavior)
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  DialogTrigger: ({ children, render: renderProp }: { children?: React.ReactNode; render?: React.ReactElement }) =>
    renderProp ? <>{renderProp}{children}</> : <>{children}</>,
}));

// TypeSymbolIcon — stub
jest.mock("../../type-symbol-icon", () => ({
  TypeSymbolIcon: ({ type }: { type: string }) => (
    <span data-testid={`type-icon-${type}`} />
  ),
}));

// MovePicker — stub
jest.mock("../pickers/move-picker", () => ({
  MovePicker: () => <div data-testid="move-picker" />,
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { CalcDefenderMoves } from "../calc/calc-defender-moves";

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMoveData.mockReturnValue(null);
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcDefenderMoves — tile rendering", () => {
  it("renders 4 move tile buttons", () => {
    render(
      <CalcDefenderMoves
        effectiveMoves={["", "", "", ""]}
        defenderSpecies=""
        format={undefined}
        onPick={jest.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
  });

  it("shows '+ Add move' for empty slots", () => {
    render(
      <CalcDefenderMoves
        effectiveMoves={["", "", "", ""]}
        defenderSpecies=""
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getAllByText("+ Add move")).toHaveLength(4);
  });

  it("renders move name for filled slots", () => {
    render(
      <CalcDefenderMoves
        effectiveMoves={["Earthquake", "Flamethrower", "", ""]}
        defenderSpecies="Garchomp"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByText("Earthquake")).toBeInTheDocument();
    expect(screen.getByText("Flamethrower")).toBeInTheDocument();
  });

  it("renders type icon when move has type data", () => {
    mockGetMoveData.mockImplementation((name: string) => {
      if (name === "Earthquake") return { type: "Ground", basePower: 100, accuracy: 100 };
      return null;
    });
    render(
      <CalcDefenderMoves
        effectiveMoves={["Earthquake", "", "", ""]}
        defenderSpecies="Garchomp"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByTestId("type-icon-Ground")).toBeInTheDocument();
  });

  it("renders BP label for damaging moves", () => {
    mockGetMoveData.mockReturnValue({ type: "Ground", basePower: 100, accuracy: 100 });
    render(
      <CalcDefenderMoves
        effectiveMoves={["Earthquake", "", "", ""]}
        defenderSpecies="Garchomp"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByText("BP 100")).toBeInTheDocument();
  });

  it("does NOT render BP for status moves (basePower 0)", () => {
    mockGetMoveData.mockReturnValue({ type: "Normal", basePower: 0, accuracy: true });
    render(
      <CalcDefenderMoves
        effectiveMoves={["Thunder Wave", "", "", ""]}
        defenderSpecies="Pikachu"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.queryByText(/BP/)).not.toBeInTheDocument();
  });

  it("provides correct aria-label for filled move slots", () => {
    mockGetMoveData.mockReturnValue({ type: "Ground", basePower: 100, accuracy: 100 });
    render(
      <CalcDefenderMoves
        effectiveMoves={["Earthquake", "", "", ""]}
        defenderSpecies="Garchomp"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByLabelText("Change move: Earthquake")).toBeInTheDocument();
  });

  it("provides 'Add move' aria-label for empty slots", () => {
    render(
      <CalcDefenderMoves
        effectiveMoves={["", "", "", ""]}
        defenderSpecies=""
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getAllByLabelText("Add move")).toHaveLength(4);
  });
});
