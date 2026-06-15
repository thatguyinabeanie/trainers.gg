import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationCenter } from "../notification-center";
import { notificationFactory } from "@trainers/test-utils/factories";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockGetNotifications = jest.fn();
const mockGetNotificationCount = jest.fn();
const mockGetUnreadNotificationCount = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  getNotificationCount: (...args: unknown[]) =>
    mockGetNotificationCount(...args),
  getUnreadNotificationCount: (...args: unknown[]) =>
    mockGetUnreadNotificationCount(...args),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  }),
}));

const mockMarkNotificationReadAction = jest.fn();
const mockMarkAllNotificationsReadAction = jest.fn();

jest.mock("@/actions/notifications", () => ({
  markNotificationReadAction: (...args: unknown[]) =>
    mockMarkNotificationReadAction(...args),
  markAllNotificationsReadAction: (...args: unknown[]) =>
    mockMarkAllNotificationsReadAction(...args),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const unreadNotification = notificationFactory.build({
  id: 1,
  title: "Match is ready",
  body: "Round 1, Table 3 — vs Cynthia",
  type: "match_ready",
  read_at: null,
  action_url: "/tournaments/test-tournament/matches/1",
  created_at: new Date().toISOString(),
});

const readNotification = notificationFactory.build({
  id: 2,
  title: "Tournament completed",
  body: "VGC Championship has ended",
  type: "tournament_complete",
  read_at: new Date().toISOString(),
  action_url: "/tournaments/vgc-championship",
  created_at: new Date(Date.now() - 86400000).toISOString(),
});

const emptyProps = {
  initialNotifications: [],
  initialTotalCount: 0,
  initialUnreadCount: 0,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("NotificationCenter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: query fns return the initial data so refetches don't error
    mockGetNotifications.mockResolvedValue([]);
    mockGetNotificationCount.mockResolvedValue(0);
    mockGetUnreadNotificationCount.mockResolvedValue(0);
    mockMarkNotificationReadAction.mockResolvedValue({ success: true });
    mockMarkAllNotificationsReadAction.mockResolvedValue({ success: true });
  });

  describe("header rendering", () => {
    it("renders the Inbox heading", () => {
      render(<NotificationCenter {...emptyProps} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText("Inbox")).toBeInTheDocument();
    });

    it("shows unread count badge when there are unread notifications", () => {
      render(
        <NotificationCenter
          initialNotifications={[unreadNotification]}
          initialTotalCount={1}
          initialUnreadCount={1}
        />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText("1 unread")).toBeInTheDocument();
    });

    it("does not show unread badge when all notifications are read", () => {
      render(
        <NotificationCenter
          initialNotifications={[readNotification]}
          initialTotalCount={1}
          initialUnreadCount={0}
        />,
        { wrapper: createWrapper() }
      );
      expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
    });

    it("shows 'Mark all read' button when there are unread notifications", () => {
      render(
        <NotificationCenter
          initialNotifications={[unreadNotification]}
          initialTotalCount={1}
          initialUnreadCount={1}
        />,
        { wrapper: createWrapper() }
      );
      expect(
        screen.getByRole("button", { name: /mark all read/i })
      ).toBeInTheDocument();
    });

    it("does not show 'Mark all read' button when all are read", () => {
      render(
        <NotificationCenter
          initialNotifications={[readNotification]}
          initialTotalCount={1}
          initialUnreadCount={0}
        />,
        { wrapper: createWrapper() }
      );
      expect(
        screen.queryByRole("button", { name: /mark all read/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("filter tabs", () => {
    it("renders all filter tabs", () => {
      render(<NotificationCenter {...emptyProps} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("Unread")).toBeInTheDocument();
      expect(screen.getByText("Matches")).toBeInTheDocument();
      expect(screen.getByText("Tournaments")).toBeInTheDocument();
      expect(screen.getByText("Organizations")).toBeInTheDocument();
    });
  });

  describe("notification list", () => {
    it("shows empty state when no notifications exist", () => {
      render(<NotificationCenter {...emptyProps} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    });

    it("renders notification titles", () => {
      render(
        <NotificationCenter
          initialNotifications={[unreadNotification, readNotification]}
          initialTotalCount={2}
          initialUnreadCount={1}
        />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText("Match is ready")).toBeInTheDocument();
      expect(screen.getByText("Tournament completed")).toBeInTheDocument();
    });

    it("renders notification bodies", () => {
      render(
        <NotificationCenter
          initialNotifications={[unreadNotification]}
          initialTotalCount={1}
          initialUnreadCount={1}
        />,
        { wrapper: createWrapper() }
      );
      expect(
        screen.getByText("Round 1, Table 3 — vs Cynthia")
      ).toBeInTheDocument();
    });
  });

  describe("navigation on click", () => {
    it("navigates when clicking a notification with a valid action_url", () => {
      render(
        <NotificationCenter
          initialNotifications={[readNotification]}
          initialTotalCount={1}
          initialUnreadCount={0}
        />,
        { wrapper: createWrapper() }
      );
      fireEvent.click(screen.getByText("Tournament completed"));
      expect(mockPush).toHaveBeenCalledWith("/tournaments/vgc-championship");
    });

    it("does not navigate when action_url is null", () => {
      const noUrlNotification = notificationFactory.build({
        id: 3,
        title: "No URL notification",
        body: null,
        type: "tournament_complete",
        read_at: new Date().toISOString(),
        action_url: null,
        created_at: new Date().toISOString(),
      });
      render(
        <NotificationCenter
          initialNotifications={[noUrlNotification]}
          initialTotalCount={1}
          initialUnreadCount={0}
        />,
        { wrapper: createWrapper() }
      );
      fireEvent.click(screen.getByText("No URL notification"));
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("mark all read action", () => {
    it("calls markAllNotificationsReadAction when button is clicked", async () => {
      render(
        <NotificationCenter
          initialNotifications={[unreadNotification]}
          initialTotalCount={1}
          initialUnreadCount={1}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));

      await waitFor(() => {
        expect(mockMarkAllNotificationsReadAction).toHaveBeenCalled();
      });
    });

    it("shows success toast after marking all read", async () => {
      render(
        <NotificationCenter
          initialNotifications={[unreadNotification]}
          initialTotalCount={1}
          initialUnreadCount={1}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          "All notifications marked as read"
        );
      });
    });

    it("shows error toast when mark all read fails", async () => {
      mockMarkAllNotificationsReadAction.mockResolvedValue({
        success: false,
        error: "Server error",
      });

      render(
        <NotificationCenter
          initialNotifications={[unreadNotification]}
          initialTotalCount={1}
          initialUnreadCount={1}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole("button", { name: /mark all read/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Server error");
      });
    });
  });

  describe("unread tab empty state", () => {
    it("shows 'No unread notifications' on unread tab with no data", async () => {
      mockGetNotifications.mockResolvedValue([]);
      mockGetNotificationCount.mockResolvedValue(0);

      render(<NotificationCenter {...emptyProps} />, {
        wrapper: createWrapper(),
      });

      fireEvent.click(screen.getByText("Unread"));

      await waitFor(() => {
        expect(screen.getByText("No unread notifications")).toBeInTheDocument();
      });
    });
  });
});
