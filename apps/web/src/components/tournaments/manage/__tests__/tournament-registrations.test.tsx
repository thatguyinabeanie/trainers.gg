import { render, screen } from "@testing-library/react";
import { TournamentRegistrations } from "../tournament-registrations";
import { getTournamentRegistrations } from "@trainers/supabase";

// Mock the Supabase query hook
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn((queryFn) => {
    // Call the query function with a mock supabase client
    const mockSupabase = {} as any;
    const result = queryFn(mockSupabase);
    return { data: result };
  }),
}));

// Mock the getTournamentRegistrations query
jest.mock("@trainers/supabase", () => ({
  getTournamentRegistrations: jest.fn(),
}));

const mockGetTournamentRegistrations =
  getTournamentRegistrations as jest.MockedFunction<
    typeof getTournamentRegistrations
  >;

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
        mockRegistrations as any
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
        mockRegistrations as any
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
        mockRegistrations as any
      );

      render(<TournamentRegistrations tournament={mockTournament} />);

      expect(screen.getByText("Not Checked In")).toBeInTheDocument();
      const notCheckedInCard = screen
        .getByText("Not Checked In")
        .closest("div")
        ?.parentElement?.parentElement;
      expect(notCheckedInCard).toHaveTextContent("4");
    });

    it("should count dropped/disqualified registrations correctly", () => {
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
          status: "disqualified",
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
        mockRegistrations as any
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
      mockGetTournamentRegistrations.mockReturnValue([]);

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
        mockRegistrations as any
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
