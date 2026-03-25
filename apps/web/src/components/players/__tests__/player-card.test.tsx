import { render, screen } from "@testing-library/react";
import { PlayerCard } from "../player-card";

// Mock next/link to render a plain anchor
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("PlayerCard", () => {
  const defaultProps = {
    username: "ash_ketchum",
    avatarUrl: "https://example.com/ash.png",
    country: "US",
    tournamentCount: 10,
    winRate: 75.5,
  };

  it("renders username", () => {
    render(<PlayerCard {...defaultProps} />);
    expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
  });

  it("links to the correct profile URL", () => {
    render(<PlayerCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/u/ash_ketchum");
  });

  it("displays tournament count", () => {
    render(<PlayerCard {...defaultProps} />);
    expect(screen.getByText(/10 tournaments/)).toBeInTheDocument();
  });

  it("displays singular 'tournament' for count of 1", () => {
    render(<PlayerCard {...defaultProps} tournamentCount={1} />);
    expect(screen.getByText(/1 tournament$/)).toBeInTheDocument();
  });

  it("displays win rate when player has tournaments", () => {
    render(<PlayerCard {...defaultProps} />);
    expect(screen.getByText("75.5% WR")).toBeInTheDocument();
  });

  it("hides win rate when player has no tournaments", () => {
    render(<PlayerCard {...defaultProps} tournamentCount={0} winRate={0} />);
    expect(screen.queryByText(/% WR/)).not.toBeInTheDocument();
  });

  it("renders country flag with proper aria label", () => {
    render(<PlayerCard {...defaultProps} />);
    const flag = screen.getByRole("img", { name: "United States" });
    expect(flag).toBeInTheDocument();
  });

  it("does not render flag when country is null", () => {
    render(<PlayerCard {...defaultProps} country={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows avatar fallback initials", () => {
    render(<PlayerCard {...defaultProps} avatarUrl={null} />);
    // Fallback should show first 2 chars uppercased
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("uses raw country code as fallback when country name is unknown", () => {
    // "ZZ" is not a valid ISO country code so getCountryName returns null
    render(<PlayerCard {...defaultProps} country="ZZ" />);
    const flag = screen.getByRole("img");
    expect(flag).toHaveAttribute("aria-label", "ZZ");
  });
});
