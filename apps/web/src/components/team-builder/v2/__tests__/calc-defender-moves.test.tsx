"use client";

/**
 * Behavioral tests for CalcDefenderMoves and its inner DefenderMoveTile.
 *
 * Covers:
 *   - "Their moves → your atk" header renders
 *   - 4 tiles always render (empty slots show "+ Add move")
 *   - Move name renders for filled slots
 *   - Type icon rendered for a move with type data
 *   - BP renders on row 1 for damaging moves ("BP 80")
 *   - BP omitted for status moves (basePower 0)
 *   - Accuracy renders on row 1 only when < 100% ("· 70% acc")
 *   - No accuracy shown when accuracy is true (always-hit) or 100
 *   - Damage % renders on row 2 with KO-tier color class
 *   - KO tier label renders on row 2 (OHKO / 2HKO / 3HKO / 4HKO+)
 *   - HP range renders on row 2 when attackerHP is provided
 *   - Debuff notes on row 2: "· −2 SpA after" (Draco Meteor)
 *   - Pivot note on row 2: "· pivots out" (U-turn)
 *   - Row 2 not rendered when output is null
 *   - computeReverseOutput called with move name for each filled slot
 *   - onPick called with slotIdx and move name after picking
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () => new Proxy({}, { get: (_t, k) => k }));

// Popover — render children inline
jest.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-testid="popover"
      data-open={String(!!open)}
      onClick={() => onOpenChange?.(!open)}
    >
      {children}
    </div>
  ),
  PopoverTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <div data-testid="popover-trigger">
      {renderProp}
      {children}
    </div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// Dialog — render children inline so MovePicker is always queryable
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-testid="dialog"
      data-open={String(!!open)}
      onClick={() => onOpenChange?.(!open)}
    >
      {children}
    </div>
  ),
  DialogTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <div data-testid="dialog-trigger">
      {renderProp}
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

// MovePicker stub — interactive so we can simulate picking
jest.mock("../pickers/move-picker", () => ({
  MovePicker: ({
    value,
    onPick,
    onClose,
  }: {
    value: string | null;
    onPick: (name: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="move-picker" data-value={value ?? ""}>
      <button onClick={() => onPick("Flamethrower")}>pick-flamethrower</button>
      <button onClick={onClose}>close-picker</button>
    </div>
  ),
}));

// @trainers/pokemon — mock getMoveData
const mockGetMoveData = jest.fn();

jest.mock("@trainers/pokemon", () => {
  const actual =
    jest.requireActual<typeof TrainersPokemon>("@trainers/pokemon");
  return {
    ...actual,
    getMoveData: (...args: unknown[]) => mockGetMoveData(...args),
  };
});

// @trainers/pokemon/sprites
jest.mock("@trainers/pokemon/sprites", () => ({
  getShowdownTypeIconUrl: jest.fn((type: string) => `/types/${type}.png`),
}));

// getVerdict from use-calc-state
const mockGetVerdict = jest.fn();
jest.mock("../../use-calc-state", () => ({
  ...jest.requireActual("../../use-calc-state"),
  getVerdict: (...args: unknown[]) => mockGetVerdict(...args),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import {
  CalcDefenderMoves,
  type CalcDefenderMovesProps,
} from "../calc/calc-defender-moves";
import { type CalcOutput } from "../../use-calc-state";

// =============================================================================
// Fixtures
// =============================================================================

const VGC_FORMAT: TrainersPokemon.GameFormat = {
  id: "gen9vgc2026regi",
  game: "Scarlet & Violet",
  gameShort: "SV",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "I",
  label: "SV: Reg I",
  showdownName: "[Gen 9] VGC 2026 Reg I",
  doubles: true,
  active: true,
};

function makeOutput(overrides: Partial<CalcOutput> = {}): CalcOutput {
  return {
    minPercent: 45.2,
    maxPercent: 53.1,
    desc: "Test damage",
    rolls: [
      80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110,
    ],
    defenderMaxHP: 300,
    ...overrides,
  };
}

function makeMoveData(
  overrides: Partial<{
    type: string;
    category: string;
    basePower: number;
    accuracy: number | boolean;
    shortDesc: string;
  }> = {}
) {
  return {
    type: "Fire",
    category: "Special",
    basePower: 90,
    accuracy: 100,
    shortDesc: "No additional effect.",
    ...overrides,
  };
}

type EffectiveMoves = [string, string, string, string];

interface RenderProps {
  effectiveMoves?: EffectiveMoves;
  computeReverseOutput?: jest.Mock;
  attackerHP?: number | null;
  defenderSpecies?: string;
  format?: TrainersPokemon.GameFormat | undefined;
  onPick?: jest.Mock;
}

function renderMoves(props: RenderProps = {}) {
  const computeReverseOutput =
    props.computeReverseOutput ?? jest.fn().mockReturnValue(null);
  const onPick = props.onPick ?? jest.fn();

  const result = render(
    <CalcDefenderMoves
      effectiveMoves={props.effectiveMoves ?? ["", "", "", ""]}
      computeReverseOutput={
        computeReverseOutput as CalcDefenderMovesProps["computeReverseOutput"]
      }
      attackerHP={props.attackerHP ?? null}
      defenderSpecies={props.defenderSpecies ?? "Incineroar"}
      format={props.format ?? VGC_FORMAT}
      onPick={onPick}
    />
  );

  return { ...result, computeReverseOutput, onPick };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMoveData.mockReturnValue(makeMoveData());
  mockGetVerdict.mockReturnValue(null);
});

// =============================================================================
// Tests
// =============================================================================

describe("CalcDefenderMoves — header", () => {
  it("renders the 'Their moves → your atk' header", () => {
    renderMoves();
    expect(screen.getByText("Their moves → your atk")).toBeInTheDocument();
  });
});

describe("CalcDefenderMoves — tile rendering", () => {
  it("renders 4 picker dialog triggers (one per slot)", () => {
    renderMoves();
    expect(screen.getAllByTestId("dialog-trigger").length).toBe(4);
  });

  it("shows '+ Add move' for empty slots", () => {
    renderMoves({ effectiveMoves: ["", "", "", ""] });
    expect(screen.getAllByText("+ Add move").length).toBe(4);
  });

  it("renders move names for filled slots", () => {
    renderMoves({ effectiveMoves: ["Flare Blitz", "Knock Off", "", ""] });
    expect(screen.getByText("Flare Blitz")).toBeInTheDocument();
    expect(screen.getByText("Knock Off")).toBeInTheDocument();
  });

  it.each([
    [0, "Flamethrower"],
    [1, "Moonblast"],
    [2, "Earthquake"],
    [3, "Protect"],
  ] as const)("slot %i renders move name '%s'", (slotIdx, moveName) => {
    const moves: EffectiveMoves = ["", "", "", ""];
    moves[slotIdx] = moveName;
    renderMoves({ effectiveMoves: moves });
    expect(screen.getByText(moveName)).toBeInTheDocument();
  });

  it("renders 4 move pickers in popover content", () => {
    renderMoves({ effectiveMoves: ["", "", "", ""] });
    expect(screen.getAllByTestId("move-picker").length).toBe(4);
  });
});

describe("CalcDefenderMoves — type icon", () => {
  it("renders a type icon img for a move with type data", () => {
    mockGetMoveData.mockReturnValue(makeMoveData({ type: "Fire" }));
    renderMoves({ effectiveMoves: ["Flare Blitz", "", "", ""] });
    const img = screen.getByAltText("Fire");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/types/Fire.png");
  });

  it("does not render a type icon for empty slots (no move name)", () => {
    renderMoves({ effectiveMoves: ["", "", "", ""] });
    expect(screen.queryByAltText("Fire")).not.toBeInTheDocument();
  });
});

describe("CalcDefenderMoves — BP (row 1)", () => {
  it("renders BP on row 1 for damaging moves", () => {
    mockGetMoveData.mockReturnValue(makeMoveData({ basePower: 80 }));
    const computeReverseOutput = jest.fn().mockReturnValue(null);
    render(
      <CalcDefenderMoves
        effectiveMoves={["Any Move", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={200}
        defenderSpecies="Incineroar"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByText("BP 80")).toBeInTheDocument();
  });

  it("omits BP for status moves (basePower 0)", () => {
    mockGetMoveData.mockReturnValue(makeMoveData({ basePower: 0 }));
    const computeReverseOutput = jest.fn().mockReturnValue(null);
    render(
      <CalcDefenderMoves
        effectiveMoves={["Any Move", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={200}
        defenderSpecies="Incineroar"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.queryByText(/^BP/)).not.toBeInTheDocument();
  });
});

describe("CalcDefenderMoves — accuracy (row 1)", () => {
  it("renders accuracy on row 1 when accuracy is numeric and < 100", () => {
    mockGetMoveData.mockReturnValue(makeMoveData({ accuracy: 70 }));
    const computeReverseOutput = jest.fn().mockReturnValue(null);
    render(
      <CalcDefenderMoves
        effectiveMoves={["Any Move", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={200}
        defenderSpecies="Incineroar"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByText(/· 70% acc/)).toBeInTheDocument();
  });

  it("omits accuracy on row 1 when accuracy is true (always-hit)", () => {
    mockGetMoveData.mockReturnValue(makeMoveData({ accuracy: true }));
    const computeReverseOutput = jest.fn().mockReturnValue(null);
    render(
      <CalcDefenderMoves
        effectiveMoves={["Any Move", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={200}
        defenderSpecies="Incineroar"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.queryByText(/% acc/)).not.toBeInTheDocument();
  });
});

describe("CalcDefenderMoves — row 2 (damage / KO tier / HP range)", () => {
  it("renders damage % on row 2 with value from output", () => {
    mockGetVerdict.mockReturnValue("3HKO");
    const computeReverseOutput = jest.fn().mockReturnValue({
      minPercent: 34.0,
      maxPercent: 40.2,
      rolls: [66, 78],
      defenderMaxHP: 194,
      desc: "",
    });
    render(
      <CalcDefenderMoves
        effectiveMoves={["Any Move", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={194}
        defenderSpecies="Gholdengo"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByText("34.0–40.2%")).toBeInTheDocument();
  });

  it.each([
    ["OHKO", 101, 120],
    ["2HKO", 55, 65],
    ["3HKO", 38, 42],
  ] as const)(
    "renders KO tier label '%s' on row 2",
    (verdict, minPercent, maxPercent) => {
      mockGetVerdict.mockReturnValue(verdict);
      const computeReverseOutput = jest
        .fn()
        .mockReturnValue(makeOutput({ minPercent, maxPercent }));
      renderMoves({
        effectiveMoves: ["Flare Blitz", "", "", ""],
        computeReverseOutput,
      });
      expect(screen.getByText(verdict)).toBeInTheDocument();
    }
  );

  it("renders '4HKO+' when verdict is null but maxPercent > 0", () => {
    mockGetVerdict.mockReturnValue(null);
    const output = makeOutput({ minPercent: 24, maxPercent: 28 });
    renderMoves({
      effectiveMoves: ["Tackle", "", "", ""],
      computeReverseOutput: jest.fn().mockReturnValue(output),
    });
    expect(screen.getByText("4HKO+")).toBeInTheDocument();
  });

  it("renders HP range on row 2 when attackerHP provided", () => {
    mockGetVerdict.mockReturnValue("3HKO");
    const computeReverseOutput = jest.fn().mockReturnValue({
      minPercent: 34.0,
      maxPercent: 40.2,
      rolls: [66, 78],
      defenderMaxHP: 194,
      desc: "",
    });
    render(
      <CalcDefenderMoves
        effectiveMoves={["Any Move", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={194}
        defenderSpecies="Gholdengo"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByText(/66–78 \/ 194 HP/)).toBeInTheDocument();
  });

  it("does not render row 2 when output is null", () => {
    const computeReverseOutput = jest.fn().mockReturnValue(null);
    render(
      <CalcDefenderMoves
        effectiveMoves={["Any Move", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={194}
        defenderSpecies="Gholdengo"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    // Row 2 contains the damage range (X.X–Y.Y%) and KO tier — neither should appear
    expect(screen.queryByText(/\d+\.\d+–\d+\.\d+%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/HKO/)).not.toBeInTheDocument();
  });

  it("does NOT render row 2 for empty slot", () => {
    const output = makeOutput();
    renderMoves({
      effectiveMoves: ["", "", "", ""],
      computeReverseOutput: jest.fn().mockReturnValue(output),
    });
    expect(screen.queryByText(/HKO/)).not.toBeInTheDocument();
  });

  it("renders raw damage roll range when rolls are present", () => {
    mockGetVerdict.mockReturnValue("2HKO");
    const output = makeOutput({
      rolls: [
        80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150,
        155,
      ],
      minPercent: 45,
      maxPercent: 55,
    });
    renderMoves({
      effectiveMoves: ["Moonblast", "", "", ""],
      computeReverseOutput: jest.fn().mockReturnValue(output),
    });
    expect(screen.getByText(/80.*155/)).toBeInTheDocument();
  });

  it("does NOT append HP when attackerHP is null", () => {
    mockGetVerdict.mockReturnValue("2HKO");
    const output = makeOutput({ rolls: [80, 155] });
    renderMoves({
      effectiveMoves: ["Moonblast", "", "", ""],
      computeReverseOutput: jest.fn().mockReturnValue(output),
      attackerHP: null,
    });
    expect(screen.queryByText(/\/ \d+ HP/)).not.toBeInTheDocument();
  });
});

describe("CalcDefenderMoves — extra notes on row 2 (debuff / pivot)", () => {
  it("renders pivot note on row 2 for U-turn", () => {
    const computeReverseOutput = jest.fn().mockReturnValue({
      minPercent: 8.2,
      maxPercent: 9.7,
      rolls: [16, 19],
      defenderMaxHP: 194,
      desc: "",
    });
    render(
      <CalcDefenderMoves
        effectiveMoves={["U-turn", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={194}
        defenderSpecies="Gholdengo"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByText(/· pivots out/)).toBeInTheDocument();
  });

  it("renders SpA drop note on row 2 for Draco Meteor", () => {
    const computeReverseOutput = jest.fn().mockReturnValue({
      minPercent: 55.0,
      maxPercent: 65.0,
      rolls: [107, 126],
      defenderMaxHP: 194,
      desc: "",
    });
    render(
      <CalcDefenderMoves
        effectiveMoves={["Draco Meteor", "", "", ""]}
        computeReverseOutput={computeReverseOutput}
        attackerHP={194}
        defenderSpecies="Gholdengo"
        format={undefined}
        onPick={jest.fn()}
      />
    );
    expect(screen.getByText(/· −2 SpA after/)).toBeInTheDocument();
  });

  it.each([
    ["Leaf Storm", "−2 SpA after"],
    ["Overheat", "−2 SpA after"],
    ["Psycho Boost", "−2 SpA after"],
    ["Glacial Lance", "−2 SpA after"],
  ] as const)(
    "%s shows '−2 SpA after' note on row 2",
    (moveName, expectedNote) => {
      mockGetVerdict.mockReturnValue("2HKO");
      const output = makeOutput();
      renderMoves({
        effectiveMoves: [moveName, "", "", ""],
        computeReverseOutput: jest.fn().mockReturnValue(output),
      });
      expect(screen.getByText(new RegExp(expectedNote.replace(/[−+]/g, "."))));
    }
  );

  it.each([
    ["Close Combat", "−1 Def/SpD after"],
    ["Superpower", "−1 Def/SpD after"],
  ] as const)(
    "%s shows '−1 Def/SpD after' note on row 2",
    (moveName, expectedNote) => {
      mockGetVerdict.mockReturnValue("2HKO");
      const output = makeOutput();
      renderMoves({
        effectiveMoves: [moveName, "", "", ""],
        computeReverseOutput: jest.fn().mockReturnValue(output),
      });
      expect(screen.getByText(new RegExp(expectedNote.replace(/[−+]/g, "."))));
    }
  );

  it.each([
    ["Volt Switch", "pivots out"],
    ["Flip Turn", "pivots out"],
    ["Parting Shot", "pivots out"],
    ["Teleport", "pivots out"],
  ] as const)(
    "%s shows 'pivots out' note on row 2",
    (moveName, expectedNote) => {
      mockGetVerdict.mockReturnValue("2HKO");
      const output = makeOutput();
      renderMoves({
        effectiveMoves: [moveName, "", "", ""],
        computeReverseOutput: jest.fn().mockReturnValue(output),
      });
      expect(screen.getByText(new RegExp(expectedNote)));
    }
  );

  it("shows no extra note for a standard move", () => {
    mockGetVerdict.mockReturnValue("2HKO");
    const output = makeOutput();
    renderMoves({
      effectiveMoves: ["Flamethrower", "", "", ""],
      computeReverseOutput: jest.fn().mockReturnValue(output),
    });
    expect(screen.queryByText(/SpA after/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pivots out/)).not.toBeInTheDocument();
  });
});

describe("CalcDefenderMoves — computeReverseOutput calls", () => {
  it("calls computeReverseOutput with the move name for each filled slot", () => {
    const computeReverseOutput = jest.fn().mockReturnValue(null);
    renderMoves({
      effectiveMoves: ["Moonblast", "Psychic", "", ""],
      computeReverseOutput,
    });
    expect(computeReverseOutput).toHaveBeenCalledWith("Moonblast");
    expect(computeReverseOutput).toHaveBeenCalledWith("Psychic");
  });

  it("does NOT call computeReverseOutput for empty slots", () => {
    const computeReverseOutput = jest.fn().mockReturnValue(null);
    renderMoves({
      effectiveMoves: ["Moonblast", "", "", ""],
      computeReverseOutput,
    });
    // Only called once (for Moonblast), not for the 3 empty slots
    expect(computeReverseOutput).toHaveBeenCalledTimes(1);
  });

  it("calls computeReverseOutput for all 4 slots when all are filled", () => {
    const computeReverseOutput = jest.fn().mockReturnValue(null);
    renderMoves({
      effectiveMoves: ["Moonblast", "Psychic", "Icy Wind", "Protect"],
      computeReverseOutput,
    });
    expect(computeReverseOutput).toHaveBeenCalledTimes(4);
  });
});

describe("CalcDefenderMoves — picking a move", () => {
  it("calls onPick with slotIdx=0 and move name when picking in slot 0", () => {
    const onPick = jest.fn();
    renderMoves({ effectiveMoves: ["", "", "", ""], onPick });
    // Click the first pick-flamethrower button (slot 0's picker)
    const pickButtons = screen.getAllByText("pick-flamethrower");
    fireEvent.click(pickButtons[0]);
    expect(onPick).toHaveBeenCalledWith(0, "Flamethrower");
  });

  it("calls onPick with slotIdx=2 when picking in slot 2", () => {
    const onPick = jest.fn();
    renderMoves({ effectiveMoves: ["", "", "", ""], onPick });
    const pickButtons = screen.getAllByText("pick-flamethrower");
    fireEvent.click(pickButtons[2]);
    expect(onPick).toHaveBeenCalledWith(2, "Flamethrower");
  });

  it.each([0, 1, 2, 3] as const)(
    "onPick is called with slotIdx=%i",
    (slotIdx) => {
      const onPick = jest.fn();
      renderMoves({ effectiveMoves: ["", "", "", ""], onPick });
      const pickButtons = screen.getAllByText("pick-flamethrower");
      fireEvent.click(pickButtons[slotIdx]);
      expect(onPick).toHaveBeenCalledWith(slotIdx, "Flamethrower");
    }
  );
});

describe("CalcDefenderMoves — OHKO tile style", () => {
  it("the tile trigger button gets OHKO class when koTierLabel is OHKO", () => {
    mockGetVerdict.mockReturnValue("OHKO");
    const output = makeOutput({ minPercent: 110, maxPercent: 130 });
    const { container } = renderMoves({
      effectiveMoves: ["Moonblast", "", "", ""],
      computeReverseOutput: jest.fn().mockReturnValue(output),
    });
    // The tile button should have the dmv-tile--ohko class
    const ohkoTile = container.querySelector(".dmv-tile--ohko");
    expect(ohkoTile).toBeInTheDocument();
  });

  it("tile does NOT have OHKO class for non-OHKO tiers", () => {
    mockGetVerdict.mockReturnValue("2HKO");
    const output = makeOutput({ minPercent: 55, maxPercent: 65 });
    const { container } = renderMoves({
      effectiveMoves: ["Moonblast", "", "", ""],
      computeReverseOutput: jest.fn().mockReturnValue(output),
    });
    expect(container.querySelector(".dmv-tile--ohko")).not.toBeInTheDocument();
  });
});

describe("CalcDefenderMoves — KO pill not shown when maxPercent is 0", () => {
  it("no KO pill when maxPercent is 0 (zero damage)", () => {
    mockGetVerdict.mockReturnValue(null);
    const output = makeOutput({ minPercent: 0, maxPercent: 0, rolls: [] });
    renderMoves({
      effectiveMoves: ["Protect", "", "", ""],
      computeReverseOutput: jest.fn().mockReturnValue(output),
    });
    expect(screen.queryByText(/HKO/)).not.toBeInTheDocument();
  });
});
