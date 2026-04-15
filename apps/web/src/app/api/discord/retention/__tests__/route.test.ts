/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockPurgeOldNotifications = jest.fn();
const mockPurgeOldDmQueue = jest.fn();
const mockPurgeOldRoleSyncQueue = jest.fn();

jest.mock("@trainers/supabase", () => ({
  purgeOldNotifications: (...args: unknown[]) =>
    mockPurgeOldNotifications(...args),
  purgeOldDmQueue: (...args: unknown[]) => mockPurgeOldDmQueue(...args),
  purgeOldRoleSyncQueue: (...args: unknown[]) =>
    mockPurgeOldRoleSyncQueue(...args),
}));

const mockCreateServiceRoleClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const CRON_SECRET = "test-cron-secret";
const FAKE_CLIENT = { _role: "service" };

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost:3000/api/discord/retention", {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  });
}

// =============================================================================
// Setup
// =============================================================================

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, CRON_SECRET };
  mockCreateServiceRoleClient.mockReturnValue(FAKE_CLIENT);
  mockPurgeOldNotifications.mockResolvedValue({ deleted: 0 });
  mockPurgeOldDmQueue.mockResolvedValue({ deleted: 0 });
  mockPurgeOldRoleSyncQueue.mockResolvedValue({ deleted: 0 });
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
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 401 when the value is CRON_SECRET without the Bearer prefix", async () => {
    const response = await GET(makeRequest(CRON_SECRET));
    expect(response.status).toBe(401);
  });

  it("proceeds when authorization matches Bearer CRON_SECRET", async () => {
    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Happy path — correct retention values
// =============================================================================

describe("Retention policy values", () => {
  it("calls purgeOldNotifications with a cutoff 30 days in the past", async () => {
    const before = new Date();
    await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const after = new Date();

    expect(mockPurgeOldNotifications).toHaveBeenCalledTimes(1);
    const [, cutoff] = mockPurgeOldNotifications.mock.calls[0] as [
      unknown,
      Date,
    ];
    expect(cutoff).toBeInstanceOf(Date);
    const expectedMs = 30 * 24 * 60 * 60 * 1000;
    // cutoff should be roughly (now - 30 days)
    expect(before.getTime() - cutoff.getTime()).toBeGreaterThanOrEqual(
      expectedMs - 1000
    );
    expect(after.getTime() - cutoff.getTime()).toBeLessThanOrEqual(
      expectedMs + 1000
    );
  });

  it("calls purgeOldDmQueue with a cutoff 30 days in the past", async () => {
    const before = new Date();
    await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const after = new Date();

    expect(mockPurgeOldDmQueue).toHaveBeenCalledTimes(1);
    const [, cutoff] = mockPurgeOldDmQueue.mock.calls[0] as [unknown, Date];
    expect(cutoff).toBeInstanceOf(Date);
    const expectedMs = 30 * 24 * 60 * 60 * 1000;
    expect(before.getTime() - cutoff.getTime()).toBeGreaterThanOrEqual(
      expectedMs - 1000
    );
    expect(after.getTime() - cutoff.getTime()).toBeLessThanOrEqual(
      expectedMs + 1000
    );
  });

  it("calls purgeOldRoleSyncQueue with a cutoff 7 days in the past", async () => {
    const before = new Date();
    await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const after = new Date();

    expect(mockPurgeOldRoleSyncQueue).toHaveBeenCalledTimes(1);
    const [, cutoff] = mockPurgeOldRoleSyncQueue.mock.calls[0] as [
      unknown,
      Date,
    ];
    expect(cutoff).toBeInstanceOf(Date);
    const expectedMs = 7 * 24 * 60 * 60 * 1000;
    expect(before.getTime() - cutoff.getTime()).toBeGreaterThanOrEqual(
      expectedMs - 1000
    );
    expect(after.getTime() - cutoff.getTime()).toBeLessThanOrEqual(
      expectedMs + 1000
    );
  });

  it("passes the service-role client to all three purge functions", async () => {
    await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(mockPurgeOldNotifications).toHaveBeenCalledWith(
      FAKE_CLIENT,
      expect.any(Date)
    );
    expect(mockPurgeOldDmQueue).toHaveBeenCalledWith(
      FAKE_CLIENT,
      expect.any(Date)
    );
    expect(mockPurgeOldRoleSyncQueue).toHaveBeenCalledWith(
      FAKE_CLIENT,
      expect.any(Date)
    );
  });
});

// =============================================================================
// Response shape — happy path counts
// =============================================================================

describe("Response shape", () => {
  it("returns JSON with the deleted counts from all three purge functions", async () => {
    mockPurgeOldNotifications.mockResolvedValue({ deleted: 12 });
    mockPurgeOldDmQueue.mockResolvedValue({ deleted: 5 });
    mockPurgeOldRoleSyncQueue.mockResolvedValue({ deleted: 3 });

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(response.headers.get("content-type")).toMatch(/application\/json/);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.notifications_purged).toBe(12);
    expect(body.dms_purged).toBe(5);
    expect(body.role_syncs_purged).toBe(3);
    expect(body.errors).toEqual([]);
  });

  it("returns zero counts and empty errors array when nothing to purge", async () => {
    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.notifications_purged).toBe(0);
    expect(body.dms_purged).toBe(0);
    expect(body.role_syncs_purged).toBe(0);
    expect(body.errors).toEqual([]);
  });
});

// =============================================================================
// Parallel execution — Promise.all
// =============================================================================

describe("Parallel execution", () => {
  it("calls all three purge functions even when one throws", async () => {
    mockPurgeOldNotifications.mockRejectedValue(
      new Error("DB connection lost")
    );

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);
    // The other two still ran
    expect(mockPurgeOldDmQueue).toHaveBeenCalledTimes(1);
    expect(mockPurgeOldRoleSyncQueue).toHaveBeenCalledTimes(1);
  });

  it("reports partial success: failed table gets 0 count and an error entry", async () => {
    mockPurgeOldNotifications.mockRejectedValue(new Error("timeout"));
    mockPurgeOldDmQueue.mockResolvedValue({ deleted: 7 });
    mockPurgeOldRoleSyncQueue.mockResolvedValue({ deleted: 2 });

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as {
      notifications_purged: number;
      dms_purged: number;
      role_syncs_purged: number;
      errors: Array<{ table: string; error: string }>;
    };

    expect(body.notifications_purged).toBe(0);
    expect(body.dms_purged).toBe(7);
    expect(body.role_syncs_purged).toBe(2);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]?.table).toBe("discord_notification_queue");
    expect(body.errors[0]?.error).toContain("timeout");
  });

  it("reports all three errors when every purge fails", async () => {
    mockPurgeOldNotifications.mockRejectedValue(new Error("notif error"));
    mockPurgeOldDmQueue.mockRejectedValue(new Error("dm error"));
    mockPurgeOldRoleSyncQueue.mockRejectedValue(new Error("role error"));

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as {
      notifications_purged: number;
      dms_purged: number;
      role_syncs_purged: number;
      errors: Array<{ table: string; error: string }>;
    };

    expect(body.notifications_purged).toBe(0);
    expect(body.dms_purged).toBe(0);
    expect(body.role_syncs_purged).toBe(0);
    expect(body.errors).toHaveLength(3);
    const tables = body.errors.map((e) => e.table);
    expect(tables).toContain("discord_notification_queue");
    expect(tables).toContain("discord_dm_queue");
    expect(tables).toContain("discord_role_sync_queue");
  });

  it("still returns 200 even when all three purges fail", async () => {
    mockPurgeOldNotifications.mockRejectedValue(new Error("x"));
    mockPurgeOldDmQueue.mockRejectedValue(new Error("y"));
    mockPurgeOldRoleSyncQueue.mockRejectedValue(new Error("z"));

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);
  });
});
