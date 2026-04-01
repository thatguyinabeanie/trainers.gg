import { describe, it, expect } from "@jest/globals";
import { formatAge, isActionType, getTypeIcon } from "../notification-helpers";

describe("getTypeIcon", () => {
  it.each([
    ["match_ready", "⚔️"],
    ["match_result", "⚔️"],
    ["match_disputed", "⚖️"],
    ["judge_call", "⚖️"],
    ["judge_resolved", "✅"],
    ["tournament_start", "🏆"],
    ["tournament_round", "🏆"],
    ["tournament_complete", "🏆"],
    ["match_no_show", "📋"],
    ["org_request_approved", "✅"],
    ["org_request_rejected", "✅"],
  ] as const)("returns %s icon for %s", (type, expected) => {
    expect(getTypeIcon(type)).toBe(expected);
  });
});

describe("isActionType", () => {
  it.each([
    ["match_ready", true],
    ["judge_call", true],
    ["match_result", false],
    ["tournament_start", false],
    ["tournament_complete", false],
    ["org_request_approved", false],
  ] as const)("returns %s for %s", (type, expected) => {
    expect(isActionType(type)).toBe(expected);
  });
});

describe("formatAge", () => {
  it("formats seconds", () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(formatAge(recent)).toMatch(/\d+s/);
  });

  it("formats minutes", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatAge(fiveMinAgo)).toMatch(/\d+m/);
  });

  it("formats hours", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    expect(formatAge(twoHoursAgo)).toMatch(/\d+h/);
  });

  it("formats days", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 3_600_000
    ).toISOString();
    expect(formatAge(threeDaysAgo)).toMatch(/\d+d/);
  });

  it("formats months", () => {
    const twoMonthsAgo = new Date(
      Date.now() - 65 * 24 * 3_600_000
    ).toISOString();
    expect(formatAge(twoMonthsAgo)).toMatch(/\d+mo/);
  });
});
