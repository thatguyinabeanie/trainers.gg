/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock the auth check
jest.mock("@/lib/auth/require-admin", () => ({
  requireAdminWithSudo: jest.fn(),
}));

// Mock the Supabase service role client — the from() chain is configured per-test
//
// "users" chain: supabase.from("users").select("id, username").eq("id", targetUserId).maybeSingle()
// "impersonation_sessions" chain: supabase.from("impersonation_sessions").update({...}).eq("admin_user_id", ...).is("ended_at", null)
const mockMaybeSingle = jest.fn();
const mockUsersEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockUsersEq });

// For the .update().eq().is() chain (ending previous sessions)
const mockIs = jest.fn();
const mockUpdateEq = jest.fn().mockReturnValue({ is: mockIs });
const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

const mockFrom = jest.fn().mockImplementation((table: string) => {
  if (table === "impersonation_sessions") {
    return { update: mockUpdate };
  }
  // Default: "users" table
  return { select: mockSelect };
});
const mockServiceClient = { from: mockFrom };

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceClient),
}));

// Mock the Supabase query functions
jest.mock("@trainers/supabase", () => ({
  startImpersonation: jest.fn(),
  endImpersonation: jest.fn(),
  isSiteAdmin: jest.fn(),
}));

// Mock the impersonation server utilities
jest.mock("../server", () => ({
  setImpersonationCookie: jest.fn(),
  clearImpersonationCookie: jest.fn(),
  getImpersonationTarget: jest.fn(),
}));

// Mock next/headers
const mockGet = jest.fn();
jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue({ get: mockGet }),
}));

// Import after mocks are declared
import { startImpersonationAction, endImpersonationAction } from "../actions";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  startImpersonation,
  endImpersonation,
  isSiteAdmin,
} from "@trainers/supabase";
import {
  setImpersonationCookie,
  clearImpersonationCookie,
  getImpersonationTarget,
} from "../server";

// Cast to jest.Mock for type-safe mock API access
const mockRequireAdminWithSudo = requireAdminWithSudo as jest.Mock;
const mockStartImpersonation = startImpersonation as jest.Mock;
const mockEndImpersonation = endImpersonation as jest.Mock;
const mockIsSiteAdmin = isSiteAdmin as jest.Mock;
const mockSetImpersonationCookie = setImpersonationCookie as jest.Mock;
const mockClearImpersonationCookie = clearImpersonationCookie as jest.Mock;
const mockGetImpersonationTarget = getImpersonationTarget as jest.Mock;

// --- Constants ---
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";
const TARGET_USER_ID = "00000000-0000-0000-0000-000000000002";

// --- Tests ---

describe("startImpersonationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: admin auth succeeds
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    // Default: target user exists
    mockMaybeSingle.mockResolvedValue({
      data: { id: TARGET_USER_ID, username: "player1" },
    });
    // Default: target is not a site admin
    mockIsSiteAdmin.mockResolvedValue(false);
    // Default: ending previous sessions succeeds
    mockIs.mockResolvedValue({ error: null });
    // Default: headers return reasonable values
    mockGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return "192.168.1.1";
      if (name === "user-agent") return "TestBrowser/1.0";
      return null;
    });
    // Default: startImpersonation succeeds
    mockStartImpersonation.mockResolvedValue({ id: 42 });
    // Default: setImpersonationCookie succeeds
    mockSetImpersonationCookie.mockResolvedValue(undefined);
  });

  it("starts impersonation successfully", async () => {
    const result = await startImpersonationAction(
      TARGET_USER_ID,
      "Debugging user issue"
    );

    expect(result).toEqual({ success: true });
    // Verify target user was looked up
    expect(mockFrom).toHaveBeenCalledWith("users");
    // Verify target admin check
    expect(mockIsSiteAdmin).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID
    );
    // Verify previous sessions were ended
    expect(mockFrom).toHaveBeenCalledWith("impersonation_sessions");
    // Verify startImpersonation was called with correct args
    expect(mockStartImpersonation).toHaveBeenCalledWith(
      mockServiceClient,
      ADMIN_USER_ID,
      TARGET_USER_ID,
      "Debugging user issue",
      "192.168.1.1",
      "TestBrowser/1.0"
    );
    // Verify cookie was set
    expect(mockSetImpersonationCookie).toHaveBeenCalledWith(42);
  });

  it("returns an error when not authenticated", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    // Should never reach the query functions
    expect(mockStartImpersonation).not.toHaveBeenCalled();
    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
  });

  it("returns an error when not admin", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Admin access required",
    });

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({ success: false, error: "Admin access required" });
    expect(mockStartImpersonation).not.toHaveBeenCalled();
  });

  it("returns an error when sudo mode is not active", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo mode required",
    });

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockStartImpersonation).not.toHaveBeenCalled();
  });

  it("prevents impersonating yourself", async () => {
    const result = await startImpersonationAction(ADMIN_USER_ID);

    expect(result).toEqual({
      success: false,
      error: "Cannot impersonate yourself",
    });
    expect(mockStartImpersonation).not.toHaveBeenCalled();
    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
  });

  it("prevents impersonating another site admin", async () => {
    mockIsSiteAdmin.mockResolvedValue(true);

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({
      success: false,
      error: "Cannot impersonate another site admin",
    });
    expect(mockStartImpersonation).not.toHaveBeenCalled();
  });

  it("returns an error when target user is not found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({ success: false, error: "User not found" });
    expect(mockStartImpersonation).not.toHaveBeenCalled();
    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
  });

  it("returns an error when ending previous sessions fails", async () => {
    mockIs.mockResolvedValue({
      error: { message: "DB error", code: "42000" },
    });

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to end previous impersonation session",
    });
    expect(mockStartImpersonation).not.toHaveBeenCalled();
  });

  it("returns an error when session creation fails", async () => {
    mockStartImpersonation.mockRejectedValue(new Error("Insert failed"));

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to start impersonation",
    });
    // Cookie should NOT have been set
    expect(mockSetImpersonationCookie).not.toHaveBeenCalled();
  });

  it("starts impersonation without a reason", async () => {
    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({ success: true });
    expect(mockStartImpersonation).toHaveBeenCalledWith(
      mockServiceClient,
      ADMIN_USER_ID,
      TARGET_USER_ID,
      undefined,
      "192.168.1.1",
      "TestBrowser/1.0"
    );
  });

  it("handles missing forwarded IP by using x-real-ip", async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return null;
      if (name === "x-real-ip") return "10.0.0.1";
      if (name === "user-agent") return "TestBrowser/1.0";
      return null;
    });

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({ success: true });
    expect(mockStartImpersonation).toHaveBeenCalledWith(
      mockServiceClient,
      ADMIN_USER_ID,
      TARGET_USER_ID,
      undefined,
      "10.0.0.1",
      "TestBrowser/1.0"
    );
  });

  it("handles missing IP and user agent headers", async () => {
    mockGet.mockReturnValue(null);

    const result = await startImpersonationAction(TARGET_USER_ID);

    expect(result).toEqual({ success: true });
    expect(mockStartImpersonation).toHaveBeenCalledWith(
      mockServiceClient,
      ADMIN_USER_ID,
      TARGET_USER_ID,
      undefined,
      undefined,
      undefined
    );
  });
});

describe("endImpersonationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: admin auth succeeds
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    // Default: active impersonation session exists
    mockGetImpersonationTarget.mockResolvedValue({
      targetUserId: TARGET_USER_ID,
      sessionId: 42,
      startedAt: "2025-01-01T00:00:00Z",
    });
    // Default: endImpersonation succeeds
    mockEndImpersonation.mockResolvedValue(undefined);
    // Default: clearImpersonationCookie succeeds
    mockClearImpersonationCookie.mockResolvedValue(undefined);
  });

  it("ends impersonation successfully", async () => {
    const result = await endImpersonationAction();

    expect(result).toEqual({ success: true });
    expect(mockEndImpersonation).toHaveBeenCalledWith(
      mockServiceClient,
      ADMIN_USER_ID
    );
    expect(mockClearImpersonationCookie).toHaveBeenCalled();
  });

  it("returns an error when not authenticated", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await endImpersonationAction();

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockEndImpersonation).not.toHaveBeenCalled();
    expect(mockClearImpersonationCookie).not.toHaveBeenCalled();
  });

  it("clears cookie and returns success when no active session exists", async () => {
    mockGetImpersonationTarget.mockResolvedValue(null);

    const result = await endImpersonationAction();

    expect(result).toEqual({ success: true });
    // Should clear the cookie even though there's no session
    expect(mockClearImpersonationCookie).toHaveBeenCalled();
    // Should NOT try to end a session that doesn't exist
    expect(mockEndImpersonation).not.toHaveBeenCalled();
  });

  it("returns an error when ending the session fails", async () => {
    mockEndImpersonation.mockRejectedValue(new Error("DB failure"));

    const result = await endImpersonationAction();

    expect(result).toEqual({
      success: false,
      error: "Failed to end impersonation session",
    });
    // Cookie should NOT be cleared on failure
    expect(mockClearImpersonationCookie).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails with sudo expired", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo session expired",
    });

    const result = await endImpersonationAction();

    expect(result).toEqual({ success: false, error: "Sudo session expired" });
    expect(mockEndImpersonation).not.toHaveBeenCalled();
  });
});
