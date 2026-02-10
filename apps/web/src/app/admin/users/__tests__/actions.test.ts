/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock the auth check
jest.mock("@/lib/auth/require-admin", () => ({
  requireAdminWithSudo: jest.fn(),
}));

// Mock the Supabase service role client — the from() chain is configured per-test
// Chain: supabase.from("roles").select("name").eq("id", roleId).maybeSingle()
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
const mockServiceClient = { from: mockFrom };

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceClient),
}));

// Mock the Supabase query functions
jest.mock("@trainers/supabase", () => ({
  suspendUser: jest.fn(),
  unsuspendUser: jest.fn(),
  grantSiteRole: jest.fn(),
  revokeSiteRole: jest.fn(),
}));

// Import after mocks are declared
import {
  suspendUserAction,
  unsuspendUserAction,
  grantSiteRoleAction,
  revokeSiteRoleAction,
} from "../actions";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  suspendUser,
  unsuspendUser,
  grantSiteRole,
  revokeSiteRole,
} from "@trainers/supabase";

// Cast to jest.Mock for type-safe mock API access
const mockRequireAdminWithSudo = requireAdminWithSudo as jest.Mock;
const mockSuspendUser = suspendUser as jest.Mock;
const mockUnsuspendUser = unsuspendUser as jest.Mock;
const mockGrantSiteRole = grantSiteRole as jest.Mock;
const mockRevokeSiteRole = revokeSiteRole as jest.Mock;

// --- Constants ---
const ADMIN_USER_ID = "admin-123";
const TARGET_USER_ID = "target-456";

// --- Tests ---

describe("suspendUserAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: admin auth succeeds
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockSuspendUser.mockResolvedValue(undefined);
  });

  it("suspends a user successfully", async () => {
    const result = await suspendUserAction(TARGET_USER_ID, "Violated rules");

    expect(result).toEqual({ success: true });
    expect(mockSuspendUser).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      ADMIN_USER_ID,
      "Violated rules"
    );
  });

  it("suspends a user without a reason", async () => {
    const result = await suspendUserAction(TARGET_USER_ID);

    expect(result).toEqual({ success: true });
    expect(mockSuspendUser).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      ADMIN_USER_ID,
      undefined
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await suspendUserAction(TARGET_USER_ID);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    // Should never reach the query function
    expect(mockSuspendUser).not.toHaveBeenCalled();
  });

  it("prevents suspending your own account", async () => {
    const result = await suspendUserAction(ADMIN_USER_ID);

    expect(result).toEqual({
      success: false,
      error: "Cannot suspend your own account",
    });
    expect(mockSuspendUser).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws", async () => {
    mockSuspendUser.mockRejectedValue(new Error("DB failure"));

    const result = await suspendUserAction(TARGET_USER_ID);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});

describe("unsuspendUserAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockUnsuspendUser.mockResolvedValue(undefined);
  });

  it("unsuspends a user successfully", async () => {
    const result = await unsuspendUserAction(TARGET_USER_ID);

    expect(result).toEqual({ success: true });
    expect(mockUnsuspendUser).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo mode required",
    });

    const result = await unsuspendUserAction(TARGET_USER_ID);

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockUnsuspendUser).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws", async () => {
    mockUnsuspendUser.mockRejectedValue(new Error("DB failure"));

    const result = await unsuspendUserAction(TARGET_USER_ID);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});

describe("grantSiteRoleAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockGrantSiteRole.mockResolvedValue({ success: true });
  });

  it("grants a site role successfully", async () => {
    const result = await grantSiteRoleAction(TARGET_USER_ID, 1);

    expect(result).toEqual({ success: true });
    expect(mockGrantSiteRole).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      1
    );
  });

  it("returns the result from the query function (including errors)", async () => {
    mockGrantSiteRole.mockResolvedValue({
      success: false,
      error: "Role already assigned",
    });

    const result = await grantSiteRoleAction(TARGET_USER_ID, 1);

    expect(result).toEqual({
      success: false,
      error: "Role already assigned",
    });
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Admin access required",
    });

    const result = await grantSiteRoleAction(TARGET_USER_ID, 1);

    expect(result).toEqual({ success: false, error: "Admin access required" });
    expect(mockGrantSiteRole).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws", async () => {
    mockGrantSiteRole.mockRejectedValue(new Error("DB failure"));

    const result = await grantSiteRoleAction(TARGET_USER_ID, 1);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});

describe("revokeSiteRoleAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockRevokeSiteRole.mockResolvedValue({ success: true });
    // Default: role lookup returns a non-admin role
    mockMaybeSingle.mockResolvedValue({ data: { name: "moderator" } });
  });

  it("revokes a site role from another user successfully", async () => {
    const result = await revokeSiteRoleAction(TARGET_USER_ID, 1);

    expect(result).toEqual({ success: true });
    expect(mockRevokeSiteRole).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      1
    );
  });

  it("allows revoking a non-admin role from yourself", async () => {
    // The role is "moderator", not "site_admin"
    mockMaybeSingle.mockResolvedValue({ data: { name: "moderator" } });

    const result = await revokeSiteRoleAction(ADMIN_USER_ID, 2);

    expect(result).toEqual({ success: true });
    expect(mockRevokeSiteRole).toHaveBeenCalledWith(
      mockServiceClient,
      ADMIN_USER_ID,
      2
    );
  });

  it("prevents revoking your own site_admin role", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { name: "site_admin" } });

    const result = await revokeSiteRoleAction(ADMIN_USER_ID, 1);

    expect(result).toEqual({
      success: false,
      error: "Cannot remove your own site_admin role",
    });
    expect(mockRevokeSiteRole).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo session expired",
    });

    const result = await revokeSiteRoleAction(TARGET_USER_ID, 1);

    expect(result).toEqual({ success: false, error: "Sudo session expired" });
    expect(mockRevokeSiteRole).not.toHaveBeenCalled();
  });

  it("returns a generic error when the query throws", async () => {
    mockRevokeSiteRole.mockRejectedValue(new Error("DB failure"));

    const result = await revokeSiteRoleAction(TARGET_USER_ID, 1);

    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred",
    });
  });
});
