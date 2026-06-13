/**
 * @jest-environment node
 *
 * Tests for pipeline server actions — the admin monitor + recovery actions
 * backing /admin/data.
 *
 * All I/O is mocked: auth, supabase client, all query/mutation functions,
 * and cache invalidation. The intent is to verify the admin gate, happy-path
 * data flow, and error-path forwarding for each action.
 *
 * Architecture:
 * - READ-ONLY actions use the local `requireAdmin()` helper (getUserId + isSiteAdmin)
 * - MUTATION actions use `withAdminAction()` (requireAdminWithSudo + service-role client)
 *
 * Accordingly, the mocking strategy differs:
 * - Read-only: mock `getUserId` + `isSiteAdmin` directly
 * - Mutations: mock `@/lib/auth/with-admin-action` to control callback invocation
 */

// =============================================================================
// Mock declarations — BEFORE imports (Jest hoisting)
// =============================================================================

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({}),
  createServiceRoleClient: jest.fn().mockReturnValue({}),
  getUserId: jest.fn(),
}));

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: jest.fn(async () => false),
}));

// withAdminAction is mocked so mutation tests can simulate sudo-success or
// auth-failure without wiring up the full requireAdminWithSudo chain.
jest.mock("@/lib/auth/with-admin-action", () => ({
  withAdminAction: jest.fn(),
}));

jest.mock("@trainers/supabase/queries", () => ({
  getPipelineMonitor: jest.fn(),
  getImportExclusions: jest.fn(),
}));

jest.mock("@trainers/supabase/mutations", () => ({
  deleteSourceEvent: jest.fn(),
  excludeSourceEvent: jest.fn(),
  clearExclusion: jest.fn(),
  resetStuckEvents: jest.fn(),
  requeueFailedEvents: jest.fn(),
  forceImportEvent: jest.fn(),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  invalidateUsageStatsCaches: jest.fn(),
}));

// =============================================================================
// Imports — AFTER mock declarations
// =============================================================================

import { isSiteAdmin } from "@/lib/sudo/server";
import { createClient, getUserId } from "@/lib/supabase/server";
import { withAdminAction } from "@/lib/auth/with-admin-action";
import {
  getPipelineMonitor,
  getImportExclusions,
} from "@trainers/supabase/queries";
import {
  deleteSourceEvent,
  excludeSourceEvent,
  clearExclusion,
  resetStuckEvents,
  requeueFailedEvents,
  forceImportEvent,
} from "@trainers/supabase/mutations";
import { invalidateUsageStatsCaches } from "@/lib/cache-invalidation";

import {
  getPipelineMonitorAction,
  getImportExclusionsAction,
  deleteEventAction,
  excludeEventAction,
  clearExclusionAction,
  resetStuckAction,
  requeueFailedAction,
  forceImportAction,
  getPipelineConfigAction,
  setPipelineEnabledAction,
  setLimitlessBatchSizeAction,
  alterCronScheduleAction,
  getCronSchedulesAction,
} from "../pipeline";

// =============================================================================
// Typed mock references
// =============================================================================

const mockIsSiteAdmin = isSiteAdmin as jest.MockedFunction<typeof isSiteAdmin>;
const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockWithAdminAction = withAdminAction as jest.MockedFunction<
  typeof withAdminAction
>;
const mockGetPipelineMonitor = getPipelineMonitor as jest.MockedFunction<
  typeof getPipelineMonitor
>;
const mockGetImportExclusions = getImportExclusions as jest.MockedFunction<
  typeof getImportExclusions
>;
const mockDeleteSourceEvent = deleteSourceEvent as jest.MockedFunction<
  typeof deleteSourceEvent
>;
const mockExcludeSourceEvent = excludeSourceEvent as jest.MockedFunction<
  typeof excludeSourceEvent
>;
const mockClearExclusion = clearExclusion as jest.MockedFunction<
  typeof clearExclusion
>;
const mockResetStuckEvents = resetStuckEvents as jest.MockedFunction<
  typeof resetStuckEvents
>;
const mockRequeueFailedEvents = requeueFailedEvents as jest.MockedFunction<
  typeof requeueFailedEvents
>;
const mockForceImportEvent = forceImportEvent as jest.MockedFunction<
  typeof forceImportEvent
>;
const mockInvalidateUsageStatsCaches =
  invalidateUsageStatsCaches as jest.MockedFunction<
    typeof invalidateUsageStatsCaches
  >;

// =============================================================================
// Auth helpers
// =============================================================================

/** Put the caller in the "admin" role (for read-only requireAdmin() path). */
function asAdmin() {
  mockGetUserId.mockResolvedValue("user-123");
  mockIsSiteAdmin.mockResolvedValue(true);
}

/** Put the caller in the "non-admin" role. */
function asNonAdmin() {
  mockGetUserId.mockResolvedValue("user-456");
  mockIsSiteAdmin.mockResolvedValue(false);
}

/** Put the caller as unauthenticated (no userId). */
function asUnauthenticated() {
  mockGetUserId.mockResolvedValue(null);
  mockIsSiteAdmin.mockResolvedValue(false);
}

/**
 * Configure withAdminAction to invoke its callback with a service-role client
 * stub and a fixed admin user ID — simulates a successful sudo session.
 *
 * Also replicates the real wrapper's error-catching: when the callback throws,
 * the mock catches the error and returns `{ success: false, error: errorMessage }`
 * (the label, not the thrown message) — matching `withAdminAction`'s behavior.
 *
 * The empty object is cast through `unknown` to satisfy the ServiceRoleClient
 * brand without importing the full Supabase client type in test scope.
 */
function asAdminWithSudo(adminUserId = "user-123") {
  mockWithAdminAction.mockImplementation(
    async (action, errorMessage = "An unexpected error occurred") => {
      try {
        return await action(
          {} as unknown as Parameters<typeof action>[0],
          adminUserId
        );
      } catch {
        return { success: false, error: errorMessage };
      }
    }
  );
}

/**
 * Configure withAdminAction to return an auth/sudo failure immediately,
 * without invoking the callback.
 */
function asSudoFailed(error = "Sudo mode required") {
  mockWithAdminAction.mockResolvedValue({ success: false, error });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// getPipelineMonitorAction (READ-ONLY — requireAdmin path)
// =============================================================================

describe("getPipelineMonitorAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await getPipelineMonitorAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("rejects unauthenticated callers", async () => {
    asUnauthenticated();
    const result = await getPipelineMonitorAction();
    expect(result.success).toBe(false);
  });

  it("returns monitor data for admin", async () => {
    asAdmin();
    const monitor = {
      events: [],
      counts: {
        queued: 0,
        processing: 0,
        failed: 0,
        skipped: 0,
        complete: 0,
      },
    };
    mockGetPipelineMonitor.mockResolvedValue(monitor);

    const result = await getPipelineMonitorAction();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(monitor);
  });

  it("forwards errors as failure", async () => {
    asAdmin();
    mockGetPipelineMonitor.mockRejectedValue(new Error("db error"));

    const result = await getPipelineMonitorAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("db error");
  });
});

// =============================================================================
// getImportExclusionsAction (READ-ONLY — requireAdmin path)
// =============================================================================

describe("getImportExclusionsAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await getImportExclusionsAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("returns exclusions for admin", async () => {
    asAdmin();
    const exclusions = [
      {
        id: 1,
        source: "rk9" as const,
        source_event_id: "abc",
        reason: null,
        excluded_at: "2026-01-01T00:00:00Z",
      },
    ];
    mockGetImportExclusions.mockResolvedValue(exclusions);

    const result = await getImportExclusionsAction();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(exclusions);
  });

  it("forwards errors as failure", async () => {
    asAdmin();
    mockGetImportExclusions.mockRejectedValue(new Error("read failed"));

    const result = await getImportExclusionsAction();
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// deleteEventAction (MUTATION — withAdminAction path)
// =============================================================================

describe("deleteEventAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Sudo mode required");
    const result = await deleteEventAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/sudo/i);
  });

  it("rejects invalid input before the sudo check", async () => {
    // Input validation runs before withAdminAction, so withAdminAction is
    // never called for invalid input.
    const result = await deleteEventAction({
      source: "unknown",
      sourceEventId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/invalid/i);
    expect(mockWithAdminAction).not.toHaveBeenCalled();
  });

  it("deletes and does not invalidate when no formats affected", async () => {
    asAdminWithSudo();
    mockDeleteSourceEvent.mockResolvedValue({ formats: [] });

    const result = await deleteEventAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(true);
    expect(mockDeleteSourceEvent).toHaveBeenCalledWith({}, "rk9", "evt-1");
    expect(mockInvalidateUsageStatsCaches).not.toHaveBeenCalled();
  });

  it("invalidates usage caches for affected formats", async () => {
    asAdminWithSudo();
    mockDeleteSourceEvent.mockResolvedValue({
      formats: ["VGC-2025", "VGC-2026"],
    });

    const result = await deleteEventAction({
      source: "limitless",
      sourceEventId: "t-42",
    });
    expect(result.success).toBe(true);
    expect(mockInvalidateUsageStatsCaches).toHaveBeenCalledWith([
      "VGC-2025",
      "VGC-2026",
    ]);
  });

  it("forwards delete errors as failure (via withAdminAction label)", async () => {
    asAdminWithSudo();
    mockDeleteSourceEvent.mockRejectedValue(new Error("cascade failed"));

    const result = await deleteEventAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    // withAdminAction catches errors and returns the errorMessage label only;
    // the thrown detail is logged to console, not surfaced in the return value.
    if (!result.success) expect(result.error).toBe("Delete failed");
  });
});

// =============================================================================
// excludeEventAction (MUTATION — withAdminAction path)
// =============================================================================

describe("excludeEventAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Not authenticated");
    const result = await excludeEventAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/authenticated/i);
  });

  it("rejects invalid input before the sudo check", async () => {
    const result = await excludeEventAction({
      source: "bad",
      sourceEventId: "",
    });
    expect(result.success).toBe(false);
    expect(mockWithAdminAction).not.toHaveBeenCalled();
  });

  it("excludes and passes userId + reason to mutation", async () => {
    asAdminWithSudo("admin-user");
    mockExcludeSourceEvent.mockResolvedValue({ formats: ["VGC-2025"] });

    const result = await excludeEventAction({
      source: "rk9",
      sourceEventId: "evt-1",
      reason: "spam tournament",
    });
    expect(result.success).toBe(true);
    expect(mockExcludeSourceEvent).toHaveBeenCalledWith(
      {},
      "rk9",
      "evt-1",
      "spam tournament",
      "admin-user"
    );
    expect(mockInvalidateUsageStatsCaches).toHaveBeenCalledWith(["VGC-2025"]);
  });

  it("passes null reason when omitted", async () => {
    asAdminWithSudo("user-123");
    mockExcludeSourceEvent.mockResolvedValue({ formats: [] });

    await excludeEventAction({ source: "limitless", sourceEventId: "t-1" });
    expect(mockExcludeSourceEvent).toHaveBeenCalledWith(
      {},
      "limitless",
      "t-1",
      null,
      "user-123"
    );
  });
});

// =============================================================================
// clearExclusionAction (MUTATION — withAdminAction path)
// =============================================================================

describe("clearExclusionAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Admin access required");
    const result = await clearExclusionAction(99);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it.each([
    [1.5, "non-integer float"],
    [-1, "negative id"],
    [0, "zero id"],
    ["abc", "string id"],
  ])(
    "returns Invalid input and does not call clearExclusion for %p (%s)",
    async (badInput) => {
      const result = await clearExclusionAction(badInput);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("Invalid input");
      expect(mockClearExclusion).not.toHaveBeenCalled();
      expect(mockWithAdminAction).not.toHaveBeenCalled();
    }
  );

  it("clears the exclusion by id for a valid positive integer", async () => {
    asAdminWithSudo();
    mockClearExclusion.mockResolvedValue(undefined);

    const result = await clearExclusionAction(42);
    expect(result.success).toBe(true);
    expect(mockClearExclusion).toHaveBeenCalledWith({}, 42);
  });

  it("forwards errors as failure (via withAdminAction label)", async () => {
    asAdminWithSudo();
    mockClearExclusion.mockRejectedValue(new Error("not found"));

    const result = await clearExclusionAction(5);
    expect(result.success).toBe(false);
    // withAdminAction catches errors and returns the errorMessage label only
    if (!result.success) expect(result.error).toBe("Clear failed");
  });
});

// =============================================================================
// resetStuckAction (MUTATION — withAdminAction path)
// =============================================================================

describe("resetStuckAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Sudo mode required");
    const result = await resetStuckAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/sudo/i);
  });

  it("returns per-source reset counts", async () => {
    asAdminWithSudo();
    mockResetStuckEvents.mockResolvedValue({ rk9: 3, limitless: 1 });

    const result = await resetStuckAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rk9).toBe(3);
      expect(result.data.limitless).toBe(1);
    }
  });

  it("forwards errors as failure (via withAdminAction label)", async () => {
    asAdminWithSudo();
    mockResetStuckEvents.mockRejectedValue(new Error("reset failed"));

    const result = await resetStuckAction();
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// requeueFailedAction (MUTATION — withAdminAction path)
// =============================================================================

describe("requeueFailedAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Sudo mode required");
    const result = await requeueFailedAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/sudo/i);
  });

  it("returns per-source requeued counts", async () => {
    asAdminWithSudo();
    mockRequeueFailedEvents.mockResolvedValue({ rk9: 5, limitless: 2 });

    const result = await requeueFailedAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rk9).toBe(5);
      expect(result.data.limitless).toBe(2);
    }
  });

  it("forwards errors as failure (via withAdminAction label)", async () => {
    asAdminWithSudo();
    mockRequeueFailedEvents.mockRejectedValue(new Error("requeue failed"));

    const result = await requeueFailedAction();
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// forceImportAction (MUTATION — withAdminAction path)
// =============================================================================

describe("forceImportAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Sudo mode required");
    const result = await forceImportAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/sudo/i);
  });

  it("rejects invalid input before the sudo check", async () => {
    const result = await forceImportAction({
      source: "bogus",
      sourceEventId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/invalid/i);
    expect(mockWithAdminAction).not.toHaveBeenCalled();
  });

  it("forces import for valid input", async () => {
    asAdminWithSudo();
    mockForceImportEvent.mockResolvedValue(undefined);

    const result = await forceImportAction({
      source: "limitless",
      sourceEventId: "t-99",
    });
    expect(result.success).toBe(true);
    expect(mockForceImportEvent).toHaveBeenCalledWith({}, "limitless", "t-99");
  });

  it("forwards errors as failure (via withAdminAction label)", async () => {
    asAdminWithSudo();
    mockForceImportEvent.mockRejectedValue(new Error("force failed"));

    const result = await forceImportAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    // withAdminAction catches errors and returns the errorMessage label only
    if (!result.success) expect(result.error).toBe("Force import failed");
  });
});

// =============================================================================
// getPipelineConfigAction (READ-ONLY — requireAdmin path)
// =============================================================================

describe("getPipelineConfigAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await getPipelineConfigAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("rejects unauthenticated callers", async () => {
    asUnauthenticated();
    const result = await getPipelineConfigAction();
    expect(result.success).toBe(false);
  });

  it("returns parsed config for admin", async () => {
    asAdmin();
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [
              { key: "pipeline_enabled", value: true },
              { key: "limitless_import_batch_size", value: 50 },
            ],
            error: null,
          }),
        }),
      }),
    };
    // Override the service-role mock just for this test
    const { createServiceRoleClient } = jest.requireMock(
      "@/lib/supabase/server"
    ) as { createServiceRoleClient: jest.Mock };
    createServiceRoleClient.mockReturnValue(mockSupabase);

    const result = await getPipelineConfigAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pipelineEnabled).toBe(true);
      expect(result.data.limitlessBatchSize).toBe(50);
    }
  });

  it("defaults limitlessBatchSize to 25 when key is absent", async () => {
    asAdmin();
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [{ key: "pipeline_enabled", value: false }],
            error: null,
          }),
        }),
      }),
    };
    const { createServiceRoleClient } = jest.requireMock(
      "@/lib/supabase/server"
    ) as { createServiceRoleClient: jest.Mock };
    createServiceRoleClient.mockReturnValue(mockSupabase);

    const result = await getPipelineConfigAction();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limitlessBatchSize).toBe(25);
  });

  it.each([
    ["abc", "non-numeric string → NaN"],
    [0, "zero is below range"],
    [999, "above 100 is out of range"],
  ])(
    "clamps limitlessBatchSize to 25 when stored value is %p (%s)",
    async (malformedValue) => {
      asAdmin();
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [
                { key: "pipeline_enabled", value: true },
                {
                  key: "limitless_import_batch_size",
                  value: malformedValue,
                },
              ],
              error: null,
            }),
          }),
        }),
      };
      const { createServiceRoleClient } = jest.requireMock(
        "@/lib/supabase/server"
      ) as { createServiceRoleClient: jest.Mock };
      createServiceRoleClient.mockReturnValue(mockSupabase);

      const result = await getPipelineConfigAction();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limitlessBatchSize).toBe(25);
        expect(Number.isNaN(result.data.limitlessBatchSize)).toBe(false);
      }
    }
  );

  it("forwards DB errors as failure", async () => {
    asAdmin();
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: "db error" } }),
        }),
      }),
    };
    const { createServiceRoleClient } = jest.requireMock(
      "@/lib/supabase/server"
    ) as { createServiceRoleClient: jest.Mock };
    createServiceRoleClient.mockReturnValue(mockSupabase);

    const result = await getPipelineConfigAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("db error");
  });
});

// =============================================================================
// setPipelineEnabledAction (MUTATION — withAdminAction path)
// =============================================================================

describe("setPipelineEnabledAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Admin access required");
    const result = await setPipelineEnabledAction(true);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it.each([
    ["true", "string true"],
    [1, "number 1"],
    [null, "null"],
    [undefined, "undefined"],
    [{}, "object"],
  ])(
    "returns Invalid input and does not call withAdminAction for %p (%s)",
    async (badInput) => {
      const result = await setPipelineEnabledAction(badInput);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("Invalid input");
      expect(mockWithAdminAction).not.toHaveBeenCalled();
    }
  );

  it("upserts enabled=true for admin with sudo", async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: jest.fn().mockReturnValue({ upsert: mockUpsert }),
    };
    // Make withAdminAction invoke callback with a real-ish client stub
    mockWithAdminAction.mockImplementation(async (action) => {
      return action(
        mockSupabase as unknown as Parameters<typeof action>[0],
        "user-123"
      );
    });

    const result = await setPipelineEnabledAction(true);
    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ key: "pipeline_enabled", value: true }),
      { onConflict: "key" }
    );
  });

  it("forwards DB errors as failure (via withAdminAction label)", async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        upsert: jest
          .fn()
          .mockResolvedValue({ error: { message: "write failed" } }),
      }),
    };
    mockWithAdminAction.mockImplementation(
      async (action, errorMessage = "An unexpected error occurred") => {
        try {
          return await action(
            mockSupabase as unknown as Parameters<typeof action>[0],
            "user-123"
          );
        } catch {
          return { success: false, error: errorMessage };
        }
      }
    );

    const result = await setPipelineEnabledAction(false);
    expect(result.success).toBe(false);
    // withAdminAction catches errors and returns the errorMessage label only
    if (!result.success) expect(result.error).toBe("Update failed");
  });
});

// =============================================================================
// setLimitlessBatchSizeAction (MUTATION — withAdminAction path)
// =============================================================================

describe("setLimitlessBatchSizeAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Sudo mode required");
    const result = await setLimitlessBatchSizeAction(10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/sudo/i);
  });

  it.each([
    [0, "out-of-range (0)"],
    [101, "out-of-range (101)"],
    [1.5, "non-integer"],
  ])("rejects batch size %i (%s) before sudo check", async (size) => {
    const result = await setLimitlessBatchSizeAction(size);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/batch size/i);
    expect(mockWithAdminAction).not.toHaveBeenCalled();
  });

  it.each([1, 25, 100])("accepts valid batch size %i", async (size) => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: jest.fn().mockReturnValue({ upsert: mockUpsert }),
    };
    mockWithAdminAction.mockImplementation(async (action) => {
      return action(
        mockSupabase as unknown as Parameters<typeof action>[0],
        "user-123"
      );
    });

    const result = await setLimitlessBatchSizeAction(size);
    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "limitless_import_batch_size",
        value: size,
      }),
      { onConflict: "key" }
    );
  });
});

// =============================================================================
// alterCronScheduleAction (MUTATION — withAdminAction path, uses createClient)
// =============================================================================

describe("alterCronScheduleAction", () => {
  it("rejects when sudo check fails", async () => {
    asSudoFailed("Sudo mode required");
    const result = await alterCronScheduleAction({
      job: "import-tick-sync",
      schedule: "*/5 * * * *",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/sudo/i);
  });

  it.each([
    [{ job: "unknown-job", schedule: "*/5 * * * *" }, "invalid job name"],
    [
      { job: "import-tick-sync", schedule: "not-a-cron" },
      "invalid schedule (3 fields)",
    ],
    [
      { job: "import-tick-sync", schedule: "rm -rf / * * *" },
      "illegal characters",
    ],
  ])("rejects invalid input: %s", async (input) => {
    const result = await alterCronScheduleAction(input);
    expect(result.success).toBe(false);
    expect(mockWithAdminAction).not.toHaveBeenCalled();
  });

  it("calls admin_alter_cron_schedule RPC via authenticated client", async () => {
    // alterCronScheduleAction ignores the service-role supabase provided by
    // withAdminAction and instead creates its own authenticated client via
    // createClient(). The withAdminAction wrapper still enforces sudo.
    asAdminWithSudo();
    const mockRpc = jest.fn().mockResolvedValue({ error: null });
    const mockAuthClient = { rpc: mockRpc };
    mockCreateClient.mockResolvedValue(mockAuthClient as never);

    const result = await alterCronScheduleAction({
      job: "import-tick-sync",
      schedule: "*/5 * * * *",
    });
    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("admin_alter_cron_schedule", {
      p_job_name: "import-tick-sync",
      p_schedule: "*/5 * * * *",
    });
    // Confirm it uses the authenticated client, not service-role
    expect(mockCreateClient).toHaveBeenCalled();
  });

  it("forwards RPC errors as failure (via withAdminAction label)", async () => {
    asAdminWithSudo();
    const mockAuthClient = {
      rpc: jest
        .fn()
        .mockResolvedValue({ error: { message: "not authorized" } }),
    };
    mockCreateClient.mockResolvedValue(mockAuthClient as never);

    const result = await alterCronScheduleAction({
      job: "import-tick-import",
      schedule: "* * * * *",
    });
    expect(result.success).toBe(false);
    // withAdminAction catches errors and returns the errorMessage label only
    if (!result.success) expect(result.error).toBe("Schedule update failed");
  });
});

// =============================================================================
// getCronSchedulesAction (READ-ONLY — requireAdmin path)
// =============================================================================

describe("getCronSchedulesAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await getCronSchedulesAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("returns live schedules from RPC via authenticated client", async () => {
    asAdmin();
    const mockRpc = jest.fn().mockResolvedValue({
      data: [
        { job_name: "import-tick-sync", schedule: "*/10 * * * *" },
        { job_name: "import-tick-import", schedule: "*/2 * * * *" },
        { job_name: "import-tick-compile", schedule: "*/3 * * * *" },
      ],
      error: null,
    });
    const mockAuthClient = { rpc: mockRpc };
    mockCreateClient.mockResolvedValue(mockAuthClient as never);

    const result = await getCronSchedulesAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sync).toBe("*/10 * * * *");
      expect(result.data.import).toBe("*/2 * * * *");
      expect(result.data.compile).toBe("*/3 * * * *");
    }
    // Confirm it uses the authenticated client, not service-role
    expect(mockCreateClient).toHaveBeenCalled();
  });

  it("falls back to seeded defaults when job is absent from RPC result", async () => {
    asAdmin();
    const mockRpc = jest.fn().mockResolvedValue({ data: [], error: null });
    mockCreateClient.mockResolvedValue({ rpc: mockRpc } as never);

    const result = await getCronSchedulesAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sync).toBe("*/5 * * * *");
      expect(result.data.import).toBe("* * * * *");
      expect(result.data.compile).toBe("*/2 * * * *");
    }
  });

  it("forwards RPC errors as failure", async () => {
    asAdmin();
    const mockAuthClient = {
      rpc: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "rpc failed" } }),
    };
    mockCreateClient.mockResolvedValue(mockAuthClient as never);

    const result = await getCronSchedulesAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("rpc failed");
  });
});
