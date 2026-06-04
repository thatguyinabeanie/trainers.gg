/**
 * @jest-environment node
 */

import type { RK9Pokemon } from "../types";
import { normalizeSpecies, collectUniqueSpecies } from "../normalize";

describe("normalizeSpecies", () => {
  it("normalizes basic species names", () => {
    expect(normalizeSpecies("Roaring Moon")).toBe("roaringmoon");
    expect(normalizeSpecies("Flutter Mane")).toBe("fluttermane");
    expect(normalizeSpecies("Pikachu")).toBe("pikachu");
  });

  it("handles bracket notation for forms", () => {
    expect(normalizeSpecies("Ogerpon [Hearthflame Mask]")).toBe("ogerpon-hearthflame");
    expect(normalizeSpecies("Urshifu [Rapid Strike Style]")).toBe("urshifu-rapid-strike");
  });

  it("skips default forms", () => {
    expect(normalizeSpecies("Landorus [Incarnate Forme]")).toBe("landorus");
    expect(normalizeSpecies("Toxtricity [Male]")).toBe("toxtricity");
  });

  it("handles therian forms", () => {
    expect(normalizeSpecies("Landorus [Therian Forme]")).toBe("landorus-therian");
  });

  it("handles regional variants", () => {
    expect(normalizeSpecies("Ninetales [Alolan Form]")).toBe("ninetales-alola");
    expect(normalizeSpecies("Weezing [Galarian Form]")).toBe("weezing-galar");
  });

  it.each([
    ["Ogerpon [Wellspring Mask]", "ogerpon-wellspring"],
    ["Ogerpon [Cornerstone Mask]", "ogerpon-cornerstone"],
    ["Ogerpon [Teal Mask]", "ogerpon"],
    ["Basculegion [Female]", "basculegion-f"],
  ])('normalizeSpecies("%s") → "%s"', (input, expected) => {
    expect(normalizeSpecies(input)).toBe(expected);
  });

  it("handles pathological input without hanging", () => {
    const longSpaces = "A" + " ".repeat(1000);
    expect(normalizeSpecies(longSpaces)).toBe("a");
    expect(normalizeSpecies(longSpaces + "[B]")).toBe("a-b");
  });
});

describe("collectUniqueSpecies", () => {
  it("collects unique species from teams", () => {
    const teams: Record<string, RK9Pokemon[]> = {
      entry1: [
        { speciesRaw: "Pikachu", ability: "Static", heldItem: "", teraType: null, statAlignment: null, moves: [] },
        { speciesRaw: "Charizard", ability: "Blaze", heldItem: "", teraType: null, statAlignment: null, moves: [] },
      ],
      entry2: [
        { speciesRaw: "Pikachu", ability: "Lightning Rod", heldItem: "", teraType: null, statAlignment: null, moves: [] },
      ],
    };

    const result = collectUniqueSpecies(teams);

    expect(result.size).toBe(2);
    expect(result.get("Pikachu")).toBe("pikachu");
    expect(result.get("Charizard")).toBe("charizard");
  });

  it("returns empty map for empty input", () => {
    expect(collectUniqueSpecies({})).toEqual(new Map());
  });
});
