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
const mockSubmitCommunityRequest = jest.fn();
jest.mock("@trainers/supabase", () => ({
  submitCommunityRequest: (...args: unknown[]) =>
    mockSubmitCommunityRequest(...args),
}));

import { submitOrganizationRequestAction } from "../community-requests";

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
    mockSubmitCommunityRequest.mockResolvedValue({
      id: 1,
      slug: "pallet-town",
    });

    const result = await submitOrganizationRequestAction(validInput);

    expect(result).toEqual({
      success: true,
      data: { id: 1, slug: "pallet-town" },
    });
    expect(mockSubmitCommunityRequest).toHaveBeenCalledWith(mockSupabase, {
      name: "Pallet Town",
      slug: "pallet-town",
      description: "A league",
      discord_invite_url: "https://discord.gg/pallet-town",
      social_links: [],
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("community-requests-list");
  });

  it("builds full URLs from handles", async () => {
    mockSubmitCommunityRequest.mockResolvedValue({
      id: 1,
      slug: "pallet-town",
    });

    await submitOrganizationRequestAction({
      ...validInput,
      twitter_handle: "pallettown",
      bluesky_handle: "pallettown.bsky.social",
    });

    expect(mockSubmitCommunityRequest).toHaveBeenCalledWith(
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
    expect(mockSubmitCommunityRequest).not.toHaveBeenCalled();
  });

  it("returns error when mutation throws", async () => {
    mockSubmitCommunityRequest.mockRejectedValue(
      new Error("Already have pending request")
    );

    const result = await submitOrganizationRequestAction(validInput);

    expect(result).toEqual({
      success: false,
      error: "Failed to submit community request",
    });
  });

  it("trims whitespace from fields", async () => {
    mockSubmitCommunityRequest.mockResolvedValue({
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

    expect(mockSubmitCommunityRequest).toHaveBeenCalledWith(
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
