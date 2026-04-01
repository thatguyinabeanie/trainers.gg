import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationCenter } from "../notification-center";
import { notificationFactory } from "@trainers/test-utils/factories";

// Mock navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase hooks
jest.mock("@/lib/supabase", () => ({
  useSupabase: () => ({}),
  useSupabaseQuery: jest.fn((_queryFn: unknown, _deps: unknown) => ({
    data: null,
    refetch: jest.fn(),
    isLoading: false,
    error: null,
  })),
}));

// Mock server actions
jest.mock("@/actions/notifications", () => ({
  markNotificationReadAction: jest.fn().mockResolvedValue({ success: true }),
  markAllNotificationsReadAction: jest
    .fn()
    .mockResolvedValue({ success: true }),
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("NotificationCenter", () => {
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

  it("should render the notifications header", () => {
    render(
      <NotificationCenter
        initialNotifications={[]}
        initialTotalCount={0}
        initialUnreadCount={0}
      />
    );

    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("should show unread count badge when there are unread notifications", () => {
    render(
      <NotificationCenter
        initialNotifications={[unreadNotification]}
        initialTotalCount={1}
        initialUnreadCount={1}
      />
    );

    expect(screen.getByText("1 unread")).toBeInTheDocument();
  });

  it("should not show unread badge when all notifications are read", () => {
    render(
      <NotificationCenter
        initialNotifications={[readNotification]}
        initialTotalCount={1}
        initialUnreadCount={0}
      />
    );

    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });

  it("should show 'Mark all read' button when there are unread notifications", () => {
    render(
      <NotificationCenter
        initialNotifications={[unreadNotification]}
        initialTotalCount={1}
        initialUnreadCount={1}
      />
    );

    expect(
      screen.getByRole("button", { name: /mark all read/i })
    ).toBeInTheDocument();
  });

  it("should not show 'Mark all read' button when all are read", () => {
    render(
      <NotificationCenter
        initialNotifications={[readNotification]}
        initialTotalCount={1}
        initialUnreadCount={0}
      />
    );

    expect(
      screen.queryByRole("button", { name: /mark all read/i })
    ).not.toBeInTheDocument();
  });

  it("should render notification titles", () => {
    render(
      <NotificationCenter
        initialNotifications={[unreadNotification, readNotification]}
        initialTotalCount={2}
        initialUnreadCount={1}
      />
    );

    expect(screen.getByText("Match is ready")).toBeInTheDocument();
    expect(screen.getByText("Tournament completed")).toBeInTheDocument();
  });

  it("should render notification bodies", () => {
    render(
      <NotificationCenter
        initialNotifications={[unreadNotification]}
        initialTotalCount={1}
        initialUnreadCount={1}
      />
    );

    expect(
      screen.getByText("Round 1, Table 3 — vs Cynthia")
    ).toBeInTheDocument();
  });

  it("should show empty state when no notifications exist", () => {
    render(
      <NotificationCenter
        initialNotifications={[]}
        initialTotalCount={0}
        initialUnreadCount={0}
      />
    );

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("should render all filter tabs", () => {
    render(
      <NotificationCenter
        initialNotifications={[]}
        initialTotalCount={0}
        initialUnreadCount={0}
      />
    );

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
    expect(screen.getByText("Matches")).toBeInTheDocument();
    expect(screen.getByText("Tournaments")).toBeInTheDocument();
    expect(screen.getByText("Organizations")).toBeInTheDocument();
  });

  it("should navigate when clicking a notification with a valid action_url", () => {
    render(
      <NotificationCenter
        initialNotifications={[readNotification]}
        initialTotalCount={1}
        initialUnreadCount={0}
      />
    );

    fireEvent.click(screen.getByText("Tournament completed"));

    expect(mockPush).toHaveBeenCalledWith("/tournaments/vgc-championship");
  });
});
