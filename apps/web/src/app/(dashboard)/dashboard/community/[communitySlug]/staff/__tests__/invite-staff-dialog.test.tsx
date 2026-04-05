import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- @/components/ui/dialog ---
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
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
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// --- @/components/ui/button ---
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    onClick,
    variant: _variant,
    size: _size,
    className: _className,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button type={type ?? "button"} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

// --- @/components/ui/input ---
jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

// --- @/components/ui/label ---
jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

// --- @/components/ui/avatar ---
jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

// --- @/components/ui/form ---
jest.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: ({
    render: renderProp,
    control: _control,
    name: _name,
  }: {
    render: (props: { field: object }) => React.ReactNode;
    control: unknown;
    name: string;
  }) => <div>{renderProp({ field: {} })}</div>,
  FormItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormLabel: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
  FormMessage: () => <span />,
}));

// --- server actions ---
const mockSearchUsersForStaffInvite = jest.fn();
const mockInviteStaffMember = jest.fn();
jest.mock("@/actions/staff", () => ({
  searchUsersForStaffInvite: (...args: unknown[]) =>
    mockSearchUsersForStaffInvite(...args),
  inviteStaffMember: (...args: unknown[]) => mockInviteStaffMember(...args),
}));

// --- sonner ---
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="icon-loader" className={className} />
  ),
  Search: () => <svg data-testid="icon-search" />,
  UserPlus: () => <svg data-testid="icon-user-plus" />,
}));

import React from "react";
import { InviteStaffDialog } from "../invite-staff-dialog";

// =============================================================================
// Helpers
// =============================================================================

const baseProps = {
  open: true,
  onOpenChange: jest.fn(),
  communityId: 10,
  communitySlug: "pallet-town",
  onSuccess: jest.fn(),
};

function makeSearchResult(
  overrides: Partial<{
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
  }> = {}
) {
  return {
    id: "user-1",
    username: "ash_ketchum",
    first_name: "Ash",
    last_name: "Ketchum",
    image: null,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("InviteStaffDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering when closed
  // ---------------------------------------------------------------------------

  it("does not render dialog content when open=false", () => {
    render(<InviteStaffDialog {...baseProps} open={false} />);
    expect(screen.queryByText("Add Staff Member")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Initial open state
  // ---------------------------------------------------------------------------

  it("renders dialog title when open", () => {
    render(<InviteStaffDialog {...baseProps} />);
    expect(screen.getByText("Add Staff Member")).toBeInTheDocument();
  });

  it("renders search input when no user selected", () => {
    render(<InviteStaffDialog {...baseProps} />);
    expect(
      screen.getByPlaceholderText("Search by username...")
    ).toBeInTheDocument();
  });

  it("renders Add Staff submit button (disabled initially)", () => {
    render(<InviteStaffDialog {...baseProps} />);
    const btn = screen.getByRole("button", { name: /add staff/i });
    expect(btn).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Search functionality
  // ---------------------------------------------------------------------------

  describe("search", () => {
    it("does not trigger search when fewer than 2 chars typed", async () => {
      const user = userEvent.setup();
      render(<InviteStaffDialog {...baseProps} />);

      await user.type(
        screen.getByPlaceholderText("Search by username..."),
        "a"
      );
      // Search should not be called for a single character
      expect(mockSearchUsersForStaffInvite).not.toHaveBeenCalled();
    });

    it("shows 'No users found' message when search returns empty results", async () => {
      jest.useFakeTimers({ advanceTimers: true });
      mockSearchUsersForStaffInvite.mockResolvedValue({
        success: true,
        data: [],
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<InviteStaffDialog {...baseProps} />);

      await user.type(
        screen.getByPlaceholderText("Search by username..."),
        "zzz"
      );
      jest.advanceTimersByTime(400);

      await waitFor(() => {
        expect(
          screen.getByText(/no users found matching/i)
        ).toBeInTheDocument();
      });
      jest.useRealTimers();
    });

    it("shows search results when search returns data", async () => {
      jest.useFakeTimers({ advanceTimers: true });
      mockSearchUsersForStaffInvite.mockResolvedValue({
        success: true,
        data: [makeSearchResult()],
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<InviteStaffDialog {...baseProps} />);

      await user.type(
        screen.getByPlaceholderText("Search by username..."),
        "ash"
      );
      jest.advanceTimersByTime(400);

      await waitFor(() => {
        expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
      });
      jest.useRealTimers();
    });

    it("shows error toast when search action fails", async () => {
      const { toast } = await import("sonner");
      jest.useFakeTimers({ advanceTimers: true });
      mockSearchUsersForStaffInvite.mockResolvedValue({
        success: false,
        error: "Search failed",
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<InviteStaffDialog {...baseProps} />);

      await user.type(
        screen.getByPlaceholderText("Search by username..."),
        "ash"
      );
      jest.advanceTimersByTime(400);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Search failed");
      });
      jest.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // User selection
  // ---------------------------------------------------------------------------

  describe("user selection", () => {
    async function renderWithResult() {
      jest.useFakeTimers({ advanceTimers: true });
      mockSearchUsersForStaffInvite.mockResolvedValue({
        success: true,
        data: [makeSearchResult()],
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<InviteStaffDialog {...baseProps} />);

      await user.type(
        screen.getByPlaceholderText("Search by username..."),
        "ash"
      );
      jest.advanceTimersByTime(400);
      await waitFor(() => screen.getByText("Ash Ketchum"));

      await user.click(screen.getByText("Ash Ketchum"));
      jest.useRealTimers();
      return user;
    }

    it("shows selected user display after selection", async () => {
      await renderWithResult();
      expect(screen.getByText("Selected User")).toBeInTheDocument();
    });

    it("enables Add Staff button after user selected", async () => {
      await renderWithResult();
      const btn = screen.getByRole("button", { name: /add staff/i });
      expect(btn).not.toBeDisabled();
    });

    it("shows Change button to clear selection", async () => {
      await renderWithResult();
      expect(
        screen.getByRole("button", { name: /change/i })
      ).toBeInTheDocument();
    });

    it("clears selection when Change button is clicked", async () => {
      const user = await renderWithResult();
      await user.click(screen.getByRole("button", { name: /change/i }));
      expect(
        screen.getByPlaceholderText("Search by username...")
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------------------------

  describe("form submission", () => {
    async function setupSelectedUser() {
      jest.useFakeTimers({ advanceTimers: true });
      mockSearchUsersForStaffInvite.mockResolvedValue({
        success: true,
        data: [makeSearchResult()],
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<InviteStaffDialog {...baseProps} />);

      await user.type(
        screen.getByPlaceholderText("Search by username..."),
        "ash"
      );
      jest.advanceTimersByTime(400);
      await waitFor(() => screen.getByText("Ash Ketchum"));
      await user.click(screen.getByText("Ash Ketchum"));
      jest.useRealTimers();
      return user;
    }

    it("calls inviteStaffMember with correct args on submit", async () => {
      mockInviteStaffMember.mockResolvedValue({ success: true });
      const user = await setupSelectedUser();

      await user.click(screen.getByRole("button", { name: /add staff/i }));

      await waitFor(() => {
        expect(mockInviteStaffMember).toHaveBeenCalledWith(
          10,
          "user-1",
          "pallet-town"
        );
      });
    });

    it("shows success toast and calls onSuccess on successful invite", async () => {
      const { toast } = await import("sonner");
      mockInviteStaffMember.mockResolvedValue({ success: true });
      const user = await setupSelectedUser();

      await user.click(screen.getByRole("button", { name: /add staff/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining("Ash Ketchum")
        );
        expect(baseProps.onSuccess).toHaveBeenCalled();
        expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows error toast when inviteStaffMember fails", async () => {
      const { toast } = await import("sonner");
      mockInviteStaffMember.mockResolvedValue({
        success: false,
        error: "User already a member",
      });
      const user = await setupSelectedUser();

      await user.click(screen.getByRole("button", { name: /add staff/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("User already a member");
      });
    });

    it("shows unexpected error toast when inviteStaffMember throws", async () => {
      const { toast } = await import("sonner");
      mockInviteStaffMember.mockRejectedValue(new Error("Network error"));
      const user = await setupSelectedUser();

      await user.click(screen.getByRole("button", { name: /add staff/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "An unexpected error occurred"
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Display name / initials edge cases
  // ---------------------------------------------------------------------------

  describe("display name and initials", () => {
    it("shows username-only result display name", async () => {
      jest.useFakeTimers({ advanceTimers: true });
      mockSearchUsersForStaffInvite.mockResolvedValue({
        success: true,
        data: [makeSearchResult({ first_name: null, last_name: null })],
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<InviteStaffDialog {...baseProps} />);

      await user.type(
        screen.getByPlaceholderText("Search by username..."),
        "as"
      );
      jest.advanceTimersByTime(400);
      await waitFor(() => screen.getByText("ash_ketchum"));
      jest.useRealTimers();
    });

    it("shows first-name-only display name when last_name is null", async () => {
      jest.useFakeTimers({ advanceTimers: true });
      mockSearchUsersForStaffInvite.mockResolvedValue({
        success: true,
        data: [makeSearchResult({ last_name: null })],
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<InviteStaffDialog {...baseProps} />);

      await user.type(
        screen.getByPlaceholderText("Search by username..."),
        "as"
      );
      jest.advanceTimersByTime(400);
      await waitFor(() => screen.getByText("Ash"));
      jest.useRealTimers();
    });
  });
});
