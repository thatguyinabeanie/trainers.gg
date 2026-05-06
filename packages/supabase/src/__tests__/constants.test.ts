import {
  INVITATION_EXPIRY_DAYS,
  INVITATION_EXPIRY_MS,
  getInvitationExpiryDate,
} from "../constants";

// =============================================================================
// COOKIE_DOMAIN tests — use dynamic require to test env var behavior
// =============================================================================

describe("COOKIE_DOMAIN", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
    jest.resetModules();
  });

  it("returns '.trainers.gg' when NEXT_PUBLIC_SITE_URL contains trainers.gg", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://trainers.gg";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { COOKIE_DOMAIN } = require("../constants");
    expect(COOKIE_DOMAIN).toBe(".trainers.gg");
  });

  it("returns '.trainers.gg' for subdomain URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://builder.trainers.gg";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { COOKIE_DOMAIN } = require("../constants");
    expect(COOKIE_DOMAIN).toBe(".trainers.gg");
  });

  it("returns undefined for localhost", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { COOKIE_DOMAIN } = require("../constants");
    expect(COOKIE_DOMAIN).toBeUndefined();
  });

  it("returns undefined when NEXT_PUBLIC_SITE_URL is not set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { COOKIE_DOMAIN } = require("../constants");
    expect(COOKIE_DOMAIN).toBeUndefined();
  });

  it("returns undefined for Vercel preview URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL =
      "https://trainers-gg-git-fix-branch.vercel.app";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { COOKIE_DOMAIN } = require("../constants");
    expect(COOKIE_DOMAIN).toBeUndefined();
  });
});

// =============================================================================
// Invitation constants tests
// =============================================================================

describe("INVITATION_EXPIRY_DAYS", () => {
  it("equals 7", () => {
    expect(INVITATION_EXPIRY_DAYS).toBe(7);
  });
});

describe("INVITATION_EXPIRY_MS", () => {
  it("equals 7 days in milliseconds", () => {
    expect(INVITATION_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(INVITATION_EXPIRY_MS).toBe(604_800_000);
  });
});

describe("getInvitationExpiryDate", () => {
  it("returns an ISO date string", () => {
    const result = getInvitationExpiryDate();
    // Should be parseable as a date
    expect(new Date(result).toISOString()).toBe(result);
  });

  it("returns a date approximately 7 days in the future", () => {
    const before = Date.now();
    const result = getInvitationExpiryDate();
    const after = Date.now();

    const resultTime = new Date(result).getTime();
    // The result should be within the window: before + 7 days <= result <= after + 7 days
    expect(resultTime).toBeGreaterThanOrEqual(before + INVITATION_EXPIRY_MS);
    expect(resultTime).toBeLessThanOrEqual(after + INVITATION_EXPIRY_MS);
  });
});
