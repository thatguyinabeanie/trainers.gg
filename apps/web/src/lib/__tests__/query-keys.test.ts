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

    it("returns messages key scoped to matchId", () => {
      expect(queryKeys.match.messages(42)).toEqual(["match-messages", 42]);
    });

    it("returns messages key with undefined matchId", () => {
      expect(queryKeys.match.messages(undefined)).toEqual([
        "match-messages",
        undefined,
      ]);
    });

    it("returns games key scoped to matchId", () => {
      expect(queryKeys.match.games(99)).toEqual(["match-games", 99]);
    });

    it("returns games key with undefined matchId", () => {
      expect(queryKeys.match.games(undefined)).toEqual([
        "match-games",
        undefined,
      ]);
    });

    it("messages and games keys for the same matchId are distinct", () => {
      const msgs = queryKeys.match.messages(5);
      const games = queryKeys.match.games(5);
      expect(msgs).not.toEqual(games);
    });
  });

  describe("notifications", () => {
    it("returns all notifications key scoped to userId", () => {
      expect(queryKeys.notifications.all("user-abc")).toEqual([
        "notifications",
        "user-abc",
      ]);
    });

    it("returns all notifications key with undefined userId", () => {
      expect(queryKeys.notifications.all(undefined)).toEqual([
        "notifications",
        undefined,
      ]);
    });

    it("returns recent notifications key as a narrowing of all", () => {
      expect(queryKeys.notifications.recent("user-abc")).toEqual([
        "notifications",
        "user-abc",
        "recent",
      ]);
    });

    it("recent key starts with the same prefix as all key", () => {
      const all = queryKeys.notifications.all("user-abc");
      const recent = queryKeys.notifications.recent("user-abc");
      expect(recent.slice(0, all.length)).toEqual([...all]);
    });
  });

  describe("me", () => {
    it("returns broadest me key", () => {
      expect(queryKeys.me.all).toEqual(["me"]);
    });

    it("returns profile key", () => {
      expect(queryKeys.me.profile()).toEqual(["me", "profile"]);
    });

    it("returns communities key", () => {
      expect(queryKeys.me.communities()).toEqual(["me", "communities"]);
    });

    it("returns invitations key", () => {
      expect(queryKeys.me.invitations()).toEqual(["me", "invitations"]);
    });

    it("returns invitationsSent key scoped to tournamentId", () => {
      expect(queryKeys.me.invitationsSent(7)).toEqual([
        "me",
        "invitations",
        "sent",
        7,
      ]);
    });

    it("returns invitationsSent key with undefined tournamentId", () => {
      expect(queryKeys.me.invitationsSent(undefined)).toEqual([
        "me",
        "invitations",
        "sent",
        undefined,
      ]);
    });

    it("invitationsSent key is narrower than invitations key", () => {
      const inv = queryKeys.me.invitations();
      const sent = queryKeys.me.invitationsSent(7);
      expect(sent.slice(0, inv.length)).toEqual([...inv]);
    });

    it("returns tournamentHistory key", () => {
      expect(queryKeys.me.tournamentHistory()).toEqual([
        "me",
        "tournament-history",
      ]);
    });

    it("returns dashboard key scoped to profileId", () => {
      expect(queryKeys.me.dashboard(3)).toEqual(["me", "dashboard", 3]);
    });

    it("returns dashboard key with undefined profileId", () => {
      expect(queryKeys.me.dashboard(undefined)).toEqual([
        "me",
        "dashboard",
        undefined,
      ]);
    });

    it("returns activeMatch key scoped to profileId", () => {
      expect(queryKeys.me.activeMatch(3)).toEqual(["me", "active-match", 3]);
    });

    it("returns activeMatch key with undefined profileId", () => {
      expect(queryKeys.me.activeMatch(undefined)).toEqual([
        "me",
        "active-match",
        undefined,
      ]);
    });

    it("dashboard and activeMatch keys for the same profileId are distinct", () => {
      expect(queryKeys.me.dashboard(1)).not.toEqual(queryKeys.me.activeMatch(1));
    });
  });

  describe("user", () => {
    it("returns broadest user key scoped to userId", () => {
      expect(queryKeys.user.all("user-xyz")).toEqual(["user", "user-xyz"]);
    });

    it("returns blueskyStatus key scoped to userId", () => {
      expect(queryKeys.user.blueskyStatus("user-xyz")).toEqual([
        "bluesky-status",
        "user-xyz",
      ]);
    });

    it("returns blueskyStatus key with null userId", () => {
      expect(queryKeys.user.blueskyStatus(null)).toEqual([
        "bluesky-status",
        null,
      ]);
    });

    it("returns blueskyStatus key with undefined userId", () => {
      expect(queryKeys.user.blueskyStatus(undefined)).toEqual([
        "bluesky-status",
        undefined,
      ]);
    });

    it("returns discordDmPreferencesCount key scoped to userId", () => {
      expect(queryKeys.user.discordDmPreferencesCount("user-xyz")).toEqual([
        "discord-dm-preferences-count",
        "user-xyz",
      ]);
    });

    it("returns discordDmPreferencesCount key with null userId", () => {
      expect(queryKeys.user.discordDmPreferencesCount(null)).toEqual([
        "discord-dm-preferences-count",
        null,
      ]);
    });

    it("blueskyStatus and discordDmPreferencesCount keys for the same userId are distinct", () => {
      expect(queryKeys.user.blueskyStatus("u1")).not.toEqual(
        queryKeys.user.discordDmPreferencesCount("u1")
      );
    });
  });
});
