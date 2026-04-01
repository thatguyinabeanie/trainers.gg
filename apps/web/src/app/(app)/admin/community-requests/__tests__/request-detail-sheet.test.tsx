import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock shadcn/ui components that use portals/radix internals
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
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
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
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

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
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

jest.mock("@/components/communities/social-link-icons", () => ({
  PlatformIcon: () => null,
  SOCIAL_PLATFORM_LABELS: {},
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockGrantAction = jest.fn();
const mockRejectAction = jest.fn();
jest.mock("../actions", () => ({
  grantCommunityRequestAction: (...args: unknown[]) => mockGrantAction(...args),
  rejectCommunityRequestAction: (...args: unknown[]) =>
    mockRejectAction(...args),
}));

import { RequestDetailSheet } from "../request-detail-sheet";
import type { CommunityRequestRow } from "../columns";
import { toast } from "sonner";

function buildRequest(
  overrides: Partial<CommunityRequestRow> = {}
): CommunityRequestRow {
  return {
    id: 1,
    name: "Pallet Town League",
    slug: "pallet-town-league",
    description: "A competitive league",
    discord_invite_url: "https://discord.gg/test",
    social_links: null,
    status: "pending",
    admin_notes: null,
    reviewed_at: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    requester: {
      id: "user-1",
      username: "ash_ketchum",
      first_name: "Ash",
      last_name: "Ketchum",
      image: null,
      email: "ash@trainers.local",
    },
    ...overrides,
  };
}

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  onActionComplete: jest.fn(),
};

describe("RequestDetailSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGrantAction.mockResolvedValue({ success: true });
    mockRejectAction.mockResolvedValue({ success: true });
  });

  describe("pending requests", () => {
    it("shows both Approve and Reject buttons", () => {
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({ status: "pending" })}
        />
      );

      expect(
        screen.getByRole("button", { name: /approve request/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reject request/i })
      ).toBeInTheDocument();
    });

    it("disables Reject button when reason is empty", () => {
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({ status: "pending" })}
        />
      );

      expect(
        screen.getByRole("button", { name: /reject request/i })
      ).toBeDisabled();
    });
  });

  describe("rejected requests", () => {
    it("shows Approve button but not Reject button", () => {
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({
            status: "rejected",
            admin_notes: "Not ready yet",
          })}
        />
      );

      expect(
        screen.getByRole("button", { name: /approve request/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /reject request/i })
      ).not.toBeInTheDocument();
    });

    it("shows original rejection reason in confirmation dialog", async () => {
      const user = userEvent.setup();
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({
            status: "rejected",
            admin_notes: "Incomplete application materials",
          })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: /approve request/i })
      );

      const dialog = screen.getByTestId("alert-dialog");
      expect(dialog).toHaveTextContent("Incomplete application materials");
      expect(dialog).toHaveTextContent("Original rejection reason");
    });

    it("shows optional reason textarea in confirmation dialog", async () => {
      const user = userEvent.setup();
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({ status: "rejected" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: /approve request/i })
      );

      expect(screen.getByLabelText("Reason (optional)")).toBeInTheDocument();
    });

    it("calls grantCommunityRequestAction with reason when approving", async () => {
      const user = userEvent.setup();
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({
            id: 42,
            status: "rejected",
            admin_notes: "Old reason",
          })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: /approve request/i })
      );
      await user.type(
        screen.getByLabelText("Reason (optional)"),
        "Community provided additional context"
      );
      await user.click(screen.getByRole("button", { name: /^approve$/i }));

      await waitFor(() => {
        expect(mockGrantAction).toHaveBeenCalledWith(
          42,
          "Community provided additional context"
        );
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Request approved — community created"
      );
    });

    it("calls grantCommunityRequestAction without reason when left empty", async () => {
      const user = userEvent.setup();
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({ id: 42, status: "rejected" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: /approve request/i })
      );
      await user.click(screen.getByRole("button", { name: /^approve$/i }));

      await waitFor(() => {
        expect(mockGrantAction).toHaveBeenCalledWith(42, undefined);
      });
    });
  });

  describe("approved requests", () => {
    it("does not show any action buttons", () => {
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({ status: "approved" })}
        />
      );

      expect(
        screen.queryByRole("button", { name: /approve request/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /reject request/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("shows toast error when action fails", async () => {
      mockGrantAction.mockResolvedValue({
        success: false,
        error: "Slug is already taken",
      });

      const user = userEvent.setup();
      render(
        <RequestDetailSheet
          {...defaultProps}
          request={buildRequest({ status: "rejected" })}
        />
      );

      await user.click(
        screen.getByRole("button", { name: /approve request/i })
      );
      await user.click(screen.getByRole("button", { name: /^approve$/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Slug is already taken");
      });
    });
  });
});
