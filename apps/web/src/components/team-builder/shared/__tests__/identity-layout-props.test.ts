import { describe, it, expect } from "@jest/globals";

import { filterCurrentTeam } from "../identity-layout-props";

describe("filterCurrentTeam", () => {
  it("returns empty array for undefined input", () => {
    expect(filterCurrentTeam(undefined)).toEqual([]);
  });

  it("returns empty array for empty array input", () => {
    expect(filterCurrentTeam([])).toEqual([]);
  });

  it("filters out null species", () => {
    const input = [{ species: "Pikachu" }, { species: null }];
    expect(filterCurrentTeam(input)).toEqual([{ species: "Pikachu" }]);
  });

  it("filters out empty string species", () => {
    const input = [{ species: "" }, { species: "Charizard" }];
    expect(filterCurrentTeam(input)).toEqual([{ species: "Charizard" }]);
  });

  it("keeps all valid species", () => {
    const input = [
      { species: "Bulbasaur" },
      { species: "Squirtle" },
      { species: "Charmander" },
    ];
    expect(filterCurrentTeam(input)).toEqual(input);
  });

  it("handles mixed valid, null, and empty species", () => {
    const input = [
      { species: "Mewtwo" },
      { species: null },
      { species: "" },
      { species: "Mew" },
      { species: null },
    ];
    expect(filterCurrentTeam(input)).toEqual([
      { species: "Mewtwo" },
      { species: "Mew" },
    ]);
  });
});
