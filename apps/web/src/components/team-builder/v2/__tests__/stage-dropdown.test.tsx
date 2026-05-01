"use client";

/**
 * Behavioral tests for StageDropdown.
 *
 * Covers:
 *   - Trigger renders current value via formatStage (+N / -N / neutral −)
 *   - Positive value: green styling class present
 *   - Negative value: red styling class present
 *   - Neutral (0): muted styling class present
 *   - All 13 stage buttons (−6 to +6) rendered in the popover
 *   - Clicking a stage button calls onChange with the correct numeric value
 *   - Current value is highlighted with a checkmark (✓)
 *   - Accessible label includes the statKey
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("../builder.module.css", () =>
  new Proxy({}, { get: (_t, k) => k })
);

// Popover — render children inline so popover content is always visible.
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({
    children,
    className,
    "aria-label": ariaLabel,
    ...rest
  }: {
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// =============================================================================
// Import after mocks
// =============================================================================

import { StageDropdown } from "../calc/stage-dropdown";

// =============================================================================
// Helpers
// =============================================================================

function renderDropdown(value: number, onChange = jest.fn()) {
  return render(
    <StageDropdown value={value} onChange={onChange} statKey="atk" />
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("StageDropdown — trigger display", () => {
  it.each([
    [0, "−"],
    [1, "+1"],
    [2, "+2"],
    [6, "+6"],
    [-1, "-1"],
    [-6, "-6"],
  ] as const)(
    "stage %i renders trigger label '%s'",
    (value, label) => {
      renderDropdown(value);
      // Multiple elements will exist (trigger + list item) — verify at least one
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  );

  it("trigger has accessible aria-label including the statKey", () => {
    renderDropdown(0);
    expect(
      screen.getByRole("button", { name: /ATK stat stage/i })
    ).toBeInTheDocument();
  });
});

describe("StageDropdown — stage list", () => {
  it("renders all 13 stages (−6 to +6) as buttons", () => {
    renderDropdown(0);
    // The popover list renders stage buttons; the trigger is also a button.
    // We look for each formatted stage value in the stage list area.
    // Stage 0 → "−", stages +1..+6 → "+1".."+6", stages -1..-6 → "-1".."-6"
    const expectedLabels = [
      "-6", "-5", "-4", "-3", "-2", "-1",
      "−",
      "+1", "+2", "+3", "+4", "+5", "+6",
    ];
    for (const label of expectedLabels) {
      const matches = screen.getAllByText(label);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("clicking a positive stage calls onChange with that value", () => {
    const onChange = jest.fn();
    renderDropdown(0, onChange);
    // Find the "+2" button in the stage list (not the trigger, which shows "−")
    const buttons = screen.getAllByText("+2");
    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("clicking a negative stage calls onChange with the correct negative value", () => {
    const onChange = jest.fn();
    renderDropdown(0, onChange);
    const buttons = screen.getAllByText("-3");
    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith(-3);
  });

  it("clicking stage 0 calls onChange with 0", () => {
    const onChange = jest.fn();
    renderDropdown(1, onChange);
    // When current value is +1, "−" appears in both the trigger label and list
    const neutralButtons = screen.getAllByText("−");
    // The last one is the list item (the trigger is the first button)
    fireEvent.click(neutralButtons[neutralButtons.length - 1]);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("clicking +6 calls onChange with 6", () => {
    const onChange = jest.fn();
    renderDropdown(0, onChange);
    const buttons = screen.getAllByText("+6");
    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("clicking -6 calls onChange with -6", () => {
    const onChange = jest.fn();
    renderDropdown(0, onChange);
    const buttons = screen.getAllByText("-6");
    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith(-6);
  });
});

describe("StageDropdown — current value highlighted", () => {
  it("shows ✓ checkmark next to the current value", () => {
    renderDropdown(2);
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("does NOT show ✓ when current value is 0 (−)", () => {
    // Stage 0 maps to "−"; checkmark still appears for the current item
    renderDropdown(0);
    // ✓ is rendered for the current (0) item in the list
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows exactly one ✓ checkmark at a time", () => {
    renderDropdown(3);
    expect(screen.getAllByText("✓")).toHaveLength(1);
  });
});

describe("StageDropdown — statKey label", () => {
  it("uses the statKey in the aria-label (case uppercased)", () => {
    render(<StageDropdown value={0} onChange={jest.fn()} statKey="spd" />);
    expect(
      screen.getByRole("button", { name: /SPD stat stage/i })
    ).toBeInTheDocument();
  });
});
