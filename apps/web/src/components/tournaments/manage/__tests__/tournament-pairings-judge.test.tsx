import { render, screen, waitFor } from "@testing-library/react";
import { TournamentPairingsJudge } from "../tournament-pairings-judge";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ---------------------------------------------------------------------------
// Realtime / Supabase mock (channels RETAINED in judge view)
// ---------------------------------------------------------------------------

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
}));

import { useSupabase } from "@/lib/supabase";
const mockUseSupabase = useSupabase as jest.MockedFunction<typeof useSupabase>;

// ---------------------------------------------------------------------------
// useApiQuery mock — replaces the three useSupabaseQuery calls
// ---------------------------------------------------------------------------

const mockUseApiQuery = jest.fn();

jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal TournamentPairingsData shape for tests.
 * phases, allPhaseRounds, roundsWithStats, and unpairedPlayers mirror the
 * shape returned by GET /api/v1/tournaments/[id]/pairings.
 */
function buildPairingsData(overrides: {
  phases?: Array<{ id: number; name: string | null; phase_order: number }>;
  allPhaseRounds?: Array<
    Array<{
      id: number;
      round_number: number;
      status: string | null;
      matches: unknown[];
    }>
  >;
  roundsWithStats?: Array<{
    id: number;
    round_number: number;
    status: string | null;
    matchCount: number;
    completedCount: number;
    inProgressCount: number;
    pendingCount: number;
  }>;
}) {
  return {
    phases: overrides.phases ?? [],
    allPhaseRounds: overrides.allPhaseRounds ?? [],
    roundsWithStats: overrides.roundsWithStats ?? [],
    unpairedPlayers: [],
  };
}

const BASE_PHASES = [{ id: 123, name: "Swiss", phase_order: 1 }];

const ACTIVE_ROUND_STATS = {
  id: 1,
  round_number: 1,
  status: "active",
  matchCount: 2,
  completedCount: 0,
  inProgressCount: 2,
  pendingCount: 0,
};

function makeMatch(overrides: {
  id: number;
  table_number: number;
  status: string;
  staff_requested?: boolean;
  is_bye?: boolean;
  game_wins1?: number;
  game_wins2?: number;
  player1_match_confirmed?: boolean;
  player2_match_confirmed?: boolean;
  player1: { id: number; username: string } | null;
  player2: { id: number; username: string } | null;
}) {
  return {
    staff_requested: false,
    is_bye: false,
    game_wins1: 0,
    game_wins2: 0,
    player1_match_confirmed: false,
    player2_match_confirmed: false,
    winner_alt_id: null,
    alt1_id: overrides.player1?.id ?? null,
    alt2_id: overrides.player2?.id ?? null,
    player1Stats: null,
    player2Stats: null,
    ...overrides,
  };
}

function apiResult(data: unknown) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TournamentPairingsJudge", () => {
  const mockTournament = {
    id: 1,
    slug: "test-tournament",
    currentPhaseId: 123,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockUseSupabase.mockReturnValue(
      mockSupabase as ReturnType<typeof useSupabase>
    );
    // Default: empty pairings data
    mockUseApiQuery.mockReturnValue(
      apiResult(buildPairingsData({ phases: [] }))
    );
  });

  // -------------------------------------------------------------------------
  // useApiQuery wiring
  // -------------------------------------------------------------------------

  describe("API query wiring", () => {
    it("calls useApiQuery with the pairings endpoint URL", () => {
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      const [queryKey] = mockUseApiQuery.mock.calls[0] as [unknown[]];
      expect(queryKey).toContain(mockTournament.id);
    });

    it("uses staleTime: 0 so realtime refetches always get fresh data", () => {
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      const [, , options] = mockUseApiQuery.mock.calls[0] as [
        unknown,
        unknown,
        { staleTime: number },
      ];
      expect(options.staleTime).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // No Phases
  // -------------------------------------------------------------------------

  describe("No Phases", () => {
    it("displays message when no phases exist", () => {
      mockUseApiQuery.mockReturnValue(
        apiResult(buildPairingsData({ phases: [] }))
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("Pairings")).toBeInTheDocument();
      expect(screen.getByText(/No phases configured/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // No Rounds
  // -------------------------------------------------------------------------

  describe("No Rounds", () => {
    it("displays message when no rounds exist", () => {
      mockUseApiQuery.mockReturnValue(
        apiResult(
          buildPairingsData({
            phases: BASE_PHASES,
            allPhaseRounds: [[]],
            roundsWithStats: [],
          })
        )
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      expect(screen.getByText("No Rounds")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Active Round with Matches
  // -------------------------------------------------------------------------

  describe("Active Round with Matches", () => {
    const matchA = makeMatch({
      id: 1,
      table_number: 1,
      status: "active",
      player1_match_confirmed: true,
      player2_match_confirmed: true,
      player1: { id: 1, username: "playera" },
      player2: { id: 2, username: "playerb" },
    });

    const matchB = makeMatch({
      id: 2,
      table_number: 2,
      status: "pending",
      staff_requested: true,
      player1: { id: 3, username: "playerc" },
      player2: { id: 4, username: "playerd" },
    });

    const pairingsWithMatches = buildPairingsData({
      phases: BASE_PHASES,
      allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [matchA, matchB] }]],
      roundsWithStats: [ACTIVE_ROUND_STATS],
    });

    it("displays round heading", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithMatches));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(screen.getByText("Round 1 Matches")).toBeInTheDocument();
    });

    it("shows realtime status badge when viewing active round", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithMatches));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("displays player names in matches", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithMatches));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(screen.getByText("playera")).toBeInTheDocument();
      expect(screen.getByText("playerb")).toBeInTheDocument();
      expect(screen.getByText("playerc")).toBeInTheDocument();
      expect(screen.getByText("playerd")).toBeInTheDocument();
    });

    it("displays table numbers for matches", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithMatches));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      const tableCells = screen.getAllByRole("cell");
      const tableNumbers = tableCells.filter((cell) =>
        ["1", "2"].includes(cell.textContent || "")
      );
      expect(tableNumbers.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Judge Queue Tab
  // -------------------------------------------------------------------------

  describe("Judge Queue Tab", () => {
    const matchNormal = makeMatch({
      id: 1,
      table_number: 1,
      status: "active",
      player1_match_confirmed: true,
      player2_match_confirmed: true,
      player1: { id: 1, username: "playera" },
      player2: { id: 2, username: "playerb" },
    });
    const matchJudge1 = makeMatch({
      id: 2,
      table_number: 2,
      status: "active",
      staff_requested: true,
      player1_match_confirmed: true,
      player2_match_confirmed: true,
      player1: { id: 3, username: "playerc" },
      player2: { id: 4, username: "playerd" },
    });
    const matchJudge2 = makeMatch({
      id: 3,
      table_number: 3,
      status: "active",
      staff_requested: true,
      player1_match_confirmed: true,
      player2_match_confirmed: true,
      player1: { id: 5, username: "playere" },
      player2: { id: 6, username: "playerf" },
    });

    const pairingsWithJudgeQueue = buildPairingsData({
      phases: BASE_PHASES,
      allPhaseRounds: [
        [
          {
            ...ACTIVE_ROUND_STATS,
            matchCount: 3,
            matches: [matchNormal, matchJudge1, matchJudge2],
          },
        ],
      ],
      roundsWithStats: [{ ...ACTIVE_ROUND_STATS, matchCount: 3 }],
    });

    it("shows badge count on judge queue tab when requests exist", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithJudgeQueue));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      const judgeTab = screen.getByRole("tab", { name: /judge queue/i });
      expect(judgeTab).toHaveTextContent("2");
    });

    it("switches to judge queue tab when clicked", async () => {
      const user = userEvent.setup();
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithJudgeQueue));
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      await user.click(screen.getByRole("tab", { name: /judge queue/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Matches requesting staff assistance")
        ).toBeInTheDocument();
      });
    });

    it("shows Respond buttons in judge queue", async () => {
      const user = userEvent.setup();
      mockUseApiQuery.mockReturnValue(apiResult(pairingsWithJudgeQueue));
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      await user.click(screen.getByRole("tab", { name: /judge queue/i }));

      await waitFor(() => {
        const respondButtons = screen.getAllByRole("button", {
          name: /respond/i,
        });
        expect(respondButtons).toHaveLength(2);
      });
    });

    it("shows message when judge queue is empty", async () => {
      const user = userEvent.setup();
      const pairingsNoQueue = buildPairingsData({
        phases: BASE_PHASES,
        allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [matchNormal] }]],
        roundsWithStats: [{ ...ACTIVE_ROUND_STATS, matchCount: 1 }],
      });
      mockUseApiQuery.mockReturnValue(apiResult(pairingsNoQueue));
      render(<TournamentPairingsJudge tournament={mockTournament} />);

      await user.click(screen.getByRole("tab", { name: /judge queue/i }));

      await waitFor(() => {
        expect(
          screen.getByText("No pending judge requests.")
        ).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Realtime Subscriptions — judge RETAINS its subs
  // -------------------------------------------------------------------------

  describe("Realtime Subscription (judge RETAINS subs)", () => {
    const pairingsActive = buildPairingsData({
      phases: BASE_PHASES,
      allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [] }]],
      roundsWithStats: [ACTIVE_ROUND_STATS],
    });

    it("sets up match realtime subscription when viewing active round", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsActive));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      // Round id=1 is active, so the pairings-matches channel should be created
      expect(mockSupabase.channel).toHaveBeenCalledWith("pairings-matches-1");
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it("sets up round subscription for new round detection", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsActive));
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      // selectedPhaseId defaults to tournament.currentPhaseId = 123
      expect(mockSupabase.channel).toHaveBeenCalledWith("pairings-rounds-123");
    });

    it("cleans up subscriptions on unmount", () => {
      mockUseApiQuery.mockReturnValue(apiResult(pairingsActive));
      const { unmount } = render(
        <TournamentPairingsJudge tournament={mockTournament} />
      );
      unmount();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Empty States
  // -------------------------------------------------------------------------

  describe("Empty States", () => {
    it("shows message when no matches exist for active round", () => {
      mockUseApiQuery.mockReturnValue(
        apiResult(
          buildPairingsData({
            phases: BASE_PHASES,
            allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [] }]],
            roundsWithStats: [ACTIVE_ROUND_STATS],
          })
        )
      );
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(
        screen.getByText("No matches found for this round.")
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // BYE Handling
  // -------------------------------------------------------------------------

  describe("BYE Handling", () => {
    it("displays BYE for matches without player data", () => {
      const byeMatch = makeMatch({
        id: 1,
        table_number: 1,
        status: "active",
        is_bye: true,
        player1_match_confirmed: true,
        player2_match_confirmed: true,
        player1: null,
        player2: { id: 2, username: "playerb" },
      });
      mockUseApiQuery.mockReturnValue(
        apiResult(
          buildPairingsData({
            phases: BASE_PHASES,
            allPhaseRounds: [[{ ...ACTIVE_ROUND_STATS, matches: [byeMatch] }]],
            roundsWithStats: [ACTIVE_ROUND_STATS],
          })
        )
      );
      render(<TournamentPairingsJudge tournament={mockTournament} />);
      expect(screen.getAllByText("BYE")[0]).toBeInTheDocument();
      expect(screen.getByText("playerb")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  describe("Navigation", () => {
    it("navigates to match page when Respond button is clicked", async () => {
      const user = userEvent.setup();
      const judgeMatch = makeMatch({
        id: 42,
        table_number: 1,
        status: "active",
        staff_requested: true,
        player1_match_confirmed: true,
        player2_match_confirmed: true,
        player1: { id: 1, username: "playera" },
        player2: { id: 2, username: "playerb" },
      });
      mockUseApiQuery.mockReturnValue(
        apiResult(
          buildPairingsData({
            phases: BASE_PHASES,
            allPhaseRounds: [
              [{ ...ACTIVE_ROUND_STATS, matches: [judgeMatch] }],
            ],
            roundsWithStats: [ACTIVE_ROUND_STATS],
          })
        )
      );

      render(<TournamentPairingsJudge tournament={mockTournament} />);

      await user.click(screen.getByRole("tab", { name: /judge queue/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /respond/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /respond/i }));

      expect(mockPush).toHaveBeenCalledWith(
        "/tournaments/test-tournament/r/1/t/1"
      );
    });
  });
});
