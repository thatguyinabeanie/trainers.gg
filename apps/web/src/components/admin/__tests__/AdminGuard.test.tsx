import { render, screen } from "@testing-library/react";
import AdminGuard from "../AdminGuard";
import { PERMISSIONS } from "@trainers/utils";

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

type UsePermissionsReturn = {
  permissions: Record<string, boolean>;
  isLoading: boolean;
  user: unknown;
};

let mockUsePermissionsReturn: UsePermissionsReturn = {
  permissions: {},
  isLoading: false,
  user: null,
};

jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => mockUsePermissionsReturn,
}));

function adminUser() {
  return { id: "u1", alt: { id: 1, username: "admin" } };
}

function adminPermissions(overrides: Record<string, boolean> = {}) {
  return {
    [PERMISSIONS.COMMUNITY_MANAGE_REQUESTS]: true,
    [PERMISSIONS.ROLE_CREATE]: false,
    [PERMISSIONS.ROLE_VIEW_ALL]: false,
    [PERMISSIONS.ROLE_UPDATE]: false,
    [PERMISSIONS.PERMISSION_CREATE]: false,
    [PERMISSIONS.PERMISSION_VIEW_ALL]: false,
    [PERMISSIONS.ADMIN_MANAGE_TEMPLATES]: false,
    [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS]: false,
    ...overrides,
  };
}

describe("AdminGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePermissionsReturn = {
      permissions: {},
      isLoading: false,
      user: null,
    };
  });

  it("renders loading skeletons when isLoading is true", () => {
    mockUsePermissionsReturn = {
      permissions: {},
      isLoading: true,
      user: null,
    };
    render(
      <AdminGuard>
        <div>Protected</div>
      </AdminGuard>
    );
    // children should not be visible
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders null and redirects to sign-in when not loading and user is null", () => {
    mockUsePermissionsReturn = {
      permissions: {},
      isLoading: false,
      user: null,
    };
    render(
      <AdminGuard>
        <div>Protected</div>
      </AdminGuard>
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/sign-in");
  });

  it("shows Profile Required alert when user has no alt", () => {
    mockUsePermissionsReturn = {
      permissions: adminPermissions(),
      isLoading: false,
      user: { id: "u1", alt: null },
    };
    render(
      <AdminGuard>
        <div>Protected</div>
      </AdminGuard>
    );
    expect(screen.getByText("Profile Required")).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("shows Access Denied alert when user has no admin permissions", () => {
    mockUsePermissionsReturn = {
      permissions: adminPermissions({
        [PERMISSIONS.COMMUNITY_MANAGE_REQUESTS]: false,
      }),
      isLoading: false,
      user: adminUser(),
    };
    render(
      <AdminGuard>
        <div>Protected</div>
      </AdminGuard>
    );
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders children when user has admin access", () => {
    mockUsePermissionsReturn = {
      permissions: adminPermissions(),
      isLoading: false,
      user: adminUser(),
    };
    render(
      <AdminGuard>
        <div>Protected Content</div>
      </AdminGuard>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("blocks access when required permission is missing", () => {
    const specificPerm = PERMISSIONS.ROLE_CREATE;
    mockUsePermissionsReturn = {
      permissions: adminPermissions({
        [specificPerm]: false,
      }),
      isLoading: false,
      user: adminUser(),
    };
    render(
      <AdminGuard requiredPermissions={[specificPerm]}>
        <div>Protected</div>
      </AdminGuard>
    );
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("renders children when all required permissions are satisfied", () => {
    const specificPerm = PERMISSIONS.ROLE_CREATE;
    mockUsePermissionsReturn = {
      permissions: adminPermissions({ [specificPerm]: true }),
      isLoading: false,
      user: adminUser(),
    };
    render(
      <AdminGuard requiredPermissions={[specificPerm]}>
        <div>Protected Content</div>
      </AdminGuard>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it.each([
    [PERMISSIONS.ROLE_CREATE],
    [PERMISSIONS.ROLE_VIEW_ALL],
    [PERMISSIONS.ROLE_UPDATE],
    [PERMISSIONS.PERMISSION_CREATE],
    [PERMISSIONS.PERMISSION_VIEW_ALL],
    [PERMISSIONS.ADMIN_MANAGE_TEMPLATES],
    [PERMISSIONS.ADMIN_VIEW_AUDIT_LOGS],
  ])("grants admin access when %s permission is granted", (permKey) => {
    mockUsePermissionsReturn = {
      permissions: {
        ...adminPermissions({ [PERMISSIONS.COMMUNITY_MANAGE_REQUESTS]: false }),
        [permKey]: true,
      },
      isLoading: false,
      user: adminUser(),
    };
    render(
      <AdminGuard key={permKey}>
        <div>Protected Content</div>
      </AdminGuard>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
