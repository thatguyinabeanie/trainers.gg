import { render, screen, waitFor } from "@testing-library/react";
import { TournamentPairingsJudge } from "../tournament-pairings-judge";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import userEvent from "@testing-library/user-event";

// Mock Supabase hooks
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn((callback) => {
    if (typeof callback === "function") {
      callback("SUBSCRIBED", null);
    }
    return mockChannel;
  }),
  unsubscribe: jest.fn(),
};

const mockSupabase = {
  channel: jest.fn(() => mockChannel),
};

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(),
  useSupabaseQuery: jest.fn(),
}));

const mockUseSupabase = useSupabase as jest.MockedFunction<typeof useSupabase>;
const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;

describe("TournamentPairingsJudge", () => {
  const mockTournament = {
    id: 1,
    currentPhaseId: 123,
  };

  // Helper to set up useSupabaseQuery mock with rounds and matches
  const setupQueryMocks = (rounds: unknown[], matches: unknown[]) => {
    mockUseSupabaseQuery
      .mockReturnValueOnce({
        data: rounds,
        error: null,
        isLoading: false,
        refetch: jest.fn(),
      })
      .mockReturnValueOnce({
        data: matches,
        error: null,
        isLoading: false,
        refetch: jest.fn(),
      });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSupabase.mockReturnValue(
      mockSupabase as ReturnType<typeof useSupabase>
    );
  });

  describe("No Active Round", () => {
    it("should display message when no active round exists", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        refetch: jest.fn(),
      });

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Pairings")).toBeInTheDocument();
      expect(
        screen.getByText(
          "No active round. Pairings will appear when a round starts."
        )
      ).toBeInTheDocument();
    });
  });

  describe("Active Round with Matches", () => {
    const mockRounds = [
      { id: 1, round_number: 1, status: "active" },
      { id: 2, round_number: 2, status: "pending" },
    ];

    const mockMatches = [
      {
        id: 1,
        table_number: 1,
        status: "active",
        staff_requested: false,
        player1: { username: "playera" },
        player2: { username: "playerb" },
      },
      {
        id: 2,
        table_number: 2,
        status: "pending",
        staff_requested: true,
        player1: { username: "playerc" },
        player2: { username: "playerd" },
      },
    ];

    it("should display round number in heading", () => {
      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Round 1 Pairings")).toBeInTheDocument();
    });

    it("should show realtime status badge when active round exists", () => {
      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("should display pairings tab by default", () => {
      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      // Check that pairings content is visible (default tab)
      expect(screen.getByText("All Matches")).toBeInTheDocument();
      expect(screen.getByText("2 matches in Round 1")).toBeInTheDocument();
    });

    it("should display all matches in pairings tab", () => {
      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("playera")).toBeInTheDocument();
      expect(screen.getByText("playerb")).toBeInTheDocument();
      expect(screen.getByText("playerc")).toBeInTheDocument();
      expect(screen.getByText("playerd")).toBeInTheDocument();
    });

    it("should show match count in pairings tab", () => {
      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("2 matches in Round 1")).toBeInTheDocument();
    });

    it("should display table numbers for matches", () => {
      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const tableCells = screen.getAllByRole("cell");
      const tableNumbers = tableCells.filter((cell) =>
        ["1", "2"].includes(cell.textContent || "")
      );
      expect(tableNumbers.length).toBeGreaterThan(0);
    });
  });

  describe("Judge Queue Tab", () => {
    const mockRounds = [{ id: 1, round_number: 1, status: "active" }];

    const mockMatches = [
      {
        id: 1,
        table_number: 1,
        status: "active",
        staff_requested: false,
        player1: { username: "playera" },
        player2: { username: "playerb" },
      },
      {
        id: 2,
        table_number: 2,
        status: "active",
        staff_requested: true,
        player1: { username: "playerc" },
        player2: { username: "playerd" },
      },
      {
        id: 3,
        table_number: 3,
        status: "active",
        staff_requested: true,
        player1: { username: "playere" },
        player2: { username: "playerf" },
      },
    ];

    beforeEach(() => {
      setupQueryMocks(mockRounds, mockMatches);
    });

    it("should show badge count on judge queue tab when requests exist", () => {
      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      expect(judgeTab).toHaveTextContent("2");
    });

    it("should switch to judge queue tab when clicked", async () => {
      const user = userEvent.setup();

      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      await user.click(judgeTab);

      await waitFor(() => {
        // Check that judge queue content is now visible
        expect(
          screen.getByText("Matches requesting staff assistance")
        ).toBeInTheDocument();
      });
    });

    it("should only show matches with staff_requested=true in judge queue", async () => {
      const user = userEvent.setup();

      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      await user.click(judgeTab);

      await waitFor(() => {
        expect(screen.getByText("playerc")).toBeInTheDocument();
        expect(screen.getByText("playere")).toBeInTheDocument();
        // Player A and B should not be visible in judge queue
        expect(screen.queryByText("playera")).not.toBeInTheDocument();
      });
    });

    it("should show message when judge queue is empty", async () => {
      const user = userEvent.setup();

      // Mock with no staff requests
      const noRequestMatches = [
        {
          id: 1,
          table_number: 1,
          status: "active",
          staff_requested: false,
          player1: { username: "playera" },
          player2: { username: "playerb" },
        },
      ];

      setupQueryMocks(mockRounds, noRequestMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      await user.click(judgeTab);

      await waitFor(() => {
        expect(
          screen.getByText("No pending judge requests.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Realtime Subscription", () => {
    it("should set up realtime subscription when active round exists", () => {
      const mockRounds = [{ id: 1, round_number: 1, status: "active" }];

      let callIndex = 0;
      mockUseSupabaseQuery.mockImplementation(() => {
        const responses = [mockRounds, []];
        return {
          data: responses[callIndex++],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        };
      });

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(mockSupabase.channel).toHaveBeenCalledWith("pairings-1");
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_matches",
          filter: "round_id=eq.1",
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it("should not set up subscription when no active round", () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        error: null,
        isLoading: false,
        refetch: jest.fn(),
      });

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    it("should cleanup subscription on unmount", () => {
      const mockRounds = [{ id: 1, round_number: 1, status: "active" }];

      let callIndex = 0;
      mockUseSupabaseQuery.mockImplementation(() => {
        const responses = [mockRounds, []];
        return {
          data: responses[callIndex++],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        };
      });

      const { unmount } = render(
        <TournamentPairingsJudge tournament={mockTournament} />
      );

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe("Empty States", () => {
    it("should show message when no matches exist for active round", () => {
      const mockRounds = [{ id: 1, round_number: 1, status: "active" }];

      let callIndex = 0;
      mockUseSupabaseQuery.mockImplementation(() => {
        const responses = [mockRounds, []];
        return {
          data: responses[callIndex++],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        };
      });

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(
        screen.getByText("No matches found for this round.")
      ).toBeInTheDocument();
    });
  });

  describe("BYE Handling", () => {
    it("should display BYE for matches without player data", () => {
      const mockRounds = [{ id: 1, round_number: 1, status: "active" }];
      const mockMatches = [
        {
          id: 1,
          table_number: 1,
          status: "active",
          staff_requested: false,
          player1: null,
          player2: { username: "playerb" },
        },
      ];

      setupQueryMocks(mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getAllByText("BYE")[0]).toBeInTheDocument();
      expect(screen.getByText("playerb")).toBeInTheDocument();
    });
  });
});
