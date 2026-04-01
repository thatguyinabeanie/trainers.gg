import { describe, it, expect } from "@jest/globals";
import { getActionItems } from "../whats-next";
import type { DashboardTournament } from "@/types/dashboard";

function buildTournament(
  overrides: Partial<DashboardTournament> = {}
): DashboardTournament {
  return {
    id: 1,
    name: "Test Tournament",
    startDate: Date.now() + 7 * 24 * 3_600_000, // 7 days from now
    status: "upcoming",
    hasTeam: false,
    ...overrides,
  };
}

describe("getActionItems", () => {
  describe("idle mode", () => {
    it("returns discovery actions when no tournaments", () => {
      const actions = getActionItems("idle", []);
      expect(actions).toHaveLength(2);
      expect(actions.every((a) => a.variant === "discovery")).toBe(true);
    });

    it("includes browse-tournaments and create-team", () => {
      const actions = getActionItems("idle", []);
      const ids = actions.map((a) => a.id);
      expect(ids).toContain("browse-tournaments");
      expect(ids).toContain("create-team");
    });
  });

  describe("pre-tournament mode", () => {
    it("shows submit-teams when tournaments need teams", () => {
      const tournaments = [buildTournament({ hasTeam: false })];
      const actions = getActionItems("pre-tournament", tournaments);
      expect(actions.some((a) => a.id === "submit-teams")).toBe(true);
    });

    it("shows urgent-teams when tournament starts within 24h", () => {
      const tournaments = [
        buildTournament({
          hasTeam: false,
          startDate: Date.now() + 12 * 3_600_000, // 12 hours from now
        }),
      ];
      const actions = getActionItems("pre-tournament", tournaments);
      expect(actions.some((a) => a.id === "urgent-teams")).toBe(true);
      expect(actions.find((a) => a.id === "urgent-teams")?.variant).toBe(
        "urgent"
      );
    });

    it("shows checkin when tournaments have teams and are upcoming", () => {
      const tournaments = [
        buildTournament({ hasTeam: true, status: "upcoming" }),
      ];
      const actions = getActionItems("pre-tournament", tournaments);
      expect(actions.some((a) => a.id === "checkin")).toBe(true);
    });

    it("returns empty when all tournaments have teams and are not upcoming", () => {
      const tournaments = [
        buildTournament({ hasTeam: true, status: "active" }),
      ];
      const actions = getActionItems("pre-tournament", tournaments);
      expect(actions).toHaveLength(0);
    });

    it("counts multiple tournaments needing teams", () => {
      const tournaments = [
        buildTournament({ id: 1, hasTeam: false }),
        buildTournament({ id: 2, hasTeam: false }),
        buildTournament({ id: 3, hasTeam: false }),
      ];
      const actions = getActionItems("pre-tournament", tournaments);
      const teamAction = actions.find((a) => a.id === "submit-teams");
      expect(teamAction?.count).toBe(3);
    });
  });

  describe("active-competition mode", () => {
    it("shows team submissions when tournaments need teams", () => {
      const tournaments = [buildTournament({ hasTeam: false })];
      const actions = getActionItems("active-competition", tournaments);
      expect(actions.some((a) => a.id === "submit-teams")).toBe(true);
      expect(actions.find((a) => a.id === "submit-teams")?.variant).toBe(
        "important"
      );
    });

    it("returns empty when all tournaments have teams", () => {
      const tournaments = [buildTournament({ hasTeam: true })];
      const actions = getActionItems("active-competition", tournaments);
      expect(actions).toHaveLength(0);
    });
  });

  describe("post-tournament mode", () => {
    it("shows find-tournaments when no tournaments", () => {
      const actions = getActionItems("post-tournament", []);
      expect(actions.some((a) => a.id === "find-tournaments")).toBe(true);
      expect(actions[0]?.variant).toBe("discovery");
    });

    it("shows more-tournaments when fewer than 3 tournaments", () => {
      const tournaments = [buildTournament(), buildTournament({ id: 2 })];
      const actions = getActionItems("post-tournament", tournaments);
      expect(actions.some((a) => a.id === "more-tournaments")).toBe(true);
    });

    it("returns empty when 3 or more tournaments", () => {
      const tournaments = [
        buildTournament({ id: 1 }),
        buildTournament({ id: 2 }),
        buildTournament({ id: 3 }),
      ];
      const actions = getActionItems("post-tournament", tournaments);
      expect(actions).toHaveLength(0);
    });
  });
});
