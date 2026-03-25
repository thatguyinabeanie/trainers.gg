import { render, screen } from "@testing-library/react";
import { FeatureCards } from "../feature-cards";

// Mock Next.js Link to render a plain anchor
jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock the AnalyticsCardLink client island
jest.mock("../analytics-card-link", () => ({
  AnalyticsCardLink: () => <a href="/analytics">View Analytics</a>,
}));

// Mock Card components to pass through children
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("FeatureCards", () => {
  it("renders the section heading", () => {
    render(<FeatureCards />);

    expect(
      screen.getByRole("heading", { name: "Everything you need to compete" })
    ).toBeInTheDocument();
  });

  it.each([
    {
      title: "Tournaments",
      linkText: "View Tournaments",
      href: "/tournaments",
    },
    {
      title: "Organizations",
      linkText: "Find Organizations",
      href: "/organizations",
    },
  ])("renders $title card with link to $href", ({ title, linkText, href }) => {
    render(<FeatureCards />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: linkText });
    expect(link).toHaveAttribute("href", href);
  });

  it("renders Analytics card with AnalyticsCardLink island", () => {
    render(<FeatureCards />);

    expect(
      screen.getByRole("heading", { name: "Analytics" })
    ).toBeInTheDocument();
    // The mocked AnalyticsCardLink renders a link
    expect(
      screen.getByRole("link", { name: "View Analytics" })
    ).toBeInTheDocument();
  });
});
