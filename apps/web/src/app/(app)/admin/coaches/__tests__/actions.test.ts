/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock next/cache
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Mock the auth check
jest.mock("@/lib/auth/require-admin", () => ({
  requireAdminWithSudo: jest.fn(),
}));

// Mock the Supabase service role client
const mockServiceClient = {};
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceClient),
}));

// Mock the mutation functions — imported from bare @trainers/supabase
jest.mock("@trainers/supabase", () => ({
  grantCoachStatus: jest.fn(),
  revokeCoachStatus: jest.fn(),
}));

// Import after mocks are declared
import {
  grantCoachStatusAction,
  revokeCoachStatusAction,
} from "../actions";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import { grantCoachStatus, revokeCoachStatus } from "@trainers/supabase";

// Cast to jest.Mock for type-safe mock API access
const mockRequireAdminWithSudo = requireAdminWithSudo as jest.Mock;
const mockGrantCoachStatus = grantCoachStatus as jest.Mock;
const mockRevokeCoachStatus = revokeCoachStatus as jest.Mock;

// --- Constants ---
// Use a valid v4 UUID that passes z.string().uuid()
const ADMIN_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const TARGET_USER_ID = "11111111-1111-4111-8111-111111111111";

// --- Tests ---

describe("grantCoachStatusAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockGrantCoachStatus.mockResolvedValue(undefined);
  });

  it("grants coach status successfully", async () => {
    const result = await grantCoachStatusAction(TARGET_USER_ID);

    expect(result).toEqual({ success: true });
    expect(mockGrantCoachStatus).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      ADMIN_USER_ID
    );
  });

  it("invalidates the coaches-list cache tag on success", async () => {
    await grantCoachStatusAction(TARGET_USER_ID);

    expect(mockUpdateTag).toHaveBeenCalledWith("coaches-list");
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo mode required",
    });

    const result = await grantCoachStatusAction(TARGET_USER_ID);

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockGrantCoachStatus).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns a specific error when the mutation throws", async () => {
    mockGrantCoachStatus.mockRejectedValue(new Error("User not found"));

    const result = await grantCoachStatusAction(TARGET_USER_ID);

    // withAdminAction catches errors and returns the errorMessage label only
    // (detail is logged to console, not surfaced in the return value)
    expect(result).toEqual({
      success: false,
      error: "Failed to grant coach status",
    });
  });

  it.each([
    { desc: "not-a-uuid string", input: "not-a-uuid" },
    { desc: "empty string", input: "" },
    { desc: "numeric string", input: "12345" },
    { desc: "malformed UUID", input: "00000000-0000-0000-0000-zzzzzzzzzzzz" },
  ])("returns validation error for $desc", async ({ input }) => {
    const result = await grantCoachStatusAction(input);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockGrantCoachStatus).not.toHaveBeenCalled();
  });
});

describe("revokeCoachStatusAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockRevokeCoachStatus.mockResolvedValue(undefined);
  });

  it("revokes coach status without a reason", async () => {
    const result = await revokeCoachStatusAction(TARGET_USER_ID);

    expect(result).toEqual({ success: true });
    expect(mockRevokeCoachStatus).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      ADMIN_USER_ID,
      undefined
    );
  });

  it("revokes coach status with a reason", async () => {
    const result = await revokeCoachStatusAction(
      TARGET_USER_ID,
      "Violation of coaching guidelines"
    );

    expect(result).toEqual({ success: true });
    expect(mockRevokeCoachStatus).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      ADMIN_USER_ID,
      "Violation of coaching guidelines"
    );
  });

  it("trims whitespace from reason before passing to mutation", async () => {
    await revokeCoachStatusAction(TARGET_USER_ID, "  trimmed reason  ");

    expect(mockRevokeCoachStatus).toHaveBeenCalledWith(
      mockServiceClient,
      TARGET_USER_ID,
      ADMIN_USER_ID,
      "trimmed reason"
    );
  });

  it("invalidates the coaches-list cache tag on success", async () => {
    await revokeCoachStatusAction(TARGET_USER_ID);

    expect(mockUpdateTag).toHaveBeenCalledWith("coaches-list");
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await revokeCoachStatusAction(TARGET_USER_ID);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockRevokeCoachStatus).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns a specific error when the mutation throws", async () => {
    mockRevokeCoachStatus.mockRejectedValue(new Error("DB constraint failed"));

    const result = await revokeCoachStatusAction(TARGET_USER_ID);

    // withAdminAction catches errors and returns the errorMessage label only
    // (detail is logged to console, not surfaced in the return value)
    expect(result).toEqual({
      success: false,
      error: "Failed to revoke coach status",
    });
  });

  it.each([
    { desc: "not-a-uuid string", input: "not-a-uuid" },
    { desc: "empty string", input: "" },
    { desc: "numeric string", input: "12345" },
  ])("returns validation error for invalid userId $desc", async ({ input }) => {
    const result = await revokeCoachStatusAction(input);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockRevokeCoachStatus).not.toHaveBeenCalled();
  });

  it("returns validation error when reason exceeds 1000 characters", async () => {
    const longReason = "a".repeat(1001);
    const result = await revokeCoachStatusAction(TARGET_USER_ID, longReason);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockRevokeCoachStatus).not.toHaveBeenCalled();
  });

  it("returns validation error when reason is whitespace only", async () => {
    // adminReasonSchema has min(1), so trim("   ") → "" is invalid
    const result = await revokeCoachStatusAction(TARGET_USER_ID, "   ");

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockRevokeCoachStatus).not.toHaveBeenCalled();
  });
});
