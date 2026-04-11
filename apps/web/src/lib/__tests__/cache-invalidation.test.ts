// --- Mock next/cache ---
jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

import { updateTag } from "next/cache";

import { type createClient } from "@/lib/supabase/server";
import { CacheTags } from "../cache";
import {
  invalidateCommunityPageCaches,
  invalidateTournamentCaches,
  invalidateTournamentListCaches,
  invalidateTournamentAndCommunityCaches,
  invalidatePlayerProfileCaches,
  invalidatePlayerDirectoryCaches,
  invalidatePlayerRankingCaches,
  invalidateTournamentWithTeamCaches,
  invalidateCommunityRequestCaches,
  invalidateDashboardCaches,
  invalidateTeamCaches,
} from "../cache-invalidation";

const mockUpdateTag = updateTag as jest.MockedFunction<typeof updateTag>;

describe("cache-invalidation helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Community ───────────────────────────────────────────────────────────

  describe("invalidateCommunityPageCaches", () => {
    it("always invalidates COMMUNITIES_LIST", () => {
      invalidateCommunityPageCaches();
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.COMMUNITIES_LIST);
    });

    it("invalidates community slug tag when slug is provided", () => {
      invalidateCommunityPageCaches("pallet-town");
      expect(mockUpdateTag).toHaveBeenCalledWith(
        CacheTags.community("pallet-town")
      );
    });

    it("invalidates community id tag when id is provided", () => {
      invalidateCommunityPageCaches(undefined, 7);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.community(7));
    });

    it("invalidates both slug and id tags when both are provided", () => {
      invalidateCommunityPageCaches("pallet-town", 7);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.COMMUNITIES_LIST);
      expect(mockUpdateTag).toHaveBeenCalledWith(
        CacheTags.community("pallet-town")
      );
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.community(7));
    });

    it("does not invalidate slug or id tags when neither is provided", () => {
      invalidateCommunityPageCaches();
      expect(mockUpdateTag).toHaveBeenCalledTimes(1);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.COMMUNITIES_LIST);
    });
  });

  // ── Tournament ──────────────────────────────────────────────────────────

  describe("invalidateTournamentCaches", () => {
    it("invalidates only the specific tournament tag", () => {
      invalidateTournamentCaches(42);
      expect(mockUpdateTag).toHaveBeenCalledTimes(1);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.tournament(42));
    });
  });

  describe("invalidateTournamentListCaches", () => {
    it("invalidates TOURNAMENTS_LIST and the specific tournament tag", () => {
      invalidateTournamentListCaches(42);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.TOURNAMENTS_LIST);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.tournament(42));
    });
  });

  describe("invalidateTournamentAndCommunityCaches", () => {
    it("invalidates tournament list + community caches via DB lookup", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { communities: { slug: "pallet-town", id: 5 } },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSupabase = { from: mockFrom } as unknown as Awaited<
        ReturnType<typeof createClient>
      >;

      await invalidateTournamentAndCommunityCaches(mockSupabase, 42);

      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.TOURNAMENTS_LIST);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.tournament(42));
      expect(mockUpdateTag).toHaveBeenCalledWith(
        CacheTags.community("pallet-town")
      );
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.community(5));
    });

    it("throws when DB query fails", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSupabase = { from: mockFrom } as unknown as Awaited<
        ReturnType<typeof createClient>
      >;

      await expect(
        invalidateTournamentAndCommunityCaches(mockSupabase, 999)
      ).rejects.toEqual({ message: "Not found", code: "PGRST116" });
    });

    it("does not invalidate community caches when community is not linked", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { communities: null },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      const mockSupabase = { from: mockFrom } as unknown as Awaited<
        ReturnType<typeof createClient>
      >;

      await invalidateTournamentAndCommunityCaches(mockSupabase, 42);

      // Only tournament-related tags, no community tags
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.TOURNAMENTS_LIST);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.tournament(42));
      expect(mockUpdateTag).toHaveBeenCalledTimes(2);
    });
  });

  // ── Player ──────────────────────────────────────────────────────────────

  describe("invalidatePlayerProfileCaches", () => {
    it("invalidates the player profile tag", () => {
      invalidatePlayerProfileCaches("ash_ketchum");
      expect(mockUpdateTag).toHaveBeenCalledWith(
        CacheTags.player("ash_ketchum")
      );
    });
  });

  describe("invalidatePlayerDirectoryCaches", () => {
    it("invalidates player, directory, and new players tags", () => {
      invalidatePlayerDirectoryCaches("ash_ketchum");
      expect(mockUpdateTag).toHaveBeenCalledWith(
        CacheTags.player("ash_ketchum")
      );
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.PLAYERS_DIRECTORY);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.PLAYERS_NEW);
    });
  });

  describe("invalidatePlayerRankingCaches", () => {
    it("invalidates leaderboard and recent players tags", () => {
      invalidatePlayerRankingCaches();
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.PLAYERS_LEADERBOARD);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.PLAYERS_RECENT);
    });
  });

  // ── Tournament Teams ────────────────────────────────────────────────────

  describe("invalidateTournamentWithTeamCaches", () => {
    it("invalidates tournament and tournament teams tags", () => {
      invalidateTournamentWithTeamCaches(42);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.tournament(42));
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.tournamentTeams(42));
    });
  });

  // ── Community Requests ──────────────────────────────────────────────────

  describe("invalidateCommunityRequestCaches", () => {
    it("invalidates community requests list tag", () => {
      invalidateCommunityRequestCaches();
      expect(mockUpdateTag).toHaveBeenCalledWith(
        CacheTags.COMMUNITY_REQUESTS_LIST
      );
    });
  });

  // ── Team ─────────────────────────────────────────────────────────────────

  describe("invalidateTeamCaches", () => {
    it("invalidates the team tag", () => {
      invalidateTeamCaches(99);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.team(99));
    });
  });

  // ── Dashboard ───────────────────────────────────────────────────────────

  describe("invalidateDashboardCaches", () => {
    it("invalidates dashboard stats and ratings tags", () => {
      invalidateDashboardCaches();
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.DASHBOARD_STATS);
      expect(mockUpdateTag).toHaveBeenCalledWith(CacheTags.DASHBOARD_RATINGS);
    });

    it("calls updateTag exactly twice", () => {
      invalidateDashboardCaches();
      expect(mockUpdateTag).toHaveBeenCalledTimes(2);
    });
  });
});
