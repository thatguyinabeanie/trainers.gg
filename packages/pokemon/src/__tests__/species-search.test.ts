import {
  buildSpeciesSearchIndex,
  searchSpecies,
  type SpeciesSearchEntry,
} from "../species-search";

// Build a gen9 index once for all tests — this is the most common format
const GEN9_FORMAT = "gen9vgc2026regi";

describe("buildSpeciesSearchIndex", () => {
  it("returns a non-empty array for a known gen9 format", () => {
    const index = buildSpeciesSearchIndex(GEN9_FORMAT);
    expect(index.length).toBeGreaterThan(0);
  });

  it("returns a non-empty array for a known gen8 format", () => {
    const index = buildSpeciesSearchIndex("gen8vgc2022");
    expect(index.length).toBeGreaterThan(0);
  });

  it("falls back to gen9 for an unknown format ID and returns results", () => {
    const index = buildSpeciesSearchIndex("nonexistent-format-xyz");
    expect(index.length).toBeGreaterThan(0);
  });

  it("every entry has the expected shape", () => {
    const index = buildSpeciesSearchIndex(GEN9_FORMAT);
    for (const entry of index) {
      expect(typeof entry.species).toBe("string");
      expect(entry.species.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.types)).toBe(true);
      expect(entry.types.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(entry.abilities)).toBe(true);
      expect(entry.abilities.length).toBeGreaterThanOrEqual(1);
      expect(typeof entry.baseStats.hp).toBe("number");
      expect(typeof entry.baseStats.atk).toBe("number");
      expect(typeof entry.baseStats.def).toBe("number");
      expect(typeof entry.baseStats.spa).toBe("number");
      expect(typeof entry.baseStats.spd).toBe("number");
      expect(typeof entry.baseStats.spe).toBe("number");
      expect(typeof entry.bst).toBe("number");
    }
  });

  it("BST is the sum of all six base stats", () => {
    const index = buildSpeciesSearchIndex(GEN9_FORMAT);
    for (const entry of index) {
      const { hp, atk, def, spa, spd, spe } = entry.baseStats;
      expect(entry.bst).toBe(hp + atk + def + spa + spd + spe);
    }
  });

  it("includes Pikachu with correct types and abilities", () => {
    const index = buildSpeciesSearchIndex(GEN9_FORMAT);
    const pikachu = index.find((e) => e.species === "Pikachu");

    expect(pikachu).toBeDefined();
    expect(pikachu!.types).toContain("Electric");
    expect(pikachu!.abilities).toContain("Static");
  });

  it("includes Charizard with correct dual types", () => {
    const index = buildSpeciesSearchIndex(GEN9_FORMAT);
    const charizard = index.find((e) => e.species === "Charizard");

    expect(charizard).toBeDefined();
    expect(charizard!.types).toContain("Fire");
    expect(charizard!.types).toContain("Flying");
    expect(charizard!.types).toHaveLength(2);
  });

  it("includes Incineroar with correct types and Intimidate ability", () => {
    const index = buildSpeciesSearchIndex(GEN9_FORMAT);
    const incineroar = index.find((e) => e.species === "Incineroar");

    expect(incineroar).toBeDefined();
    expect(incineroar!.types).toContain("Fire");
    expect(incineroar!.types).toContain("Dark");
    expect(incineroar!.abilities).toContain("Intimidate");
  });

  it("computes correct BST for Pikachu (35+55+40+50+50+90=320)", () => {
    const index = buildSpeciesSearchIndex(GEN9_FORMAT);
    const pikachu = index.find((e) => e.species === "Pikachu");

    expect(pikachu).toBeDefined();
    // Pikachu: hp=35, atk=55, def=40, spa=50, spd=50, spe=90 → BST=320
    expect(pikachu!.bst).toBe(320);
  });

  it("gen8 index has fewer species than gen9 index", () => {
    const gen9Index = buildSpeciesSearchIndex(GEN9_FORMAT);
    const gen8Index = buildSpeciesSearchIndex("gen8vgc2022");
    // Gen 8 has fewer Pokemon than Gen 9
    expect(gen8Index.length).toBeLessThan(gen9Index.length);
  });
});

describe("searchSpecies", () => {
  // Build once and reuse across search tests
  let index: SpeciesSearchEntry[];

  beforeAll(() => {
    index = buildSpeciesSearchIndex(GEN9_FORMAT);
  });

  it("returns all entries when query is empty", () => {
    const results = searchSpecies(index, "");
    expect(results).toHaveLength(index.length);
  });

  it("returns all entries when query is whitespace-only", () => {
    const results = searchSpecies(index, "   ");
    expect(results).toHaveLength(index.length);
  });

  it("matches species by exact name (case-insensitive)", () => {
    const results = searchSpecies(index, "Pikachu");
    const names = results.map((e) => e.species);
    expect(names).toContain("Pikachu");
  });

  it("matches species by lowercase name", () => {
    const results = searchSpecies(index, "pikachu");
    const names = results.map((e) => e.species);
    expect(names).toContain("Pikachu");
  });

  it("matches species by partial name substring", () => {
    // "char" should match Charizard, Charmander, Charmeleon
    const results = searchSpecies(index, "char");
    const names = results.map((e) => e.species);
    expect(names).toContain("Charizard");
    expect(names).toContain("Charmander");
    expect(names).toContain("Charmeleon");
  });

  it("matches species by ability name substring", () => {
    // "Intimidate" is an ability — should return Incineroar and other Intimidate users
    const results = searchSpecies(index, "Intimidate");
    const species = results.map((e) => e.species);
    expect(species).toContain("Incineroar");
    // All results must have the ability substring match
    for (const entry of results) {
      const hasMatch =
        entry.species.toLowerCase().includes("intimidate") ||
        entry.abilities.some((a) => a.toLowerCase().includes("intimidate")) ||
        entry.types.some((t) => t.toLowerCase().includes("intimidate"));
      expect(hasMatch).toBe(true);
    }
  });

  it("matches species by type name substring", () => {
    // "electric" matches species of Electric type
    const results = searchSpecies(index, "electric");
    for (const entry of results) {
      const hasMatch =
        entry.species.toLowerCase().includes("electric") ||
        entry.types.some((t) => t.toLowerCase().includes("electric")) ||
        entry.abilities.some((a) => a.toLowerCase().includes("electric"));
      expect(hasMatch).toBe(true);
    }
    // Pikachu is Electric type — must appear in results
    expect(results.map((e) => e.species)).toContain("Pikachu");
  });

  it("returns empty array when query matches nothing", () => {
    const results = searchSpecies(index, "xyznonexistentpokemon12345");
    expect(results).toHaveLength(0);
  });

  it("filters by types option — returns only species with at least one matching type (OR)", () => {
    const results = searchSpecies(index, "", { types: ["Electric"] });
    for (const entry of results) {
      expect(entry.types.map((t) => t.toLowerCase())).toContain("electric");
    }
    expect(results.map((e) => e.species)).toContain("Pikachu");
  });

  it("filters by multiple types — OR logic: species need only one matching type", () => {
    // Fire OR Dark — should include Charizard (Fire) and Incineroar (Fire/Dark)
    const results = searchSpecies(index, "", { types: ["Fire", "Dark"] });
    const names = results.map((e) => e.species);
    expect(names).toContain("Charizard");
    expect(names).toContain("Incineroar");
    // All results must have at least one of Fire or Dark
    for (const entry of results) {
      const hasType = entry.types.some(
        (t) => t.toLowerCase() === "fire" || t.toLowerCase() === "dark"
      );
      expect(hasType).toBe(true);
    }
  });

  it("types filter excludes species without any matching type", () => {
    const results = searchSpecies(index, "", { types: ["Electric"] });
    // Incineroar is Fire/Dark — must NOT appear in Electric-only results
    expect(results.map((e) => e.species)).not.toContain("Incineroar");
  });

  it("filters by abilities option — returns only species with at least one matching ability (OR)", () => {
    const results = searchSpecies(index, "", { abilities: ["Intimidate"] });
    for (const entry of results) {
      const hasAbility = entry.abilities.some(
        (a) => a.toLowerCase() === "intimidate"
      );
      expect(hasAbility).toBe(true);
    }
    expect(results.map((e) => e.species)).toContain("Incineroar");
  });

  it("abilities filter excludes species without the ability", () => {
    const results = searchSpecies(index, "", { abilities: ["Intimidate"] });
    // Pikachu does not have Intimidate
    expect(results.map((e) => e.species)).not.toContain("Pikachu");
  });

  it("filters by minBaseStat — excludes species below the minimum", () => {
    // Only species with base speed >= 100
    const results = searchSpecies(index, "", {
      minBaseStat: { spe: 100 },
    });
    for (const entry of results) {
      expect(entry.baseStats.spe).toBeGreaterThanOrEqual(100);
    }
    // Pikachu has base speed 90 — should be excluded
    expect(results.map((e) => e.species)).not.toContain("Pikachu");
  });

  it("filters by maxBaseStat — excludes species above the maximum", () => {
    // Only species with base HP <= 50
    const results = searchSpecies(index, "", {
      maxBaseStat: { hp: 50 },
    });
    for (const entry of results) {
      expect(entry.baseStats.hp).toBeLessThanOrEqual(50);
    }
    // Incineroar has base HP 95 — should be excluded
    expect(results.map((e) => e.species)).not.toContain("Incineroar");
  });

  it("filters by both minBaseStat and maxBaseStat simultaneously", () => {
    // Species with base speed between 60 and 90 (inclusive)
    const results = searchSpecies(index, "", {
      minBaseStat: { spe: 60 },
      maxBaseStat: { spe: 90 },
    });
    for (const entry of results) {
      expect(entry.baseStats.spe).toBeGreaterThanOrEqual(60);
      expect(entry.baseStats.spe).toBeLessThanOrEqual(90);
    }
    // Pikachu base speed = 90 → included (at the max boundary)
    expect(results.map((e) => e.species)).toContain("Pikachu");
    // Incineroar base speed = 60 → included (at the min boundary)
    expect(results.map((e) => e.species)).toContain("Incineroar");
  });

  it("combining query + types filter narrows results further", () => {
    // "char" + Fire type filter → should include Charizard but exclude any non-Fire "char" matches
    const allChar = searchSpecies(index, "char");
    const charFireOnly = searchSpecies(index, "char", { types: ["Fire"] });

    expect(charFireOnly.length).toBeLessThanOrEqual(allChar.length);
    for (const entry of charFireOnly) {
      expect(entry.types.map((t) => t.toLowerCase())).toContain("fire");
    }
  });

  it("results are returned in the same order as the input index", () => {
    // searchSpecies should preserve index order (it uses Array.filter)
    const results = searchSpecies(index, "", { types: ["Electric"] });
    const resultsAsSubset = index.filter((e) =>
      e.types.some((t) => t.toLowerCase() === "electric")
    );
    expect(results.map((e) => e.species)).toEqual(
      resultsAsSubset.map((e) => e.species)
    );
  });
});
