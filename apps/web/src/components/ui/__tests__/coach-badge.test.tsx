import { render, screen } from "@testing-library/react";
import { CoachBadge } from "../coach-badge";

describe("CoachBadge", () => {
  it("renders the 'Coach' label and links to the coaching profile", () => {
    render(<CoachBadge handle="ash_ketchum" />);
    const link = screen.getByRole("link", { name: /coach/i });
    expect(link).toHaveAttribute("href", "/coaching/ash_ketchum");
  });

  it("renders icon-only (no visible text) when iconOnly", () => {
    render(<CoachBadge handle="ash_ketchum" iconOnly />);
    expect(screen.queryByText("Coach")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Coach")).toBeInTheDocument();
  });
});
