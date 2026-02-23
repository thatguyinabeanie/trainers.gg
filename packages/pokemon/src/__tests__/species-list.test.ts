import { getAllSpeciesNames } from "../validation";

describe("getAllSpeciesNames", () => {
  it("returns an array of strings", () => {
    const names = getAllSpeciesNames();
    expect(Array.isArray(names)).toBe(true);
    for (const name of names) {
      expect(typeof name).toBe("string");
    }
  });

  it.each(["Pikachu", "Charizard", "Mewtwo", "Garchomp"])(
    "includes %s",
    (pokemon) => {
      const names = getAllSpeciesNames();
      expect(names).toContain(pokemon);
    }
  );

  it("does not include empty strings", () => {
    const names = getAllSpeciesNames();
    expect(names).not.toContain("");
  });

  it("returns a reasonable number of species (800+)", () => {
    const names = getAllSpeciesNames();
    expect(names.length).toBeGreaterThan(800);
  });
});
