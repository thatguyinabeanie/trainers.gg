import { queryKeys } from "../query-keys";

describe("queryKeys", () => {
  describe("admin", () => {
    it("returns broadest admin key", () => {
      expect(queryKeys.admin.all).toEqual(["admin"]);
    });

    it("returns user detail key with userId", () => {
      expect(queryKeys.admin.userDetail("user-123")).toEqual([
        "admin-user-detail",
        "user-123",
      ]);
    });

    it("returns user detail key with null userId", () => {
      expect(queryKeys.admin.userDetail(null)).toEqual([
        "admin-user-detail",
        null,
      ]);
    });
  });

  describe("sudo", () => {
    it("returns all key", () => {
      expect(queryKeys.sudo.all).toEqual(["sudo-status"]);
    });

    it("returns status key", () => {
      expect(queryKeys.sudo.status()).toEqual(["sudo-status"]);
    });
  });

  describe("tournament", () => {
    it("returns broadest tournament key", () => {
      expect(queryKeys.tournament.all).toEqual(["tournament"]);
    });

    it("returns current match banner key", () => {
      expect(queryKeys.tournament.currentMatchBanner(42, "user-1")).toEqual([
        "current-match-banner",
        42,
        "user-1",
      ]);
    });

    it("returns user teams key", () => {
      expect(queryKeys.tournament.userTeams(7)).toEqual([
        "user-teams-for-tournament",
        7,
        null,
      ]);
    });
  });

  describe("match", () => {
    it("returns broadest match key", () => {
      expect(queryKeys.match.all).toEqual(["match"]);
    });

    it("returns post match summary key", () => {
      expect(queryKeys.match.postMatchSummary(1, 2, 3)).toEqual([
        "post-match-summary",
        1,
        2,
        3,
      ]);
    });

    it("handles undefined/null parameters", () => {
      expect(queryKeys.match.postMatchSummary(undefined, undefined, null)).toEqual([
        "post-match-summary",
        undefined,
        undefined,
        null,
      ]);
    });
  });
});
