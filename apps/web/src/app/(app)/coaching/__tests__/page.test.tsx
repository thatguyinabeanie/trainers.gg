import { render, screen } from "@testing-library/react";
import { CoachingHub } from "../coaching-hub";

// The coaching page is an async Server Component that calls Supabase and
// feature-flag helpers — it cannot be rendered synchronously in Jest.
// Tests for the gate logic belong in check-flag.test.ts.
// Here we test the CoachingHub component directly.

describe("CoachingHub", () => {
  it("renders the coaching heading", () => {
    render(<CoachingHub />);
    expect(
      screen.getByRole("heading", { name: "Coaching" })
    ).toBeInTheDocument();
  });

  it("displays the welcome description", () => {
    render(<CoachingHub />);
    expect(
      screen.getByText(/Find experienced coaches who know the meta/i)
    ).toBeInTheDocument();
  });

  it("mentions personalized guidance", () => {
    render(<CoachingHub />);
    expect(screen.getByText(/personalized guidance/i)).toBeInTheDocument();
  });
});
