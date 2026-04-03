import { render, screen } from "@testing-library/react";
import { TournamentSidebarCard } from "../tournament-sidebar-card";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn((cb) => {
    if (typeof cb === "function") cb("SUBSCRIBED", null);
    return mockChannel;
  }),
  unsubscribe: jest.fn(),
};

const mockRemoveChannel = jest.fn();

const mockSupabase = {
  channel: jest.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
};

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => mockSupabase),
  useSupabaseQuery: jest.fn(),
  useSupabaseMutation: jest.fn(),
}));

import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";

const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;
const mockUseSupabaseMutation = useSupabaseMutation as jest.MockedFunction<
  typeof useSupabaseMutation
>;

jest.mock("@trainers/supabase", () => ({
  getRegistrationStatus: jest.fn(),
  getCheckInStatus: jest.fn(),
  getCheckInStats: jest.fn(),
  checkIn: jest.fn(),
  undoCheckIn: jest.fn(),
  withdrawFromTournament: jest.fn(),
}));

jest.mock("@/actions/tournaments", () => ({
  submitTeamAction: jest.fn().mockResolvedValue({ success: true, data: null }),
  selectTeamAction: jest.fn().mockResolvedValue({ success: true, data: null }),
  getUserTeamsAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: [] }),
  dropFromTournament: jest
    .fn()
    .mockResolvedValue({ success: true, data: null }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@trainers/validators/team", () => ({
  parseAndValidateTeam: jest.fn(),
  parsePokepaseUrl: jest.fn(),
  getPokepaseRawUrl: jest.fn(),
}));

// Mock TeamPreview to avoid heavy Pokemon rendering
jest.mock("../team-preview", () => ({
  TeamPreview: jest.fn(({ pokemon }: { pokemon: unknown[] }) => (
    <div data-testid="team-preview">{pokemon.length} pokemon</div>
  )),
}));

// Mock RegisterModal so it doesn't pull in heavy dependencies
jest.mock("../register-modal", () => ({
  RegisterModal: jest.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  tournamentId: 1,
  tournamentSlug: "test-tournament",
  tournamentName: "Test Tournament",
  gameFormat: "VGC 2025",
  initialTeam: null,
};

function buildRegistrationStatus(overrides?: object) {
  return {
    tournament: {
      id: 1,
      status: "upcoming",
      maxParticipants: 32,
      lateCheckInMaxRound: null,
    },
    registrationStats: { registered: 8 },
    userStatus: null,
    isRegistrationOpen: true,
    isLateRegistration: false,
    isFull: false,
    ...overrides,
  };
}

function setupQueryMocks({
  registrationStatus = buildRegistrationStatus(),
  registrationLoading = false,
  registrationError = null,
  checkInStatus = null,
  checkInStats = null,
}: {
  registrationStatus?: ReturnType<typeof buildRegistrationStatus> | null;
  registrationLoading?: boolean;
  registrationError?: unknown;
  checkInStatus?: unknown;
  checkInStats?: unknown;
} = {}) {
  let callCount = 0;
  mockUseSupabaseQuery.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return {
        data: registrationStatus,
        error: registrationError,
        isLoading: registrationLoading,
        refetch: jest.fn(),
      };
    }
    if (callCount === 2) {
      return { data: checkInStatus, error: null, isLoading: false, refetch: jest.fn() };
    }
    // checkInStats
    return { data: checkInStats, error: null, isLoading: false, refetch: jest.fn() };
  });

  mockUseSupabaseMutation.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TournamentSidebarCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Loading state
  // =========================================================================

  describe("loading state", () => {
    it("shows a spinner while registration data loads", () => {
      setupQueryMocks({ registrationLoading: true });
      render(<TournamentSidebarCard {...defaultProps} />);
      // Card renders but no registration content yet
      expect(screen.queryByText("Registration")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Error state
  // =========================================================================

  describe("error state", () => {
    it("shows error message and retry button when registration fails", () => {
      setupQueryMocks({ registrationStatus: null, registrationError: new Error("fetch failed") });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/unable to load registration status/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("shows error state when registrationStatus is null without an error", () => {
      setupQueryMocks({ registrationStatus: null });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/unable to load registration status/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Completed / cancelled tournaments — renders nothing
  // =========================================================================

  describe("completed or cancelled tournament", () => {
    it.each(["completed", "cancelled", "archived"])(
      "returns null for tournament status '%s'",
      (status) => {
        setupQueryMocks({
          registrationStatus: buildRegistrationStatus({
            tournament: { id: 1, status, maxParticipants: 32, lateCheckInMaxRound: null },
          }),
        });
        const { container } = render(<TournamentSidebarCard {...defaultProps} />);
        expect(container.firstChild).toBeNull();
      }
    );
  });

  // =========================================================================
  // Dropped state
  // =========================================================================

  describe("dropped state", () => {
    it("shows 'Dropped' banner when user has dropped", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "dropped", hasTeam: false },
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText("Dropped")).toBeInTheDocument();
      expect(screen.getByText(/you have dropped from this tournament/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Checked-in state
  // =========================================================================

  describe("checked-in state", () => {
    it("shows 'Registered' banner when user is checked in", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "checked_in", hasTeam: false },
        }),
        checkInStatus: { isCheckedIn: true, checkInOpen: true, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText("Registered")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Open registration — not registered
  // =========================================================================

  describe("open registration (not registered)", () => {
    it("shows registration open badge and register button", () => {
      setupQueryMocks();
      render(<TournamentSidebarCard {...defaultProps} />);
      // Registration badge should be "Open"
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("shows capacity progress when maxParticipants is set", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          registrationStats: { registered: 8 },
          tournament: { id: 1, status: "upcoming", maxParticipants: 32, lateCheckInMaxRound: null },
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/8 \/ 32/)).toBeInTheDocument();
    });

    it("shows 'registered' text when no maxParticipants", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          tournament: { id: 1, status: "upcoming", maxParticipants: null, lateCheckInMaxRound: null },
          registrationStats: { registered: 4 },
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText("4 registered")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Late registration badge
  // =========================================================================

  describe("late registration badge", () => {
    it("shows 'Late Reg' badge when late registration is open and user is not registered", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          isLateRegistration: true,
          userStatus: null,
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText("Late Reg")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Waitlist badge
  // =========================================================================

  describe("waitlist", () => {
    it("shows 'Waitlist Open' badge when tournament is full and user is not registered", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          isFull: true,
          userStatus: null,
          isRegistrationOpen: true,
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText("Waitlist Open")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Registered (not yet checked in)
  // =========================================================================

  describe("registered state (not checked in)", () => {
    it("shows registered confirmation and withdraw button", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: false },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: false, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText("Registered")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /withdraw/i })).toBeInTheDocument();
    });

    it("shows check-in button when check-in is open", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: false },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: true, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByRole("button", { name: /check in/i })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Team section — no team submitted
  // =========================================================================

  describe("team section (no team submitted)", () => {
    it("shows 'Paste Team' and 'Import URL' buttons when registered and no team", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: false },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: false, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByRole("button", { name: /paste team/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /import url/i })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Team submitted (not locked) — initialTeam prop
  // =========================================================================

  describe("team submitted (via initialTeam prop)", () => {
    const teamProps = {
      ...defaultProps,
      initialTeam: {
        teamId: 99,
        submittedAt: "2026-04-01T12:00:00Z",
        locked: false,
        pokemon: [
          { species: "Koraidon" },
          { species: "Flutter Mane" },
          { species: "Incineroar" },
          { species: "Rillaboom" },
          { species: "Palafin" },
          { species: "Calyrex-Shadow" },
        ],
      },
    };

    it("shows 'Team Submitted' when registered and team exists", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: true },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: false, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...teamProps} />);
      expect(screen.getByText("Team Submitted")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Locked team
  // =========================================================================

  describe("locked team", () => {
    const lockedTeamProps = {
      ...defaultProps,
      initialTeam: {
        teamId: 55,
        submittedAt: "2026-04-01T12:00:00Z",
        locked: true,
        pokemon: [{ species: "Pikachu" }],
      },
    };

    it("shows 'Team Locked' when team is locked", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "checked_in", hasTeam: true },
        }),
        checkInStatus: { isCheckedIn: true, checkInOpen: false, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...lockedTeamProps} />);
      expect(screen.getByText("Team Locked")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Registration closed
  // =========================================================================

  describe("registration closed", () => {
    it("shows 'Closed' badge when registration is not open and user is not registered", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          isRegistrationOpen: false,
          userStatus: null,
          isFull: false,
          isLateRegistration: false,
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });

    it("shows 'Registration is closed' text when closed and not late reg", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          isRegistrationOpen: false,
          isLateRegistration: false,
          userStatus: null,
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/registration is closed/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Late registration (not registered)
  // =========================================================================

  describe("late registration text", () => {
    it("shows 'Tournament in progress' text with round info for late registration", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          isLateRegistration: true,
          isRegistrationOpen: true,
          userStatus: null,
          tournament: {
            id: 1,
            status: "active",
            maxParticipants: null,
            lateCheckInMaxRound: 3,
          },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: true, lateMaxRound: 3 },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/tournament in progress/i)).toBeInTheDocument();
      expect(screen.getByText(/registration.*check-in open until round 3/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Waitlisted user
  // =========================================================================

  describe("waitlisted user", () => {
    it("shows waitlisted banner with position", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "waitlist", hasTeam: false, waitlistPosition: 2 },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: false, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/waitlisted.*#2/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Checked in — active tournament shows Drop button
  // =========================================================================

  describe("checked in — active tournament", () => {
    it("shows 'Drop from Tournament' button when tournament is active", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "checked_in", hasTeam: true },
          tournament: {
            id: 1,
            status: "active",
            maxParticipants: null,
            lateCheckInMaxRound: null,
          },
        }),
        checkInStatus: { isCheckedIn: true, checkInOpen: false, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /drop from tournament/i })
      ).toBeInTheDocument();
    });

    it("shows 'Undo Check-In' button when tournament is upcoming", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "checked_in", hasTeam: true },
          tournament: {
            id: 1,
            status: "upcoming",
            maxParticipants: null,
            lateCheckInMaxRound: null,
          },
        }),
        checkInStatus: { isCheckedIn: true, checkInOpen: true, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /undo check-in/i })
      ).toBeInTheDocument();
    });

    it("shows check-in stats when available", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "checked_in", hasTeam: true },
        }),
        checkInStatus: { isCheckedIn: true, checkInOpen: false, lateMaxRound: null },
        checkInStats: { checkedIn: 12, total: 32, checkedInPercentage: 37.5 },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText("12 / 32 checked in")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Registered + check-in open (active tournament branches)
  // =========================================================================

  describe("registered — check-in open for active tournament", () => {
    it("shows 'Late check-in open' banner when active with lateMaxRound", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: true },
          tournament: {
            id: 1,
            status: "active",
            maxParticipants: null,
            lateCheckInMaxRound: 2,
          },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: true, lateMaxRound: 2 },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/late check-in open/i)).toBeInTheDocument();
      expect(screen.getByText(/closes after round 2/i)).toBeInTheDocument();
    });

    it("shows 'Check in now' danger banner when active without lateMaxRound", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: true },
          tournament: {
            id: 1,
            status: "active",
            maxParticipants: null,
            lateCheckInMaxRound: null,
          },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: true, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/check in now/i)).toBeInTheDocument();
    });

    it("shows 'Submit a Team to Check In' disabled button when no team", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: false },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: true, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /submit a team to check in/i })
      ).toBeDisabled();
    });

    it("shows check-in stats progress when provided", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: true },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: true, lateMaxRound: null },
        checkInStats: { checkedIn: 5, total: 20, checkedInPercentage: 25 },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/5 \/ 20 checked in/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Registered — check-in NOT open (pre-tournament UI)
  // =========================================================================

  describe("registered — check-in not open", () => {
    it("shows 'Check-in opens when tournament starts' hint when not open", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: false },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: false, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(
        screen.getByText(/check-in opens when tournament starts/i)
      ).toBeInTheDocument();
    });

    it("shows 'Submit a Team to Check In' disabled button when no team and check-in open", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          userStatus: { status: "registered", hasTeam: false },
        }),
        checkInStatus: { isCheckedIn: false, checkInOpen: true, lateMaxRound: null },
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /submit a team to check in/i })
      ).toBeDisabled();
    });
  });

  // =========================================================================
  // Waitlist count
  // =========================================================================

  describe("waitlist count on unregistered view", () => {
    it("shows waitlist count when some players are on waitlist", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          registrationStats: { registered: 32, waitlist: 5 },
          isFull: true,
          userStatus: null,
          tournament: {
            id: 1,
            status: "upcoming",
            maxParticipants: 32,
            lateCheckInMaxRound: null,
          },
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(screen.getByText(/\+5 on waitlist/i)).toBeInTheDocument();
    });

    it("shows 'Join Waitlist' button when full and registration open", () => {
      setupQueryMocks({
        registrationStatus: buildRegistrationStatus({
          isFull: true,
          isRegistrationOpen: true,
          userStatus: null,
        }),
      });
      render(<TournamentSidebarCard {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /join waitlist/i })
      ).toBeInTheDocument();
    });
  });
});
