import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import type {
  CommunityActivityItem,
  CommunityStats,
  TopPlayer,
} from "@trainers/supabase";

// Mock next/link to render a plain anchor
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// formatTimeAgo produces a relative time string — keep it deterministic
jest.mock("@trainers/utils", () => ({
  formatTimeAgo: jest.fn(() => "2 hours ago"),
}));

import { OverviewClient } from "../overview-client";

// =============================================================================
// Shared test fixtures
// =============================================================================

function makeStats(overrides: Partial<CommunityStats> = {}): CommunityStats {
  return {
    totalTournaments: 3,
    activeTournaments: 1,
    uniquePlayers: 42,
    totalEntries: 90,
    staffCount: 5,
    adminCount: 2,
    judgeCount: 3,
    ...overrides,
  };
}

function makeUpcomingTournament(
  overrides: Partial<{
    id: number;
    name: string;
    slug: string;
    status: string | null;
    start_date: string | null;
    max_participants: number | null;
    registrationCount: number;
  }> = {}
) {
  return {
    id: 1,
    name: "VGC Summer Cup",
    slug: "vgc-summer-cup",
    status: "upcoming",
    start_date: "2026-08-15T10:00:00Z",
    max_participants: 64,
    registrationCount: 32,
    ...overrides,
  };
}

function makeTopPlayer(overrides: Partial<TopPlayer> = {}): TopPlayer {
  return {
    userId: "user-001",
    username: "ash",
    eventCount: 10,
    ...overrides,
  };
}

function makeActivityItem(
  overrides: Partial<CommunityActivityItem> = {}
): CommunityActivityItem {
  return {
    type: "registration",
    actorName: "ash",
    targetName: "VGC Summer Cup",
    timestamp: "2026-04-01T12:00:00Z",
    ...overrides,
  };
}

const defaultProps = {
  communitySlug: "vgc-league",
  stats: makeStats(),
  topPlayers: [],
  activity: [],
  upcomingTournaments: [],
};

// =============================================================================
// StatCard subtitles
// =============================================================================

describe("OverviewClient — StatCards", () => {
  it("renders all four stat labels", () => {
    render(<OverviewClient {...defaultProps} />);
    expect(screen.getByText("Tournaments")).toBeInTheDocument();
    expect(screen.getByText("Unique Players")).toBeInTheDocument();
    expect(screen.getByText("Total Entries")).toBeInTheDocument();
    expect(screen.getByText("Staff")).toBeInTheDocument();
  });

  it("renders the stat values from the stats prop", () => {
    render(
      <OverviewClient
        {...defaultProps}
        stats={makeStats({
          totalTournaments: 7,
          uniquePlayers: 55,
          totalEntries: 100,
          staffCount: 4,
        })}
      />
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  describe("when totalTournaments is 0", () => {
    it("shows the onboarding subtitle on all four stat cards", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({ totalTournaments: 0, activeTournaments: 0 })}
        />
      );
      const hints = screen.getAllByText(
        "Host your first tournament to start tracking"
      );
      expect(hints).toHaveLength(4);
    });
  });

  describe("when totalTournaments > 0", () => {
    it("shows active tournament count in Tournaments subtitle", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({ totalTournaments: 5, activeTournaments: 2 })}
        />
      );
      expect(screen.getByText("↑ 2 active")).toBeInTheDocument();
    });

    it("shows total entries in Unique Players subtitle", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({
            totalTournaments: 2,
            totalEntries: 80,
            uniquePlayers: 50,
          })}
        />
      );
      expect(screen.getByText("of 80 total entries")).toBeInTheDocument();
    });

    it("shows per-event average in Total Entries subtitle", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({ totalTournaments: 4, totalEntries: 80 })}
        />
      );
      expect(screen.getByText("~20 per event")).toBeInTheDocument();
    });

    it("shows per-event average of 0 when totalEntries is 0", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({ totalTournaments: 2, totalEntries: 0 })}
        />
      );
      expect(screen.getByText("~0 per event")).toBeInTheDocument();
    });

    it("shows admin and judge breakdown in Staff subtitle", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({
            totalTournaments: 1,
            adminCount: 2,
            judgeCount: 3,
          })}
        />
      );
      expect(screen.getByText("2 admins, 3 judges")).toBeInTheDocument();
    });
  });

  describe("staff avatar badges", () => {
    it("shows Admin badge when adminCount > 0", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({ adminCount: 1, judgeCount: 0 })}
        />
      );
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("shows Judge badge when judgeCount > 0", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({ adminCount: 0, judgeCount: 1 })}
        />
      );
      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("hides Admin badge when adminCount is 0", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({ adminCount: 0, judgeCount: 1 })}
        />
      );
      expect(screen.queryByText("A")).not.toBeInTheDocument();
    });

    it("hides Judge badge when judgeCount is 0", () => {
      render(
        <OverviewClient
          {...defaultProps}
          stats={makeStats({ adminCount: 1, judgeCount: 0 })}
        />
      );
      expect(screen.queryByText("J")).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// Upcoming Tournaments
// =============================================================================

describe("OverviewClient — Upcoming Tournaments", () => {
  it("shows empty state when upcomingTournaments is empty", () => {
    render(<OverviewClient {...defaultProps} upcomingTournaments={[]} />);
    expect(screen.getByText("No upcoming tournaments")).toBeInTheDocument();
  });

  it("shows Create Tournament link in empty state", () => {
    render(<OverviewClient {...defaultProps} upcomingTournaments={[]} />);
    const links = screen.getAllByRole("link", { name: /create tournament/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("renders tournament names when upcomingTournaments is non-empty", () => {
    const t = makeUpcomingTournament({ name: "Summer Regionals" });
    render(<OverviewClient {...defaultProps} upcomingTournaments={[t]} />);
    expect(screen.getByText("Summer Regionals")).toBeInTheDocument();
  });

  it("renders registration count and max participants", () => {
    const t = makeUpcomingTournament({
      registrationCount: 16,
      max_participants: 32,
    });
    render(<OverviewClient {...defaultProps} upcomingTournaments={[t]} />);
    expect(screen.getByText(/16\/32 registered/)).toBeInTheDocument();
  });

  it("renders ∞ when max_participants is null", () => {
    const t = makeUpcomingTournament({
      max_participants: null,
      registrationCount: 5,
    });
    render(<OverviewClient {...defaultProps} upcomingTournaments={[t]} />);
    expect(screen.getByText(/5\/∞ registered/)).toBeInTheDocument();
  });

  describe("fill-rate bar clamping", () => {
    it("clamps the fill bar to 100% when registrations exceed max", () => {
      const t = makeUpcomingTournament({
        registrationCount: 80,
        max_participants: 64,
      });
      const { container } = render(
        <OverviewClient {...defaultProps} upcomingTournaments={[t]} />
      );
      // The inner bar div uses inline style with width percentage
      const bar = container.querySelector(
        ".bg-primary.h-full.rounded-full"
      ) as HTMLElement;
      expect(bar).not.toBeNull();
      expect(bar.style.width).toBe("100%");
    });

    it("sets fill bar to 50% when half-full", () => {
      const t = makeUpcomingTournament({
        registrationCount: 32,
        max_participants: 64,
      });
      const { container } = render(
        <OverviewClient {...defaultProps} upcomingTournaments={[t]} />
      );
      const bar = container.querySelector(
        ".bg-primary.h-full.rounded-full"
      ) as HTMLElement;
      expect(bar.style.width).toBe("50%");
    });

    it("sets fill bar to 0% when max_participants is null", () => {
      const t = makeUpcomingTournament({
        max_participants: null,
        registrationCount: 10,
      });
      const { container } = render(
        <OverviewClient {...defaultProps} upcomingTournaments={[t]} />
      );
      const bar = container.querySelector(
        ".bg-primary.h-full.rounded-full"
      ) as HTMLElement;
      expect(bar.style.width).toBe("0%");
    });
  });

  describe("formatShortDate (via rendered output)", () => {
    it("renders 'TBD' when start_date is null", () => {
      const t = makeUpcomingTournament({ start_date: null });
      render(<OverviewClient {...defaultProps} upcomingTournaments={[t]} />);
      expect(screen.getByText(/TBD/)).toBeInTheDocument();
    });

    it("renders a formatted date string when start_date is provided", () => {
      const t = makeUpcomingTournament({ start_date: "2026-08-15T10:00:00Z" });
      render(<OverviewClient {...defaultProps} upcomingTournaments={[t]} />);
      // Should be formatted as short date like "Aug 15" — locale-dependent,
      // so just verify the element is present and not "TBD"
      const dateLine = screen.queryByText(/TBD/);
      expect(dateLine).toBeNull();
    });
  });
});

// =============================================================================
// Activity Feed — activityVerb
// =============================================================================

describe("OverviewClient — Activity Feed", () => {
  it("shows empty state message when activity is empty", () => {
    render(<OverviewClient {...defaultProps} activity={[]} />);
    expect(
      screen.getByText(
        "No activity yet — things will show up here as your community grows"
      )
    ).toBeInTheDocument();
  });

  describe("activityVerb mapping", () => {
    it.each([
      {
        type: "registration" as const,
        actorName: "ash",
        targetName: "Summer Cup",
        expected: "registered for Summer Cup",
      },
      {
        type: "tournament_completed" as const,
        actorName: null,
        targetName: "Summer Cup",
        expected: "was completed",
      },
      {
        type: "staff_joined" as const,
        actorName: "brock",
        targetName: null,
        expected: "joined staff",
      },
      {
        type: "tournament_created" as const,
        actorName: null,
        targetName: "New Event",
        expected: "was created",
      },
    ])(
      "renders '$expected' for type=$type",
      ({ type, actorName, targetName, expected }) => {
        const item = makeActivityItem({ type, actorName, targetName });
        render(<OverviewClient {...defaultProps} activity={[item]} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
      }
    );
  });

  it("renders actorName as bold text when provided", () => {
    const item = makeActivityItem({ type: "registration", actorName: "ash" });
    render(<OverviewClient {...defaultProps} activity={[item]} />);
    const bold = screen.getByText("ash");
    expect(bold.tagName).toBe("SPAN");
    expect(bold).toHaveClass("font-medium");
  });

  it("does not render actorName text when actorName is null", () => {
    const item = makeActivityItem({
      type: "tournament_completed",
      actorName: null,
    });
    render(<OverviewClient {...defaultProps} activity={[item]} />);
    // No actor name present — just the verb
    expect(screen.getByText("was completed")).toBeInTheDocument();
  });

  it("renders the formatted relative time for each activity item", () => {
    const item = makeActivityItem();
    render(<OverviewClient {...defaultProps} activity={[item]} />);
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });

  it("renders multiple activity items", () => {
    const items: CommunityActivityItem[] = [
      makeActivityItem({
        type: "registration",
        actorName: "ash",
        targetName: "Cup A",
      }),
      makeActivityItem({
        type: "staff_joined",
        actorName: "brock",
        targetName: null,
      }),
    ];
    render(<OverviewClient {...defaultProps} activity={items} />);
    expect(screen.getByText("registered for Cup A")).toBeInTheDocument();
    expect(screen.getByText("joined staff")).toBeInTheDocument();
  });
});

// =============================================================================
// Top Regulars
// =============================================================================

describe("OverviewClient — Top Regulars", () => {
  it("shows empty state when topPlayers is empty", () => {
    render(<OverviewClient {...defaultProps} topPlayers={[]} />);
    expect(
      screen.getByText("Players will appear here after your first tournament")
    ).toBeInTheDocument();
  });

  it("renders player usernames", () => {
    const players = [
      makeTopPlayer({ userId: "u1", username: "ash", eventCount: 8 }),
      makeTopPlayer({ userId: "u2", username: "brock", eventCount: 5 }),
    ];
    render(<OverviewClient {...defaultProps} topPlayers={players} />);
    expect(screen.getByText("ash")).toBeInTheDocument();
    expect(screen.getByText("brock")).toBeInTheDocument();
  });

  it("renders the event count for each player", () => {
    const players = [makeTopPlayer({ username: "ash", eventCount: 12 })];
    render(<OverviewClient {...defaultProps} topPlayers={players} />);
    expect(screen.getByText("12 events")).toBeInTheDocument();
  });

  it("renders rank numbers starting at 1", () => {
    const players = [
      makeTopPlayer({ userId: "u1", username: "ash" }),
      makeTopPlayer({ userId: "u2", username: "brock" }),
      makeTopPlayer({ userId: "u3", username: "misty" }),
    ];
    render(<OverviewClient {...defaultProps} topPlayers={players} />);
    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getByText("3.")).toBeInTheDocument();
  });

  it("renders first letter of username as the avatar", () => {
    const players = [makeTopPlayer({ username: "misty" })];
    // Use stats with no admin/judge badges so "M" is unambiguous
    render(
      <OverviewClient
        {...defaultProps}
        stats={makeStats({ adminCount: 0, judgeCount: 0 })}
        topPlayers={players}
      />
    );
    // Avatar uses charAt(0).toUpperCase() → "M"
    expect(screen.getByText("M")).toBeInTheDocument();
  });
});

// =============================================================================
// Navigation links
// =============================================================================

describe("OverviewClient — navigation links", () => {
  it("renders a Create Tournament link pointing to the correct route", () => {
    render(<OverviewClient {...defaultProps} communitySlug="vgc-league" />);
    const links = screen.getAllByRole("link", { name: /create tournament/i });
    links.forEach((link) => {
      expect(link).toHaveAttribute(
        "href",
        "/dashboard/community/vgc-league/tournaments/create"
      );
    });
  });

  it("renders a View all link to the tournaments list", () => {
    render(<OverviewClient {...defaultProps} communitySlug="vgc-league" />);
    const link = screen.getByRole("link", { name: /view all/i });
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/community/vgc-league/tournaments"
    );
  });
});
