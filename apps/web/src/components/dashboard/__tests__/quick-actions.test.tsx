import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("lucide-react", () => ({
  Trophy: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trophy" className={className} />
  ),
  UserPlus: ({ className }: { className?: string }) => (
    <svg data-testid="icon-user-plus" className={className} />
  ),
  BarChart3: ({ className }: { className?: string }) => (
    <svg data-testid="icon-bar-chart" className={className} />
  ),
  Swords: ({ className }: { className?: string }) => (
    <svg data-testid="icon-swords" className={className} />
  ),
  Plus: ({ className }: { className?: string }) => (
    <svg data-testid="icon-plus" className={className} />
  ),
}));

import { QuickActions } from "../quick-actions";

describe("QuickActions", () => {
  it("renders the Quick Actions heading", () => {
    render(<QuickActions />);
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });

  describe("action links", () => {
    it.each([
      { label: "Join Tournament", href: "/tournaments" },
      { label: "Create Alt", href: "/dashboard/alts" },
      { label: "Team Builder", href: "/teams" },
      { label: "Leaderboards", href: "/leaderboards" },
    ])("renders '$label' link pointing to '$href'", ({ label, href }) => {
      render(<QuickActions />);
      const link = screen.getByRole("link", { name: new RegExp(label) });
      expect(link).toHaveAttribute("href", href);
    });
  });

  describe("action descriptions", () => {
    it.each([
      "Find your next battle",
      "New profile identity",
      "Build your roster",
      "Global rankings",
    ])("renders description '%s'", (description) => {
      render(<QuickActions />);
      expect(screen.getByText(description)).toBeInTheDocument();
    });
  });

  it("renders exactly 4 action links", () => {
    render(<QuickActions />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });
});
