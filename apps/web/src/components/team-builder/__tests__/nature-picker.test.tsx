import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getValidNatures: jest.fn(() => [
    "Adamant",
    "Jolly",
    "Modest",
    "Timid",
    "Bold",
    "Hardy",
  ]),
  NATURE_EFFECTS: {
    Adamant: { boost: "attack", reduce: "specialAttack" },
    Jolly: { boost: "speed", reduce: "specialAttack" },
    Modest: { boost: "specialAttack", reduce: "attack" },
    Timid: { boost: "speed", reduce: "attack" },
    Bold: { boost: "defense", reduce: "attack" },
    Hardy: {},
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

  describe("rendering", () => {
    it("renders all natures", () => {
      render(<NaturePicker {...defaultProps} />);
      expect(screen.getByText("Adamant")).toBeInTheDocument();
      expect(screen.getByText("Jolly")).toBeInTheDocument();
      expect(screen.getByText("Modest")).toBeInTheDocument();
      expect(screen.getByText("Hardy")).toBeInTheDocument();
    });

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
      expect(screen.getByText("+Atk")).toBeInTheDocument();
    });

    it("shows - stat label for reduced stat (Adamant: -SpA)", () => {
      render(<NaturePicker {...defaultProps} />);
      // Multiple natures may reduce SpA, so use getAllByText
      expect(screen.getAllByText("-SpA").length).toBeGreaterThanOrEqual(1);
    });

    it("shows — for neutral natures (Hardy)", () => {
      render(<NaturePicker {...defaultProps} />);
      // Hardy has no boost/reduce → shows dash
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe("search filtering", () => {
    it("filters natures by search text", async () => {
      const user = userEvent.setup();
      render(<NaturePicker {...defaultProps} />);
      await user.type(screen.getByPlaceholderText("Search natures…"), "tim");
      expect(screen.getByText("Timid")).toBeInTheDocument();
      expect(screen.queryByText("Adamant")).not.toBeInTheDocument();
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
      await user.click(screen.getByText("Adamant"));
      expect(onSelect).toHaveBeenCalledWith("Adamant");
    });

    it("calls onClose after selecting a nature", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<NaturePicker {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByText("Modest"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
