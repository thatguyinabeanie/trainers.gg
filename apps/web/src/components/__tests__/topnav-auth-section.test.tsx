import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- next/navigation ---
const mockRouterPush = jest.fn();
const mockRouterRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}));

// --- next/link ---
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// --- @/components/auth/auth-provider ---
const mockSignOut = jest.fn();
const mockGetUserDisplayName = jest.fn(() => "Ash Ketchum");
jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: jest.fn(),
  getUserDisplayName: (...args: unknown[]) => mockGetUserDisplayName(...args),
}));

// --- @/lib/supabase ---
const mockUseSupabaseQuery = jest.fn();
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

// --- @trainers/supabase ---
jest.mock("@trainers/supabase", () => ({
  listMyCommunities: jest.fn(),
}));

// --- @/components/notification-bell ---
jest.mock("@/components/notification-bell", () => ({
  NotificationBell: ({ userId }: { userId: string }) => (
    <div data-testid="notification-bell" data-user-id={userId} />
  ),
}));

// --- @/components/theme-switcher ---
jest.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

// --- @/lib/sudo/actions ---
const mockToggleSudoMode = jest.fn();
const mockCheckSudoStatus = jest.fn();
jest.mock("@/lib/sudo/actions", () => ({
  toggleSudoMode: (...args: unknown[]) => mockToggleSudoMode(...args),
  checkSudoStatus: (...args: unknown[]) => mockCheckSudoStatus(...args),
}));

// --- sonner ---
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import React from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { TopNavAuthSection } from "../topnav-auth-section";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedToast = jest.mocked(toast);

// ============================================================================
// Helpers
// ============================================================================

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "ash@trainers.local",
    user_metadata: { username: "ash_ketchum" },
    profile: null,
    ...overrides,
  };
}

function setupDefaultMocks({
  user = makeUser(),
  loading = false,
  organizations = [] as { id: number; name: string; slug: string }[],
} = {}) {
  mockUseAuth.mockReturnValue({
    user,
    loading,
    isAuthenticated: !!user,
    signOut: mockSignOut,
    refetchUser: jest.fn(),
  } as ReturnType<typeof useAuth>);

  mockUseSupabaseQuery.mockReturnValue({
    data: organizations,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  });

  mockCheckSudoStatus.mockResolvedValue({
    isActive: false,
    isSiteAdmin: false,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("TopNavAuthSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Unauthenticated state
  // --------------------------------------------------------------------------

  describe("unauthenticated", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: mockSignOut,
        refetchUser: jest.fn(),
      } as ReturnType<typeof useAuth>);
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: false,
      });
    });

    it("renders Sign In button", () => {
      render(<TopNavAuthSection />);
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("renders Sign Up button", () => {
      render(<TopNavAuthSection />);
      expect(screen.getByText("Sign Up")).toBeInTheDocument();
    });

    it("Sign In links to /sign-in", () => {
      render(<TopNavAuthSection />);
      const link = screen.getByRole("link", { name: /sign in/i });
      expect(link).toHaveAttribute("href", "/sign-in");
    });

    it("Sign Up links to /sign-up", () => {
      render(<TopNavAuthSection />);
      const link = screen.getByRole("link", { name: /sign up/i });
      expect(link).toHaveAttribute("href", "/sign-up");
    });

    it("renders ThemeSwitcher when not authenticated", () => {
      render(<TopNavAuthSection />);
      expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
    });

    it("does not render NotificationBell when not authenticated", () => {
      render(<TopNavAuthSection />);
      expect(
        screen.queryByTestId("notification-bell")
      ).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------

  describe("loading state", () => {
    it("renders skeleton placeholders while loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isAuthenticated: false,
        signOut: mockSignOut,
        refetchUser: jest.fn(),
      } as ReturnType<typeof useAuth>);
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: false,
      });

      render(<TopNavAuthSection />);
      // The skeleton div with h-8 w-8 rounded-full should be present
      // We check that Sign In / Sign Up are NOT shown, and no user menu
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
      expect(screen.queryByText("Sign Up")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /user menu/i })
      ).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Authenticated state
  // --------------------------------------------------------------------------

  describe("authenticated", () => {
    beforeEach(() => {
      setupDefaultMocks();
    });

    it("renders NotificationBell with user id", () => {
      render(<TopNavAuthSection />);
      const bell = screen.getByTestId("notification-bell");
      expect(bell).toBeInTheDocument();
      expect(bell).toHaveAttribute("data-user-id", "user-1");
    });

    it("renders ThemeSwitcher when authenticated", () => {
      render(<TopNavAuthSection />);
      expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
    });

    it("renders user menu trigger button", () => {
      render(<TopNavAuthSection />);
      expect(
        screen.getByRole("button", { name: /user menu/i })
      ).toBeInTheDocument();
    });

    it("does not render Sign In button when authenticated", () => {
      render(<TopNavAuthSection />);
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });

    it("does not render Sign Up button when authenticated", () => {
      render(<TopNavAuthSection />);
      expect(screen.queryByText("Sign Up")).not.toBeInTheDocument();
    });

    it("shows display name in the dropdown trigger", () => {
      mockGetUserDisplayName.mockReturnValue("Ash Ketchum");
      render(<TopNavAuthSection />);
      expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Dropdown menu content
  // --------------------------------------------------------------------------

  describe("dropdown menu", () => {
    beforeEach(() => {
      setupDefaultMocks();
    });

    it("shows Dashboard link in dropdown", async () => {
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      const dashboardLinks = await screen.findAllByRole("link", {
        name: /dashboard/i,
      });
      expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Settings link in dropdown", async () => {
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      expect(
        await screen.findByRole("link", { name: /settings/i })
      ).toBeInTheDocument();
    });

    it("shows Sign out option in dropdown", async () => {
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      expect(await screen.findByText("Sign out")).toBeInTheDocument();
    });

    it("shows My Profile link when user has username in metadata", async () => {
      setupDefaultMocks({
        user: makeUser({ user_metadata: { username: "ash_ketchum" } }),
      });
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      const profileLink = await screen.findByRole("link", {
        name: /my profile/i,
      });
      expect(profileLink).toHaveAttribute("href", "/u/ash_ketchum");
    });

    it("does not show My Profile link when no username in metadata", async () => {
      setupDefaultMocks({
        user: makeUser({ user_metadata: {} }),
      });
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      // Wait for dropdown to open by checking something we know is in it
      await screen.findByText("Sign out");
      expect(
        screen.queryByRole("link", { name: /my profile/i })
      ).not.toBeInTheDocument();
    });

    it("calls signOut and navigates to / when Sign out is clicked", async () => {
      mockSignOut.mockResolvedValue(undefined);
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      const signOutBtn = await screen.findByText("Sign out");
      await userEvent.click(signOutBtn);
      await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
      expect(mockRouterPush).toHaveBeenCalledWith("/");
    });
  });

  // --------------------------------------------------------------------------
  // Organizations section
  // --------------------------------------------------------------------------

  describe("organizations", () => {
    it("shows My Communities section when user has organizations", async () => {
      setupDefaultMocks({
        organizations: [{ id: 1, name: "Pallet Town", slug: "pallet-town" }],
      });
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      expect(await screen.findByText("My Communities")).toBeInTheDocument();
      expect(screen.getByText("Pallet Town")).toBeInTheDocument();
    });

    it("links community to /dashboard/community/:slug", async () => {
      setupDefaultMocks({
        organizations: [{ id: 1, name: "Pallet Town", slug: "pallet-town" }],
      });
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      const communityLink = await screen.findByRole("link", {
        name: /pallet town/i,
      });
      expect(communityLink).toHaveAttribute(
        "href",
        "/dashboard/community/pallet-town"
      );
    });

    it("does not show My Communities section when user has no organizations", async () => {
      setupDefaultMocks({ organizations: [] });
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      expect(screen.queryByText("My Communities")).not.toBeInTheDocument();
    });

  });

  // --------------------------------------------------------------------------
  // Sudo mode
  // --------------------------------------------------------------------------

  describe("sudo mode", () => {
    it("does not show Sudo Mode option for non-admins", async () => {
      setupDefaultMocks();
      render(<TopNavAuthSection />);
      await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
      expect(screen.queryByText(/sudo mode/i)).not.toBeInTheDocument();
    });

  });
});
