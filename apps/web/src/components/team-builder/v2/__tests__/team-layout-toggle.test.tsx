import { fireEvent, render, screen } from "@testing-library/react";

import { TeamLayoutToggle } from "../team-layout-toggle";

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false);
  window.localStorage.clear();
  setViewportWidth(2400);
});

describe("TeamLayoutToggle", () => {
  it("renders three buttons", () => {
    render(<TeamLayoutToggle />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("marks the persisted mode as pressed", () => {
    window.localStorage.setItem("tg.team-layout", "2x3");
    render(<TeamLayoutToggle />);
    const btn = screen.getByLabelText("2 × 3 — mid-stacked per cell");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["1 × 6 — full row layout", "1x6"],
    ["2 × 3 — mid-stacked per cell", "2x3"],
    ["3 × 2 — stacked per cell", "3x2-vertical"],
  ])("changes the persisted mode to %s on click", (ariaLabel, expectedValue) => {
    render(<TeamLayoutToggle />);
    fireEvent.click(screen.getByLabelText(ariaLabel));
    expect(window.localStorage.getItem("tg.team-layout")).toBe(expectedValue);
  });

  it("disables interaction on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    const { container } = render(<TeamLayoutToggle />);
    const group = container.firstChild as HTMLElement;
    expect(group.className).toContain("opacity-50");
    expect(group).toHaveAttribute("aria-disabled", "true");
    // All buttons should be disabled
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });

  it("keeps the persisted button pressed even when auto-degraded", () => {
    window.localStorage.setItem("tg.team-layout", "2x3");
    setViewportWidth(1200); // below 1500 — degrades to 1x6
    render(<TeamLayoutToggle />);
    const persistedBtn = screen.getByLabelText(
      /2 × 3 — mid-stacked per cell/
    );
    expect(persistedBtn).toHaveAttribute("aria-pressed", "true");
    // Effective is 1x6, but user's pick (2x3) should still show pressed.
    const oneByBtn = screen.getByLabelText(/1 × 6 — full row layout/);
    expect(oneByBtn).toHaveAttribute("aria-pressed", "false");
  });
});
