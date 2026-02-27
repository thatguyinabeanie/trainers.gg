/**
 * @jest-environment node
 */

// Mock Supabase client with chainable query builder
const mockFrom = jest.fn();
const mockAuth = {
  getUser: jest.fn(),
  getSession: jest.fn(),
  updateUser: jest.fn(),
};

const mockSupabaseClient = {
  from: mockFrom,
  auth: mockAuth,
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
}));

jest.mock("botid/server", () => ({
  checkBotId: jest.fn(async () => ({ isBot: false })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock global fetch for PDS handle checks
const originalFetch = global.fetch;

import {
  checkUsernameAvailability,
  getCurrentUserProfile,
  updateProfile,
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

    expect(result.available).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects usernames with invalid characters", async () => {
    const result = await checkUsernameAvailability("user name!");

    expect(result.available).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects temp_ placeholder usernames", async () => {
    const result = await checkUsernameAvailability("temp_abc123");

    expect(result.available).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects user_ placeholder usernames", async () => {
    const result = await checkUsernameAvailability("user_abc123");

    expect(result.available).toBe(false);
    expect(result.error).toBeTruthy();
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

    expect(result.available).toBe(true);
    expect(result.error).toBeNull();
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

    const result = await checkUsernameAvailability("taken_user");

    expect(result.available).toBe(false);
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

    expect(result.available).toBe(false);
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

    expect(result.available).toBe(false);
    expect(result.error).toMatch(/Bluesky/);
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

    expect(result.available).toBe(false);
    expect(result.error).toBeTruthy();
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

    expect(result.available).toBe(false);
    expect(result.error).toBeTruthy();
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
  });

  it("returns null when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getCurrentUserProfile();

    expect(result).toBeNull();
  });

  it("returns null when user not found in DB", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    const result = await getCurrentUserProfile();

    expect(result).toBeNull();
  });

  it("returns profile data when user exists", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            id: "user-1",
            username: "pikachu",
            pds_status: "active",
            pds_handle: "pikachu.trainers.gg",
            did: "did:plc:abc123",
            birth_date: "2000-01-15",
            country: "US",
            main_alt_id: null,
          },
          error: null,
        }),
      })
    );

    const result = await getCurrentUserProfile();

    expect(result).toEqual({
      id: "user-1",
      username: "pikachu",
      pdsStatus: "active",
      pdsHandle: "pikachu.trainers.gg",
      did: "did:plc:abc123",
      birthDate: "2000-01-15",
      country: "US",
      mainAltId: null,
      altAvatarUrl: null,
      bio: null,
    });
  });

  it("returns altAvatarUrl when main_alt_id exists and alt has avatar", async () => {
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
            birth_date: null,
            country: "JP",
            main_alt_id: 42,
          },
          error: null,
        }),
      })
    );

    // Second call: alts table for avatar_url
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            avatar_url:
              "https://play.pokemonshowdown.com/sprites/gen5/garchomp.png",
          },
          error: null,
        }),
      })
    );

    const result = await getCurrentUserProfile();

    expect(result).toEqual({
      id: "user-1",
      username: "cynthia",
      pdsStatus: null,
      pdsHandle: null,
      did: null,
      birthDate: null,
      country: "JP",
      mainAltId: 42,
      altAvatarUrl:
        "https://play.pokemonshowdown.com/sprites/gen5/garchomp.png",
      bio: null,
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
            birth_date: null,
            country: "JP",
            main_alt_id: 42,
          },
          error: null,
        }),
      })
    );

    // Second call: alts table — no avatar
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { avatar_url: null },
          error: null,
        }),
      })
    );

    const result = await getCurrentUserProfile();

    expect(result).toEqual(
      expect.objectContaining({
        mainAltId: 42,
        altAvatarUrl: null,
      })
    );
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

    expect(result).toBeNull();
  });
});

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
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
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

  it("rejects invalid birth date format", async () => {
    const result = await updateProfile({ birthDate: "Jan 15 2000" });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects invalid country code", async () => {
    const result = await updateProfile({ country: "USA" });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("updates birth date and country without username change", async () => {
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

  it("handles database update errors", async () => {
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

      // Mock successful edge function call
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      });

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

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.supabase.co/functions/v1/update-pds-handle",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer token-123",
          }),
          body: expect.stringContaining("newusername"),
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

      // Mock provision-pds call
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true }),
      });

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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("provision-pds"),
        expect.any(Object)
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("update-pds-handle"),
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
      expect(global.fetch).not.toHaveBeenCalled();
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

      // Mock edge function failure (returns before database update)
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: false,
            code: "HANDLE_TAKEN",
            error: "Handle already taken",
          }),
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

      // Mock fetch timeout
      global.fetch = jest.fn().mockImplementation(() => {
        const error = new Error("Timeout");
        error.name = "AbortError";
        return Promise.reject(error);
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

      // Mock edge function failure
      global.fetch = jest.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: false,
            error: "PDS API error",
          }),
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

      // Mock successful edge function call
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });
      global.fetch = mockFetch;

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
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("update-pds-handle"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("myusername123"),
        })
      );
    });

    it("returns error when NEXT_PUBLIC_SUPABASE_URL is not configured", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      // PDS status check — active
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { pds_status: "active" },
            error: null,
          }),
        })
      );

      const result = await updateProfile({ username: "newusername" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("configuration error");
    });
  });
});
