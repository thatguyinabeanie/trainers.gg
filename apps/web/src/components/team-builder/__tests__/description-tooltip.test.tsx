"use client";

/**
 * Tests for DescriptionTooltip.
 *
 * Critical regression: after a sibling picker popover commits a selection
 * and closes (showContent flips false → true), the description tooltip must
 * NOT auto-open from the trigger's already-hovered state. The component
 * remounts the underlying Base UI Tooltip subtree on that transition so
 * Base UI's hover detection starts fresh.
 */

import { render, screen } from "@testing-library/react";
import React from "react";

// Mock the Tooltip primitive so we can observe mount/unmount via a counter
// on the wrapper. Each fresh render produces a new instance id; if the
// component remounts the Tooltip (via key bump), instanceId increments.
let mountCount = 0;
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => {
    // Capture mount via a render-time counter — React calls this fresh
    // on every mount, but a re-render of the same instance would not bump
    // the counter because we use an effect-equivalent (the ref pattern).
    const ref = React.useRef<number | null>(null);
    if (ref.current === null) {
      mountCount += 1;
      ref.current = mountCount;
    }
    return (
      <div data-testid="tooltip" data-instance-id={String(ref.current)}>
        {children}
      </div>
    );
  },
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

import { DescriptionTooltip } from "../lanes/description-tooltip";

beforeEach(() => {
  mountCount = 0;
});

describe("DescriptionTooltip — content gating", () => {
  it("renders the tooltip body when showContent is true and description is set", () => {
    render(
      <DescriptionTooltip description="Hits 2-5 times." showContent={true}>
        <span>Scale Shot</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent(
      "Hits 2-5 times."
    );
  });

  it("does NOT render the tooltip body when showContent is false", () => {
    render(
      <DescriptionTooltip description="Hits 2-5 times." showContent={false}>
        <span>Scale Shot</span>
      </DescriptionTooltip>
    );
    expect(screen.queryByTestId("tooltip-content")).toBeNull();
  });

  it("does NOT render the tooltip body when description is empty, even if showContent is true", () => {
    render(
      <DescriptionTooltip description={null} showContent={true}>
        <span>Scale Shot</span>
      </DescriptionTooltip>
    );
    expect(screen.queryByTestId("tooltip-content")).toBeNull();
  });

  it("renders the title above the description when both are set", () => {
    render(
      <DescriptionTooltip
        title="Scale Shot"
        description="Hits 2-5 times."
        showContent={true}
      >
        <span>trigger</span>
      </DescriptionTooltip>
    );
    const content = screen.getByTestId("tooltip-content");
    expect(content).toHaveTextContent("Scale Shot");
    expect(content).toHaveTextContent("Hits 2-5 times.");
  });
});

describe("DescriptionTooltip — remount on showContent flip", () => {
  // The bug being prevented: after a picker popover closes (showContent goes
  // false → true), the tooltip would auto-open because Base UI's hover
  // detection still sees the trigger as "hovered" from before. Remounting
  // the Tooltip subtree on this transition resets Base UI's hover state.
  it("remounts the Tooltip subtree when showContent flips false → true", () => {
    const { rerender } = render(
      <DescriptionTooltip description="desc" showContent={true}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    const initialId = screen
      .getByTestId("tooltip")
      .getAttribute("data-instance-id");
    expect(initialId).toBe("1");

    // Picker opens — showContent flips to false. No remount expected yet.
    rerender(
      <DescriptionTooltip description="desc" showContent={false}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "1"
    );

    // Picker closes after commit — showContent flips back to true. The
    // Tooltip MUST remount so Base UI's hover state resets.
    rerender(
      <DescriptionTooltip description="desc" showContent={true}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "2"
    );
  });

  it("does NOT remount on stable true → true rerenders (e.g. parent prop change)", () => {
    const { rerender } = render(
      <DescriptionTooltip description="desc" showContent={true}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "1"
    );

    // Description changes but showContent stays true — should NOT remount.
    rerender(
      <DescriptionTooltip description="updated desc" showContent={true}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "1"
    );
  });

  it("does NOT remount on a true → false transition (only false → true triggers it)", () => {
    const { rerender } = render(
      <DescriptionTooltip description="desc" showContent={true}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "1"
    );

    // Picker opens — flip true → false. No remount needed (and no auto-open
    // problem to solve in that direction).
    rerender(
      <DescriptionTooltip description="desc" showContent={false}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "1"
    );
  });

  it("remounts again on each subsequent false → true cycle", () => {
    const { rerender } = render(
      <DescriptionTooltip description="desc" showContent={true}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "1"
    );

    // Cycle 1: open then close picker.
    rerender(
      <DescriptionTooltip description="desc" showContent={false}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    rerender(
      <DescriptionTooltip description="desc" showContent={true}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "2"
    );

    // Cycle 2: open then close picker again — another remount.
    rerender(
      <DescriptionTooltip description="desc" showContent={false}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    rerender(
      <DescriptionTooltip description="desc" showContent={true}>
        <span>trigger</span>
      </DescriptionTooltip>
    );
    expect(screen.getByTestId("tooltip").getAttribute("data-instance-id")).toBe(
      "3"
    );
  });
});
