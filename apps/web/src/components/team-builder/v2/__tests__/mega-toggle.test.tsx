"use client";

/**
 * Behavioural tests for MegaToggle.
 *
 * Per-calc-side toggle for mega evolution. The component is small but
 * load-bearing: it drives whether `buildAttackerFromDb` /
 * `buildDefenderPokemon` swap to the mega's species + post-evolution
 * ability or fall back to the base form. Wiring regressions silently
 * change displayed damage, so the click + label + aria-pressed contract
 * needs to be locked.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MegaToggle } from "../calc/mega-toggle";

describe("MegaToggle", () => {
  it("renders 'Mega' when active and exposes aria-pressed=true", () => {
    render(<MegaToggle active={true} onToggle={() => {}} />);
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Mega");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("renders 'Mega' when inactive and exposes aria-pressed=false", () => {
    render(<MegaToggle active={false} onToggle={() => {}} />);
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Mega");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("flips its tooltip text between active and inactive states", () => {
    const { rerender } = render(
      <MegaToggle active={true} onToggle={() => {}} />
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Mega active — click to calc as base form"
    );

    rerender(<MegaToggle active={false} onToggle={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Mega inactive — click to calc as Mega form"
    );
  });

  it("calls onToggle exactly once per click", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(<MegaToggle active={false} onToggle={onToggle} />);

    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
