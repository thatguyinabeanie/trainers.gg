import { render, screen, waitFor } from "@testing-library/react";
import { TournamentPairingsJudge } from "../tournament-pairings-judge";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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

const mockResult = (data: unknown) => ({
  data,
  error: null,
  isLoading: false,
  refetch: jest.fn(),
});

describe("TournamentPairingsJudge", () => {
  const mockTournament = {
    id: 1,
    slug: "test-tournament",
    currentPhaseId: 123,
  };

  const mockPhases = [{ id: 123, name: "Swiss", phase_order: 1 }];

  // Stable mock that handles re-renders: returns data based on call order mod 3
  // (phases, rounds, matches cycle)
  const setupStableMocks = (
    phases: unknown[],
    rounds: unknown[],
    matches: unknown[]
  ) => {
    let callCount = 0;
    mockUseSupabaseQuery.mockImplementation(() => {
      const idx = callCount % 3;
      callCount++;
      if (idx === 0) return mockResult(phases);
      if (idx === 1) return mockResult(rounds);
      return mockResult(matches);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockUseSupabase.mockReturnValue(
      mockSupabase as ReturnType<typeof useSupabase>
    );
  });

  describe("No Phases", () => {
    it("should display message when no phases exist", () => {
      mockUseSupabaseQuery.mockReturnValue(mockResult([]));

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Pairings")).toBeInTheDocument();
      expect(screen.getByText(/No phases configured/)).toBeInTheDocument();
    });
  });

  describe("No Rounds", () => {
    it("should display message when no rounds exist", () => {
      setupStableMocks(mockPhases, [], []);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("No Rounds")).toBeInTheDocument();
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
        is_bye: false,
        game_wins1: 0,
        game_wins2: 0,
        player1_match_confirmed: true,
        player2_match_confirmed: true,
        player1: { id: 1, username: "playera", display_name: null },
        player2: { id: 2, username: "playerb", display_name: null },
        winner: null,
      },
      {
        id: 2,
        table_number: 2,
        status: "pending",
        staff_requested: true,
        is_bye: false,
        game_wins1: 0,
        game_wins2: 0,
        player1_match_confirmed: false,
        player2_match_confirmed: false,
        player1: { id: 3, username: "playerc", display_name: null },
        player2: { id: 4, username: "playerd", display_name: null },
        winner: null,
      },
    ];

    it("should display round heading", () => {
      setupStableMocks(mockPhases, mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Round 1 Matches")).toBeInTheDocument();
    });

    it("should show realtime status badge when viewing active round", () => {
      setupStableMocks(mockPhases, mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("should display pairings tab by default", () => {
      setupStableMocks(mockPhases, mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Round 1 Matches")).toBeInTheDocument();
    });

    it("should display player names in matches", () => {
      setupStableMocks(mockPhases, mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("playera")).toBeInTheDocument();
      expect(screen.getByText("playerb")).toBeInTheDocument();
      expect(screen.getByText("playerc")).toBeInTheDocument();
      expect(screen.getByText("playerd")).toBeInTheDocument();
    });

    it("should display table numbers for matches", () => {
      setupStableMocks(mockPhases, mockRounds, mockMatches);

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
        is_bye: false,
        game_wins1: 0,
        game_wins2: 0,
        player1_match_confirmed: true,
        player2_match_confirmed: true,
        player1: { id: 1, username: "playera", display_name: null },
        player2: { id: 2, username: "playerb", display_name: null },
        winner: null,
      },
      {
        id: 2,
        table_number: 2,
        status: "active",
        staff_requested: true,
        is_bye: false,
        game_wins1: 0,
        game_wins2: 0,
        player1_match_confirmed: true,
        player2_match_confirmed: true,
        player1: { id: 3, username: "playerc", display_name: null },
        player2: { id: 4, username: "playerd", display_name: null },
        winner: null,
      },
      {
        id: 3,
        table_number: 3,
        status: "active",
        staff_requested: true,
        is_bye: false,
        game_wins1: 0,
        game_wins2: 0,
        player1_match_confirmed: true,
        player2_match_confirmed: true,
        player1: { id: 5, username: "playere", display_name: null },
        player2: { id: 6, username: "playerf", display_name: null },
        winner: null,
      },
    ];

    it("should show badge count on judge queue tab when requests exist", () => {
      setupStableMocks(mockPhases, mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      expect(judgeTab).toHaveTextContent("2");
    });

    it("should switch to judge queue tab when clicked", async () => {
      const user = userEvent.setup();
      setupStableMocks(mockPhases, mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      await user.click(judgeTab);

      await waitFor(() => {
        expect(
          screen.getByText("Matches requesting staff assistance")
        ).toBeInTheDocument();
      });
    });

    it("should show Respond buttons in judge queue", async () => {
      const user = userEvent.setup();
      setupStableMocks(mockPhases, mockRounds, mockMatches);

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      await user.click(judgeTab);

      await waitFor(() => {
        const respondButtons = screen.getAllByRole("button", {
          name: /respond/i,
        });
        expect(respondButtons).toHaveLength(2);
      });
    });

    it("should show message when judge queue is empty", async () => {
      const user = userEvent.setup();

      const noRequestMatches = [
        {
          id: 1,
          table_number: 1,
          status: "active",
          staff_requested: false,
          is_bye: false,
          game_wins1: 0,
          game_wins2: 0,
          player1_match_confirmed: true,
          player2_match_confirmed: true,
          player1: { id: 1, username: "playera", display_name: null },
          player2: { id: 2, username: "playerb", display_name: null },
          winner: null,
        },
      ];

      setupStableMocks(mockPhases, mockRounds, noRequestMatches);

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
    it("should set up match realtime subscription when active round exists", () => {
      setupStableMocks(
        mockPhases,
        [{ id: 1, round_number: 1, status: "active" }],
        []
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(mockSupabase.channel).toHaveBeenCalledWith("pairings-matches-1");
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it("should set up round subscription for new round detection", () => {
      setupStableMocks(
        mockPhases,
        [{ id: 1, round_number: 1, status: "active" }],
        []
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(mockSupabase.channel).toHaveBeenCalledWith("pairings-rounds-123");
    });

    it("should cleanup subscription on unmount", () => {
      setupStableMocks(
        mockPhases,
        [{ id: 1, round_number: 1, status: "active" }],
        []
      );

      const { unmount } = render(
        <TournamentPairingsJudge tournament={mockTournament} />
      );

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe("Empty States", () => {
    it("should show message when no matches exist for active round", () => {
      setupStableMocks(
        mockPhases,
        [{ id: 1, round_number: 1, status: "active" }],
        []
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(
        screen.getByText("No matches found for this round.")
      ).toBeInTheDocument();
    });
  });

  describe("BYE Handling", () => {
    it("should display BYE for matches without player data", () => {
      setupStableMocks(
        mockPhases,
        [{ id: 1, round_number: 1, status: "active" }],
        [
          {
            id: 1,
            table_number: 1,
            status: "active",
            staff_requested: false,
            is_bye: false,
            game_wins1: 0,
            game_wins2: 0,
            player1_match_confirmed: true,
            player2_match_confirmed: true,
            player1: null,
            player2: { id: 2, username: "playerb", display_name: null },
            winner: null,
          },
        ]
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getAllByText("BYE")[0]).toBeInTheDocument();
      expect(screen.getByText("playerb")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to match page when Respond button is clicked", async () => {
      const user = userEvent.setup();

      setupStableMocks(
        mockPhases,
        [{ id: 1, round_number: 1, status: "active" }],
        [
          {
            id: 42,
            table_number: 1,
            status: "active",
            staff_requested: true,
            is_bye: false,
            game_wins1: 0,
            game_wins2: 0,
            player1_match_confirmed: true,
            player2_match_confirmed: true,
            player1: { id: 1, username: "playera", display_name: null },
            player2: { id: 2, username: "playerb", display_name: null },
            winner: null,
          },
        ]
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      await user.click(judgeTab);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /respond/i })
        ).toBeInTheDocument();
      });

      const respondBtn = screen.getByRole("button", { name: /respond/i });
      await user.click(respondBtn);

      expect(mockPush).toHaveBeenCalledWith(
        "/tournaments/test-tournament/r/1/t/1"
      );
    });
  });
});
