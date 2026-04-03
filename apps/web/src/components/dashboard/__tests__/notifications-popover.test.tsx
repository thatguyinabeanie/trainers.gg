import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";

// Mock TanStack Query
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

// Mock useAuth
jest.mock("@/hooks/use-auth", () => ({
  useAuth: jest.fn(),
}));

// Mock useSupabase
jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
}));

// Mock supabase queries
jest.mock("@trainers/supabase", () => ({
  getNotifications: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

// Mock notification helpers
jest.mock("../notification-helpers", () => ({
  formatAge: jest.fn((createdAt: string) => {
    void createdAt;
    return "5m";
  }),
  getTypeIcon: jest.fn((type: string) => {
    void type;
    return "⚔️";
  }),
  isActionType: jest.fn((type: string) => type === "match_ready" || type === "judge_call"),
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Bell: ({ className }: { className?: string }) => (
    <svg data-testid="icon-bell" className={className} />
  ),
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// Mock popover UI
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover">{children}</div>
  ),
  PopoverTrigger: ({
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
    suppressHydrationWarning?: boolean;
  }) => (
    <button
      data-testid="popover-trigger"
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { notificationFactory } from "@trainers/test-utils/factories";
import { NotificationsPopover } from "../notifications-popover";

describe("NotificationsPopover", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: "user-1" } });
    (useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    (useQuery as jest.Mock).mockReturnValue({ data: [] });
  });

  describe("empty state", () => {
    it("renders without crashing when no notifications", () => {
      render(<NotificationsPopover />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("shows 'No notifications yet' in empty state", () => {
      render(<NotificationsPopover />);
      expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    });

    it("renders bell icon", () => {
      render(<NotificationsPopover />);
      const bellIcons = screen.getAllByTestId("icon-bell");
      expect(bellIcons.length).toBeGreaterThan(0);
    });

    it("does not show a badge count when there are no unread notifications", () => {
      render(<NotificationsPopover />);
      // aria-label should be plain "Notifications" with no count
      const trigger = screen.getByTestId("popover-trigger");
      expect(trigger).toHaveAttribute("aria-label", "Notifications");
    });

    it("renders Notifications heading", () => {
      render(<NotificationsPopover />);
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it("renders Mark all read button", () => {
      render(<NotificationsPopover />);
      expect(screen.getByText("Mark all read")).toBeInTheDocument();
    });

    it("Mark all read button is disabled when unreadCount is zero", () => {
      render(<NotificationsPopover />);
      const button = screen.getByText("Mark all read");
      expect(button).toBeDisabled();
    });
  });

  describe("with unread notifications", () => {
    it("shows badge count in aria-label when there are unread notifications", () => {
      const notifications = [
        notificationFactory.build({ read_at: null }),
        notificationFactory.build({ read_at: null }),
      ];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      const trigger = screen.getByTestId("popover-trigger");
      expect(trigger).toHaveAttribute("aria-label", "2 unread notifications");
    });

    it("uses singular 'notification' for count of 1", () => {
      const notifications = [notificationFactory.build({ read_at: null })];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      const trigger = screen.getByTestId("popover-trigger");
      expect(trigger).toHaveAttribute("aria-label", "1 unread notification");
    });

    it("enables Mark all read button when unread notifications exist", () => {
      const notifications = [notificationFactory.build({ read_at: null })];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      const button = screen.getByText("Mark all read");
      expect(button).not.toBeDisabled();
    });

    it("shows notification title in recent items section", () => {
      const notifications = [
        notificationFactory.build({
          type: "match_result",
          title: "Match completed",
          read_at: null,
        }),
      ];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      expect(screen.getByText("Match completed")).toBeInTheDocument();
    });
  });

  describe("needs attention items", () => {
    it("renders Needs attention section for action-type unread notifications", () => {
      const notifications = [
        notificationFactory.build({
          type: "match_ready",
          title: "Your match is ready!",
          read_at: null,
        }),
      ];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      expect(screen.getByText("Needs attention")).toBeInTheDocument();
      expect(screen.getByText("Your match is ready!")).toBeInTheDocument();
    });

    it("renders 'Go to match' link for match_ready notifications with action_url", () => {
      const notifications = [
        notificationFactory.build({
          type: "match_ready",
          title: "Your match is ready!",
          action_url: "/tournaments/vgc-cup/r/1/t/2",
          read_at: null,
        }),
      ];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      expect(screen.getByText("Go to match →")).toBeInTheDocument();
    });

    it("renders 'View →' link for non-match_ready action notifications", () => {
      const notifications = [
        notificationFactory.build({
          type: "judge_call",
          title: "Judge called",
          action_url: "/tournaments/vgc-cup",
          read_at: null,
        }),
      ];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      expect(screen.getByText("View →")).toBeInTheDocument();
    });
  });

  describe("recent items", () => {
    it("renders Recent section for informational notifications", () => {
      const notifications = [
        notificationFactory.build({
          type: "tournament_start",
          title: "Tournament starting soon",
          read_at: null,
        }),
      ];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      expect(screen.getByText("Recent")).toBeInTheDocument();
    });

    it("shows notification body when provided", () => {
      const notifications = [
        notificationFactory.build({
          type: "tournament_complete",
          title: "Tournament complete",
          body: "You placed 3rd",
          read_at: "2024-01-01T00:00:00Z",
        }),
      ];
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      expect(screen.getByText("You placed 3rd")).toBeInTheDocument();
    });
  });

  describe("badge capping", () => {
    it("caps displayed badge at 9+ for counts greater than 9", () => {
      const notifications = Array.from({ length: 15 }, (_, i) =>
        notificationFactory.build({ id: i + 1, read_at: null })
      );
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      expect(screen.getByText("9+")).toBeInTheDocument();
    });

    it("shows exact count for 9 or fewer unread notifications", () => {
      const notifications = Array.from({ length: 5 }, (_, i) =>
        notificationFactory.build({ id: i + 1, read_at: null })
      );
      (useQuery as jest.Mock).mockReturnValue({ data: notifications });
      render(<NotificationsPopover />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  describe("no user state", () => {
    it("renders without crashing when user is null", () => {
      (useAuth as jest.Mock).mockReturnValue({ user: null });
      expect(() => render(<NotificationsPopover />)).not.toThrow();
    });
  });
});
