/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockRevalidateUsageStatsCaches = jest.fn();

jest.mock("@/lib/cache-invalidation", () => ({
  revalidateUsageStatsCaches: (...args: unknown[]) =>
    mockRevalidateUsageStatsCaches(...args),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { POST } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const VALID_SECRET = "test-usage-revalidate-secret";

function makeRequest(options: {
  token?: string;
  body?: unknown;
  noBody?: boolean;
}): Request {
  const { token, body, noBody = false } = options;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token !== undefined) {
    headers["authorization"] = `Bearer ${token}`;
  }

  return new Request("http://localhost:3000/api/revalidate/usage", {
    method: "POST",
    headers,
    body: noBody ? undefined : JSON.stringify(body ?? {}),
  });
}

async function getJsonResponse(request: Request) {
  const response = await POST(request);
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
}

// =============================================================================
// Setup
// =============================================================================

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, USAGE_REVALIDATE_SECRET: VALID_SECRET };
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// Authorization
// =============================================================================

describe("Authorization", () => {
  it("returns 401 when USAGE_REVALIDATE_SECRET env var is unset", async () => {
    process.env = { ...originalEnv };
    delete process.env.USAGE_REVALIDATE_SECRET;

    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET })
    );

    expect(status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when authorization header is missing", async () => {
    const { status, body } = await getJsonResponse(makeRequest({ body: {} }));

    expect(status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when bearer token does not match USAGE_REVALIDATE_SECRET", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ token: "wrong-token" })
    );

    expect(status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when env var is set to empty string", async () => {
    process.env = { ...originalEnv, USAGE_REVALIDATE_SECRET: "" };

    const { status, body } = await getJsonResponse(makeRequest({ token: "" }));

    expect(status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });
});

// =============================================================================
// Body validation
// =============================================================================

describe("Body validation", () => {
  it("returns 400 when formats is not an array", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, body: { formats: "not-an-array" } })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 when formats has more than 50 entries", async () => {
    const formats = Array.from({ length: 51 }, (_, i) => `format-${i}`);

    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, body: { formats } })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 when a format entry is an empty string", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, body: { formats: [""] } })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 400 when a format entry exceeds 100 characters", async () => {
    const longFormat = "a".repeat(101);

    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, body: { formats: [longFormat] } })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid request body");
  });
});

// =============================================================================
// Successful revalidation
// =============================================================================

describe("Successful revalidation", () => {
  it("calls revalidateUsageStatsCaches with the provided formats", async () => {
    const formats = ["VGC-2025-Reg-G", "VGC-2025-Reg-H"];

    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, body: { formats } })
    );

    expect(status).toBe(200);
    expect(body.revalidated).toBe(true);
    expect(body.formats).toEqual(formats);
    expect(mockRevalidateUsageStatsCaches).toHaveBeenCalledWith(formats);
  });

  it("calls revalidateUsageStatsCaches with [] when body is empty object", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, body: {} })
    );

    expect(status).toBe(200);
    expect(body.revalidated).toBe(true);
    expect(body.formats).toEqual([]);
    expect(mockRevalidateUsageStatsCaches).toHaveBeenCalledWith([]);
  });

  it("calls revalidateUsageStatsCaches with [] when body has no formats key", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, body: { unrelated: "ignored" } })
    );

    expect(status).toBe(200);
    expect(body.revalidated).toBe(true);
    expect(body.formats).toEqual([]);
    expect(mockRevalidateUsageStatsCaches).toHaveBeenCalledWith([]);
  });

  it("calls revalidateUsageStatsCaches with [] when body is absent", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, noBody: true })
    );

    expect(status).toBe(200);
    expect(body.revalidated).toBe(true);
    expect(body.formats).toEqual([]);
    expect(mockRevalidateUsageStatsCaches).toHaveBeenCalledWith([]);
  });

  it("accepts formats at the max boundary of 50 entries", async () => {
    const formats = Array.from({ length: 50 }, (_, i) => `format-${i}`);

    const { status } = await getJsonResponse(
      makeRequest({ token: VALID_SECRET, body: { formats } })
    );

    expect(status).toBe(200);
    expect(mockRevalidateUsageStatsCaches).toHaveBeenCalledWith(formats);
  });
});
