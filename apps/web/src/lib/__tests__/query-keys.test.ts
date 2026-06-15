import { queryKeys } from "../query-keys";

describe("queryKeys", () => {
  describe("admin", () => {
    it("returns broadest admin key", () => {
      expect(queryKeys.admin.all).toEqual(["admin"]);
    });

    it.each([
      ["user-123", ["admin-user-detail", "user-123"]],
      [null, ["admin-user-detail", null]],
    ])("returns user detail key for userId=%s", (userId, expected) => {
      expect(queryKeys.admin.userDetail(userId as string | null)).toEqual(
        expected
      );
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
      expect(
        queryKeys.match.postMatchSummary(undefined, undefined, null)
      ).toEqual(["post-match-summary", undefined, undefined, null]);
    });

    it.each([
      ["messages", 42, ["match-messages", 42]],
      ["messages", undefined, ["match-messages", undefined]],
      ["games", 99, ["match-games", 99]],
      ["games", undefined, ["match-games", undefined]],
    ] as const)("returns %s key for matchId=%s", (kind, matchId, expected) => {
      expect(queryKeys.match[kind](matchId as number | undefined)).toEqual(
        expected
      );
    });

    it("messages and games keys for the same matchId are distinct", () => {
      const msgs = queryKeys.match.messages(5);
      const games = queryKeys.match.games(5);
      expect(msgs).not.toEqual(games);
    });
  });

  describe("notifications", () => {
    it.each([
      ["user-abc", ["notifications", "user-abc"]],
      [undefined, ["notifications", undefined]],
    ] as const)(
      "returns all notifications key for userId=%s",
      (userId, expected) => {
        expect(
          queryKeys.notifications.all(userId as string | undefined)
        ).toEqual(expected);
      }
    );

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

    it("returns list key scoped to userId", () => {
      expect(queryKeys.notifications.list("user-123", "all", 0, 0)).toEqual([
        "notifications",
        "user-123",
        "list",
        "all",
        0,
        0,
      ]);
    });

    it("returns count key scoped to userId", () => {
      expect(queryKeys.notifications.count("user-123", "unread", 1)).toEqual([
        "notifications",
        "user-123",
        "count",
        "unread",
        1,
      ]);
    });

    it("returns unreadCount key scoped to userId", () => {
      expect(queryKeys.notifications.unreadCount("user-123", 2)).toEqual([
        "notifications",
        "user-123",
        "unread-count",
        2,
      ]);
    });

    it("list/count/unreadCount keys for the same userId start with the all key prefix", () => {
      const all = queryKeys.notifications.all("user-123");
      const list = queryKeys.notifications.list("user-123", "all", 0, 0);
      const count = queryKeys.notifications.count("user-123", "all", 0);
      const unreadCount = queryKeys.notifications.unreadCount("user-123", 0);
      expect(list.slice(0, all.length)).toEqual([...all]);
      expect(count.slice(0, all.length)).toEqual([...all]);
      expect(unreadCount.slice(0, all.length)).toEqual([...all]);
    });

    it("list and count keys for the same userId and tab are distinct", () => {
      expect(queryKeys.notifications.list("user-123", "all", 0, 0)).not.toEqual(
        queryKeys.notifications.count("user-123", "all", 0)
      );
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

    it.each([
      [7, ["me", "invitations", "sent", 7]],
      [undefined, ["me", "invitations", "sent", undefined]],
    ] as const)(
      "returns invitationsSent key for tournamentId=%s",
      (tournamentId, expected) => {
        expect(
          queryKeys.me.invitationsSent(tournamentId as number | undefined)
        ).toEqual(expected);
      }
    );

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

    it.each([
      ["dashboard", 3, ["me", "dashboard", 3]],
      ["dashboard", undefined, ["me", "dashboard", undefined]],
      ["activeMatch", 3, ["me", "active-match", 3]],
      ["activeMatch", undefined, ["me", "active-match", undefined]],
    ] as const)(
      "returns %s key for profileId=%s",
      (method, profileId, expected) => {
        expect(queryKeys.me[method](profileId as number | undefined)).toEqual(
          expected
        );
      }
    );

    it("dashboard and activeMatch keys for the same profileId are distinct", () => {
      expect(queryKeys.me.dashboard(1)).not.toEqual(
        queryKeys.me.activeMatch(1)
      );
    });

    it("returns organizationRequest key scoped to userId", () => {
      expect(queryKeys.me.organizationRequest("user-123")).toEqual([
        "me",
        "user-123",
        "organization-request",
      ]);
    });

    it("organizationRequest keys for different userIds are distinct", () => {
      expect(queryKeys.me.organizationRequest("user-1")).not.toEqual(
        queryKeys.me.organizationRequest("user-2")
      );
    });
  });

  describe("user", () => {
    const userId = "user-xyz";

    it("returns broadest user key scoped to userId", () => {
      expect(queryKeys.user.all(userId)).toEqual(["user", userId]);
    });

    // blueskyStatus — nests under ["user", userId, ...]
    it.each([
      [userId, ["user", userId, "bluesky-status"]],
      [null, ["user", null, "bluesky-status"]],
      [undefined, ["user", undefined, "bluesky-status"]],
    ] as const)("returns blueskyStatus key for userId=%s", (id, expected) => {
      expect(
        queryKeys.user.blueskyStatus(id as string | null | undefined)
      ).toEqual(expected);
    });

    // discordDmPreferencesCount — nests under ["user", userId, ...]
    it.each([
      [userId, ["user", userId, "discord-dm-preferences-count"]],
      [null, ["user", null, "discord-dm-preferences-count"]],
      [undefined, ["user", undefined, "discord-dm-preferences-count"]],
    ] as const)(
      "returns discordDmPreferencesCount key for userId=%s",
      (id, expected) => {
        expect(
          queryKeys.user.discordDmPreferencesCount(
            id as string | null | undefined
          )
        ).toEqual(expected);
      }
    );

    // Hierarchy lock: both sub-keys must start with ["user", userId]
    it.each([
      ["blueskyStatus", queryKeys.user.blueskyStatus(userId)],
      [
        "discordDmPreferencesCount",
        queryKeys.user.discordDmPreferencesCount(userId),
      ],
    ] as const)("%s key starts with user.all() prefix", (_label, key) => {
      const all = queryKeys.user.all(userId);
      expect(key.slice(0, all.length)).toEqual([...all]);
    });

    it("blueskyStatus and discordDmPreferencesCount keys for the same userId are distinct", () => {
      expect(queryKeys.user.blueskyStatus("u1")).not.toEqual(
        queryKeys.user.discordDmPreferencesCount("u1")
      );
    });
  });
});
