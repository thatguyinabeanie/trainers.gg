/**
 * @jest-environment node
 *
 * Tests for GET /api/cron/import-queue (route.ts).
 *
 * Mock strategy:
 * - @/lib/cron-auth      → requireCronAuth returns null (authorized) by default
 * - @/lib/supabase/server → createServiceRoleClient returns a minimal stub
 * - @/lib/site-config     → readSiteConfigValues returns toggles/config
 * - @/lib/rk9/worker      → processRk9Queue returns zero stats by default
 * - @/lib/limitless/queue-worker → drainLimitlessQueue returns zero stats
 * - @trainers/supabase    → compileSourceTeamSlots returns compile result
 * - @/lib/cache-invalidation → revalidateUsageStatsCaches is a no-op jest.fn
 */

// =============================================================================
// Mock declarations — before any imports so Jest hoisting works
// =============================================================================

const mockRequireCronAuth = jest.fn<Response | null, [Request]>();
const mockCreateServiceRoleClient = jest.fn();
const mockReadSiteConfigValues = jest.fn<
  Promise<Record<string, unknown>>,
  [unknown, string[]]
>();
const mockProcessRk9Queue = jest.fn();
const mockDrainLimitlessQueue = jest.fn();
const mockCompileSourceTeamSlots = jest.fn();
const mockRevalidateUsageStatsCaches = jest.fn();

jest.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...args: unknown[]) =>
    mockRequireCronAuth(args[0] as Request),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

jest.mock("@/lib/site-config", () => ({
  readSiteConfigValues: (...args: unknown[]) =>
    mockReadSiteConfigValues(args[0], args[1] as string[]),
}));

jest.mock("@/lib/rk9/worker", () => ({
  processRk9Queue: (...args: unknown[]) => mockProcessRk9Queue(...args),
}));

jest.mock("@/lib/limitless/queue-worker", () => ({
  drainLimitlessQueue: (...args: unknown[]) => mockDrainLimitlessQueue(...args),
}));

const mockRecordImportRuns = jest.fn();

jest.mock("@trainers/supabase", () => ({
  compileSourceTeamSlots: (...args: unknown[]) =>
    mockCompileSourceTeamSlots(...args),
  recordImportRuns: (...args: unknown[]) => mockRecordImportRuns(...args),
  deriveImportRunStatus: jest.fn(
    (outcome: {
      skipped?: boolean;
      threw?: boolean;
      errors: number;
      processed: number;
    }) => {
      if (outcome.skipped) return "skipped";
      if (outcome.threw) return "error";
      if (outcome.errors > 0)
        return outcome.processed > 0 ? "partial" : "error";
      return "ok";
    }
  ),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  revalidateUsageStatsCaches: (...args: unknown[]) =>
    mockRevalidateUsageStatsCaches(...args),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

/** Build a cron Request with the given Authorization header. */
function makeCronRequest(authHeader = "Bearer test-secret"): Request {
  return new Request("https://example.com/api/cron/import-queue", {
    method: "GET",
    headers: { authorization: authHeader },
  });
}

/** Call GET and return status + raw response (parse JSON when possible). */
async function callGet(request?: Request) {
  const req = request ?? makeCronRequest();
  const response = await GET(req);
  const contentType = response.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  if (contentType.includes("application/json")) {
    body = (await response.json()) as Record<string, unknown>;
  }
  return { status: response.status, body, response };
}

// Default site config (both toggles disabled)
const BASE_CONFIG: Record<string, unknown> = {
  limitless_backend_auto_import: false,
  rk9_backend_auto_import: false,
  limitless_batch_size: 20,
  rk9_max_teams_per_tick: 100,
  rk9_team_concurrency: 3,
  limitless_cron_interval_seconds: 300,
  rk9_cron_interval_seconds: 60,
  limitless_last_run_at: null,
  rk9_last_run_at: null,
};

// Default drain results
const ZERO_RK9 = {
  eventsTouched: 0,
  teamsScraped: 0,
  errors: 0,
  remainingQueued: 0,
};
const ZERO_LIMITLESS = {
  processed: 0,
  errors: 0,
  remaining: 0,
  passes: 0,
};

// =============================================================================
// Setup
// =============================================================================

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };

  // Default: authorized
  mockRequireCronAuth.mockReturnValue(null);

  // Default: stub supabase client
  mockCreateServiceRoleClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });

  // Default: site config — both toggles off
  mockReadSiteConfigValues.mockResolvedValue({ ...BASE_CONFIG });

  // Default: workers return zero stats
  mockProcessRk9Queue.mockResolvedValue(ZERO_RK9);
  mockDrainLimitlessQueue.mockResolvedValue(ZERO_LIMITLESS);

  // Default: compile returns null (no events compiled)
  mockCompileSourceTeamSlots.mockResolvedValue(null);

  // Default: recordImportRuns is a no-op — observability must not fail ticks
  mockRecordImportRuns.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// 1. Unauthorized path
// =============================================================================

describe("Authorization", () => {
  it("returns the 401 response from requireCronAuth unchanged, does no work", async () => {
    const unauthorizedResponse = new Response("Unauthorized", { status: 401 });
    mockRequireCronAuth.mockReturnValue(unauthorizedResponse);

    const { status } = await callGet();

    expect(status).toBe(401);
    expect(mockReadSiteConfigValues).not.toHaveBeenCalled();
    expect(mockProcessRk9Queue).not.toHaveBeenCalled();
    expect(mockDrainLimitlessQueue).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 2. Both toggles disabled
// =============================================================================

describe("both toggles disabled", () => {
  it("returns 200 with skipped descriptors for both sources, no drain calls", async () => {
    const { status, body } = await callGet();

    expect(status).toBe(200);
    // Both sources skipped
    expect(body.limitless).toMatchObject({ skipped: expect.any(String) });
    expect(body.rk9).toMatchObject({ skipped: expect.any(String) });
    // Workers should not be invoked
    expect(mockDrainLimitlessQueue).not.toHaveBeenCalled();
    expect(mockProcessRk9Queue).not.toHaveBeenCalled();
  });

  it("includes budgetMs in the response", async () => {
    const { body } = await callGet();
    expect(typeof body.budgetMs).toBe("number");
    expect(body.budgetMs).toBeGreaterThan(0);
  });
});

// =============================================================================
// 3. Interval NOT elapsed → source skipped
// =============================================================================

describe("interval not elapsed", () => {
  it("skips rk9 when last_run_at is recent and interval not elapsed", async () => {
    const recentTs = new Date(Date.now() - 10_000).toISOString(); // 10 s ago
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60, // 60 s interval, only 10 s elapsed → not due
      rk9_last_run_at: recentTs,
    });

    const { body } = await callGet();

    expect(body.rk9).toMatchObject({
      skipped: expect.stringContaining("s ago"),
    });
    expect(mockProcessRk9Queue).not.toHaveBeenCalled();
  });

  it("skips limitless when last_run_at is recent and interval not elapsed", async () => {
    const recentTs = new Date(Date.now() - 30_000).toISOString(); // 30 s ago
    process.env.LIMITLESS_API_KEY = "test-key";
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300, // 300 s, only 30 s elapsed → not due
      limitless_last_run_at: recentTs,
    });

    const { body } = await callGet();

    expect(body.limitless).toMatchObject({
      skipped: expect.stringContaining("s ago"),
    });
    expect(mockDrainLimitlessQueue).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 4. Limitless: toggle on + API key set + interval elapsed → drain called
// =============================================================================

describe("limitless drain", () => {
  beforeEach(() => {
    process.env.LIMITLESS_API_KEY = "test-api-key";
    const oldRunAt = new Date(Date.now() - 400_000).toISOString(); // 400 s ago > 300 s interval
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: oldRunAt,
      limitless_batch_size: 20,
    });
  });

  it("calls drainLimitlessQueue with clamped batch size and deadline", async () => {
    mockDrainLimitlessQueue.mockResolvedValue({
      processed: 5,
      errors: 0,
      remaining: 0,
      passes: 2,
    });

    const { body } = await callGet();

    expect(mockDrainLimitlessQueue).toHaveBeenCalledTimes(1);
    const [, apiKey, batchSize, deadline] = mockDrainLimitlessQueue.mock
      .calls[0] as [unknown, string, number, number];
    expect(apiKey).toBe("test-api-key");
    expect(batchSize).toBeGreaterThanOrEqual(1);
    expect(batchSize).toBeLessThanOrEqual(50);
    expect(typeof deadline).toBe("number");
    expect(deadline).toBeGreaterThan(Date.now() - 1000); // deadline is in future
    expect(body.limitless).toMatchObject({ processed: 5 });
  });

  it("clamps batch size to 1 when config value is 0", async () => {
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: new Date(Date.now() - 400_000).toISOString(),
      limitless_batch_size: 0, // below min → clamp to 1
    });
    mockDrainLimitlessQueue.mockResolvedValue(ZERO_LIMITLESS);

    await callGet();

    const [, , batchSize] = mockDrainLimitlessQueue.mock.calls[0] as [
      unknown,
      string,
      number,
      number,
    ];
    expect(batchSize).toBe(1);
  });

  it("clamps batch size to 50 when config value exceeds max", async () => {
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: new Date(Date.now() - 400_000).toISOString(),
      limitless_batch_size: 999, // above max → clamp to 50
    });
    mockDrainLimitlessQueue.mockResolvedValue(ZERO_LIMITLESS);

    await callGet();

    const [, , batchSize] = mockDrainLimitlessQueue.mock.calls[0] as [
      unknown,
      string,
      number,
      number,
    ];
    expect(batchSize).toBe(50);
  });

  it("still drains when LIMITLESS_API_KEY is unset (key is optional — lower rate limit only)", async () => {
    delete process.env.LIMITLESS_API_KEY;
    mockDrainLimitlessQueue.mockResolvedValue(ZERO_LIMITLESS);

    await callGet();

    expect(mockDrainLimitlessQueue).toHaveBeenCalledTimes(1);
    const [, apiKey] = mockDrainLimitlessQueue.mock.calls[0] as [
      unknown,
      string | undefined,
      number,
      number,
    ];
    expect(apiKey).toBeUndefined();
  });

  it("stamps last_run_at BEFORE calling drainLimitlessQueue", async () => {
    const upsertMock = jest.fn().mockResolvedValue({ data: null, error: null });
    mockCreateServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ upsert: upsertMock }),
    });
    mockDrainLimitlessQueue.mockResolvedValue(ZERO_LIMITLESS);

    await callGet();

    // upsert (stamp) should have been called before drainLimitlessQueue
    const upsertOrder = upsertMock.mock.invocationCallOrder[0];
    const drainOrder = mockDrainLimitlessQueue.mock.invocationCallOrder[0];
    expect(upsertOrder).toBeLessThan(drainOrder!);
  });
});

// =============================================================================
// 5. RK9: toggle on + interval elapsed → processRk9Queue called
// =============================================================================

describe("rk9 drain", () => {
  beforeEach(() => {
    const oldRunAt = new Date(Date.now() - 120_000).toISOString(); // 120 s ago > 60 s interval
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: oldRunAt,
      rk9_max_teams_per_tick: 100,
      rk9_team_concurrency: 3,
    });
  });

  it("calls processRk9Queue with correct options when interval elapsed", async () => {
    mockProcessRk9Queue.mockResolvedValue({
      eventsTouched: 2,
      teamsScraped: 48,
      errors: 0,
      remainingQueued: 3,
    });

    const { body } = await callGet();

    expect(mockProcessRk9Queue).toHaveBeenCalledTimes(1);
    const [, opts] = mockProcessRk9Queue.mock.calls[0] as [
      unknown,
      { deadline: number; teamsPerTick: number; concurrency: number },
    ];
    expect(typeof opts.deadline).toBe("number");
    expect(opts.teamsPerTick).toBeGreaterThanOrEqual(1);
    expect(opts.teamsPerTick).toBeLessThanOrEqual(200);
    expect(opts.concurrency).toBeGreaterThanOrEqual(1);
    expect(opts.concurrency).toBeLessThanOrEqual(5);
    expect(body.rk9).toMatchObject({ eventsTouched: 2, teamsScraped: 48 });
  });

  it("clamps teamsPerTick to 1 when config value is below min", async () => {
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: new Date(Date.now() - 120_000).toISOString(),
      rk9_max_teams_per_tick: 0,
      rk9_team_concurrency: 3,
    });
    mockProcessRk9Queue.mockResolvedValue(ZERO_RK9);

    await callGet();

    const [, opts] = mockProcessRk9Queue.mock.calls[0] as [
      unknown,
      { teamsPerTick: number },
    ];
    expect(opts.teamsPerTick).toBe(1);
  });

  it("clamps concurrency to 5 when config value exceeds max", async () => {
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: new Date(Date.now() - 120_000).toISOString(),
      rk9_max_teams_per_tick: 100,
      rk9_team_concurrency: 99,
    });
    mockProcessRk9Queue.mockResolvedValue(ZERO_RK9);

    await callGet();

    const [, opts] = mockProcessRk9Queue.mock.calls[0] as [
      unknown,
      { concurrency: number },
    ];
    expect(opts.concurrency).toBe(5);
  });
});

// =============================================================================
// 6. Compile step
// =============================================================================

describe("compile step", () => {
  it("does not call compileSourceTeamSlots when both sources processed 0 events", async () => {
    // Both toggles on but drain returns zero
    const oldRunAt = new Date(Date.now() - 400_000).toISOString();
    process.env.LIMITLESS_API_KEY = "test-key";
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: oldRunAt,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: oldRunAt,
    });
    mockDrainLimitlessQueue.mockResolvedValue(ZERO_LIMITLESS);
    mockProcessRk9Queue.mockResolvedValue(ZERO_RK9);

    const { body } = await callGet();

    expect(mockCompileSourceTeamSlots).not.toHaveBeenCalled();
    // Compile result should reflect revalidated: false
    expect(body.compile).toMatchObject({ revalidated: false });
  });

  it("calls compileSourceTeamSlots for rk9 when eventsTouched > 0", async () => {
    const oldRunAt = new Date(Date.now() - 120_000).toISOString();
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: oldRunAt,
    });
    mockProcessRk9Queue.mockResolvedValue({
      ...ZERO_RK9,
      eventsTouched: 1,
    });
    mockCompileSourceTeamSlots.mockResolvedValue({
      eventsCompiled: 1,
      formats: ["VGC-2025-Reg-G"],
    });

    const { body } = await callGet();

    expect(mockCompileSourceTeamSlots).toHaveBeenCalledWith(
      expect.anything(),
      "rk9"
    );
    expect(mockRevalidateUsageStatsCaches).toHaveBeenCalledWith(
      expect.arrayContaining(["VGC-2025-Reg-G"])
    );
    expect(body.compile).toMatchObject({ revalidated: true });
  });

  it("calls compileSourceTeamSlots for limitless when processed > 0", async () => {
    const oldRunAt = new Date(Date.now() - 400_000).toISOString();
    process.env.LIMITLESS_API_KEY = "test-key";
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: oldRunAt,
    });
    mockDrainLimitlessQueue.mockResolvedValue({
      ...ZERO_LIMITLESS,
      processed: 3,
    });
    mockCompileSourceTeamSlots.mockResolvedValue({
      eventsCompiled: 3,
      formats: ["VGC-2025-Reg-H"],
    });

    const { body } = await callGet();

    expect(mockCompileSourceTeamSlots).toHaveBeenCalledWith(
      expect.anything(),
      "limitless"
    );
    expect(body.compile).toMatchObject({ revalidated: true });
  });

  it("calls revalidateUsageStatsCaches with deduplicated formats when both sources compiled", async () => {
    const oldRunAt = new Date(Date.now() - 400_000).toISOString();
    process.env.LIMITLESS_API_KEY = "test-key";
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: oldRunAt,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: oldRunAt,
    });
    mockDrainLimitlessQueue.mockResolvedValue({
      ...ZERO_LIMITLESS,
      processed: 2,
    });
    mockProcessRk9Queue.mockResolvedValue({ ...ZERO_RK9, eventsTouched: 1 });

    // Both compile the same format — should be deduplicated
    mockCompileSourceTeamSlots.mockImplementation(
      async (_supabase: unknown, source: string) => {
        if (source === "limitless")
          return {
            eventsCompiled: 2,
            formats: ["VGC-2025-Reg-G", "VGC-2025-Reg-H"],
          };
        if (source === "rk9")
          return { eventsCompiled: 1, formats: ["VGC-2025-Reg-G"] };
        return null;
      }
    );

    await callGet();

    const [formats] = mockRevalidateUsageStatsCaches.mock.calls[0] as [
      string[],
    ];
    const unique = [...new Set(formats)];
    expect(unique).toHaveLength(formats.length);
    expect(formats).toContain("VGC-2025-Reg-G");
    expect(formats).toContain("VGC-2025-Reg-H");
  });

  it("returns compile error in JSON (not 500) when compileSourceTeamSlots throws", async () => {
    const oldRunAt = new Date(Date.now() - 120_000).toISOString();
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: oldRunAt,
    });
    mockProcessRk9Queue.mockResolvedValue({ ...ZERO_RK9, eventsTouched: 1 });
    mockCompileSourceTeamSlots.mockRejectedValue(
      new Error("compile database error")
    );

    const { status, body } = await callGet();

    // Response is still 200 — compile errors don't 500 the cron. The JSON
    // carries a generic label only (raw messages can leak schema detail);
    // the full error goes to server logs.
    expect(status).toBe(200);
    expect(body.compile).toMatchObject({
      error: expect.stringContaining("see server logs"),
    });
    // Usage caches should NOT have been revalidated
    expect(mockRevalidateUsageStatsCaches).not.toHaveBeenCalled();
  });

  it("does not call revalidateUsageStatsCaches when didCompile is false", async () => {
    // Both toggles off → both skip → compile gets 0/0 → no compile → no revalidate
    const { body } = await callGet();

    expect(mockRevalidateUsageStatsCaches).not.toHaveBeenCalled();
    expect(body.compile).toMatchObject({ revalidated: false });
  });
});

// =============================================================================
// 7. One source throws — other source's stats are preserved
// =============================================================================

describe("source isolation", () => {
  it("preserves rk9 stats when drainLimitlessQueue throws", async () => {
    const oldRunAt = new Date(Date.now() - 400_000).toISOString();
    process.env.LIMITLESS_API_KEY = "test-key";
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: oldRunAt,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: oldRunAt,
    });
    mockDrainLimitlessQueue.mockRejectedValue(
      new Error("Limitless API is down")
    );
    mockProcessRk9Queue.mockResolvedValue({
      eventsTouched: 3,
      teamsScraped: 72,
      errors: 0,
      remainingQueued: 0,
    });

    const { status, body } = await callGet();

    expect(status).toBe(200);
    // RK9 stats intact
    expect(body.rk9).toMatchObject({ eventsTouched: 3 });
    // Limitless shows error, not a partial result
    expect(body.limitless).toMatchObject({ error: expect.any(String) });
  });

  it("preserves limitless stats when processRk9Queue throws", async () => {
    const oldRunAt = new Date(Date.now() - 400_000).toISOString();
    process.env.LIMITLESS_API_KEY = "test-key";
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: oldRunAt,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: oldRunAt,
    });
    mockDrainLimitlessQueue.mockResolvedValue({
      processed: 4,
      errors: 0,
      remaining: 0,
      passes: 1,
    });
    mockProcessRk9Queue.mockRejectedValue(new Error("RK9 worker crashed"));

    const { status, body } = await callGet();

    expect(status).toBe(200);
    expect(body.limitless).toMatchObject({ processed: 4 });
    expect(body.rk9).toMatchObject({ error: expect.any(String) });
  });
});

// =============================================================================
// 8. last_run_at null / undefined → treated as elapsed
// =============================================================================

describe("last_run_at absent", () => {
  it("runs rk9 drain when rk9_last_run_at is null (first-ever run)", async () => {
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      rk9_backend_auto_import: true,
      rk9_cron_interval_seconds: 60,
      rk9_last_run_at: null, // null → interval treated as elapsed
    });
    mockProcessRk9Queue.mockResolvedValue(ZERO_RK9);

    await callGet();

    expect(mockProcessRk9Queue).toHaveBeenCalledTimes(1);
  });

  it("runs limitless drain when limitless_last_run_at is undefined", async () => {
    process.env.LIMITLESS_API_KEY = "test-key";
    const config = { ...BASE_CONFIG };
    // Remove the key entirely (undefined)
    delete (config as Record<string, unknown>)["limitless_last_run_at"];
    mockReadSiteConfigValues.mockResolvedValue({
      ...config,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
    });
    mockDrainLimitlessQueue.mockResolvedValue(ZERO_LIMITLESS);

    await callGet();

    expect(mockDrainLimitlessQueue).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// 9. import_runs observability write (trigger 'cron')
// =============================================================================

describe("import_runs observability write", () => {
  it("calls recordImportRuns with trigger 'cron' after every request", async () => {
    await callGet();

    expect(mockRecordImportRuns).toHaveBeenCalledTimes(1);
    const [, trigger] = mockRecordImportRuns.mock.calls[0] as [
      unknown,
      string,
      unknown[],
    ];
    expect(trigger).toBe("cron");
  });

  it("writes one record per source (limitless, rk9, compile)", async () => {
    await callGet();

    const [, , records] = mockRecordImportRuns.mock.calls[0] as [
      unknown,
      string,
      Array<{ source: string }>,
    ];
    const sources = records.map((r) => r.source);
    expect(sources).toContain("limitless");
    expect(sources).toContain("rk9");
    expect(sources).toContain("compile");
    expect(records).toHaveLength(3);
  });

  it("marks source as 'skipped' with skip_reason when toggle is off", async () => {
    // Both toggles off → both skipped
    await callGet();

    const [, , records] = mockRecordImportRuns.mock.calls[0] as [
      unknown,
      string,
      Array<{ source: string; status: string; skipReason?: string | null }>,
    ];
    const limitlessRecord = records.find((r) => r.source === "limitless")!;
    expect(limitlessRecord.status).toBe("skipped");
    expect(limitlessRecord.skipReason).toMatch(/auto-import disabled/);
  });

  it("marks source as 'ok' when drain returns processed > 0 with no errors", async () => {
    const oldRunAt = new Date(Date.now() - 400_000).toISOString();
    process.env.LIMITLESS_API_KEY = "test-key";
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: oldRunAt,
    });
    mockDrainLimitlessQueue.mockResolvedValue({
      processed: 5,
      errors: 0,
      remaining: 0,
      passes: 1,
    });

    await callGet();

    const [, , records] = mockRecordImportRuns.mock.calls[0] as [
      unknown,
      string,
      Array<{ source: string; status: string }>,
    ];
    const limitlessRecord = records.find((r) => r.source === "limitless")!;
    expect(limitlessRecord.status).toBe("ok");
  });

  it("marks source as 'error' when the worker throws", async () => {
    const oldRunAt = new Date(Date.now() - 400_000).toISOString();
    process.env.LIMITLESS_API_KEY = "test-key";
    mockReadSiteConfigValues.mockResolvedValue({
      ...BASE_CONFIG,
      limitless_backend_auto_import: true,
      limitless_cron_interval_seconds: 300,
      limitless_last_run_at: oldRunAt,
    });
    mockDrainLimitlessQueue.mockRejectedValue(new Error("Limitless API down"));

    await callGet();

    const [, , records] = mockRecordImportRuns.mock.calls[0] as [
      unknown,
      string,
      Array<{ source: string; status: string }>,
    ];
    const limitlessRecord = records.find((r) => r.source === "limitless")!;
    expect(limitlessRecord.status).toBe("error");
  });

  it("marks compile record as 'skipped' when no data was imported (nothing to compile)", async () => {
    // Both toggles off → both sources skipped → compile gets nothing → skipped
    await callGet();

    const [, , records] = mockRecordImportRuns.mock.calls[0] as [
      unknown,
      string,
      Array<{ source: string; status: string; skipReason?: string | null }>,
    ];
    const compileRecord = records.find((r) => r.source === "compile")!;
    expect(compileRecord.status).toBe("skipped");
    expect(compileRecord.skipReason).toMatch(/no events/i);
  });

  it("the observability write does not change the 200 response body shape", async () => {
    // The route always returns JSON with { limitless, rk9, compile, budgetMs }.
    // Confirm the observability write is a side-effect that doesn't alter the
    // response shape — recordImportRuns is a fire-and-await step at the very end.
    const { status, body } = await callGet();

    expect(status).toBe(200);
    expect(body).toHaveProperty("limitless");
    expect(body).toHaveProperty("rk9");
    expect(body).toHaveProperty("compile");
    expect(body).toHaveProperty("budgetMs");
    // recordImportRuns must have been called (it's the observability write)
    expect(mockRecordImportRuns).toHaveBeenCalledTimes(1);
  });
});
