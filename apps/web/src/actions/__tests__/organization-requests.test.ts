/**
 * @jest-environment node
 */

// Mock Supabase client
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabase),
}));

// Mock next/cache updateTag
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Mock getErrorMessage
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// Mock @trainers/supabase mutation
const mockSubmitOrganizationRequest = jest.fn();
jest.mock("@trainers/supabase", () => ({
  submitOrganizationRequest: (...args: unknown[]) =>
    mockSubmitOrganizationRequest(...args),
}));

import { submitOrganizationRequestAction } from "../organization-requests";

describe("submitOrganizationRequestAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits a valid request and revalidates cache", async () => {
    mockSubmitOrganizationRequest.mockResolvedValue({
      id: 1,
      slug: "pallet-town",
    });

    const result = await submitOrganizationRequestAction({
      name: "Pallet Town",
      slug: "pallet-town",
      description: "A league",
    });

    expect(result).toEqual({
      success: true,
      data: { id: 1, slug: "pallet-town" },
    });
    expect(mockSubmitOrganizationRequest).toHaveBeenCalledWith(mockSupabase, {
      name: "Pallet Town",
      slug: "pallet-town",
      description: "A league",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("org-requests-list");
  });

  it("returns validation error for empty name", async () => {
    const result = await submitOrganizationRequestAction({
      name: "",
      slug: "test",
    });

    expect(result.success).toBe(false);
    expect(mockSubmitOrganizationRequest).not.toHaveBeenCalled();
  });

  it("returns validation error for invalid slug", async () => {
    const result = await submitOrganizationRequestAction({
      name: "Test Org",
      slug: "INVALID SLUG!",
    });

    expect(result.success).toBe(false);
    expect(mockSubmitOrganizationRequest).not.toHaveBeenCalled();
  });

  it("returns error when mutation throws", async () => {
    mockSubmitOrganizationRequest.mockRejectedValue(
      new Error("Already have pending request")
    );

    const result = await submitOrganizationRequestAction({
      name: "Test Org",
      slug: "test-org",
    });

    expect(result).toEqual({
      success: false,
      error: "Failed to submit organization request",
    });
  });

  it("trims whitespace from name and description", async () => {
    mockSubmitOrganizationRequest.mockResolvedValue({
      id: 2,
      slug: "trimmed",
    });

    await submitOrganizationRequestAction({
      name: "  Trimmed Org  ",
      slug: "trimmed",
      description: "  Some description  ",
    });

    expect(mockSubmitOrganizationRequest).toHaveBeenCalledWith(mockSupabase, {
      name: "Trimmed Org",
      slug: "trimmed",
      description: "Some description",
    });
  });
});
