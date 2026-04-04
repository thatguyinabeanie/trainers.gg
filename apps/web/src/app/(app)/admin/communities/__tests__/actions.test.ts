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

// Mock the Supabase service role client.
// The new featured-community actions call Supabase methods directly
// (e.g. .from().update().eq()), so this needs to be a full fluent-chain mock
// rather than a plain object.
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockMaybeSingle = jest.fn();
const mockServiceClient = {
  from: mockFrom,
  select: mockSelect,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
};
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceClient),
}));

// Mock the Supabase query functions (imported via @trainers/supabase/queries)
jest.mock("@trainers/supabase/queries", () => ({
  approveOrganization: jest.fn(),
  rejectOrganization: jest.fn(),
  suspendOrganization: jest.fn(),
  unsuspendOrganization: jest.fn(),
  transferCommunityOwnership: jest.fn(),
}));

// Import after mocks are declared
import {
  approveCommunityAction,
  rejectCommunityAction,
  suspendCommunityAction,
  unsuspendCommunityAction,
  transferOwnershipAction,
  toggleFeaturedAction,
  togglePartnerAction,
  updateFeaturedOrderAction,
} from "../actions";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  unsuspendOrganization,
  transferCommunityOwnership,
} from "@trainers/supabase/queries";

// Cast to jest.Mock for type-safe mock API access
const mockRequireAdminWithSudo = requireAdminWithSudo as jest.Mock;
const mockApproveOrganization = approveOrganization as jest.Mock;
const mockRejectOrganization = rejectOrganization as jest.Mock;
const mockSuspendOrganization = suspendOrganization as jest.Mock;
const mockUnsuspendOrganization = unsuspendOrganization as jest.Mock;
const mockTransferCommunityOwnership = transferCommunityOwnership as jest.Mock;

// --- Constants ---
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";
const ORG_ID = 42;
const NEW_OWNER_ID = "00000000-0000-0000-0000-000000000003";

// --- Tests ---

describe("approveCommunityAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockApproveOrganization.mockResolvedValue(undefined);
  });

  it("approves an organization successfully", async () => {
    const result = await approveCommunityAction(ORG_ID);

    expect(result).toEqual({ success: true });
    expect(mockApproveOrganization).toHaveBeenCalledWith(
      mockServiceClient,
      ORG_ID,
      ADMIN_USER_ID
    );
  });

  it("invalidates community cache tags on success", async () => {
    await approveCommunityAction(ORG_ID);

    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
    expect(mockUpdateTag).toHaveBeenCalledWith(`community:${ORG_ID}`);
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await approveCommunityAction(ORG_ID);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockApproveOrganization).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockApproveOrganization.mockRejectedValue(
      new Error("Organization not found")
    );

    const result = await approveCommunityAction(ORG_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to approve organization: Organization not found",
    });
  });
});

describe("rejectCommunityAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockRejectOrganization.mockResolvedValue(undefined);
  });

  it("rejects an organization with a reason", async () => {
    const result = await rejectCommunityAction(
      ORG_ID,
      "Incomplete application"
    );

    expect(result).toEqual({ success: true });
    expect(mockRejectOrganization).toHaveBeenCalledWith(
      mockServiceClient,
      ORG_ID,
      ADMIN_USER_ID,
      "Incomplete application"
    );
  });

  it("returns an error when reason is empty", async () => {
    const result = await rejectCommunityAction(ORG_ID, "");

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockRejectOrganization).not.toHaveBeenCalled();
  });

  it("returns an error when reason is whitespace only", async () => {
    const result = await rejectCommunityAction(ORG_ID, "   ");

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockRejectOrganization).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo mode required",
    });

    const result = await rejectCommunityAction(ORG_ID, "Bad org");

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockRejectOrganization).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockRejectOrganization.mockRejectedValue(new Error("DB failure"));

    const result = await rejectCommunityAction(ORG_ID, "Spam");

    expect(result).toEqual({
      success: false,
      error: "Failed to reject organization: DB failure",
    });
  });
});

describe("suspendCommunityAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockSuspendOrganization.mockResolvedValue(undefined);
  });

  it("suspends an organization with a reason", async () => {
    const result = await suspendCommunityAction(ORG_ID, "Terms violation");

    expect(result).toEqual({ success: true });
    expect(mockSuspendOrganization).toHaveBeenCalledWith(
      mockServiceClient,
      ORG_ID,
      ADMIN_USER_ID,
      "Terms violation"
    );
  });

  it("returns an error when reason is empty", async () => {
    const result = await suspendCommunityAction(ORG_ID, "");

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockSuspendOrganization).not.toHaveBeenCalled();
  });

  it("returns an error when reason is whitespace only", async () => {
    const result = await suspendCommunityAction(ORG_ID, "   ");

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockSuspendOrganization).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Admin access required",
    });

    const result = await suspendCommunityAction(ORG_ID, "Reason");

    expect(result).toEqual({
      success: false,
      error: "Admin access required",
    });
    expect(mockSuspendOrganization).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockSuspendOrganization.mockRejectedValue(new Error("DB failure"));

    const result = await suspendCommunityAction(ORG_ID, "Reason");

    expect(result).toEqual({
      success: false,
      error: "Failed to suspend organization: DB failure",
    });
  });
});

describe("unsuspendCommunityAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockUnsuspendOrganization.mockResolvedValue(undefined);
  });

  it("unsuspends an organization successfully", async () => {
    const result = await unsuspendCommunityAction(ORG_ID);

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

    const result = await unsuspendCommunityAction(ORG_ID);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockUnsuspendOrganization).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockUnsuspendOrganization.mockRejectedValue(new Error("DB failure"));

    const result = await unsuspendCommunityAction(ORG_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to unsuspend organization: DB failure",
    });
  });
});

describe("transferOwnershipAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockTransferCommunityOwnership.mockResolvedValue(undefined);
  });

  it("transfers ownership successfully", async () => {
    const result = await transferOwnershipAction(ORG_ID, NEW_OWNER_ID);

    expect(result).toEqual({ success: true });
    expect(mockTransferCommunityOwnership).toHaveBeenCalledWith(
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
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockTransferCommunityOwnership).not.toHaveBeenCalled();
  });

  it("returns an error when new owner ID is not a valid UUID", async () => {
    const result = await transferOwnershipAction(ORG_ID, "not-a-uuid");

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockTransferCommunityOwnership).not.toHaveBeenCalled();
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
    expect(mockTransferCommunityOwnership).not.toHaveBeenCalled();
  });

  it("returns a specific error when the query throws", async () => {
    mockTransferCommunityOwnership.mockRejectedValue(new Error("DB failure"));

    const result = await transferOwnershipAction(ORG_ID, NEW_OWNER_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to transfer ownership: DB failure",
    });
  });
});

// =============================================================================
// New featured-community actions — these call Supabase methods directly
// instead of going through a query helper, so the fluent-chain mock is used.
//
// Each Supabase chain is mocked via mockFrom.mockReturnValueOnce() with a
// fresh builder object per chain call, matching the pattern used across the
// supabase mutations tests. This avoids shared-state conflicts between
// concurrent chains (e.g., toggleFeaturedAction(true) issues two chains).
// =============================================================================

/** Build a fluent query-builder mock that chains and resolves at the end. */
function makeChainBuilder(
  terminalResult: { error: unknown } | { data: unknown; error: unknown }
) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(terminalResult),
    // Make the builder itself awaitable (terminal update chains await the builder)
    then: (resolve: (v: typeof terminalResult) => void) =>
      resolve(terminalResult),
  };
  return builder;
}

describe("toggleFeaturedAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
  });

  it("returns an error when community ID is invalid", async () => {
    const result = await toggleFeaturedAction(-1, true);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await toggleFeaturedAction(ORG_ID, true);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  describe("when featuring a community (isFeatured = true)", () => {
    it("sets featured_order to 1 when no communities are currently featured", async () => {
      // First chain: select max featured_order → returns null (no featured communities)
      const selectChain = makeChainBuilder({ data: null, error: null });
      // Second chain: update → resolves with no error
      const updateChain = makeChainBuilder({ error: null });
      mockFrom
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(updateChain);

      const result = await toggleFeaturedAction(ORG_ID, true);

      expect(result).toEqual({ success: true });
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_featured: true, featured_order: 1 })
      );
    });

    it("sets featured_order to max + 1 when other featured communities exist", async () => {
      // First chain: select max featured_order → returns 5
      const selectChain = makeChainBuilder({
        data: { featured_order: 5 },
        error: null,
      });
      // Second chain: update
      const updateChain = makeChainBuilder({ error: null });
      mockFrom
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(updateChain);

      const result = await toggleFeaturedAction(ORG_ID, true);

      expect(result).toEqual({ success: true });
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_featured: true, featured_order: 6 })
      );
    });

    it("invalidates community cache tags on success", async () => {
      const selectChain = makeChainBuilder({ data: null, error: null });
      const updateChain = makeChainBuilder({ error: null });
      mockFrom
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(updateChain);

      await toggleFeaturedAction(ORG_ID, true);

      expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
      expect(mockUpdateTag).toHaveBeenCalledWith(`community:${ORG_ID}`);
    });

    it("returns an error when the update fails", async () => {
      const selectChain = makeChainBuilder({ data: null, error: null });
      const updateChain = makeChainBuilder({
        error: new Error("Update failed"),
      });
      mockFrom
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(updateChain);

      const result = await toggleFeaturedAction(ORG_ID, true);

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining("Failed to toggle featured status"),
      });
    });
  });

  describe("when unfeaturing a community (isFeatured = false)", () => {
    it("sets featured_order to null", async () => {
      const updateChain = makeChainBuilder({ error: null });
      mockFrom.mockReturnValueOnce(updateChain);

      const result = await toggleFeaturedAction(ORG_ID, false);

      expect(result).toEqual({ success: true });
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_featured: false, featured_order: null })
      );
    });

    it("does not query for max featured_order (only one DB call)", async () => {
      const updateChain = makeChainBuilder({ error: null });
      mockFrom.mockReturnValueOnce(updateChain);

      await toggleFeaturedAction(ORG_ID, false);

      // Only one call to .from() — the select chain is skipped
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("invalidates cache tags on success", async () => {
      const updateChain = makeChainBuilder({ error: null });
      mockFrom.mockReturnValueOnce(updateChain);

      await toggleFeaturedAction(ORG_ID, false);

      expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
      expect(mockUpdateTag).toHaveBeenCalledWith(`community:${ORG_ID}`);
    });
  });
});

describe("togglePartnerAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
  });

  it("returns an error when community ID is invalid", async () => {
    const result = await togglePartnerAction(0, true);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Admin access required",
    });

    const result = await togglePartnerAction(ORG_ID, true);

    expect(result).toEqual({ success: false, error: "Admin access required" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("sets tier to 'partner' when isPartner is true", async () => {
    const updateChain = makeChainBuilder({ error: null });
    mockFrom.mockReturnValueOnce(updateChain);

    const result = await togglePartnerAction(ORG_ID, true);

    expect(result).toEqual({ success: true });
    expect(updateChain.update).toHaveBeenCalledWith({ tier: "partner" });
  });

  it("sets tier to null when isPartner is false", async () => {
    const updateChain = makeChainBuilder({ error: null });
    mockFrom.mockReturnValueOnce(updateChain);

    const result = await togglePartnerAction(ORG_ID, false);

    expect(result).toEqual({ success: true });
    expect(updateChain.update).toHaveBeenCalledWith({ tier: null });
  });

  it("invalidates community cache tags on success", async () => {
    const updateChain = makeChainBuilder({ error: null });
    mockFrom.mockReturnValueOnce(updateChain);

    await togglePartnerAction(ORG_ID, true);

    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
    expect(mockUpdateTag).toHaveBeenCalledWith(`community:${ORG_ID}`);
  });

  it("returns an error when the update fails", async () => {
    const updateChain = makeChainBuilder({ error: new Error("DB failure") });
    mockFrom.mockReturnValueOnce(updateChain);

    const result = await togglePartnerAction(ORG_ID, true);

    expect(result).toEqual({
      success: false,
      error: "Failed to toggle partner status: DB failure",
    });
  });
});

describe("updateFeaturedOrderAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo mode required",
    });

    const result = await updateFeaturedOrderAction([1, 2, 3]);

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns success and invalidates the list cache for an empty array", async () => {
    const result = await updateFeaturedOrderAction([]);

    expect(result).toEqual({ success: true });
    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
    // No DB writes needed for an empty list
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("updates featured_order for each community ID in sequence", async () => {
    // Each iteration: .from("communities").update({featured_order: i+1}).eq("id", id).eq("is_featured", true)
    // Wire up one chain builder per ID.
    const chain1 = makeChainBuilder({ error: null });
    const chain2 = makeChainBuilder({ error: null });
    const chain3 = makeChainBuilder({ error: null });
    mockFrom
      .mockReturnValueOnce(chain1)
      .mockReturnValueOnce(chain2)
      .mockReturnValueOnce(chain3);

    const result = await updateFeaturedOrderAction([10, 20, 30]);

    expect(result).toEqual({ success: true });
    expect(chain1.update).toHaveBeenCalledWith({ featured_order: 1 });
    expect(chain2.update).toHaveBeenCalledWith({ featured_order: 2 });
    expect(chain3.update).toHaveBeenCalledWith({ featured_order: 3 });
  });

  it("invalidates the communities-list cache tag on success", async () => {
    const chain = makeChainBuilder({ error: null });
    mockFrom.mockReturnValueOnce(chain);

    await updateFeaturedOrderAction([10]);

    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
  });

  it("returns an error when a DB update fails mid-loop", async () => {
    const chain1 = makeChainBuilder({ error: null });
    const chain2 = makeChainBuilder({
      error: new Error("Constraint violation"),
    });
    mockFrom.mockReturnValueOnce(chain1).mockReturnValueOnce(chain2);

    const result = await updateFeaturedOrderAction([10, 20]);

    expect(result).toEqual({
      success: false,
      error: "Failed to update featured order: Constraint violation",
    });
  });
});
