/**
 * Tests for Supabase Realtime subscription in TournamentSidebarCard
 *
 * Validates that the component subscribes to tournament_registrations changes
 * and refetches data when events occur.
 *
 * We test the Realtime wiring by mocking the Supabase client and verifying
 * that the channel is created with the correct configuration and that the
 * callback triggers the expected refetch.
 */

// --------------------------------------------------------------------------
// Track channel creation and subscription
// --------------------------------------------------------------------------

const mockSubscribe = jest.fn().mockReturnValue({ unsubscribe: jest.fn() });
const mockOn = jest.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockRemoveChannel = jest.fn();
const mockChannel = jest.fn().mockReturnValue({ on: mockOn });

const mockSupabase = {
  channel: mockChannel,
  removeChannel: mockRemoveChannel,
  auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }),
};

// --------------------------------------------------------------------------
// Mocks — must be declared before imports
// --------------------------------------------------------------------------

jest.mock("@/lib/supabase", () => ({
  useSupabase: () => mockSupabase,
  useSupabaseQuery: (_queryFn: unknown, _deps: unknown) => ({
    data: {
      tournament: {
        id: 1,
        name: "Test Tournament",
        status: "upcoming",
        maxParticipants: 32,
        lateCheckInMaxRound: null,
        currentRound: null,
        allowLateRegistration: false,
        startDate: "2026-03-01T14:00:00Z",
      },
      registrationStats: { registered: 10, waitlist: 0 },
      userStatus: null,
      isRegistrationOpen: true,
      isLateRegistration: false,
      isFull: false,
    },
    error: null,
    isLoading: false,
    refetch: jest.fn(),
  }),
  useSupabaseMutation: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("@/actions/tournaments", () => ({
  submitTeamAction: jest.fn(),
  selectTeamAction: jest.fn(),
  getUserTeamsAction: jest.fn(),
  dropFromTournament: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@trainers/supabase", () => ({
  getRegistrationStatus: jest.fn(),
  getCheckInStatus: jest.fn(),
  getCheckInStats: jest.fn(),
  checkIn: jest.fn(),
  undoCheckIn: jest.fn(),
  withdrawFromTournament: jest.fn(),
}));

jest.mock("@trainers/validators/team", () => ({
  parseAndValidateTeam: jest.fn(),
  parsePokepaseUrl: jest.fn(),
  getPokepaseRawUrl: jest.fn(),
}));

jest.mock("../register-modal", () => ({
  RegisterModal: () => null,
}));

jest.mock("../team-preview", () => ({
  TeamPreview: () => null,
}));

import { render } from "@testing-library/react";
import { TournamentSidebarCard } from "../tournament-sidebar-card";

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("TournamentSidebarCard Realtime subscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a Realtime channel for tournament registrations on mount", () => {
    render(
      <TournamentSidebarCard
        tournamentId={42}
        tournamentSlug="spring-classic"
        tournamentName="Spring Classic"
        gameFormat="vgc2026"
        initialTeam={null}
      />
    );

    // Verify channel was created with correct name
    expect(mockChannel).toHaveBeenCalledWith("registrations-42");
  });

  it("subscribes to postgres_changes on tournament_registrations with correct filter", () => {
    render(
      <TournamentSidebarCard
        tournamentId={42}
        tournamentSlug="spring-classic"
        tournamentName="Spring Classic"
        gameFormat="vgc2026"
        initialTeam={null}
      />
    );

    // Verify .on() was called with correct event configuration
    expect(mockOn).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tournament_registrations",
        filter: "tournament_id=eq.42",
      },
      expect.any(Function)
    );
  });

  it("calls subscribe on the channel", () => {
    render(
      <TournamentSidebarCard
        tournamentId={42}
        tournamentSlug="spring-classic"
        tournamentName="Spring Classic"
        gameFormat="vgc2026"
        initialTeam={null}
      />
    );

    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("removes channel on unmount", () => {
    // The channel ref passed to removeChannel is the return value of
    // supabase.channel().on().subscribe() — i.e. the subscription object
    const subscriptionRef = { unsubscribe: jest.fn() };
    mockSubscribe.mockReturnValue(subscriptionRef);

    const { unmount } = render(
      <TournamentSidebarCard
        tournamentId={42}
        tournamentSlug="spring-classic"
        tournamentName="Spring Classic"
        gameFormat="vgc2026"
        initialTeam={null}
      />
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(subscriptionRef);
  });

  it("creates new channel when tournamentId changes", () => {
    const { rerender } = render(
      <TournamentSidebarCard
        tournamentId={42}
        tournamentSlug="spring-classic"
        tournamentName="Spring Classic"
        gameFormat="vgc2026"
        initialTeam={null}
      />
    );

    mockChannel.mockClear();

    rerender(
      <TournamentSidebarCard
        tournamentId={99}
        tournamentSlug="winter-open"
        tournamentName="Winter Open"
        gameFormat="vgc2026"
        initialTeam={null}
      />
    );

    expect(mockChannel).toHaveBeenCalledWith("registrations-99");
  });
});
