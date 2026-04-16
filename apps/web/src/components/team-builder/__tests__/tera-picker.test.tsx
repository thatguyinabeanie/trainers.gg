import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockGetLegalTeraTypes = jest.fn(
  (_formatId: string): Set<string> | undefined => undefined
);

jest.mock("@trainers/pokemon", () => ({
  getValidTeraTypes: jest.fn(() => [
    "Normal",
    "Fire",
    "Water",
    "Grass",
    "Electric",
    "Stellar",
  ]),
  getLegalTeraTypes: (...args: unknown[]) =>
    mockGetLegalTeraTypes(args[0] as string),
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

  describe("format filtering", () => {
    it("renders all types when formatId returns undefined (permissive)", () => {
      mockGetLegalTeraTypes.mockReturnValueOnce(undefined);
      render(
        <TeraPicker
          value={null}
          onSelect={jest.fn()}
          onClose={jest.fn()}
          formatId="gen9vgc2026regi"
        />
      );
      // All 6 mocked types should render
      expect(screen.getAllByRole("button")).toHaveLength(6);
    });

    it("renders empty state when format disallows Tera", () => {
      mockGetLegalTeraTypes.mockReturnValueOnce(new Set());
      render(
        <TeraPicker
          value={null}
          onSelect={jest.fn()}
          onClose={jest.fn()}
          formatId="championsvgc2026regma"
        />
      );
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(screen.getByText(/Tera isn't allowed/i)).toBeInTheDocument();
    });

    it("renders only legal types when format restricts Tera", () => {
      // Only Fire and Water are legal
      mockGetLegalTeraTypes.mockReturnValueOnce(new Set(["Fire", "Water"]));
      render(
        <TeraPicker
          value={null}
          onSelect={jest.fn()}
          onClose={jest.fn()}
          formatId="gen9monotype"
        />
      );
      expect(screen.getAllByRole("button")).toHaveLength(2);
      expect(screen.getByRole("button", { name: "Fire" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Water" })).toBeInTheDocument();
    });
  });
});
