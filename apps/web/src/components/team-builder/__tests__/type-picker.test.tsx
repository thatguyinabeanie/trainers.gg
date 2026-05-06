import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import type * as TrainersPokemon from "@trainers/pokemon";

import { TypePicker } from "../pickers/type-picker";

// =============================================================================
// Mock ALL_TYPES so we get a known stable set for assertions.
// The real pokemon package has 18 types — we verify behavior against that count.
// =============================================================================

jest.mock("@trainers/pokemon", () => {
  const actual = jest.requireActual<typeof TrainersPokemon>(
    "@trainers/pokemon"
  );
  return { ...actual };
});

// =============================================================================
// TypePicker
// =============================================================================

describe("TypePicker", () => {
  const onPick = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Basic render
  // ---------------------------------------------------------------------------

  it("renders 18 type buttons", () => {
    render(<TypePicker value={null} onPick={onPick} onClose={onClose} />);
    // Each type chip is a button
    // There's also a Close button → 18 type + 1 close = 19 total
    const buttons = screen.getAllByRole("button");
    // Exclude the close button (aria-label=Close)
    const typeButtons = buttons.filter(
      (b) => b.getAttribute("aria-label") !== "Close"
    );
    expect(typeButtons).toHaveLength(18);
  });

  it("renders the close button", () => {
    render(<TypePicker value={null} onPick={onPick} onClose={onClose} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  it("clicking a type button calls onPick with that type and then onClose", async () => {
    const user = userEvent.setup();
    render(<TypePicker value={null} onPick={onPick} onClose={onClose} />);
    // Find the Fire button — displayed as first 3 chars "Fir"
    const fireButton = screen.getByText("Fir");
    await user.click(fireButton);
    expect(onPick).toHaveBeenCalledWith("Fire");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the close button calls onClose without calling onPick", async () => {
    const user = userEvent.setup();
    render(<TypePicker value={null} onPick={onPick} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Selection state
  // ---------------------------------------------------------------------------

  it("the selected type button has aria-pressed=true", () => {
    render(<TypePicker value="Fire" onPick={onPick} onClose={onClose} />);
    const fireButton = screen.getByText("Fir").closest("button");
    expect(fireButton).toHaveAttribute("aria-pressed", "true");
  });

  it("non-selected type buttons have aria-pressed=false", () => {
    render(<TypePicker value="Fire" onPick={onPick} onClose={onClose} />);
    const waterButton = screen.getByText("Wat").closest("button");
    expect(waterButton).toHaveAttribute("aria-pressed", "false");
  });

  it("no button has aria-pressed=true when value is null", () => {
    render(<TypePicker value={null} onPick={onPick} onClose={onClose} />);
    const pressedButtons = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressedButtons).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // legalTypes whitelist
  // ---------------------------------------------------------------------------

  it("disables types not in the legalTypes whitelist", () => {
    render(
      <TypePicker
        value={null}
        onPick={onPick}
        onClose={onClose}
        legalTypes={["Fire", "Water"]}
      />
    );
    // Grass is not in legalTypes — should be disabled
    const grassButton = screen.getByText("Gra").closest("button");
    expect(grassButton).toBeDisabled();
  });

  it("does not disable types that are in the legalTypes whitelist", () => {
    render(
      <TypePicker
        value={null}
        onPick={onPick}
        onClose={onClose}
        legalTypes={["Fire", "Water"]}
      />
    );
    const fireButton = screen.getByText("Fir").closest("button");
    expect(fireButton).not.toBeDisabled();
  });

  it("clicking a disabled type button does NOT call onPick", async () => {
    const user = userEvent.setup();
    render(
      <TypePicker
        value={null}
        onPick={onPick}
        onClose={onClose}
        legalTypes={["Fire"]}
      />
    );
    const grassButton = screen.getByText("Gra").closest("button")!;
    await user.click(grassButton);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("all types are enabled when no legalTypes whitelist is provided", () => {
    render(<TypePicker value={null} onPick={onPick} onClose={onClose} />);
    const buttons = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-label") !== "Close");
    const disabled = buttons.filter((b) => (b as HTMLButtonElement).disabled);
    expect(disabled).toHaveLength(0);
  });
});
