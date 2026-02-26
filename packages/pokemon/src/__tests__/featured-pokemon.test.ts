import { FEATURED_POKEMON } from "../featured-pokemon";
import { getAllSpeciesNames } from "../validation";

describe("FEATURED_POKEMON", () => {
  it("is a non-empty array of strings", () => {
    expect(FEATURED_POKEMON.length).toBeGreaterThan(0);
    for (const name of FEATURED_POKEMON) {
      expect(typeof name).toBe("string");
    }
  });

  it("contains only valid species names", () => {
    const allSpecies = getAllSpeciesNames();
    for (const name of FEATURED_POKEMON) {
      expect(allSpecies).toContain(name);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(FEATURED_POKEMON).size).toBe(FEATURED_POKEMON.length);
  });

  it.each(["Pikachu", "Charizard", "Mewtwo", "Eevee"])(
    "includes %s",
    (pokemon) => {
      expect(FEATURED_POKEMON).toContain(pokemon);
    }
  );
});
