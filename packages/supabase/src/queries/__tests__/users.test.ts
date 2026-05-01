/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { getCurrentUser, getPlayerProfileByHandle } from "../users";
import {
  createMockClient,
  type MockSupabaseClient,
} from "@trainers/test-utils/mocks";
import type { TypedClient } from "../../client";

describe("getPlayerProfileByHandle", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  it("resolves user by users.username and returns profile with all alts", async () => {
    const mockUser = {
      id: "user-123",
      username: "ash_ketchum",
      country: "US",
      did: "did:plc:abc123",
      pds_handle: "ash.trainers.gg",
      main_alt_id: 1,
      created_at: "2026-01-01T00:00:00Z",
    };

    const mockAlts = [
      {
        id: 1,
        username: "ash_ketchum",
        bio: "Gotta catch em all",
        avatar_url: "https://example.com/pikachu.png",
        tier: null,
        tier_expires_at: null,
      },
      {
        id: 2,
        username: "satoshi",
        bio: null,
        avatar_url: null,
        tier: null,
        tier_expires_at: null,
      },
    ];

    let fromCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      fromCallCount++;
      if (table === "users" && fromCallCount === 1) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: mockUser, error: null }),
            }),
          }),
        };
      }
      if (table === "alts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest
                .fn()
                .mockResolvedValue({ data: mockAlts, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "ash_ketchum"
    );

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
    expect(result?.username).toBe("ash_ketchum");
    expect(result?.country).toBe("US");
    expect(result?.mainAlt?.username).toBe("ash_ketchum");
    expect(result?.alts).toHaveLength(2);
    expect(result?.altIds).toEqual([1, 2]);
  });

  it("falls back to alts.username when users.username does not match", async () => {
    const mockUser = {
      id: "user-123",
      username: "ash_ketchum",
      country: "US",
      did: null,
      pds_handle: null,
      main_alt_id: 1,
      created_at: "2026-01-01T00:00:00Z",
    };

    const mockAlts = [
      {
        id: 1,
        username: "satoshi",
        bio: null,
        avatar_url: null,
        tier: null,
        tier_expires_at: null,
      },
    ];

    let fromCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      fromCallCount++;
      // First call: users.username lookup — no match
      if (table === "users" && fromCallCount === 1) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      // Second call: alts.username lookup — match
      if (table === "alts" && fromCallCount === 2) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { user_id: "user-123" },
                error: null,
              }),
            }),
          }),
        };
      }
      // Third call: fetch all alts for the user
      if (table === "alts" && fromCallCount === 3) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest
                .fn()
                .mockResolvedValue({ data: mockAlts, error: null }),
            }),
          }),
        };
      }
      // Fourth call: re-fetch user by ID
      if (table === "users" && fromCallCount === 4) {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: mockUser, error: null }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "satoshi"
    );

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
    expect(result?.altIds).toEqual([1]);
  });

  it("returns null when neither users nor alts match the handle", async () => {
    mockClient.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }));

    const result = await getPlayerProfileByHandle(
      mockClient as unknown as TypedClient,
      "nonexistent_player"
    );

    expect(result).toBeNull();
  });
});

// =============================================================================
// getCurrentUser
// =============================================================================
//
// The earlier implementation called `.maybeSingle()` on a `from("alts").eq("user_id")`
// query, which throws when a user has more than one alt. These tests pin the
// new behavior: resolve via `users.main_alt_id`, fall back to oldest by
// `created_at` when missing or stale, and never throw.

describe("getCurrentUser", () => {
  let mockClient: MockSupabaseClient;

  const authUser = { id: "user-123" };
  const baseUserRow = {
    id: "user-123",
    email: "ash@trainers.local",
    name: "ash_ketchum",
    sprite_preference: "gen5",
    main_alt_id: null as number | null,
  };
  const altOne = {
    id: 1,
    user_id: "user-123",
    username: "ash_ketchum",
    bio: "main alt",
    avatar_url: null,
  };
  const altTwo = { ...altOne, id: 2, username: "ash_ketchum_vgc" };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockClient = createMockClient();
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
  });

  function mockUserAndAlt({
    user,
    altById,
    altByUserId,
  }: {
    user: typeof baseUserRow | null;
    altById?: typeof altOne | null;
    altByUserId?: typeof altOne | null;
  }) {
    mockClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: user, error: null }),
            }),
          }),
        };
      }
      if (table === "alts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation((column: string) => {
              if (column === "id") {
                return {
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: altById ?? null, error: null }),
                };
              }
              // user_id branch — fallback path uses .order().limit().maybeSingle()
              return {
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: altByUserId ?? null,
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          }),
        };
      }
      return {};
    });
  }

  it("returns null when no auth user is present", async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getCurrentUser(mockClient as unknown as TypedClient);
    expect(result).toBeNull();
  });

  it("resolves the alt referenced by users.main_alt_id when set", async () => {
    mockUserAndAlt({
      user: { ...baseUserRow, main_alt_id: 1 },
      altById: altOne,
    });

    const result = await getCurrentUser(mockClient as unknown as TypedClient);

    expect(result?.id).toBe("user-123");
    expect(result?.alt?.id).toBe(1);
    expect(result?.alt?.username).toBe("ash_ketchum");
  });

  it("falls back to the oldest alt when main_alt_id is null", async () => {
    mockUserAndAlt({
      user: { ...baseUserRow, main_alt_id: null },
      altByUserId: altOne,
    });

    const result = await getCurrentUser(mockClient as unknown as TypedClient);

    expect(result?.alt?.id).toBe(1);
  });

  it("falls back to the oldest alt when main_alt_id points to a deleted row", async () => {
    // Stale main_alt_id: row no longer exists, so the .id lookup returns null.
    // The function must not silently leave alt as null when other alts exist.
    mockUserAndAlt({
      user: { ...baseUserRow, main_alt_id: 999 },
      altById: null,
      altByUserId: altTwo,
    });

    const result = await getCurrentUser(mockClient as unknown as TypedClient);

    expect(result?.alt?.id).toBe(2);
  });

  it("returns user with alt:null when the user has no alts at all", async () => {
    mockUserAndAlt({
      user: { ...baseUserRow, main_alt_id: null },
      altByUserId: null,
    });

    const result = await getCurrentUser(mockClient as unknown as TypedClient);

    expect(result?.id).toBe("user-123");
    expect(result?.alt).toBeNull();
  });

  it("returns null when the user row fetch errors", async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "boom" },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await getCurrentUser(mockClient as unknown as TypedClient);

    expect(result).toBeNull();
  });

  it("returns null and logs when the main_alt_id lookup errors", async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...baseUserRow, main_alt_id: 1 },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "alts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "rls denied" },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await getCurrentUser(mockClient as unknown as TypedClient);

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "[getCurrentUser] main_alt_id lookup failed",
      expect.objectContaining({ userId: "user-123", mainAltId: 1 })
    );
  });
});
