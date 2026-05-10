/**
 * Tests for sanitizeReturnUrl utility
 * Verifies open redirect prevention logic
 */

import { sanitizeReturnUrl } from "../url-safety";

describe("sanitizeReturnUrl", () => {
  describe("valid relative paths", () => {
    it("allows simple relative paths", () => {
      expect(sanitizeReturnUrl("/dashboard")).toBe("/dashboard");
    });

    it("allows nested paths", () => {
      expect(sanitizeReturnUrl("/dashboard/settings/account")).toBe(
        "/dashboard/settings/account"
      );
    });

    it("allows paths with query strings", () => {
      expect(sanitizeReturnUrl("/search?q=test")).toBe("/search?q=test");
    });

    it("allows root path", () => {
      expect(sanitizeReturnUrl("/")).toBe("/");
    });

    it("allows paths with hash fragments", () => {
      expect(sanitizeReturnUrl("/page#section")).toBe("/page#section");
    });
  });

  describe("null/undefined/empty", () => {
    it("returns fallback for null", () => {
      expect(sanitizeReturnUrl(null)).toBe("/");
    });

    it("returns fallback for undefined", () => {
      expect(sanitizeReturnUrl(undefined)).toBe("/");
    });

    it("returns fallback for empty string", () => {
      expect(sanitizeReturnUrl("")).toBe("/");
    });

    it("uses custom fallback when provided", () => {
      expect(sanitizeReturnUrl(null, "/dashboard/settings/account")).toBe(
        "/dashboard/settings/account"
      );
    });
  });

  describe("open redirect prevention", () => {
    it("rejects protocol-relative URLs (//)", () => {
      expect(sanitizeReturnUrl("//evil.com")).toBe("/");
    });

    it("rejects absolute URLs with scheme", () => {
      expect(sanitizeReturnUrl("https://evil.com")).toBe("/");
    });

    it("rejects URLs not starting with /", () => {
      expect(sanitizeReturnUrl("evil.com/path")).toBe("/");
    });

    it("rejects backslash tricks", () => {
      expect(sanitizeReturnUrl("/\\evil.com")).toBe("/");
    });

    it("rejects paths with embedded backslashes", () => {
      expect(sanitizeReturnUrl("/foo\\bar")).toBe("/");
    });

    it("rejects javascript: protocol", () => {
      expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/");
    });

    it("rejects data: URLs", () => {
      expect(sanitizeReturnUrl("data:text/html,<h1>hi</h1>")).toBe("/");
    });

    it("uses custom fallback for rejected URLs", () => {
      expect(sanitizeReturnUrl("//evil.com", "/safe")).toBe("/safe");
    });
  });
});
