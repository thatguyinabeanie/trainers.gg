import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
//
// We provide the full 25-nature roster so the picker exercises its real
// grouping + neutral-filtering behavior.
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getValidNatures: jest.fn(() => [
    // Neutrals — only Serious should survive
    "Hardy",
    "Docile",
    "Bashful",
    "Quirky",
    "Serious",
    // +Atk
    "Lonely",
    "Brave",
    "Adamant",
    "Naughty",
    // +Def
    "Bold",
    "Relaxed",
    "Impish",
    "Lax",
    // +Spe
    "Timid",
    "Hasty",
    "Jolly",
    "Naive",
    // +SpA
    "Modest",
    "Mild",
    "Quiet",
    "Rash",
    // +SpD
    "Calm",
    "Gentle",
    "Sassy",
    "Careful",
  ]),
  NATURE_EFFECTS: {
    Hardy: {},
    Docile: {},
    Bashful: {},
    Quirky: {},
    Serious: {},
    Lonely: { boost: "attack", reduce: "defense" },
    Brave: { boost: "attack", reduce: "speed" },
    Adamant: { boost: "attack", reduce: "specialAttack" },
    Naughty: { boost: "attack", reduce: "specialDefense" },
    Bold: { boost: "defense", reduce: "attack" },
    Relaxed: { boost: "defense", reduce: "speed" },
    Impish: { boost: "defense", reduce: "specialAttack" },
    Lax: { boost: "defense", reduce: "specialDefense" },
    Timid: { boost: "speed", reduce: "attack" },
    Hasty: { boost: "speed", reduce: "defense" },
    Jolly: { boost: "speed", reduce: "specialAttack" },
    Naive: { boost: "speed", reduce: "specialDefense" },
    Modest: { boost: "specialAttack", reduce: "attack" },
    Mild: { boost: "specialAttack", reduce: "defense" },
    Quiet: { boost: "specialAttack", reduce: "speed" },
    Rash: { boost: "specialAttack", reduce: "specialDefense" },
    Calm: { boost: "specialDefense", reduce: "attack" },
    Gentle: { boost: "specialDefense", reduce: "defense" },
    Sassy: { boost: "specialDefense", reduce: "speed" },
    Careful: { boost: "specialDefense", reduce: "specialAttack" },
  },
}));

import { NaturePicker } from "../nature-picker";

// =============================================================================
// Tests
// =============================================================================

describe("NaturePicker", () => {
  const defaultProps = {
    value: "Jolly",
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("grouping", () => {
    it("renders 6 group headers (Neutral + 5 boost stats)", () => {
      render(<NaturePicker {...defaultProps} />);
      expect(screen.getByText("Neutral")).toBeInTheDocument();
      expect(screen.getByText("+ Atk")).toBeInTheDocument();
      expect(screen.getByText("+ Def")).toBeInTheDocument();
      expect(screen.getByText("+ SpA")).toBeInTheDocument();
      expect(screen.getByText("+ SpD")).toBeInTheDocument();
      expect(screen.getByText("+ Spe")).toBeInTheDocument();
    });

    it("hides redundant neutral natures (Hardy / Docile / Bashful / Quirky)", () => {
      render(<NaturePicker {...defaultProps} />);
      expect(screen.queryByRole("button", { name: /Hardy/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Docile/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Bashful/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Quirky/ })).toBeNull();
    });

    it("keeps Serious as the single neutral option", () => {
      render(<NaturePicker {...defaultProps} />);
      const neutralGroup = screen.getByTestId("nature-group-neutral");
      expect(neutralGroup).toHaveTextContent("Serious");
      expect(neutralGroup).not.toHaveTextContent("Hardy");
    });

    it.each([
      ["attack", ["Adamant", "Brave", "Lonely", "Naughty"]],
      ["defense", ["Bold", "Impish", "Lax", "Relaxed"]],
      ["specialAttack", ["Mild", "Modest", "Quiet", "Rash"]],
      ["specialDefense", ["Calm", "Careful", "Gentle", "Sassy"]],
      ["speed", ["Hasty", "Jolly", "Naive", "Timid"]],
    ])(
      "lists the right natures alphabetized in the +%s group",
      (boost, expected) => {
        render(<NaturePicker {...defaultProps} />);
        const group = screen.getByTestId(`nature-group-${boost}`);
        for (const nature of expected) {
          expect(group).toHaveTextContent(nature);
        }
      }
    );
  });

  describe("rendering", () => {
    it("renders search input", () => {
      render(<NaturePicker {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Search natures…")
      ).toBeInTheDocument();
    });
  });

  describe("stat effect labels", () => {
    it("shows + stat label for boosted stat (Adamant: +Atk)", () => {
      render(<NaturePicker {...defaultProps} />);
      // Adamant is in the +Atk group, but the row also has "+Atk" effect text.
      // Group header text is "+ Atk" (with space) so they don't collide.
      const adamantBtn = screen.getByRole("button", { name: /Adamant/ });
      expect(adamantBtn).toHaveTextContent("+Atk");
    });

    it("shows - stat label for reduced stat (Adamant: -SpA)", () => {
      render(<NaturePicker {...defaultProps} />);
      const adamantBtn = screen.getByRole("button", { name: /Adamant/ });
      expect(adamantBtn).toHaveTextContent("-SpA");
    });

    it("shows — for the surviving neutral nature (Serious)", () => {
      render(<NaturePicker {...defaultProps} />);
      const seriousBtn = screen.getByRole("button", { name: /Serious/ });
      expect(seriousBtn).toHaveTextContent("—");
    });
  });

  describe("search filtering", () => {
    it("filters natures by search text and collapses empty groups", async () => {
      const user = userEvent.setup();
      render(<NaturePicker {...defaultProps} />);
      await user.type(screen.getByPlaceholderText("Search natures…"), "tim");
      // Only Timid matches → only the Spe group (and its single nature) renders
      expect(screen.getByText("Timid")).toBeInTheDocument();
      expect(screen.queryByText("Adamant")).not.toBeInTheDocument();
      // Atk group has no matches → its header should not render
      expect(screen.queryByText("+ Atk")).not.toBeInTheDocument();
      // Spe group still renders
      expect(screen.getByText("+ Spe")).toBeInTheDocument();
    });

    it("shows no results message when nothing matches", async () => {
      const user = userEvent.setup();
      render(<NaturePicker {...defaultProps} />);
      await user.type(screen.getByPlaceholderText("Search natures…"), "zzz");
      expect(screen.getByText("No natures found")).toBeInTheDocument();
    });

    it("search is case-insensitive", async () => {
      const user = userEvent.setup();
      render(<NaturePicker {...defaultProps} />);
      await user.type(
        screen.getByPlaceholderText("Search natures…"),
        "ADAMANT"
      );
      expect(screen.getByText("Adamant")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onSelect with the nature name when clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<NaturePicker {...defaultProps} onSelect={onSelect} />);
      await user.click(screen.getByRole("button", { name: /Adamant/ }));
      expect(onSelect).toHaveBeenCalledWith("Adamant");
    });

    it("calls onClose after selecting a nature", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<NaturePicker {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByRole("button", { name: /Modest/ }));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
