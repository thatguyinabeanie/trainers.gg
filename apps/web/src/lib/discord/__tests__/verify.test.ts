/**
 * @jest-environment node
 */

// discord-interactions uses Node.js crypto — node environment required

const mockVerifyKey = jest.fn();

jest.mock("discord-interactions", () => ({
  verifyKey: (...args: unknown[]) => mockVerifyKey(...args),
}));

import { verifyDiscordSignature, verifyRequest } from "../verify";

const VALID_PUBLIC_KEY = "a".repeat(64); // 32-byte hex key placeholder
const VALID_SIGNATURE = "sig";
const VALID_TIMESTAMP = "1234567890";
const BODY = '{"type":1}';

describe("verifyDiscordSignature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyKey.mockResolvedValue(true);
  });

  it("returns true when verifyKey resolves true", async () => {
    const result = await verifyDiscordSignature(
      BODY,
      VALID_SIGNATURE,
      VALID_TIMESTAMP,
      VALID_PUBLIC_KEY
    );

    expect(result).toBe(true);
    expect(mockVerifyKey).toHaveBeenCalledWith(
      BODY,
      VALID_SIGNATURE,
      VALID_TIMESTAMP,
      VALID_PUBLIC_KEY
    );
  });

  it("returns false when verifyKey resolves false", async () => {
    mockVerifyKey.mockResolvedValue(false);

    const result = await verifyDiscordSignature(
      BODY,
      VALID_SIGNATURE,
      VALID_TIMESTAMP,
      VALID_PUBLIC_KEY
    );

    expect(result).toBe(false);
  });

  it("returns false when signature is null (missing header)", async () => {
    const result = await verifyDiscordSignature(
      BODY,
      null,
      VALID_TIMESTAMP,
      VALID_PUBLIC_KEY
    );

    expect(result).toBe(false);
    expect(mockVerifyKey).not.toHaveBeenCalled();
  });

  it("returns false when timestamp is null (missing header)", async () => {
    const result = await verifyDiscordSignature(
      BODY,
      VALID_SIGNATURE,
      null,
      VALID_PUBLIC_KEY
    );

    expect(result).toBe(false);
    expect(mockVerifyKey).not.toHaveBeenCalled();
  });

  it("returns false when both headers are null", async () => {
    const result = await verifyDiscordSignature(
      BODY,
      null,
      null,
      VALID_PUBLIC_KEY
    );

    expect(result).toBe(false);
    expect(mockVerifyKey).not.toHaveBeenCalled();
  });

  it("passes body, signature, timestamp, and publicKey to verifyKey in order", async () => {
    await verifyDiscordSignature("body", "sig", "ts", "pk");

    expect(mockVerifyKey).toHaveBeenCalledWith("body", "sig", "ts", "pk");
  });
});

describe("verifyRequest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyKey.mockResolvedValue(true);
    process.env = { ...originalEnv, DISCORD_PUBLIC_KEY: VALID_PUBLIC_KEY };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function makeRequest(sig: string | null, ts: string | null): Request {
    const headers = new Headers();
    if (sig !== null) headers.set("x-signature-ed25519", sig);
    if (ts !== null) headers.set("x-signature-timestamp", ts);
    return new Request("https://example.com", { method: "POST", headers });
  }

  it("returns true with valid headers and env public key", async () => {
    const req = makeRequest(VALID_SIGNATURE, VALID_TIMESTAMP);
    const result = await verifyRequest(req, BODY);

    expect(result).toBe(true);
    expect(mockVerifyKey).toHaveBeenCalledWith(
      BODY,
      VALID_SIGNATURE,
      VALID_TIMESTAMP,
      VALID_PUBLIC_KEY
    );
  });

  it("returns false when DISCORD_PUBLIC_KEY env var is missing", async () => {
    delete process.env.DISCORD_PUBLIC_KEY;

    const req = makeRequest(VALID_SIGNATURE, VALID_TIMESTAMP);
    const result = await verifyRequest(req, BODY);

    expect(result).toBe(false);
    expect(mockVerifyKey).not.toHaveBeenCalled();
  });

  it("returns false when signature header is missing", async () => {
    const req = makeRequest(null, VALID_TIMESTAMP);
    const result = await verifyRequest(req, BODY);

    expect(result).toBe(false);
    expect(mockVerifyKey).not.toHaveBeenCalled();
  });

  it("returns false when timestamp header is missing", async () => {
    const req = makeRequest(VALID_SIGNATURE, null);
    const result = await verifyRequest(req, BODY);

    expect(result).toBe(false);
    expect(mockVerifyKey).not.toHaveBeenCalled();
  });

  it("returns false when verifyKey resolves false (bad signature)", async () => {
    mockVerifyKey.mockResolvedValue(false);

    const req = makeRequest("badsig", VALID_TIMESTAMP);
    const result = await verifyRequest(req, BODY);

    expect(result).toBe(false);
  });
});
