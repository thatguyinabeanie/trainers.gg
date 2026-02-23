/**
 * @jest-environment node
 */

// Mock next/cache
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock Supabase client
const mockFrom = jest.fn();
const mockGetUser = jest.fn();
const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
}));

import { setAltAvatar, removeAltAvatar } from "../alt-avatar";

const VALID_SPRITE_URL =
  "https://play.pokemonshowdown.com/sprites/gen5/pikachu.png";

// Helper to set up an authenticated user who owns the alt
function setupAuthenticatedOwner() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
  });
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { user_id: "user-123" },
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });
}

describe("setAltAvatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves a valid Showdown sprite URL", async () => {
    setupAuthenticatedOwner();

    const result = await setAltAvatar(1, VALID_SPRITE_URL);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avatarUrl).toBe(VALID_SPRITE_URL);
    }
  });

  it("rejects non-Showdown URLs", async () => {
    setupAuthenticatedOwner();

    const result = await setAltAvatar(1, "https://example.com/pikachu.png");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Showdown sprite/i);
    }
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await setAltAvatar(1, VALID_SPRITE_URL);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/authenticated/i);
    }
  });

  it("returns error when user does not own the alt", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "other-user" },
          }),
        }),
      }),
    });

    const result = await setAltAvatar(1, VALID_SPRITE_URL);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/own/i);
    }
  });

  it("rejects invalid alt ID", async () => {
    const result = await setAltAvatar(-1, VALID_SPRITE_URL);

    expect(result.success).toBe(false);
  });

  it("rejects zero alt ID", async () => {
    const result = await setAltAvatar(0, VALID_SPRITE_URL);

    expect(result.success).toBe(false);
  });
});

describe("removeAltAvatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes avatar successfully", async () => {
    setupAuthenticatedOwner();

    const result = await removeAltAvatar(1);

    expect(result.success).toBe(true);
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await removeAltAvatar(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/authenticated/i);
    }
  });

  it("returns error when user does not own the alt", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "other-user" },
          }),
        }),
      }),
    });

    const result = await removeAltAvatar(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/own/i);
    }
  });

  it("rejects invalid alt ID", async () => {
    const result = await removeAltAvatar(-1);

    expect(result.success).toBe(false);
  });
});
