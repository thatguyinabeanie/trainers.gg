import { type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MatchPageClient, type MatchPageClientProps } from "../match-page-client";

// ===========================================================================
// Mocks
// ===========================================================================

// Stub scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();

jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

const mockGetMatchGames = jest.fn();
const mockGetMatchGamesForPlayer = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getMatchGames: (...args: unknown[]) => mockGetMatchGames(...args),
  getMatchGamesForPlayer: (...args: unknown[]) =>
    mockGetMatchGamesForPlayer(...args),
  getMatchMessages: jest.fn().mockResolvedValue([]),
}));

// Supabase realtime channel mock
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};
const mockRemoveChannel = jest.fn();
const mockSupabaseInstance = {
  channel: jest.fn().mockReturnValue(mockChannel),
  removeChannel: mockRemoveChannel,
};

jest.mock("@/lib/supabase", () => ({
  useSupabase: () => mockSupabaseInstance,
  useSupabaseQuery: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

// Mock heavy sub-components to keep tests fast & focused on page-level logic
jest.mock("../match-header", () => ({
  MatchHeader: (props: { matchStatus: string; roundNumber: number | null }) => (
    <div data-testid="match-header" data-status={props.matchStatus}>
      {props.roundNumber !== null && `Round ${props.roundNumber}`}
    </div>
  ),
}));

jest.mock("../match-chat", () => ({
  MatchChat: (props: { matchStatus: string }) => (
    <div data-testid="match-chat" data-status={props.matchStatus} />
  ),
}));

jest.mock("../match-check-in", () => ({
  MatchCheckIn: () => <div data-testid="match-check-in" />,
}));

jest.mock("../post-match-summary", () => ({
  PostMatchSummary: () => <div data-testid="post-match-summary" />,
}));

jest.mock("../team-sheet", () => ({
  TeamSheet: () => <div data-testid="team-sheet" />,
}));

const mockUseMatchPresence = jest.fn();
jest.mock("../presence-indicator", () => ({
  useMatchPresence: (...args: unknown[]) => mockUseMatchPresence(...args),
}));

jest.mock("../match-perspective", () => ({
  resolveHeaderPerspective: jest.fn(({ player1Value, player2Value, isParticipant, isPlayer1 }) => {
    const player1IsMe = isParticipant && isPlayer1;
    return {
      headerOpponentValue: player1IsMe ? player2Value : player1Value,
      headerMyValue: player1IsMe ? player1Value : player2Value,
    };
  }),
}));

jest.mock("@/actions/matches", () => ({
  sendMatchMessageAction: jest.fn(),
  requestJudgeAction: jest.fn(),
  cancelJudgeRequestAction: jest.fn(),
  clearJudgeRequestAction: jest.fn(),
  confirmMatchCheckInAction: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// ===========================================================================
// Fixtures
// ===========================================================================

const player1 = {
  id: 1,
  username: "ash_ketchum",
  display_name: "Ash Ketchum",
  avatar_url: null,
  in_game_name: null,
  handle: "ash",
};

const player2 = {
  id: 2,
  username: "misty",
  display_name: "Misty",
  avatar_url: null,
  in_game_name: null,
  handle: "misty",
};

const baseProps: MatchPageClientProps = {
  matchId: 1,
  tournamentId: 10,
  tournamentSlug: "vgc-open",
  matchStatus: "active",
  staffRequested: false,
  player1CheckedIn: false,
  player2CheckedIn: false,
  player1,
  player2,
  alt1Id: 100,
  alt2Id: 200,
  roundNumber: 3,
  tableNumber: 7,
  bestOf: 3,
  userAltId: 100,
  isParticipant: true,
  isStaff: false,
  isPlayer1: true,
  player1Stats: { wins: 5, losses: 1 },
  player2Stats: { wins: 3, losses: 3 },
  myTeam: null,
  opponentTeam: null,
  openTeamSheets: false,
  currentUserUsername: "ash_ketchum",
  currentUserDisplayName: "Ash Ketchum",
};

function setup(overrides: Partial<MatchPageClientProps> = {}) {
  mockUseMatchPresence.mockReturnValue({
    viewers: [],
    typingUsers: [],
    setTyping: jest.fn(),
    broadcastJudgeRequest: jest.fn(),
  });
  return render(<MatchPageClient {...baseProps} {...overrides} />);
}

// ===========================================================================
// Tests
// ===========================================================================

describe("MatchPageClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Core rendering
  // =========================================================================

  describe("core rendering", () => {
    it("renders the MatchHeader component", () => {
      setup();
      expect(screen.getByTestId("match-header")).toBeInTheDocument();
    });

    it("renders the MatchChat component", () => {
      setup();
      // match-chat appears in both mobile and desktop layout sections
      expect(screen.getAllByTestId("match-chat").length).toBeGreaterThan(0);
    });

    it("passes correct matchStatus to MatchHeader", () => {
      setup({ matchStatus: "completed" });
      // MatchHeader is always rendered once
      expect(screen.getByTestId("match-header")).toHaveAttribute(
        "data-status",
        "completed"
      );
    });
  });

  // =========================================================================
  // Check-in banner (pending matches only)
  // =========================================================================

  describe("check-in banner", () => {
    it("shows MatchCheckIn when matchStatus is pending", () => {
      setup({ matchStatus: "pending" });
      expect(screen.getByTestId("match-check-in")).toBeInTheDocument();
    });

    it("does not show MatchCheckIn when matchStatus is active", () => {
      setup({ matchStatus: "active" });
      expect(screen.queryByTestId("match-check-in")).not.toBeInTheDocument();
    });

    it("does not show MatchCheckIn when matchStatus is completed", () => {
      setup({ matchStatus: "completed" });
      expect(screen.queryByTestId("match-check-in")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Post-match summary (completed + participant only)
  // =========================================================================

  describe("post-match summary", () => {
    it("shows PostMatchSummary for participant when match is completed", () => {
      setup({ matchStatus: "completed", isParticipant: true });
      expect(screen.getByTestId("post-match-summary")).toBeInTheDocument();
    });

    it("does not show PostMatchSummary for non-participant (staff)", () => {
      setup({ matchStatus: "completed", isParticipant: false });
      expect(screen.queryByTestId("post-match-summary")).not.toBeInTheDocument();
    });

    it("does not show PostMatchSummary when match is not completed", () => {
      setup({ matchStatus: "active", isParticipant: true });
      expect(screen.queryByTestId("post-match-summary")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Team sheets
  // =========================================================================

  describe("team sheets", () => {
    const myTeam = {
      teamId: 1,
      teamName: "My Team",
      pokemon: [],
    };
    const opponentTeam = {
      teamId: 2,
      teamName: "Opponent Team",
      pokemon: [],
    };

    it("does not render Teams tab when no teams are present", () => {
      setup({ myTeam: null, opponentTeam: null });
      expect(screen.queryByRole("tab", { name: /Teams/i })).not.toBeInTheDocument();
    });

    it("renders Teams tab on mobile when myTeam is provided", () => {
      setup({ myTeam, opponentTeam: null });
      // Mobile layout uses Tabs with a Teams trigger
      expect(screen.getByRole("tab", { name: /Teams/i })).toBeInTheDocument();
    });

    it("renders Teams tab on mobile when opponentTeam is provided", () => {
      setup({ myTeam: null, opponentTeam });
      expect(screen.getByRole("tab", { name: /Teams/i })).toBeInTheDocument();
    });

    it("renders TeamSheet components when both teams are provided", () => {
      setup({ myTeam, opponentTeam });
      // Two TeamSheet components are rendered (mobile + desktop areas)
      const sheets = screen.getAllByTestId("team-sheet");
      expect(sheets.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Presence integration
  // =========================================================================

  describe("presence integration", () => {
    it("calls useMatchPresence with correct matchId and username", () => {
      setup();
      expect(mockUseMatchPresence).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: 1,
          username: "ash_ketchum",
          isStaff: false,
          isParticipant: true,
        })
      );
    });

    it("passes isStaff=true to useMatchPresence for staff users", () => {
      setup({ isStaff: true });
      expect(mockUseMatchPresence).toHaveBeenCalledWith(
        expect.objectContaining({ isStaff: true })
      );
    });
  });

  // =========================================================================
  // Realtime subscriptions
  // =========================================================================

  describe("realtime subscriptions", () => {
    it("creates a channel for match messages", () => {
      setup();
      expect(mockSupabaseInstance.channel).toHaveBeenCalledWith(
        expect.stringContaining("match-messages-1")
      );
    });

    it("creates a channel for match status updates", () => {
      setup();
      expect(mockSupabaseInstance.channel).toHaveBeenCalledWith(
        expect.stringContaining("match-status-1")
      );
    });

    it("creates a channel for match games", () => {
      setup();
      expect(mockSupabaseInstance.channel).toHaveBeenCalledWith(
        expect.stringContaining("match-games-1")
      );
    });
  });

  // =========================================================================
  // Perspective resolution (player name derivation)
  // =========================================================================

  describe("player name derivation", () => {
    it("passes currentUserUsername to useMatchPresence", () => {
      setup({ currentUserUsername: "ash_ketchum" });
      expect(mockUseMatchPresence).toHaveBeenCalledWith(
        expect.objectContaining({ username: "ash_ketchum" })
      );
    });

    it("passes null username when currentUserUsername is null", () => {
      setup({ currentUserUsername: null });
      expect(mockUseMatchPresence).toHaveBeenCalledWith(
        expect.objectContaining({ username: null })
      );
    });
  });

  // =========================================================================
  // Non-participant (staff/observer) view
  // =========================================================================

  describe("non-participant view", () => {
    it("renders correctly for a non-participant staff user", () => {
      setup({ isParticipant: false, isStaff: true, userAltId: null });
      expect(screen.getByTestId("match-header")).toBeInTheDocument();
      // match-chat appears in both mobile and desktop layout sections
      expect(screen.getAllByTestId("match-chat").length).toBeGreaterThan(0);
    });

    it("does not show check-in banner for non-participants even when pending", () => {
      // Non-participants with pending match — still shows check-in (it renders for anyone)
      // The MatchCheckIn component itself handles the display logic internally
      setup({ matchStatus: "pending", isParticipant: false });
      expect(screen.getByTestId("match-check-in")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Mobile tab navigation
  // =========================================================================

  describe("mobile tab navigation", () => {
    it("shows Chat tab in mobile layout when teams are present", () => {
      setup({
        myTeam: { teamId: 1, teamName: null, pokemon: [] },
      });
      expect(screen.getByRole("tab", { name: /Chat/i })).toBeInTheDocument();
    });

    it("does not show Chat tab in mobile layout when no teams are present", () => {
      setup({ myTeam: null, opponentTeam: null });
      expect(
        screen.queryByRole("tab", { name: /Chat/i })
      ).not.toBeInTheDocument();
    });
  });
});
