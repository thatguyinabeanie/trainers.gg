/**
 * Tests for RegisterModal component
 *
 * Covers:
 * - 3a: Polished success state with CTAs and tournament date
 * - 3b: Graceful "tournament full" error state
 * - isCapacityError helper
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterModal, isCapacityError } from "../register-modal";

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock("@/components/auth/auth-provider", () => ({
  useAuthContext: () => ({ isAuthenticated: true }),
}));

// Mock server actions
const mockRegisterForTournament = jest.fn();
const mockGetCurrentUserAltsAction = jest.fn();
const mockGetRegistrationDetailsAction = jest.fn();
const mockUpdateRegistrationAction = jest.fn();

jest.mock("@/actions/tournaments", () => ({
  registerForTournament: (...args: unknown[]) =>
    mockRegisterForTournament(...args),
  getCurrentUserAltsAction: (...args: unknown[]) =>
    mockGetCurrentUserAltsAction(...args),
  getRegistrationDetailsAction: (...args: unknown[]) =>
    mockGetRegistrationDetailsAction(...args),
  updateRegistrationAction: (...args: unknown[]) =>
    mockUpdateRegistrationAction(...args),
}));

// Mock UI components that have complex internals
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="dialog-footer">{children}</div>,
  DialogClose: ({ render }: { render: React.ReactNode }) => <>{render}</>,
}));

jest.mock("@/components/ui/radio-group", () => ({
  RadioGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  RadioGroupItem: ({ value, id }: { value: string; id: string }) => (
    <input type="radio" value={value} id={id} readOnly />
  ),
}));

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

// --------------------------------------------------------------------------
// Shared props
// --------------------------------------------------------------------------

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  tournamentId: 42,
  tournamentSlug: "spring-classic-2026",
  tournamentName: "Spring Classic 2026",
  isFull: false,
};

const mockAlt = {
  id: 1,
  username: "ash_ketchum",
  display_name: "Ash Ketchum",
  avatar_url: null,
  first_name: "Ash",
  last_name: "Ketchum",
  country: "US",
};

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("RegisterModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: return one alt so the form renders
    mockGetCurrentUserAltsAction.mockResolvedValue({
      success: true,
      data: [mockAlt],
    });
  });

  // ========================================================================
  // 3a: Polished success state
  // ========================================================================

  describe("polished success state", () => {
    it("shows success state with larger checkmark and bold title after registration", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: true,
        data: { registrationId: 100, status: "registered" },
      });

      render(<RegisterModal {...defaultProps} />);

      // Wait for alts to load and form to render
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      // Submit the form
      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      // Verify success state renders
      await waitFor(() => {
        expect(
          screen.getByTestId("registration-success-state")
        ).toBeInTheDocument();
      });

      // Verify title text
      expect(screen.getByText("You're Registered!")).toBeInTheDocument();
    });

    it("shows tournament date/time in success view when startDate is provided", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: true,
        data: { registrationId: 100, status: "registered" },
      });

      render(
        <RegisterModal {...defaultProps} startDate="2026-03-15T14:00:00Z" />
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("registration-success-state")
        ).toBeInTheDocument();
      });

      // Should display formatted date (check for month + day combination)
      expect(screen.getByText(/march.*15.*2026/i)).toBeInTheDocument();
    });

    it("does not show tournament date when startDate is not provided", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: true,
        data: { registrationId: 100, status: "registered" },
      });

      render(<RegisterModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("registration-success-state")
        ).toBeInTheDocument();
      });

      // Should NOT display any date-related info
      expect(screen.queryByText(/march/i)).not.toBeInTheDocument();
    });

    it("shows 'Submit Your Team' and 'Go to Tournament' CTAs for registered status", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: true,
        data: { registrationId: 100, status: "registered" },
      });

      render(<RegisterModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /submit your team/i })
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /go to tournament/i })
      ).toBeInTheDocument();
    });

    it("navigates to team section when 'Submit Your Team' is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      mockRegisterForTournament.mockResolvedValue({
        success: true,
        data: { registrationId: 100, status: "registered" },
      });

      render(<RegisterModal {...defaultProps} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /submit your team/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /submit your team/i })
      );

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockPush).toHaveBeenCalledWith(
        "/tournaments/spring-classic-2026#team"
      );
    });

    it("shows waitlist confirmation with amber styling for waitlist status", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: true,
        data: { registrationId: 100, status: "waitlist" },
      });

      render(<RegisterModal {...defaultProps} isFull />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /join waitlist/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /join waitlist/i }));

      await waitFor(() => {
        expect(screen.getByText("Added to Waitlist")).toBeInTheDocument();
      });

      // Should show "Close" button, NOT "Submit Your Team"
      expect(
        screen.getByRole("button", { name: /close/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /submit your team/i })
      ).not.toBeInTheDocument();
    });

    it("shows next steps for registered status", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: true,
        data: { registrationId: 100, status: "registered" },
      });

      render(<RegisterModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(screen.getByText("Next Steps")).toBeInTheDocument();
      });

      // Verify registered next steps (text appears in both CTA buttons and list items)
      expect(
        screen.getByText(/before the tournament starts/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/when check-in opens/i)).toBeInTheDocument();
    });

    it("shows waitlist next steps for waitlist status", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: true,
        data: { registrationId: 100, status: "waitlist" },
      });

      render(<RegisterModal {...defaultProps} isFull />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /join waitlist/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /join waitlist/i }));

      await waitFor(() => {
        expect(screen.getByText("Next Steps")).toBeInTheDocument();
      });

      // Verify waitlist next steps
      expect(
        screen.getByText(/automatically registered if a spot opens/i)
      ).toBeInTheDocument();
    });
  });

  // ========================================================================
  // 3b: Graceful "tournament full" error
  // ========================================================================

  describe("tournament full error state", () => {
    it("shows dedicated tournament full state on capacity error", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: false,
        error: "Tournament is full",
      });

      render(<RegisterModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId("tournament-full-state")).toBeInTheDocument();
      });

      expect(screen.getByText("This tournament is full")).toBeInTheDocument();
      expect(
        screen.getByText(/all spots have been filled/i)
      ).toBeInTheDocument();
    });

    it.each([
      "Tournament is full",
      "No remaining spots available",
      "Maximum participants capacity reached",
      "No spots left",
    ])("detects capacity error for message: %s", async (errorMessage) => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      render(<RegisterModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId("tournament-full-state")).toBeInTheDocument();
      });
    });

    it("shows generic error for non-capacity errors", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: false,
        error: "Database connection failed",
      });

      render(<RegisterModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText("Database connection failed")
        ).toBeInTheDocument();
      });

      // Should NOT show tournament full state
      expect(
        screen.queryByTestId("tournament-full-state")
      ).not.toBeInTheDocument();
    });

    it("shows Close button in tournament full state", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: false,
        error: "Tournament is full",
      });

      render(<RegisterModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId("tournament-full-state")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /close/i })
      ).toBeInTheDocument();
    });

    it("resets tournament full state when dialog closes and reopens", async () => {
      const user = userEvent.setup();
      mockRegisterForTournament.mockResolvedValue({
        success: false,
        error: "Tournament is full",
      });

      const { rerender } = render(<RegisterModal {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm registration/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /confirm registration/i })
      );

      await waitFor(() => {
        expect(screen.getByTestId("tournament-full-state")).toBeInTheDocument();
      });

      // Close dialog
      rerender(<RegisterModal {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<RegisterModal {...defaultProps} open={true} />);

      // Should NOT show tournament full state anymore
      expect(
        screen.queryByTestId("tournament-full-state")
      ).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // isCapacityError helper
  // ========================================================================

  describe("isCapacityError", () => {
    it.each([
      ["Tournament is full", true],
      ["tournament full", true],
      ["No spots available", true],
      ["Maximum participants reached", true],
      ["Capacity exceeded", true],
      ["no remaining spots", true],
      ["Database error", false],
      ["Not authenticated", false],
      ["Already registered for this tournament", false],
      ["Tournament not found", false],
      ["", false],
    ])("returns %s for error message: %s", (errorMessage, expected) => {
      expect(isCapacityError(errorMessage)).toBe(expected);
    });
  });
});
