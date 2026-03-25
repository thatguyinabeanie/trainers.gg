import { isSafeRelativeUrl, notificationIcons } from "../notification-utils";

describe("isSafeRelativeUrl", () => {
  it("returns true for a valid relative URL", () => {
    expect(isSafeRelativeUrl("/tournaments/abc")).toBe(true);
  });

  it("returns true for a relative URL with subpaths", () => {
    expect(isSafeRelativeUrl("/dashboard/notifications")).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSafeRelativeUrl(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSafeRelativeUrl(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSafeRelativeUrl("")).toBe(false);
  });

  it("returns false for a protocol-absolute URL", () => {
    expect(isSafeRelativeUrl("https://evil.com")).toBe(false);
  });

  it("returns false for a protocol-relative URL starting with //", () => {
    expect(isSafeRelativeUrl("//evil.com")).toBe(false);
  });

  it("returns false for a backslash bypass attempt", () => {
    expect(isSafeRelativeUrl("/\\evil.com")).toBe(false);
  });

  it("returns false for a URL that decodes to a protocol-relative bypass", () => {
    // %2F decodes to /, making it //evil.com
    expect(isSafeRelativeUrl("/%2Fevil.com")).toBe(false);
  });

  it("returns false for a string with invalid percent-encoding", () => {
    expect(isSafeRelativeUrl("/%ZZinvalid")).toBe(false);
  });

  it("trims leading/trailing whitespace before checking", () => {
    expect(isSafeRelativeUrl("  /valid-path  ")).toBe(true);
  });
});

describe("notificationIcons", () => {
  it("has an entry for match_ready", () => {
    expect(notificationIcons["match_ready"]).toBeDefined();
  });

  it("returns undefined for an unknown type", () => {
    expect(notificationIcons["unknown_type"]).toBeUndefined();
  });
});
