import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// =============================================================================
// Module-level mocks
// =============================================================================

// Base UI Input → plain <input>
jest.mock("@/components/ui/input", () => ({
  Input: React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<"input">
  >(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={className} {...props} />;
  }),
}));

// Base UI Button → plain <button>
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
    "aria-label": ariaLabel,
    "aria-disabled": ariaDisabled,
    variant: _variant,
    size: _size,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      type={type ?? "button"}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-disabled={ariaDisabled}
      {...rest}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/select", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@trainers/test-utils/mocks/ui-select")
);

// Lucide icons → lightweight SVG stubs
jest.mock("lucide-react", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@trainers/test-utils/mocks/lucide-react").default
);

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { CriteriaBuilder } from "../criteria-builder";
import { type Predicate } from "../search-types";

// =============================================================================
// Helpers
// =============================================================================

/** Render CriteriaBuilder with sensible defaults. */
function setup(
  overrides: Partial<{
    initialName: string;
    initialCriteria: Predicate[];
    onSave: jest.Mock;
    onCancel: jest.Mock;
  }> = {}
) {
  const onSave = overrides.onSave ?? jest.fn();
  const onCancel = overrides.onCancel;

  render(
    <CriteriaBuilder
      initialName={overrides.initialName}
      initialCriteria={overrides.initialCriteria}
      onSave={onSave}
      onCancel={onCancel}
    />
  );

  return { onSave, onCancel };
}

/**
 * Return all condition rows in the rendered list.
 * Each item in the returned array is the list-item element.
 */
function getConditionRows() {
  const list = screen.queryByRole("list", { name: /conditions/i });
  if (!list) return [];
  return within(list).getAllByRole("listitem");
}

/**
 * Get the type <select> within a given listitem row.
 * The mock renders a bare <select> inside the SelectContent.
 * We identify it by being the first <select> in the row.
 */
function getTypeSelectInRow(rowEl: HTMLElement) {
  const selects = rowEl.querySelectorAll("select");
  return selects[0] as HTMLSelectElement;
}

// =============================================================================
// Test suites
// =============================================================================

describe("CriteriaBuilder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Initial rendering
  // ---------------------------------------------------------------------------

  describe("initial rendering", () => {
    it("renders the folder name input", () => {
      setup();
      expect(
        screen.getByRole("textbox", { name: /folder name/i })
      ).toBeInTheDocument();
    });

    it("starts with one empty text row when no initialCriteria provided", () => {
      setup();
      const rows = getConditionRows();
      expect(rows).toHaveLength(1);
    });

    it("populates name from initialName prop", () => {
      setup({ initialName: "My Folder" });
      const nameInput = screen.getByRole("textbox", { name: /folder name/i });
      expect(nameInput).toHaveValue("My Folder");
    });

    it("seeds rows from initialCriteria", () => {
      const initialCriteria: Predicate[] = [
        { kind: "text", value: "miraidon" },
        { kind: "flag", flag: "incomplete" },
      ];
      setup({ initialCriteria });
      expect(getConditionRows()).toHaveLength(2);
    });

    it("renders the Save and Add condition buttons", () => {
      setup();
      expect(
        screen.getByRole("button", { name: /save folder/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /add condition/i })
      ).toBeInTheDocument();
    });

    it("renders a Cancel button when onCancel is provided", () => {
      setup({ onCancel: jest.fn() });
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it("does NOT render a Cancel button when onCancel is omitted", () => {
      setup();
      expect(
        screen.queryByRole("button", { name: /cancel/i })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Save button disabled/enabled logic
  // ---------------------------------------------------------------------------

  describe("save button disabled state", () => {
    it("is disabled when name is empty and row value is empty", () => {
      setup();
      expect(screen.getByRole("button", { name: /save folder/i })).toBeDisabled();
    });

    it("is disabled when name is non-empty but no valid predicate exists", async () => {
      const user = userEvent.setup();
      setup();
      const nameInput = screen.getByRole("textbox", { name: /folder name/i });
      await user.type(nameInput, "My Smart Folder");
      // The one row has an empty text value — not yet valid
      expect(screen.getByRole("button", { name: /save folder/i })).toBeDisabled();
    });

    it("is disabled when a valid predicate exists but name is empty", async () => {
      const user = userEvent.setup();
      setup();
      // Fill in the text row
      const textInput = screen.getByRole("textbox", { name: /text value/i });
      await user.type(textInput, "miraidon");
      expect(screen.getByRole("button", { name: /save folder/i })).toBeDisabled();
    });

    it("is enabled when name is non-empty AND at least one valid predicate", async () => {
      const user = userEvent.setup();
      setup();
      const nameInput = screen.getByRole("textbox", { name: /folder name/i });
      await user.type(nameInput, "Has Miraidon");

      const textInput = screen.getByRole("textbox", { name: /text value/i });
      await user.type(textInput, "miraidon");

      expect(
        screen.getByRole("button", { name: /save folder/i })
      ).not.toBeDisabled();
    });

    it("flag rows are always valid once type is set (no value needed)", async () => {
      const user = userEvent.setup();
      setup();

      // Change the first row's type to "flag"
      const rows = getConditionRows();
      const typeSelect = getTypeSelectInRow(rows[0]!);
      await user.selectOptions(typeSelect, "flag");

      // Name is still empty — save should remain disabled
      expect(screen.getByRole("button", { name: /save folder/i })).toBeDisabled();

      // Now fill the name
      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "Incomplete"
      );

      expect(
        screen.getByRole("button", { name: /save folder/i })
      ).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Adding and removing rows
  // ---------------------------------------------------------------------------

  describe("adding rows", () => {
    it("appends a new row when Add condition is clicked", async () => {
      const user = userEvent.setup();
      setup();
      expect(getConditionRows()).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: /add condition/i }));
      expect(getConditionRows()).toHaveLength(2);
    });

    it("can add multiple rows", async () => {
      const user = userEvent.setup();
      setup();
      const addBtn = screen.getByRole("button", { name: /add condition/i });
      await user.click(addBtn);
      await user.click(addBtn);
      expect(getConditionRows()).toHaveLength(3);
    });
  });

  describe("removing rows", () => {
    it("removes the corresponding row when × is clicked", async () => {
      const user = userEvent.setup();
      setup();

      // Add a second row so we have something to remove
      await user.click(screen.getByRole("button", { name: /add condition/i }));
      expect(getConditionRows()).toHaveLength(2);

      // Remove the first row
      const rows = getConditionRows();
      const removeBtn = within(rows[0]!).getByRole("button", {
        name: /remove condition/i,
      });
      await user.click(removeBtn);

      expect(getConditionRows()).toHaveLength(1);
    });

    it("Save is disabled after the only valid row is removed", async () => {
      const user = userEvent.setup();
      setup();

      // Make the row valid + fill name
      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "My Folder"
      );
      const textInput = screen.getByRole("textbox", { name: /text value/i });
      await user.type(textInput, "miraidon");
      expect(
        screen.getByRole("button", { name: /save folder/i })
      ).not.toBeDisabled();

      // Remove the only row
      const rows = getConditionRows();
      await user.click(
        within(rows[0]!).getByRole("button", { name: /remove condition/i })
      );
      expect(screen.getByRole("button", { name: /save folder/i })).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Switching row types
  // ---------------------------------------------------------------------------

  describe("switching row type", () => {
    it("shows a text input for 'text' kind", () => {
      setup();
      expect(
        screen.getByRole("textbox", { name: /text value/i })
      ).toBeInTheDocument();
    });

    it("shows field select + value input for 'field' kind", async () => {
      const user = userEvent.setup();
      setup();

      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[0]!), "field");

      expect(
        screen.getByRole("combobox", { name: /field name/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /field value/i })
      ).toBeInTheDocument();
    });

    it("shows a flag select for 'flag' kind", async () => {
      const user = userEvent.setup();
      setup();

      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[0]!), "flag");

      expect(
        screen.getByRole("combobox", { name: /flag value/i })
      ).toBeInTheDocument();
      // No text input for flag
      expect(
        screen.queryByRole("textbox", { name: /text value/i })
      ).not.toBeInTheDocument();
    });

    it("shows a text input for 'format' kind", async () => {
      const user = userEvent.setup();
      setup();

      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[0]!), "format");

      expect(
        screen.getByRole("textbox", { name: /format value/i })
      ).toBeInTheDocument();
    });

    it("shows a number input for 'updated_within' kind", async () => {
      const user = userEvent.setup();
      setup();

      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[0]!), "updated_within");

      expect(screen.getByRole("spinbutton", { name: /days/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. onSave called with correct Predicate[] and name
  // ---------------------------------------------------------------------------

  describe("onSave output", () => {
    it("calls onSave with the correct name and a text predicate", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "Search Miraidon"
      );
      await user.type(
        screen.getByRole("textbox", { name: /text value/i }),
        "miraidon"
      );
      await user.click(screen.getByRole("button", { name: /save folder/i }));

      expect(onSave).toHaveBeenCalledTimes(1);
      const [savedName, savedCriteria] = onSave.mock.calls[0] as [
        string,
        Predicate[],
      ];
      expect(savedName).toBe("Search Miraidon");
      expect(savedCriteria).toEqual<Predicate[]>([
        { kind: "text", value: "miraidon" },
      ]);
    });

    it("calls onSave with a field predicate", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      // Name
      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "Has Protect"
      );

      // Switch row to "field"
      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[0]!), "field");

      // Change the field selector to "move"
      const fieldSelect = screen.getByRole("combobox", { name: /field name/i });
      await user.selectOptions(fieldSelect, "move");

      // Fill value
      await user.type(
        screen.getByRole("textbox", { name: /field value/i }),
        "protect"
      );

      await user.click(screen.getByRole("button", { name: /save folder/i }));

      const [savedName, savedCriteria] = onSave.mock.calls[0] as [
        string,
        Predicate[],
      ];
      expect(savedName).toBe("Has Protect");
      expect(savedCriteria).toEqual<Predicate[]>([
        { kind: "field", field: "move", value: "protect" },
      ]);
    });

    it("calls onSave with a flag predicate", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "Incomplete"
      );

      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[0]!), "flag");

      // Change the flag to "incomplete"
      const flagSelect = screen.getByRole("combobox", { name: /flag value/i });
      await user.selectOptions(flagSelect, "incomplete");

      await user.click(screen.getByRole("button", { name: /save folder/i }));

      const [savedName, savedCriteria] = onSave.mock.calls[0] as [
        string,
        Predicate[],
      ];
      expect(savedName).toBe("Incomplete");
      expect(savedCriteria).toEqual<Predicate[]>([
        { kind: "flag", flag: "incomplete" },
      ]);
    });

    it("calls onSave with a format predicate", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "Reg H"
      );

      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[0]!), "format");

      await user.type(
        screen.getByRole("textbox", { name: /format value/i }),
        "reg-h"
      );

      await user.click(screen.getByRole("button", { name: /save folder/i }));

      const [_name, savedCriteria] = onSave.mock.calls[0] as [
        string,
        Predicate[],
      ];
      expect(savedCriteria).toEqual<Predicate[]>([
        { kind: "format", value: "reg-h" },
      ]);
    });

    it("calls onSave with an updated_within predicate", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "Recent"
      );

      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[0]!), "updated_within");

      await user.type(screen.getByRole("spinbutton", { name: /days/i }), "7");

      await user.click(screen.getByRole("button", { name: /save folder/i }));

      const [_name, savedCriteria] = onSave.mock.calls[0] as [
        string,
        Predicate[],
      ];
      expect(savedCriteria).toEqual<Predicate[]>([
        { kind: "updated_within", days: 7 },
      ]);
    });

    it("builds the correct Predicate[] from multiple rows of different kinds", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "Multi-condition"
      );

      // Row 1: text "miraidon"
      await user.type(
        screen.getByRole("textbox", { name: /text value/i }),
        "miraidon"
      );

      // Add a second row
      await user.click(screen.getByRole("button", { name: /add condition/i }));

      // Row 2: flag = incomplete
      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[1]!), "flag");
      const flagSelect = screen.getByRole("combobox", { name: /flag value/i });
      await user.selectOptions(flagSelect, "incomplete");

      // Add a third row
      await user.click(screen.getByRole("button", { name: /add condition/i }));

      // Row 3: format = reg-h
      const rows2 = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows2[2]!), "format");
      const formatInputs = screen.getAllByRole("textbox", {
        name: /format value/i,
      });
      await user.type(formatInputs[0]!, "reg-h");

      await user.click(screen.getByRole("button", { name: /save folder/i }));

      const [savedName, savedCriteria] = onSave.mock.calls[0] as [
        string,
        Predicate[],
      ];
      expect(savedName).toBe("Multi-condition");
      expect(savedCriteria).toEqual<Predicate[]>([
        { kind: "text", value: "miraidon" },
        { kind: "flag", flag: "incomplete" },
        { kind: "format", value: "reg-h" },
      ]);
    });

    it("drops empty/invalid rows before calling onSave", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "Selective"
      );

      // Row 1: leave empty (text, no value)
      // Add row 2 and make it valid
      await user.click(screen.getByRole("button", { name: /add condition/i }));
      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[1]!), "flag");

      await user.click(screen.getByRole("button", { name: /save folder/i }));

      const [, savedCriteria] = onSave.mock.calls[0] as [string, Predicate[]];
      // Only the flag row should be present — the empty text row is dropped
      expect(savedCriteria).toEqual<Predicate[]>([
        { kind: "flag", flag: "complete" },
      ]);
    });

    it("trims whitespace from name and text values", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "  Trimmed  "
      );
      await user.type(
        screen.getByRole("textbox", { name: /text value/i }),
        "  miraidon  "
      );
      await user.click(screen.getByRole("button", { name: /save folder/i }));

      const [savedName, savedCriteria] = onSave.mock.calls[0] as [
        string,
        Predicate[],
      ];
      expect(savedName).toBe("Trimmed");
      expect(savedCriteria[0]).toEqual<Predicate>({
        kind: "text",
        value: "miraidon",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 6. onCancel fires
  // ---------------------------------------------------------------------------

  describe("onCancel", () => {
    it("fires onCancel when the Cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = jest.fn();
      setup({ onCancel });

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("does not call onSave when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      const onCancel = jest.fn();
      setup({ onSave, onCancel });

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Removing a row drops its predicate
  // ---------------------------------------------------------------------------

  describe("row removal reflects in output", () => {
    it("removes the row's predicate from the eventual onSave result", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      setup({ onSave });

      await user.type(
        screen.getByRole("textbox", { name: /folder name/i }),
        "After remove"
      );

      // Row 1: text "miraidon"
      await user.type(
        screen.getByRole("textbox", { name: /text value/i }),
        "miraidon"
      );

      // Add row 2: flag = legal
      await user.click(screen.getByRole("button", { name: /add condition/i }));
      const rows = getConditionRows();
      await user.selectOptions(getTypeSelectInRow(rows[1]!), "flag");
      const flagSelect = screen.getByRole("combobox", { name: /flag value/i });
      await user.selectOptions(flagSelect, "legal");

      // Remove row 1
      const rows2 = getConditionRows();
      await user.click(
        within(rows2[0]!).getByRole("button", { name: /remove condition/i })
      );

      await user.click(screen.getByRole("button", { name: /save folder/i }));

      const [, savedCriteria] = onSave.mock.calls[0] as [string, Predicate[]];
      // Only the flag row should remain
      expect(savedCriteria).toEqual<Predicate[]>([
        { kind: "flag", flag: "legal" },
      ]);
    });
  });
});
