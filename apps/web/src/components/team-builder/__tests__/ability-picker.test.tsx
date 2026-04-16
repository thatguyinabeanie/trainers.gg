import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockGetLegalAbilities = jest.fn(
  (_species: string, _formatId: string): Set<string> | undefined => undefined
);

jest.mock("@trainers/pokemon", () => ({
  getValidAbilities: jest.fn(() => ["Intimidate", "Flash Fire", "Moxie"]),
  getAbilityShortDesc: jest.fn((name: string) =>
    name === "Intimidate"
      ? "Lowers foes' Attack on entry."
      : name === "Flash Fire"
        ? "Powers up Fire moves if hit by one."
        : name === "Own Tempo"
          ? "Prevents confusion."
          : "Raises Attack when a Pokemon is KO'd."
  ),
  getLegalAbilities: jest.fn(
    (species: string, formatId: string): Set<string> | undefined =>
      mockGetLegalAbilities(species, formatId)
  ),
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

  describe("format legality filtering", () => {
    it("omits abilities banned format-wide", () => {
      // getLegalAbilities returns a Set without Moxie (simulating a format ban)
      mockGetLegalAbilities.mockReturnValueOnce(
        new Set(["Intimidate", "Flash Fire"])
      );
      render(
        <AbilityPicker
          species="Arcanine"
          value=""
          onSelect={jest.fn()}
          onClose={jest.fn()}
          formatId="gen9ou"
        />
      );
      expect(screen.queryByText("Moxie")).not.toBeInTheDocument();
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
      expect(screen.getByText("Flash Fire")).toBeInTheDocument();
    });

    it("renders all species abilities in permissive format", () => {
      // No formatId — falls through to getValidAbilities
      render(
        <AbilityPicker
          species="Arcanine"
          value=""
          onSelect={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
      expect(screen.getByText("Flash Fire")).toBeInTheDocument();
      expect(screen.getByText("Moxie")).toBeInTheDocument();
    });

    it("falls back to all species abilities when getLegalAbilities returns undefined", () => {
      mockGetLegalAbilities.mockReturnValueOnce(undefined);
      render(
        <AbilityPicker
          species="Arcanine"
          value=""
          onSelect={jest.fn()}
          onClose={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );
      expect(screen.getByText("Intimidate")).toBeInTheDocument();
      expect(screen.getByText("Flash Fire")).toBeInTheDocument();
      expect(screen.getByText("Moxie")).toBeInTheDocument();
    });
  });
});
