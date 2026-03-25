import { render, screen } from "@testing-library/react";
import { ComingSoonCards } from "../coming-soon-cards";

// Mock Card components to pass through children
jest.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock StatusBadge to render the label text
jest.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ label, status }: { label?: string; status: string }) => (
    <span data-status={status}>{label ?? status}</span>
  ),
}));

describe("ComingSoonCards", () => {
  it("renders the section heading", () => {
    render(<ComingSoonCards />);

    expect(
      screen.getByRole("heading", { name: "More on the way" })
    ).toBeInTheDocument();
  });

  it.each([
    {
      title: "Team Builder",
      description: "Build, share, and analyze your Pokemon teams.",
    },
    {
      title: "Coaching",
      description: "Get guidance from experienced competitive players.",
    },
  ])("renders $title card with description", ({ title, description }) => {
    render(<ComingSoonCards />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it("renders Coming Soon badges with draft status", () => {
    render(<ComingSoonCards />);

    const badges = screen.getAllByText("Coming Soon");
    expect(badges).toHaveLength(2);
    badges.forEach((badge) => {
      expect(badge).toHaveAttribute("data-status", "draft");
    });
  });
});
