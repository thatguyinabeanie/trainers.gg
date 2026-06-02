import { render, screen } from "@testing-library/react";
import { CoachBadge } from "../coach-badge";

// Mock next/link to render a plain anchor
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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
