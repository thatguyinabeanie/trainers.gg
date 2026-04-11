import { describe, it, expect } from "@jest/globals";

import { decodeJwtClaims } from "../jwt";

// =============================================================================
// Helpers
// =============================================================================

/** Build a syntactically valid JWT string from an arbitrary payload object. */
function buildJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .toString("base64url")
    .replace(/=/g, "");
  const body = Buffer.from(JSON.stringify(payload))
    .toString("base64url")
    .replace(/=/g, "");
  return `${header}.${body}.fakesignature`;
}

// =============================================================================
// decodeJwtClaims
// =============================================================================

describe("decodeJwtClaims", () => {
  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it("returns the decoded payload for a valid JWT", () => {
    const payload = { sub: "user-42", role: "authenticated" };
    const token = buildJwt(payload);
    expect(decodeJwtClaims(token)).toEqual(payload);
  });

  it("returns the payload with a boolean custom claim", () => {
    const payload = { sub: "user-1", team_builder_access: true };
    const token = buildJwt(payload);
    const result = decodeJwtClaims<typeof payload>(token);
    expect(result?.team_builder_access).toBe(true);
  });

  it("returns the payload with nested objects", () => {
    const payload = { sub: "user-1", app_metadata: { provider: "email" } };
    const token = buildJwt(payload);
    expect(decodeJwtClaims(token)).toEqual(payload);
  });

  it("correctly types the returned payload via generic parameter", () => {
    interface CustomClaims {
      sub: string;
      site_admin: boolean;
    }
    const payload: CustomClaims = { sub: "admin-1", site_admin: true };
    const token = buildJwt(payload);
    const result = decodeJwtClaims<CustomClaims>(token);
    // TypeScript infers the correct shape — verify runtime value
    expect(result?.site_admin).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Null/error paths
  // ---------------------------------------------------------------------------

  it("returns null for a token with no dots (missing segments)", () => {
    expect(decodeJwtClaims("notavalidtoken")).toBeNull();
  });

  it("returns null for a token with only one dot (missing payload segment)", () => {
    expect(decodeJwtClaims("header.")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(decodeJwtClaims("")).toBeNull();
  });

  it("returns null when the payload segment is invalid base64", () => {
    // Corrupt the payload with characters that will fail Buffer decode + JSON parse
    const token = "header.!!!invalid-base64!!!.signature";
    // It should not throw — just return null
    expect(decodeJwtClaims(token)).toBeNull();
  });

  it("returns null when the payload is valid base64 but not valid JSON", () => {
    // "not json" encoded in base64url
    const notJson = Buffer.from("not json at all").toString("base64url");
    const token = `header.${notJson}.signature`;
    expect(decodeJwtClaims(token)).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it("returns the payload even when the token has extra dots (only second segment used)", () => {
    // split(".")[1] always picks the second segment regardless of extra dots
    const payload = { sub: "user-99" };
    const body = Buffer.from(JSON.stringify(payload))
      .toString("base64url")
      .replace(/=/g, "");
    // Extra-dotted token — the second segment is still the payload
    const token = `header.${body}.sig.extra.dots`;
    expect(decodeJwtClaims(token)).toEqual(payload);
  });
});
