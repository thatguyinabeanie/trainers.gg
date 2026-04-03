/**
 * Tests for MatchReportDialog component
 * Covers: loading state, closed state, active match form, completed match view,
 * pending match alert, score inputs, winner auto-selection, form submission, error handling.
 */

import type React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchReportDialog } from "../match-report-dialog";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockMutateAsync = jest.fn();
let mockMatchDetails: unknown = null;

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(() => ({ data: mockMatchDetails })),
  useSupabaseMutation: jest.fn(() => ({ mutateAsync: mockMutateAsync })),
}));

jest.mock("@trainers/supabase", () => ({
  getMatchDetails: jest.fn(),
  reportMatchResult: jest.fn(),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/alert", () => ({
  Alert: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div role="alert" className={className}>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    variant,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
    disabled?: boolean;
  }) => (
    <div data-testid="radio-group" data-value={value}>
      {children}
    </div>
  ),
  RadioGroupItem: ({
    value,
    id,
  }: {
    value: string;
    id?: string;
  }) => <input type="radio" value={value} id={id} data-testid={`radio-${value}`} />,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildMatchDetails(overrides: Record<string, unknown> = {}) {
  return {
    match: {
      id: 1,
      status: "active",
      table_number: 3,
      winner_alt_id: null,
      game_wins1: null,
      game_wins2: null,
      ...((overrides.match as Record<string, unknown>) ?? {}),
    },
    round: { id: 10, name: "Round 1" },
    tournament: { id: 100, name: "Spring Open" },
    player1: {
      id: 1,
      username: "ash_ketchum",
      avatar_url: null,
    },
    player2: {
      id: 2,
      username: "brock_rock",
      avatar_url: null,
    },
    ...overrides,
  };
}

const defaultProps = {
  matchId: 1,
  open: true,
  onOpenChange: jest.fn(),
  onReportSubmitted: jest.fn(),
};

function renderDialog(props = defaultProps) {
  return render(<MatchReportDialog {...props} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("MatchReportDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchDetails = null;
    mockMutateAsync.mockResolvedValue(undefined);
  });

  describe("closed state", () => {
    it("renders nothing when open is false", () => {
      renderDialog({ ...defaultProps, open: false });
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("renders loading spinner when matchDetails is null", () => {
      mockMatchDetails = null;
      renderDialog();
      // Dialog is open but no match details — shows spinner
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      // The content area is the loading view — no player names shown
      expect(screen.queryByText("ash_ketchum")).not.toBeInTheDocument();
    });
  });

  describe("active match", () => {
    beforeEach(() => {
      mockMatchDetails = buildMatchDetails();
    });

    it("renders dialog title for active match", () => {
      renderDialog();
      expect(screen.getByText("Report Match Result")).toBeInTheDocument();
    });

    it("shows tournament and round in description", () => {
      renderDialog();
      expect(screen.getByText(/Spring Open/)).toBeInTheDocument();
      expect(screen.getByText(/Round 1/)).toBeInTheDocument();
    });

    it("shows table number in description", () => {
      renderDialog();
      expect(screen.getByText(/Table 3/)).toBeInTheDocument();
    });

    it("displays both player usernames", () => {
      renderDialog();
      expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
      expect(screen.getByText("brock_rock")).toBeInTheDocument();
    });

    it("shows Player 1 and Player 2 labels", () => {
      renderDialog();
      expect(screen.getByText("Player 1")).toBeInTheDocument();
      expect(screen.getByText("Player 2")).toBeInTheDocument();
    });

    it("renders score inputs for active match", () => {
      renderDialog();
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    it("shows Report Result submit button", () => {
      renderDialog();
      expect(
        screen.getByRole("button", { name: /report result/i })
      ).toBeInTheDocument();
    });

    it("shows Cancel button", () => {
      renderDialog();
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it("Cancel button calls onOpenChange(false)", async () => {
      const user = userEvent.setup();
      renderDialog();
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("does not show completed-match alert for active match", () => {
      renderDialog();
      expect(
        screen.queryByText("This match has already been reported")
      ).not.toBeInTheDocument();
    });

    it("does not show pending-match alert for active match", () => {
      renderDialog();
      expect(
        screen.queryByText(
          "This match will become active once the round starts"
        )
      ).not.toBeInTheDocument();
    });
  });

  describe("completed match", () => {
    beforeEach(() => {
      mockMatchDetails = buildMatchDetails({
        match: {
          id: 1,
          status: "completed",
          table_number: 3,
          winner_alt_id: 1,
          game_wins1: 2,
          game_wins2: 0,
        },
      });
    });

    it("shows Match Result title for completed match", () => {
      renderDialog();
      expect(screen.getByText("Match Result")).toBeInTheDocument();
    });

    it("shows already-reported alert", () => {
      renderDialog();
      expect(
        screen.getByText("This match has already been reported")
      ).toBeInTheDocument();
    });

    it("shows Close button instead of Cancel for completed match", () => {
      renderDialog();
      expect(
        screen.getByRole("button", { name: /close/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /cancel/i })
      ).not.toBeInTheDocument();
    });

    it("does not show Report Result button for completed match", () => {
      renderDialog();
      expect(
        screen.queryByRole("button", { name: /report result/i })
      ).not.toBeInTheDocument();
    });

    it("displays final game scores", () => {
      renderDialog();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("shows Winner badge on winning player", () => {
      renderDialog();
      const badges = screen.getAllByTestId("badge");
      const winnerBadge = badges.find((b) => b.textContent?.includes("Winner"));
      expect(winnerBadge).toBeDefined();
    });
  });

  describe("pending match", () => {
    beforeEach(() => {
      mockMatchDetails = buildMatchDetails({
        match: {
          id: 1,
          status: "pending",
          table_number: null,
          winner_alt_id: null,
          game_wins1: null,
          game_wins2: null,
        },
      });
    });

    it("shows pending-round alert", () => {
      renderDialog();
      expect(
        screen.getByText(
          "This match will become active once the round starts"
        )
      ).toBeInTheDocument();
    });

    it("score inputs are disabled for pending match", () => {
      renderDialog();
      const inputs = screen.getAllByRole("spinbutton");
      // All score inputs should be disabled (match is not active)
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe("match without table number", () => {
    it("omits table number from description when null", () => {
      mockMatchDetails = buildMatchDetails({
        match: {
          id: 1,
          status: "active",
          table_number: null,
          winner_alt_id: null,
          game_wins1: null,
          game_wins2: null,
        },
      });
      renderDialog();
      expect(screen.queryByText(/Table/)).not.toBeInTheDocument();
    });
  });

  describe("null matchId", () => {
    it("renders loading view when matchId is null", () => {
      renderDialog({ ...defaultProps, matchId: null });
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    beforeEach(() => {
      mockMatchDetails = buildMatchDetails();
    });

    it("calls mutateAsync with correct args on submit", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");

      renderDialog();

      // Default values are player1Score=2, player2Score=0 → player1 wins
      // The form auto-selects winner from scores via useEffect
      // Submit the form
      const submitButton = screen.getByRole("button", {
        name: /report result/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          matchId: 1,
          winnerId: expect.any(Number),
          player1Score: 2,
          player2Score: 0,
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Match reported",
          expect.objectContaining({
            description: "The match result has been recorded",
          })
        );
      });
    });

    it("calls onReportSubmitted after successful submission", async () => {
      const user = userEvent.setup();
      renderDialog();

      const submitButton = screen.getByRole("button", {
        name: /report result/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onReportSubmitted).toHaveBeenCalled();
      });
    });

    it("calls onOpenChange(false) after successful submission", async () => {
      const user = userEvent.setup();
      renderDialog();

      const submitButton = screen.getByRole("button", {
        name: /report result/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows toast error when mutation throws", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      mockMutateAsync.mockRejectedValue(new Error("Network failure"));

      renderDialog();

      const submitButton = screen.getByRole("button", {
        name: /report result/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to report match",
          expect.objectContaining({ description: "Network failure" })
        );
      });
    });

    it("shows unknown error message when mutation throws non-Error", async () => {
      const user = userEvent.setup();
      const { toast } = await import("sonner");
      mockMutateAsync.mockRejectedValue("raw string error");

      renderDialog();

      const submitButton = screen.getByRole("button", {
        name: /report result/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to report match",
          expect.objectContaining({ description: "Unknown error" })
        );
      });
    });
  });

  describe("tournament/round display edge cases", () => {
    it("falls back to 'Tournament' label when tournament name is missing", () => {
      mockMatchDetails = buildMatchDetails({ tournament: null });
      renderDialog();
      expect(screen.getByText(/Tournament/)).toBeInTheDocument();
    });

    it("falls back to 'Round' label when round is missing", () => {
      mockMatchDetails = buildMatchDetails({ round: null });
      renderDialog();
      expect(screen.getByText(/Round/)).toBeInTheDocument();
    });
  });

  describe("player array shape", () => {
    it("handles player data provided as arrays (Supabase join shape)", () => {
      mockMatchDetails = buildMatchDetails({
        player1: [{ id: 1, username: "ash_ketchum", avatar_url: null }],
        player2: [{ id: 2, username: "brock_rock", avatar_url: null }],
      });
      renderDialog();
      expect(screen.getByText("ash_ketchum")).toBeInTheDocument();
      expect(screen.getByText("brock_rock")).toBeInTheDocument();
    });
  });

  describe("BYE match (null player2)", () => {
    it("shows BYE fallback when player2 is null", () => {
      mockMatchDetails = buildMatchDetails({ player2: null });
      renderDialog();
      const byeTexts = screen.getAllByText("BYE");
      expect(byeTexts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
