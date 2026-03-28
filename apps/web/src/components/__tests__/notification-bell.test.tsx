import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import {
  acceptCommunityInvitation,
  declineCommunityInvitation,
} from "@trainers/supabase";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notifications";
import { NotificationBell } from "../notification-bell";

// ── Supabase channel mock (supports .on().subscribe() chain) ──────────────
const mockRemoveChannel = jest.fn();
const mockSubscribe = jest.fn();
const mockOn = jest.fn();
const mockChannel = jest.fn();

// channelObj is self-referential: .on() and .subscribe() both return it (Supabase API)
const channelObj = { on: mockOn, subscribe: mockSubscribe };
mockOn.mockReturnValue(channelObj);
mockSubscribe.mockReturnValue(channelObj); // channel.subscribe() returns the channel itself
mockChannel.mockReturnValue(channelObj);

const mockSupabaseClient = {
  channel: mockChannel,
  removeChannel: mockRemoveChannel,
};

// ── useSupabaseQuery mock ─────────────────────────────────────────────────
const mockUseSupabaseQuery = jest.fn();

jest.mock("@/lib/supabase", () => ({
  useSupabase: () => mockSupabaseClient,
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

// ── next/navigation ───────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── next/link ─────────────────────────────────────────────────────────────
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

// ── Server actions ────────────────────────────────────────────────────────
jest.mock("@/actions/notifications", () => ({
  markNotificationReadAction: jest.fn(),
  markAllNotificationsReadAction: jest.fn(),
}));

// ── @trainers/supabase ────────────────────────────────────────────────────
jest.mock("@trainers/supabase", () => ({
  getNotifications: jest.fn(),
  getUnreadNotificationCount: jest.fn(),
  getMyCommunityInvitations: jest.fn(),
  acceptCommunityInvitation: jest.fn(),
  declineCommunityInvitation: jest.fn(),
}));

// ── sonner ────────────────────────────────────────────────────────────────
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// ── @trainers/utils ───────────────────────────────────────────────────────
jest.mock("@trainers/utils", () => ({
  formatTimeAgo: (date: string) => `${date} ago`,
}));

// ── Typed mock references ─────────────────────────────────────────────────
const mockedMarkRead = jest.mocked(markNotificationReadAction);
const mockedMarkAllRead = jest.mocked(markAllNotificationsReadAction);
const mockedAccept = jest.mocked(acceptCommunityInvitation);
const mockedDecline = jest.mocked(declineCommunityInvitation);
const mockedToast = jest.mocked(toast);

// ── Helpers ────────────────────────────────────────────────────────────────
const noopRefetch = jest.fn();

function setupQueryMocks({
  notifications = [] as object[],
  unreadCount = 0,
  invitations = [] as object[],
  isLoading = false,
  error = null as Error | null,
} = {}) {
  // Component always calls useSupabaseQuery in the same order per render:
  // 0→notifications, 1→unreadCount, 2→invitations (repeating on re-renders)
  const responses = [
    { data: notifications, refetch: noopRefetch, isLoading, error },
    { data: unreadCount, refetch: noopRefetch, isLoading: false, error: null },
    { data: invitations, refetch: noopRefetch, isLoading: false, error: null },
  ];
  let callIndex = 0;
  mockUseSupabaseQuery.mockImplementation(() => {
    const response = responses[callIndex % 3];
    callIndex++;
    return response;
  });
}

function makeNotification(overrides = {}) {
  return {
    id: 1,
    type: "match_ready",
    title: "Your match is ready",
    body: "Head to table 4",
    action_url: "/tournaments/abc/r/1/t/4",
    read_at: null,
    created_at: "2026-03-25T10:00:00Z",
    ...overrides,
  };
}

function makeInvitation(overrides = {}) {
  return {
    id: 10,
    organization: { name: "Pallet Town" },
    created_at: "2026-03-20T09:00:00Z",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("NotificationBell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOn.mockReturnValue(channelObj);
    mockChannel.mockReturnValue(channelObj);
  });

  it("renders null when no userId is provided", () => {
    setupQueryMocks();
    const { container } = render(<NotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the bell button when userId is provided", () => {
    setupQueryMocks();
    render(<NotificationBell userId="u1" />);
    expect(
      screen.getByRole("button", { name: /no new notifications/i })
    ).toBeInTheDocument();
  });

  it("shows unread badge count", () => {
    setupQueryMocks({ unreadCount: 3 });
    render(<NotificationBell userId="u1" />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/3 unread notifications/i)).toBeInTheDocument();
  });

  it("shows 99+ when badge count exceeds 99", () => {
    setupQueryMocks({ unreadCount: 100 });
    render(<NotificationBell userId="u1" />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("includes community invitations in total badge count", () => {
    setupQueryMocks({ unreadCount: 1, invitations: [makeInvitation()] });
    render(<NotificationBell userId="u1" />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  describe("popover", () => {
    it("shows empty state when no notifications or invitations", async () => {
      setupQueryMocks();
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    });

    it("shows loading state", async () => {
      setupQueryMocks({ isLoading: true });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(
        screen.queryByText("No notifications yet")
      ).not.toBeInTheDocument();
    });

    it("shows error state with retry button", async () => {
      setupQueryMocks({ error: new Error("Network error") });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      expect(
        screen.getByText("Failed to load notifications")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
    });

    it("calls refetch when retry is clicked", async () => {
      const refetch = jest.fn();
      const responses = [
        { data: [], refetch, isLoading: false, error: new Error("fail") },
        { data: 0, refetch: noopRefetch, isLoading: false, error: null },
        { data: [], refetch: noopRefetch, isLoading: false, error: null },
      ];
      let callIndex = 0;
      mockUseSupabaseQuery.mockImplementation(() => responses[callIndex++ % 3]);

      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      await userEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(refetch).toHaveBeenCalled();
    });

    it("renders notification title and body", async () => {
      setupQueryMocks({ notifications: [makeNotification()] });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      expect(screen.getByText("Your match is ready")).toBeInTheDocument();
      expect(screen.getByText("Head to table 4")).toBeInTheDocument();
    });

    it("shows Mark all read when there are unread notifications", async () => {
      setupQueryMocks({ notifications: [makeNotification()], unreadCount: 1 });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      expect(
        screen.getByRole("button", { name: /mark all read/i })
      ).toBeInTheDocument();
    });

    it("calls markAllNotificationsReadAction on mark-all-read click", async () => {
      mockedMarkAllRead.mockResolvedValue({ success: true });
      setupQueryMocks({ notifications: [makeNotification()], unreadCount: 1 });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      await userEvent.click(
        screen.getByRole("button", { name: /mark all read/i })
      );
      expect(mockedMarkAllRead).toHaveBeenCalled();
    });

    it("shows toast error when markAllRead action fails", async () => {
      mockedMarkAllRead.mockResolvedValue({ success: false, error: "Oops" });
      setupQueryMocks({ notifications: [makeNotification()], unreadCount: 1 });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      await userEvent.click(
        screen.getByRole("button", { name: /mark all read/i })
      );
      await waitFor(() =>
        expect(mockedToast.error).toHaveBeenCalledWith("Oops")
      );
    });

    it("renders a View all notifications link", async () => {
      setupQueryMocks();
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      expect(
        screen.getByRole("link", { name: /view all notifications/i })
      ).toHaveAttribute("href", "/dashboard/notifications");
    });
  });

  describe("notification click", () => {
    it("marks read and navigates to safe relative URL", async () => {
      mockedMarkRead.mockResolvedValue({ success: true });
      setupQueryMocks({ notifications: [makeNotification()] });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      await userEvent.click(screen.getByText("Your match is ready"));
      await waitFor(() => expect(mockedMarkRead).toHaveBeenCalledWith(1));
      expect(mockPush).toHaveBeenCalledWith("/tournaments/abc/r/1/t/4");
    });

    it("skips markRead for already-read notification", async () => {
      setupQueryMocks({
        notifications: [makeNotification({ read_at: "2026-01-01T00:00:00Z" })],
      });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      await userEvent.click(screen.getByText("Your match is ready"));
      expect(mockedMarkRead).not.toHaveBeenCalled();
    });

    it("does not navigate when action_url is null", async () => {
      mockedMarkRead.mockResolvedValue({ success: true });
      setupQueryMocks({
        notifications: [makeNotification({ action_url: null })],
      });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      await userEvent.click(screen.getByText("Your match is ready"));
      await waitFor(() => expect(mockedMarkRead).toHaveBeenCalled());
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("does not navigate when action_url is an external URL", async () => {
      mockedMarkRead.mockResolvedValue({ success: true });
      setupQueryMocks({
        notifications: [makeNotification({ action_url: "https://evil.com" })],
      });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /no new notifications/i })
      );
      await userEvent.click(screen.getByText("Your match is ready"));
      await waitFor(() => expect(mockedMarkRead).toHaveBeenCalled());
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("organization invitations", () => {
    it("renders invitation with community name and action buttons", async () => {
      setupQueryMocks({ invitations: [makeInvitation()] });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      expect(screen.getByText("Pallet Town")).toBeInTheDocument();
      expect(
        screen.getByText("invited you to join their staff")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /accept/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /decline/i })
      ).toBeInTheDocument();
    });

    it("calls accept and shows success toast", async () => {
      mockedAccept.mockResolvedValue(undefined as never);
      setupQueryMocks({ invitations: [makeInvitation()] });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      await userEvent.click(screen.getByRole("button", { name: /^accept$/i }));
      await waitFor(() =>
        expect(mockedAccept).toHaveBeenCalledWith(mockSupabaseClient, 10)
      );
      expect(mockedToast.success).toHaveBeenCalledWith(
        "You are now staff of Pallet Town"
      );
    });

    it("shows error toast when accept fails", async () => {
      mockedAccept.mockRejectedValue(new Error("Already a member") as never);
      setupQueryMocks({ invitations: [makeInvitation()] });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      await userEvent.click(screen.getByRole("button", { name: /^accept$/i }));
      await waitFor(() =>
        expect(mockedToast.error).toHaveBeenCalledWith("Already a member")
      );
    });

    it("calls decline and shows success toast", async () => {
      mockedDecline.mockResolvedValue(undefined as never);
      setupQueryMocks({ invitations: [makeInvitation()] });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      await userEvent.click(screen.getByRole("button", { name: /^decline$/i }));
      await waitFor(() =>
        expect(mockedDecline).toHaveBeenCalledWith(mockSupabaseClient, 10)
      );
      expect(mockedToast.success).toHaveBeenCalledWith(
        "Declined invitation from Pallet Town"
      );
    });

    it("shows error toast when decline fails", async () => {
      mockedDecline.mockRejectedValue(new Error("Server error") as never);
      setupQueryMocks({ invitations: [makeInvitation()] });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      await userEvent.click(screen.getByRole("button", { name: /^decline$/i }));
      await waitFor(() =>
        expect(mockedToast.error).toHaveBeenCalledWith("Server error")
      );
    });

    it("shows 'Unknown Community' when community name is missing", async () => {
      setupQueryMocks({
        invitations: [makeInvitation({ organization: null })],
      });
      render(<NotificationBell userId="u1" />);
      await userEvent.click(
        screen.getByRole("button", { name: /1 unread notifications/i })
      );
      expect(screen.getByText("Unknown Community")).toBeInTheDocument();
    });
  });

  describe("realtime subscription", () => {
    it("subscribes to notifications channel on mount", () => {
      setupQueryMocks();
      render(<NotificationBell userId="u1" />);
      expect(mockChannel).toHaveBeenCalledWith("notifications-u1");
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it("does not subscribe when userId is absent", () => {
      setupQueryMocks();
      render(<NotificationBell />);
      expect(mockChannel).not.toHaveBeenCalled();
    });

    it("unsubscribes from channel on unmount", () => {
      setupQueryMocks();
      const { unmount } = render(<NotificationBell userId="u1" />);
      unmount();
      expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj);
    });
  });
});
