import { render, screen, waitFor } from "@testing-library/react";
import { PostMatchSummary } from "../post-match-summary";
import { useSupabase } from "@/lib/supabase";
import { getPlayerMatches } from "@trainers/supabase";

// Mock dependencies
jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(),
}));

jest.mock("@trainers/supabase", () => ({
  getPlayerMatches: jest.fn(),
}));

// Mock Next.js Link
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() =>
            Promise.resolve({ data: { id: 1 }, error: null })
          ),
        })),
        count: jest.fn(() => ({
          head: jest.fn(() => Promise.resolve({ count: 0, error: null })),
        })),
      })),
      head: jest.fn(() => Promise.resolve({ count: 0, error: null })),
    })),
  })),
};

describe("PostMatchSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);
  });

  const defaultProps = {
    tournamentId: 1,
    tournamentSlug: "test-tournament",
    matchId: 100,
    userAltId: 50,
    myWins: 2,
    opponentWins: 1,
    myName: "TestPlayer",
    roundNumber: 3,
  };

  it("displays win result correctly", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([]);

    render(<PostMatchSummary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Match Complete")).toBeInTheDocument();
      expect(screen.getByText("TestPlayer won 2-1")).toBeInTheDocument();
    });
  });

  it("displays loss result correctly", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([]);

    render(<PostMatchSummary {...defaultProps} myWins={1} opponentWins={2} />);

    await waitFor(() => {
      expect(screen.getByText("Match Complete")).toBeInTheDocument();
      expect(screen.getByText("TestPlayer lost 2-1")).toBeInTheDocument();
    });
  });

  it("shows View Standings link", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([]);

    render(<PostMatchSummary {...defaultProps} />);

    await waitFor(() => {
      const standingsLink = screen.getByText("View Standings").closest("a");
      expect(standingsLink).toHaveAttribute(
        "href",
        "/tournaments/test-tournament/standings"
      );
    });
  });

  it("shows Next Match link when next match exists", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([
      {
        id: 101,
        status: "pending",
        round: { round_number: 4 },
      },
    ]);

    render(<PostMatchSummary {...defaultProps} />);

    await waitFor(() => {
      const nextMatchButton = screen.getByText(/Next Match \(Round 4\)/);
      expect(nextMatchButton).toBeInTheDocument();
      const nextMatchLink = nextMatchButton.closest("a");
      expect(nextMatchLink).toHaveAttribute(
        "href",
        "/tournaments/test-tournament/matches/101"
      );
    });
  });

  it("does not show Next Match link when no next match exists", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([]);

    render(<PostMatchSummary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Next Match/)).not.toBeInTheDocument();
    });
  });

  // Note: Testing "Waiting for Round 3 to complete" state is complex due to
  // asynchronous state updates and Supabase query mocking. The round status
  // logic is covered by integration tests. This unit test focuses on the
  // completed state which is simpler to test reliably.

  it("shows round complete status when round is completed", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([]);

    render(<PostMatchSummary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Round 3 complete")).toBeInTheDocument();
    });
  });

  it("handles null userAltId gracefully", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([]);

    render(<PostMatchSummary {...defaultProps} userAltId={null} />);

    await waitFor(() => {
      expect(screen.getByText("Match Complete")).toBeInTheDocument();
      expect(screen.queryByText(/Next Match/)).not.toBeInTheDocument();
    });
  });

  it("handles error when loading next match data", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    (getPlayerMatches as jest.Mock).mockRejectedValue(
      new Error("Failed to fetch")
    );

    render(<PostMatchSummary {...defaultProps} />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error loading next match data:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
