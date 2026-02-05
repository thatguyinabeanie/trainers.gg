import { render, screen } from "@testing-library/react";
import { TopNav } from "../topnav";

// Mock the TopNavAuthSection component
jest.mock("../topnav-auth-section", () => ({
  TopNavAuthSection: () => <div data-testid="auth-section">Auth Section</div>,
}));

// Mock the MobileNav component
jest.mock("../mobile-nav", () => ({
  MobileNav: () => <div data-testid="mobile-nav">Mobile Nav</div>,
}));

describe("TopNav", () => {
  it("renders the trainers.gg logo", () => {
    render(<TopNav />);
    expect(screen.getByText("trainers.gg")).toBeInTheDocument();
  });

  it("renders Tournaments link", () => {
    render(<TopNav />);
    const link = screen.getByRole("link", { name: "Tournaments" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/tournaments");
  });

  it("renders Organizations link", () => {
    render(<TopNav />);
    const link = screen.getByRole("link", { name: "Organizations" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/organizations");
  });

  it("renders Analytics link", () => {
    render(<TopNav />);
    const link = screen.getByRole("link", { name: "Analytics" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/analytics");
  });

  it("renders Coaching link", () => {
    render(<TopNav />);
    const link = screen.getByRole("link", { name: "Coaching" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/coaching");
  });

  it("renders all navigation links with correct styling", () => {
    render(<TopNav />);
    const links = screen.getAllByRole("link");
    const navLinks = links.filter(
      (link) =>
        link.textContent === "Tournaments" ||
        link.textContent === "Organizations" ||
        link.textContent === "Analytics" ||
        link.textContent === "Coaching"
    );

    navLinks.forEach((link) => {
      expect(link).toHaveClass("text-muted-foreground");
      expect(link).toHaveClass("hover:text-foreground");
      expect(link).toHaveClass("text-sm");
      expect(link).toHaveClass("transition-colors");
    });
  });

  it("renders TopNavAuthSection component", () => {
    render(<TopNav />);
    expect(screen.getByTestId("auth-section")).toBeInTheDocument();
  });

  it("renders MobileNav component", () => {
    render(<TopNav />);
    expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
  });

  it("has correct nav link ordering", () => {
    render(<TopNav />);
    const links = screen.getAllByRole("link");
    const navLinks = links.filter(
      (link) =>
        link.textContent === "Tournaments" ||
        link.textContent === "Organizations" ||
        link.textContent === "Analytics" ||
        link.textContent === "Coaching"
    );

    expect(navLinks[0]).toHaveTextContent("Tournaments");
    expect(navLinks[1]).toHaveTextContent("Organizations");
    expect(navLinks[2]).toHaveTextContent("Analytics");
    expect(navLinks[3]).toHaveTextContent("Coaching");
  });
});
