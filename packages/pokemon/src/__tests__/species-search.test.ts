import {
  buildSpeciesSearchIndex,
  clearSpeciesSearchIndexCache,
  searchSpecies,
  getAllLegalAbilities,
  getAllLegalMoves,
  type SpeciesSearchEntry,
} from "../species-search";
import * as formatLegality from "../format-legality";
import { getLegalSpecies, LEGALITY_UNAVAILABLE } from "../format-legality";

// Library tsconfig has no DOM/Node lib — declare console ambiently so tests
// can spy on it without pulling @types/node.
declare const console: {
  warn(...data: unknown[]): void;
};

// The species-search index is cached at module level keyed by formatId. Tests
// that pass a custom `getRoles` resolver need a fresh build, so clear the
// cache between tests to avoid one test's resolver bleeding into another's.
afterEach(() => {
  clearSpeciesSearchIndexCache();
});

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
    // Filter out the LEGALITY_UNAVAILABLE sentinel before iterating —
    // it's not iterable. For this test, the Champions format's legal set
    // is computed from a static list and won't fail; defensive only.
    const iterable =
      legalSet && typeof (legalSet as ReadonlySet<string>).has === "function"
        ? (legalSet as ReadonlySet<string>)
        : [];
    for (const species of iterable) {
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

  it("filters by types option — returns only species with the matching type", () => {
    const results = searchSpecies(index, "", { types: ["Electric"] });
    for (const entry of results) {
      expect(entry.types.map((t) => t.toLowerCase())).toContain("electric");
    }
    expect(results.map((e) => e.species)).toContain("Pikachu");
  });

  it("filters by multiple types — AND logic: species must carry every selected type", () => {
    // Fire AND Dark — only species like Incineroar (Fire/Dark) qualify;
    // pure-Fire species like Charizard must be excluded.
    const results = searchSpecies(index, "", { types: ["Fire", "Dark"] });
    const names = results.map((e) => e.species);
    expect(names).toContain("Incineroar");
    expect(names).not.toContain("Charizard");
    for (const entry of results) {
      const lower = entry.types.map((t) => t.toLowerCase());
      expect(lower).toContain("fire");
      expect(lower).toContain("dark");
    }
  });

  it("types filter excludes species without the matching type", () => {
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
  // moves filter — format-aware via getLegalMoves(species, formatId)
  // The picker always passes formatId in production; without it the filter
  // is intentionally skipped (the deprecated permissive fallback would
  // silently match every species).
  // ==========================================================================

  describe("moves filter", () => {
    it("returns species that legally learn a specified move", () => {
      const results = searchSpecies(index, "", {
        moves: ["Fake Out"],
        formatId: GEN9_FORMAT,
      });
      expect(results.length).toBeGreaterThan(0);
      // Incineroar is a well-known Fake Out user — must appear
      expect(results.map((e) => e.species)).toContain("Incineroar");
    });

    it("excludes species that do NOT legally learn the move", () => {
      const results = searchSpecies(index, "", {
        moves: ["Fake Out"],
        formatId: GEN9_FORMAT,
      });
      const names = results.map((e) => e.species);
      // Charizard, Dragapult, Garchomp, Volcarona — none legally learn Fake
      // Out in gen9 reg I. Pre-fix the deprecated permissive fallback would
      // have falsely included all of them.
      expect(names).not.toContain("Charizard");
      expect(names).not.toContain("Dragapult");
      expect(names).not.toContain("Garchomp");
    });

    it("returns results for multiple moves using AND logic — species must legally learn ALL specified moves", () => {
      const results = searchSpecies(index, "", {
        moves: ["Fake Out", "Protect"],
        formatId: GEN9_FORMAT,
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.map((e) => e.species)).toContain("Incineroar");
    });

    it("returns empty results when filtering by a move no species can learn", () => {
      const results = searchSpecies(index, "", {
        moves: ["NotARealMove999"],
        formatId: GEN9_FORMAT,
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
        formatId: GEN9_FORMAT,
      });
      const names = results.map((e) => e.species);
      expect(names).toContain("Incineroar");
      // All results must be Fire type
      for (const entry of results) {
        expect(entry.types.map((t) => t.toLowerCase())).toContain("fire");
      }
    });

    it("skips the moves filter permissively when no formatId is provided", () => {
      // Without formatId the filter cannot be honestly applied — every entry
      // should pass through rather than silently match everything via the
      // deprecated getLearnableMoves fallback. Document this behavior so a
      // future regression that re-introduces the permissive fallback is
      // caught.
      const all = searchSpecies(index, "", {});
      const noFormat = searchSpecies(index, "", { moves: ["Fake Out"] });
      expect(noFormat).toHaveLength(all.length);
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

describe("SpeciesSearchEntry — new fields", () => {
  let index: SpeciesSearchEntry[];
  beforeAll(() => {
    index = buildSpeciesSearchIndex("gen9vgc2026regg");
  });

  it("has named ability slots", () => {
    const incineroar = index.find((e) => e.species === "Incineroar")!;
    expect(incineroar.abilitySlot1).toBe("Blaze");
    expect(incineroar.hiddenAbility).toBe("Intimidate");
  });

  it("roles defaults to empty without a resolver", () => {
    expect(index[0]!.roles).toEqual([]);
  });

  it("buildSpeciesSearchIndex with a resolver populates roles", () => {
    const idx = buildSpeciesSearchIndex("gen9vgc2026regg", (_abil, species) =>
      species === "Incineroar" ? ["fake-out", "drop-atk"] : []
    );
    const incineroar = idx.find((e) => e.species === "Incineroar")!;
    expect(incineroar.roles).toEqual(["fake-out", "drop-atk"]);
  });
});

describe("searchSpecies — new filters", () => {
  let index: SpeciesSearchEntry[];
  beforeAll(() => {
    index = buildSpeciesSearchIndex("gen9vgc2026regg");
  });

  it("ability filter matches any slot", () => {
    const results = searchSpecies(index, "", { ability: "Intimidate" });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (e) =>
          e.abilitySlot1 === "Intimidate" ||
          e.abilitySlot2 === "Intimidate" ||
          e.hiddenAbility === "Intimidate"
      )
    ).toBe(true);
  });

  it("megaOnly returns only Mega-form species (e.g. Charizard-Mega-X, Venusaur-Mega)", () => {
    const championsIndex = buildSpeciesSearchIndex("championsvgc2026regma");
    const results = searchSpecies(championsIndex, "", { megaOnly: true });
    // Every result should be a Mega form, not a base species
    expect(results.every((e) => e.species.includes("-Mega"))).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("megaOnly excludes base species (Charizard appears only as Mega forms)", () => {
    const championsIndex = buildSpeciesSearchIndex("championsvgc2026regma");
    const results = searchSpecies(championsIndex, "", { megaOnly: true });
    const names = results.map((e) => e.species);
    // Base "Charizard" should NOT appear; the Mega forms should
    expect(names).not.toContain("Charizard");
    expect(
      names.some((n) => n === "Charizard-Mega-X" || n === "Charizard-Mega-Y")
    ).toBe(true);
  });

  it("buildSpeciesSearchIndex caches by getRoles identity (different resolvers don't poison each other)", () => {
    // Regression for the WeakMap<GetRolesFn, Map<formatId, entries>> cache
    // refactor: two resolvers building the same format must not share results.
    // Previously the cache was keyed only by formatId, so the second call
    // would silently return the first resolver's roles.
    const resolverA = (
      _abil: { slot1: string | null; slot2: string | null; hidden: string | null },
      species: string
    ): readonly string[] => (species === "Incineroar" ? ["fake-out"] : []);
    const resolverB = (
      _abil: { slot1: string | null; slot2: string | null; hidden: string | null },
      species: string
    ): readonly string[] => (species === "Incineroar" ? ["drop-atk"] : []);

    const idxA = buildSpeciesSearchIndex(GEN9_FORMAT, resolverA);
    const idxB = buildSpeciesSearchIndex(GEN9_FORMAT, resolverB);

    // Different array instances — each resolver got its own build
    expect(idxA).not.toBe(idxB);

    const incA = idxA.find((e) => e.species === "Incineroar");
    const incB = idxB.find((e) => e.species === "Incineroar");
    expect(incA?.roles).toEqual(["fake-out"]);
    expect(incB?.roles).toEqual(["drop-atk"]);

    // Calling resolverA again returns the same cached result for resolverA,
    // not resolverB's
    const idxA2 = buildSpeciesSearchIndex(GEN9_FORMAT, resolverA);
    expect(idxA2).toBe(idxA);
  });

  it("roles filter matches species carrying every selected role (AND)", () => {
    const idx = buildSpeciesSearchIndex("gen9vgc2026regg", (_abil, species) =>
      species === "Incineroar"
        ? ["fake-out", "drop-atk"]
        : species === "Charizard"
          ? ["fake-out"]
          : []
    );

    // Single role — Incineroar and Charizard both qualify
    const single = searchSpecies(idx, "", { roles: ["fake-out"] });
    expect(single.some((e) => e.species === "Incineroar")).toBe(true);
    expect(single.some((e) => e.species === "Charizard")).toBe(true);

    // Two roles AND'd — only Incineroar carries both
    const both = searchSpecies(idx, "", {
      roles: ["fake-out", "drop-atk"],
    });
    expect(both.some((e) => e.species === "Incineroar")).toBe(true);
    expect(both.some((e) => e.species === "Charizard")).toBe(false);
  });
});

describe("getAllLegalAbilities / getAllLegalMoves", () => {
  it("getAllLegalAbilities returns sorted unique abilities", () => {
    const a = getAllLegalAbilities("gen9vgc2026regg");
    expect(a.length).toBeGreaterThan(50);
    expect([...a]).toEqual([...a].sort((x, y) => x.localeCompare(y)));
    expect(a).toContain("Intimidate");
  });

  it("getAllLegalAbilities is cached (same array reference on second call)", () => {
    const a = getAllLegalAbilities("gen9vgc2026regg");
    const b = getAllLegalAbilities("gen9vgc2026regg");
    expect(a).toBe(b);
  });

  it("getAllLegalMoves returns sorted unique moves", () => {
    const m = getAllLegalMoves("gen9vgc2026regg");
    expect(m.length).toBeGreaterThan(100);
    expect(m).toContain("Tailwind");
  });

  // Regression: clearSpeciesSearchIndexCache must reset the enumerator caches
  // too, otherwise consumers calling clear() to refresh after a dataset change
  // would silently keep getting the stale ability/move arrays.
  it("clearSpeciesSearchIndexCache evicts the ability/move enumerator caches", () => {
    const beforeAbilities = getAllLegalAbilities("gen9vgc2026regg");
    const beforeMoves = getAllLegalMoves("gen9vgc2026regg");

    clearSpeciesSearchIndexCache();

    const afterAbilities = getAllLegalAbilities("gen9vgc2026regg");
    const afterMoves = getAllLegalMoves("gen9vgc2026regg");

    // Same content (no real upstream change), but a fresh array reference
    // proves the cache was rebuilt rather than served from the prior cache.
    expect(afterAbilities).not.toBe(beforeAbilities);
    expect(afterAbilities).toEqual(beforeAbilities);
    expect(afterMoves).not.toBe(beforeMoves);
    expect(afterMoves).toEqual(beforeMoves);
  });

  // Regression: clearSpeciesSearchIndexCache must also reset the silent-fallback
  // warning dedup sets. Otherwise a `console.warn` that fired during the prior
  // cache lifetime stays suppressed forever, hiding warnings tests intentionally
  // trigger after a refresh.
  it("clearSpeciesSearchIndexCache resets the silent-fallback warning dedup", () => {
    // Force the LEGALITY_UNAVAILABLE path for getLegalSpecies so
    // buildSpeciesSearchIndex hits the warned-set guarded warn.
    const legalitySpy = jest
      .spyOn(formatLegality, "getLegalSpecies")
      .mockReturnValue(LEGALITY_UNAVAILABLE);
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    try {
      // Use a format that the real index would otherwise build cleanly so the
      // only difference between runs is the mocked legality sentinel.
      const fmt = "gen9vgc2026regg";
      clearSpeciesSearchIndexCache();

      buildSpeciesSearchIndex(fmt);
      const firstCallCount = warnSpy.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Same format again without clearing — dedup should suppress the warning.
      buildSpeciesSearchIndex(fmt);
      expect(warnSpy.mock.calls.length).toBe(firstCallCount);

      // Clear the cache — warned* sets must reset so the warning fires again.
      clearSpeciesSearchIndexCache();
      buildSpeciesSearchIndex(fmt);
      expect(warnSpy.mock.calls.length).toBeGreaterThan(firstCallCount);
    } finally {
      warnSpy.mockRestore();
      legalitySpy.mockRestore();
    }
  });
});
