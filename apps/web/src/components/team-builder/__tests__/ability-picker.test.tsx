import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getValidAbilities: jest.fn(() => ["Intimidate", "Flash Fire", "Moxie"]),
}));

jest.mock("@pkmn/dex", () => ({
  Dex: {
    forGen: jest.fn(() => ({
      abilities: {
        get: jest.fn((name: string) => ({
          exists: true,
          name,
          shortDesc:
            name === "Intimidate"
              ? "Lowers foes' Attack on entry."
              : name === "Flash Fire"
                ? "Powers up Fire moves if hit by one."
                : "Raises Attack when a Pokemon is KO'd.",
        })),
      },
    })),
  },
}));

import { AbilityPicker } from "../ability-picker";

// =============================================================================
// Tests
// =============================================================================

describe("AbilityPicker", () => {
  const defaultProps = {
    species: "Arcanine",
    value: "Flash Fire",
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders all valid abilities for the species", () => {
      render(<AbilityPicker {...defaultProps} />);
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
      expect(screen.getByText("Flash Fire")).toBeInTheDocument();
      expect(screen.getByText("Moxie")).toBeInTheDocument();
    });

    it("renders short descriptions for abilities", () => {
      render(<AbilityPicker {...defaultProps} />);
      expect(
        screen.getByText("Lowers foes' Attack on entry.")
      ).toBeInTheDocument();
    });

    it("renders the search input", () => {
      render(<AbilityPicker {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Search abilities…")
      ).toBeInTheDocument();
    });
  });

  describe("search filtering", () => {
    it("filters abilities by search text", async () => {
      const user = userEvent.setup();
      render(<AbilityPicker {...defaultProps} />);
      await user.type(
        screen.getByPlaceholderText("Search abilities…"),
        "intim"
      );
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
      expect(screen.queryByText("Flash Fire")).not.toBeInTheDocument();
    });

    it("shows no abilities found when search matches nothing", async () => {
      const user = userEvent.setup();
      render(<AbilityPicker {...defaultProps} />);
      await user.type(
        screen.getByPlaceholderText("Search abilities…"),
        "zzzzz"
      );
      expect(screen.getByText("No abilities found")).toBeInTheDocument();
    });

    it("search is case-insensitive", async () => {
      const user = userEvent.setup();
      render(<AbilityPicker {...defaultProps} />);
      await user.type(
        screen.getByPlaceholderText("Search abilities…"),
        "FLASH"
      );
      expect(screen.getByText("Flash Fire")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onSelect with the ability name when clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<AbilityPicker {...defaultProps} onSelect={onSelect} />);
      await user.click(screen.getByText("Intimidate"));
      expect(onSelect).toHaveBeenCalledWith("Intimidate");
    });

    it("calls onClose after selecting an ability", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<AbilityPicker {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByText("Moxie"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
