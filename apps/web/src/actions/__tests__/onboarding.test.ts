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

jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: jest.fn(() => null),
  })),
}));

// Mock global fetch for PDS handle check and provisioning
const originalFetch = global.fetch;

import { userFactory } from "@trainers/test-utils/factories";
import { checkBotId } from "botid/server";
import { headers } from "next/headers";
import { completeOnboarding } from "../onboarding";

// Helper to create a chainable mock query builder
function createQueryBuilder(overrides: Record<string, unknown> = {}) {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  Object.assign(builder, overrides);
  return builder;
}

const validInput = {
  username: "ash_ketchum",
  country: "US",
  bio: "Pokemon trainer from Pallet Town",
};

describe("completeOnboarding", () => {
  const testUser = userFactory.build({ username: "temp_abc123" });

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks doesn't clear mockReturnValueOnce/mockResolvedValueOnce
    // queues — use mockReset on mocks that use them to prevent cross-test
    // pollution (e.g. the BotID "skips" test leaves an unconsumed value)
    mockFrom.mockReset();
    (checkBotId as jest.Mock)
      .mockReset()
      .mockImplementation(async () => ({ isBot: false }));
    (headers as jest.Mock)
      .mockReset()
      .mockImplementation(async () => ({ get: jest.fn(() => null) }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";

    // Default: authenticated user
    mockAuth.getUser.mockResolvedValue({
      data: {
        user: {
          id: testUser.id,
          user_metadata: { username: testUser.username },
        },
      },
      error: null,
    });

    // Default: session with access token (for PDS provisioning)
    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    });

    // Default: auth metadata update succeeds
    mockAuth.updateUser.mockResolvedValue({ error: null });

    // Default: PDS handle available (400 = not found = available),
    // and provisioning succeeds
    global.fetch = jest.fn().mockResolvedValue({
      status: 400,
      json: jest.fn().mockResolvedValue({ success: true }),
    }) as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  /**
   * Sets up mockFrom for the full happy-path sequence:
   * 1. users table username check (maybeSingle)
   * 2. alts table username check (maybeSingle)
   * 3. users table update (update → eq)
   * 4. users table get main_alt_id (maybeSingle)
   * 5. alts table update (update → eq)
   * 6. users table PDS status check (maybeSingle)
   */
  function setupHappyPath(
    overrides: { mainAltId?: number | null; pdsStatus?: string | null } = {}
  ) {
    const { mainAltId = 42, pdsStatus = "pending" } = overrides;

    // 1. Username check in users table — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 2. Username check in alts table — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 3. Update users table
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    // 4. Get main_alt_id
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: mainAltId !== null ? { main_alt_id: mainAltId } : null,
          error: null,
        }),
      })
    );

    // 5. Update alts table (only reached if mainAltId exists)
    if (mainAltId !== null) {
      mockFrom.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });
    }

    // 6. PDS status check for provisionPds
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { pds_status: pdsStatus },
          error: null,
        }),
      })
    );
  }

  it("returns success when all checks pass (happy path)", async () => {
    setupHappyPath();

    const result = await completeOnboarding(validInput);

    expect(result).toEqual({ success: true, error: null });
  });

  it("returns error when bot is detected", async () => {
    (checkBotId as jest.Mock).mockResolvedValueOnce({ isBot: true });

    const result = await completeOnboarding(validInput);

    expect(result).toEqual({ success: false, error: "Access denied" });
    // Should not proceed to any DB calls
    expect(mockFrom).not.toHaveBeenCalled();
  });

  describe("BotID E2E bypass", () => {
    const BYPASS_SECRET = "test-bypass-secret";

    afterEach(() => {
      delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    });

    it("skips BotID when valid bypass header and secret match", async () => {
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET = BYPASS_SECRET;

      // Even though checkBotId would flag as bot, bypass should skip it
      (checkBotId as jest.Mock).mockResolvedValueOnce({ isBot: true });

      // Mock headers to return the matching bypass secret
      (headers as jest.Mock).mockResolvedValueOnce({
        get: jest.fn((name: string) => {
          if (name === "x-vercel-protection-bypass") return BYPASS_SECRET;
          return null;
        }),
      });

      // Set up the rest of the flow to succeed
      setupHappyPath();

      const result = await completeOnboarding(validInput);

      // Bot check was bypassed, so the action should succeed
      expect(result).toEqual({ success: true, error: null });
      expect(checkBotId).not.toHaveBeenCalled();
    });

    it("runs BotID when bypass header is missing", async () => {
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET = BYPASS_SECRET;

      // checkBotId returns not-a-bot so the flow continues
      (checkBotId as jest.Mock).mockResolvedValueOnce({ isBot: false });

      // Mock headers to return null for the bypass header
      (headers as jest.Mock).mockResolvedValueOnce({
        get: jest.fn((name: string) => {
          if (name === "x-vercel-protection-bypass") return null;
          return null;
        }),
      });

      setupHappyPath();

      await completeOnboarding(validInput);

      // BotID should still be called since bypass header is missing
      expect(checkBotId).toHaveBeenCalled();
    });

    it("runs BotID when bypass secret doesn't match", async () => {
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET = BYPASS_SECRET;

      (checkBotId as jest.Mock).mockResolvedValueOnce({ isBot: false });

      // Mock headers to return a wrong bypass value
      (headers as jest.Mock).mockResolvedValueOnce({
        get: jest.fn((name: string) => {
          if (name === "x-vercel-protection-bypass") return "wrong-secret";
          return null;
        }),
      });

      setupHappyPath();

      await completeOnboarding(validInput);

      // BotID should still be called since secrets don't match
      expect(checkBotId).toHaveBeenCalled();
    });

    it("runs BotID when VERCEL_AUTOMATION_BYPASS_SECRET is not set", async () => {
      // Ensure the env var is not set
      delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

      (checkBotId as jest.Mock).mockResolvedValueOnce({ isBot: false });

      // Mock headers to return some bypass value
      (headers as jest.Mock).mockResolvedValueOnce({
        get: jest.fn((name: string) => {
          if (name === "x-vercel-protection-bypass") return "some-value";
          return null;
        }),
      });

      setupHappyPath();

      await completeOnboarding(validInput);

      // BotID should still be called since env var is not set
      expect(checkBotId).toHaveBeenCalled();
    });
  });

  it("returns error when user is not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await completeOnboarding(validInput);

    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it.each([
    {
      scenario: "users table",
      usersData: { id: "other-user" },
      altsData: null,
    },
    {
      scenario: "alts table",
      usersData: null,
      altsData: { id: 99, user_id: "other-user" },
    },
  ])(
    "returns error when username is taken in $scenario",
    async ({ usersData, altsData }) => {
      // 1. Username check in users table
      mockFrom.mockReturnValueOnce(
        createQueryBuilder({
          maybeSingle: jest
            .fn()
            .mockResolvedValue({ data: usersData, error: null }),
        })
      );

      // 2. Username check in alts table (only reached if users check passed)
      if (!usersData) {
        mockFrom.mockReturnValueOnce(
          createQueryBuilder({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: altsData, error: null }),
          })
        );
      }

      const result = await completeOnboarding(validInput);

      expect(result).toEqual({
        success: false,
        error: "Username is already taken",
      });
    }
  );

  it("returns error when PDS handle is already taken", async () => {
    // 1. Username check in users — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 2. Username check in alts — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // PDS handle exists (200 = resolved = taken)
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
    }) as unknown as typeof fetch;

    const result = await completeOnboarding(validInput);

    expect(result).toEqual({
      success: false,
      error: "This handle is already registered on Bluesky",
    });
  });

  it("succeeds when bio is empty string (normalized to null)", async () => {
    setupHappyPath();

    const result = await completeOnboarding({
      username: "ash_ketchum",
      country: "US",
      bio: "",
    });

    // Empty bio is valid — normalized to null before writing to DB
    expect(result).toEqual({ success: true, error: null });
  });

  it("returns validation error when country code is invalid", async () => {
    const result = await completeOnboarding({
      username: "ash_ketchum",
      country: "USA",
      bio: "A valid bio",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns error on unique constraint violation (23505) during update", async () => {
    // 1. Username check in users — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 2. Username check in alts — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 3. Update users table — unique constraint violation
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: "duplicate key", code: "23505" },
        }),
      }),
    });

    const result = await completeOnboarding(validInput);

    expect(result).toEqual({
      success: false,
      error: "Username is already taken",
    });
  });

  it("returns success even when PDS provisioning fails (non-blocking)", async () => {
    // 1. Username check in users — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 2. Username check in alts — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 3. Update users table — success
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    // 4. Get main_alt_id
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { main_alt_id: 42 },
          error: null,
        }),
      })
    );

    // 5. Update alts table — success
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    // 6. PDS status check
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { pds_status: "pending" },
          error: null,
        }),
      })
    );

    // PDS handle check returns available (first fetch call),
    // but provisioning throws an error (second fetch call)
    const fetchMock = jest
      .fn()
      // First call: PDS handle availability check (400 = available)
      .mockResolvedValueOnce({ status: 400 })
      // Second call: provision-pds edge function throws
      .mockRejectedValueOnce(new Error("PDS service unavailable"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await completeOnboarding(validInput);

    // Action still returns success despite PDS failure
    expect(result).toEqual({ success: true, error: null });
  });

  it("succeeds even when alt update fails (non-blocking)", async () => {
    // 1. Username check in users — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 2. Username check in alts — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 3. Update users table — success
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    // 4. Get main_alt_id
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { main_alt_id: 42 },
          error: null,
        }),
      })
    );

    // 5. Update alts table — error (non-blocking, should continue)
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: { message: "Alt update failed" },
        }),
      }),
    });

    // Auth metadata update still succeeds
    mockAuth.updateUser.mockResolvedValue({ error: null });

    const result = await completeOnboarding(validInput);

    expect(result).toEqual({
      success: true,
      error: null,
    });
  });

  it("returns error when auth metadata update fails", async () => {
    // Set up all DB calls to succeed, but skip PDS provisioning
    // by not setting up the 6th mockFrom call

    // 1. Username check in users — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 2. Username check in alts — not found
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    );

    // 3. Update users table — success
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    // 4. Get main_alt_id — null (no alt to update)
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })
    );

    // Auth metadata update fails
    mockAuth.updateUser.mockResolvedValue({
      error: { message: "Auth update failed" },
    });

    const result = await completeOnboarding(validInput);

    expect(result).toEqual({
      success: false,
      error: "Failed to update auth metadata",
    });
  });
});
