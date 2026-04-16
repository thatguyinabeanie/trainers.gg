import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockGetLegalMoves = jest.fn(
  (_species: string, _formatId: string): Set<string> | undefined => undefined
);

jest.mock("@trainers/pokemon", () => {
  const moveData: Record<
    string,
    {
      name: string;
      type: string;
      category: string;
      basePower: number;
      accuracy: number | boolean;
      shortDesc: string;
    }
  > = {
    "Fake Out": {
      name: "Fake Out",
      type: "Normal",
      category: "Physical",
      basePower: 40,
      accuracy: 100,
      shortDesc: "Hits first, causes flinching.",
    },
    "Flare Blitz": {
      name: "Flare Blitz",
      type: "Fire",
      category: "Physical",
      basePower: 120,
      accuracy: 100,
      shortDesc: "Has recoil.",
    },
    "Knock Off": {
      name: "Knock Off",
      type: "Dark",
      category: "Physical",
      basePower: 65,
      accuracy: 100,
      shortDesc: "Removes the target's item.",
    },
    "U-turn": {
      name: "U-turn",
      type: "Bug",
      category: "Physical",
      basePower: 70,
      accuracy: 100,
      shortDesc: "User switches out after attacking.",
    },
    Protect: {
      name: "Protect",
      type: "Normal",
      category: "Status",
      basePower: 0,
      accuracy: true,
      shortDesc: "Protects the user from most moves.",
    },
    "Hyperspace Hole": {
      name: "Hyperspace Hole",
      type: "Psychic",
      category: "Special",
      basePower: 80,
      accuracy: true,
      shortDesc: "Ignores protection moves.",
    },
    Thunderbolt: {
      name: "Thunderbolt",
      type: "Electric",
      category: "Special",
      basePower: 90,
      accuracy: 100,
      shortDesc: "May paralyze the target.",
    },
  };
  return {
    getLearnableMoves: jest.fn(() => [
      "Fake Out",
      "Flare Blitz",
      "Hyperspace Hole",
      "Knock Off",
      "Protect",
      "Thunderbolt",
      "U-turn",
    ]),
    getLegalMoves: jest.fn(
      (species: string, formatId: string): Set<string> | undefined =>
        mockGetLegalMoves(species, formatId)
    ),
    getMoveData: jest.fn((name: string) => moveData[name] ?? null),
  };
});

import { MovePicker } from "../move-picker";

// =============================================================================
// Tests
// =============================================================================

describe("MovePicker", () => {
  const defaultProps = {
    species: "Incineroar",
    value: null,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders learnable moves for the species", () => {
      render(<MovePicker {...defaultProps} />);
      expect(screen.getByText("Fake Out")).toBeInTheDocument();
      expect(screen.getByText("Flare Blitz")).toBeInTheDocument();
      expect(screen.getByText("Knock Off")).toBeInTheDocument();
      expect(screen.getByText("U-turn")).toBeInTheDocument();
      expect(screen.getByText("Thunderbolt")).toBeInTheDocument();
    });

    it("renders type badges for moves", () => {
      render(<MovePicker {...defaultProps} />);
      // Multiple Normal-type moves (Fake Out + Protect)
      expect(screen.getAllByText("Normal").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Fire")).toBeInTheDocument();
    });

    it("renders category labels (P for Physical, S for Special)", () => {
      render(<MovePicker {...defaultProps} />);
      // Multiple Physical moves → multiple "P" labels
      const physLabels = screen.getAllByText("P");
      expect(physLabels.length).toBeGreaterThanOrEqual(1);
      // Multiple Special moves (Thunderbolt + Hyperspace Hole) → multiple "S" labels
      const specLabels = screen.getAllByText("S");
      expect(specLabels.length).toBeGreaterThanOrEqual(1);
    });

    it("renders base power for damaging moves", () => {
      render(<MovePicker {...defaultProps} />);
      expect(screen.getByText("40")).toBeInTheDocument();
      expect(screen.getByText("120")).toBeInTheDocument();
    });

    it("renders short descriptions", () => {
      render(<MovePicker {...defaultProps} />);
      expect(screen.getByText("Has recoil.")).toBeInTheDocument();
    });

    it("renders search input", () => {
      render(<MovePicker {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search moves…")).toBeInTheDocument();
    });

    it("renders category filter buttons", () => {
      render(<MovePicker {...defaultProps} />);
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Physical" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Special" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Status" })
      ).toBeInTheDocument();
    });
  });

  describe("search filtering", () => {
    it("filters moves by search text", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps} />);
      await user.type(screen.getByPlaceholderText("Search moves…"), "flare");
      expect(screen.getByText("Flare Blitz")).toBeInTheDocument();
      expect(screen.queryByText("Fake Out")).not.toBeInTheDocument();
    });

    it("shows no moves found message when nothing matches", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps} />);
      await user.type(screen.getByPlaceholderText("Search moves…"), "zzzzzz");
      expect(screen.getByText("No moves found")).toBeInTheDocument();
    });

    it("search is case-insensitive", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps} />);
      await user.type(
        screen.getByPlaceholderText("Search moves…"),
        "THUNDERBOLT"
      );
      expect(screen.getByText("Thunderbolt")).toBeInTheDocument();
    });
  });

  describe("category filter", () => {
    it("filters to Physical moves when Physical button is clicked", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Physical" }));
      // All learnable moves are physical except Thunderbolt (Special)
      expect(screen.queryByText("Thunderbolt")).not.toBeInTheDocument();
      expect(screen.getByText("Fake Out")).toBeInTheDocument();
    });

    it("filters to Special moves when Special button is clicked", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Special" }));
      expect(screen.getByText("Thunderbolt")).toBeInTheDocument();
      expect(screen.queryByText("Fake Out")).not.toBeInTheDocument();
    });

    it("shows all moves when All button is clicked after filtering", async () => {
      const user = userEvent.setup();
      render(<MovePicker {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: "Physical" }));
      await user.click(screen.getByRole("button", { name: "All" }));
      expect(screen.getByText("Thunderbolt")).toBeInTheDocument();
      expect(screen.getByText("Fake Out")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onSelect with the move name when clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<MovePicker {...defaultProps} onSelect={onSelect} />);
      await user.click(screen.getByText("Knock Off"));
      expect(onSelect).toHaveBeenCalledWith("Knock Off");
    });

    it("calls onClose after selecting a move", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<MovePicker {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByText("U-turn"));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("format legality filtering", () => {
    it("omits moves the species can't learn in this format", () => {
      // getLegalMoves returns a Set that includes Protect but NOT Hyperspace Hole
      mockGetLegalMoves.mockReturnValueOnce(
        new Set([
          "Fake Out",
          "Flare Blitz",
          "Knock Off",
          "Protect",
          "Thunderbolt",
          "U-turn",
        ])
      );
      render(
        <MovePicker
          species="Pikachu"
          value={null}
          onSelect={jest.fn()}
          onClose={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );
      expect(screen.queryByText("Hyperspace Hole")).not.toBeInTheDocument();
      expect(screen.getByText("Protect")).toBeInTheDocument();
    });

    it("renders all moves when formatId is absent (permissive)", () => {
      // No formatId — falls through to getLearnableMoves, getLegalMoves not called
      render(
        <MovePicker
          species="Pikachu"
          value={null}
          onSelect={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText("Protect")).toBeInTheDocument();
      expect(screen.getByText("Hyperspace Hole")).toBeInTheDocument();
    });

    it("renders all moves when getLegalMoves returns undefined for the format (permissive)", () => {
      // formatId provided but getLegalMoves returns undefined (permissive format)
      mockGetLegalMoves.mockReturnValueOnce(undefined);
      render(
        <MovePicker
          species="Pikachu"
          value={null}
          onSelect={jest.fn()}
          onClose={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );
      // Falls back to getLearnableMoves — all moves shown
      expect(screen.getByText("Protect")).toBeInTheDocument();
      expect(screen.getByText("Hyperspace Hole")).toBeInTheDocument();
    });
  });
});
