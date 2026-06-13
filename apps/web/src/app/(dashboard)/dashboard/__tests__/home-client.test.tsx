/**
 * Tests for dashboard/home-client.tsx
 *
 * The component manages alt selection state and delegates to AltsTable /
 * AltsCards. D2: the `tournament_matches` realtime subscription was removed.
 * Active-match freshness is now handled via a visibilitychange event listener
 * that calls router.refresh() when the user tabs back in.
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

// --- next/navigation ---
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), refresh: jest.fn() })),
}));

// --- @/hooks/use-mobile ---
const mockUseIsMobile = jest.fn(() => false);
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

// --- @/hooks/use-is-client ---
const mockUseIsClient = jest.fn(() => true);
jest.mock("@/hooks/use-is-client", () => ({
  useIsClient: () => mockUseIsClient(),
}));

// --- @/components/dashboard/sidebar-helpers ---
jest.mock("@/components/dashboard/sidebar-helpers", () => ({
  DASHBOARD_ALT_COOKIE: "dashboard-alt",
  COOKIE_MAX_AGE: 86400,
}));

// --- Mock child components to avoid deep dependency chains ---
jest.mock("../components/alts-table", () => ({
  AltsTable: (props: { alts: unknown[] }) => (
    <div data-testid="alts-table" data-count={props.alts?.length ?? 0} />
  ),
}));

jest.mock("../components/alts-cards", () => ({
  AltsCards: (props: { alts: unknown[] }) => (
    <div data-testid="alts-cards" data-count={props.alts?.length ?? 0} />
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
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import React from "react";
import { render, screen } from "@testing-library/react";
import { HomeClient } from "../home-client";

// =============================================================================
// Helpers
// =============================================================================

const defaultAlts = [
  { id: 5, username: "ash_alt", avatar_url: null, is_public: true },
];

function getDefaultProps(
  overrides: Partial<React.ComponentProps<typeof HomeClient>> = {}
): React.ComponentProps<typeof HomeClient> {
  return {
    alts: defaultAlts,
    mainAltId: 5,
    initialBulkStats: undefined,
    initialBulkRatings: undefined,
    selectedAltUsername: null,
    username: "ash_ketchum",
    ...overrides,
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockUseIsMobile.mockReturnValue(false);
  mockUseIsClient.mockReturnValue(true);
});

// =============================================================================
// Alts table
// =============================================================================

describe("alts table", () => {
  it("renders AltsTable component on desktop", () => {
    mockUseIsMobile.mockReturnValue(false);
    render(<HomeClient {...getDefaultProps()} />);
    expect(screen.getByTestId("alts-table")).toBeInTheDocument();
    expect(screen.queryByTestId("alts-cards")).not.toBeInTheDocument();
  });

  it("renders AltsCards (not AltsTable) on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    render(<HomeClient {...getDefaultProps()} />);
    expect(screen.getByTestId("alts-cards")).toBeInTheDocument();
    expect(screen.queryByTestId("alts-table")).not.toBeInTheDocument();
  });

  it("renders 'Your Alts' heading", () => {
    render(<HomeClient {...getDefaultProps()} />);
    expect(screen.getByText("Your Alts")).toBeInTheDocument();
  });

  it("renders empty state when no alts", () => {
    render(<HomeClient {...getDefaultProps({ alts: [] })} />);
    expect(screen.getByText("No alts yet")).toBeInTheDocument();
  });

  it("renders skeleton (neither AltsTable nor AltsCards) during SSR", () => {
    mockUseIsClient.mockReturnValue(false);
    render(<HomeClient {...getDefaultProps()} />);
    expect(screen.queryByTestId("alts-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("alts-cards")).not.toBeInTheDocument();
  });
});

// =============================================================================
// Temp username welcome toast
// =============================================================================

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

// =============================================================================
// No realtime subscription (D2)
//
// The `dashboard-matches-${profileId}` channel and its `tournament_matches`
// Postgres Changes subscription were removed. Active-match freshness is now
// handled via a visibilitychange listener that calls router.refresh().
// =============================================================================

describe("no realtime subscription (D2)", () => {
  it("renders without any Supabase channel mock", () => {
    // If the component still tried to call supabase.channel() the test would
    // throw because no mock for useSupabase / @/lib/supabase is registered.
    // Rendering cleanly here confirms the realtime subscription was removed.
    expect(() =>
      render(<HomeClient {...getDefaultProps({ mainAltId: 5 })} />)
    ).not.toThrow();
  });

  it("renders when mainAltId is null without attempting channel subscription", () => {
    expect(() =>
      render(<HomeClient {...getDefaultProps({ mainAltId: null })} />)
    ).not.toThrow();
  });
});

// =============================================================================
// visibilitychange refetch (replaces realtime)
// =============================================================================

describe("visibilitychange refetch", () => {
  it("attaches a visibilitychange listener when mainAltId is provided", () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    render(<HomeClient {...getDefaultProps({ mainAltId: 5 })} />);
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    addEventListenerSpy.mockRestore();
  });

  it("does not attach a visibilitychange listener when mainAltId is null", () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    render(<HomeClient {...getDefaultProps({ mainAltId: null })} />);
    // With no mainAltId the effect returns early — no listener attached
    const visibilityCalls = addEventListenerSpy.mock.calls.filter(
      (call) => call[0] === "visibilitychange"
    );
    expect(visibilityCalls).toHaveLength(0);
    addEventListenerSpy.mockRestore();
  });

  it("removes the visibilitychange listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <HomeClient {...getDefaultProps({ mainAltId: 5 })} />
    );
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    removeEventListenerSpy.mockRestore();
  });
});
