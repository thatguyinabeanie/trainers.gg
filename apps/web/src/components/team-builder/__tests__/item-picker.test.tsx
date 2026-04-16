import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

const mockGetLegalItems = jest.fn(
  (_formatId: string) => undefined as Set<string> | undefined
);

jest.mock("@trainers/pokemon", () => {
  const itemDescs: Record<string, string> = {
    "Choice Band": "Boosts Attack.",
    Leftovers: "Restores HP each turn.",
    "Life Orb": "Boosts power but hurts user.",
    "Booster Energy": "Boosts a stat in Paradox terrain.",
  };
  return {
    getAllItems: jest.fn(() => [
      "Choice Band",
      "Leftovers",
      "Life Orb",
      "Booster Energy",
    ]),
    getItemShortDesc: jest.fn((name: string) => itemDescs[name] ?? null),
    getLegalItems: (...args: unknown[]) => mockGetLegalItems(args[0] as string),
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
    // Default: permissive — no registered legality list for the format
    mockGetLegalItems.mockReturnValue(undefined);
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

  describe("format legality filtering", () => {
    it("omits items illegal in the format", () => {
      // Simulate gen9monotype: Booster Energy is banned, Life Orb is legal
      mockGetLegalItems.mockReturnValue(
        new Set(["Choice Band", "Leftovers", "Life Orb"])
      );
      render(<ItemPicker {...defaultProps} formatId="gen9monotype" />);
      expect(screen.queryByText("Booster Energy")).not.toBeInTheDocument();
      expect(screen.getByText("Life Orb")).toBeInTheDocument();
    });

    it("renders all items when formatId has no registered legality list", () => {
      // mockGetLegalItems returns undefined by default (permissive)
      render(<ItemPicker {...defaultProps} formatId={undefined} />);
      expect(screen.getByText("Life Orb")).toBeInTheDocument();
      expect(screen.getByText("Booster Energy")).toBeInTheDocument();
    });

    it("typing a banned item name in search still returns no results in restricted format", async () => {
      mockGetLegalItems.mockReturnValue(
        new Set(["Choice Band", "Leftovers", "Life Orb"])
      );
      const user = userEvent.setup();
      render(<ItemPicker {...defaultProps} formatId="gen9monotype" />);
      await user.type(screen.getByPlaceholderText("Search items…"), "Booster");
      expect(screen.queryByText("Booster Energy")).not.toBeInTheDocument();
      expect(screen.getByText("No items found")).toBeInTheDocument();
    });

    it("renders all items when formatId is provided but getLegalItems returns undefined", () => {
      mockGetLegalItems.mockReturnValue(undefined);
      render(<ItemPicker {...defaultProps} formatId="gen9vgc2026regi" />);
      expect(screen.getByText("Life Orb")).toBeInTheDocument();
      expect(screen.getByText("Booster Energy")).toBeInTheDocument();
    });
  });
});
