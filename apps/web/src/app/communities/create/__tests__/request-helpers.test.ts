/**
 * @jest-environment node
 */

import { isCooldownExpired, getCooldownEndDate } from "../request-status";
import { generateSlug } from "@trainers/utils";

describe("generateSlug", () => {
  it.each([
    { input: "My Organization", expected: "my-organization" },
    { input: "  Spaced Out  ", expected: "spaced-out" },
    { input: "Special!@#Chars", expected: "specialchars" },
    { input: "Under_Score_Name", expected: "under-score-name" },
    { input: "Multiple   Spaces", expected: "multiple-spaces" },
    { input: "trailing-dash-", expected: "trailing-dash" },
    { input: "-leading-dash", expected: "leading-dash" },
    { input: "UPPERCASE", expected: "uppercase" },
    { input: "mixed_Under Score-Dash", expected: "mixed-under-score-dash" },
  ])("converts '$input' to '$expected'", ({ input, expected }) => {
    expect(generateSlug(input)).toBe(expected);
  });
});

describe("isCooldownExpired", () => {
  it("returns true when reviewedAt is null", () => {
    expect(isCooldownExpired(null)).toBe(true);
  });

  it("returns false when within 7-day cooldown", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(isCooldownExpired(twoDaysAgo.toISOString())).toBe(false);
  });

  it("returns true when cooldown has passed", () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    expect(isCooldownExpired(tenDaysAgo.toISOString())).toBe(true);
  });

  it("returns true when exactly 7 days have passed", () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    expect(isCooldownExpired(sevenDaysAgo.toISOString())).toBe(true);
  });
});

describe("getCooldownEndDate", () => {
  it("returns a formatted date 7 days after reviewedAt", () => {
    // Use a date and verify it contains expected month/year
    const result = getCooldownEndDate("2026-01-15T12:00:00Z");
    expect(result).toContain("Jan");
    expect(result).toContain("2026");
    expect(result).toMatch(/Jan 2[12], 2026/);
  });

  it("handles month boundary correctly", () => {
    const result = getCooldownEndDate("2026-01-28T12:00:00Z");
    expect(result).toContain("Feb");
    expect(result).toContain("2026");
  });
});
