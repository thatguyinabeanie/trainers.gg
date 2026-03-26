// apps/web/src/components/landing/__tests__/journey-steps.test.tsx
import { render, screen } from "@testing-library/react";
import { JourneySteps } from "../journey-steps";

jest.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ label, status }: { label?: string; status: string }) => (
    <span data-status={status}>{label ?? status}</span>
  ),
}));

describe("JourneySteps", () => {
  it.each([
    "One account. Every version of yourself.",
    "Your strategies stay secret until you play them.",
    "Build with the meta, not against it.",
    "Run events built for competitive Pokémon.",
    "Your competitive story, one link.",
    "Write. Share. Remember.",
    "Find who's competing — and where they hang out.",
  ])("renders step headline: %s", (headline) => {
    render(<JourneySteps />);
    expect(screen.getByRole("heading", { name: headline })).toBeInTheDocument();
  });

  it("renders Coming Soon badges for Build Smarter and Articles steps", () => {
    render(<JourneySteps />);
    const badges = screen.getAllByText("Coming Soon");
    expect(badges).toHaveLength(2);
    badges.forEach((badge) => {
      expect(badge).toHaveAttribute("data-status", "draft");
    });
  });

  it("teases the Discord Server Index in step 07", () => {
    render(<JourneySteps />);
    expect(screen.getByText(/Discord Server Index/i)).toBeInTheDocument();
  });

  it("teases regionals data in step 03", () => {
    render(<JourneySteps />);
    expect(screen.getByText(/Regionals data/i)).toBeInTheDocument();
  });
});
