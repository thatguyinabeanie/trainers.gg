import {
  buildSpeciesSearchIndex,
  searchSpecies,
  type SpeciesSearchEntry,
} from "../species-search";
import { getLegalSpecies } from "../format-legality";

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

describe("buildSpeciesSearchIndex — Champions Reg M-A", () => {
  const CHAMPIONS = "championsvgc2026regma";

  it("includes Aerodactyl (isNonstandard=Past but legal in Champions)", () => {
    const index = buildSpeciesSearchIndex(CHAMPIONS);
    const names = index.map((e) => e.species);
    expect(names).toContain("Aerodactyl");
  });

  it("includes other Past-tagged Champions legal species (spot-check)", () => {
    const index = buildSpeciesSearchIndex(CHAMPIONS);
    const names = index.map((e) => e.species);
    // All of these are isNonstandard='Past' in @pkmn/dex but legal in Champions
    expect(names).toContain("Beedrill");
    expect(names).toContain("Kangaskhan");
    expect(names).toContain("Pinsir");
    expect(names).toContain("Floette-Eternal");
    expect(names).toContain("Aegislash");
    expect(names).toContain("Aegislash-Blade");
    // Gourgeist base form: @pkmn/dex canonicalizes "Gourgeist-Average" → "Gourgeist"
    expect(names).toContain("Gourgeist");
  });

  it("includes standard Champions legal species", () => {
    const index = buildSpeciesSearchIndex(CHAMPIONS);
    const names = index.map((e) => e.species);
    expect(names).toContain("Incineroar");
    expect(names).toContain("Garchomp");
    expect(names).toContain("Kingambit");
    expect(names).toContain("Sneasler");
    expect(names).toContain("Rotom-Heat");
  });

  it("does NOT include CAP/custom non-standard entries", () => {
    // The index excludes Pokestar Studios, CAP, and other truly non-standard entries.
    // Note: illegal-in-Champions species like Landorus-Therian and Calyrex-Shadow
    // ARE present in the index (they're real gen-9 Pokemon) — format-specific
    // legality filtering is the picker's responsibility via isLegalSpecies.
    const index = buildSpeciesSearchIndex(CHAMPIONS);
    const names = index.map((e) => e.species);
    // These are not real playable Pokemon — should never appear
    expect(names.every((n) => !n.startsWith("CAP"))).toBe(true);
  });

  it("contains all dex-resolvable Champions legal species (superset — format filtering applied by picker)", () => {
    // The index contains all legal species that @pkmn/dex can resolve (gen 9 or gen 6
    // fallback for standard megas). The 22 Champions-exclusive mega forms (Greninja-Mega,
    // Chandelure-Mega, etc.) have no @pkmn/dex entry at any generation and are intentionally
    // absent from the index in v1 — they need manual synthesis to be added.
    const CUSTOM_CHAMPIONS_MEGAS = new Set([
      "Chandelure-Mega",
      "Chesnaught-Mega",
      "Chimecho-Mega",
      "Clefable-Mega",
      "Crabominable-Mega",
      "Delphox-Mega",
      "Dragonite-Mega",
      "Drampa-Mega",
      "Emboar-Mega",
      "Excadrill-Mega",
      "Feraligatr-Mega",
      "Floette-Eternal-Mega",
      "Froslass-Mega",
      "Glimmora-Mega",
      "Golurk-Mega",
      "Greninja-Mega",
      "Hawlucha-Mega",
      "Meganium-Mega",
      "Meowstic-Mega",
      "Scovillain-Mega",
      "Skarmory-Mega",
      "Starmie-Mega",
      "Victreebel-Mega",
    ]);

    const index = buildSpeciesSearchIndex(CHAMPIONS);
    const names = new Set(index.map((e) => e.species));

    const legalSet = getLegalSpecies(CHAMPIONS);
    for (const species of legalSet ?? []) {
      if (CUSTOM_CHAMPIONS_MEGAS.has(species)) continue;
      expect(names.has(species)).toBe(true);
    }

    // Sanity: index has at least 215 base entries + standard megas
    expect(index.length).toBeGreaterThanOrEqual(215);
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

  // ==========================================================================
  // moves filter
  // Note: getLearnableMoves() currently returns ALL moves for any valid species
  // and [] for unknown species — so moves filter tests are designed accordingly.
  // ==========================================================================

  describe("moves filter", () => {
    it("returns species that can learn a specified move", () => {
      // Fake Out is a real move — all valid species in the gen return all moves
      // from getLearnableMoves(), so any valid species will pass a single-move filter
      const results = searchSpecies(index, "", { moves: ["Fake Out"] });
      expect(results.length).toBeGreaterThan(0);
      // Incineroar is a well-known Fake Out user — must appear
      expect(results.map((e) => e.species)).toContain("Incineroar");
    });

    it("returns results for multiple moves using AND logic — species must learn ALL specified moves", () => {
      // Both Fake Out and Protect are real moves; a valid species learns all moves
      const results = searchSpecies(index, "", {
        moves: ["Fake Out", "Protect"],
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.map((e) => e.species)).toContain("Incineroar");
    });

    it("returns empty results when filtering by a move no species can learn", () => {
      // "NotARealMove999" is not a real move; getLearnableMoves returns [] for it
      // but the filter checks species moves, not the filter move itself.
      // Since moves are AND-filtered against learnable moves, an impossible move
      // name will not appear in any species' learnable set.
      const results = searchSpecies(index, "", {
        moves: ["NotARealMove999"],
      });
      expect(results).toHaveLength(0);
    });

    it("returns all entries when moves array is empty (no filter applied)", () => {
      const results = searchSpecies(index, "", { moves: [] });
      expect(results).toHaveLength(index.length);
    });

    it("moves filter works together with types filter to narrow results", () => {
      // Fake Out + Fire type → should include Incineroar (Fire/Dark, learns Fake Out)
      const results = searchSpecies(index, "", {
        moves: ["Fake Out"],
        types: ["Fire"],
      });
      const names = results.map((e) => e.species);
      expect(names).toContain("Incineroar");
      // All results must be Fire type
      for (const entry of results) {
        expect(entry.types.map((t) => t.toLowerCase())).toContain("fire");
      }
    });

    it("moves filter excludes species that cannot learn any of the specified moves", () => {
      // Filter by a non-existent move — no species should pass
      const results = searchSpecies(index, "", {
        moves: ["FakeMoveXYZ123"],
      });
      expect(results).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Free-text query move matching (formatId-aware)
  // When the caller passes options.formatId, the query string also matches
  // against learnable move names — typing "tail" surfaces Tailwind learners
  // even though no species/type/ability contains "tail".
  // ==========================================================================

  describe("query matches move names when formatId is supplied", () => {
    const FORMAT = "gen9vgc2026regi";

    it("returns Tailwind learners when searching 'tail' (matches Iron Tail, Tail Slap, Tailwind, etc.)", () => {
      const results = searchSpecies(index, "tail", { formatId: FORMAT });
      const names = results.map((e) => e.species);
      // Whimsicott is a canonical Tailwind setter
      expect(names).toContain("Whimsicott");
      // The query should surface many more species than the only one whose
      // name contains "tail" (Farigiraf), proving move matching is active.
      expect(results.length).toBeGreaterThan(5);
    });

    it("returns species learning Moonblast when searching 'moonblast'", () => {
      const results = searchSpecies(index, "moonblast", { formatId: FORMAT });
      const names = results.map((e) => e.species);
      // Sylveon is a textbook Moonblast user
      expect(names).toContain("Sylveon");
    });

    it("falls back to name/type/ability matching when formatId is omitted", () => {
      // Without a formatId, "tail" should only match species whose name,
      // type, or ability literally contains the substring — no move matching.
      const results = searchSpecies(index, "tail");
      for (const entry of results) {
        const hasTextualMatch =
          entry.species.toLowerCase().includes("tail") ||
          entry.types.some((t) => t.toLowerCase().includes("tail")) ||
          entry.abilities.some((a) => a.toLowerCase().includes("tail"));
        expect(hasTextualMatch).toBe(true);
      }
    });

    it("name matches still take priority and don't require move lookup", () => {
      // 'pika' matches by name, the move-lookup branch should not exclude it
      const results = searchSpecies(index, "pika", { formatId: FORMAT });
      expect(results.map((e) => e.species)).toContain("Pikachu");
    });
  });
});
