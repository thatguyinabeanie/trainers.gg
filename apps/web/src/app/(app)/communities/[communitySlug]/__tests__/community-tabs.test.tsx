import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunityTabs } from "../community-tabs";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

jest.mock("@/components/ui/markdown-content", () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

jest.mock("@/components/tournaments/tournament-list", () => ({
  SectionHeader: ({ title }: { title: string }) => (
    <div data-testid={`section-header-${title.toLowerCase()}`}>{title}</div>
  ),
  ActiveTournaments: () => (
    <div data-testid="active-tournaments">Active</div>
  ),
  UpcomingTournaments: () => (
    <div data-testid="upcoming-tournaments">Upcoming</div>
  ),
  CompletedTournaments: () => (
    <div data-testid="completed-tournaments">Completed</div>
  ),
  TournamentListEmpty: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title: string;
  }) => (
    <div data-testid="tournament-list-empty">
      {title}
      {children}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  tournaments: [],
  communitySlug: "test-community",
  canManage: false,
  about: null,
};

// ---------------------------------------------------------------------------
// About tab — the new conditional rendering under test
// ---------------------------------------------------------------------------

describe("CommunityTabs — About tab", () => {
  it("renders MarkdownContent when about is provided", () => {
    render(
      <CommunityTabs {...defaultProps} about="# Hello\n\nWelcome to our community!" />
    );

    expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-content")).toHaveTextContent(
      "# Hello"
    );
  });

  it("renders empty state when about is null and canManage is false", () => {
    render(<CommunityTabs {...defaultProps} about={null} canManage={false} />);

    expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument();
    expect(
      screen.getByText("This community hasn't added an about page yet")
    ).toBeInTheDocument();
    // No settings link for non-managers
    expect(
      screen.queryByRole("link", { name: /Settings/i })
    ).not.toBeInTheDocument();
  });

  it("renders empty state with settings link when about is null and canManage is true", () => {
    render(<CommunityTabs {...defaultProps} about={null} canManage={true} />);

    expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument();
    // Manager sees the "Add one in Settings" link
    const link = screen.getByRole("link", { name: /Add one in Settings/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/community/test-community/settings"
    );
  });
});

// ---------------------------------------------------------------------------
// Tournaments tab
// ---------------------------------------------------------------------------

describe("CommunityTabs — Tournaments tab", () => {
  async function switchToTournamentsTab() {
    const user = userEvent.setup();
    const tab = screen.getByRole("tab", { name: /Tournaments/i });
    await user.click(tab);
  }

  it("renders empty state when there are no tournaments", async () => {
    render(<CommunityTabs {...defaultProps} tournaments={[]} />);
    await switchToTournamentsTab();

    expect(screen.getByTestId("tournament-list-empty")).toBeInTheDocument();
  });

  it("shows Create Tournament link in empty state when canManage is true", async () => {
    render(
      <CommunityTabs {...defaultProps} tournaments={[]} canManage={true} />
    );
    await switchToTournamentsTab();

    const link = screen.getByRole("link", { name: /Create Tournament/i });
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/community/test-community/tournaments/create"
    );
  });

  it("does not show Create Tournament link when canManage is false", async () => {
    render(
      <CommunityTabs {...defaultProps} tournaments={[]} canManage={false} />
    );
    await switchToTournamentsTab();

    expect(
      screen.queryByRole("link", { name: /Create Tournament/i })
    ).not.toBeInTheDocument();
  });
});
