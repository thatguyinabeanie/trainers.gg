import { render, screen } from "@testing-library/react";
import { NewTrainerBadge } from "../new-trainer-badge";

describe("NewTrainerBadge", () => {
  it("renders the 'New' label", () => {
    render(<NewTrainerBadge />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders the Sparkles icon", () => {
    const { container } = render(<NewTrainerBadge />);
    // lucide-react renders SVGs — confirm one is present inside the badge
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies a custom className alongside the default styles", () => {
    const { container } = render(<NewTrainerBadge className="my-custom-class" />);
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("always includes the base teal badge classes", () => {
    const { container } = render(<NewTrainerBadge />);
    expect(container.firstChild).toHaveClass("rounded-full");
  });
});
