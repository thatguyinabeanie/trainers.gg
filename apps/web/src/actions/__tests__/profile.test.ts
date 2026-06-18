/**
 * @jest-environment node
 */

// Mock Supabase client with chainable query builder
// Default implementation returns a passthrough query builder so
// extra from() calls (e.g. for cache invalidation) don't break tests.
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockAuth = {
  getUser: jest.fn(),
  getSession: jest.fn(),
  updateUser: jest.fn(),
};
const mockFunctionsInvoke = jest.fn();

const mockSupabaseClient = {
  from: mockFrom,
  rpc: mockRpc,
  auth: mockAuth,
  functions: {
    invoke: mockFunctionsInvoke,
  },
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
}));

jest.mock("botid/server", () => ({
  checkBotId: jest.fn(async () => ({ isBot: false })),
}));

const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Mock global fetch for PDS handle checks
const originalFetch = global.fetch;

import {
  checkUsernameAvailability,
  getCurrentUserProfile,
  updateProfile,
  updateAltVisibilityAction,
} from "../profile";

// Helper to create a chainable mock query builder
function createQueryBuilder(overrides: Record<string, unknown> = {}) {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  };
  Object.assign(builder, overrides);
  return builder;
}

describe("checkUsernameAvailability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    // Mock fetch to return handle available by default
    global.fetch = jest.fn().mockResolvedValue({ status: 400 });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("rejects usernames shorter than 3 code points", async () => {
    const result = await checkUsernameAvailability("ab");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it("rejects usernames with invalid characters", async () => {
    const result = await checkUsernameAvailability("user name!");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it("rejects temp_ placeholder usernames", async () => {
    const result = await checkUsernameAvailability("temp_abc123");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it("rejects user_ placeholder usernames", async () => {
    const result = await checkUsernameAvailability("user_abc123");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it("returns available when username is free in both users and alts tables", async () => {
    // Users table check — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // Alts table check — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    const result = await checkUsernameAvailability("available_name");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.available).toBe(true);
  });

  it("returns unavailable when username exists in users table", async () => {
    // Users table check — found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { id: "user-1" }, error: null }),
      })
    );

    // Alts table check — both queries run in parallel via Promise.all
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    const result = await checkUsernameAvailability("taken_user");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.available).toBe(false);
  });

  it("returns unavailable when username exists in alts table", async () => {
    // Users table check — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // Alts table check — found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { id: 42 }, error: null }),
      })
    );

    const result = await checkUsernameAvailability("alt_taken");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.available).toBe(false);
  });

  it("returns unavailable when PDS handle is taken", async () => {
    // Users table — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // Alts table — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // PDS handle exists (200 response)
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });

    const result = await checkUsernameAvailability("pdstaken");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.available).toBe(false);
      expect(result.data.reason).toMatch(/Bluesky/);
    }
  });

  it("handles users table query errors gracefully", async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error", code: "500" },
        }),
      })
    );

    const result = await checkUsernameAvailability("test_query_err");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it("handles alts table query errors gracefully", async () => {
    // Users table — no match
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // Alts table — error
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error", code: "500" },
        }),
      })
    );

    const result = await checkUsernameAvailability("test_alt_err");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it("excludes current user from users table check when authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "current-user" } },
    });

    const neqMock = jest.fn().mockReturnThis();
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        neq: neqMock,
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // Alts table check
    const neqAltsMock = jest.fn().mockReturnThis();
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        neq: neqAltsMock,
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    await checkUsernameAvailability("myname");

    expect(neqMock).toHaveBeenCalledWith("id", "current-user");
    expect(neqAltsMock).toHaveBeenCalledWith("user_id", "current-user");
  });
});

describe("getCurrentUserProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: rpc("get_my_user_pii") returns an empty PII array (no birth date)
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it("returns null when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getCurrentUserProfile();

    expect(result).toEqual({ success: true, data: null });
  });

  it("returns null when user not found in DB", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // users SELECT returns no row; rpc returns empty array (default mock)
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    const result = await getCurrentUserProfile();

    expect(result).toEqual({ success: true, data: null });
  });

  it("returns profile data when user exists", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // users SELECT — no birth_date (moved to PII RPC)
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: "user-1",
            username: "pikachu",
            pds_status: "active",
            pds_handle: "pikachu.trainers.gg",
            did: "did:plc:abc123",
            country: "US",
            main_alt_id: null,
            show_discord_publicly: false,
          },
          error: null,
        }),
      })
    );

    // rpc("get_my_user_pii") returns birth_date
    mockRpc.mockResolvedValue({
      data: [
        { first_name: "Ash", last_name: "Ketchum", birth_date: "2000-01-15" },
      ],
      error: null,
    });

    const result = await getCurrentUserProfile();

    expect(result).toEqual({
      success: true,
      data: {
        id: "user-1",
        username: "pikachu",
        pdsStatus: "active",
        pdsHandle: "pikachu.trainers.gg",
        did: "did:plc:abc123",
        firstName: "Ash",
        lastName: "Ketchum",
        birthDate: "2000-01-15",
        country: "US",
        mainAltId: null,
        altAvatarUrl: null,
        bio: null,
        showDiscordPublicly: false,
      },
    });
  });

  it("returns birthDate as null when rpc returns empty array", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: "user-1",
            username: "pikachu",
            pds_status: null,
            pds_handle: null,
            did: null,
            country: "US",
            main_alt_id: null,
            show_discord_publicly: false,
          },
          error: null,
        }),
      })
    );

    // rpc returns no PII rows
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await getCurrentUserProfile();

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.firstName).toBeNull();
      expect(result.data.lastName).toBeNull();
      expect(result.data.birthDate).toBeNull();
    }
  });

  it("returns altAvatarUrl when main_alt_id exists and alt has avatar", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // First call: users table — no birth_date, no show_discord_publicly
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: "user-1",
            username: "cynthia",
            pds_status: null,
            pds_handle: null,
            did: null,
            country: "JP",
            main_alt_id: 42,
            show_discord_publicly: false,
          },
          error: null,
        }),
      })
    );

    // rpc returns no birth_date (default mock → [])

    // Second call: alts table for avatar_url + bio
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            avatar_url:
              "https://play.pokemonshowdown.com/sprites/gen5/garchomp.png",
            bio: null,
          },
          error: null,
        }),
      })
    );

    const result = await getCurrentUserProfile();

    expect(result).toEqual({
      success: true,
      data: {
        id: "user-1",
        username: "cynthia",
        pdsStatus: null,
        pdsHandle: null,
        did: null,
        firstName: null,
        lastName: null,
        birthDate: null,
        country: "JP",
        mainAltId: 42,
        altAvatarUrl:
          "https://play.pokemonshowdown.com/sprites/gen5/garchomp.png",
        bio: null,
        showDiscordPublicly: false,
      },
    });
  });

  it("returns altAvatarUrl as null when main_alt_id exists but alt has no avatar", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // First call: users table
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: "user-1",
            username: "cynthia",
            pds_status: null,
            pds_handle: null,
            did: null,
            country: "JP",
            main_alt_id: 42,
            show_discord_publicly: false,
          },
          error: null,
        }),
      })
    );

    // rpc returns no PII rows (default mock)

    // Second call: alts table — no avatar
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { avatar_url: null, bio: null },
          error: null,
        }),
      })
    );

    const result = await getCurrentUserProfile();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(
        expect.objectContaining({
          mainAltId: 42,
          altAvatarUrl: null,
        })
      );
    }
  });

  it("returns null on database error", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      })
    );

    const result = await getCurrentUserProfile();

    expect(result).toEqual({
      success: false,
      error: "Failed to fetch profile",
    });
  });

  it("returns error when get_my_user_pii RPC errors", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // users table returns a valid user row
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: "user-1",
            username: "pikachu",
            pds_status: null,
            pds_handle: null,
            did: null,
            country: "US",
            main_alt_id: null,
            show_discord_publicly: false,
          },
          error: null,
        }),
      })
    );

    // rpc("get_my_user_pii") returns an error
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied", code: "42501" },
    });

    const result = await getCurrentUserProfile();

    expect(result).toEqual({
      success: false,
      error: "Failed to fetch profile",
    });
  });
});

/**
 * Prepend a mock for the "current username" query that updateProfile
 * calls first for cache invalidation. Must be called before any other
 * mockFrom.mockReturnValueOnce in each test.
 */
function mockUsernameQuery(username = "test_user") {
  mockFrom.mockReturnValueOnce(
    createQueryBuilder({
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { username }, error: null }),
    })
  );
}

describe("updateProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: "token-123" } },
    });
    mockAuth.updateUser.mockResolvedValue({ error: null });
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    // Default: rpc calls succeed (update_my_user_pii, get_my_user_pii, has_community_permission)
    mockRpc.mockResolvedValue({ data: null, error: null });
    // Default fallback for the "current username" fetch and bio/alt queries
    // added by cache invalidation. Keep eq chainable so
    // select(...).eq(...).maybeSingle() works correctly.
    mockFrom.mockImplementation(() =>
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { username: "test_user", main_alt_id: null },
          error: null,
        }),
      })
    );
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns error when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await updateProfile({ country: "US" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("rejects first name longer than 64 chars", async () => {
    const result = await updateProfile({ firstName: "A".repeat(65) });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects last name longer than 64 chars", async () => {
    const result = await updateProfile({ lastName: "B".repeat(65) });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects invalid country code", async () => {
    const result = await updateProfile({ country: "USA" });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("passes p_first_name and p_last_name to update_my_user_pii RPC", async () => {
    mockUsernameQuery();

    const result = await updateProfile({
      firstName: "Ash",
      lastName: "Ketchum",
    });

    expect(result.success).toBe(true);
    // Omitted PII fields are passed as undefined (not null) — the RPC uses
    // COALESCE(EXCLUDED.x, existing.x) so undefined leaves the existing value intact.
    expect(mockRpc).toHaveBeenCalledWith("update_my_user_pii", {
      p_first_name: "Ash",
      p_last_name: "Ketchum",
      p_birth_date: undefined,
      p_clear_birth_date: false,
    });
  });

  it("passes p_birth_date with undefined names when only birth date is provided", async () => {
    mockUsernameQuery();

    const result = await updateProfile({ birthDate: "1990-05-15" });

    expect(result.success).toBe(true);
    // Omitted first_name/last_name fields pass as undefined so existing DB values
    // are preserved; only birth_date is updated this call.
    expect(mockRpc).toHaveBeenCalledWith("update_my_user_pii", {
      p_first_name: undefined,
      p_last_name: undefined,
      p_birth_date: "1990-05-15",
      p_clear_birth_date: false,
    });
  });

  it("sends p_clear_birth_date: true when birthDate is cleared to empty string", async () => {
    mockUsernameQuery();

    // birthDate: "" represents the user clearing a previously-set birth date.
    // The action must call the RPC with p_clear_birth_date: true so the DB
    // writes NULL instead of ignoring the update via COALESCE.
    const result = await updateProfile({ birthDate: "" });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("update_my_user_pii", {
      p_first_name: undefined,
      p_last_name: undefined,
      p_birth_date: undefined, // not forwarded — clear flag takes precedence
      p_clear_birth_date: true,
    });
  });

  it("rejects non-empty birth date that does not match YYYY-MM-DD format", async () => {
    // Empty string is the clear sentinel and is valid; only non-empty non-date strings fail.
    const result = await updateProfile({ birthDate: "Jan 15 2000" });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("skips update_my_user_pii RPC when no PII fields are provided", async () => {
    mockUsernameQuery();
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
    );

    await updateProfile({ country: "JP" });

    expect(mockRpc).not.toHaveBeenCalledWith(
      "update_my_user_pii",
      expect.anything()
    );
  });

  it("returns error when update_my_user_pii RPC fails for names", async () => {
    mockUsernameQuery();
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied", code: "42501" },
    });

    const result = await updateProfile({ firstName: "Ash" });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Your other profile changes were saved, but we couldn't update your name or birth date. Please try again."
    );
  });

  it("updates birth date and country without username change", async () => {
    mockUsernameQuery();
    // Update users table
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
    );

    const result = await updateProfile({
      birthDate: "2000-01-15",
      country: "US",
    });

    expect(result.success).toBe(true);
  });

  it("invalidates player cache on successful profile update", async () => {
    mockUsernameQuery();
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
    );

    await updateProfile({ country: "US" });

    expect(mockUpdateTag).toHaveBeenCalledWith("player:test_user");
  });

  it("handles database update errors", async () => {
    mockUsernameQuery();
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        eq: jest.fn().mockResolvedValue({
          error: { message: "Update failed", code: "42000" },
        }),
      })
    );

    const result = await updateProfile({ country: "US" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to update profile");
  });

  it("handles unique constraint violation on username", async () => {
    mockUsernameQuery();
    // PDS status check - use 'external' to skip PDS operations
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { pds_status: "external" },
          error: null,
        }),
      })
    );

    // Update users table — unique constraint violation
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        eq: jest.fn().mockResolvedValue({
          error: { message: "unique violation", code: "23505" },
        }),
      })
    );

    const result = await updateProfile({ username: "taken_name" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Username is already taken");
  });

  describe("PDS handle updates", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      // Prepend the "current username" query mock before any PDS mocks
      mockUsernameQuery();
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    });

    it("calls update-pds-handle edge function when pds_status is active", async () => {
      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id for alt update
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: 1 },
            error: null,
          }),
        })
      );

      // Update alts table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      const result = await updateProfile({ username: "newusername" });

      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "update-pds-handle",
        expect.objectContaining({
          body: expect.objectContaining({ username: "newusername" }),
        })
      );
      expect(result.success).toBe(true);
    });

    it("does not call update-pds-handle when pds_status is pending", async () => {
      // PDS status check — pending
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "pending" },
            error: null,
          }),
        })
      );

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id for alt update
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: 1 },
            error: null,
          }),
        })
      );

      // Update alts table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      const result = await updateProfile({ username: "newusername" });

      // Should call provision-pds, not update-pds-handle
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "provision-pds",
        expect.any(Object)
      );
      expect(mockFunctionsInvoke).not.toHaveBeenCalledWith(
        "update-pds-handle",
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    it("does not call update-pds-handle when pds_status is external", async () => {
      // PDS status check — external
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "external" },
            error: null,
          }),
        })
      );

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      // Update users table
      mockFrom.mockReturnValueOnce({
        update: mockUpdate,
        eq: mockEq,
      });

      // Get main_alt_id for alt update
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: 1 },
            error: null,
          }),
        })
      );

      // Update alts table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      const result = await updateProfile({ username: "newusername" });

      // Should not call any PDS function
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("returns error when update-pds-handle fails with HANDLE_TAKEN", async () => {
      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          success: false,
          code: "HANDLE_TAKEN",
          error: "Handle already taken",
        },
        error: null,
      });

      const result = await updateProfile({ username: "takenhandle" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("This handle is already registered on Bluesky");
    });

    it("returns error when update-pds-handle request times out", async () => {
      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: Object.assign(new Error("The signal was aborted"), {
          name: "AbortError",
        }),
      });

      const result = await updateProfile({ username: "newusername" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
    });

    it("returns error when update-pds-handle fails with generic error", async () => {
      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, error: "PDS API error" },
        error: null,
      });

      const result = await updateProfile({ username: "newusername" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("PDS API error");
    });

    it("sanitizes username for PDS handle (removes non-alphanumeric)", async () => {
      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id for alt update
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: 1 },
            error: null,
          }),
        })
      );

      // Update alts table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      await updateProfile({ username: "my_user_name123" });

      // Should call update-pds-handle with sanitized username (underscores removed)
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "update-pds-handle",
        expect.objectContaining({
          body: expect.objectContaining({ username: "myusername123" }),
        })
      );
    });
  });

  describe("bio update", () => {
    it("updates bio on main alt when bio is provided", async () => {
      mockUsernameQuery();

      // users table update (no username change, just other fields)
      // In this scenario there's no userUpdate so the update step is skipped
      // bio path: fetch main_alt_id
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: 5 },
            error: null,
          }),
        })
      );

      // Update alts table bio
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      const result = await updateProfile({ bio: "Pokemon master" });

      expect(result.success).toBe(true);
    });

    it("returns error when bio update fails", async () => {
      mockUsernameQuery();

      // bio path: fetch main_alt_id
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: 5 },
            error: null,
          }),
        })
      );

      // Update alts table bio — error
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({
            error: { message: "constraint error", code: "42000" },
          }),
        })
      );

      const result = await updateProfile({ bio: "Pokemon master" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to sync profile to alt");
    });

    it("skips alt bio update when user has no main alt", async () => {
      mockUsernameQuery();

      // bio path: fetch main_alt_id — no alt
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: null },
            error: null,
          }),
        })
      );

      const result = await updateProfile({ bio: "Pokemon master" });

      // Should succeed even without a main alt
      expect(result.success).toBe(true);
    });
  });

  describe("username update without main alt", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockAuth.getSession.mockResolvedValue({
        data: { session: { access_token: "token-abc" } },
      });
      mockAuth.updateUser.mockResolvedValue({ error: null });
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      });
    });

    afterAll(() => {
      global.fetch = originalFetch;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    });

    it("skips alt username sync when user has no main alt", async () => {
      mockUsernameQuery();

      // PDS status check — external (skip PDS)
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "external" },
            error: null,
          }),
        })
      );

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id — null
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: null },
            error: null,
          }),
        })
      );

      const result = await updateProfile({ username: "newname" });

      expect(result.success).toBe(true);
      // auth.updateUser should still be called to sync metadata
      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        data: { username: "newname" },
      });
    });

    it("returns error when alt_id fetch fails", async () => {
      mockUsernameQuery();

      // PDS status check — external
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "external" },
            error: null,
          }),
        })
      );

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id — error
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "db error", code: "500" },
          }),
        })
      );

      const result = await updateProfile({ username: "newname" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to sync profile to alt");
    });

    it("returns error when alt username update fails", async () => {
      mockUsernameQuery();

      // PDS status check — external
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "external" },
            error: null,
          }),
        })
      );

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id — has alt
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: 7 },
            error: null,
          }),
        })
      );

      // Update alts table — error
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({
            error: { message: "constraint", code: "42000" },
          }),
        })
      );

      const result = await updateProfile({ username: "newname" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to sync profile to alt");
    });

    it("returns error when auth metadata update fails", async () => {
      mockUsernameQuery();

      // PDS status check — external
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "external" },
            error: null,
          }),
        })
      );

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id — no alt
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: null },
            error: null,
          }),
        })
      );

      mockAuth.updateUser.mockResolvedValue({
        error: { message: "auth service error" },
      });

      const result = await updateProfile({ username: "newname" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update auth metadata");
    });
  });

  describe("PDS provision paths", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      mockAuth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      mockAuth.getSession.mockResolvedValue({
        data: { session: { access_token: "token-abc" } },
      });
      mockAuth.updateUser.mockResolvedValue({ error: null });
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      });
    });

    afterAll(() => {
      global.fetch = originalFetch;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    });

    it("returns error when provision-pds invoke fails", async () => {
      mockUsernameQuery();

      // PDS status check — null (triggers provision)
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: null },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error("JWT expired"),
      });

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to connect to server");
    });

    it("returns error when provision-pds fetch times out", async () => {
      mockUsernameQuery();

      // PDS status check — failed
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "failed" },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: Object.assign(new Error("The signal was aborted"), {
          name: "AbortError",
        }),
      });

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Request timed out. Please try again.");
    });

    it("returns error when provision-pds fetch fails with network error", async () => {
      mockUsernameQuery();

      // PDS status check — null
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: null },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error("Network error"),
      });

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to connect to server");
    });

    it("handles ALREADY_PROVISIONED and continues with profile update", async () => {
      mockUsernameQuery();

      // PDS status check — null
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: null },
            error: null,
          }),
        })
      );

      // provision-pds returns ALREADY_PROVISIONED
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, code: "ALREADY_PROVISIONED" },
        error: null,
      });

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: null },
            error: null,
          }),
        })
      );

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(true);
    });

    it("returns error when provision-pds response fails to parse", async () => {
      mockUsernameQuery();

      // PDS status check — null
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: null },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false },
        error: null,
      });

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create your Bluesky account");
    });

    it("returns error when provision-pds returns HANDLE_TAKEN", async () => {
      mockUsernameQuery();

      // PDS status check — null
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: null },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false, code: "HANDLE_TAKEN" },
        error: null,
      });

      const result = await updateProfile({ username: "takenuser" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("This handle is already registered on Bluesky");
    });

    it("returns error with provision-pds generic failure message", async () => {
      mockUsernameQuery();

      // PDS status check — null
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: null },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: {
          success: false,
          code: "SOME_OTHER_ERROR",
          error: "Quota exceeded",
        },
        error: null,
      });

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Quota exceeded");
    });

    it("returns error when update-pds-handle invoke fails", async () => {
      mockUsernameQuery();

      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error("JWT expired"),
      });

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update Bluesky handle");
    });

    it("returns error when update-pds-handle fetch throws network error", async () => {
      mockUsernameQuery();

      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error("Network failure"),
      });

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update Bluesky handle");
    });

    it("returns error when update-pds-handle response fails to parse", async () => {
      mockUsernameQuery();

      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error("parse error"),
      });

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update Bluesky handle");
    });

    it("returns error when pds_status fetch itself errors", async () => {
      mockUsernameQuery();

      // PDS status check — db error
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "db error", code: "500" },
          }),
        })
      );

      const result = await updateProfile({ username: "newuser" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch user data");
    });

    it("invalidates new username cache tag when username changes", async () => {
      // Setup: current username is old_name, new is new_name
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest
            .fn()
            .mockResolvedValue({ data: { username: "old_name" }, error: null }),
        })
      );

      // PDS status check — external
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "external" },
            error: null,
          }),
        })
      );

      // Update users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
      );

      // Get main_alt_id
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { main_alt_id: null },
            error: null,
          }),
        })
      );

      await updateProfile({ username: "new_name" });

      expect(mockUpdateTag).toHaveBeenCalledWith("player:old_name");
      expect(mockUpdateTag).toHaveBeenCalledWith("player:new_name");
      expect(mockUpdateTag).toHaveBeenCalledWith("players-directory");
      expect(mockUpdateTag).toHaveBeenCalledWith("players-new");
      // Username changes affect leaderboards which display usernames
      expect(mockUpdateTag).toHaveBeenCalledWith("players-leaderboard");
      expect(mockUpdateTag).toHaveBeenCalledWith("players-recent");
    });
  });
});

// ── updateAltVisibilityAction ──────────────────────────────────────────────

describe("updateAltVisibilityAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("returns error when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await updateAltVisibilityAction(1, true);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not authenticated");
  });

  it("returns error when alt not found", async () => {
    // alts table — alt not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    const result = await updateAltVisibilityAction(99, true);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Alt not found");
  });

  it("returns error when alt belongs to a different user", async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 1, user_id: "other-user" },
          error: null,
        }),
      })
    );

    const result = await updateAltVisibilityAction(1, true);

    expect(result.success).toBe(false);
    expect(result.error).toContain("only update your own alts");
  });

  it("returns error when DB update fails", async () => {
    // Alt lookup — belongs to user-1
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 1, user_id: "user-1" },
          error: null,
        }),
      })
    );

    // Update alts — error
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        eq: jest.fn().mockResolvedValue({
          error: { message: "constraint", code: "42000" },
        }),
      })
    );

    const result = await updateAltVisibilityAction(1, false);

    expect(result.success).toBe(false);
  });

  it("returns success and invalidates player cache", async () => {
    // Alt lookup — belongs to user-1
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 1, user_id: "user-1" },
          error: null,
        }),
      })
    );

    // Update alts table
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
    );

    // Fetch username for cache invalidation
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { username: "ash_ketchum" },
          error: null,
        }),
      })
    );

    const result = await updateAltVisibilityAction(1, true);

    expect(result.success).toBe(true);
    expect(mockUpdateTag).toHaveBeenCalledWith("player:ash_ketchum");
  });

  it("does not throw when username lookup returns null", async () => {
    // Alt lookup — belongs to user-1
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 1, user_id: "user-1" },
          error: null,
        }),
      })
    );

    // Update alts table
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
    );

    // Fetch username — no user row
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    const result = await updateAltVisibilityAction(1, true);

    // Should still succeed — missing username just skips cache tag
    expect(result.success).toBe(true);
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});
