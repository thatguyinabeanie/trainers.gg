/**
 * @jest-environment node
 */

/**
 * Tests for identities server actions
 * Verifies linked accounts management and lockout protection
 */

// Mock Supabase client
const mockFrom = jest.fn();
const mockAuth = {
  getUser: jest.fn(),
};

const mockSupabaseClient = {
  from: mockFrom,
  auth: mockAuth,
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabaseClient),
}));

import { getBlueskyStatus, unlinkBlueskyAction } from "../identities";

// Helper to create query builder mock
function createQueryBuilder(data: unknown = null, error: unknown = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
    update: jest.fn().mockReturnThis(),
  };
}

describe("getBlueskyStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null values when user has no Bluesky account", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue(
      createQueryBuilder({
        did: null,
        pds_status: null,
        pds_handle: null,
      })
    );

    const result = await getBlueskyStatus();

    expect(result.success).toBe(true);
    expect(result.data?.did).toBeNull();
    expect(result.data?.pdsStatus).toBeNull();
    expect(result.data?.handle).toBeNull();
  });

  it("returns DID and handle when user has active PDS account", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue(
      createQueryBuilder({
        did: "did:plc:test123",
        pds_status: "active",
        pds_handle: "testuser.trainers.gg",
      })
    );

    const result = await getBlueskyStatus();

    expect(result.success).toBe(true);
    expect(result.data?.did).toBe("did:plc:test123");
    expect(result.data?.pdsStatus).toBe("active");
    expect(result.data?.handle).toBe("testuser.trainers.gg");
  });

  it("returns DID when user has external Bluesky account", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockFrom.mockReturnValue(
      createQueryBuilder({
        did: "did:plc:external456",
        pds_status: "external",
        pds_handle: null,
      })
    );

    const result = await getBlueskyStatus();

    expect(result.success).toBe(true);
    expect(result.data?.did).toBe("did:plc:external456");
    expect(result.data?.pdsStatus).toBe("external");
    expect(result.data?.handle).toBeNull();
  });

  it("returns error when user is not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getBlueskyStatus();

    expect(result.success).toBe(false);
    expect(result.error).toContain("authenticated");
  });

  it("handles database errors gracefully", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    // Mock the query builder to throw an error
    mockFrom.mockImplementation(() => {
      throw new Error("Database connection failed");
    });

    const result = await getBlueskyStatus();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("unlinkBlueskyAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("lockout protection", () => {
    it("prevents unlinking when Bluesky is the only auth method", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: [], // No OAuth identities
          },
        },
      });
      mockFrom.mockReturnValue(
        createQueryBuilder({
          did: "did:plc:test123",
        })
      );

      const result = await unlinkBlueskyAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least one authentication method");
    });

    it("allows unlinking when user has other OAuth identities", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: [
              {
                id: "oauth-1",
                user_id: "user-123",
                identity_id: "google-123",
                provider: "google",
              },
            ],
          },
        },
      });
      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            did: "did:plc:test123",
          })
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      const result = await unlinkBlueskyAction();

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        did: null,
        pds_status: null,
        pds_handle: null,
      });
    });

    it("calculates total methods correctly with multiple OAuth identities", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: [
              {
                id: "oauth-1",
                user_id: "user-123",
                identity_id: "google-123",
                provider: "google",
              },
              {
                id: "oauth-2",
                user_id: "user-123",
                identity_id: "github-456",
                provider: "github",
              },
            ],
          },
        },
      });
      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            did: "did:plc:test123",
          })
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      const result = await unlinkBlueskyAction();

      expect(result.success).toBe(true);
    });

    it("allows unlinking when total methods = 2 (1 OAuth + 1 Bluesky)", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: [
              {
                id: "oauth-1",
                user_id: "user-123",
                identity_id: "google-123",
                provider: "google",
              },
            ],
          },
        },
      });
      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            did: "did:plc:test123",
          })
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      const result = await unlinkBlueskyAction();

      expect(result.success).toBe(true);
    });

    it("blocks unlinking when total methods = 1 (Bluesky only)", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: [],
          },
        },
      });
      mockFrom.mockReturnValue(
        createQueryBuilder({
          did: "did:plc:test123",
        })
      );

      const result = await unlinkBlueskyAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least one");
    });
  });

  describe("database update", () => {
    beforeEach(() => {
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: [
              {
                id: "oauth-1",
                user_id: "user-123",
                identity_id: "google-123",
                provider: "google",
              },
            ],
          },
        },
      });
    });

    it("sets did, pds_status, and pds_handle to null", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            did: "did:plc:test123",
          })
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      await unlinkBlueskyAction();

      expect(mockUpdate).toHaveBeenCalledWith({
        did: null,
        pds_status: null,
        pds_handle: null,
      });
    });

    it("updates the correct user record", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            did: "did:plc:test123",
          })
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      await unlinkBlueskyAction();

      expect(mockEq).toHaveBeenCalledWith("id", "user-123");
    });

    it("returns error when database update fails", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest
        .fn()
        .mockResolvedValue({ error: new Error("Update failed") });

      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            did: "did:plc:test123",
          })
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      const result = await unlinkBlueskyAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to unlink");
    });
  });

  describe("error handling", () => {
    it("returns error when user is not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await unlinkBlueskyAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("authenticated");
    });

    it("handles missing identities array gracefully", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: undefined, // Missing identities
          },
        },
      });
      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder({
            did: null, // No Bluesky either
          })
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      const result = await unlinkBlueskyAction();

      // Should fail lockout protection (0 total methods)
      expect(result.success).toBe(false);
      expect(result.error).toContain("at least one");
    });

    it("handles user data fetch errors", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: [
              {
                id: "oauth-1",
                user_id: "user-123",
                identity_id: "google-123",
                provider: "google",
              },
            ],
          },
        },
      });
      mockFrom.mockReturnValue(
        createQueryBuilder(null, new Error("Fetch failed"))
      );

      const result = await unlinkBlueskyAction();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("handles null DID (already unlinked)", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            identities: [
              {
                id: "oauth-1",
                user_id: "user-123",
                identity_id: "google-123",
                provider: "google",
              },
              {
                id: "oauth-2",
                user_id: "user-123",
                identity_id: "github-456",
                provider: "github",
              },
            ],
          },
        },
      });
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          did: null, // Already unlinked
        })
      );

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockFrom.mockReturnValueOnce({
        update: mockUpdate,
        eq: mockEq,
      });

      const result = await unlinkBlueskyAction();

      // Should still succeed (idempotent operation)
      // Since there's no Bluesky account (did=null), the update is a no-op but doesn't fail
      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        did: null,
        pds_status: null,
        pds_handle: null,
      });
    });
  });
});
