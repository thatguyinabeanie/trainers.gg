import {
  INVITATION_EXPIRY_DAYS,
  INVITATION_EXPIRY_MS,
  getInvitationExpiryDate,
} from "../constants";

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
