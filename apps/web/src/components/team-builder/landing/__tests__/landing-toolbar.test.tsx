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
import React from "react";

// =============================================================================
// Module-level mocks — declared before imports so Jest hoisting works
// =============================================================================

// Mock Select — Base UI Select uses portals/floating-ui that JSDOM can't handle.
// Provide a thin wrapper that exposes value and fires onValueChange when the
// hidden trigger button is clicked with a specific value.
jest.mock("@/components/ui/select", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  function Select({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) {
    return (
      <div data-testid="select" data-value={value}>
        {React.Children.map(children, (child: React.ReactNode) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<Record<string, unknown>>,
                { _onValueChange: onValueChange, _currentValue: value }
              )
            : child
        )}
      </div>
    );
  }

  function SelectTrigger({
    children,
    className,
    id,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    className?: string;
    id?: string;
    "aria-label"?: string;
  }) {
    return (
      <button
        id={id}
        className={className}
        aria-label={ariaLabel ?? "Sort teams by"}
        role="combobox"
        aria-haspopup="listbox"
      >
        {children}
      </button>
    );
  }

  function SelectValue({
    placeholder,
    _currentValue,
  }: {
    placeholder?: string;
    _currentValue?: string;
  }) {
    return <span data-testid="select-value">{_currentValue ?? placeholder}</span>;
  }

  function SelectContent({
    children,
    _onValueChange,
  }: {
    children: React.ReactNode;
    _onValueChange?: (v: string) => void;
  }) {
    return (
      <div data-testid="select-content">
        {React.Children.map(children, (child: React.ReactNode) =>
          React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<Record<string, unknown>>,
                { _onValueChange }
              )
            : child
        )}
      </div>
    );
  }

  function SelectItem({
    children,
    value,
    _onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    _onValueChange?: (v: string) => void;
  }) {
    return (
      <button
        role="option"
        data-value={value}
        onClick={() => _onValueChange?.(value)}
      >
        {children}
      </button>
    );
  }

  return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
});

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
      const selectEl = screen.getByTestId("select");
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
    it("calls onSortChange with 'name' when Name option is clicked", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "recent" });
      const nameOption = screen.getByRole("option", { name: "Name" });
      await user.click(nameOption);
      expect(onSortChange).toHaveBeenCalledTimes(1);
      expect(onSortChange).toHaveBeenCalledWith("name");
    });

    it("calls onSortChange with 'format' when Format option is clicked", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "recent" });
      const formatOption = screen.getByRole("option", { name: "Format" });
      await user.click(formatOption);
      expect(onSortChange).toHaveBeenCalledWith("format");
    });

    it("calls onSortChange with 'completeness' when Completeness option is clicked", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "recent" });
      const option = screen.getByRole("option", { name: "Completeness" });
      await user.click(option);
      expect(onSortChange).toHaveBeenCalledWith("completeness");
    });

    it("calls onSortChange with 'custom' when Custom option is clicked", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "recent" });
      const option = screen.getByRole("option", { name: "Custom" });
      await user.click(option);
      expect(onSortChange).toHaveBeenCalledWith("custom");
    });

    it("calls onSortChange with 'recent' when Recent option is clicked", async () => {
      const user = userEvent.setup();
      renderToolbar({ sort: "name" });
      const option = screen.getByRole("option", { name: "Recent" });
      await user.click(option);
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
