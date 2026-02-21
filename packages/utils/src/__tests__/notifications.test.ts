import { isMatchNotification } from "../notifications";

describe("isMatchNotification", () => {
  it.each([
    ["match_ready", true],
    ["tournament_round", true],
  ])('returns true for "%s"', (type, expected) => {
    expect(isMatchNotification(type)).toBe(expected);
  });

  it.each([
    ["tournament_started", false],
    ["friend_request", false],
    ["system_announcement", false],
    ["", false],
  ])('returns false for "%s"', (type, expected) => {
    expect(isMatchNotification(type)).toBe(expected);
  });

  it("returns false for null", () => {
    expect(isMatchNotification(null)).toBe(false);
  });
});
