/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock the auth check
jest.mock("@/lib/auth/require-admin", () => ({
  requireAdminWithSudo: jest.fn(),
}));

// Mock the Supabase service role client
const mockServiceClient = {};
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceClient),
}));

// Mock the Supabase query functions (imported via @trainers/supabase/queries)
jest.mock("@trainers/supabase/queries", () => ({
  approveOrganization: jest.fn(),
  rejectOrganization: jest.fn(),
  suspendOrganization: jest.fn(),
  unsuspendOrganization: jest.fn(),
  transferOrgOwnership: jest.fn(),
}));

// Import after mocks are declared
import {
  approveOrgAction,
  rejectOrgAction,
  suspendOrgAction,
  unsuspendOrgAction,
  transferOwnershipAction,
} from "../actions";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  unsuspendOrganization,
  transferOrgOwnership,
} from "@trainers/supabase/queries";

// Cast to jest.Mock for type-safe mock API access
const mockRequireAdminWithSudo = requireAdminWithSudo as jest.Mock;
const mockApproveOrganization = approveOrganization as jest.Mock;
const mockRejectOrganization = rejectOrganization as jest.Mock;
const mockSuspendOrganization = suspendOrganization as jest.Mock;
const mockUnsuspendOrganization = unsuspendOrganization as jest.Mock;
const mockTransferOrgOwnership = transferOrgOwnership as jest.Mock;

// --- Constants ---
const ADMIN_USER_ID = "admin-123";
const ORG_ID = 42;
const NEW_OWNER_ID = "new-owner-789";

// --- Tests ---

describe("approveOrgAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockApproveOrganization.mockResolvedValue(undefined);
  });

  it("approves an organization successfully", async () => {
    const result = await approveOrgAction(ORG_ID);

    expect(result).toEqual({ success: true });
    expect(mockApproveOrganization).toHaveBeenCalledWith(
      mockServiceClient,
      ORG_ID,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await approveOrgAction(ORG_ID);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockApproveOrganization).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockApproveOrganization.mockRejectedValue(
      new Error("Organization not found")
    );

    const result = await approveOrgAction(ORG_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to approve organization",
    });
  });
});

describe("rejectOrgAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockRejectOrganization.mockResolvedValue(undefined);
  });

  it("rejects an organization with a reason", async () => {
    const result = await rejectOrgAction(ORG_ID, "Incomplete application");

    expect(result).toEqual({ success: true });
    expect(mockRejectOrganization).toHaveBeenCalledWith(
      mockServiceClient,
      ORG_ID,
      ADMIN_USER_ID,
      "Incomplete application"
    );
  });

  it("returns an error when reason is empty", async () => {
    const result = await rejectOrgAction(ORG_ID, "");

    expect(result).toEqual({ success: false, error: "A reason is required" });
    expect(mockRejectOrganization).not.toHaveBeenCalled();
  });

  it("returns an error when reason is whitespace only", async () => {
    const result = await rejectOrgAction(ORG_ID, "   ");

    expect(result).toEqual({ success: false, error: "A reason is required" });
    expect(mockRejectOrganization).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo mode required",
    });

    const result = await rejectOrgAction(ORG_ID, "Bad org");

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockRejectOrganization).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockRejectOrganization.mockRejectedValue(new Error("DB failure"));

    const result = await rejectOrgAction(ORG_ID, "Spam");

    expect(result).toEqual({
      success: false,
      error: "Failed to reject organization",
    });
  });
});

describe("suspendOrgAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockSuspendOrganization.mockResolvedValue(undefined);
  });

  it("suspends an organization with a reason", async () => {
    const result = await suspendOrgAction(ORG_ID, "Terms violation");

    expect(result).toEqual({ success: true });
    expect(mockSuspendOrganization).toHaveBeenCalledWith(
      mockServiceClient,
      ORG_ID,
      ADMIN_USER_ID,
      "Terms violation"
    );
  });

  it("returns an error when reason is empty", async () => {
    const result = await suspendOrgAction(ORG_ID, "");

    expect(result).toEqual({ success: false, error: "A reason is required" });
    expect(mockSuspendOrganization).not.toHaveBeenCalled();
  });

  it("returns an error when reason is whitespace only", async () => {
    const result = await suspendOrgAction(ORG_ID, "   ");

    expect(result).toEqual({ success: false, error: "A reason is required" });
    expect(mockSuspendOrganization).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Admin access required",
    });

    const result = await suspendOrgAction(ORG_ID, "Reason");

    expect(result).toEqual({
      success: false,
      error: "Admin access required",
    });
    expect(mockSuspendOrganization).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockSuspendOrganization.mockRejectedValue(new Error("DB failure"));

    const result = await suspendOrgAction(ORG_ID, "Reason");

    expect(result).toEqual({
      success: false,
      error: "Failed to suspend organization",
    });
  });
});

describe("unsuspendOrgAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockUnsuspendOrganization.mockResolvedValue(undefined);
  });

  it("unsuspends an organization successfully", async () => {
    const result = await unsuspendOrgAction(ORG_ID);

    expect(result).toEqual({ success: true });
    expect(mockUnsuspendOrganization).toHaveBeenCalledWith(
      mockServiceClient,
      ORG_ID,
      ADMIN_USER_ID
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await unsuspendOrgAction(ORG_ID);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockUnsuspendOrganization).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockUnsuspendOrganization.mockRejectedValue(new Error("DB failure"));

    const result = await unsuspendOrgAction(ORG_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to unsuspend organization",
    });
  });
});

describe("transferOwnershipAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockTransferOrgOwnership.mockResolvedValue(undefined);
  });

  it("transfers ownership successfully", async () => {
    const result = await transferOwnershipAction(ORG_ID, NEW_OWNER_ID);

    expect(result).toEqual({ success: true });
    expect(mockTransferOrgOwnership).toHaveBeenCalledWith(
      mockServiceClient,
      ORG_ID,
      NEW_OWNER_ID,
      ADMIN_USER_ID
    );
  });

  it("returns an error when new owner ID is empty", async () => {
    const result = await transferOwnershipAction(ORG_ID, "");

    expect(result).toEqual({
      success: false,
      error: "A new owner is required",
    });
    expect(mockTransferOrgOwnership).not.toHaveBeenCalled();
  });

  it("returns an error when new owner ID is whitespace only", async () => {
    const result = await transferOwnershipAction(ORG_ID, "   ");

    expect(result).toEqual({
      success: false,
      error: "A new owner is required",
    });
    expect(mockTransferOrgOwnership).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo session expired",
    });

    const result = await transferOwnershipAction(ORG_ID, NEW_OWNER_ID);

    expect(result).toEqual({
      success: false,
      error: "Sudo session expired",
    });
    expect(mockTransferOrgOwnership).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockTransferOrgOwnership.mockRejectedValue(new Error("DB failure"));

    const result = await transferOwnershipAction(ORG_ID, NEW_OWNER_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to transfer ownership",
    });
  });
});
