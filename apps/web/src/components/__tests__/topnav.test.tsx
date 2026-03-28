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

  it("renders Communities link", () => {
    render(<TopNav />);
    const link = screen.getByRole("link", { name: "Communities" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/communities");
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

  it("renders Articles link", () => {
    render(<TopNav />);
    const link = screen.getByRole("link", { name: "Articles" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/articles");
  });

  it("renders Builder link", () => {
    render(<TopNav />);
    const link = screen.getByRole("link", { name: "Builder" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/builder");
  });

  it("renders all navigation links with correct styling", () => {
    render(<TopNav />);
    const links = screen.getAllByRole("link");
    const navLinks = links.filter(
      (link) =>
        link.textContent === "Tournaments" ||
        link.textContent === "Communities" ||
        link.textContent === "Builder" ||
        link.textContent === "Analytics" ||
        link.textContent === "Articles" ||
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
        link.textContent === "Communities" ||
        link.textContent === "Builder" ||
        link.textContent === "Analytics" ||
        link.textContent === "Articles" ||
        link.textContent === "Coaching"
    );

    expect(navLinks[0]).toHaveTextContent("Tournaments");
    expect(navLinks[1]).toHaveTextContent("Communities");
    expect(navLinks[2]).toHaveTextContent("Builder");
    expect(navLinks[3]).toHaveTextContent("Analytics");
    expect(navLinks[4]).toHaveTextContent("Articles");
    expect(navLinks[5]).toHaveTextContent("Coaching");
  });
});
