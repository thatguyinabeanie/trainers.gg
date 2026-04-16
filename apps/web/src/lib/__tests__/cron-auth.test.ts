/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

import { requireCronAuth } from "../cron-auth";

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  return new Request("https://example.com/api/discord/register", { headers });
}

describe("requireCronAuth", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    const result = requireCronAuth(makeRequest("Bearer anything"));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
  });

  it("fails closed against the literal string 'Bearer undefined' when CRON_SECRET is unset", async () => {
    // Regression: a naive template-literal comparison of
    //   auth !== `Bearer ${process.env.CRON_SECRET}`
    // would accept this exact header when CRON_SECRET is unset.
    const result = requireCronAuth(makeRequest("Bearer undefined"));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
  });

  it("returns 401 when the authorization header is missing", async () => {
    process.env.CRON_SECRET = "super-secret";
    const result = requireCronAuth(makeRequest());
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 401 when the bearer token does not match", async () => {
    process.env.CRON_SECRET = "super-secret";
    const result = requireCronAuth(makeRequest("Bearer wrong-token"));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 401 when the scheme is not 'Bearer'", async () => {
    process.env.CRON_SECRET = "super-secret";
    const result = requireCronAuth(makeRequest("Basic super-secret"));
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns null when the correct Bearer token is supplied", async () => {
    process.env.CRON_SECRET = "super-secret";
    const result = requireCronAuth(makeRequest("Bearer super-secret"));
    expect(result).toBeNull();
  });
});
