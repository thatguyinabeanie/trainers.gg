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

  it("marks the persisted mode as pressed", () => {
    window.localStorage.setItem("tg.team-layout", "2x3-vertical");
    render(<TeamLayoutToggle />);
    const btn = screen.getByLabelText("2 × 3 — stacked per cell");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["1 × 6 — full row layout", "1x6", "2x3-vertical"],
    ["2 × 3 — stacked per cell", "2x3-vertical", "1x6"],
  ])(
    "changes the persisted mode to %s on click",
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
