import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import AdminGuard from "../AdminGuard";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@trainers/utils";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePermissions = usePermissions as jest.MockedFunction<
  typeof usePermissions
>;

describe("AdminGuard", () => {
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
    email: "admin@trainers.local",
    alt: {
      id: 1,
      username: "test_admin",
      display_name: "Test Admin",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as Partial<AppRouterInstance>);
  });

  describe("Loading state", () => {
    it("shows skeleton when loading", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {},
        isLoading: true,
        user: null,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      // Should show skeleton, not content
      expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
      // Check for skeleton container
      expect(document.querySelector(".container.mx-auto")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated user", () => {
    it("redirects to sign-in when user is not authenticated", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {},
        isLoading: false,
        user: null,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      // Should redirect and not render content
      waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith("/sign-in");
      });
      expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    });
  });

  describe("User without alt", () => {
    it("shows profile required alert when user has no alt", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {},
        isLoading: false,
        user: { ...mockUser, alt: null },
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Profile Required")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Please complete your profile setup to access admin features."
        )
      ).toBeInTheDocument();
      expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    });
  });

  describe("User without admin permissions", () => {
    it("shows access denied when user lacks admin permissions", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {
          [PERMISSIONS.ORG_MANAGE_REQUESTS]: false,
          [PERMISSIONS.ROLE_CREATE]: false,
          [PERMISSIONS.ROLE_VIEW_ALL]: false,
          [PERMISSIONS.ROLE_UPDATE]: false,
          [PERMISSIONS.PERMISSION_CREATE]: false,
          [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
          [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: false,
          [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
        },
        isLoading: false,
        user: mockUser,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText(/You don't have permission to access this admin area/)
      ).toBeInTheDocument();
      expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    });
  });

  describe("User with admin permissions", () => {
    it("renders children when user has ORG_MANAGE_REQUESTS permission", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {
          [PERMISSIONS.ORG_MANAGE_REQUESTS]: true,
          [PERMISSIONS.ROLE_CREATE]: false,
          [PERMISSIONS.ROLE_VIEW_ALL]: false,
          [PERMISSIONS.ROLE_UPDATE]: false,
          [PERMISSIONS.PERMISSION_CREATE]: false,
          [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
          [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: false,
          [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
        },
        isLoading: false,
        user: mockUser,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    it("renders children when user has ROLE_CREATE permission", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {
          [PERMISSIONS.ORG_MANAGE_REQUESTS]: false,
          [PERMISSIONS.ROLE_CREATE]: true,
          [PERMISSIONS.ROLE_VIEW_ALL]: false,
          [PERMISSIONS.ROLE_UPDATE]: false,
          [PERMISSIONS.PERMISSION_CREATE]: false,
          [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
          [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: false,
          [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
        },
        isLoading: false,
        user: mockUser,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    it("renders children when user has ADMIN_MANAGE_TEMPLATES permission", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {
          [PERMISSIONS.ORG_MANAGE_REQUESTS]: false,
          [PERMISSIONS.ROLE_CREATE]: false,
          [PERMISSIONS.ROLE_VIEW_ALL]: false,
          [PERMISSIONS.ROLE_UPDATE]: false,
          [PERMISSIONS.PERMISSION_CREATE]: false,
          [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
          [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: true,
          [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
        },
        isLoading: false,
        user: mockUser,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    it("renders children when user has multiple admin permissions", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {
          [PERMISSIONS.ORG_MANAGE_REQUESTS]: true,
          [PERMISSIONS.ROLE_CREATE]: true,
          [PERMISSIONS.ROLE_VIEW_ALL]: true,
          [PERMISSIONS.ROLE_UPDATE]: false,
          [PERMISSIONS.PERMISSION_CREATE]: false,
          [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
          [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: false,
          [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
        },
        isLoading: false,
        user: mockUser,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });
  });

  describe("Required permissions", () => {
    it("shows access denied when user lacks required permissions", () => {
      const requiredPermissions = [PERMISSIONS.PERMISSION_CREATE];

      mockUsePermissions.mockReturnValue({
        permissions: {
          [PERMISSIONS.ORG_MANAGE_REQUESTS]: true,
          [PERMISSIONS.ROLE_CREATE]: false,
          [PERMISSIONS.ROLE_VIEW_ALL]: false,
          [PERMISSIONS.ROLE_UPDATE]: false,
          [PERMISSIONS.PERMISSION_CREATE]: false,
          [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
          [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: false,
          [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
        },
        isLoading: false,
        user: mockUser,
      });

      render(
        <AdminGuard requiredPermissions={requiredPermissions}>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    });

    it("renders children when user has all required permissions", () => {
      const requiredPermissions = [
        PERMISSIONS.PERMISSION_CREATE,
        PERMISSIONS.ROLE_CREATE,
      ];

      mockUsePermissions.mockReturnValue({
        permissions: {
          [PERMISSIONS.ORG_MANAGE_REQUESTS]: true,
          [PERMISSIONS.ROLE_CREATE]: true,
          [PERMISSIONS.ROLE_VIEW_ALL]: false,
          [PERMISSIONS.ROLE_UPDATE]: false,
          [PERMISSIONS.PERMISSION_CREATE]: true,
          [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
          [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: false,
          [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
        },
        isLoading: false,
        user: mockUser,
      });

      render(
        <AdminGuard requiredPermissions={requiredPermissions}>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    it("renders children when no required permissions specified and user has admin access", () => {
      mockUsePermissions.mockReturnValue({
        permissions: {
          [PERMISSIONS.ORG_MANAGE_REQUESTS]: true,
          [PERMISSIONS.ROLE_CREATE]: false,
          [PERMISSIONS.ROLE_VIEW_ALL]: false,
          [PERMISSIONS.ROLE_UPDATE]: false,
          [PERMISSIONS.PERMISSION_CREATE]: false,
          [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
          [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: false,
          [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
        },
        isLoading: false,
        user: mockUser,
      });

      render(
        <AdminGuard requiredPermissions={[]}>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });
  });
});
