import { CacheTags } from "../cache";

describe("CacheTags", () => {
  it("returns static tournament list tag", () => {
    expect(CacheTags.TOURNAMENTS_LIST).toBe("tournaments-list");
  });

  it("returns static organizations list tag", () => {
    expect(CacheTags.ORGANIZATIONS_LIST).toBe("organizations-list");
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

  it("generates organization tag from string slug", () => {
    expect(CacheTags.organization("pallet-town")).toBe(
      "organization:pallet-town"
    );
  });

  it("generates organization tag from numeric id", () => {
    expect(CacheTags.organization(7)).toBe("organization:7");
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
});
