import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Mock the pokemon package so the row test stays focused on layout/wiring
// instead of dex lookups and helper-text grammar (each covered by their own unit tests).
// getMoveHelperInput returns a stub object; getMoveHelperText returns a canned string.
jest.mock("@trainers/pokemon", () => ({
  getMoveHelperInput: jest.fn(() => ({
    name: "Sucker Punch",
    category: "Physical",
  })),
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

import {
  getMoveHelperInput,
  getMoveHelperText,
  type MoveData,
} from "@trainers/pokemon";

import { MoveListHeader, MoveRow } from "../move-row";

const mockedHelperInput = jest.mocked(getMoveHelperInput);
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
  mockedHelperInput.mockReturnValue({
    name: "Sucker Punch",
    category: "Physical",
  } as ReturnType<typeof getMoveHelperInput>);
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
      // getMoveHelperInput is called first to get a full dex object, then
      // getMoveHelperText receives that object.
      expect(mockedHelperInput).toHaveBeenCalledWith("Sucker Punch");
      expect(mockedHelper).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Sucker Punch" })
      );
    });

    it("renders BP and accuracy with % suffix for damaging moves", () => {
      render(<MoveRow move={physicalMove} onOpenPicker={jest.fn()} />);
      expect(screen.getByText("70")).toBeInTheDocument();
      // formatAccuracy appends "%" — accuracy 100 renders as "100%".
      expect(screen.getByText("100%")).toBeInTheDocument();
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
      // Numeric BP (0 → rendered as "—") and ACC (85 → "—" for status) must NOT appear.
      expect(screen.queryByText("0")).not.toBeInTheDocument();
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
