import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

jest.mock("@pkmn/dex", () => {
  const mockItems = [
    {
      exists: true,
      name: "Choice Band",
      shortDesc: "Boosts Attack.",
    },
    {
      exists: true,
      name: "Leftovers",
      shortDesc: "Restores HP each turn.",
    },
    {
      exists: true,
      name: "Life Orb",
      shortDesc: "Boosts power but hurts user.",
    },
  ];

  return {
    Dex: {
      forGen: jest.fn(() => ({
        items: {
          all: jest.fn(() => mockItems),
          get: jest.fn(
            (name: string) => mockItems.find((i) => i.name === name) ?? null
          ),
        },
      })),
    },
  };
});

import { ItemPicker } from "../item-picker";

// =============================================================================
// Tests
// =============================================================================

describe("ItemPicker", () => {
  const defaultProps = {
    value: null,
    onSelect: jest.fn(),
    onClose: jest.fn(),
    teamItems: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders items list", () => {
      render(<ItemPicker {...defaultProps} />);
      expect(screen.getByText("Choice Band")).toBeInTheDocument();
      expect(screen.getByText("Leftovers")).toBeInTheDocument();
      expect(screen.getByText("Life Orb")).toBeInTheDocument();
    });

    it("renders short descriptions for items", () => {
      render(<ItemPicker {...defaultProps} />);
      expect(screen.getByText("Boosts Attack.")).toBeInTheDocument();
      expect(screen.getByText("Restores HP each turn.")).toBeInTheDocument();
    });

    it("renders the search input", () => {
      render(<ItemPicker {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search items…")).toBeInTheDocument();
    });
  });

  describe("search filtering", () => {
    it("filters items by search text", async () => {
      const user = userEvent.setup();
      render(<ItemPicker {...defaultProps} />);
      await user.type(screen.getByPlaceholderText("Search items…"), "choice");
      expect(screen.getByText("Choice Band")).toBeInTheDocument();
      expect(screen.queryByText("Leftovers")).not.toBeInTheDocument();
    });

    it("shows no items found when nothing matches", async () => {
      const user = userEvent.setup();
      render(<ItemPicker {...defaultProps} />);
      await user.type(screen.getByPlaceholderText("Search items…"), "zzzzz");
      expect(screen.getByText("No items found")).toBeInTheDocument();
    });

    it("search is case-insensitive", async () => {
      const user = userEvent.setup();
      render(<ItemPicker {...defaultProps} />);
      await user.type(screen.getByPlaceholderText("Search items…"), "LIFE ORB");
      expect(screen.getByText("Life Orb")).toBeInTheDocument();
    });
  });

  describe("duplicate item warning", () => {
    it("shows 'held' badge when a team member already holds the item", () => {
      render(
        <ItemPicker {...defaultProps} teamItems={["Leftovers"]} value={null} />
      );
      // "held" badge appears for Leftovers since another team member holds it
      expect(screen.getByText("held")).toBeInTheDocument();
    });

    it("does not show 'held' badge when the item is the current pokemon's item", () => {
      render(
        <ItemPicker
          {...defaultProps}
          teamItems={["Leftovers"]}
          value="Leftovers"
        />
      );
      // When value === item, it's selected not duplicated — no "held" badge
      expect(screen.queryByText("held")).not.toBeInTheDocument();
    });

    it("does not show 'held' badge when teamItems is empty", () => {
      render(<ItemPicker {...defaultProps} teamItems={[]} />);
      expect(screen.queryByText("held")).not.toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onSelect with the item name when clicked", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      render(<ItemPicker {...defaultProps} onSelect={onSelect} />);
      await user.click(screen.getByText("Life Orb"));
      expect(onSelect).toHaveBeenCalledWith("Life Orb");
    });

    it("calls onClose after selecting an item", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<ItemPicker {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByText("Choice Band"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
