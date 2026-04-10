import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getLearnableMoves: jest.fn(() => [
    "Fake Out",
    "Flare Blitz",
    "Knock Off",
    "U-turn",
    "Thunderbolt",
  ]),
}));

jest.mock("@pkmn/dex", () => ({
  Dex: {
    forGen: jest.fn(() => ({
      moves: {
        get: jest.fn((name: string) => {
          const moves: Record<
            string,
            {
              exists: boolean;
              name: string;
              type: string;
              category: string;
              basePower: number;
              accuracy: number | boolean;
              shortDesc: string;
            }
          > = {
            "Fake Out": {
              exists: true,
              name: "Fake Out",
              type: "Normal",
              category: "Physical",
              basePower: 40,
              accuracy: 100,
              shortDesc: "Hits first, causes flinching.",
            },
            "Flare Blitz": {
              exists: true,
              name: "Flare Blitz",
              type: "Fire",
              category: "Physical",
              basePower: 120,
              accuracy: 100,
              shortDesc: "Has recoil.",
            },
            "Knock Off": {
              exists: true,
              name: "Knock Off",
              type: "Dark",
              category: "Physical",
              basePower: 65,
              accuracy: 100,
              shortDesc: "Removes the target's item.",
            },
            "U-turn": {
              exists: true,
              name: "U-turn",
              type: "Bug",
              category: "Physical",
              basePower: 70,
              accuracy: 100,
              shortDesc: "User switches out after attacking.",
            },
            Thunderbolt: {
              exists: true,
              name: "Thunderbolt",
              type: "Electric",
              category: "Special",
              basePower: 90,
              accuracy: 100,
              shortDesc: "May paralyze the target.",
            },
          };
          return moves[name] ?? null;
        }),
      },
    })),
  },
}));

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
      expect(screen.getByText("Normal")).toBeInTheDocument();
      expect(screen.getByText("Fire")).toBeInTheDocument();
    });

    it("renders category labels (P for Physical, S for Special)", () => {
      render(<MovePicker {...defaultProps} />);
      // Multiple Physical moves → multiple "P" labels
      const physLabels = screen.getAllByText("P");
      expect(physLabels.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("S")).toBeInTheDocument();
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
});
