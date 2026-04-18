import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Mock getMoveHelperText so the row test stays focused on layout/wiring
// instead of the helper-text grammar (covered by its own unit tests).
jest.mock("@trainers/pokemon", () => ({
  getMoveHelperText: jest.fn(() => "+1 priority"),
}));

// Tooltip uses Base UI portals — mock to simple pass-through wrappers so the
// TypeSymbolIcon renders inline without needing a full JSDOM provider.
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render: renderProp }: { render: React.ReactNode }) => (
    <>{renderProp}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { getMoveHelperText, type MoveData } from "@trainers/pokemon";

import { MoveListHeader, MoveRow } from "../move-row";

const mockedHelper = jest.mocked(getMoveHelperText);

// =============================================================================
// Test data
// =============================================================================

const physicalMove: MoveData = {
  name: "Sucker Punch",
  type: "Dark",
  category: "Physical",
  basePower: 70,
  accuracy: 100,
  shortDesc: "+1 priority.",
};

const statusMove: MoveData = {
  name: "Will-O-Wisp",
  type: "Fire",
  category: "Status",
  basePower: 0,
  accuracy: 85,
  shortDesc: "Burns the target.",
};

beforeEach(() => {
  mockedHelper.mockReturnValue("+1 priority");
});

// =============================================================================
// Tests
// =============================================================================

describe("MoveRow", () => {
  describe("filled row — damaging move", () => {
    it("renders move name and helper text from getMoveHelperText", () => {
      render(<MoveRow move={physicalMove} onOpenPicker={jest.fn()} />);
      expect(screen.getByText("Sucker Punch")).toBeInTheDocument();
      expect(screen.getByText("+1 priority")).toBeInTheDocument();
      expect(mockedHelper).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Sucker Punch" })
      );
    });

    it("renders BP and accuracy as numbers for damaging moves", () => {
      render(<MoveRow move={physicalMove} onOpenPicker={jest.fn()} />);
      expect(screen.getByText("70")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("renders the type as a round symbol icon (role=img, aria-label = type)", () => {
      render(<MoveRow move={physicalMove} onOpenPicker={jest.fn()} />);
      // Type now renders as TypeSymbolIcon — no text, role="img" with aria-label.
      expect(screen.getByRole("img", { name: "Dark" })).toBeInTheDocument();
    });

    it("calls onOpenPicker when the row is clicked", async () => {
      const user = userEvent.setup();
      const onOpenPicker = jest.fn();
      render(<MoveRow move={physicalMove} onOpenPicker={onOpenPicker} />);
      await user.click(screen.getByText("Sucker Punch"));
      expect(onOpenPicker).toHaveBeenCalledTimes(1);
    });
  });

  describe("filled row — status move", () => {
    it("dims BP and ACC and renders em-dash for both", () => {
      render(<MoveRow move={statusMove} onOpenPicker={jest.fn()} />);
      // Three em-dashes — category chip (Status), BP, and ACC.
      const dashes = screen.getAllByText("—");
      expect(dashes).toHaveLength(3);
      // The two stat cells (BP + ACC) carry the dimmed text class.
      const dimmed = dashes.filter((el) =>
        el.classList.contains("text-muted-foreground/60")
      );
      expect(dimmed).toHaveLength(2);
      // Numeric BP/ACC must NOT appear.
      expect(screen.queryByText("85")).not.toBeInTheDocument();
    });
  });

  describe("empty slot variant", () => {
    it("renders '+ Add move' when move is null", () => {
      render(<MoveRow move={null} onOpenPicker={jest.fn()} />);
      expect(screen.getByText("+ Add move")).toBeInTheDocument();
    });

    it("calls onOpenPicker when the empty slot is clicked", async () => {
      const user = userEvent.setup();
      const onOpenPicker = jest.fn();
      render(<MoveRow move={null} onOpenPicker={onOpenPicker} />);
      await user.click(screen.getByText("+ Add move"));
      expect(onOpenPicker).toHaveBeenCalledTimes(1);
    });

    it("does not render BP/ACC/category cells when empty", () => {
      render(<MoveRow move={null} onOpenPicker={jest.fn()} />);
      expect(screen.queryByText("BP")).not.toBeInTheDocument();
      expect(screen.queryByText("Acc")).not.toBeInTheDocument();
    });
  });

  describe("MoveListHeader", () => {
    it("renders BP and Acc column labels exactly once", () => {
      render(<MoveListHeader />);
      // Single header row above the move list — replaces per-row BP/Acc captions.
      expect(screen.getByText("BP")).toBeInTheDocument();
      expect(screen.getByText("Acc")).toBeInTheDocument();
    });
  });
});
