import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { User } from "@supabase/supabase-js";
import { TopNavAuthSection } from "../topnav-auth-section";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupabaseQuery } from "@/lib/supabase";
import { toggleSudoMode, checkSudoStatus } from "@/lib/sudo/actions";
import { toast } from "sonner";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: jest.fn(),
  getUserDisplayName: jest.fn(
    (user) => user?.profile?.displayName || user?.email || "Trainer"
  ),
}));

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/sudo/actions", () => ({
  toggleSudoMode: jest.fn(),
  checkSudoStatus: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../notification-bell", () => ({
  NotificationBell: ({ userId }: { userId: string }) => (
    <div data-testid="notification-bell">{userId}</div>
  ),
}));

jest.mock("../theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher">Theme Switcher</div>,
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSupabaseQuery = useSupabaseQuery as jest.MockedFunction<
  typeof useSupabaseQuery
>;
const mockToggleSudoMode = toggleSudoMode as jest.MockedFunction<
  typeof toggleSudoMode
>;
const mockCheckSudoStatus = checkSudoStatus as jest.MockedFunction<
  typeof checkSudoStatus
>;

describe("TopNavAuthSection", () => {
  const mockRouter: AppRouterInstance = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  } as unknown as AppRouterInstance;

  const mockUser: User & {
    profile?: { displayName?: string; avatarUrl?: string };
  } = {
    id: "user-123",
    email: "player@trainers.local",
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
    profile: {
      displayName: "Test Player",
      avatarUrl: "https://example.com/avatar.jpg",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockCheckSudoStatus.mockResolvedValue({
      isActive: false,
      isSiteAdmin: false,
    });
  });

  describe("Loading state", () => {
    it("shows skeleton when loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      render(<TopNavAuthSection />);

      // Check for skeleton elements
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Unauthenticated state", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
    });

    it("shows Sign In and Sign Up buttons", () => {
      render(<TopNavAuthSection />);

      expect(
        screen.getByRole("link", { name: /sign in/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /sign up/i })
      ).toBeInTheDocument();
    });

    it("renders theme switcher for unauthenticated users", () => {
      render(<TopNavAuthSection />);

      expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
    });

    it("does not show notification bell for unauthenticated users", () => {
      render(<TopNavAuthSection />);

      expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument();
    });

    it("Sign In link has correct href", () => {
      render(<TopNavAuthSection />);

      const signInLink = screen.getByRole("link", { name: /sign in/i });
      expect(signInLink).toHaveAttribute("href", "/sign-in");
    });

    it("Sign Up link has correct href", () => {
      render(<TopNavAuthSection />);

      const signUpLink = screen.getByRole("link", { name: /sign up/i });
      expect(signUpLink).toHaveAttribute("href", "/sign-up");
    });
  });

  describe("Authenticated state", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isAuthenticated: true,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it("renders user avatar and display name", () => {
      render(<TopNavAuthSection />);

      expect(screen.getByText("Test Player")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /user menu/i })
      ).toBeInTheDocument();
    });

    it("renders notification bell with user ID", () => {
      render(<TopNavAuthSection />);

      const notificationBell = screen.getByTestId("notification-bell");
      expect(notificationBell).toBeInTheDocument();
      expect(notificationBell).toHaveTextContent("user-123");
    });

    it("renders theme switcher for authenticated users", () => {
      render(<TopNavAuthSection />);

      expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
    });

    it("opens user dropdown when avatar is clicked", async () => {
      const user = userEvent.setup();
      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("My Alts")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    it("navigates to dashboard when Dashboard menu item is clicked", async () => {
      const user = userEvent.setup();
      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      const dashboardItem = screen.getByText("Dashboard");
      await user.click(dashboardItem);

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });

    it("navigates to alts when My Alts menu item is clicked", async () => {
      const user = userEvent.setup();
      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      const altsItem = screen.getByText("My Alts");
      await user.click(altsItem);

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/alts");
    });

    it("navigates to settings when Settings menu item is clicked", async () => {
      const user = userEvent.setup();
      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      const settingsItem = screen.getByText("Settings");
      await user.click(settingsItem);

      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/settings");
    });

    it("calls signOut and redirects when Sign out is clicked", async () => {
      const user = userEvent.setup();
      const mockSignOut = jest.fn().mockResolvedValue(undefined);
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isAuthenticated: true,
        signOut: mockSignOut,
        refetchUser: jest.fn(),
      });

      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      const signOutItem = screen.getByText("Sign out");
      await user.click(signOutItem);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("Organizations", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isAuthenticated: true,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
    });

    it("shows organizations section when user has organizations", async () => {
      const mockOrgs = [
        { id: 1, name: "Test Org 1", slug: "test-org-1" },
        { id: 2, name: "Test Org 2", slug: "test-org-2" },
      ];

      mockUseSupabaseQuery.mockReturnValue({
        data: mockOrgs,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      expect(screen.getByText("My Organizations")).toBeInTheDocument();
      expect(screen.getByText("Test Org 1")).toBeInTheDocument();
      expect(screen.getByText("Test Org 2")).toBeInTheDocument();
    });

    it("does not show organizations section when user has no organizations", async () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      expect(screen.queryByText("My Organizations")).not.toBeInTheDocument();
    });

    it("navigates to organization dashboard when org is clicked", async () => {
      const mockOrgs = [{ id: 1, name: "Test Org", slug: "test-org" }];

      mockUseSupabaseQuery.mockReturnValue({
        data: mockOrgs,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      const orgItem = screen.getByText("Test Org");
      await user.click(orgItem);

      expect(mockRouter.push).toHaveBeenCalledWith("/to-dashboard/test-org");
    });
  });

  describe("Sudo mode", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isAuthenticated: true,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it("shows sudo mode toggle for site admins", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: true,
      });

      const user = userEvent.setup();
      const { rerender } = render(<TopNavAuthSection />);

      // Wait for checkSudoStatus to be called
      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalled();
      });

      rerender(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/Sudo Mode/)).toBeInTheDocument();
      });
    });

    it("does not show sudo mode toggle for non-site admins", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: false,
      });

      const user = userEvent.setup();
      render(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.queryByText(/Sudo Mode/)).not.toBeInTheDocument();
      });
    });

    it("activates sudo mode when toggle is clicked", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: true,
      });
      mockToggleSudoMode.mockResolvedValue({ success: true, isActive: true });

      const user = userEvent.setup();
      const { rerender } = render(<TopNavAuthSection />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalled();
      });

      rerender(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      const sudoToggle = await screen.findByText(/Sudo Mode.*Inactive/);
      await user.click(sudoToggle);

      await waitFor(() => {
        expect(mockToggleSudoMode).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Sudo mode activated", {
          description: "You now have elevated admin permissions.",
        });
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it("deactivates sudo mode when toggle is clicked while active", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: true,
        isSiteAdmin: true,
      });
      mockToggleSudoMode.mockResolvedValue({ success: true, isActive: false });

      const user = userEvent.setup();
      const { rerender } = render(<TopNavAuthSection />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalled();
      });

      rerender(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      const sudoToggle = await screen.findByText(/Sudo Mode.*Active/);
      await user.click(sudoToggle);

      await waitFor(() => {
        expect(mockToggleSudoMode).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Sudo mode deactivated", {
          description: "Admin permissions have been revoked.",
        });
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it("shows error toast when sudo mode toggle fails", async () => {
      mockCheckSudoStatus.mockResolvedValue({
        isActive: false,
        isSiteAdmin: true,
      });
      mockToggleSudoMode.mockResolvedValue({
        success: false,
        error: "Not authorized",
      });

      const user = userEvent.setup();
      const { rerender } = render(<TopNavAuthSection />);

      await waitFor(() => {
        expect(mockCheckSudoStatus).toHaveBeenCalled();
      });

      rerender(<TopNavAuthSection />);

      const trigger = screen.getByRole("button", { name: /user menu/i });
      await user.click(trigger);

      const sudoToggle = await screen.findByText(/Sudo Mode.*Inactive/);
      await user.click(sudoToggle);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Error", {
          description: "Not authorized",
        });
      });
    });
  });

  describe("Avatar display", () => {
    it("displays avatar image when avatarUrl is available", () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        isAuthenticated: true,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TopNavAuthSection />);

      const avatar = screen.getByAltText("Test Player");
      expect(avatar).toHaveAttribute(
        "src",
        expect.stringContaining("avatar.jpg")
      );
    });

    it("displays fallback initial when no avatar URL", () => {
      const userWithoutAvatar: typeof mockUser = {
        ...mockUser,
        profile: {
          displayName: "Test Player",
          avatarUrl: undefined,
        },
      };

      mockUseAuth.mockReturnValue({
        user: userWithoutAvatar,
        loading: false,
        isAuthenticated: true,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TopNavAuthSection />);

      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("uses user_metadata avatar_url as fallback", () => {
      const userWithMetadataAvatar: User = {
        id: "user-123",
        email: "player@trainers.local",
        aud: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {
          avatar_url: "https://example.com/metadata-avatar.jpg",
        },
      };

      mockUseAuth.mockReturnValue({
        user: userWithMetadataAvatar,
        loading: false,
        isAuthenticated: true,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });
      mockUseSupabaseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<TopNavAuthSection />);

      const avatar = screen.getByAltText(/trainer/i);
      expect(avatar).toHaveAttribute(
        "src",
        expect.stringContaining("metadata-avatar.jpg")
      );
    });
  });
});
