/**
 * Tests for ExternalDataSettings.
 *
 * The Base UI Popover portals its content, which isn't visible in jsdom by
 * default. We mock @/components/ui/popover to render trigger and content
 * inline — the same pattern used in external-data-queue-strip.test.tsx.
 *
 * Coverage targets:
 * - Loading state: shows Loader2 spinner instead of Switch
 * - Loaded state: shows Switch
 * - tab === "rk9": Teams/tick and Concurrency inputs visible
 * - tab !== "rk9": Tourneys/tick input visible, Teams/tick absent
 * - Interval input always visible
 * - onToggleBackend, change handlers, and blur handlers called with correct args
 */

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Render Popover + PopoverContent inline (no portal) so jsdom sees the content
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    render: triggerRender,
    children,
  }: {
    render?: React.ReactElement;
    children?: React.ReactNode;
  }) => <div data-testid="popover-trigger">{triggerRender ?? children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// Render Switch as a plain checkbox for easy interaction
jest.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
  }) => (
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="backend-switch"
    />
  ),
}));

// Render Button as a plain button
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    variant?: string;
    size?: string;
  }) => <button {...rest}>{children}</button>,
}));

// Render Input as a plain input
jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { ExternalDataSettings } from "../external-data-settings";
import { type ExternalDataSettingsProps } from "../external-data-settings";

// ---------------------------------------------------------------------------
// Base props factory
// ---------------------------------------------------------------------------

function makeProps(
  overrides: Partial<ExternalDataSettingsProps> = {}
): ExternalDataSettingsProps {
  return {
    tab: "rk9",
    loading: false,
    backendOn: false,
    onToggleBackend: jest.fn(),
    teamsPerTick: 100,
    onTeamsPerTickChange: jest.fn(),
    onTeamsPerTickBlur: jest.fn(),
    concurrency: 3,
    onConcurrencyChange: jest.fn(),
    onConcurrencyBlur: jest.fn(),
    batchSize: 20,
    onBatchSizeChange: jest.fn(),
    onBatchSizeBlur: jest.fn(),
    intervalSeconds: 60,
    onIntervalChange: jest.fn(),
    onIntervalBlur: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ExternalDataSettings", () => {
  describe("loading state", () => {
    it("shows a spinner instead of the Switch while loading", () => {
      render(<ExternalDataSettings {...makeProps({ loading: true })} />);
      // Spinner is a Loader2 — no switch rendered
      expect(
        screen.queryByRole("switch", { hidden: true })
      ).not.toBeInTheDocument();
      // The wrapper div is still rendered
      expect(screen.getByTestId("popover-content")).toBeInTheDocument();
    });
  });

  describe("loaded state", () => {
    it("shows the Switch when not loading", () => {
      render(<ExternalDataSettings {...makeProps({ loading: false })} />);
      expect(screen.getByTestId("backend-switch")).toBeInTheDocument();
    });

    it("passes backendOn checked state to Switch", () => {
      render(<ExternalDataSettings {...makeProps({ backendOn: true })} />);
      const switchEl = screen.getByTestId("backend-switch");
      expect(switchEl).toBeChecked();
    });

    it("calls onToggleBackend when Switch changes", () => {
      const onToggle = jest.fn();
      render(
        <ExternalDataSettings
          {...makeProps({
            loading: false,
            backendOn: false,
            onToggleBackend: onToggle,
          })}
        />
      );
      fireEvent.click(screen.getByTestId("backend-switch"));
      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });

  describe("rk9 tab", () => {
    it("renders Teams / tick and Concurrency inputs", () => {
      render(<ExternalDataSettings {...makeProps({ tab: "rk9" })} />);
      // Find inputs by their placeholder-less presence via label text
      expect(screen.getByText("Teams / tick")).toBeInTheDocument();
      expect(screen.getByText("Concurrency")).toBeInTheDocument();
    });

    it("does NOT render the Tourneys / tick input", () => {
      render(<ExternalDataSettings {...makeProps({ tab: "rk9" })} />);
      expect(screen.queryByText("Tourneys / tick")).not.toBeInTheDocument();
    });

    it("calls onTeamsPerTickChange when the Teams/tick input changes", () => {
      const onChange = jest.fn();
      render(
        <ExternalDataSettings
          {...makeProps({ tab: "rk9", onTeamsPerTickChange: onChange })}
        />
      );
      // The Interval input is always last; Teams/tick is the first number input
      const numberInputs = screen.getAllByRole("spinbutton");
      fireEvent.change(numberInputs[0], { target: { value: "50" } });
      expect(onChange).toHaveBeenCalledWith("50");
    });

    it("calls onTeamsPerTickBlur when the Teams/tick input blurs", () => {
      const onBlur = jest.fn();
      render(
        <ExternalDataSettings
          {...makeProps({ tab: "rk9", onTeamsPerTickBlur: onBlur })}
        />
      );
      const numberInputs = screen.getAllByRole("spinbutton");
      fireEvent.blur(numberInputs[0]);
      expect(onBlur).toHaveBeenCalled();
    });

    it("calls onConcurrencyChange when the Concurrency input changes", () => {
      const onChange = jest.fn();
      render(
        <ExternalDataSettings
          {...makeProps({ tab: "rk9", onConcurrencyChange: onChange })}
        />
      );
      const numberInputs = screen.getAllByRole("spinbutton");
      // Teams/tick = [0], Concurrency = [1], Interval = [2]
      fireEvent.change(numberInputs[1], { target: { value: "5" } });
      expect(onChange).toHaveBeenCalledWith("5");
    });
  });

  describe("limitless tab", () => {
    it("renders Tourneys / tick input instead of Teams/tick and Concurrency", () => {
      render(<ExternalDataSettings {...makeProps({ tab: "limitless" })} />);
      expect(screen.getByText("Tourneys / tick")).toBeInTheDocument();
      expect(screen.queryByText("Teams / tick")).not.toBeInTheDocument();
      expect(screen.queryByText("Concurrency")).not.toBeInTheDocument();
    });

    it("calls onBatchSizeChange when the Tourneys/tick input changes", () => {
      const onChange = jest.fn();
      render(
        <ExternalDataSettings
          {...makeProps({ tab: "limitless", onBatchSizeChange: onChange })}
        />
      );
      const numberInputs = screen.getAllByRole("spinbutton");
      // Tourneys/tick = [0], Interval = [1]
      fireEvent.change(numberInputs[0], { target: { value: "10" } });
      expect(onChange).toHaveBeenCalledWith("10");
    });

    it("calls onBatchSizeBlur when the Tourneys/tick input blurs", () => {
      const onBlur = jest.fn();
      render(
        <ExternalDataSettings
          {...makeProps({ tab: "limitless", onBatchSizeBlur: onBlur })}
        />
      );
      const numberInputs = screen.getAllByRole("spinbutton");
      fireEvent.blur(numberInputs[0]);
      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe("interval input", () => {
    it("renders the Interval (s) input on both tabs", () => {
      const { rerender } = render(
        <ExternalDataSettings {...makeProps({ tab: "rk9" })} />
      );
      expect(screen.getByText("Interval (s)")).toBeInTheDocument();

      rerender(<ExternalDataSettings {...makeProps({ tab: "limitless" })} />);
      expect(screen.getByText("Interval (s)")).toBeInTheDocument();
    });

    it("calls onIntervalChange when the interval input changes", () => {
      const onChange = jest.fn();
      render(
        <ExternalDataSettings
          {...makeProps({ tab: "rk9", onIntervalChange: onChange })}
        />
      );
      const numberInputs = screen.getAllByRole("spinbutton");
      // Teams/tick = [0], Concurrency = [1], Interval = [2]
      fireEvent.change(numberInputs[2], { target: { value: "120" } });
      expect(onChange).toHaveBeenCalledWith("120");
    });

    it("calls onIntervalBlur when the interval input blurs", () => {
      const onBlur = jest.fn();
      render(
        <ExternalDataSettings
          {...makeProps({ tab: "rk9", onIntervalBlur: onBlur })}
        />
      );
      const numberInputs = screen.getAllByRole("spinbutton");
      fireEvent.blur(numberInputs[2]);
      expect(onBlur).toHaveBeenCalled();
    });
  });
});
