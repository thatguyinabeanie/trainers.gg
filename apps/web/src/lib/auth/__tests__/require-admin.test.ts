/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock getUser from supabase server
const mockGetUser = jest.fn();

// Mock the service role client — chain: supabase.from("user_roles").select(...).eq(...).eq(...).maybeSingle()
const mockServiceMaybeSingle = jest.fn();
const mockServiceEq2 = jest
  .fn()
  .mockReturnValue({ maybeSingle: mockServiceMaybeSingle });
const mockServiceEq = jest.fn().mockReturnValue({ eq: mockServiceEq2 });
const mockServiceSelect = jest.fn().mockReturnValue({ eq: mockServiceEq });
const mockServiceFrom = jest
  .fn()
  .mockReturnValue({ select: mockServiceSelect });
const mockServiceClient = { from: mockServiceFrom };

// Mock createClient — returns an object with auth methods (not used directly in requireAdminWithSudo,
// but isSudoModeActive receives it)
const mockAuthClient = { rpc: jest.fn() };

jest.mock("@/lib/supabase/server", () => ({
  getUser: (...args: unknown[]) => mockGetUser(...args),
  createServiceRoleClient: jest.fn(() => mockServiceClient),
  createClient: jest.fn().mockResolvedValue(mockAuthClient),
}));

// Mock next/headers cookies
const mockCookieGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({ get: mockCookieGet }),
}));

// Mock isSudoModeActive from @trainers/supabase
jest.mock("@trainers/supabase", () => ({
  isSudoModeActive: jest.fn(),
}));

// Import after mocks are declared
import { requireAdminWithSudo } from "../require-admin";
import { isSudoModeActive } from "@trainers/supabase";

// Cast to jest.Mock for type-safe mock API access
const mockIsSudoModeActive = isSudoModeActive as jest.Mock;

// --- Constants ---
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";

// --- Tests ---

describe("requireAdminWithSudo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user is authenticated
    mockGetUser.mockResolvedValue({ id: ADMIN_USER_ID });
    // Default: user has site_admin role
    mockServiceMaybeSingle.mockResolvedValue({
      data: { role_id: 1, roles: { name: "site_admin" } },
    });
    // Default: sudo cookie is present
    mockCookieGet.mockReturnValue({ value: "sudo-session-id-123" });
    // Default: sudo mode is active in the database
    mockIsSudoModeActive.mockResolvedValue(true);
  });

  it("returns userId when authenticated, has site_admin role, and sudo is active", async () => {
    const result = await requireAdminWithSudo();

    expect(result).toEqual({ userId: ADMIN_USER_ID });
    // Verify the admin role was checked via service role client
    expect(mockServiceFrom).toHaveBeenCalledWith("user_roles");
    expect(mockServiceSelect).toHaveBeenCalledWith(
      "role_id, roles!inner(name)"
    );
    expect(mockServiceEq).toHaveBeenCalledWith("user_id", ADMIN_USER_ID);
    expect(mockServiceEq2).toHaveBeenCalledWith("roles.name", "site_admin");
    // Verify sudo mode was checked
    expect(mockIsSudoModeActive).toHaveBeenCalledWith(mockAuthClient);
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await requireAdminWithSudo();

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    // Should not check admin role or sudo mode
    expect(mockServiceFrom).not.toHaveBeenCalled();
    expect(mockIsSudoModeActive).not.toHaveBeenCalled();
  });

  it("returns error when authenticated but no site_admin role", async () => {
    mockServiceMaybeSingle.mockResolvedValue({ data: null });

    const result = await requireAdminWithSudo();

    expect(result).toEqual({ success: false, error: "Admin access required" });
    // Should not check sudo mode
    expect(mockIsSudoModeActive).not.toHaveBeenCalled();
  });

  it("returns error when no sudo cookie is present", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const result = await requireAdminWithSudo();

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    // Should not call the database check
    expect(mockIsSudoModeActive).not.toHaveBeenCalled();
  });

  it("returns error when sudo cookie has empty value", async () => {
    mockCookieGet.mockReturnValue({ value: "" });

    const result = await requireAdminWithSudo();

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockIsSudoModeActive).not.toHaveBeenCalled();
  });

  it("returns error when sudo session is expired", async () => {
    mockIsSudoModeActive.mockResolvedValue(false);

    const result = await requireAdminWithSudo();

    expect(result).toEqual({ success: false, error: "Sudo session expired" });
  });

  it("returns error when sudo session verification throws", async () => {
    mockIsSudoModeActive.mockRejectedValue(new Error("RPC failed"));

    const result = await requireAdminWithSudo();

    expect(result).toEqual({
      success: false,
      error: "Failed to verify sudo session",
    });
  });
});
