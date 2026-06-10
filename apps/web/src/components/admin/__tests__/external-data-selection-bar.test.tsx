/**
 * Unit tests for SelectionBar — the bulk-action bar shown when rows are selected
 * in the external-data queue monitor.
 *
 * Covers:
 *  - Returns null when selectedCount is 0
 *  - Shows "N selected" count label
 *  - "Import selected" button always present (even when 0 eligible)
 *  - "Unqueue" button only shown when unqueueEligibleCount > 0
 *  - "Reset" button only shown when resetEligibleCount > 0
 *  - Buttons disabled when bulkProcessing is true
 *  - Callback props fire on click
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SelectionBar } from "../external-data-selection-bar";

// ---------------------------------------------------------------------------
// Mock Button to avoid Tailwind/shadcn rendering issues in jsdom
// ---------------------------------------------------------------------------

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant: _v,
    size: _s,
    className: _c,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SelectionBar", () => {
  describe("visibility", () => {
    it("renders nothing when selectedCount is 0", () => {
      const { container } = render(
        <SelectionBar
          selectedCount={0}
          bulkProcessing={false}
          onClear={jest.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders the bar when selectedCount > 0", () => {
      render(
        <SelectionBar
          selectedCount={3}
          bulkProcessing={false}
          onClear={jest.fn()}
        />
      );
      expect(screen.getByText("3 selected")).toBeInTheDocument();
    });
  });

  describe("Import selected button", () => {
    it("always renders the Import button with eligible count", () => {
      render(
        <SelectionBar
          selectedCount={2}
          bulkProcessing={false}
          importEligibleCount={2}
          onClear={jest.fn()}
        />
      );
      expect(screen.getByText("Import selected (2)")).toBeInTheDocument();
    });

    it("shows zero in Import button when importEligibleCount is undefined", () => {
      render(
        <SelectionBar
          selectedCount={1}
          bulkProcessing={false}
          onClear={jest.fn()}
        />
      );
      expect(screen.getByText("Import selected (0)")).toBeInTheDocument();
    });

    it("calls onImportSelected when Import button is clicked", async () => {
      const onImport = jest.fn();
      render(
        <SelectionBar
          selectedCount={1}
          bulkProcessing={false}
          importEligibleCount={1}
          onImportSelected={onImport}
          onClear={jest.fn()}
        />
      );
      await userEvent.click(screen.getByText("Import selected (1)"));
      expect(onImport).toHaveBeenCalledTimes(1);
    });
  });

  describe("Unqueue button", () => {
    it("does not render Unqueue button when unqueueEligibleCount is 0", () => {
      render(
        <SelectionBar
          selectedCount={2}
          bulkProcessing={false}
          unqueueEligibleCount={0}
          onClear={jest.fn()}
        />
      );
      expect(screen.queryByText(/Unqueue/)).toBeNull();
    });

    it("does not render Unqueue button when unqueueEligibleCount is undefined", () => {
      render(
        <SelectionBar
          selectedCount={1}
          bulkProcessing={false}
          onClear={jest.fn()}
        />
      );
      expect(screen.queryByText(/Unqueue/)).toBeNull();
    });

    it("renders Unqueue button with count when unqueueEligibleCount > 0", () => {
      render(
        <SelectionBar
          selectedCount={3}
          bulkProcessing={false}
          unqueueEligibleCount={2}
          onUnqueueSelected={jest.fn()}
          onClear={jest.fn()}
        />
      );
      expect(screen.getByText("Unqueue (2)")).toBeInTheDocument();
    });

    it("calls onUnqueueSelected when Unqueue button is clicked", async () => {
      const onUnqueue = jest.fn();
      render(
        <SelectionBar
          selectedCount={2}
          bulkProcessing={false}
          unqueueEligibleCount={2}
          onUnqueueSelected={onUnqueue}
          onClear={jest.fn()}
        />
      );
      await userEvent.click(screen.getByText("Unqueue (2)"));
      expect(onUnqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe("Reset button", () => {
    it("does not render Reset button when resetEligibleCount is 0", () => {
      render(
        <SelectionBar
          selectedCount={2}
          bulkProcessing={false}
          resetEligibleCount={0}
          onClear={jest.fn()}
        />
      );
      expect(screen.queryByText(/Reset/)).toBeNull();
    });

    it("renders Reset button with count when resetEligibleCount > 0", () => {
      render(
        <SelectionBar
          selectedCount={3}
          bulkProcessing={false}
          resetEligibleCount={1}
          onResetEvents={jest.fn()}
          onClear={jest.fn()}
        />
      );
      expect(screen.getByText("Reset (1)")).toBeInTheDocument();
    });

    it("calls onResetEvents when Reset button is clicked", async () => {
      const onReset = jest.fn();
      render(
        <SelectionBar
          selectedCount={2}
          bulkProcessing={false}
          resetEligibleCount={2}
          onResetEvents={onReset}
          onClear={jest.fn()}
        />
      );
      await userEvent.click(screen.getByText("Reset (2)"));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("bulkProcessing disabled state", () => {
    it("disables the Import button when bulkProcessing is true", () => {
      render(
        <SelectionBar
          selectedCount={2}
          bulkProcessing={true}
          importEligibleCount={2}
          onImportSelected={jest.fn()}
          onClear={jest.fn()}
        />
      );
      const importBtn = screen
        .getByText("Import selected (2)")
        .closest("button");
      expect(importBtn).toBeDisabled();
    });

    it("disables Unqueue and Reset buttons when bulkProcessing is true", () => {
      render(
        <SelectionBar
          selectedCount={3}
          bulkProcessing={true}
          unqueueEligibleCount={2}
          resetEligibleCount={1}
          onUnqueueSelected={jest.fn()}
          onResetEvents={jest.fn()}
          onClear={jest.fn()}
        />
      );
      const unqueueBtn = screen.getByText("Unqueue (2)").closest("button");
      const resetBtn = screen.getByText("Reset (1)").closest("button");
      expect(unqueueBtn).toBeDisabled();
      expect(resetBtn).toBeDisabled();
    });
  });

  describe("Clear button", () => {
    it("calls onClear when Clear button is clicked", async () => {
      const onClear = jest.fn();
      render(
        <SelectionBar
          selectedCount={1}
          bulkProcessing={false}
          onClear={onClear}
        />
      );
      await userEvent.click(screen.getByText(/Clear/));
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("it.each — button visibility matrix", () => {
    it.each([
      ["unqueueEligibleCount=0, resetEligibleCount=0", 0, 0, false, false],
      ["unqueueEligibleCount=1, resetEligibleCount=0", 1, 0, true, false],
      ["unqueueEligibleCount=0, resetEligibleCount=1", 0, 1, false, true],
      ["both > 0", 3, 2, true, true],
    ])(
      "%s",
      (
        _label: string,
        unqueueCount: number,
        resetCount: number,
        expectUnqueue: boolean,
        expectReset: boolean
      ) => {
        const { unmount } = render(
          <SelectionBar
            selectedCount={5}
            bulkProcessing={false}
            unqueueEligibleCount={unqueueCount}
            resetEligibleCount={resetCount}
            onClear={jest.fn()}
          />
        );
        if (expectUnqueue) {
          expect(
            screen.getByText(`Unqueue (${unqueueCount})`)
          ).toBeInTheDocument();
        } else {
          expect(screen.queryByText(/Unqueue/)).toBeNull();
        }
        if (expectReset) {
          expect(screen.getByText(`Reset (${resetCount})`)).toBeInTheDocument();
        } else {
          expect(screen.queryByText(/Reset/)).toBeNull();
        }
        unmount();
      }
    );
  });
});
