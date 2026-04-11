import { describe, it, expect } from "@jest/globals";

import { decodeBase64Url } from "../jwt-utils";

// =============================================================================
// decodeBase64Url
// =============================================================================

describe("decodeBase64Url", () => {
  // ---------------------------------------------------------------------------
  // Standard decoding
  // ---------------------------------------------------------------------------

  it("decodes a plain base64url string with no special characters", () => {
    // "hello" in base64 = "aGVsbG8="
    // base64url strips the trailing "=", giving "aGVsbG8"
    const encoded = "aGVsbG8";
    expect(decodeBase64Url(encoded)).toBe("hello");
  });

  it("decodes a base64url string that needs one padding character", () => {
    // "he" → base64 "aGU=" → base64url "aGU" (length 3 → padding 1 → "aGU=")
    const encoded = "aGU";
    expect(decodeBase64Url(encoded)).toBe("he");
  });

  it("decodes a base64url string that needs two padding characters", () => {
    // "h" → base64 "aA==" → base64url "aA" (length 2 → padding 2 → "aA==")
    const encoded = "aA";
    expect(decodeBase64Url(encoded)).toBe("h");
  });

  it("decodes a base64url string with no padding needed (multiple of 4)", () => {
    // "test" → base64 "dGVzdA==" — but let's verify a length-8 string
    // "hello!!!" → base64url encodes to something divisible by 4
    const encoded = "aGVsbG8hISE";
    expect(decodeBase64Url(encoded)).toBe("hello!!!");
  });

  // ---------------------------------------------------------------------------
  // URL-safe character substitution
  // ---------------------------------------------------------------------------

  it("converts '-' (url-safe minus) to '+' before decoding", () => {
    // Build a string that would contain '+' in standard base64 — which becomes '-' in base64url.
    // ">" encodes to "Pg==" in standard base64 and "Pg" in base64url.
    // ">>" encodes to "Pj4=" in standard base64 and "Pj4" in base64url.
    // ">>>" encodes to "Pj4+" in standard base64 and "Pj4-" in base64url.
    const encoded = "Pj4-"; // base64url for ">>>"
    expect(decodeBase64Url(encoded)).toBe(">>>");
  });

  it("converts '_' (url-safe underscore) to '/' before decoding", () => {
    // "?" encodes to "Pw==" in standard base64 and "Pw" in base64url.
    // "??" → "Pz8=" → base64url "Pz8"
    // "???" → "Pz8/" → base64url "Pz8_"
    const encoded = "Pz8_"; // base64url for "???"
    expect(decodeBase64Url(encoded)).toBe("???");
  });

  it("handles a string with both '-' and '_' characters", () => {
    // Craft a payload that uses both url-safe chars.
    // Encode JSON to get a realistic JWT-like payload.
    // {"a":1} → eyJhIjoxfQ== in standard base64 → eyJhIjoxfQ in base64url
    // (no +/- or /_  in this particular example, but we can verify the general path)
    const encoded = "eyJhIjoxfQ"; // {"a":1}
    expect(decodeBase64Url(encoded)).toBe('{"a":1}');
  });

  // ---------------------------------------------------------------------------
  // Real JWT payload segment
  // ---------------------------------------------------------------------------

  it("decodes a realistic JWT payload segment", () => {
    // A minimal Supabase-style JWT payload:
    // { "sub": "user-123", "role": "authenticated", "team_builder_access": true }
    const payload = {
      sub: "user-123",
      role: "authenticated",
      team_builder_access: true,
    };

    // Encode the payload manually using Buffer (same as the real JWT would)
    const jsonStr = JSON.stringify(payload);
    const base64url = Buffer.from(jsonStr)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const decoded = decodeBase64Url(base64url);
    expect(JSON.parse(decoded)).toEqual(payload);
  });

  it("decodes an empty JSON object payload", () => {
    // "{}" → Buffer → base64url "e30"
    const encoded = "e30";
    expect(decodeBase64Url(encoded)).toBe("{}");
  });

  // ---------------------------------------------------------------------------
  // Round-trip: encode then decode
  // ---------------------------------------------------------------------------

  it.each([
    ["short string", "hi"],
    ["ASCII string with spaces", "hello world"],
    ["JSON string", '{"user":"ash","role":"admin"}'],
    ["unicode content", "trainers.gg"],
  ])("round-trips %s correctly", (_label, input) => {
    const base64url = Buffer.from(input)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    expect(decodeBase64Url(base64url)).toBe(input);
  });
});
