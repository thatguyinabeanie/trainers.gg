/**
 * @jest-environment node
 */

// --- Mocks (declared before imports so jest.mock hoisting works) ---

// Mock next/cache
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Mock updateCoachProfile — imported from the subpath @trainers/supabase/mutations
jest.mock("@trainers/supabase/mutations", () => ({
  updateCoachProfile: jest.fn(),
}));

// Set up a chainable mock Supabase client with maybeSingle support
const mockMaybeSingle = jest.fn();
const mockGetUser = jest.fn();
const mockClient = {
  auth: { getUser: mockGetUser },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: mockMaybeSingle,
      }),
    }),
  }),
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockClient),
}));

// Import after mocks are declared
import { updateCoachProfileAction } from "../actions";
import { updateCoachProfile } from "@trainers/supabase/mutations";

const mockUpdateCoachProfile = updateCoachProfile as jest.Mock;

// --- Constants ---
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_INPUT = {
  headline: "VGC 2025 Specialist",
  bio: "Experienced coach",
  formats: ["VGC 2025"],
  links: [],
  serviceTypes: ["live"] as const,
};

// --- Tests ---

describe("updateCoachProfileAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockMaybeSingle.mockResolvedValue({
      data: { is_coach: true, username: "ash_ketchum" },
    });
    mockUpdateCoachProfile.mockResolvedValue(undefined);
  });

  it("saves the profile and returns success", async () => {
    const result = await updateCoachProfileAction(VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(mockUpdateCoachProfile).toHaveBeenCalledWith(
      mockClient,
      USER_ID,
      expect.objectContaining({ headline: "VGC 2025 Specialist" })
    );
  });

  it("invalidates the coaches-list cache tag on success", async () => {
    await updateCoachProfileAction(VALID_INPUT);

    expect(mockUpdateTag).toHaveBeenCalledWith("coaches-list");
  });

  it("invalidates the coach profile cache tag when username is set", async () => {
    await updateCoachProfileAction(VALID_INPUT);

    expect(mockUpdateTag).toHaveBeenCalledWith("coach-profile:ash_ketchum");
  });

  it("does not call coachProfile cache tag when username is null", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { is_coach: true, username: null },
    });

    await updateCoachProfileAction(VALID_INPUT);

    expect(mockUpdateTag).toHaveBeenCalledWith("coaches-list");
    expect(mockUpdateTag).not.toHaveBeenCalledWith(
      expect.stringContaining("coach-profile:")
    );
  });

  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await updateCoachProfileAction(VALID_INPUT);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockUpdateCoachProfile).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns error when user is not a coach", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { is_coach: false, username: "ash_ketchum" },
    });

    const result = await updateCoachProfileAction(VALID_INPUT);

    expect(result).toEqual({ success: false, error: "Not a coach" });
    expect(mockUpdateCoachProfile).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns error when user row is null (not found in users table)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });

    const result = await updateCoachProfileAction(VALID_INPUT);

    expect(result).toEqual({ success: false, error: "Not a coach" });
    expect(mockUpdateCoachProfile).not.toHaveBeenCalled();
  });

  it("returns error when updateCoachProfile throws", async () => {
    mockUpdateCoachProfile.mockRejectedValue(new Error("DB write failed"));

    const result = await updateCoachProfileAction(VALID_INPUT);

    expect(result).toEqual({ success: false, error: "DB write failed" });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns fallback error string for non-Error throws", async () => {
    mockUpdateCoachProfile.mockRejectedValue("unexpected string throw");

    const result = await updateCoachProfileAction(VALID_INPUT);

    expect(result).toEqual({ success: false, error: "Failed to save" });
  });

  describe("input validation", () => {
    it("returns error for invalid input (headline too long)", async () => {
      const result = await updateCoachProfileAction({
        ...VALID_INPUT,
        headline: "a".repeat(121),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockUpdateCoachProfile).not.toHaveBeenCalled();
    });

    it("returns error when input is not an object", async () => {
      const result = await updateCoachProfileAction(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockUpdateCoachProfile).not.toHaveBeenCalled();
    });

    it("accepts empty headline and bio (optional fields)", async () => {
      const result = await updateCoachProfileAction({
        ...VALID_INPUT,
        headline: "",
        bio: "",
      });

      expect(result).toEqual({ success: true });
    });

    it("accepts all service types", async () => {
      const result = await updateCoachProfileAction({
        ...VALID_INPUT,
        serviceTypes: ["live", "replay_review", "team_review", "mentorship"],
      });

      expect(result).toEqual({ success: true });
    });

    it("accepts valid links array", async () => {
      const result = await updateCoachProfileAction({
        ...VALID_INPUT,
        links: [{ label: "Twitter", url: "https://twitter.com/trainer" }],
      });

      expect(result).toEqual({ success: true });
    });
  });
});
