/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockFunctionsInvoke = jest.fn();
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
function makePayload(overrides: {
  secret?: string;
  eventName?: string;
  game?: string;
  tournamentId?: string;
} = {}) {
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
  // Default: edge function succeeds
  mockFunctionsInvoke.mockResolvedValue({
    data: { success: true, imported: 1 },
    error: null,
  });
  mockCreateServiceRoleClient.mockReturnValue({
    functions: { invoke: mockFunctionsInvoke },
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
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
  });

  it("ignores payloads with no event object", async () => {
    const response = await POST(
      makeRequest({ secret: WEBHOOK_SECRET })
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.message).toBe("Ignored event: unknown");
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
  });

  it("ignores non-VGC games with a 200", async () => {
    const response = await POST(
      makeRequest(makePayload({ game: "TCG" }))
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.message).toBe("Ignored non-VGC game: TCG");
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
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
// Edge function delegation
// =============================================================================

describe("Edge function delegation", () => {
  it("calls the limitless-import edge function with auto-import action", async () => {
    await POST(makeRequest(makePayload({ tournamentId: "tourney-99" })));

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).toHaveBeenCalledWith("limitless-import", {
      body: { action: "auto-import", tournamentId: "tourney-99" },
    });
  });

  it("returns the edge function response data on success", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true, imported: 1, format: "gen9championsvgc2026regma" },
      error: null,
    });

    const response = await POST(makeRequest(makePayload()));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.imported).toBe(1);
  });

  it("returns 500 when the edge function returns an error", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: "Edge function failed" },
    });

    const response = await POST(makeRequest(makePayload()));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.error).toBe("Import failed");
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
    // Force a non-Error throw by making json() reject with a string
    const request = {
      json: jest.fn().mockRejectedValue("string-error"),
    } as unknown as Request;

    const response = await POST(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});
