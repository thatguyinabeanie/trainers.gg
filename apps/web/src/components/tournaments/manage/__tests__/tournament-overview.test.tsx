import { render, screen } from "@testing-library/react";
import { TournamentOverview } from "../tournament-overview";
import {
  getTournamentPhases,
  getPhaseRoundsWithStats,
} from "@trainers/supabase";

// Mock useSupabaseQuery hook - we'll control return values per test
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
}));

import { useSupabaseQuery } from "@/lib/supabase";
const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;

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

describe("TournamentOverview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTournamentPhases.mockReturnValue([]);
    mockGetPhaseRoundsWithStats.mockReturnValue([]);
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
      const registrationSection = screen.getByText("Registration Status").closest(
        '[data-slot="card"]'
      );
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
      const roundProgressSection = screen.getByText("Round Progress").closest(
        '[data-slot="card"]'
      );
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
      const roundProgressSection = screen.getByText("Round Progress").closest(
        '[data-slot="card"]'
      );
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
      const roundProgressSection = screen.getByText("Round Progress").closest(
        '[data-slot="card"]'
      );
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
});
