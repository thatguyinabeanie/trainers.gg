import { render, screen } from "@testing-library/react";
import AnalyticsPage from "../page";

describe("AnalyticsPage", () => {
  it("renders the page title", () => {
    render(<AnalyticsPage />);
    expect(
      screen.getByRole("heading", { name: "Analytics" })
    ).toBeInTheDocument();
  });

  it("displays coming soon message", () => {
    render(<AnalyticsPage />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("displays analytics feature description", () => {
    render(<AnalyticsPage />);
    expect(
      screen.getByText(
        /Track your competitive performance, analyze meta trends, and gain insights from your tournament history/i
      )
    ).toBeInTheDocument();
  });

  it("renders analytics icon", () => {
    render(<AnalyticsPage />);
    // Check for the icon container with the correct styling
    const iconContainer = screen
      .getByRole("main")
      .querySelector(".bg-teal-100");
    expect(iconContainer).toBeInTheDocument();
  });

  it("renders back to home button", () => {
    render(<AnalyticsPage />);
    const backButton = screen.getByRole("link", { name: "Back to Home" });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute("href", "/");
  });
});
