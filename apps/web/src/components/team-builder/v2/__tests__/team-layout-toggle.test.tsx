import { fireEvent, render, screen } from "@testing-library/react";

import { TeamLayoutToggle } from "../team-layout-toggle";

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false);
  window.localStorage.clear();
});

describe("TeamLayoutToggle", () => {
  it("renders four buttons", () => {
    render(<TeamLayoutToggle />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("marks the persisted mode as pressed", () => {
    window.localStorage.setItem("tg.team-layout", "2x3");
    render(<TeamLayoutToggle />);
    const btn = screen.getByLabelText("2 × 3 — mid-stacked per cell");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("changes the persisted mode on click", () => {
    render(<TeamLayoutToggle />);
    const btn = screen.getByLabelText("3 × 2 — mid-stacked per cell");
    fireEvent.click(btn);
    expect(window.localStorage.getItem("tg.team-layout")).toBe("3x2-mid");
  });

  it("disables interaction on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    const { container } = render(<TeamLayoutToggle />);
    const group = container.firstChild as HTMLElement;
    expect(group.className).toContain("pointer-events-none");
    expect(group.className).toContain("opacity-50");
  });
});
