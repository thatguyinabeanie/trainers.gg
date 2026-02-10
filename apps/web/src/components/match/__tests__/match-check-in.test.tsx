import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchCheckIn } from "../match-check-in";

// Mock the server action
const mockConfirmMatchCheckInAction = jest.fn();
jest.mock("@/actions/matches", () => ({
  confirmMatchCheckInAction: (...args: unknown[]) =>
    mockConfirmMatchCheckInAction(...args),
}));

// Mock sonner toast
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const defaultProps = {
  matchId: 1,
  tournamentId: 10,
  isParticipant: true,
  isPlayer1: true,
  player1CheckedIn: false,
  player2CheckedIn: false,
  myName: "ash_ketchum",
  opponentName: "misty",
  onCheckInComplete: jest.fn(),
};

describe("MatchCheckIn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Participant view — not checked in
  // ===========================================================================

  describe("participant not checked in", () => {
    it("renders the Ready button", () => {
      render(<MatchCheckIn {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /ready/i })
      ).toBeInTheDocument();
    });

    it("shows both player names", () => {
      render(<MatchCheckIn {...defaultProps} />);

      expect(screen.getByText(/ash_ketchum/)).toBeInTheDocument();
      expect(screen.getByText(/misty/)).toBeInTheDocument();
    });

    it("shows (you) indicator for the current player", () => {
      render(<MatchCheckIn {...defaultProps} />);

      expect(screen.getByText(/\(you\)/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Participant view — already checked in, waiting for opponent
  // ===========================================================================

  describe("participant checked in, waiting for opponent", () => {
    it("shows waiting message instead of Ready button", () => {
      render(<MatchCheckIn {...defaultProps} player1CheckedIn={true} />);

      expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /ready/i })
      ).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Participant view — player2 perspective
  // ===========================================================================

  describe("player2 perspective", () => {
    it("uses player2 check-in status as own status", () => {
      render(
        <MatchCheckIn
          {...defaultProps}
          isPlayer1={false}
          player2CheckedIn={true}
        />
      );

      // Player2 has checked in, so should show waiting
      expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument();
    });

    it("shows Ready button when player2 has not checked in", () => {
      render(
        <MatchCheckIn
          {...defaultProps}
          isPlayer1={false}
          player1CheckedIn={true}
          player2CheckedIn={false}
        />
      );

      expect(
        screen.getByRole("button", { name: /ready/i })
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Both checked in — renders nothing
  // ===========================================================================

  describe("both players checked in", () => {
    it("renders nothing when both are checked in", () => {
      const { container } = render(
        <MatchCheckIn
          {...defaultProps}
          player1CheckedIn={true}
          player2CheckedIn={true}
        />
      );

      expect(container.innerHTML).toBe("");
    });
  });

  // ===========================================================================
  // Staff (non-participant) view
  // ===========================================================================

  describe("staff view", () => {
    it("shows status for both players without a Ready button", () => {
      render(<MatchCheckIn {...defaultProps} isParticipant={false} />);

      expect(screen.getByText(/ash_ketchum/)).toBeInTheDocument();
      expect(screen.getByText(/misty/)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /ready/i })
      ).not.toBeInTheDocument();
    });

    it("does not show (you) indicator for staff", () => {
      render(<MatchCheckIn {...defaultProps} isParticipant={false} />);

      expect(screen.queryByText(/\(you\)/)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Check-in interaction
  // ===========================================================================

  describe("check-in button click", () => {
    it("calls confirmMatchCheckInAction with correct args on click", async () => {
      const user = userEvent.setup();
      mockConfirmMatchCheckInAction.mockResolvedValue({
        success: true,
        data: { matchActivated: false },
      });

      render(<MatchCheckIn {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /ready/i }));

      expect(mockConfirmMatchCheckInAction).toHaveBeenCalledWith(1, 10);
    });

    it("calls onCheckInComplete on success", async () => {
      const user = userEvent.setup();
      const onCheckInComplete = jest.fn();
      mockConfirmMatchCheckInAction.mockResolvedValue({
        success: true,
        data: { matchActivated: true },
      });

      render(
        <MatchCheckIn {...defaultProps} onCheckInComplete={onCheckInComplete} />
      );

      await user.click(screen.getByRole("button", { name: /ready/i }));

      await waitFor(() => {
        expect(onCheckInComplete).toHaveBeenCalledWith(true);
      });
    });

    it("shows toast on error", async () => {
      const user = userEvent.setup();
      mockConfirmMatchCheckInAction.mockResolvedValue({
        success: false,
        error: "Something went wrong",
      });

      render(<MatchCheckIn {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /ready/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
      });
    });

    it("does not call onCheckInComplete on error", async () => {
      const user = userEvent.setup();
      const onCheckInComplete = jest.fn();
      mockConfirmMatchCheckInAction.mockResolvedValue({
        success: false,
        error: "Failed",
      });

      render(
        <MatchCheckIn {...defaultProps} onCheckInComplete={onCheckInComplete} />
      );

      await user.click(screen.getByRole("button", { name: /ready/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
      expect(onCheckInComplete).not.toHaveBeenCalled();
    });

    it("disables button while check-in is pending", async () => {
      const user = userEvent.setup();
      // Never resolve — keeps the pending state
      mockConfirmMatchCheckInAction.mockReturnValue(new Promise(() => {}));

      render(<MatchCheckIn {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /ready/i }));

      // Button should be disabled during the pending state
      await waitFor(() => {
        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
      });
    });
  });
});
