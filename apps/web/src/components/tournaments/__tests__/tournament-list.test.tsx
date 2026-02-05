import type React from "react";
import { render, screen } from "@testing-library/react";
import {
  SectionHeader,
  ActiveTournaments,
  UpcomingTournaments,
  CompletedTournaments,
  TournamentCardGrid,
  TournamentListEmpty,
} from "../tournament-list";
import type { TournamentWithOrg } from "@trainers/supabase";

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock next/link
jest.mock("next/link", () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock DateChip component
jest.mock("@/app/tournaments/date-chip", () => ({
  DateChip: ({
    dateString,
    showTime,
  }: {
    dateString: string | null;
    showTime?: boolean;
  }) => (
    <span data-testid="date-chip">
      {dateString ? new Date(dateString).toISOString() : "TBD"}
      {showTime ? " (with time)" : ""}
    </span>
  ),
}));

const mockTournament: TournamentWithOrg = {
  id: 1,
  name: "Test Tournament",
  slug: "test-tournament",
  description: "A test tournament",
  status: "upcoming",
  format: "swiss",
  game: "vgc",
  game_format: "gen9",
  battle_format: "doubles" as const,
  tournament_format: "swiss_only",
  swiss_rounds: 5,
  current_round: 0,
  start_date: "2026-03-01T10:00:00Z",
  end_date: null,
  registration_start: "2026-02-01T00:00:00Z",
  registration_end: "2026-02-28T23:59:59Z",
  max_participants: 32,
  organization_id: 1,
  created_by_user_id: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  archived_at: null,
  registrationCount: 16,
  organization: {
    id: 1,
    name: "Test Org",
    slug: "test-org",
  },
  winner: null,
};

describe("SectionHeader", () => {
  it("renders section header with title and count", () => {
    render(<SectionHeader title="Upcoming" count={5} />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not render when count is 0", () => {
    const { container } = render(<SectionHeader title="Upcoming" count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ActiveTournaments", () => {
  it("renders active tournament cards", () => {
    const activeTournament = {
      ...mockTournament,
      status: "active" as const,
      current_round: 3,
      swiss_rounds: 5,
    };

    render(<ActiveTournaments tournaments={[activeTournament]} />);

    expect(screen.getByText("Test Tournament")).toBeInTheDocument();
    expect(screen.getByText("Test Org")).toBeInTheDocument();
    expect(screen.getByText("16 players")).toBeInTheDocument();
    expect(screen.getByText("Swiss")).toBeInTheDocument();
  });

  it("hides organization when showOrganization is false", () => {
    const activeTournament = {
      ...mockTournament,
      status: "active" as const,
    };

    render(
      <ActiveTournaments
        tournaments={[activeTournament]}
        showOrganization={false}
      />
    );

    expect(screen.getByText("Test Tournament")).toBeInTheDocument();
    expect(screen.queryByText("Test Org")).not.toBeInTheDocument();
  });

  it("shows progress bar for active tournaments", () => {
    const activeTournament = {
      ...mockTournament,
      status: "active" as const,
      current_round: 3,
      swiss_rounds: 5,
    };

    render(<ActiveTournaments tournaments={[activeTournament]} />);

    // Check for progress bar (look for a div with specific width style)
    const progressBar = screen
      .getByText("Test Tournament")
      .closest("a")
      ?.querySelector('[style*="width: 60%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("uses custom linkPath when provided", () => {
    const activeTournament = {
      ...mockTournament,
      status: "active" as const,
    };

    render(
      <ActiveTournaments
        tournaments={[activeTournament]}
        linkPath={(t) => `/custom/${t.slug}`}
      />
    );

    const link = screen.getByText("Test Tournament").closest("a");
    expect(link).toHaveAttribute("href", "/custom/test-tournament");
  });

  it("returns null when no tournaments", () => {
    const { container } = render(<ActiveTournaments tournaments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("UpcomingTournaments", () => {
  it("renders upcoming tournaments in table on desktop", () => {
    render(<UpcomingTournaments tournaments={[mockTournament]} />);

    // Component renders both mobile and desktop views
    const links = screen.getAllByText("Test Tournament");
    expect(links.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Test Org").length).toBeGreaterThan(0);
    expect(screen.getByText("16 / 32")).toBeInTheDocument();
  });

  it("hides organization column when showOrganization is false", () => {
    render(
      <UpcomingTournaments
        tournaments={[mockTournament]}
        showOrganization={false}
      />
    );

    // Check that organization header is not present
    expect(screen.queryByText("Organization")).not.toBeInTheDocument();
  });

  it("renders action slot when provided", () => {
    render(
      <UpcomingTournaments
        tournaments={[mockTournament]}
        actionSlot={(t) => <button>Register for {t.name}</button>}
      />
    );

    // Should render in both mobile and desktop views
    const buttons = screen.getAllByText("Register for Test Tournament");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("uses custom linkPath when provided", () => {
    render(
      <UpcomingTournaments
        tournaments={[mockTournament]}
        linkPath={(t) => `/manage/${t.slug}`}
      />
    );

    const links = screen.getAllByText("Test Tournament");
    const link = links[0]?.closest("a");
    expect(link).toHaveAttribute("href", "/manage/test-tournament");
  });

  it("returns null when no tournaments", () => {
    const { container } = render(<UpcomingTournaments tournaments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("CompletedTournaments", () => {
  const completedTournament: TournamentWithOrg = {
    ...mockTournament,
    status: "completed" as const,
    end_date: "2026-03-01T18:00:00Z",
    winner: {
      id: 1,
      username: "champion",
      display_name: "Champion Player",
    },
  };

  it("renders completed tournaments with winner", () => {
    render(<CompletedTournaments tournaments={[completedTournament]} />);

    // Component renders both mobile and desktop views
    const names = screen.getAllByText("Test Tournament");
    expect(names.length).toBeGreaterThan(0);
    const winners = screen.getAllByText("Champion Player");
    expect(winners.length).toBeGreaterThan(0);
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("shows dash when no winner", () => {
    const noWinner = { ...completedTournament, winner: null };
    render(<CompletedTournaments tournaments={[noWinner]} />);

    // Check for dash in winner column
    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("hides organization column when showOrganization is false", () => {
    render(
      <CompletedTournaments
        tournaments={[completedTournament]}
        showOrganization={false}
      />
    );

    expect(screen.queryByText("Organization")).not.toBeInTheDocument();
  });

  it("uses custom linkPath when provided", () => {
    render(
      <CompletedTournaments
        tournaments={[completedTournament]}
        linkPath={(t) => `/results/${t.slug}`}
      />
    );

    const links = screen.getAllByText("Test Tournament");
    const link = links[0]?.closest("a");
    expect(link).toHaveAttribute("href", "/results/test-tournament");
  });

  it("returns null when no tournaments", () => {
    const { container } = render(<CompletedTournaments tournaments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TournamentCardGrid", () => {
  it("renders tournament cards in grid", () => {
    render(<TournamentCardGrid tournaments={[mockTournament]} />);

    expect(screen.getByText("Test Tournament")).toBeInTheDocument();
    expect(screen.getByText("16 / 32 players")).toBeInTheDocument();
  });

  it("shows status badge when showStatus is true", () => {
    render(
      <TournamentCardGrid tournaments={[mockTournament]} showStatus={true} />
    );

    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("hides status badge when showStatus is false", () => {
    render(
      <TournamentCardGrid tournaments={[mockTournament]} showStatus={false} />
    );

    expect(screen.queryByText("Upcoming")).not.toBeInTheDocument();
  });

  it("shows organization when showOrganization is true", () => {
    render(
      <TournamentCardGrid
        tournaments={[mockTournament]}
        showOrganization={true}
      />
    );

    expect(screen.getByText("Test Org")).toBeInTheDocument();
  });

  it("uses custom linkPath when provided", () => {
    render(
      <TournamentCardGrid
        tournaments={[mockTournament]}
        linkPath={(t) => `/dashboard/${t.slug}`}
      />
    );

    const link = screen.getByText("Test Tournament").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/test-tournament");
  });

  it("returns null when no tournaments", () => {
    const { container } = render(<TournamentCardGrid tournaments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TournamentListEmpty", () => {
  it("renders default empty state", () => {
    render(<TournamentListEmpty />);

    expect(screen.getByText("No tournaments found")).toBeInTheDocument();
    expect(
      screen.getByText("Check back later for upcoming tournaments!")
    ).toBeInTheDocument();
  });

  it("renders custom title and description", () => {
    render(
      <TournamentListEmpty
        title="Custom Title"
        description="Custom Description"
      />
    );

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Description")).toBeInTheDocument();
  });

  it("renders children when provided", () => {
    render(
      <TournamentListEmpty>
        <button>Create Tournament</button>
      </TournamentListEmpty>
    );

    expect(screen.getByText("Create Tournament")).toBeInTheDocument();
  });

  it("renders custom icon when provided", () => {
    render(
      <TournamentListEmpty icon={<div data-testid="custom-icon">Icon</div>} />
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});
