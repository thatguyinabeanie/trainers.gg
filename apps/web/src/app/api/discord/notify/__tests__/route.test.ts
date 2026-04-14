/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockListPendingNotifications = jest.fn();
const mockListPendingDmNotifications = jest.fn();
const mockMarkNotificationSent = jest.fn();
const mockMarkNotificationFailed = jest.fn();
const mockMarkDmSent = jest.fn();
const mockMarkDmFailed = jest.fn();
const mockMarkDmSkipped = jest.fn();
const mockRecordChannelFailure = jest.fn();
const mockResetChannelFailures = jest.fn();
const mockMarkChannelEmailSent = jest.fn();
const mockGetDiscordServerByChannelId = jest.fn();
const mockIsDmEnabledForUser = jest.fn();

jest.mock("@trainers/supabase", () => ({
  listPendingNotifications: (...args: unknown[]) =>
    mockListPendingNotifications(...args),
  listPendingDmNotifications: (...args: unknown[]) =>
    mockListPendingDmNotifications(...args),
  markNotificationSent: (...args: unknown[]) =>
    mockMarkNotificationSent(...args),
  markNotificationFailed: (...args: unknown[]) =>
    mockMarkNotificationFailed(...args),
  markDmSent: (...args: unknown[]) => mockMarkDmSent(...args),
  markDmFailed: (...args: unknown[]) => mockMarkDmFailed(...args),
  markDmSkipped: (...args: unknown[]) => mockMarkDmSkipped(...args),
  recordChannelFailure: (...args: unknown[]) =>
    mockRecordChannelFailure(...args),
  resetChannelFailures: (...args: unknown[]) =>
    mockResetChannelFailures(...args),
  markChannelEmailSent: (...args: unknown[]) =>
    mockMarkChannelEmailSent(...args),
  getDiscordServerByChannelId: (...args: unknown[]) =>
    mockGetDiscordServerByChannelId(...args),
  isDmEnabledForUser: (...args: unknown[]) => mockIsDmEnabledForUser(...args),
}));

const mockCreateServiceRoleClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

const mockSendChannelMessage = jest.fn();
const mockSendDM = jest.fn();
const mockIsNotFoundError = jest.fn();
const mockIsMissingAccessError = jest.fn();
const mockGetErrorCode = jest.fn();

// DiscordRateLimitError needs to be a real class for instanceof checks
class MockDiscordRateLimitError extends Error {
  readonly retryAfter: number;
  constructor(retryAfter = 1) {
    super("Rate limited");
    this.name = "DiscordRateLimitError";
    this.retryAfter = retryAfter;
  }
}

jest.mock("@/lib/discord/api", () => ({
  sendChannelMessage: (...args: unknown[]) => mockSendChannelMessage(...args),
  sendDM: (...args: unknown[]) => mockSendDM(...args),
  isNotFoundError: (e: unknown) => mockIsNotFoundError(e),
  isMissingAccessError: (e: unknown) => mockIsMissingAccessError(e),
  getErrorCode: (e: unknown) => mockGetErrorCode(e),
  DiscordRateLimitError: MockDiscordRateLimitError,
}));

jest.mock("@/lib/discord/embeds", () => ({
  buildEmbed: (opts: Record<string, unknown>) => ({ type: "embed", ...opts }),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { GET, POST } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const CRON_SECRET = "test-cron-secret";

function makeRequest(
  method: "GET" | "POST" = "GET",
  authHeader?: string
): Request {
  return new Request("http://localhost:3000/api/discord/notify", {
    method,
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  });
}

function makeChannelItem(
  overrides: Partial<{
    id: number;
    channel_id: string;
    attempts: number;
    event_type: string;
    payload: Record<string, unknown>;
  }> = {}
) {
  return {
    id: overrides.id ?? 1,
    channel_id: overrides.channel_id ?? "chan-111",
    attempts: overrides.attempts ?? 0,
    event_type: overrides.event_type ?? "tournament_start",
    payload: overrides.payload ?? { title: "Test Event" },
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
    sent_at: null,
    failed_reason: null,
    source_id: "src-1",
  };
}

function makeDmItem(
  overrides: Partial<{
    id: number;
    discord_user_id: string;
    user_id: string;
    community_id: number;
    event_type: string;
    delivery_mode: string;
    fallback_channel_id: string | null;
    payload: Record<string, unknown>;
  }> = {}
) {
  return {
    id: overrides.id ?? 10,
    discord_user_id: overrides.discord_user_id ?? "discord-user-999",
    user_id: overrides.user_id ?? "user-uuid-1",
    community_id: overrides.community_id ?? 42,
    event_type: overrides.event_type ?? "tournament_start",
    delivery_mode: overrides.delivery_mode ?? "dm_only",
    fallback_channel_id: overrides.fallback_channel_id ?? null,
    payload: overrides.payload ?? { title: "DM Test" },
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
    sent_at: null,
    failed_reason: null,
    source_id: "src-dm-1",
    attempts: 0,
  };
}

function makeServer(overrides: Partial<{ id: number; guild_id: string }> = {}) {
  return {
    id: overrides.id ?? 100,
    guild_id: overrides.guild_id ?? "guild-100",
    community_id: 1,
    installed_by: "user-abc",
    settings: {},
    created_at: "2026-01-01T00:00:00Z",
  };
}

// =============================================================================
// Setup
// =============================================================================

const originalEnv = process.env;
const FAKE_CLIENT = {
  _role: "service",
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, CRON_SECRET };

  mockCreateServiceRoleClient.mockReturnValue(FAKE_CLIENT);
  mockListPendingNotifications.mockResolvedValue([]);
  mockListPendingDmNotifications.mockResolvedValue([]);
  mockMarkNotificationSent.mockResolvedValue(undefined);
  mockMarkNotificationFailed.mockResolvedValue(undefined);
  mockMarkDmSent.mockResolvedValue(undefined);
  mockMarkDmFailed.mockResolvedValue(undefined);
  mockMarkDmSkipped.mockResolvedValue(undefined);
  mockRecordChannelFailure.mockResolvedValue({ consecutive_failures: 1 });
  mockResetChannelFailures.mockResolvedValue(undefined);
  mockMarkChannelEmailSent.mockResolvedValue(undefined);
  mockGetDiscordServerByChannelId.mockResolvedValue(null);
  mockIsDmEnabledForUser.mockResolvedValue(true);
  mockSendChannelMessage.mockResolvedValue({ id: "msg-1" });
  mockSendDM.mockResolvedValue({ id: "msg-dm-1" });
  mockIsNotFoundError.mockReturnValue(false);
  mockIsMissingAccessError.mockReturnValue(false);
  mockGetErrorCode.mockReturnValue("unknown");
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// 1. Authorization — missing bearer
// =============================================================================

describe("Authorization", () => {
  it("returns 401 when the authorization header is missing", async () => {
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 401 when the bearer token does not match CRON_SECRET", async () => {
    const response = await GET(makeRequest("GET", "Bearer wrong-secret"));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });
});

// =============================================================================
// 3. Happy path — 1 channel + 1 DM succeed
// =============================================================================

describe("Happy path", () => {
  it("processes one channel and one DM and returns correct counts", async () => {
    const channelItem = makeChannelItem({ id: 1, channel_id: "chan-happy" });
    const dmItem = makeDmItem({ id: 10, discord_user_id: "u-999" });

    mockListPendingNotifications.mockResolvedValue([channelItem]);
    mockListPendingDmNotifications.mockResolvedValue([dmItem]);
    mockIsDmEnabledForUser.mockResolvedValue(true);
    mockGetDiscordServerByChannelId.mockResolvedValue(null);

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.channelsProcessed).toBe(1);
    expect(body.channelsSent).toBe(1);
    expect(body.channelsFailed).toBe(0);
    expect(body.dmsProcessed).toBe(1);
    expect(body.dmsSent).toBe(1);
    expect(body.dmsFailed).toBe(0);

    expect(mockMarkNotificationSent).toHaveBeenCalledWith(
      FAKE_CLIENT,
      channelItem.id
    );
    expect(mockMarkDmSent).toHaveBeenCalledWith(FAKE_CLIENT, dmItem.id);
  });

  it("POST also delegates to handle() and returns 200", async () => {
    const response = await POST(makeRequest("POST", `Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// 4. Channel 404 → recordChannelFailure + markNotificationFailed
// =============================================================================

describe("Channel — 404 terminal error", () => {
  it("marks failed and records failure when the channel returns 404", async () => {
    const item = makeChannelItem({ id: 2, channel_id: "chan-404" });
    mockListPendingNotifications.mockResolvedValue([item]);
    const err = new Error("Unknown Channel");
    mockSendChannelMessage.mockRejectedValue(err);
    mockIsNotFoundError.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(404);

    const server = makeServer({ id: 7 });
    mockGetDiscordServerByChannelId.mockResolvedValue(server);
    mockRecordChannelFailure.mockResolvedValue({ consecutive_failures: 1 });

    // Inline channel_failures query returns no email_sent_at
    FAKE_CLIENT.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { email_sent_at: null }, error: null }),
    });

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockMarkNotificationFailed).toHaveBeenCalledWith(
      FAKE_CLIENT,
      item.id,
      "terminal:404"
    );
    expect(mockRecordChannelFailure).toHaveBeenCalledWith(
      FAKE_CLIENT,
      server.id,
      item.channel_id
    );
    expect(body.channelsFailed).toBe(1);
    expect(body.channelsSent).toBe(0);
  });
});

// =============================================================================
// 5. Channel 5 consecutive failures + email_sent_at NULL → markChannelEmailSent
// =============================================================================

describe("Channel — email threshold", () => {
  it("calls markChannelEmailSent exactly once when failures reach threshold", async () => {
    const item = makeChannelItem({ id: 3, channel_id: "chan-fail-5" });
    mockListPendingNotifications.mockResolvedValue([item]);

    const err = new Error("Forbidden");
    mockSendChannelMessage.mockRejectedValue(err);
    mockIsNotFoundError.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(404);

    const server = makeServer({ id: 8 });
    mockGetDiscordServerByChannelId.mockResolvedValue(server);
    // Return 5 consecutive failures (at threshold)
    mockRecordChannelFailure.mockResolvedValue({ consecutive_failures: 5 });

    // Simulate email_sent_at IS NULL — email not yet sent
    FAKE_CLIENT.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { email_sent_at: null }, error: null }),
    });

    await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));

    expect(mockMarkChannelEmailSent).toHaveBeenCalledTimes(1);
    expect(mockMarkChannelEmailSent).toHaveBeenCalledWith(
      FAKE_CLIENT,
      server.id,
      item.channel_id
    );
  });

  it("does NOT call markChannelEmailSent when email was already sent", async () => {
    const item = makeChannelItem({ id: 4, channel_id: "chan-already-emailed" });
    mockListPendingNotifications.mockResolvedValue([item]);

    const err = new Error("Forbidden");
    mockSendChannelMessage.mockRejectedValue(err);
    mockIsNotFoundError.mockReturnValue(true);
    mockGetErrorCode.mockReturnValue(404);

    const server = makeServer({ id: 9 });
    mockGetDiscordServerByChannelId.mockResolvedValue(server);
    mockRecordChannelFailure.mockResolvedValue({ consecutive_failures: 6 });

    // email_sent_at is already set — do not re-send
    FAKE_CLIENT.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { email_sent_at: "2026-01-01T00:00:00Z" },
        error: null,
      }),
    });

    await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));

    expect(mockMarkChannelEmailSent).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 6. Channel 429 → stays pending, no state mutation, appears in errors
// =============================================================================

describe("Channel — rate limit (429)", () => {
  it("leaves item pending and adds to errors when rate limited", async () => {
    const item = makeChannelItem({ id: 5, channel_id: "chan-429" });
    mockListPendingNotifications.mockResolvedValue([item]);

    const rateLimitErr = new MockDiscordRateLimitError(30);
    mockSendChannelMessage.mockRejectedValue(rateLimitErr);

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockMarkNotificationSent).not.toHaveBeenCalled();
    expect(mockMarkNotificationFailed).not.toHaveBeenCalled();
    expect(mockRecordChannelFailure).not.toHaveBeenCalled();

    expect(body.channelsFailed).toBe(0);
    expect(body.channelsSent).toBe(0);
    const errs = body.channelErrors as Array<{ id: number; reason: string }>;
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatchObject({ id: item.id, reason: "rate_limited" });
  });
});

// =============================================================================
// 7. Channel attempts >= 3 → markNotificationFailed, sendChannelMessage never called
// =============================================================================

describe("Channel — max attempts exceeded", () => {
  it("dead-letters the item without calling sendChannelMessage", async () => {
    const item = makeChannelItem({
      id: 6,
      channel_id: "chan-maxed",
      attempts: 3,
    });
    mockListPendingNotifications.mockResolvedValue([item]);

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockSendChannelMessage).not.toHaveBeenCalled();
    expect(mockMarkNotificationFailed).toHaveBeenCalledWith(
      FAKE_CLIENT,
      item.id,
      "max_attempts_exceeded"
    );
    expect(body.channelsFailed).toBe(1);
  });
});

// =============================================================================
// 8. DM user opted out → markDmSkipped, sendDM never called
// =============================================================================

describe("DM — user opted out", () => {
  it("skips and marks skipped when user DMs are disabled", async () => {
    const item = makeDmItem({ id: 20 });
    mockListPendingDmNotifications.mockResolvedValue([item]);
    mockIsDmEnabledForUser.mockResolvedValue(false);

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockSendDM).not.toHaveBeenCalled();
    expect(mockMarkDmSkipped).toHaveBeenCalledWith(
      FAKE_CLIENT,
      item.id,
      "user_opted_out"
    );
    expect(body.dmsSkipped).toBe(1);
    expect(body.dmsSent).toBe(0);
  });
});

// =============================================================================
// 9. DM delivery_mode = channel_only → markDmSkipped('community_disabled')
// =============================================================================

describe("DM — channel_only delivery mode", () => {
  it("skips with community_disabled reason when delivery_mode is channel_only", async () => {
    const item = makeDmItem({ id: 21, delivery_mode: "channel_only" });
    mockListPendingDmNotifications.mockResolvedValue([item]);
    mockIsDmEnabledForUser.mockResolvedValue(true);

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockSendDM).not.toHaveBeenCalled();
    expect(mockMarkDmSkipped).toHaveBeenCalledWith(
      FAKE_CLIENT,
      item.id,
      "community_disabled"
    );
    expect(body.dmsSkipped).toBe(1);
  });
});

// =============================================================================
// 10. DM 50007 with fallback_channel_id → fallback post called, markDmSent
// =============================================================================

describe("DM — 50007 with fallback channel", () => {
  it("sends to fallback channel and marks DM sent when DMs are closed", async () => {
    const item = makeDmItem({
      id: 22,
      discord_user_id: "discord-u-closed",
      fallback_channel_id: "fallback-chan-001",
    });
    mockListPendingDmNotifications.mockResolvedValue([item]);
    mockIsDmEnabledForUser.mockResolvedValue(true);

    const dmErr = new Error("Cannot send DMs to this user");
    mockSendDM.mockRejectedValue(dmErr);
    mockGetErrorCode.mockReturnValue(50007);

    mockSendChannelMessage.mockResolvedValue({ id: "msg-fallback" });

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockSendChannelMessage).toHaveBeenCalledWith(
      item.fallback_channel_id,
      expect.objectContaining({ content: `<@${item.discord_user_id}>` })
    );
    expect(mockMarkDmSent).toHaveBeenCalledWith(FAKE_CLIENT, item.id);
    expect(body.dmsSent).toBe(1);
    expect(body.dmsFailed).toBe(0);
  });
});

// =============================================================================
// 11. DM 50007 without fallback → markDmFailed('dm_closed')
// =============================================================================

describe("DM — 50007 without fallback", () => {
  it("marks failed with dm_closed when DMs are closed and no fallback is set", async () => {
    const item = makeDmItem({
      id: 23,
      discord_user_id: "discord-u-nofb",
      fallback_channel_id: null,
    });
    mockListPendingDmNotifications.mockResolvedValue([item]);
    mockIsDmEnabledForUser.mockResolvedValue(true);

    const dmErr = new Error("DMs closed");
    mockSendDM.mockRejectedValue(dmErr);
    mockGetErrorCode.mockReturnValue(50007);

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockSendChannelMessage).not.toHaveBeenCalled();
    expect(mockMarkDmFailed).toHaveBeenCalledWith(
      FAKE_CLIENT,
      item.id,
      "dm_closed"
    );
    expect(body.dmsFailed).toBe(1);
    expect(body.dmsSent).toBe(0);
  });
});

// =============================================================================
// 12. DM 429 → no mutation, stays pending
// =============================================================================

describe("DM — rate limit (429)", () => {
  it("leaves item pending with no state mutation when rate limited", async () => {
    const item = makeDmItem({ id: 24 });
    mockListPendingDmNotifications.mockResolvedValue([item]);
    mockIsDmEnabledForUser.mockResolvedValue(true);

    const rateLimitErr = new MockDiscordRateLimitError(5);
    mockSendDM.mockRejectedValue(rateLimitErr);

    const response = await GET(makeRequest("GET", `Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockMarkDmSent).not.toHaveBeenCalled();
    expect(mockMarkDmFailed).not.toHaveBeenCalled();
    expect(mockMarkDmSkipped).not.toHaveBeenCalled();

    expect(body.dmsFailed).toBe(0);
    expect(body.dmsSent).toBe(0);
    const errs = body.dmErrors as Array<{ id: number; reason: string }>;
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatchObject({ id: item.id, reason: "rate_limited" });
  });
});
