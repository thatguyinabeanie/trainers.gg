import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@trainers/pokemon", () => ({
  getValidTeraTypes: jest.fn(() => [
    "Normal",
    "Fire",
    "Water",
    "Grass",
    "Electric",
    "Stellar",
  ]),
}));

import { TeraPicker } from "../tera-picker";

// =============================================================================
// Tests
// =============================================================================

describe("TeraPicker", () => {
  const defaultProps = {
    value: "Fire",
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders all valid tera types as buttons", () => {
      render(<TeraPicker {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Normal" })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Fire" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Water" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Grass" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Electric" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Stellar" })
      ).toBeInTheDocument();
    });
  });

  describe("current selection", () => {
    it("applies ring class to the currently selected type", () => {
      render(<TeraPicker {...defaultProps} />);
      const fireButton = screen.getByRole("button", { name: "Fire" });
      // Selected type has ring-2 class
      expect(fireButton.className).toContain("ring-2");
    });

    it("does not apply ring class to non-selected types", () => {
      render(<TeraPicker {...defaultProps} />);
      const waterButton = screen.getByRole("button", { name: "Water" });
      expect(waterButton.className).not.toContain("ring-2");
    });

    it("handles null value (no selection) without crashing", () => {
      render(
        <TeraPicker value={null} onSelect={jest.fn()} onClose={jest.fn()} />
      );
      const buttons = screen.getAllByRole("button");
      buttons.forEach((btn) => {
        expect(btn.className).not.toContain("ring-2");
      });
    });
  });

  describe("selection", () => {
    it("calls onSelect with the type when clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<TeraPicker {...defaultProps} onSelect={onSelect} />);
      await user.click(screen.getByRole("button", { name: "Water" }));
      expect(onSelect).toHaveBeenCalledWith("Water");
    });

    it("calls onClose after selecting a type", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<TeraPicker {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByRole("button", { name: "Grass" }));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onSelect with 'Stellar' when Stellar is clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<TeraPicker {...defaultProps} onSelect={onSelect} />);
      await user.click(screen.getByRole("button", { name: "Stellar" }));
      expect(onSelect).toHaveBeenCalledWith("Stellar");
    });
  });
});
