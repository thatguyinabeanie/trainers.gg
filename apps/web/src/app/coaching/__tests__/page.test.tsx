import { render, screen } from "@testing-library/react";
import CoachingPage from "../page";

describe("CoachingPage", () => {
  it("renders the page title", () => {
    render(<CoachingPage />);
    expect(
      screen.getByRole("heading", { name: "Coaching" })
    ).toBeInTheDocument();
  });

  it("displays coming soon message", () => {
    render(<CoachingPage />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("displays coaching feature description", () => {
    render(<CoachingPage />);
    expect(
      screen.getByText(
        /Get matchup prep, coaching tools, and personalized resources to improve your competitive game/i
      )
    ).toBeInTheDocument();
  });

  it("renders coaching icon", () => {
    render(<CoachingPage />);
    // Check for the icon container with the correct styling
    const iconContainer = screen
      .getByRole("main")
      .querySelector(".bg-teal-100");
    expect(iconContainer).toBeInTheDocument();
  });

  it("renders back to home button", () => {
    render(<CoachingPage />);
    const backButton = screen.getByRole("link", { name: "Back to Home" });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute("href", "/");
  });
});
