import { render, screen } from "@testing-library/react";
import { SidebarRecent } from "../sidebar-recent";

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

jest.mock("@trainers/utils", () => ({
  formatTimeAgo: (date: string) => `${date} ago`,
  formatDisplayUsername: (username: string) => username,
  isTempUsername: (username: string) =>
    username.startsWith("temp_") || username.startsWith("user_"),
}));

const makePlayers = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    userId: `u${i}`,
    username: `player${i}`,
    avatarUrl: null as string | null,
    lastActiveAt: `2026-03-2${i}`,
  }));

describe("SidebarRecent", () => {
  it("renders nothing when players list is empty", () => {
    const { container } = render(<SidebarRecent players={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Recently Active heading", () => {
    render(<SidebarRecent players={makePlayers(1)} />);
    expect(screen.getByText("Recently Active")).toBeInTheDocument();
  });

  it("renders a row for each player", () => {
    render(<SidebarRecent players={makePlayers(3)} />);
    expect(screen.getByText("player0")).toBeInTheDocument();
    expect(screen.getByText("player1")).toBeInTheDocument();
    expect(screen.getByText("player2")).toBeInTheDocument();
  });

  it("links each player to their profile", () => {
    render(<SidebarRecent players={makePlayers(2)} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/u/player0");
    expect(links[1]).toHaveAttribute("href", "/u/player1");
  });

  it("shows last active time via formatTimeAgo", () => {
    render(<SidebarRecent players={makePlayers(1)} />);
    expect(screen.getByText(/Active 2026-03-20 ago/)).toBeInTheDocument();
  });

  it("renders avatar fallback initials", () => {
    render(<SidebarRecent players={makePlayers(1)} />);
    expect(screen.getByText("PL")).toBeInTheDocument();
  });
});
