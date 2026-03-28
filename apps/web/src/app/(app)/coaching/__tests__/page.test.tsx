import { render, screen } from "@testing-library/react";
import CoachingPage from "../page";

describe("CoachingPage", () => {
  it("renders the page title", () => {
    render(<CoachingPage />);
    expect(
      screen.getByRole("heading", { name: "Coaching" })
    ).toBeInTheDocument();
  });

  it("displays under construction badge", () => {
    render(<CoachingPage />);
    expect(screen.getByText("Under Construction")).toBeInTheDocument();
  });

  it("displays feature description", () => {
    render(<CoachingPage />);
    expect(
      screen.getByText(/Find and connect with coaches who know the meta/i)
    ).toBeInTheDocument();
  });

  it("renders feature bullets", () => {
    render(<CoachingPage />);
    expect(
      screen.getByText("Coaches identified by badge in the player directory")
    ).toBeInTheDocument();
  });

  it("renders back to home link", () => {
    render(<CoachingPage />);
    const backLink = screen.getByRole("link", { name: /Back to Home/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });
});
