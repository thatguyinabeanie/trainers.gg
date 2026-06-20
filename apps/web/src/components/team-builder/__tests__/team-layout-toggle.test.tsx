import { fireEvent, render, screen } from "@testing-library/react";

import { TeamLayoutToggle } from "../team-layout-toggle";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  window.localStorage.clear();
});

describe("TeamLayoutToggle", () => {
  it("renders two buttons", () => {
    render(<TeamLayoutToggle />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("marks the persisted mode as pressed — 'single' by default", () => {
    render(<TeamLayoutToggle />);
    const btn = screen.getByLabelText("Single — one Pokémon, full width");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("marks 2x3-vertical as pressed when stored", () => {
    window.localStorage.setItem("tg.team-layout", "2x3-vertical");
    render(<TeamLayoutToggle />);
    const btn = screen.getByLabelText("2 × 3 — stacked per cell");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("single button is not pressed when 2x3-vertical is stored", () => {
    window.localStorage.setItem("tg.team-layout", "2x3-vertical");
    render(<TeamLayoutToggle />);
    const btn = screen.getByLabelText("Single — one Pokémon, full width");
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking 'Single' button sets mode to 'single'", () => {
    // Start from grid so the single button click triggers a change.
    window.localStorage.setItem("tg.team-layout", "2x3-vertical");
    render(<TeamLayoutToggle />);
    fireEvent.click(screen.getByLabelText("Single — one Pokémon, full width"));
    expect(window.localStorage.getItem("tg.team-layout")).toBe("single");
  });

  it("clicking '2 × 3' button sets mode to '2x3-vertical'", () => {
    render(<TeamLayoutToggle />);
    fireEvent.click(screen.getByLabelText("2 × 3 — stacked per cell"));
    expect(window.localStorage.getItem("tg.team-layout")).toBe("2x3-vertical");
  });

  it.each([
    ["Single — one Pokémon, full width", "single", "2x3-vertical"] as const,
    ["2 × 3 — stacked per cell", "2x3-vertical", "single"] as const,
  ])(
    "clicking '%s' persists mode '%s'",
    (ariaLabel, expectedValue, startingMode) => {
      window.localStorage.setItem("tg.team-layout", startingMode);
      render(<TeamLayoutToggle />);
      fireEvent.click(screen.getByLabelText(ariaLabel));
      expect(window.localStorage.getItem("tg.team-layout")).toBe(expectedValue);
    }
  );

  // Phase 2c: mobile-lock is enforced structurally at the mount site via
  // Tailwind (`hidden md:inline-flex`). The component itself always renders
  // normally — it is simply not mounted at `<md` viewports.
  it("renders normally regardless of viewport (mobile-lock is structural)", () => {
    render(<TeamLayoutToggle />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    for (const btn of buttons) {
      expect(btn).not.toBeDisabled();
    }
  });
});
