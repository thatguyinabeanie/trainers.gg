import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TournamentOverview } from "../tournament-overview";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetTournamentPhases = jest.fn();
const mockGetPhaseRoundsWithStats = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getTournamentPhases: (...args: unknown[]) =>
    mockGetTournamentPhases(...args),
  getPhaseRoundsWithStats: (...args: unknown[]) =>
    mockGetPhaseRoundsWithStats(...args),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({})),
}));

// useSupabase() is called at the top of the component (singleton pattern).
jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
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

// ── Helpers ────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

// ── Fixtures ───────────────────────────────────────────────────────────────

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

const _makePendingRound = (overrides = {}) => ({
  id: 11,
  round_number: 2,
  status: "pending",
  matchCount: 8,
  completedCount: 0,
  inProgressCount: 0,
  pendingCount: 8,
  ...overrides,
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("TournamentOverview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTournamentPhases.mockResolvedValue([]);
    mockGetPhaseRoundsWithStats.mockResolvedValue([]);
  });

  describe("Registration Progress", () => {
    it("should display correct registration counts for draft tournament", async () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

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

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      // Should show 3 registered (registered + confirmed counts)
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("of 32 spots")).toBeInTheDocument();
    });

    it("should display checked-in count for active tournament", async () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

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

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      // Should show 2 checked in out of 3 registered
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("checked in")).toBeInTheDocument();
    });

    it("should show dropped count for active tournament", async () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

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

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("2 dropped")).toBeInTheDocument();
    });

    it("should handle tournament without max participants", async () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "draft",
        registrations: [{ status: "registered" }, { status: "registered" }],
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("registered")).toBeInTheDocument();
      // Should not show capacity info
      expect(screen.queryByText(/capacity/)).not.toBeInTheDocument();
    });

    it("should calculate registration progress correctly", async () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

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

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

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
    it("should display current round number", async () => {
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

      const localPhases = [
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

      mockGetTournamentPhases.mockResolvedValue(localPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue(mockRounds);

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      // Wait for queries to resolve and component to update
      await waitFor(() => {
        const roundProgressSection = screen
          .getByText("Round Progress")
          .closest('[data-slot="card"]');
        expect(roundProgressSection).toHaveTextContent("3");
        expect(roundProgressSection).toHaveTextContent("of 5 rounds");
      });
    });

    it("should show active round match progress", async () => {
      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [],
        currentPhaseId: 1,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      const localPhases = [
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

      mockGetTournamentPhases.mockResolvedValue(localPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue(mockRounds);

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      // Should show match stats in the Round Progress card after data loads
      await waitFor(() => {
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
    });

    it("should calculate round progress percentage correctly", async () => {
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

      const localPhases = [
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

      mockGetTournamentPhases.mockResolvedValue(localPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue(mockRounds);

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      // 2 out of 4 rounds = 50%
      await waitFor(() => {
        const roundProgressSection = screen
          .getByText("Round Progress")
          .closest('[data-slot="card"]');
        expect(roundProgressSection).toHaveTextContent("50%");
      });
    });
  });

  describe("Tournament Details Cards", () => {
    it("should display tournament format information", () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

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

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("VGC 2025")).toBeInTheDocument();
      expect(screen.getByText("Swiss With Cut")).toBeInTheDocument();
      expect(screen.getByText("60m")).toBeInTheDocument();
      expect(screen.getByText("Top 8")).toBeInTheDocument();
    });

    it("should display schedule information", () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

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

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Schedule")).toBeInTheDocument();
      expect(screen.getByText("Start Time")).toBeInTheDocument();
      expect(screen.getByText("End Time")).toBeInTheDocument();
    });

    it("should handle missing optional tournament data", () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "draft",
        registrations: [],
        tournamentFormat: "swiss",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      // Should show default round time
      expect(screen.getByText("50m")).toBeInTheDocument();
      // Should not show top cut
      expect(screen.queryByText(/Top \d+/)).not.toBeInTheDocument();
    });
  });

  describe("Tournament States", () => {
    it("should show round command center for active tournaments", async () => {
      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "active",
        registrations: [],
        currentPhaseId: 1,
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      const localPhases = [
        { id: 1, name: "Swiss", tournament_id: BigInt(1), planned_rounds: 5 },
      ];

      mockGetTournamentPhases.mockResolvedValue(localPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      // Should show "Ready to Start" for active tournament with no rounds
      await waitFor(() => {
        expect(screen.getByText("Ready to Start")).toBeInTheDocument();
      });
    });

    it("should not show round command center for draft tournaments", () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      const mockTournament = {
        id: 1,
        name: "Test Tournament",
        status: "draft",
        registrations: [],
        tournamentFormat: "swiss_with_cut",
        format: "VGC 2025",
      };

      render(<TournamentOverview tournament={mockTournament} />, {
        wrapper: createWrapper(),
      });

      // Should not show round command center
      expect(screen.queryByText("Ready to Start")).not.toBeInTheDocument();
      expect(screen.queryByText("Start Round")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // RoundCommandCenter state rendering
  // ---------------------------------------------------------------------------

  describe("RoundCommandCenter states", () => {
    it("shows loading spinner when rounds are loading", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      // Keep rounds in loading state (never resolves)
      mockGetPhaseRoundsWithStats.mockReturnValue(new Promise(() => {}));

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      // While loading, neither "Ready to Start" nor "Generating pairings..." appear
      await waitFor(() => {
        // Phases resolved, now rounds loading — loader spins inside card
        expect(
          screen.queryByText("Generating pairings...")
        ).not.toBeInTheDocument();
      });
      expect(screen.queryByText("Ready to Start")).not.toBeInTheDocument();
    });

    it("shows 'no phases configured' when tournament has no phase", async () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(
        <TournamentOverview
          tournament={{ ...baseTournament, currentPhaseId: null }}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/no phases configured/i)).toBeInTheDocument();
      });
    });

    it("shows idle state with round 1 label when no rounds exist", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("Ready to Start")).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /start round 1/i })
        ).toBeInTheDocument();
      });
    });

    it("shows 'all swiss rounds completed' message when nextRound exceeds plannedRounds", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([
        {
          id: 1,
          round_number: 5,
          status: "completed",
          matchCount: 8,
          completedCount: 8,
          inProgressCount: 0,
          pendingCount: 0,
        },
      ]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          screen.getByText(/all swiss rounds completed/i)
        ).toBeInTheDocument();
        // No Start Round button should appear
        expect(
          screen.queryByRole("button", { name: /start round/i })
        ).not.toBeInTheDocument();
      });
    });

    it("shows intermediate idle state label after completing a round", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([
        {
          id: 1,
          round_number: 2,
          status: "completed",
          matchCount: 8,
          completedCount: 8,
          inProgressCount: 0,
          pendingCount: 0,
        },
      ]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText(/round 2 complete/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /start round 3/i })
        ).toBeInTheDocument();
      });
    });

    it("shows active round progress in command center", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([makeActiveRound()]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText(/round 2 in progress/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /complete round/i })
        ).toBeInTheDocument();
      });
    });

    it("Complete Round button is disabled when not all matches are done", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([
        makeActiveRound({ completedCount: 4, matchCount: 8 }),
      ]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /complete round/i })
        ).toBeDisabled();
      });
    });

    it("uses phases[0].planned_rounds when currentPhaseId is null", async () => {
      // No explicit currentPhaseId — should fall back to phases[0]
      mockGetTournamentPhases.mockResolvedValue([
        { id: 2, name: "Swiss", tournament_id: BigInt(1), planned_rounds: 3 },
      ]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(
        <TournamentOverview
          tournament={{ ...baseTournament, currentPhaseId: null }}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const roundCard = screen
          .getByText("Round Progress")
          .closest('[data-slot="card"]');
        expect(roundCard).toHaveTextContent("of 3 rounds");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // formatDate helper
  // ---------------------------------------------------------------------------

  describe("formatDate", () => {
    it("shows em-dash when no start date is provided", () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(
        <TournamentOverview
          tournament={{
            ...baseTournament,
            status: "upcoming",
            startDate: undefined,
          }}
        />,
        { wrapper: createWrapper() }
      );

      const scheduleCard = screen
        .getByText("Schedule")
        .closest('[data-slot="card"]');
      expect(scheduleCard).toHaveTextContent("—");
    });

    it("formats a valid timestamp into a readable date string", () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      const ts = new Date("2025-06-15T14:00:00Z").getTime();

      render(
        <TournamentOverview
          tournament={{ ...baseTournament, status: "upcoming", startDate: ts }}
        />,
        { wrapper: createWrapper() }
      );

      const scheduleCard = screen
        .getByText("Schedule")
        .closest('[data-slot="card"]');
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
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(
        <TournamentOverview
          tournament={{
            ...baseTournament,
            status: "draft",
            registrations: [{ status: "registered" }],
          }}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText("registered")).toBeInTheDocument();
    });

    it("does not show dropped count when none have dropped", () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(
        <TournamentOverview
          tournament={{
            ...baseTournament,
            registrations: [{ status: "checked_in" }],
          }}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByText(/dropped/)).not.toBeInTheDocument();
    });

    it("shows format as 'Custom' when format field is empty", () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(
        <TournamentOverview tournament={{ ...baseTournament, format: "" }} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("shows default 50m round time when roundTimeMinutes is 0", () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(
        <TournamentOverview
          tournament={{ ...baseTournament, roundTimeMinutes: 0 }}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText("50m")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Phase 3 migration — no useSupabaseQuery (uses TanStack useQuery directly)
  // ---------------------------------------------------------------------------

  describe("Phase 3 migration: useQuery replaces useSupabaseQuery", () => {
    it("calls getTournamentPhases with a supabase client and the tournament id", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockGetTournamentPhases).toHaveBeenCalledWith(
          expect.anything(),
          baseTournament.id
        );
      });
    });

    it("calls getPhaseRoundsWithStats with the active phase id", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockGetPhaseRoundsWithStats).toHaveBeenCalledWith(
          expect.anything(),
          baseTournament.currentPhaseId
        );
      });
    });

    it("does NOT call getPhaseRoundsWithStats when activePhaseId is null", async () => {
      mockGetTournamentPhases.mockResolvedValue([]);
      mockGetPhaseRoundsWithStats.mockResolvedValue([]);

      render(
        <TournamentOverview
          tournament={{ ...baseTournament, currentPhaseId: null }}
        />,
        { wrapper: createWrapper() }
      );

      // Give queries time to settle
      await waitFor(() => {
        expect(mockGetTournamentPhases).toHaveBeenCalled();
      });

      // phases returned empty, so activePhaseId = null, rounds query disabled
      expect(mockGetPhaseRoundsWithStats).not.toHaveBeenCalled();
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

      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([
        {
          id: 9,
          round_number: 2,
          status: "completed",
          matchCount: 4,
          completedCount: 4,
          inProgressCount: 0,
          pendingCount: 0,
        },
      ]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      const startBtn = await screen.findByRole("button", {
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

      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([
        {
          id: 9,
          round_number: 2,
          status: "completed",
          matchCount: 4,
          completedCount: 4,
          inProgressCount: 0,
          pendingCount: 0,
        },
      ]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      const startBtn = await screen.findByRole("button", {
        name: /start round 3/i,
      });

      await act(async () => {
        startBtn.click();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Not enough players");
      });
    });

    it("renders Complete Round button for active round with all matches done", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([
        makeActiveRound({ completedCount: 8, matchCount: 8 }),
      ]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText(/Round 2 in Progress/)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /complete round/i })
        ).toBeInTheDocument();
      });
    });

    it("renders active round stats grid with in-progress, completed, remaining", async () => {
      mockGetTournamentPhases.mockResolvedValue(mockPhases);
      mockGetPhaseRoundsWithStats.mockResolvedValue([
        makeActiveRound({
          matchCount: 8,
          completedCount: 3,
          inProgressCount: 2,
          pendingCount: 3,
        }),
      ]);

      render(<TournamentOverview tournament={baseTournament} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText("In Progress")).toBeInTheDocument();
        expect(screen.getByText("Completed")).toBeInTheDocument();
        expect(screen.getByText("Remaining")).toBeInTheDocument();
      });
    });
  });
});
