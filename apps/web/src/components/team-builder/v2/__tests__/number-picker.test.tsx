import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { NumberPicker } from "../pickers/number-picker";

// =============================================================================
// NumberPicker
// =============================================================================

function renderPicker(overrides: Partial<React.ComponentProps<typeof NumberPicker>> = {}) {
  const onChange = jest.fn();
  const onClose = jest.fn();
  const utils = render(
    <NumberPicker
      title="HP EVs"
      value={0}
      min={0}
      max={252}
      onChange={onChange}
      onClose={onClose}
      {...overrides}
    />
  );
  return { ...utils, onChange, onClose };
}

describe("NumberPicker", () => {
  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders the title", () => {
    renderPicker({ title: "Speed EVs" });
    expect(screen.getByText("Speed EVs")).toBeInTheDocument();
  });

  it("shows the current value as a large readout", () => {
    renderPicker({ value: 5 });
    // The large readout span shows the local value
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows the max value next to the readout", () => {
    renderPicker({ value: 0, max: 252 });
    expect(screen.getByText("/ 252")).toBeInTheDocument();
  });

  it("renders a range slider input", () => {
    renderPicker();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Slider interaction
  // ---------------------------------------------------------------------------

  it("calls onChange when slider value changes", async () => {
    const { onChange } = renderPicker({ value: 0, min: 0, max: 252 });
    const slider = screen.getByRole("slider");
    // fireEvent on range input
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(slider, { target: { value: "128" } });
    expect(onChange).toHaveBeenCalledWith(128);
  });

  it("clamps slider value to max", async () => {
    const { onChange } = renderPicker({ value: 0, min: 0, max: 252 });
    const slider = screen.getByRole("slider");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(slider, { target: { value: "999" } });
    expect(onChange).toHaveBeenCalledWith(252);
  });

  it("clamps slider value to min", async () => {
    const { onChange } = renderPicker({ value: 100, min: 0, max: 252 });
    const slider = screen.getByRole("slider");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(slider, { target: { value: "-5" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  // ---------------------------------------------------------------------------
  // Value re-sync when parent updates prop
  // ---------------------------------------------------------------------------

  it("resyncs local display when value prop changes", () => {
    const { rerender } = renderPicker({ value: 5 });
    expect(screen.getByText("5")).toBeInTheDocument();

    rerender(
      <NumberPicker
        title="HP EVs"
        value={8}
        min={0}
        max={252}
        onChange={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Preset chips
  // ---------------------------------------------------------------------------

  it("renders preset chips when presets are provided", () => {
    renderPicker({ presets: [0, 4, 252] });
    expect(screen.getByRole("button", { name: "0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "252" })).toBeInTheDocument();
  });

  it("does NOT render preset chips when no presets are provided", () => {
    renderPicker({ presets: undefined });
    // Only the Close button should be in the shell
    const buttons = screen.getAllByRole("button");
    // One close button from PickerShell
    expect(buttons.length).toBe(1);
  });

  it("clicking a preset chip calls onChange with that value", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker({ value: 0, presets: [0, 4, 252] });
    await user.click(screen.getByRole("button", { name: "252" }));
    expect(onChange).toHaveBeenCalledWith(252);
  });

  it("presets outside [min, max] are not rendered", () => {
    renderPicker({ min: 4, max: 128, presets: [0, 4, 64, 128, 252] });
    // 0 < min=4 and 252 > max=128, so only 4, 64, 128 show
    expect(screen.queryByRole("button", { name: "0" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "252" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "64" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "128" })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Hint text
  // ---------------------------------------------------------------------------

  it("renders hint text when hint prop is provided", () => {
    renderPicker({ hint: "Step 4 for Speed tiers" });
    expect(screen.getByText("Step 4 for Speed tiers")).toBeInTheDocument();
  });

  it("does NOT render hint text when hint is omitted", () => {
    renderPicker({ hint: undefined });
    expect(screen.queryByText("Step 4 for Speed tiers")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Close
  // ---------------------------------------------------------------------------

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPicker();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
