import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Mock @trainers/pokemon so the component can derive type colors and move
// categories without needing the full Pokemon data set in jsdom.
jest.mock("@trainers/pokemon", () => ({
  getMoveData: jest.fn((name: string) => {
    const data: Record<
      string,
      { name: string; type: string; category: string }
    > = {
      Flamethrower: { name: "Flamethrower", type: "Fire", category: "Special" },
      "Air Slash": { name: "Air Slash", type: "Flying", category: "Special" },
      "Iron Head": { name: "Iron Head", type: "Steel", category: "Physical" },
      "Will-O-Wisp": {
        name: "Will-O-Wisp",
        type: "Fire",
        category: "Status",
      },
      Moonblast: { name: "Moonblast", type: "Fairy", category: "Special" },
    };
    return data[name] ?? null;
  }),
  getTypeColor: jest.fn((type: string) => {
    const colors: Record<string, string> = {
      Fire: "#ff4422",
      Flying: "#8899ff",
      Steel: "#aabbcc",
      Fairy: "#ffaacc",
    };
    return colors[type] ?? "#9ca3af";
  }),
}));

import { CalcMoveList } from "../calc-move-list";
import { type CalcOutput } from "../use-calc-state";

// =============================================================================
// Helpers
// =============================================================================

function makeOutput(overrides: Partial<CalcOutput> = {}): CalcOutput {
  return {
    minPercent: 45,
    maxPercent: 53,
    desc: "stub desc",
    rolls: [90, 95, 100],
    defenderMaxHP: 200,
    ...overrides,
  };
}

/** Build the default (all-null) props shape for quick overrides. */
function defaultProps() {
  return {
    moves: [null, null, null, null] as readonly (string | null)[],
    calcOutputs: [null, null, null, null] as readonly (CalcOutput | null)[],
    selectedMoveIdx: 0,
    critMoves: [false, false, false, false] as readonly boolean[],
    onSelect: jest.fn(),
    onToggleCrit: jest.fn(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("CalcMoveList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe("empty state", () => {
    it("renders the empty-state message when all move slots are null", () => {
      render(<CalcMoveList {...defaultProps()} />);
      expect(
        screen.getByText("No moves on this Pokémon yet.")
      ).toBeInTheDocument();
    });

    it("does not render any move row buttons when all slots are null", () => {
      render(<CalcMoveList {...defaultProps()} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("renders the empty-state message when the moves array is all nulls including slot 0", () => {
      const props = defaultProps();
      props.moves = [null, null, null, null];
      render(<CalcMoveList {...props} />);
      expect(
        screen.getByText("No moves on this Pokémon yet.")
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Single move filled
  // ---------------------------------------------------------------------------

  describe("single filled move", () => {
    it("renders exactly one move row when only slot 0 is filled", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", null, null, null];
      render(<CalcMoveList {...props} />);
      expect(
        screen.getByTestId("calc-move-row-Flamethrower")
      ).toBeInTheDocument();
      // No empty-state text
      expect(
        screen.queryByText("No moves on this Pokémon yet.")
      ).not.toBeInTheDocument();
    });

    it("renders the move name inside the row", () => {
      const props = defaultProps();
      props.moves = ["Air Slash", null, null, null];
      render(<CalcMoveList {...props} />);
      expect(screen.getByText("Air Slash")).toBeInTheDocument();
    });

    it("renders one row when only a non-zero slot is filled", () => {
      const props = defaultProps();
      props.moves = [null, null, "Iron Head", null];
      render(<CalcMoveList {...props} />);
      expect(screen.getByTestId("calc-move-row-Iron Head")).toBeInTheDocument();
      expect(screen.queryByRole("button")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple moves
  // ---------------------------------------------------------------------------

  describe("multiple filled moves", () => {
    it("renders a row for each filled slot in order", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", "Iron Head", null];
      render(<CalcMoveList {...props} />);

      expect(
        screen.getByTestId("calc-move-row-Flamethrower")
      ).toBeInTheDocument();
      expect(screen.getByTestId("calc-move-row-Air Slash")).toBeInTheDocument();
      expect(screen.getByTestId("calc-move-row-Iron Head")).toBeInTheDocument();
    });

    it("renders rows only for filled slots, skipping null ones", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", null, "Moonblast", null];
      render(<CalcMoveList {...props} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
      expect(screen.getByText("Flamethrower")).toBeInTheDocument();
      expect(screen.getByText("Moonblast")).toBeInTheDocument();
    });

    it("renders all four moves when all slots are filled", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", "Iron Head", "Moonblast"];
      render(<CalcMoveList {...props} />);

      expect(screen.getAllByRole("button")).toHaveLength(4);
    });

    it("renders moves in slot order (first slot appears first in the DOM)", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Moonblast", null, null];
      render(<CalcMoveList {...props} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAttribute(
        "data-testid",
        "calc-move-row-Flamethrower"
      );
      expect(buttons[1]).toHaveAttribute(
        "data-testid",
        "calc-move-row-Moonblast"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Active move selection indicator
  // ---------------------------------------------------------------------------

  describe("active move visual indicator", () => {
    it("marks the selected slot's row container as data-active=true", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", null, null];
      props.selectedMoveIdx = 0;
      render(<CalcMoveList {...props} />);

      const row = screen
        .getByTestId("calc-move-row-Flamethrower")
        .closest("[data-active]");
      expect(row).toHaveAttribute("data-active", "true");
    });

    it("marks the non-selected row as data-active=false", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", null, null];
      props.selectedMoveIdx = 0;
      render(<CalcMoveList {...props} />);

      const row = screen
        .getByTestId("calc-move-row-Air Slash")
        .closest("[data-active]");
      expect(row).toHaveAttribute("data-active", "false");
    });

    it("correctly marks a non-zero selected index", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", "Iron Head", null];
      props.selectedMoveIdx = 2;
      render(<CalcMoveList {...props} />);

      const activeRow = screen
        .getByTestId("calc-move-row-Iron Head")
        .closest("[data-active]");
      expect(activeRow).toHaveAttribute("data-active", "true");

      const inactiveRow = screen
        .getByTestId("calc-move-row-Flamethrower")
        .closest("[data-active]");
      expect(inactiveRow).toHaveAttribute("data-active", "false");
    });
  });

  // ---------------------------------------------------------------------------
  // onSelect — fires with original slot index
  // ---------------------------------------------------------------------------

  describe("onSelect callback", () => {
    it("calls onSelect with the original slot index when a move row is clicked", async () => {
      const user = userEvent.setup();
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", null, null];
      const onSelect = jest.fn();
      props.onSelect = onSelect;

      render(<CalcMoveList {...props} />);
      await user.click(screen.getByTestId("calc-move-row-Flamethrower"));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(0);
    });

    it("passes the original slot index (1) not the filtered index when slot 0 is null", async () => {
      const user = userEvent.setup();
      const props = defaultProps();
      // Slot 0 is null; "Air Slash" is slot 1 — its original idx must be 1, not 0
      props.moves = [null, "Air Slash", null, null];
      const onSelect = jest.fn();
      props.onSelect = onSelect;

      render(<CalcMoveList {...props} />);
      await user.click(screen.getByTestId("calc-move-row-Air Slash"));

      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it("passes slot 3 for a move in the last slot when earlier slots are null", async () => {
      const user = userEvent.setup();
      const props = defaultProps();
      props.moves = [null, null, null, "Moonblast"];
      const onSelect = jest.fn();
      props.onSelect = onSelect;

      render(<CalcMoveList {...props} />);
      await user.click(screen.getByTestId("calc-move-row-Moonblast"));

      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it("fires onSelect for the correct slot when multiple moves exist", async () => {
      const user = userEvent.setup();
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", "Iron Head", "Moonblast"];
      const onSelect = jest.fn();
      props.onSelect = onSelect;

      render(<CalcMoveList {...props} />);
      await user.click(screen.getByTestId("calc-move-row-Iron Head"));

      expect(onSelect).toHaveBeenCalledWith(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Crit toggle
  // ---------------------------------------------------------------------------

  describe("crit toggle", () => {
    it("renders a crit checkbox for each non-status move", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", null, null];
      render(<CalcMoveList {...props} />);

      expect(
        screen.getByTestId("calc-move-crit-Flamethrower")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("calc-move-crit-Air Slash")
      ).toBeInTheDocument();
    });

    it("does not render a crit checkbox for a Status-category move", () => {
      const props = defaultProps();
      props.moves = ["Will-O-Wisp", null, null, null];
      render(<CalcMoveList {...props} />);

      expect(
        screen.queryByTestId("calc-move-crit-Will-O-Wisp")
      ).not.toBeInTheDocument();
    });

    it("reflects critMoves[idx]=false as an unchecked checkbox", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", null, null, null];
      props.critMoves = [false, false, false, false];
      render(<CalcMoveList {...props} />);

      const checkbox = screen.getByTestId("calc-move-crit-Flamethrower");
      expect(checkbox).not.toBeChecked();
    });

    it("reflects critMoves[idx]=true as a checked checkbox", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", null, null, null];
      props.critMoves = [true, false, false, false];
      render(<CalcMoveList {...props} />);

      const checkbox = screen.getByTestId("calc-move-crit-Flamethrower");
      expect(checkbox).toBeChecked();
    });

    it("reflects critMoves[idx] for a non-zero slot index", () => {
      const props = defaultProps();
      props.moves = [null, "Air Slash", null, null];
      props.critMoves = [false, true, false, false];
      render(<CalcMoveList {...props} />);

      const checkbox = screen.getByTestId("calc-move-crit-Air Slash");
      expect(checkbox).toBeChecked();
    });

    it("calls onToggleCrit with the original slot index on checkbox change", async () => {
      const user = userEvent.setup();
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", null, null];
      const onToggleCrit = jest.fn();
      props.onToggleCrit = onToggleCrit;

      render(<CalcMoveList {...props} />);
      await user.click(screen.getByTestId("calc-move-crit-Flamethrower"));

      expect(onToggleCrit).toHaveBeenCalledTimes(1);
      expect(onToggleCrit).toHaveBeenCalledWith(0);
    });

    it("passes the correct original slot index when crit toggled on a non-zero slot", async () => {
      const user = userEvent.setup();
      const props = defaultProps();
      // Slot 0 is null — "Air Slash" lives at original index 1
      props.moves = [null, "Air Slash", null, null];
      const onToggleCrit = jest.fn();
      props.onToggleCrit = onToggleCrit;

      render(<CalcMoveList {...props} />);
      await user.click(screen.getByTestId("calc-move-crit-Air Slash"));

      expect(onToggleCrit).toHaveBeenCalledWith(1);
    });

    it("shows the crit label text next to the checkbox", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", null, null, null];
      render(<CalcMoveList {...props} />);

      // There should be a visible "Crit" label beside the checkbox.
      expect(screen.getByText("Crit")).toBeInTheDocument();
    });

    it("has the correct aria-label on the crit checkbox", () => {
      const props = defaultProps();
      props.moves = ["Iron Head", null, null, null];
      render(<CalcMoveList {...props} />);

      const checkbox = screen.getByRole("checkbox", {
        name: "Crit toggle for Iron Head",
      });
      expect(checkbox).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Damage % display from calcOutputs
  // ---------------------------------------------------------------------------

  describe("damage % display", () => {
    it("shows the placeholder dash when calcOutputs[idx] is null", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", null, null, null];
      props.calcOutputs = [null, null, null, null];
      render(<CalcMoveList {...props} />);

      expect(screen.getByText("—%")).toBeInTheDocument();
    });

    it("displays minPercent–maxPercent when calcOutputs[idx] is present", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", null, null, null];
      props.calcOutputs = [
        makeOutput({ minPercent: 62, maxPercent: 74 }),
        null,
        null,
        null,
      ];
      render(<CalcMoveList {...props} />);

      expect(
        screen.getByTestId("calc-move-pct-Flamethrower")
      ).toHaveTextContent("62–74%");
    });

    it("shows the correct output for a specific move slot when earlier slots have no output", () => {
      const props = defaultProps();
      props.moves = [null, "Air Slash", null, null];
      props.calcOutputs = [
        null,
        makeOutput({ minPercent: 25, maxPercent: 35 }),
        null,
        null,
      ];
      render(<CalcMoveList {...props} />);

      expect(screen.getByTestId("calc-move-pct-Air Slash")).toHaveTextContent(
        "25–35%"
      );
    });

    it("shows independent outputs for each move when all slots are filled", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", null, null];
      props.calcOutputs = [
        makeOutput({ minPercent: 40, maxPercent: 50 }),
        makeOutput({ minPercent: 20, maxPercent: 30 }),
        null,
        null,
      ];
      render(<CalcMoveList {...props} />);

      expect(
        screen.getByTestId("calc-move-pct-Flamethrower")
      ).toHaveTextContent("40–50%");
      expect(screen.getByTestId("calc-move-pct-Air Slash")).toHaveTextContent(
        "20–30%"
      );
    });

    it("shows placeholder dash for moves without output alongside one with output", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", "Air Slash", null, null];
      props.calcOutputs = [
        makeOutput({ minPercent: 50, maxPercent: 60 }),
        null,
        null,
        null,
      ];
      render(<CalcMoveList {...props} />);

      // Flamethrower has output
      expect(
        screen.getByTestId("calc-move-pct-Flamethrower")
      ).toBeInTheDocument();

      // Air Slash falls back to —%
      expect(screen.getByText("—%")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Type color dot
  // ---------------------------------------------------------------------------

  describe("type color dot", () => {
    it("renders a type color dot with the correct title for a known move", () => {
      const props = defaultProps();
      props.moves = ["Flamethrower", null, null, null];
      render(<CalcMoveList {...props} />);

      const dot = screen.getByTitle("Fire");
      expect(dot).toBeInTheDocument();
    });

    it("falls back to grey (#9ca3af) when getMoveData returns null", () => {
      const props = defaultProps();
      // Use a move name not in the mock's data map
      props.moves = ["Unknown Move", null, null, null];
      render(<CalcMoveList {...props} />);

      const dot = screen.getByTitle("Unknown");
      expect(dot).toHaveStyle({ backgroundColor: "#9ca3af" });
    });
  });

  // ---------------------------------------------------------------------------
  // it.each — slot index preservation across sparse fills
  // ---------------------------------------------------------------------------

  describe("slot index preservation", () => {
    it.each([
      { slotIdx: 0, moveName: "Flamethrower" },
      { slotIdx: 1, moveName: "Air Slash" },
      { slotIdx: 2, moveName: "Iron Head" },
      { slotIdx: 3, moveName: "Moonblast" },
    ])(
      "slot $slotIdx ($moveName) fires onSelect($slotIdx) regardless of surrounding nulls",
      async ({ slotIdx, moveName }) => {
        const user = userEvent.setup();
        const moves: (string | null)[] = [null, null, null, null];
        moves[slotIdx] = moveName;

        const onSelect = jest.fn();
        render(
          <CalcMoveList
            moves={moves}
            calcOutputs={[null, null, null, null]}
            selectedMoveIdx={0}
            critMoves={[false, false, false, false]}
            onSelect={onSelect}
            onToggleCrit={jest.fn()}
          />
        );

        await user.click(screen.getByTestId(`calc-move-row-${moveName}`));
        expect(onSelect).toHaveBeenCalledWith(slotIdx);
      }
    );
  });
});
