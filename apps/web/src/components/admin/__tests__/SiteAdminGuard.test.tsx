import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import SiteAdminGuard from "../SiteAdminGuard";
import { useSiteAdmin } from "@/hooks/use-site-admin";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/use-site-admin", () => ({
  useSiteAdmin: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSiteAdmin = useSiteAdmin as jest.MockedFunction<
  typeof useSiteAdmin
>;

describe("SiteAdminGuard", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockUser = {
    id: "user-123",
    email: "siteadmin@trainers.local",
    aud: "authenticated",
    role: "authenticated",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  describe("Loading state", () => {
    it("shows skeleton when loading", () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: true,
        user: null,
      });

      render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      // Should show skeleton, not content
      expect(screen.queryByText("Site Admin Content")).not.toBeInTheDocument();
      // Check for skeleton container
      expect(document.querySelector(".container.mx-auto")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated user", () => {
    it("redirects to sign-in when user is not authenticated", async () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: false,
        user: null,
      });

      render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      // Should redirect and not render content
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in");
      });
      expect(screen.queryByText("Site Admin Content")).not.toBeInTheDocument();
    });

    it("uses hasRedirected ref to prevent multiple redirects", async () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: false,
        user: null,
      });

      const { rerender } = render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      });

      // Re-render should not trigger another redirect
      rerender(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
  });

  describe("Authenticated user without site admin role", () => {
    it("shows access denied when user is not a site admin", () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: ["user"],
        isSiteAdmin: false,
        isLoading: false,
        user: mockUser as any,
      });

      render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText(/You don't have site administrator privileges/)
      ).toBeInTheDocument();
      expect(screen.queryByText("Site Admin Content")).not.toBeInTheDocument();
    });

    it("shows access denied with correct error message", () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: false,
        user: mockUser as any,
      });

      render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(
        screen.getByText(
          /Please contact a site administrator if you believe this is an error/
        )
      ).toBeInTheDocument();
    });

    it("renders ShieldOff icon in access denied alert", () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: false,
        user: mockUser as any,
      });

      const { container } = render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      // Check for lucide icon class
      const icon = container.querySelector("svg.lucide-shield-off");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Authenticated site admin", () => {
    it("renders children when user is a site admin", () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: ["site_admin"],
        isSiteAdmin: true,
        isLoading: false,
        user: mockUser as any,
      });

      render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(screen.getByText("Site Admin Content")).toBeInTheDocument();
    });

    it("renders children when user has site_admin role among other roles", () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: ["user", "site_admin", "moderator"],
        isSiteAdmin: true,
        isLoading: false,
        user: mockUser as any,
      });

      render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(screen.getByText("Site Admin Content")).toBeInTheDocument();
    });

    it("renders complex children correctly", () => {
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: ["site_admin"],
        isSiteAdmin: true,
        isLoading: false,
        user: mockUser as any,
      });

      render(
        <SiteAdminGuard>
          <div>
            <h1>Site Admin Dashboard</h1>
            <p>Manage all aspects of the platform</p>
            <button>Create Role</button>
          </div>
        </SiteAdminGuard>
      );

      expect(screen.getByText("Site Admin Dashboard")).toBeInTheDocument();
      expect(
        screen.getByText("Manage all aspects of the platform")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Role" })
      ).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles transition from loading to unauthenticated", async () => {
      const { rerender } = render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      // Start with loading
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: true,
        user: null,
      });

      rerender(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(screen.queryByText("Site Admin Content")).not.toBeInTheDocument();

      // Transition to not authenticated
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: false,
        user: null,
      });

      rerender(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in");
      });
    });

    it("handles transition from loading to authenticated site admin", () => {
      const { rerender } = render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      // Start with loading
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: true,
        user: null,
      });

      rerender(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(screen.queryByText("Site Admin Content")).not.toBeInTheDocument();

      // Transition to authenticated site admin
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: ["site_admin"],
        isSiteAdmin: true,
        isLoading: false,
        user: mockUser as any,
      });

      rerender(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(screen.getByText("Site Admin Content")).toBeInTheDocument();
    });

    it("handles transition from loading to non-admin user", () => {
      const { rerender } = render(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      // Start with loading
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: [],
        isSiteAdmin: false,
        isLoading: true,
        user: null,
      });

      rerender(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      // Transition to non-admin user
      mockUseSiteAdmin.mockReturnValue({
        siteRoles: ["user"],
        isSiteAdmin: false,
        isLoading: false,
        user: mockUser as any,
      });

      rerender(
        <SiteAdminGuard>
          <div>Site Admin Content</div>
        </SiteAdminGuard>
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByText("Site Admin Content")).not.toBeInTheDocument();
    });
  });
});
