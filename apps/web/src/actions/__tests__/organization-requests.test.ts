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

const validInput = {
  name: "Pallet Town",
  slug: "pallet-town",
  description: "A league",
  discord_invite_code: "pallet-town",
};

describe("submitOrganizationRequestAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits a valid request and constructs discord URL from code", async () => {
    mockSubmitOrganizationRequest.mockResolvedValue({
      id: 1,
      slug: "pallet-town",
    });

    const result = await submitOrganizationRequestAction(validInput);

    expect(result).toEqual({
      success: true,
      data: { id: 1, slug: "pallet-town" },
    });
    expect(mockSubmitOrganizationRequest).toHaveBeenCalledWith(mockSupabase, {
      name: "Pallet Town",
      slug: "pallet-town",
      description: "A league",
      discord_invite_url: "https://discord.gg/pallet-town",
      social_links: [],
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("org-requests-list");
  });

  it("builds full URLs from handles", async () => {
    mockSubmitOrganizationRequest.mockResolvedValue({
      id: 1,
      slug: "pallet-town",
    });

    await submitOrganizationRequestAction({
      ...validInput,
      twitter_handle: "pallettown",
      bluesky_handle: "pallettown.bsky.social",
    });

    expect(mockSubmitOrganizationRequest).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        social_links: [
          { platform: "twitter", url: "https://x.com/pallettown" },
          {
            platform: "bluesky",
            url: "https://bsky.app/profile/pallettown.bsky.social",
          },
        ],
      })
    );
  });

  it("returns validation error for empty name", async () => {
    const result = await submitOrganizationRequestAction({
      ...validInput,
      name: "",
    });

    expect(result.success).toBe(false);
    expect(mockSubmitOrganizationRequest).not.toHaveBeenCalled();
  });

  it("returns error when mutation throws", async () => {
    mockSubmitOrganizationRequest.mockRejectedValue(
      new Error("Already have pending request")
    );

    const result = await submitOrganizationRequestAction(validInput);

    expect(result).toEqual({
      success: false,
      error: "Failed to submit organization request",
    });
  });

  it("trims whitespace from fields", async () => {
    mockSubmitOrganizationRequest.mockResolvedValue({
      id: 2,
      slug: "trimmed",
    });

    await submitOrganizationRequestAction({
      ...validInput,
      name: "  Trimmed Org  ",
      slug: "trimmed",
      description: "  Some description  ",
      discord_invite_code: "my-server",
    });

    expect(mockSubmitOrganizationRequest).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        name: "Trimmed Org",
        slug: "trimmed",
        description: "Some description",
        discord_invite_url: "https://discord.gg/my-server",
      })
    );
  });
});
