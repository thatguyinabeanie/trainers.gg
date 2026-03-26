import { render, screen } from "@testing-library/react";
import { SidebarLeaderboard } from "../sidebar-leaderboard";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const makeEntries = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    userId: `u${i}`,
    username: `player${i}`,
    avatarUrl: null as string | null,
    rating: 1600 - i * 50,
    skillBracket: "advanced" as const,
    gamesPlayed: 10 - i,
  }));

describe("SidebarLeaderboard", () => {
  it("renders nothing when entries list is empty", () => {
    const { container } = render(<SidebarLeaderboard entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders leaderboard heading", () => {
    render(<SidebarLeaderboard entries={makeEntries(1)} />);
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
  });

  it("renders a row for each entry", () => {
    render(<SidebarLeaderboard entries={makeEntries(3)} />);
    expect(screen.getByText("player0")).toBeInTheDocument();
    expect(screen.getByText("player1")).toBeInTheDocument();
    expect(screen.getByText("player2")).toBeInTheDocument();
  });

  it("links each entry to the player profile", () => {
    render(<SidebarLeaderboard entries={makeEntries(2)} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/u/player0");
    expect(links[1]).toHaveAttribute("href", "/u/player1");
  });

  it("shows rank numbers starting from 1", () => {
    render(<SidebarLeaderboard entries={makeEntries(3)} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("displays rating and skill bracket for each entry", () => {
    render(<SidebarLeaderboard entries={makeEntries(1)} />);
    expect(screen.getByText(/1,600 pts · Advanced/)).toBeInTheDocument();
  });

  it("renders avatar fallback initials", () => {
    render(<SidebarLeaderboard entries={makeEntries(1)} />);
    expect(screen.getByText("PL")).toBeInTheDocument();
  });
});
