import { render, screen } from "@testing-library/react";
import {
  MatchHeader,
  type PlayerInfo,
  type PlayerStats,
} from "../match-header";
import type { GameData } from "../game-card";

// Mock next/link to render a plain anchor
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock server actions
jest.mock("@/actions/matches", () => ({
  submitGameSelectionAction: jest.fn(),
  judgeOverrideGameAction: jest.fn(),
  judgeResetGameAction: jest.fn(),
  resetMatchAction: jest.fn(),
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPlayer1: PlayerInfo = {
  id: 1,
  username: "ash_ketchum",
  display_name: "Ash",
  avatar_url: null,
  in_game_name: null,
  handle: null,
};

const mockPlayer2: PlayerInfo = {
  id: 2,
  username: "misty",
  display_name: "Misty",
  avatar_url: null,
  in_game_name: null,
  handle: null,
};

const defaultStats: PlayerStats = { wins: 0, losses: 0 };

// ============================================================================
// Helper: build default MatchHeader props
// ============================================================================

function buildProps(overrides: {
  games?: GameData[];
  matchStatus?: string;
  isStaff?: boolean;
  isParticipant?: boolean;
}) {
  return {
    opponent: mockPlayer1,
    myPlayer: mockPlayer2,
    opponentStats: defaultStats,
    myStats: defaultStats,
    myWins: 0,
    opponentWins: 0,
    bestOf: 3,
    matchStatus: overrides.matchStatus ?? "active",
    staffRequested: false,
    roundNumber: 1,
    tableNumber: 1,
    isStaff: overrides.isStaff ?? false,
    games: overrides.games ?? null,
    gamesLoading: false,
    matchId: 100,
    myAltId: 2,
    opponentAltId: 1,
    myName: "misty",
    opponentName: "ash_ketchum",
    isParticipant: overrides.isParticipant ?? true,
    isPlayer1: false,
    tournamentId: 10,
    userAltId: 2,
    onGameUpdated: jest.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("No-show indicator", () => {
  describe("NoShowAlert banner", () => {
    it("shows no-show alert when games have is_no_show=true", () => {
      const games: GameData[] = [
        {
          id: 1,
          game_number: 1,
          status: "resolved",
          winner_alt_id: 2,
          is_no_show: true,
        },
        {
          id: 2,
          game_number: 2,
          status: "pending",
          winner_alt_id: null,
          is_no_show: false,
        },
      ];

      render(<MatchHeader {...buildProps({ games })} />);

      expect(
        screen.getByText(/Game 1 was awarded due to opponent no-show/i)
      ).toBeInTheDocument();
    });

    it("shows plural form for multiple no-show games", () => {
      const games: GameData[] = [
        {
          id: 1,
          game_number: 1,
          status: "resolved",
          winner_alt_id: 2,
          is_no_show: true,
        },
        {
          id: 2,
          game_number: 2,
          status: "resolved",
          winner_alt_id: 2,
          is_no_show: true,
        },
        {
          id: 3,
          game_number: 3,
          status: "pending",
          winner_alt_id: null,
          is_no_show: false,
        },
      ];

      render(<MatchHeader {...buildProps({ games })} />);

      expect(
        screen.getByText(/Games 1, 2 were awarded due to opponent no-show/i)
      ).toBeInTheDocument();
    });

    it("does not show alert when no games have is_no_show", () => {
      const games: GameData[] = [
        {
          id: 1,
          game_number: 1,
          status: "agreed",
          winner_alt_id: 2,
          is_no_show: false,
        },
        {
          id: 2,
          game_number: 2,
          status: "pending",
          winner_alt_id: null,
        },
      ];

      render(<MatchHeader {...buildProps({ games })} />);

      expect(
        screen.queryByText(/awarded due to opponent no-show/i)
      ).not.toBeInTheDocument();
    });

    it("does not show alert when games list is empty", () => {
      render(<MatchHeader {...buildProps({ games: [] })} />);

      expect(
        screen.queryByText(/awarded due to opponent no-show/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("GameNode no-show styling", () => {
    it("shows no-show title on resolved no-show game node (participant view)", () => {
      const games: GameData[] = [
        {
          id: 1,
          game_number: 1,
          status: "resolved",
          winner_alt_id: 2,
          is_no_show: true,
        },
        {
          id: 2,
          game_number: 2,
          status: "pending",
          winner_alt_id: null,
        },
      ];

      render(<MatchHeader {...buildProps({ games, isParticipant: true })} />);

      // The no-show game node should have a title indicating it was a no-show
      const noShowButton = screen.getByTitle(
        /Awarded to misty — opponent no-show/
      );
      expect(noShowButton).toBeInTheDocument();
    });

    it("shows no-show title on resolved no-show game node (staff view)", () => {
      const games: GameData[] = [
        {
          id: 1,
          game_number: 1,
          status: "resolved",
          winner_alt_id: 2,
          is_no_show: true,
        },
        {
          id: 2,
          game_number: 2,
          status: "pending",
          winner_alt_id: null,
        },
      ];

      render(
        <MatchHeader
          {...buildProps({ games, isStaff: true, isParticipant: false })}
        />
      );

      // Staff view: the no-show game node should have a no-show title
      const noShowNode = screen.getByTitle(
        /Awarded to misty — opponent no-show/
      );
      expect(noShowNode).toBeInTheDocument();
    });
  });
});
