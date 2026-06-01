/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpdate = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();
const mockFrom = jest.fn();
const mockSchema = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { POST } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const WEBHOOK_SECRET = "test-webhook-secret";

/** Build a Request with the given JSON body. */
function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/webhooks/limitless", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Standard tournament:ended payload. */
function makePayload(
  overrides: {
    secret?: string;
    eventName?: string;
    game?: string;
    tournamentId?: string;
  } = {}
) {
  return {
    secret: overrides.secret ?? WEBHOOK_SECRET,
    event: {
      name: overrides.eventName ?? "tournament:ended",
      tournamentId: overrides.tournamentId ?? "abc123",
      game: overrides.game ?? "VGC",
    },
  };
}

// =============================================================================
// Setup
// =============================================================================

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, LIMITLESS_WEBHOOK_SECRET: WEBHOOK_SECRET };

  // select → eq → maybeSingle chain (select.eq returns a new object with maybeSingle)
  mockSelect.mockImplementation(() => ({
    eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
    maybeSingle: mockMaybeSingle,
  }));
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });

  // update → eq → resolved result (update.eq resolves directly)
  mockUpdate.mockImplementation(() => ({
    eq: mockEq,
  }));
  mockEq.mockResolvedValue({ error: null });

  // Direct resolves for terminal methods
  mockInsert.mockResolvedValue({ error: null });
  mockUpsert.mockResolvedValue({ error: null });

  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
    upsert: mockUpsert,
  });
  mockSchema.mockReturnValue({ from: mockFrom });
  mockCreateServiceRoleClient.mockReturnValue({
    schema: mockSchema,
  });
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// Secret validation
// =============================================================================

describe("Secret validation", () => {
  it("returns 500 when LIMITLESS_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.LIMITLESS_WEBHOOK_SECRET;

    const response = await POST(makeRequest(makePayload()));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.error).toBe("Webhook not configured");
  });

  it("returns 401 when the secret does not match", async () => {
    const response = await POST(
      makeRequest(makePayload({ secret: "wrong-secret" }))
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid secret");
  });

  it("passes when the secret matches", async () => {
    const response = await POST(makeRequest(makePayload()));

    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Event filtering
// =============================================================================

describe("Event filtering", () => {
  it("ignores unknown event names with a 200", async () => {
    const response = await POST(
      makeRequest(makePayload({ eventName: "tournament:started" }))
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.message).toBe("Ignored event: tournament:started");
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("ignores payloads with no event object", async () => {
    const response = await POST(makeRequest({ secret: WEBHOOK_SECRET }));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.message).toBe("Ignored event: unknown");
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("ignores non-VGC games with a 200", async () => {
    const response = await POST(makeRequest(makePayload({ game: "TCG" })));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.message).toBe("Ignored non-VGC game: TCG");
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns 400 when tournamentId is missing", async () => {
    const payload = makePayload();
    delete (payload.event as Record<string, unknown>).tournamentId;

    const response = await POST(makeRequest(payload));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing tournamentId in event");
  });
});

// =============================================================================
// Queue-based import
// =============================================================================

describe("Queue-based import", () => {
  it("updates the tournament row with queue status", async () => {
    // Make the select lookup return a row so we hit the update path
    mockMaybeSingle.mockResolvedValue({
      data: { tournament_id: "tourney-99", import_status: "pending" },
      error: null,
    });

    await POST(makeRequest(makePayload({ tournamentId: "tourney-99" })));

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(mockSchema).toHaveBeenCalledWith("limitless");
    expect(mockFrom).toHaveBeenCalledWith("tournaments");
    // Update call to set queue status
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ import_status: "queued" })
    );
    expect(mockEq).toHaveBeenCalledWith("tournament_id", "tourney-99");
  });

  it("returns success with queued flag", async () => {
    const response = await POST(
      makeRequest(makePayload({ tournamentId: "tourney-99" }))
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(
      expect.objectContaining({ tournamentId: "tourney-99", queued: true })
    );
  });

  it("returns 500 when queue update fails", async () => {
    // Make the select lookup return a row so we hit the update path
    mockMaybeSingle.mockResolvedValue({
      data: { tournament_id: "abc123", import_status: "pending" },
      error: null,
    });
    mockEq.mockResolvedValue({ error: { message: "Update failed" } });

    const response = await POST(makeRequest(makePayload()));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to queue tournament");
  });
});

// =============================================================================
// Error handling
// =============================================================================

describe("Error handling", () => {
  it("returns 500 with error message when request body is invalid JSON", async () => {
    const request = new Request(
      "http://localhost:3000/api/webhooks/limitless",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }
    );

    const response = await POST(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("returns 500 with generic message for non-Error throws", async () => {
    const request = {
      json: jest.fn().mockRejectedValue("string-error"),
    } as unknown as Request;

    const response = await POST(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});
