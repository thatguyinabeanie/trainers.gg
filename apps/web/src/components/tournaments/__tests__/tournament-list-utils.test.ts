import { describe, it, expect } from "@jest/globals";

import { getWinnerHref } from "../tournament-list-utils";

// Minimal winner factory
function makeWinner(
  overrides: Partial<{
    id: number;
    username: string;
    isPublic: boolean;
    isMainAlt: boolean;
    parentUsername: string;
  }> = {}
) {
  return {
    id: 1,
    username: "default_user",
    isPublic: true,
    isMainAlt: false,
    parentUsername: "",
    ...overrides,
  };
}

describe("getWinnerHref", () => {
  it("returns /@username for main alt", () => {
    const winner = makeWinner({ isMainAlt: true, username: "champion" });
    expect(getWinnerHref(winner)).toBe("/@champion");
  });

  it("returns /@parentUsername/alts/altUsername for public non-main alt", () => {
    const winner = makeWinner({
      isMainAlt: false,
      isPublic: true,
      parentUsername: "parent",
      username: "alt_name",
    });
    expect(getWinnerHref(winner)).toBe("/@parent/alts/alt_name");
  });

  it("returns /alts/altUsername for private alt", () => {
    const winner = makeWinner({
      isMainAlt: false,
      isPublic: false,
      username: "private_alt",
    });
    expect(getWinnerHref(winner)).toBe("/alts/private_alt");
  });

  it("returns null when no link data available", () => {
    const winner = makeWinner({
      isMainAlt: false,
      isPublic: true,
      parentUsername: "",
    });
    expect(getWinnerHref(winner)).toBeNull();
  });
});
