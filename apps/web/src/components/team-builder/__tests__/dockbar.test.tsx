"use client";

/**
 * Behavioural tests for the Dockbar component.
 *
 * Dockbar is a pure-props toolbar with 3 pill buttons:
 *   - Type matchups → onOpen("matchups")
 *   - Speed tiers   → onOpen("speed")
 *   - Damage calc   → onOpen("calc")
 *
 * Tests verify:
 *   - Each pill renders and fires onOpen with the correct key
 *   - aria-pressed reflects the active drawer via split state props
 *   - Chevron direction: active pill shows ▾, inactive shows ▴
 *   - Defender species sublabel in calc pill
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { Dockbar, type DockbarProps } from "../dock/dockbar";

// =============================================================================
// Fixtures
// =============================================================================

function makeProps(overrides: Partial<DockbarProps> = {}): DockbarProps {
  return {
    onOpen: jest.fn(),
    sideDrawer: null,
    rightDrawer: null,
    bottomDrawer: null,
    fastest: 0,
    ...overrides,
  };
}

// =============================================================================
// Tests — pill rendering
// =============================================================================

describe("Dockbar — pill labels render", () => {
  it("renders the Type matchups label", () => {
    render(<Dockbar {...makeProps()} />);
    expect(screen.getByText("Type matchups")).toBeInTheDocument();
  });

  it("renders the Speed tiers label", () => {
    render(<Dockbar {...makeProps()} />);
    expect(screen.getByText("Speed tiers")).toBeInTheDocument();
  });

  it("renders the Damage calc label", () => {
    render(<Dockbar {...makeProps()} />);
    expect(screen.getByText("Damage calc")).toBeInTheDocument();
  });

  it("wraps pills in a toolbar region", () => {
    render(<Dockbar {...makeProps()} />);
    expect(
      screen.getByRole("toolbar", { name: "Builder tools" })
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Tests — click handlers
// =============================================================================

describe("Dockbar — click handlers", () => {
  it("calls onOpen('matchups') when the matchups pill is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();
    render(<Dockbar {...makeProps({ onOpen })} />);
    await user.click(screen.getByTitle("Defensive type matchups"));
    expect(onOpen).toHaveBeenCalledWith("matchups");
  });

  it("calls onOpen('speed') when the speed tiers pill is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();
    render(<Dockbar {...makeProps({ onOpen })} />);
    await user.click(screen.getByTitle("Speed tier ladder"));
    expect(onOpen).toHaveBeenCalledWith("speed");
  });

  it("calls onOpen('calc') when the damage calc pill is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();
    render(<Dockbar {...makeProps({ onOpen })} />);
    await user.click(screen.getByTitle("Damage calc"));
    expect(onOpen).toHaveBeenCalledWith("calc");
  });
});

// =============================================================================
// Tests — aria-pressed reflects split drawer state
// =============================================================================

describe("Dockbar — aria-pressed reflects active drawer", () => {
  it("matchups pill is pressed when bottomDrawer='matchups'", () => {
    render(<Dockbar {...makeProps({ bottomDrawer: "matchups" })} />);
    const btn = screen.getByTitle("Defensive type matchups");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("matchups pill is NOT pressed when sideDrawer='speed'", () => {
    render(<Dockbar {...makeProps({ sideDrawer: "speed" })} />);
    const btn = screen.getByTitle("Defensive type matchups");
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("speed pill is pressed when sideDrawer='speed'", () => {
    render(<Dockbar {...makeProps({ sideDrawer: "speed" })} />);
    expect(screen.getByTitle("Speed tier ladder")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("calc pill is pressed when rightDrawer='calc'", () => {
    render(<Dockbar {...makeProps({ rightDrawer: "calc" })} />);
    expect(screen.getByTitle("Damage calc")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("all pills are NOT pressed when all drawers are null", () => {
    render(<Dockbar {...makeProps()} />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toHaveAttribute("aria-pressed", "false");
    }
  });
});

// =============================================================================
// Tests — chevron direction
// =============================================================================

describe("Dockbar — chevron direction", () => {
  it("active matchups pill shows ▾ chevron", () => {
    render(<Dockbar {...makeProps({ bottomDrawer: "matchups" })} />);
    const matchupsBtn = screen.getByTitle("Defensive type matchups");
    expect(matchupsBtn.textContent).toContain("▾");
  });

  it("inactive matchups pill shows ▴ chevron", () => {
    render(<Dockbar {...makeProps({ sideDrawer: "speed" })} />);
    const matchupsBtn = screen.getByTitle("Defensive type matchups");
    expect(matchupsBtn.textContent).toContain("▴");
  });
});

// =============================================================================
// Tests — calc pill has no defender sub-label
// =============================================================================

describe("Dockbar — calc pill label", () => {
  it("shows only 'Damage calc' with no 'vs <defender>' sub-label", () => {
    render(<Dockbar {...makeProps()} />);
    expect(screen.getByText("Damage calc")).toBeInTheDocument();
    // The "vs <defender>" / "no target" sub-label was removed — the pill is
    // just the label + chevron now.
    expect(screen.queryByText(/vs\s/i)).not.toBeInTheDocument();
    expect(screen.queryByText("no target")).not.toBeInTheDocument();
  });
});
