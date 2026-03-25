import { render, screen } from "@testing-library/react";
import { SidebarNewMembers } from "../sidebar-new-members";

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
}));

const makeMembers = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    userId: `u${i}`,
    username: `member${i}`,
    avatarUrl: null as string | null,
    joinedAt: `2026-01-0${i + 1}`,
  }));

describe("SidebarNewMembers", () => {
  it("renders nothing when members list is empty", () => {
    const { container } = render(<SidebarNewMembers members={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders New Members heading", () => {
    render(<SidebarNewMembers members={makeMembers(1)} />);
    expect(screen.getByText("New Members")).toBeInTheDocument();
  });

  it("renders a row for each member", () => {
    render(<SidebarNewMembers members={makeMembers(3)} />);
    expect(screen.getByText("member0")).toBeInTheDocument();
    expect(screen.getByText("member1")).toBeInTheDocument();
    expect(screen.getByText("member2")).toBeInTheDocument();
  });

  it("links each member to their profile", () => {
    render(<SidebarNewMembers members={makeMembers(2)} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/u/member0");
    expect(links[1]).toHaveAttribute("href", "/u/member1");
  });

  it("shows join date via formatTimeAgo", () => {
    render(<SidebarNewMembers members={makeMembers(1)} />);
    expect(screen.getByText(/Joined 2026-01-01 ago/)).toBeInTheDocument();
  });

  it("renders avatar fallback initials", () => {
    render(<SidebarNewMembers members={makeMembers(1)} />);
    expect(screen.getByText("ME")).toBeInTheDocument();
  });
});
