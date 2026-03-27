import { CacheTags } from "../cache";

describe("CacheTags", () => {
  it("returns static tournament list tag", () => {
    expect(CacheTags.TOURNAMENTS_LIST).toBe("tournaments-list");
  });

  it("returns static communities list tag", () => {
    expect(CacheTags.COMMUNITIES_LIST).toBe("communities-list");
  });

  it("returns static players directory tag", () => {
    expect(CacheTags.PLAYERS_DIRECTORY).toBe("players-directory");
  });

  it("generates tournament tag from string slug", () => {
    expect(CacheTags.tournament("my-tournament")).toBe(
      "tournament:my-tournament"
    );
  });

  it("generates tournament tag from numeric id", () => {
    expect(CacheTags.tournament(42)).toBe("tournament:42");
  });

  it("generates community tag from string slug", () => {
    expect(CacheTags.community("pallet-town")).toBe("community:pallet-town");
  });

  it("generates community tag from numeric id", () => {
    expect(CacheTags.community(7)).toBe("community:7");
  });

  it("generates tournament teams tag from string slug", () => {
    expect(CacheTags.tournamentTeams("my-tournament")).toBe(
      "tournament-teams:my-tournament"
    );
  });

  it("generates tournament teams tag from numeric id", () => {
    expect(CacheTags.tournamentTeams(99)).toBe("tournament-teams:99");
  });

  it("generates player tag from handle", () => {
    expect(CacheTags.player("ash_ketchum")).toBe("player:ash_ketchum");
  });

  describe("deprecated aliases", () => {
    it("ORGANIZATIONS_LIST alias resolves to communities-list", () => {
      expect(CacheTags.ORGANIZATIONS_LIST).toBe("communities-list");
    });

    it("organization() alias resolves to community: prefix", () => {
      expect(CacheTags.organization("pallet-town")).toBe(
        "community:pallet-town"
      );
    });

    it("ORG_REQUESTS_LIST alias resolves to community-requests-list", () => {
      expect(CacheTags.ORG_REQUESTS_LIST).toBe("community-requests-list");
    });
  });
});
