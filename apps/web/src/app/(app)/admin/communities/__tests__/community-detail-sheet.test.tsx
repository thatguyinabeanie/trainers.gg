import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRouterRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogAction: ({
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) => (
    <span {...props}>{children}</span>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  AvatarImage: () => null,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@trainers/utils", () => ({
  formatDateTime: (date: string) => `formatted(${date})`,
}));

const mockApproveCommunityAction = jest.fn();
const mockRejectCommunityAction = jest.fn();
const mockSuspendCommunityAction = jest.fn();
const mockUnsuspendCommunityAction = jest.fn();
const mockTransferOwnershipAction = jest.fn();

jest.mock("../actions", () => ({
  approveCommunityAction: (...args: unknown[]) =>
    mockApproveCommunityAction(...args),
  rejectCommunityAction: (...args: unknown[]) =>
    mockRejectCommunityAction(...args),
  suspendCommunityAction: (...args: unknown[]) =>
    mockSuspendCommunityAction(...args),
  unsuspendCommunityAction: (...args: unknown[]) =>
    mockUnsuspendCommunityAction(...args),
  transferOwnershipAction: (...args: unknown[]) =>
    mockTransferOwnershipAction(...args),
}));

import { CommunityDetailSheet } from "../community-detail-sheet";
import type { CommunityRow } from "../columns";

// ── Helpers ────────────────────────────────────────────────────────────────

function buildCommunity(overrides: Partial<CommunityRow> = {}): CommunityRow {
  return {
    id: 1,
    name: "Pallet Town League",
    slug: "pallet-town-league",
    description: "A great community",
    status: "pending",
    tier: "regular",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-15T00:00:00.000Z",
    owner: {
      id: "user-1",
      username: "ash_ketchum",
      first_name: "Ash",
      last_name: "Ketchum",
      image: null,
    },
    community_admin_notes: null,
    ...overrides,
  };
}

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CommunityDetailSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApproveCommunityAction.mockResolvedValue({ success: true });
    mockRejectCommunityAction.mockResolvedValue({ success: true });
    mockSuspendCommunityAction.mockResolvedValue({ success: true });
    mockUnsuspendCommunityAction.mockResolvedValue({ success: true });
    mockTransferOwnershipAction.mockResolvedValue({ success: true });
  });

  describe("when community is null", () => {
    it("renders nothing", () => {
      render(<CommunityDetailSheet {...defaultProps} community={null} />);
      expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
    });
  });

  describe("basic rendering", () => {
    it("shows community name as sheet title", () => {
      render(
        <CommunityDetailSheet {...defaultProps} community={buildCommunity()} />
      );
      expect(screen.getByText("Pallet Town League")).toBeInTheDocument();
    });

    it("shows community slug as sheet description", () => {
      render(
        <CommunityDetailSheet {...defaultProps} community={buildCommunity()} />
      );
      expect(screen.getByText("pallet-town-league")).toBeInTheDocument();
    });

    it("shows status badge", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "active" })}
        />
      );
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows tier badge", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ tier: "verified" })}
        />
      );
      expect(screen.getByText("Verified")).toBeInTheDocument();
    });

    it("shows community description when present", () => {
      render(
        <CommunityDetailSheet {...defaultProps} community={buildCommunity()} />
      );
      expect(screen.getByText("A great community")).toBeInTheDocument();
    });

    it("shows owner username", () => {
      render(
        <CommunityDetailSheet {...defaultProps} community={buildCommunity()} />
      );
      expect(screen.getByText("@ash_ketchum")).toBeInTheDocument();
    });

    it("shows placeholder when owner is null", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ owner: null })}
        />
      );
      expect(screen.getByText("--")).toBeInTheDocument();
    });

    it("shows formatted created_at date", () => {
      render(
        <CommunityDetailSheet {...defaultProps} community={buildCommunity()} />
      );
      expect(
        screen.getByText("formatted(2026-01-01T00:00:00.000Z)")
      ).toBeInTheDocument();
    });

    it("shows admin notes when present", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({
            community_admin_notes: [
              {
                notes: "Reviewed and approved.",
                updated_at: null,
                updated_by: null,
              },
            ],
          })}
        />
      );
      expect(screen.getByText("Reviewed and approved.")).toBeInTheDocument();
    });

    it("shows 'No admin notes' when notes are absent", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ community_admin_notes: null })}
        />
      );
      expect(
        screen.getByText("No admin notes for this community.")
      ).toBeInTheDocument();
    });
  });

  describe("status-dependent action buttons — pending", () => {
    it("shows Approve and Reject buttons", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );
      expect(
        screen.getByRole("button", { name: "Approve Community" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Reject Community" })
      ).toBeInTheDocument();
    });

    it("disables Reject button when reason is empty", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );
      expect(
        screen.getByRole("button", { name: "Reject Community" })
      ).toBeDisabled();
    });

    it("enables Reject button when reason is provided", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );

      await user.type(screen.getByLabelText(/rejection reason/i), "Not ready");
      expect(
        screen.getByRole("button", { name: "Reject Community" })
      ).not.toBeDisabled();
    });
  });

  describe("status-dependent action buttons — active", () => {
    it("shows Suspend button but not Approve/Reject/Unsuspend", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "active" })}
        />
      );
      expect(
        screen.getByRole("button", { name: "Suspend Community" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Approve Community" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Reject Community" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Unsuspend Community" })
      ).not.toBeInTheDocument();
    });

    it("disables Suspend button when reason is empty", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "active" })}
        />
      );
      expect(
        screen.getByRole("button", { name: "Suspend Community" })
      ).toBeDisabled();
    });
  });

  describe("status-dependent action buttons — suspended", () => {
    it("shows Unsuspend button but not Approve/Reject/Suspend", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "suspended" })}
        />
      );
      expect(
        screen.getByRole("button", { name: "Unsuspend Community" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Suspend Community" })
      ).not.toBeInTheDocument();
    });
  });

  describe("transfer ownership — always visible", () => {
    it("shows Transfer Ownership button for pending community", () => {
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );
      expect(
        screen.getByRole("button", { name: "Transfer Ownership" })
      ).toBeInTheDocument();
    });

    it("disables Transfer Ownership when owner ID is empty", () => {
      render(
        <CommunityDetailSheet {...defaultProps} community={buildCommunity()} />
      );
      expect(
        screen.getByRole("button", { name: "Transfer Ownership" })
      ).toBeDisabled();
    });

    it("enables Transfer Ownership when owner ID is provided", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet {...defaultProps} community={buildCommunity()} />
      );

      await user.type(
        screen.getByPlaceholderText(/new owner user id/i),
        "some-uuid"
      );
      expect(
        screen.getByRole("button", { name: "Transfer Ownership" })
      ).not.toBeDisabled();
    });
  });

  describe("confirmation dialog", () => {
    it("opens confirmation dialog when Approve is clicked", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Approve Community" })
      );
      expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Approve Community" })
      ).toBeInTheDocument();
    });

    it("confirmation dialog description mentions community name for approve", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Approve Community" })
      );
      expect(screen.getByTestId("alert-dialog")).toHaveTextContent(
        "Pallet Town League"
      );
    });

    it("calls approveCommunityAction when confirm is clicked", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ id: 7, status: "pending" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Approve Community" })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockApproveCommunityAction).toHaveBeenCalledWith(7);
      });
    });

    it("calls router.refresh() after successful approve", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Approve Community" })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockRouterRefresh).toHaveBeenCalled();
      });
    });

    it("shows success message after approve", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Approve Community" })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(screen.getByText("Community approved")).toBeInTheDocument();
      });
    });

    it("shows error message when approve action fails", async () => {
      mockApproveCommunityAction.mockResolvedValue({
        success: false,
        error: "Database error",
      });

      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "pending" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Approve Community" })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(screen.getByText("Database error")).toBeInTheDocument();
      });
    });

    it("calls unsuspendCommunityAction when Unsuspend is confirmed", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ id: 3, status: "suspended" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Unsuspend Community" })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockUnsuspendCommunityAction).toHaveBeenCalledWith(3);
      });
    });

    it("calls rejectCommunityAction with reason when Reject is confirmed", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ id: 5, status: "pending" })}
        />
      );

      await user.type(
        screen.getByLabelText(/rejection reason/i),
        "Incomplete application"
      );
      await user.click(
        screen.getByRole("button", { name: "Reject Community" })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockRejectCommunityAction).toHaveBeenCalledWith(
          5,
          "Incomplete application"
        );
      });
    });

    it("calls transferOwnershipAction with new owner ID when Transfer is confirmed", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ id: 9, status: "active" })}
        />
      );

      await user.type(
        screen.getByPlaceholderText(/new owner user id/i),
        "new-owner-uuid"
      );
      await user.click(
        screen.getByRole("button", { name: "Transfer Ownership" })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(mockTransferOwnershipAction).toHaveBeenCalledWith(
          9,
          "new-owner-uuid"
        );
      });
    });

    it("shows 'Community suspended' success message after suspend", async () => {
      const user = userEvent.setup();
      render(
        <CommunityDetailSheet
          {...defaultProps}
          community={buildCommunity({ status: "active" })}
        />
      );

      await user.type(
        screen.getByLabelText(/suspension reason/i),
        "Policy violation"
      );
      await user.click(
        screen.getByRole("button", { name: "Suspend Community" })
      );
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => {
        expect(screen.getByText("Community suspended")).toBeInTheDocument();
      });
    });
  });
});
