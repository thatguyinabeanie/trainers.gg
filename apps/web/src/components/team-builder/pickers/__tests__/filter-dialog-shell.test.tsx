"use client";

/**
 * Behavioral tests for FilterDialogShell.
 *
 * Covers:
 *   - Renders children (main content) and rail content
 *   - Search input: typing calls onChange; aria-label fallback chain; data-testid applied
 *   - No search input when search prop is omitted
 *   - Collapse toggle: clicking "Collapse filter sidebar" hides rail + shows collapsedStrip
 *   - collapsedStrip expand callback restores the rail
 *   - Optional slots: headerCenter, headerCount, headerActions, railFooter render when provided
 *   - data-testid applied to root element
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { FilterDialogShell } from "../filter-dialog-shell";

// =============================================================================
// Helpers
// =============================================================================

function renderShell(
  overrides: Partial<React.ComponentProps<typeof FilterDialogShell>> = {}
) {
  return render(
    <FilterDialogShell rail={<div>rail content</div>} {...overrides}>
      <div>main content</div>
    </FilterDialogShell>
  );
}

// =============================================================================
// Basic render
// =============================================================================

describe("FilterDialogShell — basic render", () => {
  it("renders children (main content)", () => {
    renderShell();
    expect(screen.getByText("main content")).toBeInTheDocument();
  });

  it("renders rail content when sidebar is expanded (initial state)", () => {
    renderShell();
    expect(screen.getByText("rail content")).toBeInTheDocument();
  });

  it("applies data-testid to the root element", () => {
    const { container } = render(
      <FilterDialogShell rail={<div>rail</div>} data-testid="my-shell">
        <div>body</div>
      </FilterDialogShell>
    );
    expect(container.firstChild).toHaveAttribute("data-testid", "my-shell");
  });

  it("renders optional railFooter slot when provided", () => {
    renderShell({ railFooter: <div>Clear all filters</div> });
    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("does NOT render railFooter area when prop is omitted", () => {
    renderShell();
    expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
  });

  it("renders optional headerCenter slot when provided", () => {
    renderShell({ headerCenter: <span>active-filter badge</span> });
    expect(screen.getByText("active-filter badge")).toBeInTheDocument();
  });

  it("renders optional headerCount slot when provided", () => {
    renderShell({ headerCount: <span>42 of 100</span> });
    expect(screen.getByText("42 of 100")).toBeInTheDocument();
  });

  it("renders optional headerActions slot when provided", () => {
    renderShell({ headerActions: <button>Pop out</button> });
    expect(screen.getByRole("button", { name: "Pop out" })).toBeInTheDocument();
  });
});

// =============================================================================
// Search input
// =============================================================================

describe("FilterDialogShell — search input", () => {
  it("does NOT render a text input when search prop is omitted", () => {
    renderShell();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders a text input when search prop is provided", () => {
    renderShell({
      search: { value: "", onChange: jest.fn(), placeholder: "Search…" },
    });
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies placeholder from the search prop", () => {
    renderShell({
      search: {
        value: "",
        onChange: jest.fn(),
        placeholder: "Filter by name…",
      },
    });
    expect(screen.getByPlaceholderText("Filter by name…")).toBeInTheDocument();
  });

  it("applies data-testid from search prop to the input", () => {
    renderShell({
      search: {
        value: "",
        onChange: jest.fn(),
        placeholder: "Search",
        "data-testid": "my-search-input",
      },
    });
    expect(screen.getByTestId("my-search-input")).toBeInTheDocument();
  });

  it("calls search.onChange with the accumulated typed value", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    // Stateful wrapper so the controlled input accumulates like real usage —
    // each keystroke fires onChange with the full e.target.value.
    function Harness() {
      const [value, setValue] = React.useState("");
      return (
        <FilterDialogShell
          rail={<div>rail</div>}
          search={{
            value,
            onChange: (next) => {
              setValue(next);
              onChange(next);
            },
            placeholder: "Search…",
          }}
        >
          <div>body</div>
        </FilterDialogShell>
      );
    }

    render(<Harness />);
    const input = screen.getByRole("textbox");
    await user.type(input, "pik");
    // onChange fires once per keystroke, each time with the accumulated value.
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith("pik");
  });

  it("uses ariaLabel when provided (beats placeholder)", () => {
    renderShell({
      search: {
        value: "",
        onChange: jest.fn(),
        placeholder: "Search…",
        ariaLabel: "Filter Pokémon by name",
      },
    });
    expect(
      screen.getByRole("textbox", { name: "Filter Pokémon by name" })
    ).toBeInTheDocument();
  });

  it("falls back to placeholder as aria-label when ariaLabel is omitted", () => {
    renderShell({
      search: {
        value: "",
        onChange: jest.fn(),
        placeholder: "Search items",
      },
    });
    expect(
      screen.getByRole("textbox", { name: "Search items" })
    ).toBeInTheDocument();
  });

  it("falls back to 'Search' as aria-label when neither ariaLabel nor placeholder is provided", () => {
    renderShell({
      search: { value: "", onChange: jest.fn() },
    });
    expect(screen.getByRole("textbox", { name: "Search" })).toBeInTheDocument();
  });
});

// =============================================================================
// Collapse / expand sidebar
// =============================================================================

describe("FilterDialogShell — collapse toggle", () => {
  it("shows the 'Collapse filter sidebar' button when expanded", () => {
    renderShell();
    expect(
      screen.getByRole("button", { name: "Collapse filter sidebar" })
    ).toBeInTheDocument();
  });

  it("clicking collapse hides the rail content", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(
      screen.getByRole("button", { name: "Collapse filter sidebar" })
    );
    expect(screen.queryByText("rail content")).not.toBeInTheDocument();
  });

  it("clicking collapse renders the collapsedStrip", async () => {
    const user = userEvent.setup();
    renderShell({
      collapsedStrip: (onExpand) => <button onClick={onExpand}>EXPAND</button>,
    });
    await user.click(
      screen.getByRole("button", { name: "Collapse filter sidebar" })
    );
    expect(screen.getByRole("button", { name: "EXPAND" })).toBeInTheDocument();
  });

  it("clicking the strip's expand callback restores the rail", async () => {
    const user = userEvent.setup();
    renderShell({
      collapsedStrip: (onExpand) => <button onClick={onExpand}>EXPAND</button>,
    });
    // Collapse first
    await user.click(
      screen.getByRole("button", { name: "Collapse filter sidebar" })
    );
    // Rail gone, strip visible
    expect(screen.queryByText("rail content")).not.toBeInTheDocument();

    // Expand via strip
    await user.click(screen.getByRole("button", { name: "EXPAND" }));
    expect(screen.getByText("rail content")).toBeInTheDocument();
  });

  it("does not show collapsedStrip when sidebar is expanded", () => {
    renderShell({
      collapsedStrip: (_onExpand) => <div>STRIP_CONTENT</div>,
    });
    // Initially expanded — strip should not appear
    expect(screen.queryByText("STRIP_CONTENT")).not.toBeInTheDocument();
  });

  it("hides the collapse button after collapsing", async () => {
    const user = userEvent.setup();
    renderShell({
      collapsedStrip: (onExpand) => <button onClick={onExpand}>EXPAND</button>,
    });
    await user.click(
      screen.getByRole("button", { name: "Collapse filter sidebar" })
    );
    expect(
      screen.queryByRole("button", { name: "Collapse filter sidebar" })
    ).not.toBeInTheDocument();
  });

  it("main children always remain visible regardless of sidebar state", async () => {
    const user = userEvent.setup();
    renderShell({
      collapsedStrip: (onExpand) => <button onClick={onExpand}>EXPAND</button>,
    });
    await user.click(
      screen.getByRole("button", { name: "Collapse filter sidebar" })
    );
    expect(screen.getByText("main content")).toBeInTheDocument();
  });
});
