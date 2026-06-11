/**
 * @jest-environment node
 *
 * Tests for pipeline server actions — the admin monitor + recovery actions
 * backing /admin/data.
 *
 * All I/O is mocked: auth, supabase client, all query/mutation functions,
 * and cache invalidation. The intent is to verify the admin gate, happy-path
 * data flow, and error-path forwarding for each action.
 */

// =============================================================================
// Mock declarations — BEFORE imports (Jest hoisting)
// =============================================================================

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn().mockReturnValue({}),
  getUserId: jest.fn(),
}));

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: jest.fn(async () => false),
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
import { getUserId } from "@/lib/supabase/server";
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
} from "../pipeline";

// =============================================================================
// Helpers
// =============================================================================

const mockIsSiteAdmin = isSiteAdmin as jest.MockedFunction<typeof isSiteAdmin>;
const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;
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

/** Put the caller in the "admin" role. */
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

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// getPipelineMonitorAction
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
// getImportExclusionsAction
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
// deleteEventAction
// =============================================================================

describe("deleteEventAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await deleteEventAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("rejects invalid input", async () => {
    asAdmin();
    const result = await deleteEventAction({
      source: "unknown",
      sourceEventId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/invalid/i);
  });

  it("deletes and does not invalidate when no formats affected", async () => {
    asAdmin();
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
    asAdmin();
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

  it("forwards delete errors as failure", async () => {
    asAdmin();
    mockDeleteSourceEvent.mockRejectedValue(new Error("cascade failed"));

    const result = await deleteEventAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("cascade failed");
  });
});

// =============================================================================
// excludeEventAction
// =============================================================================

describe("excludeEventAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await excludeEventAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("rejects invalid input", async () => {
    asAdmin();
    const result = await excludeEventAction({
      source: "bad",
      sourceEventId: "",
    });
    expect(result.success).toBe(false);
  });

  it("excludes and passes userId + reason to mutation", async () => {
    asAdmin();
    mockGetUserId.mockResolvedValue("admin-user");
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
    asAdmin();
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
// clearExclusionAction
// =============================================================================

describe("clearExclusionAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await clearExclusionAction(99);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("clears the exclusion by id", async () => {
    asAdmin();
    mockClearExclusion.mockResolvedValue(undefined);

    const result = await clearExclusionAction(42);
    expect(result.success).toBe(true);
    expect(mockClearExclusion).toHaveBeenCalledWith({}, 42);
  });

  it("forwards errors as failure", async () => {
    asAdmin();
    mockClearExclusion.mockRejectedValue(new Error("not found"));

    const result = await clearExclusionAction(0);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("not found");
  });
});

// =============================================================================
// resetStuckAction
// =============================================================================

describe("resetStuckAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await resetStuckAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("returns per-source reset counts", async () => {
    asAdmin();
    mockResetStuckEvents.mockResolvedValue({ rk9: 3, limitless: 1 });

    const result = await resetStuckAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rk9).toBe(3);
      expect(result.data.limitless).toBe(1);
    }
  });

  it("forwards errors as failure", async () => {
    asAdmin();
    mockResetStuckEvents.mockRejectedValue(new Error("reset failed"));

    const result = await resetStuckAction();
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// requeueFailedAction
// =============================================================================

describe("requeueFailedAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await requeueFailedAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("returns per-source requeued counts", async () => {
    asAdmin();
    mockRequeueFailedEvents.mockResolvedValue({ rk9: 5, limitless: 2 });

    const result = await requeueFailedAction();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rk9).toBe(5);
      expect(result.data.limitless).toBe(2);
    }
  });

  it("forwards errors as failure", async () => {
    asAdmin();
    mockRequeueFailedEvents.mockRejectedValue(new Error("requeue failed"));

    const result = await requeueFailedAction();
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// forceImportAction
// =============================================================================

describe("forceImportAction", () => {
  it("rejects non-admins", async () => {
    asNonAdmin();
    const result = await forceImportAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/admin/i);
  });

  it("rejects invalid input", async () => {
    asAdmin();
    const result = await forceImportAction({
      source: "bogus",
      sourceEventId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/invalid/i);
  });

  it("forces import for valid input", async () => {
    asAdmin();
    mockForceImportEvent.mockResolvedValue(undefined);

    const result = await forceImportAction({
      source: "limitless",
      sourceEventId: "t-99",
    });
    expect(result.success).toBe(true);
    expect(mockForceImportEvent).toHaveBeenCalledWith({}, "limitless", "t-99");
  });

  it("forwards errors as failure", async () => {
    asAdmin();
    mockForceImportEvent.mockRejectedValue(new Error("force failed"));

    const result = await forceImportAction({
      source: "rk9",
      sourceEventId: "evt-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("force failed");
  });
});
