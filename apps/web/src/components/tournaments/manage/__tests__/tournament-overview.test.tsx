import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TournamentOverview } from "../tournament-overview";
import {
  getTournamentPhases,
  getPhaseRoundsWithStats,
} from "@trainers/supabase";

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
  useSupabaseQuery: jest.fn(),
  useSupabase: jest.fn(),
}));

import { useSupabaseQuery, useSupabase } from "@/lib/supabase";
const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;
const mockUseSupabase = useSupabase as jest.MockedFunction<typeof useSupabase>;

// Mock the queries
jest.mock("@trainers/supabase", () => ({
  getTournamentPhases: jest.fn(),
  getPhaseRoundsWithStats: jest.fn(),
}));

// Mock server actions
jest.mock("@/actions/tournaments", () => ({
  prepareRound: jest.fn(),
  confirmAndStartRound: jest.fn(),
  cancelPreparedRound: jest.fn(),
  completeRound: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

type SyncPhasesFn = () => Awaited<ReturnType<typeof getTournamentPhases>>;
type SyncRoundsFn = () => Awaited<ReturnType<typeof getPhaseRoundsWithStats>>;

const mockGetTournamentPhases =
  getTournamentPhases as unknown as jest.MockedFunction<SyncPhasesFn>;
const mockGetPhaseRoundsWithStats =
  getPhaseRoundsWithStats as unknown as jest.MockedFunction<SyncRoundsFn>;

// Helper to set up consistent query mocks for phases + rounds
function setupQueryMocks({
  phases = [] as Parameters<typeof mockGetTournamentPhases["mockReturnValue"]>[0],
  rounds = [] as Parameters<typeof mockGetPhaseRoundsWithStats["mockReturnValue"]>[0],
  roundsLoading = false,
} = {}) {
  const refetchRounds = jest.fn().mockResolvedValue(undefined);
  mockUseSupabaseQuery
    .mockReturnValueOnce({
      data: phases,
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    })
    .mockReturnValueOnce({
      data: rounds,
      error: null,
      isLoading: roundsLoading,
      refetch: refetchRounds,
    });
  return { refetchRounds };
}

const baseTournament = {
  id: 1,
  name: "Test Tournament",
  status: "active",
  registrations: [],
  currentPhaseId: 1,
  tournamentFormat: "swiss_with_cut",
  format: "VGC 2025",
  swissRounds: 5,
};

const mockPhases = [
  { id: 1, name: "Swiss", tournament_id: BigInt(1), planned_rounds: 5 },
];

const makeActiveRound = (overrides = {}) => ({
  id: 10,
  round_number: 2,
  status: "active",
  matchCount: 8,
  completedCount: 4,
  inProgressCount: 2,
  pendingCount: 2,
  ...overrides,
});

const makePendingRound = (overrides = {}) => ({
  id: 11,
  round_number: 2,
  status: "pending",
  matchCount: 8,
  completedCount: 0,
  inProgressCount: 0,
  pendingCount: 8,
  ...overrides,
});

describe("TournamentOverview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTournamentPhases.mockReturnValue([]);
    mockGetPhaseRoundsWithStats.mockReturnValue([]);
    mockUseSupabase.mockReturnValue(
      mockSupabase as ReturnType<typeof useSupabase>
    );
  });

  describe("Registration Progress", () => {
    it("should display correct registration counts for draft tournament", () => {
      // Setup default mocks for non-active tournament
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "draft",
        registrations: [
          { status: "registered" },
          { status: "registered" },
          { status: "confirmed" },
        ],
        maxParticipants: 32,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />);

      // Should show 3 registered (registered + confirmed counts)
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("of 32 spots")).toBeInTheDocument();
    });

    it("should display checked-in count for active tournament", () => {
      // Setup default mocks
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [
          { status: "checked_in" },
          { status: "checked_in" },
          { status: "registered" },
        ],
        maxParticipants: 32,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />);

      // Should show 2 checked in out of 3 registered
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("checked in")).toBeInTheDocument();
    });

    it("should show dropped count for active tournament", () => {
      // Setup default mocks
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [
          { status: "checked_in" },
          { status: "checked_in" },
          { status: "dropped" },
          { status: "dropped" },
        ],
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />);

      expect(screen.getByText("2 dropped")).toBeInTheDocument();
    });

    it("should handle tournament without max participants", () => {
      // Setup default mocks
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "draft",
        registrations: [{ status: "registered" }, { status: "registered" }],
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />);

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("registered")).toBeInTheDocument();
      // Should not show capacity info
      expect(screen.queryByText(/capacity/)).not.toBeInTheDocument();
    });

    it("should calculate registration progress correctly", () => {
      // Setup default mocks
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [
          { status: "checked_in" },
          { status: "checked_in" },
          { status: "checked_in" },
          { status: "registered" },
        ],
        maxParticipants: 8,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />);

      // 3 checked in out of 4 registered = 75%
      // 4 registered out of 8 max = 50%
      const registrationSection = screen
        .getByText("Registration Status")
        .closest('[data-slot="card"]');
      expect(registrationSection).toHaveTextContent("75%");
      expect(registrationSection).toHaveTextContent("50%");
    });
  });

  describe("Round Progress", () => {
    it("should display current round number", () => {
      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [],
        currentPhaseId: 1,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
        swissRounds: 5,
      };

      const mockPhases = [
        { id: 1, name: "Swiss", tournament_id: BigInt(1), planned_rounds: 5 },
      ];

      const mockRounds = [
        {
          id: 1,
          round_number: 3,
          status: "completed",
          matchCount: 8,
          completedCount: 8,
          inProgressCount: 0,
          pendingCount: 0,
        },
      ];

      // Setup mocks for this test
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: mockPhases,
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: mockRounds,
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      render(<TournamentOverview tournament={mockTournament} />);

      // Check for round number in the Round Progress card
      const roundProgressSection = screen
        .getByText("Round Progress")
        .closest('[data-slot="card"]');
      expect(roundProgressSection).toHaveTextContent("3");
      expect(roundProgressSection).toHaveTextContent("of 5 rounds");
    });

    it("should show active round match progress", () => {
      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [],
        currentPhaseId: 1,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      const mockPhases = [
        { id: 1, name: "Swiss", tournament_id: BigInt(1), planned_rounds: 5 },
      ];

      const mockRounds = [
        {
          id: 1,
          round_number: 2,
          status: "active",
          matchCount: 10,
          completedCount: 6,
          inProgressCount: 3,
          pendingCount: 1,
        },
      ];

      // Setup mocks for this test (use mockImplementation for potential re-renders)
      let callCount = 0;
      mockUseSupabaseQuery.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          // Odd calls are for phases
          return {
            data: mockPhases,
            error: null,
            isLoading: false,
            refetch: jest.fn(),
          };
        } else {
          // Even calls are for rounds
          return {
            data: mockRounds,
            error: null,
            isLoading: false,
            refetch: jest.fn(),
          };
        }
      });

      render(<TournamentOverview tournament={mockTournament} />);

      // Should show match stats in the Round Progress card
      const roundProgressSection = screen
        .getByText("Round Progress")
        .closest('[data-slot="card"]');
      expect(roundProgressSection).toHaveTextContent("3"); // in progress
      expect(roundProgressSection).toHaveTextContent("6"); // completed
      expect(roundProgressSection).toHaveTextContent("1"); // pending
      expect(roundProgressSection).toHaveTextContent("active");
      expect(roundProgressSection).toHaveTextContent("done");
      expect(roundProgressSection).toHaveTextContent("pending");
    });

    it("should calculate round progress percentage correctly", () => {
      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [],
        currentPhaseId: 1,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
        swissRounds: 4,
      };

      const mockPhases = [
        { id: 1, name: "Swiss", tournament_id: BigInt(1), planned_rounds: 4 },
      ];

      const mockRounds = [
        {
          id: 1,
          round_number: 2,
          status: "completed",
          matchCount: 8,
          completedCount: 8,
          inProgressCount: 0,
          pendingCount: 0,
        },
      ];

      // Setup mocks for this test
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: mockPhases,
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: mockRounds,
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      render(<TournamentOverview tournament={mockTournament} />);

      // 2 out of 4 rounds = 50% - should appear in the Round Progress card
      const roundProgressSection = screen
        .getByText("Round Progress")
        .closest('[data-slot="card"]');
      expect(roundProgressSection).toHaveTextContent("50%");
    });
  });

  describe("Tournament Details Cards", () => {
    it("should display tournament format information", () => {
      // Setup default mocks
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "draft",
        registrations: [],
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
        roundTimeMinutes: 60,
        topCutSize: 8,
      };

      render(<TournamentOverview tournament={mockTournament} />);

      expect(screen.getByText("VGC 2025")).toBeInTheDocument();
      expect(screen.getByText("Swiss With Cut")).toBeInTheDocument();
      expect(screen.getByText("60m")).toBeInTheDocument();
      expect(screen.getByText("Top 8")).toBeInTheDocument();
    });

    it("should display schedule information", () => {
      // Setup default mocks
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const startDate = new Date("2025-03-15T10:00:00Z").getTime();
      const endDate = new Date("2025-03-15T18:00:00Z").getTime();

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "upcoming",
        registrations: [],
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
        startDate,
        endDate,
      };

      render(<TournamentOverview tournament={mockTournament} />);

      expect(screen.getByText("Schedule")).toBeInTheDocument();
      expect(screen.getByText("Start Time")).toBeInTheDocument();
      expect(screen.getByText("End Time")).toBeInTheDocument();
    });

    it("should handle missing optional tournament data", () => {
      // Setup default mocks
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "draft",
        registrations: [],
        tournamentFormat: "swiss",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />);

      // Should show default round time
      expect(screen.getByText("50m")).toBeInTheDocument();
      // Should not show top cut
      expect(screen.queryByText(/Top \d+/)).not.toBeInTheDocument();
    });
  });

  describe("Tournament States", () => {
    it("should show round command center for active tournaments", () => {
      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [],
        currentPhaseId: 1,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      const mockPhases = [
        { id: 1, name: "Swiss", tournament_id: BigInt(1), planned_rounds: 5 },
      ];

      // Setup mocks for this test
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: mockPhases,
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      render(<TournamentOverview tournament={mockTournament} />);

      // Should show "Ready to Start" for active tournament with no rounds
      expect(screen.getByText("Ready to Start")).toBeInTheDocument();
    });

    it("should not show round command center for draft tournaments", () => {
      // Setup default mocks
      mockUseSupabaseQuery
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }) // phases query
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
          refetch: jest.fn(),
        }); // rounds query

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "draft",
        registrations: [],
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />);

      // Should not show round command center
      expect(screen.queryByText("Ready to Start")).not.toBeInTheDocument();
      expect(screen.queryByText("Start Round")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // RoundCommandCenter state rendering
  // ---------------------------------------------------------------------------

  describe("RoundCommandCenter states", () => {
    it("shows loading spinner when rounds are loading", () => {
      setupQueryMocks({ phases: mockPhases, rounds: [], roundsLoading: true });
      render(<TournamentOverview tournament={baseTournament} />);
      // Loader2 SVG — no text to assert, but command center content absent
      expect(screen.queryByText("Ready to Start")).not.toBeInTheDocument();
      expect(screen.queryByText("Generating pairings...")).not.toBeInTheDocument();
    });

    it("shows 'no phases configured' when tournament has no phase", () => {
      setupQueryMocks({ phases: [], rounds: [] });
      render(
        <TournamentOverview
          tournament={{ ...baseTournament, currentPhaseId: null }}
        />
      );
      expect(
        screen.getByText(/no phases configured/i)
      ).toBeInTheDocument();
    });

    it("shows idle state with round 1 label when no rounds exist", () => {
      setupQueryMocks({ phases: mockPhases, rounds: [] });
      render(<TournamentOverview tournament={baseTournament} />);
      expect(screen.getByText("Ready to Start")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /start round 1/i })
      ).toBeInTheDocument();
    });

    it("shows 'all swiss rounds completed' message when nextRound exceeds plannedRounds", () => {
      setupQueryMocks({
        phases: mockPhases,
        rounds: [
          {
            id: 1,
            round_number: 5,
            status: "completed",
            matchCount: 8,
            completedCount: 8,
            inProgressCount: 0,
            pendingCount: 0,
          },
        ],
      });
      render(<TournamentOverview tournament={baseTournament} />);
      expect(screen.getByText(/all swiss rounds completed/i)).toBeInTheDocument();
      // No Start Round button should appear
      expect(screen.queryByRole("button", { name: /start round/i })).not.toBeInTheDocument();
    });

    it("shows intermediate idle state label after completing a round", () => {
      setupQueryMocks({
        phases: mockPhases,
        rounds: [
          {
            id: 1,
            round_number: 2,
            status: "completed",
            matchCount: 8,
            completedCount: 8,
            inProgressCount: 0,
            pendingCount: 0,
          },
        ],
      });
      render(<TournamentOverview tournament={baseTournament} />);
      expect(screen.getByText(/round 2 complete/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /start round 3/i })
      ).toBeInTheDocument();
    });

    it("shows active round progress in command center", () => {
      setupQueryMocks({
        phases: mockPhases,
        rounds: [makeActiveRound()],
      });
      render(<TournamentOverview tournament={baseTournament} />);
      expect(screen.getByText(/round 2 in progress/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /complete round/i })
      ).toBeInTheDocument();
    });

    it("Complete Round button is disabled when not all matches are done", () => {
      setupQueryMocks({
        phases: mockPhases,
        rounds: [makeActiveRound({ completedCount: 4, matchCount: 8 })],
      });
      render(<TournamentOverview tournament={baseTournament} />);
      expect(
        screen.getByRole("button", { name: /complete round/i })
      ).toBeDisabled();
    });

    it("uses phases[0].planned_rounds when currentPhaseId is null", () => {
      // No explicit currentPhaseId — should fall back to phases[0]
      setupQueryMocks({
        phases: [{ id: 2, name: "Swiss", tournament_id: BigInt(1), planned_rounds: 3 }],
        rounds: [],
      });
      render(
        <TournamentOverview
          tournament={{ ...baseTournament, currentPhaseId: null }}
        />
      );
      const roundCard = screen.getByText("Round Progress").closest('[data-slot="card"]');
      expect(roundCard).toHaveTextContent("of 3 rounds");
    });
  });

  // ---------------------------------------------------------------------------
  // formatDate helper
  // ---------------------------------------------------------------------------

  describe("formatDate", () => {
    it("shows em-dash when no start date is provided", () => {
      setupQueryMocks({ phases: mockPhases, rounds: [] });
      render(
        <TournamentOverview
          tournament={{ ...baseTournament, status: "upcoming", startDate: undefined }}
        />
      );
      const scheduleCard = screen.getByText("Schedule").closest('[data-slot="card"]');
      expect(scheduleCard).toHaveTextContent("—");
    });

    it("formats a valid timestamp into a readable date string", () => {
      setupQueryMocks({ phases: mockPhases, rounds: [] });
      const ts = new Date("2025-06-15T14:00:00Z").getTime();
      render(
        <TournamentOverview
          tournament={{ ...baseTournament, status: "upcoming", startDate: ts }}
        />
      );
      const scheduleCard = screen.getByText("Schedule").closest('[data-slot="card"]');
      // Should not show em-dash for the start date
      const startTimeEl = scheduleCard?.querySelector("p.font-medium");
      expect(startTimeEl?.textContent).not.toBe("—");
    });
  });

  // ---------------------------------------------------------------------------
  // Registration card edge cases
  // ---------------------------------------------------------------------------

  describe("Registration card edge cases", () => {
    it("shows 'registered' label when no maxParticipants (draft)", () => {
      setupQueryMocks({ phases: [], rounds: [] });
      render(
        <TournamentOverview
          tournament={{
            ...baseTournament,
            status: "draft",
            registrations: [{ status: "registered" }],
          }}
        />
      );
      expect(screen.getByText("registered")).toBeInTheDocument();
    });

    it("does not show dropped count when none have dropped", () => {
      setupQueryMocks({ phases: [], rounds: [] });
      render(
        <TournamentOverview
          tournament={{
            ...baseTournament,
            registrations: [{ status: "checked_in" }],
          }}
        />
      );
      expect(screen.queryByText(/dropped/)).not.toBeInTheDocument();
    });

    it("shows format as 'Custom' when format field is empty", () => {
      setupQueryMocks({ phases: [], rounds: [] });
      render(
        <TournamentOverview
          tournament={{ ...baseTournament, format: "" }}
        />
      );
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("shows default 50m round time when roundTimeMinutes is 0", () => {
      setupQueryMocks({ phases: [], rounds: [] });
      render(
        <TournamentOverview
          tournament={{ ...baseTournament, roundTimeMinutes: 0 }}
        />
      );
      expect(screen.getByText("50m")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Realtime subscription lifecycle
  // ---------------------------------------------------------------------------

  describe("realtime subscription", () => {
    it("subscribes to the realtime channel on mount", () => {
      setupQueryMocks({ phases: mockPhases, rounds: [] });
      render(<TournamentOverview tournament={baseTournament} />);
      // channel() called for registrations + matches + rounds (activePhaseId present)
      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `overview-registrations-${baseTournament.id}`
      );
      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `overview-matches-${baseTournament.id}`
      );
    });

    it("does NOT subscribe to rounds channel when there is no active phase", () => {
      setupQueryMocks({ phases: [], rounds: [] });
      render(
        <TournamentOverview
          tournament={{ ...baseTournament, currentPhaseId: null }}
        />
      );
      expect(mockSupabase.channel).not.toHaveBeenCalledWith(
        expect.stringMatching(/overview-rounds/)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Round command center handlers
  // ---------------------------------------------------------------------------

  describe("round command center actions", () => {
    it("calls prepareRound and enters preview state on success", async () => {
      const { prepareRound } = jest.requireMock("@/actions/tournaments") as {
        prepareRound: jest.Mock;
      };
      const previewPayload = {
        roundId: 99,
        roundNumber: 3,
        matchesCreated: 4,
        byePlayer: null,
        matches: [
          {
            player1Name: "Ash",
            player2Name: "Gary",
            tableNumber: 1,
          },
        ],
      };
      prepareRound.mockResolvedValue({ success: true, data: previewPayload });

      setupQueryMocks({
        phases: mockPhases,
        rounds: [
          {
            id: 9,
            round_number: 2,
            status: "completed",
            matchCount: 4,
            completedCount: 4,
            inProgressCount: 0,
            pendingCount: 0,
          },
        ],
      });
      render(<TournamentOverview tournament={baseTournament} />);

      const startBtn = screen.getByRole("button", {
        name: /start round 3/i,
      });
      await act(async () => {
        startBtn.click();
      });

      await waitFor(() => {
        expect(prepareRound).toHaveBeenCalledWith(
          baseTournament.id,
          baseTournament.currentPhaseId
        );
      });
    });

    it("shows error toast when prepareRound fails", async () => {
      const { prepareRound } = jest.requireMock("@/actions/tournaments") as {
        prepareRound: jest.Mock;
      };
      const { toast } = jest.requireMock("sonner") as {
        toast: { error: jest.Mock };
      };
      prepareRound.mockResolvedValue({
        success: false,
        error: "Not enough players",
      });

      setupQueryMocks({
        phases: mockPhases,
        rounds: [
          {
            id: 9,
            round_number: 2,
            status: "completed",
            matchCount: 4,
            completedCount: 4,
            inProgressCount: 0,
            pendingCount: 0,
          },
        ],
      });
      render(<TournamentOverview tournament={baseTournament} />);

      const startBtn = screen.getByRole("button", {
        name: /start round 3/i,
      });
      await act(async () => {
        startBtn.click();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Not enough players");
      });
    });

    it("renders Complete Round button for active round with all matches done", () => {
      setupQueryMocks({
        phases: mockPhases,
        rounds: [makeActiveRound({ completedCount: 8, matchCount: 8 })],
      });
      render(<TournamentOverview tournament={baseTournament} />);

      // The active round view shows progress and complete button
      expect(screen.getByText(/Round 2 in Progress/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /complete round/i })
      ).toBeInTheDocument();
    });

    it("renders active round stats grid with in-progress, completed, remaining", () => {
      setupQueryMocks({
        phases: mockPhases,
        rounds: [
          makeActiveRound({
            matchCount: 8,
            completedCount: 3,
            inProgressCount: 2,
            pendingCount: 3,
          }),
        ],
      });
      render(<TournamentOverview tournament={baseTournament} />);

      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Remaining")).toBeInTheDocument();
    });
  });
});
