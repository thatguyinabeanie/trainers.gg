/**
 * Tests for LandingToolbar
 *
 * Covers:
 *   - Renders current sort + density values
 *   - Changing the sort control fires onSortChange with the chosen SortMode
 *   - Toggling density fires onDensityChange with the other value
 *   - resultCount renders when provided, hidden when omitted
 *   - Accessible names present for both controls (sort select, density toggle group)
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// =============================================================================
// Module-level mocks — declared before imports so Jest hoisting works
// =============================================================================

// Mock Select — context-based native <select> variant shared across tests.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("@/components/ui/select", () => require("@trainers/test-utils/mocks/ui-select"));

// Mock ToggleGroup — Base UI ToggleGroup does not work in JSDOM.
// Base UI ToggleGroup is array-shaped: value is string[], onValueChange receives string[].
// Render a group of buttons; clicking one calls onValueChange with [value].
jest.mock("@/components/ui/toggle-group", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  function ToggleGroup({
    children,
    value,
    onValueChange,
    "aria-label": ariaLabel,
    className,
  }: {
    children: React.ReactNode;
    // Base UI ToggleGroup value is always an array
    value?: readonly string[];
    onValueChange?: (v: string[]) => void;
    "aria-label"?: string;
    type?: string;
    variant?: string;
    size?: string;
    className?: string;
  }) {
    return (
      <div role="group" aria-label={ariaLabel} className={className}>
        {React.Children.map(children, (child: React.ReactNode) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<Record<string, unknown>>,
                { _onValueChange: onValueChange, _groupValue: value ?? [] }
              )
            : child
        )}
      </div>
    );
  }

  function ToggleGroupItem({
    children,
    value,
    "aria-label": ariaLabel,
    _onValueChange,
    _groupValue,
    className,
  }: {
    children: React.ReactNode;
    value: string;
    "aria-label"?: string;
    _onValueChange?: (v: string[]) => void;
    _groupValue?: readonly string[];
    className?: string;
  }) {
    const isPressed = Array.isArray(_groupValue) && _groupValue.includes(value);
    return (
      <button
        type="button"
        aria-label={ariaLabel ?? (typeof children === "string" ? children : undefined)}
        aria-pressed={isPressed}
        data-value={value}
        className={className}
        onClick={() => _onValueChange?.([value])}
      >
        {children}
      </button>
    );
  }

  return { ToggleGroup, ToggleGroupItem };
});

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { LandingToolbar } from "../landing-toolbar";
import { type SortMode, type Density } from "../../persistence/landing-prefs-types";

// =============================================================================
// Test suite
// =============================================================================

describe("LandingToolbar", () => {
  const onSortChange = jest.fn<(s: SortMode) => void>();
  const onDensityChange = jest.fn<(d: Density) => void>();

  beforeEach(() => {
    onSortChange.mockClear();
    onDensityChange.mockClear();
  });

  function renderToolbar(overrides: {
    sort?: SortMode;
    density?: Density;
    resultCount?: number;
  } = {}) {
    const { sort = "recent", density = "comfortable", resultCount } = overrides;
    return render(
      <LandingToolbar
        sort={sort}
        density={density}
        resultCount={resultCount}
        onSortChange={onSortChange}
        onDensityChange={onDensityChange}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe("renders current state", () => {
    it("renders the current sort value in the select", () => {
      renderToolbar({ sort: "name" });
      const selectEl = screen.getByTestId("select-root");
      expect(selectEl).toHaveAttribute("data-value", "name");
    });

    it("renders the current density as pressed in the toggle group", () => {
      renderToolbar({ density: "compact" });
      const compactBtn = screen.getByRole("button", { name: "Compact density" });
      expect(compactBtn).toHaveAttribute("aria-pressed", "true");
      const comfortableBtn = screen.getByRole("button", { name: "Comfortable density" });
      expect(comfortableBtn).toHaveAttribute("aria-pressed", "false");
    });

    it("renders comfortable density as pressed by default", () => {
      renderToolbar({ density: "comfortable" });
      const comfortableBtn = screen.getByRole("button", { name: "Comfortable density" });
      expect(comfortableBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  // ---------------------------------------------------------------------------
  // Sort control
  // ---------------------------------------------------------------------------

  describe("sort control", () => {
    // The shared mock renders a native <select aria-label="Sort teams by">.
    // Use userEvent.selectOptions to drive value changes.

    it("calls onSortChange with 'name' when Name option is selected", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "recent" });
      const sortSelect = screen.getByLabelText("Sort teams by");
      await user.selectOptions(sortSelect, "name");
      expect(onSortChange).toHaveBeenCalledTimes(1);
      expect(onSortChange).toHaveBeenCalledWith("name");
    });

    it("calls onSortChange with 'format' when Format option is selected", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "recent" });
      const sortSelect = screen.getByLabelText("Sort teams by");
      await user.selectOptions(sortSelect, "format");
      expect(onSortChange).toHaveBeenCalledWith("format");
    });

    it("calls onSortChange with 'completeness' when Completeness option is selected", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "recent" });
      const sortSelect = screen.getByLabelText("Sort teams by");
      await user.selectOptions(sortSelect, "completeness");
      expect(onSortChange).toHaveBeenCalledWith("completeness");
    });

    it("calls onSortChange with 'custom' when Custom option is selected", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "recent" });
      const sortSelect = screen.getByLabelText("Sort teams by");
      await user.selectOptions(sortSelect, "custom");
      expect(onSortChange).toHaveBeenCalledWith("custom");
    });

    it("calls onSortChange with 'recent' when Recent option is selected", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "name" });
      const sortSelect = screen.getByLabelText("Sort teams by");
      await user.selectOptions(sortSelect, "recent");
      expect(onSortChange).toHaveBeenCalledWith("recent");
    });
  });

  // ---------------------------------------------------------------------------
  // Density toggle
  // ---------------------------------------------------------------------------

  describe("density toggle", () => {
    it("calls onDensityChange with 'compact' when Compact is clicked while comfortable is active", async () => {
      const user = userEvent.setup();
      renderToolbar({ density: "comfortable" });
      const compactBtn = screen.getByRole("button", { name: "Compact density" });
      await user.click(compactBtn);
      expect(onDensityChange).toHaveBeenCalledTimes(1);
      expect(onDensityChange).toHaveBeenCalledWith("compact");
    });

    it("calls onDensityChange with 'comfortable' when Comfortable is clicked while compact is active", async () => {
      const user = userEvent.setup();
      renderToolbar({ density: "compact" });
      const comfortableBtn = screen.getByRole("button", { name: "Comfortable density" });
      await user.click(comfortableBtn);
      expect(onDensityChange).toHaveBeenCalledTimes(1);
      expect(onDensityChange).toHaveBeenCalledWith("comfortable");
    });
  });

  // ---------------------------------------------------------------------------
  // Result count
  // ---------------------------------------------------------------------------

  describe("resultCount", () => {
    it("renders '5 teams' when resultCount is 5", () => {
      renderToolbar({ resultCount: 5 });
      expect(screen.getByText("5 teams")).toBeInTheDocument();
    });

    it("renders '1 team' (singular) when resultCount is 1", () => {
      renderToolbar({ resultCount: 1 });
      expect(screen.getByText("1 team")).toBeInTheDocument();
    });

    it("renders '0 teams' when resultCount is 0", () => {
      renderToolbar({ resultCount: 0 });
      expect(screen.getByText("0 teams")).toBeInTheDocument();
    });

    it("does not render any teams count when resultCount is omitted", () => {
      renderToolbar();
      expect(screen.queryByText(/teams?/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  describe("accessibility", () => {
    it("has an accessible label for the sort select trigger", () => {
      renderToolbar();
      expect(
        screen.getByRole("combobox", { name: "Sort teams by" })
      ).toBeInTheDocument();
    });

    it("has an accessible label for the density toggle group", () => {
      renderToolbar();
      expect(
        screen.getByRole("group", { name: "View density" })
      ).toBeInTheDocument();
    });

    it("has accessible labels on each density option button", () => {
      renderToolbar();
      expect(
        screen.getByRole("button", { name: "Comfortable density" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Compact density" })
      ).toBeInTheDocument();
    });

    it("renders a visible 'Sort' label associated with the select", () => {
      renderToolbar();
      expect(screen.getByText("Sort")).toBeInTheDocument();
    });
  });
});
