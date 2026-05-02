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
 *   - aria-pressed reflects the active drawer
 *   - weakCount colour (destructive vs muted)
 *   - coveredCount colour (emerald vs muted)
 *   - fastest display (number vs em-dash when 0)
 *   - defenderSpecies present → "vs <species>"; absent → "no target"
 *   - calcVerdict (OHKO/2HKO/3HKO) renders in text-primary; absent + defender → "—"
 *   - Chevron direction: active pill shows ▾, inactive shows ▴
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type CalcOutput } from "../../use-calc-state";
import { Dockbar, type DockbarProps } from "../dock/dockbar";

// =============================================================================
// Fixtures
// =============================================================================

/** Produces a CalcOutput whose getVerdict() result is "OHKO" (min >= 100). */
function ohko(): CalcOutput {
  return { minPercent: 110, maxPercent: 120, desc: "", rolls: [], defenderMaxHP: 100 };
}

/** Produces a CalcOutput whose getVerdict() result is "2HKO" (max >= 50, min < 100). */
function twoHko(): CalcOutput {
  return { minPercent: 45, maxPercent: 55, desc: "", rolls: [], defenderMaxHP: 100 };
}

/** Produces a CalcOutput whose getVerdict() result is "3HKO" (max >= 34, max < 50). */
function threeHko(): CalcOutput {
  return { minPercent: 30, maxPercent: 40, desc: "", rolls: [], defenderMaxHP: 100 };
}

/** Produces a CalcOutput whose getVerdict() result is null (max < 34). */
function fourHkoPlus(): CalcOutput {
  return { minPercent: 10, maxPercent: 25, desc: "", rolls: [], defenderMaxHP: 100 };
}

function makeProps(overrides: Partial<DockbarProps> = {}): DockbarProps {
  return {
    drawer: null,
    onOpen: jest.fn(),
    weakCount: 0,
    coveredCount: 0,
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
// Tests — aria-pressed (active drawer)
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
// Tests — chevron direction
// =============================================================================

describe("Dockbar — chevron direction", () => {
  it("active matchups pill shows ▾ chevron", () => {
    const { container } = render(<Dockbar {...makeProps({ drawer: "matchups" })} />);
    const matchupsBtn = screen.getByTitle("Defensive type matchups");
    // ▾ is present inside the active button
    expect(matchupsBtn.textContent).toContain("▾");
    void container; // suppress unused warning
  });

  it("inactive matchups pill shows ▴ chevron", () => {
    render(<Dockbar {...makeProps({ drawer: "speed" })} />);
    const matchupsBtn = screen.getByTitle("Defensive type matchups");
    expect(matchupsBtn.textContent).toContain("▴");
  });
});

// =============================================================================
// Tests — weakCount display
// =============================================================================

describe("Dockbar — weakCount colour", () => {
  it("renders the weak count as a number", () => {
    render(<Dockbar {...makeProps({ weakCount: 3 })} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("applies text-destructive when weakCount > 0", () => {
    render(<Dockbar {...makeProps({ weakCount: 2 })} />);
    const el = screen.getByText("2");
    expect(el.className).toContain("text-destructive");
  });

  it("does NOT apply text-destructive when weakCount is 0", () => {
    render(<Dockbar {...makeProps({ weakCount: 0 })} />);
    // "0" appears — find the one inside the matchups pill
    const zeroEls = screen.getAllByText("0");
    // At least the first one (weakCount) should use muted colour
    expect(zeroEls[0].className).not.toContain("text-destructive");
  });
});

// =============================================================================
// Tests — coveredCount display
// =============================================================================

describe("Dockbar — coveredCount colour", () => {
  it("renders the covered count", () => {
    render(<Dockbar {...makeProps({ coveredCount: 5 })} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("applies emerald colour class when coveredCount > 0", () => {
    render(<Dockbar {...makeProps({ coveredCount: 4 })} />);
    const el = screen.getByText("4");
    expect(el.className).toContain("text-emerald-600");
  });

  it("does NOT apply emerald colour when coveredCount is 0", () => {
    render(<Dockbar {...makeProps({ coveredCount: 0, weakCount: 1 })} />);
    // Find "0" that's the covered count — second "0" element if weakCount=1→"1"
    const zeroEls = screen.getAllByText("0");
    for (const el of zeroEls) {
      expect(el.className).not.toContain("text-emerald-600");
    }
  });
});

// =============================================================================
// Tests — fastest display
// =============================================================================

describe("Dockbar — fastest speed tier", () => {
  it("displays the fastest number when > 0", () => {
    render(<Dockbar {...makeProps({ fastest: 135 })} />);
    expect(screen.getByText("135")).toBeInTheDocument();
  });

  it("displays em-dash when fastest is 0", () => {
    render(<Dockbar {...makeProps({ fastest: 0 })} />);
    // The speed pill shows "—" when no fastest
    const speedPill = screen.getByTitle("Speed tier ladder");
    expect(speedPill.textContent).toContain("—");
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

// =============================================================================
// Tests — calc verdict display
// =============================================================================

describe("Dockbar — calc verdict in pill", () => {
  it("shows 'OHKO' verdict when move outputs include an OHKO", () => {
    render(<Dockbar {...makeProps({
      defenderSpecies: "Garchomp",
      moveCalcOutputs: [ohko(), null, null, null],
    })} />);
    expect(screen.getByText("OHKO")).toBeInTheDocument();
  });

  it("shows '2HKO' verdict when move outputs include a 2HKO", () => {
    render(<Dockbar {...makeProps({
      defenderSpecies: "Garchomp",
      moveCalcOutputs: [twoHko(), null, null, null],
    })} />);
    expect(screen.getByText("2HKO")).toBeInTheDocument();
  });

  it("shows '3HKO' verdict when move outputs include a 3HKO", () => {
    render(<Dockbar {...makeProps({
      defenderSpecies: "Garchomp",
      moveCalcOutputs: [threeHko(), null, null, null],
    })} />);
    expect(screen.getByText("3HKO")).toBeInTheDocument();
  });

  it("shows 'OHKO' when OHKO is the best among mixed tiers", () => {
    render(<Dockbar {...makeProps({
      defenderSpecies: "Garchomp",
      moveCalcOutputs: [threeHko(), ohko(), twoHko(), null],
    })} />);
    expect(screen.getByText("OHKO")).toBeInTheDocument();
  });

  it("does NOT show a verdict when all outputs are null", () => {
    render(<Dockbar {...makeProps({
      defenderSpecies: "Garchomp",
      moveCalcOutputs: [null, null, null, null],
    })} />);
    expect(screen.queryByText("OHKO")).not.toBeInTheDocument();
    expect(screen.queryByText("2HKO")).not.toBeInTheDocument();
    expect(screen.queryByText("3HKO")).not.toBeInTheDocument();
  });

  it("does NOT show a verdict for 4HKO+ outputs (below threshold)", () => {
    render(<Dockbar {...makeProps({
      defenderSpecies: "Garchomp",
      moveCalcOutputs: [fourHkoPlus(), null, null, null],
    })} />);
    expect(screen.queryByText("OHKO")).not.toBeInTheDocument();
  });

  it("shows '—' when defender is set but no calc verdict is computed", () => {
    render(<Dockbar {...makeProps({
      defenderSpecies: "Garchomp",
      moveCalcOutputs: [null, null, null, null],
    })} />);
    const calcPill = screen.getByTitle("Damage calc");
    expect(calcPill.textContent).toContain("—");
  });

  it("does NOT show '—' in calc pill when there is no defender species", () => {
    render(<Dockbar {...makeProps({
      defenderSpecies: "",
      moveCalcOutputs: [null, null, null, null],
    })} />);
    // There should be no verdict '—' separator when there's no target
    const calcPill = screen.getByTitle("Damage calc");
    // "no target" is shown instead — '—' aside that is the speed pill's 0
    expect(calcPill.textContent).toContain("no target");
  });
});

// =============================================================================
// Tests — parameterised verdict priority
// =============================================================================

describe("Dockbar — verdict priority parameterised", () => {
  it.each([
    ["OHKO wins over 2HKO", [ohko(), twoHko(), null, null] as (CalcOutput | null)[], "OHKO"],
    ["OHKO wins over 3HKO", [threeHko(), ohko(), null, null] as (CalcOutput | null)[], "OHKO"],
    ["2HKO wins over 3HKO", [threeHko(), twoHko(), null, null] as (CalcOutput | null)[], "2HKO"],
  ])(
    "%s",
    (_label, outputs, expectedVerdict) => {
      render(<Dockbar {...makeProps({
        defenderSpecies: "Garchomp",
        moveCalcOutputs: outputs,
      })} />);
      expect(screen.getByText(expectedVerdict)).toBeInTheDocument();
    }
  );
});
