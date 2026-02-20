import { render, screen } from "@testing-library/react";
import {
  getTournamentRegistrations,
  getTournamentInvitationsSent,
} from "@trainers/supabase";
import { type TypedClient } from "@trainers/supabase";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the Server Actions
jest.mock("@/actions/tournaments", () => ({
  forceCheckInPlayer: jest.fn(),
  removePlayerFromTournament: jest.fn(),
  bulkForceCheckIn: jest.fn(),
  bulkRemovePlayers: jest.fn(),
}));

// Mock InviteForm to avoid pulling in its heavy dependencies
jest.mock("@/components/tournaments/invite/invite-form", () => ({
  InviteForm: jest.fn(() => <div data-testid="invite-form" />),
}));

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

const mockSupabaseClient = {
  channel: jest.fn(() => mockChannel),
};

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn((queryFn) => {
    // Call the query function with a mock supabase client
    const mockSupabase = {} as TypedClient;
    const result = queryFn(mockSupabase);
    return { data: result, refetch: jest.fn() };
  }),
  useSupabaseMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useSupabase: jest.fn(() => mockSupabaseClient),
}));

// Mock the getTournamentRegistrations query
// In tests, we make it return data synchronously instead of a Promise
jest.mock("@trainers/supabase", () => ({
  getTournamentRegistrations: jest.fn(),
  getTournamentInvitationsSent: jest.fn(() => []),
}));

// Import the component AFTER setting up all mocks
import { TournamentRegistrations } from "../tournament-registrations";

type SyncRegistrationsFn = () => Awaited<
  ReturnType<typeof getTournamentRegistrations>
>;
const mockGetTournamentRegistrations =
  getTournamentRegistrations as unknown as jest.MockedFunction<SyncRegistrationsFn>;

describe("TournamentRegistrations", () => {
  const mockTournament = {
    id: 1,
    status: "active",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Statistics Cards", () => {
    it("should display correct Total Registered count", () => {
      const mockRegistrations = [
        {
          id: 1,
          tournament_id: 1,
          alt_id: 1,
          status: "checked_in",
          registered_at: new Date().toISOString(),
          alt: {
            id: 1,
            username: "player1",
            display_name: "Player 1",
            avatar_url: null,
          },
        },
        {
          id: 2,
          tournament_id: 1,
          alt_id: 2,
          status: "registered",
          registered_at: new Date().toISOString(),
          alt: {
            id: 2,
            username: "player2",
            display_name: "Player 2",
            avatar_url: null,
          },
        },
      ];

      mockGetTournamentRegistrations.mockReturnValue(
        mockRegistrations as unknown as Awaited<
          ReturnType<typeof getTournamentRegistrations>
        >
      );

      render(<TournamentRegistrations tournament={mockTournament} />);

      expect(screen.getByText("Total Registered")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should count checked_in registrations correctly", () => {
      const mockRegistrations = [
        {
          id: 1,
          tournament_id: 1,
          alt_id: 1,
          status: "checked_in",
          registered_at: new Date().toISOString(),
          alt: {
            id: 1,
            username: "player1",
            display_name: "Player 1",
            avatar_url: null,
          },
        },
        {
          id: 2,
          tournament_id: 1,
          alt_id: 2,
          status: "checked_in",
          registered_at: new Date().toISOString(),
          alt: {
            id: 2,
            username: "player2",
            display_name: "Player 2",
            avatar_url: null,
          },
        },
        {
          id: 3,
          tournament_id: 1,
          alt_id: 3,
          status: "registered",
          registered_at: new Date().toISOString(),
          alt: {
            id: 3,
            username: "player3",
            display_name: "Player 3",
            avatar_url: null,
          },
        },
      ];

      mockGetTournamentRegistrations.mockReturnValue(
        mockRegistrations as unknown as Awaited<
          ReturnType<typeof getTournamentRegistrations>
        >
      );

      const { container } = render(
        <TournamentRegistrations tournament={mockTournament} />
      );

      // Find all cards in the statistics section
      const statsCards = container.querySelectorAll(
        ".grid.gap-4.md\\:grid-cols-4 > div"
      );
      expect(statsCards).toHaveLength(4);

      // Second card should be "Checked In" with count 2
      const checkedInCard = statsCards[1];
      expect(checkedInCard).toHaveTextContent("Checked In");
      expect(checkedInCard).toHaveTextContent("2");
    });

    it("should count not checked in registrations (registered, confirmed, pending, waitlist)", () => {
      const mockRegistrations = [
        {
          id: 1,
          tournament_id: 1,
          alt_id: 1,
          status: "checked_in",
          registered_at: new Date().toISOString(),
          alt: {
            id: 1,
            username: "player1",
            display_name: "Player 1",
            avatar_url: null,
          },
        },
        {
          id: 2,
          tournament_id: 1,
          alt_id: 2,
          status: "registered",
          registered_at: new Date().toISOString(),
          alt: {
            id: 2,
            username: "player2",
            display_name: "Player 2",
            avatar_url: null,
          },
        },
        {
          id: 3,
          tournament_id: 1,
          alt_id: 3,
          status: "confirmed",
          registered_at: new Date().toISOString(),
          alt: {
            id: 3,
            username: "player3",
            display_name: "Player 3",
            avatar_url: null,
          },
        },
        {
          id: 4,
          tournament_id: 1,
          alt_id: 4,
          status: "pending",
          registered_at: new Date().toISOString(),
          alt: {
            id: 4,
            username: "player4",
            display_name: "Player 4",
            avatar_url: null,
          },
        },
        {
          id: 5,
          tournament_id: 1,
          alt_id: 5,
          status: "waitlist",
          registered_at: new Date().toISOString(),
          alt: {
            id: 5,
            username: "player5",
            display_name: "Player 5",
            avatar_url: null,
          },
        },
      ];

      mockGetTournamentRegistrations.mockReturnValue(
        mockRegistrations as unknown as Awaited<
          ReturnType<typeof getTournamentRegistrations>
        >
      );

      render(<TournamentRegistrations tournament={mockTournament} />);

      expect(screen.getByText("Not Checked In")).toBeInTheDocument();
      const notCheckedInCard = screen.getByText("Not Checked In").closest("div")
        ?.parentElement?.parentElement;
      expect(notCheckedInCard).toHaveTextContent("4");
    });

    it("should count dropped registrations correctly", () => {
      const mockRegistrations = [
        {
          id: 1,
          tournament_id: 1,
          alt_id: 1,
          status: "checked_in",
          registered_at: new Date().toISOString(),
          alt: {
            id: 1,
            username: "player1",
            display_name: "Player 1",
            avatar_url: null,
          },
        },
        {
          id: 2,
          tournament_id: 1,
          alt_id: 2,
          status: "dropped",
          registered_at: new Date().toISOString(),
          alt: {
            id: 2,
            username: "player2",
            display_name: "Player 2",
            avatar_url: null,
          },
        },
        {
          id: 3,
          tournament_id: 1,
          alt_id: 3,
          status: "dropped",
          registered_at: new Date().toISOString(),
          alt: {
            id: 3,
            username: "player3",
            display_name: "Player 3",
            avatar_url: null,
          },
        },
      ];

      mockGetTournamentRegistrations.mockReturnValue(
        mockRegistrations as unknown as Awaited<
          ReturnType<typeof getTournamentRegistrations>
        >
      );

      const { container } = render(
        <TournamentRegistrations tournament={mockTournament} />
      );

      // Find all cards in the statistics section
      const statsCards = container.querySelectorAll(
        ".grid.gap-4.md\\:grid-cols-4 > div"
      );
      expect(statsCards).toHaveLength(4);

      // Fourth card should be "Dropped" with count 2
      const droppedCard = statsCards[3];
      expect(droppedCard).toHaveTextContent("Dropped");
      expect(droppedCard).toHaveTextContent("2");
    });

    it("should handle empty registrations correctly", () => {
      mockGetTournamentRegistrations.mockReturnValue(
        [] as unknown as Awaited<ReturnType<typeof getTournamentRegistrations>>
      );

      render(<TournamentRegistrations tournament={mockTournament} />);

      expect(screen.getByText("Total Registered")).toBeInTheDocument();
      expect(screen.getByText("Checked In")).toBeInTheDocument();
      expect(screen.getByText("Not Checked In")).toBeInTheDocument();
      expect(screen.getByText("Dropped")).toBeInTheDocument();

      // All counts should be 0
      const cards = screen.getAllByText("0");
      expect(cards).toHaveLength(4);
    });

    it("should match the Linear ticket scenario: 63 checked_in players", () => {
      // Create 63 registrations with checked_in status
      const mockRegistrations = Array.from({ length: 63 }, (_, i) => ({
        id: i + 1,
        tournament_id: 1,
        alt_id: i + 1,
        status: "checked_in",
        registered_at: new Date().toISOString(),
        alt: {
          id: i + 1,
          username: `player${i + 1}`,
          display_name: `Player ${i + 1}`,
          avatar_url: null,
        },
      }));

      mockGetTournamentRegistrations.mockReturnValue(
        mockRegistrations as unknown as Awaited<
          ReturnType<typeof getTournamentRegistrations>
        >
      );

      const { container } = render(
        <TournamentRegistrations tournament={mockTournament} />
      );

      // Find all cards in the statistics section
      const statsCards = container.querySelectorAll(
        ".grid.gap-4.md\\:grid-cols-4 > div"
      );
      expect(statsCards).toHaveLength(4);

      // First card: Total Registered should be 63
      expect(statsCards[0]).toHaveTextContent("Total Registered");
      expect(statsCards[0]).toHaveTextContent("63");

      // Second card: Checked In should be 63
      expect(statsCards[1]).toHaveTextContent("Checked In");
      expect(statsCards[1]).toHaveTextContent("63");

      // Third card: Not Checked In should be 0
      expect(statsCards[2]).toHaveTextContent("Not Checked In");
      expect(statsCards[2]).toHaveTextContent("0");

      // Fourth card: Dropped should be 0
      expect(statsCards[3]).toHaveTextContent("Dropped");
      expect(statsCards[3]).toHaveTextContent("0");
    });
  });
});

describe("TournamentRegistrations — invitations sub-tab", () => {
  const tournament = { id: 1, status: "upcoming", maxParticipants: 10 };

  beforeEach(() => {
    jest.clearAllMocks();
    // 6 registered players
    mockGetTournamentRegistrations.mockReturnValue([
      {
        id: 1,
        status: "registered",
        alt: { username: "p1", avatar_url: null },
        team_name: null,
        registered_at: null,
      },
      {
        id: 2,
        status: "registered",
        alt: { username: "p2", avatar_url: null },
        team_name: null,
        registered_at: null,
      },
      {
        id: 3,
        status: "registered",
        alt: { username: "p3", avatar_url: null },
        team_name: null,
        registered_at: null,
      },
      {
        id: 4,
        status: "registered",
        alt: { username: "p4", avatar_url: null },
        team_name: null,
        registered_at: null,
      },
      {
        id: 5,
        status: "registered",
        alt: { username: "p5", avatar_url: null },
        team_name: null,
        registered_at: null,
      },
      {
        id: 6,
        status: "registered",
        alt: { username: "p6", avatar_url: null },
        team_name: null,
        registered_at: null,
      },
    ] as unknown as Awaited<ReturnType<typeof getTournamentRegistrations>>);
  });

  it("shows available spots as maxParticipants minus registered minus pending non-expired", () => {
    // 2 pending non-expired + 1 expired invitation
    (
      getTournamentInvitationsSent as jest.MockedFunction<() => unknown[]>
    ).mockReturnValue([
      {
        id: 10,
        status: "pending",
        expires_at: "2099-01-01T00:00:00Z",
        invited_at: null,
        invitedPlayer: { username: "inv1" },
        invitedByAlt: null,
      },
      {
        id: 11,
        status: "pending",
        expires_at: "2099-01-01T00:00:00Z",
        invited_at: null,
        invitedPlayer: { username: "inv2" },
        invitedByAlt: null,
      },
      {
        id: 12,
        status: "pending",
        expires_at: "2024-01-01T00:00:00Z",
        invited_at: null,
        invitedPlayer: { username: "inv3_expired" },
        invitedByAlt: null,
      },
    ]);

    render(<TournamentRegistrations tournament={tournament} />);
    // 10 max - 6 registered - 2 pending non-expired = 2 available
    expect(screen.getByText(/2 spots? available/i)).toBeInTheDocument();
  });

  it("shows zero available spots when at capacity", () => {
    // 8 registered + 2 pending = 10 = maxParticipants → 0 available
    mockGetTournamentRegistrations.mockReturnValue(
      Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        status: "registered",
        alt: { username: `p${i + 1}`, avatar_url: null },
        team_name: null,
        registered_at: null,
      })) as unknown as Awaited<ReturnType<typeof getTournamentRegistrations>>
    );
    (
      getTournamentInvitationsSent as jest.MockedFunction<() => unknown[]>
    ).mockReturnValue([
      {
        id: 10,
        status: "pending",
        expires_at: "2099-01-01T00:00:00Z",
        invited_at: null,
        invitedPlayer: { username: "inv1" },
        invitedByAlt: null,
      },
      {
        id: 11,
        status: "pending",
        expires_at: "2099-01-01T00:00:00Z",
        invited_at: null,
        invitedPlayer: { username: "inv2" },
        invitedByAlt: null,
      },
    ]);

    render(<TournamentRegistrations tournament={tournament} />);
    expect(screen.getByText(/0 spots? available/i)).toBeInTheDocument();
  });
});
