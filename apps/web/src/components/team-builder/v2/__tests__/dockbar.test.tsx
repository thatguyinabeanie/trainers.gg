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
 *   - aria-pressed reflects the active drawer (supporting both legacy and split state)
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
    drawer: null,
    onOpen: jest.fn(),
    fastest: 0,
    defenderSpecies: "",
    moveCalcOutputs: [null, null, null, null],
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
    expect(screen.getByRole("toolbar", { name: "Builder tools" })).toBeInTheDocument();
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
// Tests — aria-pressed (active drawer via legacy prop)
// =============================================================================

describe("Dockbar — aria-pressed reflects active drawer", () => {
  it("matchups pill is pressed when drawer='matchups'", () => {
    render(<Dockbar {...makeProps({ drawer: "matchups" })} />);
    const btn = screen.getByTitle("Defensive type matchups");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("matchups pill is NOT pressed when drawer='speed'", () => {
    render(<Dockbar {...makeProps({ drawer: "speed" })} />);
    const btn = screen.getByTitle("Defensive type matchups");
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("speed pill is pressed when drawer='speed'", () => {
    render(<Dockbar {...makeProps({ drawer: "speed" })} />);
    expect(screen.getByTitle("Speed tier ladder")).toHaveAttribute("aria-pressed", "true");
  });

  it("calc pill is pressed when drawer='calc'", () => {
    render(<Dockbar {...makeProps({ drawer: "calc" })} />);
    expect(screen.getByTitle("Damage calc")).toHaveAttribute("aria-pressed", "true");
  });

  it("all pills are NOT pressed when drawer=null", () => {
    render(<Dockbar {...makeProps({ drawer: null })} />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toHaveAttribute("aria-pressed", "false");
    }
  });
});

// =============================================================================
// Tests — split state (sideDrawer / bottomDrawer)
// =============================================================================

describe("Dockbar — split drawer state", () => {
  it("uses sideDrawer for speed active state", () => {
    render(<Dockbar {...makeProps({ sideDrawer: "speed" })} />);
    expect(screen.getByTitle("Speed tier ladder")).toHaveAttribute("aria-pressed", "true");
  });

  it("uses sideDrawer for calc active state", () => {
    render(<Dockbar {...makeProps({ sideDrawer: "calc" })} />);
    expect(screen.getByTitle("Damage calc")).toHaveAttribute("aria-pressed", "true");
  });

  it("uses bottomDrawer for matchups active state", () => {
    render(<Dockbar {...makeProps({ bottomDrawer: "matchups" })} />);
    expect(screen.getByTitle("Defensive type matchups")).toHaveAttribute("aria-pressed", "true");
  });
});

// =============================================================================
// Tests — chevron direction
// =============================================================================

describe("Dockbar — chevron direction", () => {
  it("active matchups pill shows ▾ chevron", () => {
    render(<Dockbar {...makeProps({ drawer: "matchups" })} />);
    const matchupsBtn = screen.getByTitle("Defensive type matchups");
    expect(matchupsBtn.textContent).toContain("▾");
  });

  it("inactive matchups pill shows ▴ chevron", () => {
    render(<Dockbar {...makeProps({ drawer: "speed" })} />);
    const matchupsBtn = screen.getByTitle("Defensive type matchups");
    expect(matchupsBtn.textContent).toContain("▴");
  });
});

// =============================================================================
// Tests — defender species sublabel
// =============================================================================

describe("Dockbar — defender species sublabel", () => {
  it("shows 'vs <species>' when defenderSpecies is set", () => {
    render(<Dockbar {...makeProps({ defenderSpecies: "Incineroar" })} />);
    expect(screen.getByText("vs Incineroar")).toBeInTheDocument();
  });

  it("shows 'no target' when defenderSpecies is empty", () => {
    render(<Dockbar {...makeProps({ defenderSpecies: "" })} />);
    expect(screen.getByText("no target")).toBeInTheDocument();
  });
});
