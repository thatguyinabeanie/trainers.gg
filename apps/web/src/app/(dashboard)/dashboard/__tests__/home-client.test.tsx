import { render, screen } from "@testing-library/react";

// --- next/navigation ---
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
}));

// --- @/lib/supabase ---
jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
  })),
}));

// --- @/components/dashboard/sidebar-helpers ---
jest.mock("@/components/dashboard/sidebar-helpers", () => ({
  DASHBOARD_ALT_COOKIE: "dashboard-alt",
  COOKIE_MAX_AGE: 86400,
}));

// --- Mock child components to avoid deep dependency chains ---
// (alts-table -> sprite-picker -> cache-invalidation -> next/cache fails in test env)
jest.mock("../components/alts-table", () => ({
  AltsTable: (props: { alts: unknown[] }) => (
    <div data-testid="alts-table" data-count={props.alts?.length ?? 0} />
  ),
}));

jest.mock("../components/live-match-bar", () => ({
  LiveMatchBar: (props: { match: { tournamentName: string } }) => (
    <div data-testid="live-match-bar">{props.match.tournamentName}</div>
  ),
}));

jest.mock("../components/dashboard-stats", () => ({
  DashboardStats: (props: {
    winRate: string;
    rating: string;
    record: string;
    tournaments: string;
    winRateSub: string;
    ratingSub: string;
    recordSub: string;
    tournamentsSub: string;
  }) => (
    <div data-testid="dashboard-stats">
      <span data-testid="stat-winrate">{props.winRate}</span>
      <span data-testid="stat-winrate-sub">{props.winRateSub}</span>
      <span data-testid="stat-rating">{props.rating}</span>
      <span data-testid="stat-rating-sub">{props.ratingSub}</span>
      <span data-testid="stat-record">{props.record}</span>
      <span data-testid="stat-record-sub">{props.recordSub}</span>
      <span data-testid="stat-tournaments">{props.tournaments}</span>
      <span data-testid="stat-tournaments-sub">{props.tournamentsSub}</span>
    </div>
  ),
}));

jest.mock("../components/create-alt-form", () => ({
  CreateAltForm: () => <div data-testid="create-alt-form" />,
}));

// --- @/components/ui/button ---
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

// --- @/components/ui/card ---
jest.mock("@/components/ui/card", () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// --- lucide-react ---
jest.mock("lucide-react", () => ({
  Loader2: () => <svg data-testid="icon-loader" />,
  Plus: () => <svg data-testid="icon-plus" />,
  Users: () => <svg data-testid="icon-users" />,
}));

// --- sonner ---
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import React from "react";
import { useSupabase } from "@/lib/supabase";
import { HomeClient } from "../home-client";

const mockUseSupabase = useSupabase as jest.MockedFunction<typeof useSupabase>;

// =============================================================================
// Helpers
// =============================================================================

const defaultAlts = [
  { id: 5, username: "ash_alt", avatar_url: null, is_public: true },
];

/**
 * Default props matching the DashboardHomeClientProps interface.
 * Override individual fields as needed per test.
 */
function getDefaultProps(
  overrides: Partial<React.ComponentProps<typeof HomeClient>> = {}
): React.ComponentProps<typeof HomeClient> {
  return {
    alts: defaultAlts,
    mainAltId: 5,
    initialBulkStats: undefined,
    initialBulkRatings: undefined,
    initialActiveMatch: null,
    selectedAltUsername: null,
    username: "ash_ketchum",
    ...overrides,
  };
}

function setupMockSupabase() {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  };
  mockUseSupabase.mockReturnValue({
    channel: jest.fn(() => mockChannel),
  } as ReturnType<typeof useSupabase>);
}

// =============================================================================
// Tests
// =============================================================================

describe("HomeClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockSupabase();
  });

  // ---------------------------------------------------------------------------
  // Alts table
  // ---------------------------------------------------------------------------

  describe("alts table", () => {
    it("renders AltsTable component when alts exist", () => {
      render(<HomeClient {...getDefaultProps()} />);
      expect(screen.getByTestId("alts-table")).toBeInTheDocument();
    });

    it("renders 'Your Alts' heading", () => {
      render(<HomeClient {...getDefaultProps()} />);
      expect(screen.getByText("Your Alts")).toBeInTheDocument();
    });

    it("renders empty state when no alts", () => {
      render(<HomeClient {...getDefaultProps({ alts: [] })} />);
      expect(screen.getByText("No alts yet")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Temp username welcome toast
  // ---------------------------------------------------------------------------

  describe("temp username toast", () => {
    it("shows info toast for users with temp_ username", async () => {
      const { toast } = await import("sonner");
      render(<HomeClient {...getDefaultProps({ username: "temp_abc123" })} />);
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining("Welcome to trainers.gg"),
        expect.any(Object)
      );
    });

    it("shows info toast for users with user_ username", async () => {
      const { toast } = await import("sonner");
      render(<HomeClient {...getDefaultProps({ username: "user_xyz789" })} />);
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining("Welcome to trainers.gg"),
        expect.any(Object)
      );
    });

    it("does not show toast for users with regular usernames", async () => {
      const { toast } = await import("sonner");
      render(<HomeClient {...getDefaultProps()} />);
      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Realtime subscription
  // ---------------------------------------------------------------------------

  describe("realtime subscription", () => {
    it("subscribes to realtime channel when mainAltId is provided", () => {
      render(<HomeClient {...getDefaultProps({ mainAltId: 5 })} />);
      const supabase = mockUseSupabase();
      expect(supabase.channel).toHaveBeenCalled();
    });

    it("does not subscribe when mainAltId is null", () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn(),
      };
      const channelFn = jest.fn(() => mockChannel);
      mockUseSupabase.mockReturnValue({
        channel: channelFn,
      } as ReturnType<typeof useSupabase>);

      render(<HomeClient {...getDefaultProps({ mainAltId: null })} />);
      // Channel should not be created when there's no main alt
      expect(channelFn).not.toHaveBeenCalled();
    });
  });
});
