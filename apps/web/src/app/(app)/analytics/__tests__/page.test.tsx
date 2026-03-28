import { render, screen } from "@testing-library/react";
import AnalyticsPage from "../page";

describe("AnalyticsPage", () => {
  it("renders the page title", () => {
    render(<AnalyticsPage />);
    expect(
      screen.getByRole("heading", { name: "Meta Analytics" })
    ).toBeInTheDocument();
  });

  it("displays under construction badge", () => {
    render(<AnalyticsPage />);
    expect(screen.getByText("Under Construction")).toBeInTheDocument();
  });

  it("displays feature description", () => {
    render(<AnalyticsPage />);
    expect(
      screen.getByText(
        /Track what's winning and what's trending across tournaments/i
      )
    ).toBeInTheDocument();
  });

  it("renders feature bullets", () => {
    render(<AnalyticsPage />);
    expect(
      screen.getByText("Usage rates, win rates, and popular cores")
    ).toBeInTheDocument();
  });

  it("renders back to home link", () => {
    render(<AnalyticsPage />);
    const backLink = screen.getByRole("link", { name: /Back to Home/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });
});
