import { type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchHeader, type PlayerInfo, type PlayerStats } from "../match-header";

// ===========================================================================
// Mocks
// ===========================================================================

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

const mockSubmitGameSelection = jest.fn();
const mockJudgeOverrideGame = jest.fn();
const mockJudgeResetGame = jest.fn();
const mockResetMatch = jest.fn();

jest.mock("@/actions/matches", () => ({
  submitGameSelectionAction: (...args: unknown[]) =>
    mockSubmitGameSelection(...args),
  judgeOverrideGameAction: (...args: unknown[]) =>
    mockJudgeOverrideGame(...args),
  judgeResetGameAction: (...args: unknown[]) => mockJudgeResetGame(...args),
  resetMatchAction: (...args: unknown[]) => mockResetMatch(...args),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// ===========================================================================
// Fixtures
// ===========================================================================

function makePlayer(overrides: Partial<PlayerInfo> = {}): PlayerInfo {
  return {
    id: 1,
    username: "ash_ketchum",
    display_name: "Ash Ketchum",
    avatar_url: null,
    in_game_name: "ASH123",
    handle: "ash",
    ...overrides,
  };
}

const defaultProps = {
  opponent: makePlayer({ id: 2, username: "misty", display_name: "Misty", handle: "misty", in_game_name: null }),
  myPlayer: makePlayer(),
  opponentStats: { wins: 3, losses: 1 } as PlayerStats,
  myStats: { wins: 2, losses: 2 } as PlayerStats,
  myWins: 0,
  opponentWins: 0,
  bestOf: 3,
  matchStatus: "active",
  staffRequested: false,
  roundNumber: 2,
  tableNumber: 5,
  isStaff: false,
  games: null,
  gamesLoading: false,
  matchId: 100,
  myAltId: 10,
  opponentAltId: 20,
  myName: "ash_ketchum",
  opponentName: "misty",
  isParticipant: true,
  isPlayer1: true,
  tournamentId: 1,
  userAltId: 10,
  onGameUpdated: jest.fn(),
};

// ===========================================================================
// Tests
// ===========================================================================

describe("MatchHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Metadata row
  // =========================================================================

  describe("metadata row", () => {
    it("shows round number when provided", () => {
      render(<MatchHeader {...defaultProps} />);
      expect(screen.getByText("Round 2")).toBeInTheDocument();
    });

    it("does not show round number when null", () => {
      render(<MatchHeader {...defaultProps} roundNumber={null} />);
      expect(screen.queryByText(/Round/)).not.toBeInTheDocument();
    });

    it("shows table number when provided", () => {
      render(<MatchHeader {...defaultProps} />);
      expect(screen.getByText("Table 5")).toBeInTheDocument();
    });

    it("does not show table number when null", () => {
      render(<MatchHeader {...defaultProps} tableNumber={null} />);
      expect(screen.queryByText(/Table/)).not.toBeInTheDocument();
    });

    it("shows Judge Requested badge when staffRequested is true", () => {
      render(<MatchHeader {...defaultProps} staffRequested={true} />);
      expect(screen.getByText("Judge Requested")).toBeInTheDocument();
    });

    it("does not show Judge Requested badge when false", () => {
      render(<MatchHeader {...defaultProps} staffRequested={false} />);
      expect(screen.queryByText("Judge Requested")).not.toBeInTheDocument();
    });

    it("shows Judge badge when isStaff is true", () => {
      render(<MatchHeader {...defaultProps} isStaff={true} />);
      expect(screen.getByText("Judge")).toBeInTheDocument();
    });

    it("does not show Judge badge for non-staff", () => {
      render(<MatchHeader {...defaultProps} isStaff={false} />);
      expect(screen.queryByText("Judge")).not.toBeInTheDocument();
    });

    it("shows Reset Match button for staff when match is active", () => {
      render(
        <MatchHeader {...defaultProps} isStaff={true} matchStatus="active" />
      );
      expect(
        screen.getByRole("button", { name: /Reset Match/i })
      ).toBeInTheDocument();
    });

    it("does not show Reset Match button for non-staff", () => {
      render(<MatchHeader {...defaultProps} isStaff={false} />);
      expect(
        screen.queryByRole("button", { name: /Reset Match/i })
      ).not.toBeInTheDocument();
    });

    it("does not show Reset Match button when match is not active", () => {
      render(
        <MatchHeader {...defaultProps} isStaff={true} matchStatus="pending" />
      );
      expect(
        screen.queryByRole("button", { name: /Reset Match/i })
      ).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Player cards
  // =========================================================================

  describe("player cards", () => {
    it("renders both player usernames", () => {
      render(<MatchHeader {...defaultProps} />);
      expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
      expect(screen.getByText("misty")).toBeInTheDocument();
    });

    it("renders W-L stats as badges", () => {
      render(<MatchHeader {...defaultProps} />);
      // opponent: 3W-1L, my: 2W-2L
      expect(screen.getByText("3W-1L")).toBeInTheDocument();
      expect(screen.getByText("2W-2L")).toBeInTheDocument();
    });

    it("renders in_game_name for opponent (left side, showIGN=true)", () => {
      render(
        <MatchHeader
          {...defaultProps}
          opponent={makePlayer({
            id: 2,
            username: "misty",
            in_game_name: "MISTY_IGN",
          })}
        />
      );
      expect(screen.getByText("MISTY_IGN")).toBeInTheDocument();
    });

    it("does not render in_game_name for my player (right side, showIGN=false)", () => {
      render(<MatchHeader {...defaultProps} />);
      // myPlayer has in_game_name "ASH123" but showIGN=false for right side
      expect(screen.queryByText("ASH123")).not.toBeInTheDocument();
    });

    it("renders profile link for player with handle", () => {
      render(<MatchHeader {...defaultProps} />);
      const ashLink = screen.getByRole("link", { name: "ash_ketchum" });
      expect(ashLink).toHaveAttribute("href", "/profile/ash");
    });

    it("renders plain text (no link) for player without handle", () => {
      render(
        <MatchHeader
          {...defaultProps}
          opponent={makePlayer({ id: 2, username: "nohandle", handle: null })}
        />
      );
      expect(screen.getByText("nohandle")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "nohandle" })).not.toBeInTheDocument();
    });

    it("renders nothing for null player (bye slot)", () => {
      render(<MatchHeader {...defaultProps} opponent={null} />);
      // opponent is null, should not crash and no misty text
      expect(screen.queryByText("misty")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Score display
  // =========================================================================

  describe("score display", () => {
    it("shows Bo3 label", () => {
      render(<MatchHeader {...defaultProps} bestOf={3} />);
      expect(screen.getByText("Bo3")).toBeInTheDocument();
    });

    it("shows Bo5 label", () => {
      render(<MatchHeader {...defaultProps} bestOf={5} />);
      expect(screen.getByText("Bo5")).toBeInTheDocument();
    });

    it("renders current score numbers", () => {
      render(<MatchHeader {...defaultProps} myWins={2} opponentWins={1} />);
      // ScoreDisplay renders opponentWins on left, myWins on right
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Match winner state
  // =========================================================================

  describe("match winner trophy", () => {
    it("does not show trophy when no one has won", () => {
      render(<MatchHeader {...defaultProps} myWins={0} opponentWins={0} />);
      expect(document.querySelector(".lucide-trophy")).not.toBeInTheDocument();
    });

    it("shows trophy on winner side when match is decided", () => {
      // 2 wins needed in Bo3; opponent has 2 wins → opponent wins
      render(<MatchHeader {...defaultProps} myWins={0} opponentWins={2} />);
      // Trophy badge appears for the winner's card
      expect(document.querySelector(".lucide-trophy")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Game strip
  // =========================================================================

  describe("game strip", () => {
    const pendingGame = {
      id: 1,
      game_number: 1,
      status: "pending",
      winner_alt_id: null,
      my_selection: null,
      opponent_submitted: false,
    };

    const _agreedGame = {
      id: 2,
      game_number: 1,
      status: "agreed",
      winner_alt_id: 10,
      my_selection: 10,
      opponent_submitted: true,
    };

    it("does not render game strip when games is null", () => {
      render(<MatchHeader {...defaultProps} games={null} />);
      // No game number labels rendered
      expect(screen.queryByText(/^1$/)).not.toBeInTheDocument();
    });

    it("renders loading spinner when gamesLoading is true", () => {
      render(
        <MatchHeader
          {...defaultProps}
          games={[pendingGame]}
          gamesLoading={true}
        />
      );
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("renders game nodes for provided games", () => {
      render(
        <MatchHeader
          {...defaultProps}
          games={[pendingGame, { ...pendingGame, id: 2, game_number: 2 }]}
          gamesLoading={false}
        />
      );
      // Game numbers are shown on nodes
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("shows Won/Lost buttons for participants on active games", () => {
      render(
        <MatchHeader
          {...defaultProps}
          matchStatus="active"
          isParticipant={true}
          games={[pendingGame]}
          gamesLoading={false}
        />
      );
      expect(screen.getByRole("button", { name: /Won/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Lost/i })).toBeInTheDocument();
    });

    it("does not show Won/Lost buttons for staff-only view", () => {
      render(
        <MatchHeader
          {...defaultProps}
          matchStatus="active"
          isParticipant={false}
          isStaff={true}
          games={[pendingGame]}
          gamesLoading={false}
        />
      );
      expect(
        screen.queryByRole("button", { name: /Won/i })
      ).not.toBeInTheDocument();
    });

    it("calls submitGameSelectionAction on Won button click", async () => {
      const user = userEvent.setup();
      mockSubmitGameSelection.mockResolvedValue({ success: true });

      render(
        <MatchHeader
          {...defaultProps}
          matchStatus="active"
          isParticipant={true}
          games={[pendingGame]}
          gamesLoading={false}
        />
      );

      await user.click(screen.getByRole("button", { name: /Won/i }));

      await waitFor(() => {
        expect(mockSubmitGameSelection).toHaveBeenCalledWith(
          1,
          10, // myAltId
          1   // tournamentId
        );
      });
    });

    it("calls submitGameSelectionAction with opponentAltId on Lost button click", async () => {
      const user = userEvent.setup();
      mockSubmitGameSelection.mockResolvedValue({ success: true });

      render(
        <MatchHeader
          {...defaultProps}
          matchStatus="active"
          isParticipant={true}
          games={[pendingGame]}
          gamesLoading={false}
        />
      );

      await user.click(screen.getByRole("button", { name: /Lost/i }));

      await waitFor(() => {
        expect(mockSubmitGameSelection).toHaveBeenCalledWith(
          1,
          20, // opponentAltId
          1   // tournamentId
        );
      });
    });

    it("shows toast error when submitGameSelectionAction fails", async () => {
      const user = userEvent.setup();
      mockSubmitGameSelection.mockResolvedValue({
        success: false,
        error: "Submit failed",
      });

      render(
        <MatchHeader
          {...defaultProps}
          matchStatus="active"
          isParticipant={true}
          games={[pendingGame]}
          gamesLoading={false}
        />
      );

      await user.click(screen.getByRole("button", { name: /Won/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Submit failed");
      });
    });
  });

  // =========================================================================
  // No-show alert
  // =========================================================================

  describe("no-show alert", () => {
    it("renders no-show alert when a game has is_no_show=true", () => {
      const noShowGame = {
        id: 1,
        game_number: 1,
        status: "agreed",
        winner_alt_id: 10,
        is_no_show: true,
      };
      render(<MatchHeader {...defaultProps} games={[noShowGame]} />);
      expect(
        screen.getByText(/awarded due to opponent no-show/i)
      ).toBeInTheDocument();
    });

    it("renders 'Game X was...' for single no-show game", () => {
      const noShowGame = {
        id: 1,
        game_number: 2,
        status: "agreed",
        winner_alt_id: 10,
        is_no_show: true,
      };
      render(<MatchHeader {...defaultProps} games={[noShowGame]} />);
      expect(screen.getByText(/Game 2 was awarded/i)).toBeInTheDocument();
    });

    it("does not render no-show alert when no games have is_no_show", () => {
      const normalGame = {
        id: 1,
        game_number: 1,
        status: "agreed",
        winner_alt_id: 10,
        is_no_show: false,
      };
      render(<MatchHeader {...defaultProps} games={[normalGame]} />);
      expect(
        screen.queryByText(/awarded due to opponent no-show/i)
      ).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Dispute alert
  // =========================================================================

  describe("dispute alert", () => {
    const disputedGame = {
      id: 1,
      game_number: 1,
      status: "disputed",
      winner_alt_id: null,
      alt1_selection: 10,
      alt2_selection: 20,
    };

    it("shows dispute alert when a game is disputed", () => {
      render(<MatchHeader {...defaultProps} games={[disputedGame]} />);
      expect(screen.getByText(/Game 1 disputed/i)).toBeInTheDocument();
    });

    it("does not show dispute alert when no games are disputed", () => {
      const normalGame = {
        id: 1,
        game_number: 1,
        status: "agreed",
        winner_alt_id: 10,
      };
      render(<MatchHeader {...defaultProps} games={[normalGame]} />);
      expect(screen.queryByText(/disputed/i)).not.toBeInTheDocument();
    });

    it("shows staff resolution controls for disputed games when isStaff=true", () => {
      render(
        <MatchHeader
          {...defaultProps}
          isStaff={true}
          games={[disputedGame]}
        />
      );
      // The Set button should appear for staff
      expect(screen.getByRole("button", { name: /^Set$/i })).toBeInTheDocument();
    });

    it("does not show staff resolution controls for non-staff", () => {
      render(
        <MatchHeader
          {...defaultProps}
          isStaff={false}
          games={[disputedGame]}
        />
      );
      expect(
        screen.queryByRole("button", { name: /^Set$/i })
      ).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Reset Match button
  // =========================================================================

  describe("Reset Match button (two-click confirmation)", () => {
    it("shows 'Confirm Reset' on second click", async () => {
      const user = userEvent.setup();
      render(<MatchHeader {...defaultProps} isStaff={true} />);

      await user.click(screen.getByRole("button", { name: /Reset Match/i }));

      expect(
        screen.getByRole("button", { name: /Confirm Reset/i })
      ).toBeInTheDocument();
    });

    it("calls resetMatchAction and fires onGameUpdated on confirmed click", async () => {
      const user = userEvent.setup();
      mockResetMatch.mockResolvedValue({ success: true });
      const onGameUpdated = jest.fn();

      render(
        <MatchHeader
          {...defaultProps}
          isStaff={true}
          onGameUpdated={onGameUpdated}
        />
      );

      // First click: enters confirming state
      await user.click(screen.getByRole("button", { name: /Reset Match/i }));
      // Second click: confirms
      await user.click(screen.getByRole("button", { name: /Confirm Reset/i }));

      await waitFor(() => {
        expect(mockResetMatch).toHaveBeenCalledWith(100, 1);
        expect(mockToastSuccess).toHaveBeenCalledWith("Match reset");
        expect(onGameUpdated).toHaveBeenCalled();
      });
    });

    it("shows toast error when resetMatchAction fails", async () => {
      const user = userEvent.setup();
      mockResetMatch.mockResolvedValue({
        success: false,
        error: "Reset failed",
      });

      render(<MatchHeader {...defaultProps} isStaff={true} />);

      await user.click(screen.getByRole("button", { name: /Reset Match/i }));
      await user.click(screen.getByRole("button", { name: /Confirm Reset/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Reset failed");
      });
    });
  });

  // =========================================================================
  // Disputed games section (judge override / game reset)
  // =========================================================================

  describe("disputed games (staff judge actions)", () => {
    const disputedGame = {
      id: 42,
      game_number: 1,
      status: "disputed",
      winner_alt_id: null,
      alt1_selection: 10,
      alt2_selection: 10,
    };

    it("shows disputed alert with game number for staff", () => {
      render(
        <MatchHeader
          {...defaultProps}
          isStaff={true}
          games={[disputedGame]}
        />
      );
      expect(screen.getByText(/Game 1 disputed/)).toBeInTheDocument();
    });

    it("shows winner select dropdown and Set/Reset buttons for staff", () => {
      render(
        <MatchHeader
          {...defaultProps}
          isStaff={true}
          games={[disputedGame]}
        />
      );
      // Winner dropdown option
      expect(screen.getByText("Winner...")).toBeInTheDocument();
      // Set button (disabled until winner selected)
      const setButtons = screen.getAllByRole("button", { name: /Set/i });
      expect(setButtons.length).toBeGreaterThanOrEqual(1);
      // Reset button
      const resetButtons = screen.getAllByRole("button", { name: /Reset/i });
      expect(resetButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("does not show disputed section for non-staff", () => {
      render(
        <MatchHeader
          {...defaultProps}
          isStaff={false}
          games={[disputedGame]}
        />
      );
      // Disputed alert is visible to all but override controls are staff-only
      expect(screen.getByText(/Game 1 disputed/)).toBeInTheDocument();
      expect(screen.queryByText("Winner...")).not.toBeInTheDocument();
    });

    it("shows player names as override options for staff", () => {
      render(
        <MatchHeader
          {...defaultProps}
          isStaff={true}
          games={[disputedGame]}
        />
      );
      // Player names appear in the winner select options
      const options = screen.getAllByRole("option");
      const optionTexts = options.map((o) => o.textContent);
      expect(optionTexts).toContain("ash_ketchum");
      expect(optionTexts).toContain("misty");
    });
  });

  // =========================================================================
  // Self-correct game state
  // =========================================================================

  describe("self-correct game state", () => {
    const selfCorrectGame = {
      id: 55,
      game_number: 2,
      status: "self-correct",
      winner_alt_id: 10,
      alt1_selection: 10,
      alt2_selection: 20,
    };

    it("renders resolved icon for self-correct game (not editing)", () => {
      render(
        <MatchHeader
          {...defaultProps}
          games={[selfCorrectGame]}
        />
      );
      // Self-correct renders as a resolved game with click-to-edit
      // The game number should appear
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});
