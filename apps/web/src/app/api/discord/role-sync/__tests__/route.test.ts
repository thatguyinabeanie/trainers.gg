/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockListPendingRoleSyncs = jest.fn();
const mockMarkRoleSyncComplete = jest.fn();
const mockMarkRoleSyncFailed = jest.fn();
const mockToggleRoleMapping = jest.fn();

jest.mock("@trainers/supabase", () => ({
  listPendingRoleSyncs: (...args: unknown[]) =>
    mockListPendingRoleSyncs(...args),
  markRoleSyncComplete: (...args: unknown[]) =>
    mockMarkRoleSyncComplete(...args),
  markRoleSyncFailed: (...args: unknown[]) => mockMarkRoleSyncFailed(...args),
  toggleRoleMapping: (...args: unknown[]) => mockToggleRoleMapping(...args),
}));

const mockCreateServiceRoleClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

const mockAssignRole = jest.fn();
const mockRemoveRole = jest.fn();
const mockGetErrorCode = jest.fn();

// DiscordRateLimitError is a class — we need a real constructor for instanceof checks
class MockDiscordRateLimitError extends Error {
  readonly retryAfter: number;
  constructor(retryAfter: number) {
    super(`Rate limited — retry after ${retryAfter}s`);
    this.name = "DiscordRateLimitError";
    this.retryAfter = retryAfter;
  }
}

jest.mock("@/lib/discord/api", () => ({
  assignRole: (...args: unknown[]) => mockAssignRole(...args),
  removeRole: (...args: unknown[]) => mockRemoveRole(...args),
  getErrorCode: (e: unknown) => mockGetErrorCode(e),
  DiscordRateLimitError: MockDiscordRateLimitError,
}));

// role-sync-helpers classifiers — mock so tests control branching independently
const mockIsHierarchyViolation = jest.fn();
const mockIsUnknownRole = jest.fn();
const mockIsUnknownMember = jest.fn();

jest.mock("@/lib/discord/role-sync-helpers", () => ({
  isHierarchyViolation: (e: unknown) => mockIsHierarchyViolation(e),
  isUnknownRole: (e: unknown) => mockIsUnknownRole(e),
  isUnknownMember: (e: unknown) => mockIsUnknownMember(e),
  // Re-export the mock class so the route can do instanceof checks
  DiscordRateLimitError: MockDiscordRateLimitError,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const CRON_SECRET = "super-secret-cron-token";

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost:3000/api/discord/role-sync", {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  });
}

/** Build a minimal role-sync queue job. */
function makeJob(
  overrides: Partial<{
    id: number;
    discord_server_id: number;
    discord_user_id: string;
    discord_role_id: string;
    action: "add" | "remove";
  }> = {}
) {
  return {
    id: overrides.id ?? 1,
    discord_server_id: overrides.discord_server_id ?? 10,
    discord_user_id: overrides.discord_user_id ?? "user-111",
    discord_role_id: overrides.discord_role_id ?? "role-222",
    action: overrides.action ?? "add",
    status: "pending",
    source_event: "reconcile",
    created_at: new Date().toISOString(),
    attempts: 0,
    completed_at: null,
    failed_reason: null,
  };
}

// =============================================================================
// Setup
// =============================================================================

const originalEnv = process.env;

// Supabase client mock with chainable .from().select().in() for the server lookup
const FAKE_SUPABASE = {
  from: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, CRON_SECRET };
  mockCreateServiceRoleClient.mockReturnValue(FAKE_SUPABASE);
  mockListPendingRoleSyncs.mockResolvedValue([]);
  mockMarkRoleSyncComplete.mockResolvedValue(undefined);
  mockMarkRoleSyncFailed.mockResolvedValue(undefined);
  mockToggleRoleMapping.mockResolvedValue(undefined);
  mockAssignRole.mockResolvedValue(undefined);
  mockRemoveRole.mockResolvedValue(undefined);
  mockGetErrorCode.mockReturnValue("unknown");
  mockIsHierarchyViolation.mockReturnValue(false);
  mockIsUnknownRole.mockReturnValue(false);
  mockIsUnknownMember.mockReturnValue(false);

  // Default: server lookup returns guild_id for server 10
  FAKE_SUPABASE.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({
        data: [{ id: 10, guild_id: "guild-999" }],
        error: null,
      }),
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 77 },
            error: null,
          }),
        }),
      }),
    }),
  });
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// Authorization
// =============================================================================

describe("Authorization", () => {
  it("returns 401 when the authorization header is missing", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 401 when the bearer token does not match CRON_SECRET", async () => {
    const response = await GET(makeRequest("Bearer wrong-token"));
    expect(response.status).toBe(401);
  });

  it("proceeds when authorization matches Bearer CRON_SECRET", async () => {
    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Happy path
// =============================================================================

describe("Happy path — add and remove succeed", () => {
  it("calls markRoleSyncComplete for each successfully processed job", async () => {
    const jobs = [
      makeJob({ id: 1, action: "add", discord_server_id: 10 }),
      makeJob({ id: 2, action: "remove", discord_server_id: 10 }),
    ];
    mockListPendingRoleSyncs.mockResolvedValue(jobs);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockMarkRoleSyncComplete).toHaveBeenCalledTimes(2);
    expect(mockMarkRoleSyncComplete).toHaveBeenCalledWith(FAKE_SUPABASE, 1);
    expect(mockMarkRoleSyncComplete).toHaveBeenCalledWith(FAKE_SUPABASE, 2);
  });

  it("calls assignRole for add jobs and removeRole for remove jobs", async () => {
    const addJob = makeJob({
      id: 1,
      action: "add",
      discord_user_id: "u-add",
      discord_role_id: "r-add",
    });
    const removeJob = makeJob({
      id: 2,
      action: "remove",
      discord_user_id: "u-rem",
      discord_role_id: "r-rem",
    });
    mockListPendingRoleSyncs.mockResolvedValue([addJob, removeJob]);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockAssignRole).toHaveBeenCalledWith("guild-999", "u-add", "r-add");
    expect(mockRemoveRole).toHaveBeenCalledWith("guild-999", "u-rem", "r-rem");
  });

  it("returns processed=2, completed=2, failed=0 on two successes", async () => {
    mockListPendingRoleSyncs.mockResolvedValue([
      makeJob({ id: 1, action: "add" }),
      makeJob({ id: 2, action: "remove" }),
    ]);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.processed).toBe(2);
    expect(body.completed).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.errors).toEqual([]);
  });
});

// =============================================================================
// Hierarchy violation (403 / 50013)
// =============================================================================

describe("Hierarchy violation — 403/50013", () => {
  it("marks job failed with hierarchy_violation reason", async () => {
    const job = makeJob({ id: 5, action: "add" });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    const err = new Error("Missing Permissions");
    mockAssignRole.mockRejectedValue(err);
    mockIsHierarchyViolation.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(50013);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockMarkRoleSyncFailed).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      5,
      "hierarchy_violation:50013"
    );
  });

  it("does NOT toggle the role mapping for hierarchy violations", async () => {
    const job = makeJob({ id: 5, action: "add" });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new Error("Hierarchy"));
    mockIsHierarchyViolation.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(50013);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockToggleRoleMapping).not.toHaveBeenCalled();
  });

  it("increments failed count and surfaces error in stats", async () => {
    const job = makeJob({ id: 5 });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new Error("Hierarchy"));
    mockIsHierarchyViolation.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(50013);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.failed).toBe(1);
    expect(body.completed).toBe(0);
    expect((body.errors as unknown[]).length).toBe(1);
  });
});

// =============================================================================
// Unknown role (10011 — role deleted)
// =============================================================================

describe("Unknown role — 10011 (role deleted)", () => {
  it("marks job failed with role_deleted reason", async () => {
    const job = makeJob({ id: 6, discord_role_id: "r-dead" });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new Error("Unknown Role"));
    mockIsHierarchyViolation.mockReturnValue(false);
    mockIsUnknownRole.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(10011);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockMarkRoleSyncFailed).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      6,
      "role_deleted:10011"
    );
  });

  it("calls toggleRoleMapping(false) exactly once when mapping is found", async () => {
    const job = makeJob({
      id: 6,
      discord_role_id: "r-dead",
      discord_server_id: 10,
    });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new Error("Unknown Role"));
    mockIsHierarchyViolation.mockReturnValue(false);
    mockIsUnknownRole.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(10011);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockToggleRoleMapping).toHaveBeenCalledTimes(1);
    expect(mockToggleRoleMapping).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      77,
      false
    );
  });
});

// =============================================================================
// Unknown member (10007 — user left)
// =============================================================================

describe("Unknown member — 10007 (user left)", () => {
  it("marks job failed with user_left reason", async () => {
    const job = makeJob({ id: 7 });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new Error("Unknown Member"));
    mockIsHierarchyViolation.mockReturnValue(false);
    mockIsUnknownRole.mockReturnValue(false);
    mockIsUnknownMember.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(10007);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockMarkRoleSyncFailed).toHaveBeenCalledWith(
      FAKE_SUPABASE,
      7,
      "user_left:10007"
    );
  });

  it("does NOT toggle the role mapping for unknown member errors", async () => {
    const job = makeJob({ id: 7 });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new Error("Unknown Member"));
    mockIsHierarchyViolation.mockReturnValue(false);
    mockIsUnknownRole.mockReturnValue(false);
    mockIsUnknownMember.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(10007);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockToggleRoleMapping).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limit — leave pending
// =============================================================================

describe("Rate limit (429) — leave job pending", () => {
  it("does not call markRoleSyncFailed or markRoleSyncComplete on rate limit", async () => {
    const job = makeJob({ id: 8 });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    const rateLimitErr = new MockDiscordRateLimitError(5);
    mockAssignRole.mockRejectedValue(rateLimitErr);
    mockIsHierarchyViolation.mockReturnValue(false);
    mockIsUnknownRole.mockReturnValue(false);
    mockIsUnknownMember.mockReturnValue(false);
    mockGetErrorCode.mockReturnValue(429);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockMarkRoleSyncFailed).not.toHaveBeenCalled();
    expect(mockMarkRoleSyncComplete).not.toHaveBeenCalled();
  });

  it("surfaces rate_limited in errors array", async () => {
    const job = makeJob({ id: 8 });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new MockDiscordRateLimitError(5));
    mockIsHierarchyViolation.mockReturnValue(false);
    mockIsUnknownRole.mockReturnValue(false);
    mockIsUnknownMember.mockReturnValue(false);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as {
      errors: Array<{ jobId: number; reason: string }>;
      failed: number;
    };

    expect(body.failed).toBe(0);
    const rateLimitEntry = body.errors.find((e) => e.reason === "rate_limited");
    expect(rateLimitEntry).toBeDefined();
    expect(rateLimitEntry?.jobId).toBe(8);
  });
});

// =============================================================================
// Transient 5xx — leave pending
// =============================================================================

describe("Transient 5xx — leave job pending", () => {
  it("does not call markRoleSyncFailed or markRoleSyncComplete on 5xx", async () => {
    const job = makeJob({ id: 9 });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new Error("Internal Server Error"));
    mockIsHierarchyViolation.mockReturnValue(false);
    mockIsUnknownRole.mockReturnValue(false);
    mockIsUnknownMember.mockReturnValue(false);
    mockGetErrorCode.mockReturnValue(500);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockMarkRoleSyncFailed).not.toHaveBeenCalled();
    expect(mockMarkRoleSyncComplete).not.toHaveBeenCalled();
  });

  it("surfaces transient in errors array with the error code", async () => {
    const job = makeJob({ id: 9 });
    mockListPendingRoleSyncs.mockResolvedValue([job]);
    mockAssignRole.mockRejectedValue(new Error("5xx"));
    mockIsHierarchyViolation.mockReturnValue(false);
    mockIsUnknownRole.mockReturnValue(false);
    mockIsUnknownMember.mockReturnValue(false);
    mockGetErrorCode.mockReturnValue(500);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as {
      errors: Array<{ jobId: number; reason: string; code?: number | string }>;
    };

    const entry = body.errors.find((e) => e.reason === "transient");
    expect(entry).toBeDefined();
    expect(entry?.jobId).toBe(9);
    expect(entry?.code).toBe(500);
  });
});
