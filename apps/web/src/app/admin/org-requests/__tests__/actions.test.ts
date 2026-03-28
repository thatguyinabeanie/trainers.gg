/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock the auth check
jest.mock("@/lib/auth/require-admin", () => ({
  requireAdminWithSudo: jest.fn(),
}));

// Mock the Supabase service role client
const mockFunctionsInvoke = jest.fn().mockResolvedValue({ data: null });
const mockServiceClient = {
  functions: { invoke: mockFunctionsInvoke },
};
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceClient),
}));

// Mock the mutation functions
jest.mock("@trainers/supabase/mutations", () => ({
  approveCommunityRequest: jest.fn(),
  rejectCommunityRequest: jest.fn(),
}));

// Import after mocks are declared
import {
  approveCommunityRequestAction,
  rejectCommunityRequestAction,
} from "../actions";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  approveCommunityRequest,
  rejectCommunityRequest,
} from "@trainers/supabase/mutations";

// Cast to jest.Mock for type-safe mock API access
const mockRequireAdminWithSudo = requireAdminWithSudo as jest.Mock;
const mockApproveCommunityRequest = approveCommunityRequest as jest.Mock;
const mockRejectCommunityRequest = rejectCommunityRequest as jest.Mock;

// --- Constants ---
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";
const REQUEST_ID = 42;

// --- Tests ---

describe("approveCommunityRequestAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockApproveCommunityRequest.mockResolvedValue(undefined);
    mockFunctionsInvoke.mockResolvedValue({ data: null });
  });

  it("approves a request successfully", async () => {
    const result = await approveCommunityRequestAction(REQUEST_ID);

    expect(result).toEqual({ success: true });
    expect(mockApproveCommunityRequest).toHaveBeenCalledWith(
      mockServiceClient,
      REQUEST_ID,
      ADMIN_USER_ID
    );
  });

  it("sends email notification after approval", async () => {
    await approveCommunityRequestAction(REQUEST_ID);

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      "send-org-request-notification",
      { body: { requestId: REQUEST_ID, action: "approved" } }
    );
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Not authenticated",
    });

    const result = await approveCommunityRequestAction(REQUEST_ID);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockApproveCommunityRequest).not.toHaveBeenCalled();
  });

  it.each([
    { desc: "negative number", input: -1 },
    { desc: "zero", input: 0 },
    { desc: "float", input: 1.5 },
  ])("returns validation error for $desc", async ({ input }) => {
    const result = await approveCommunityRequestAction(input);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockApproveCommunityRequest).not.toHaveBeenCalled();
  });

  it("returns a specific error when the mutation throws", async () => {
    mockApproveCommunityRequest.mockRejectedValue(
      new Error("Request not found")
    );

    const result = await approveCommunityRequestAction(REQUEST_ID);

    expect(result).toEqual({
      success: false,
      error: "Failed to approve organization request",
    });
  });
});

describe("rejectCommunityRequestAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminWithSudo.mockResolvedValue({ userId: ADMIN_USER_ID });
    mockRejectCommunityRequest.mockResolvedValue(undefined);
    mockFunctionsInvoke.mockResolvedValue({ data: null });
  });

  it("rejects a request with a reason", async () => {
    const result = await rejectCommunityRequestAction(
      REQUEST_ID,
      "Incomplete application"
    );

    expect(result).toEqual({ success: true });
    expect(mockRejectCommunityRequest).toHaveBeenCalledWith(
      mockServiceClient,
      REQUEST_ID,
      ADMIN_USER_ID,
      "Incomplete application"
    );
  });

  it("sends email notification after rejection", async () => {
    await rejectCommunityRequestAction(REQUEST_ID, "Spam");

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      "send-org-request-notification",
      { body: { requestId: REQUEST_ID, action: "rejected" } }
    );
  });

  it("returns an error when reason is empty", async () => {
    const result = await rejectCommunityRequestAction(REQUEST_ID, "");

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockRejectCommunityRequest).not.toHaveBeenCalled();
  });

  it("returns an error when reason is whitespace only", async () => {
    const result = await rejectCommunityRequestAction(REQUEST_ID, "   ");

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
    expect(mockRejectCommunityRequest).not.toHaveBeenCalled();
  });

  it("returns an error when auth check fails", async () => {
    mockRequireAdminWithSudo.mockResolvedValue({
      success: false,
      error: "Sudo mode required",
    });

    const result = await rejectCommunityRequestAction(REQUEST_ID, "Spam");

    expect(result).toEqual({ success: false, error: "Sudo mode required" });
    expect(mockRejectCommunityRequest).not.toHaveBeenCalled();
  });

  it("returns a specific error when the mutation throws", async () => {
    mockRejectCommunityRequest.mockRejectedValue(new Error("DB failure"));

    const result = await rejectCommunityRequestAction(REQUEST_ID, "Reason");

    expect(result).toEqual({
      success: false,
      error: "Failed to reject organization request",
    });
  });
});
