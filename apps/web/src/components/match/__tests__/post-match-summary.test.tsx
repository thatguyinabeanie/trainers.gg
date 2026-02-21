import { type ReactNode } from "react";
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
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

const createQueryBuilder = (
  response: { data?: unknown; count?: number } = {}
) => {
  const finalResponse = {
    data: response.data ?? { id: 1 },
    count: response.count ?? 0,
    error: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};

  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);

  // Explicit helper when the code calls .maybeSingle()
  builder.maybeSingle = jest.fn(() =>
    Promise.resolve({ data: finalResponse.data, error: null })
  );

  // Explicit helper when the code calls .head()
  builder.head = jest.fn(() =>
    Promise.resolve({ count: finalResponse.count, error: null })
  );

  // Make the builder awaitable: await supabase.from(...).select(...).eq(...).eq(...)
  builder.then = (
    onFulfilled: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise.resolve(finalResponse).then(onFulfilled, onRejected);

  return builder;
};

const mockSupabase = {
  from: jest.fn(() => createQueryBuilder()),
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
        table_number: 7,
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
        "/tournaments/test-tournament/r/4/t/7"
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

  it("shows round complete status when round is completed", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([]);

    render(<PostMatchSummary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Round 3 complete")).toBeInTheDocument();
    });
  });

  it("shows waiting status when round is still active", async () => {
    (getPlayerMatches as jest.Mock).mockResolvedValue([]);

    // Mock Supabase to return count > 0 for active matches
    const mockSupabaseWithActiveMatches = {
      from: jest.fn((table: string) => {
        if (table === "tournament_matches") {
          // Return count > 0 to indicate active matches
          return createQueryBuilder({ count: 2 });
        }
        // Default for tournament_rounds query
        return createQueryBuilder({ data: { id: 1 } });
      }),
    };

    (useSupabase as jest.Mock).mockReturnValue(mockSupabaseWithActiveMatches);

    render(<PostMatchSummary {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Waiting for Round 3 to complete")
      ).toBeInTheDocument();
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
