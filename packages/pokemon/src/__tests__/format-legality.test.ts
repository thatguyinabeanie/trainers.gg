import {
  getCanonicalBaseSpecies,
  getFormsForSpecies,
  getLegalAbilities,
  getLegalItems,
  getLegalMoves,
  getLegalSpecies,
  getLegalTeraTypes,
  getMegaStoneForSpecies,
  isLegalAbility,
  isLegalItem,
  isLegalMove,
  isLegalSpecies,
  isLegalTeraType,
  validatePokemonLegality,
  type LegalityResult,
  LEGALITY_UNAVAILABLE,
  speciesHasForms,
} from "../format-legality";

/**
 * Helper: assert a `getLegal*` call returned an actual set (not the
 * permissive `undefined` or the `LEGALITY_UNAVAILABLE` sentinel) and
 * narrow the type for downstream `.size` / `.has()` assertions.
 */
function asSet(value: LegalityResult): ReadonlySet<string> {
  expect(value).toBeInstanceOf(Set);
  if (value === undefined || value === LEGALITY_UNAVAILABLE) {
    throw new Error("expected a ReadonlySet, got " + String(value));
  }
  return value;
}

describe("format-legality — Champions M-A", () => {
  const CHAMPIONS = "gen9championsvgc2026regma";

  it("marks Incineroar as legal in Champions M-A", () => {
    expect(isLegalSpecies("Incineroar", CHAMPIONS)).toBe(true);
  });

  it("marks Aerodactyl as legal in Champions M-A", () => {
    // Aerodactyl is isNonstandard='Past' in @pkmn/dex (not in SV) but is
    // explicitly legal in Champions — regression guard for the species picker.
    expect(isLegalSpecies("Aerodactyl", CHAMPIONS)).toBe(true);
  });

  it("marks Landorus-Therian as illegal in Champions M-A", () => {
    expect(isLegalSpecies("Landorus-Therian", CHAMPIONS)).toBe(false);
  });

  it("returns a ReadonlySet for Champions M-A", () => {
    const legal = asSet(getLegalSpecies(CHAMPIONS));
    // 215 base species + 59 mega forms (36 standard + 23 Champions-exclusive)
    // minus duplicates: Aegislash-Shield → Aegislash, Maushold-Three → Maushold
    // Floette-Eternal-Mega removed (Floette-Mega is the Champions name)
    expect(legal.size).toBe(275);
  });

  it("includes Mega forms using Showdown naming (not 'Mega X' naming)", () => {
    const legal = asSet(getLegalSpecies(CHAMPIONS));
    // Wrong naming format — should not be present
    expect(legal.has("Mega Venusaur")).toBe(false);
    expect(legal.has("Mega Charizard X")).toBe(false);
    // Correct Showdown naming — should be present (standard + Champions-exclusive)
    expect(legal.has("Venusaur-Mega")).toBe(true);
    expect(legal.has("Charizard-Mega-X")).toBe(true);
    expect(legal.has("Greninja-Mega")).toBe(true);
    // Base species still present
    expect(legal.has("Venusaur")).toBe(true);
    expect(legal.has("Charizard")).toBe(true);
  });

  it("retains distinct battle forms", () => {
    const legal = asSet(getLegalSpecies(CHAMPIONS));
    expect(legal.has("Rotom-Heat")).toBe(true);
    expect(legal.has("Tauros-Paldea-Combat")).toBe(true);
    expect(legal.has("Aegislash-Blade")).toBe(true);
    expect(legal.has("Meowstic-F")).toBe(true);
    expect(legal.has("Slowking-Galar")).toBe(true);
  });
});

describe("format-legality — permissive fallback", () => {
  it("returns undefined for an unknown format ID", () => {
    expect(getLegalSpecies("unknown-format-id")).toBeUndefined();
  });

  it("isLegalSpecies returns true for any species in an unknown format", () => {
    expect(isLegalSpecies("Landorus-Therian", "unknown-format-id")).toBe(true);
  });
});

describe("format-legality — @pkmn/sim path", () => {
  const REG_I = "gen9vgc2026regi";
  const REG_G = "gen9vgc2024regg";

  it("marks Incineroar as legal in VGC Reg I", () => {
    expect(isLegalSpecies("Incineroar", REG_I)).toBe(true);
  });

  it("marks Mew as illegal in VGC Reg I (Mythical, banned by Flat Rules)", () => {
    expect(isLegalSpecies("Mew", REG_I)).toBe(false);
  });

  it("returns a non-empty set for VGC Reg I", () => {
    const legal = asSet(getLegalSpecies(REG_I));
    expect(legal.size).toBeGreaterThan(100);
  });

  it("marks Mewtwo legal in Reg G (restricted-legendary format)", () => {
    expect(isLegalSpecies("Mewtwo", REG_G)).toBe(true);
  });

  it("memoizes the set — repeated calls return the same instance", () => {
    const first = getLegalSpecies(REG_I);
    const second = getLegalSpecies(REG_I);
    expect(first).toBe(second);
  });
});

describe("format-legality — items", () => {
  it("marks Life Orb legal in VGC Reg I", () => {
    expect(isLegalItem("Life Orb", "gen9vgc2026regi")).toBe(true);
  });

  it("marks Focus Sash legal in VGC Reg I", () => {
    expect(isLegalItem("Focus Sash", "gen9vgc2026regi")).toBe(true);
  });

  it("returns the Champions M-A static item set (30 hold + 59 Mega Stones + 28 Berries)", () => {
    const items = asSet(getLegalItems("gen9championsvgc2026regma"));
    // Hold items
    expect(items.has("Choice Scarf")).toBe(true);
    expect(items.has("Focus Sash")).toBe(true);
    expect(items.has("Leftovers")).toBe(true);
    // Mega Stones
    expect(items.has("Venusaurite")).toBe(true);
    expect(items.has("Charizardite X")).toBe(true);
    expect(items.has("Chandelurite")).toBe(true); // Champions-new
    // Berries
    expect(items.has("Sitrus Berry")).toBe(true);
    expect(items.has("Lum Berry")).toBe(true);
    // NOT in Champions
    expect(items.has("Life Orb")).toBe(false);
    expect(items.has("Choice Band")).toBe(false);
    expect(items.has("Assault Vest")).toBe(false);
    // Total: 30 + 59 + 28 = 117
    expect(items.size).toBe(117);
  });

  it("returns undefined for unknown formats (permissive)", () => {
    expect(getLegalItems("unknown-format-id")).toBeUndefined();
    expect(isLegalItem("Life Orb", "unknown-format-id")).toBe(true);
  });

  it("memoizes — repeated calls return the same instance", () => {
    const a = getLegalItems("gen9vgc2026regi");
    const b = getLegalItems("gen9vgc2026regi");
    expect(a).toBe(b);
  });

  it("isLegalItem returns true for empty string (no item selected)", () => {
    expect(isLegalItem("", "gen9vgc2026regi")).toBe(true);
  });
});

describe("format-legality — moves", () => {
  it("marks Protect legal on Incineroar in Reg I", () => {
    expect(isLegalMove("Protect", "Incineroar", "gen9vgc2026regi")).toBe(true);
  });

  it("marks Hyperspace Hole illegal on Pikachu (can't learn)", () => {
    expect(isLegalMove("Hyperspace Hole", "Pikachu", "gen9vgc2026regi")).toBe(
      false
    );
  });

  it("returns a learnset-filtered set for Champions species", () => {
    const legal = asSet(
      getLegalMoves("Incineroar", "gen9championsvgc2026regma")
    );
    expect(legal.has("Fake Out")).toBe(true);
    expect(legal.has("Hyperspace Hole")).toBe(false);
  });

  it("returns permissive true for unknown formats", () => {
    expect(isLegalMove("Protect", "Pikachu", "unknown-format-id")).toBe(true);
  });

  it("memoizes per (species, format) pair", () => {
    const a = getLegalMoves("Pikachu", "gen9vgc2026regi");
    const b = getLegalMoves("Pikachu", "gen9vgc2026regi");
    expect(a).toBe(b);
  });

  it("isLegalMove returns true for empty string (no move selected)", () => {
    expect(isLegalMove("", "Pikachu", "gen9vgc2026regi")).toBe(true);
  });
});

describe("format-legality — tera types", () => {
  it("returns all 18 types for Reg I (no Terastal Clause)", () => {
    const tera = asSet(getLegalTeraTypes("gen9vgc2026regi"));
    expect(tera.size).toBe(18);
    expect(tera.has("Fire")).toBe(true);
  });

  it("returns empty set for Champions M-A (no Tera — only Megas)", () => {
    const tera = asSet(getLegalTeraTypes("gen9championsvgc2026regma"));
    expect(tera.size).toBe(0);
  });

  it("returns empty set when format has Terastal Clause ([Gen 9] Monotype)", () => {
    const tera = asSet(getLegalTeraTypes("gen9monotype"));
    expect(tera.size).toBe(0);
  });

  it("returns undefined for unknown formats (permissive)", () => {
    expect(getLegalTeraTypes("unknown-format-id")).toBeUndefined();
    expect(isLegalTeraType("Fire", "unknown-format-id")).toBe(true);
  });

  it("isLegalTeraType returns true for empty string (no tera selected)", () => {
    expect(isLegalTeraType("", "gen9championsvgc2026regma")).toBe(true);
  });

  it("isLegalTeraType returns false for a type in a no-Tera format", () => {
    expect(isLegalTeraType("Fire", "gen9championsvgc2026regma")).toBe(false);
  });
});

describe("format-legality — abilities", () => {
  it("marks Intimidate legal on Incineroar in Reg I", () => {
    expect(isLegalAbility("Intimidate", "Incineroar", "gen9vgc2026regi")).toBe(
      true
    );
  });

  it("marks Moody illegal in Gen 9 OU (format-banned)", () => {
    expect(isLegalAbility("Moody", "Smeargle", "gen9ou")).toBe(false);
  });

  it("marks an ability the species doesn't have as illegal", () => {
    expect(isLegalAbility("Intimidate", "Pikachu", "gen9vgc2026regi")).toBe(
      false
    );
  });

  it("returns a set of the species' legal abilities", () => {
    const legal = asSet(getLegalAbilities("Incineroar", "gen9vgc2026regi"));
    expect(legal.has("Intimidate")).toBe(true);
    expect(legal.has("Blaze")).toBe(true);
  });

  it("returns undefined for unknown formats (permissive)", () => {
    expect(getLegalAbilities("Pikachu", "unknown-format-id")).toBeUndefined();
    expect(isLegalAbility("Static", "Pikachu", "unknown-format-id")).toBe(true);
  });

  it("returns all species abilities for Champions (no ability banlist)", () => {
    const legal = asSet(
      getLegalAbilities("Incineroar", "gen9championsvgc2026regma")
    );
    expect(legal.has("Intimidate")).toBe(true);
    expect(legal.has("Blaze")).toBe(true);
  });

  it("isLegalAbility returns true for empty string (no ability selected)", () => {
    expect(isLegalAbility("", "Pikachu", "gen9vgc2026regi")).toBe(true);
  });

  describe("mega forms — base ability legality", () => {
    it.each([
      ["Charizard-Mega-Y", "Solar Power"],
      ["Charizard-Mega-Y", "Blaze"],
      ["Charizard-Mega-X", "Blaze"],
      ["Garchomp-Mega", "Rough Skin"],
      ["Garchomp-Mega", "Sand Veil"],
    ])(
      "%s with stored base ability %s is legal (tournament submission shape)",
      (megaSpecies, baseAbility) => {
        expect(
          isLegalAbility(baseAbility, megaSpecies, "gen9championsvgc2026regma")
        ).toBe(true);
      }
    );

    it("Charizard-Mega-Y rejects an ability not in Charizard's pool", () => {
      expect(
        isLegalAbility(
          "Intimidate",
          "Charizard-Mega-Y",
          "gen9championsvgc2026regma"
        )
      ).toBe(false);
    });
  });
});

describe("form switching", () => {
  describe("getCanonicalBaseSpecies", () => {
    it.each([
      ["Charizard", "Charizard"],
      ["Charizard-Mega-X", "Charizard"],
      ["Charizard-Mega-Y", "Charizard"],
      ["Garchomp-Mega", "Garchomp"],
      ["Aegislash", "Aegislash"],
      ["Aegislash-Blade", "Aegislash"],
      ["Wishiwashi-School", "Wishiwashi"],
      ["Greninja-Ash", "Greninja"],
      ["Mimikyu-Busted", "Mimikyu"],
      ["Eternatus-Eternamax", "Eternatus"],
      // Champions Floette-Mega's canonical base is Floette-Eternal, not Floette.
      ["Floette-Mega", "Floette-Eternal"],
      ["Floette-Eternal", "Floette-Eternal"],
    ])("%s → %s", (input, expected) => {
      expect(getCanonicalBaseSpecies(input)).toBe(expected);
    });

    it("returns empty string for empty input", () => {
      expect(getCanonicalBaseSpecies("")).toBe("");
    });

    it("returns species unchanged when no transform applies", () => {
      expect(getCanonicalBaseSpecies("Pikachu")).toBe("Pikachu");
      expect(getCanonicalBaseSpecies("Iron Hands")).toBe("Iron Hands");
    });
  });

  describe("getFormsForSpecies", () => {
    it("returns single-element array for species without alternate forms", () => {
      expect(getFormsForSpecies("Pikachu")).toEqual(["Pikachu"]);
      expect(getFormsForSpecies("Garchomp").length).toBeGreaterThanOrEqual(2);
    });

    it("returns base + every mega for Charizard", () => {
      const forms = getFormsForSpecies("Charizard");
      expect(forms[0]).toBe("Charizard");
      expect(forms).toContain("Charizard-Mega-X");
      expect(forms).toContain("Charizard-Mega-Y");
    });

    it("resolves variant input to the same form list as base input", () => {
      const fromBase = getFormsForSpecies("Charizard");
      const fromMega = getFormsForSpecies("Charizard-Mega-Y");
      expect(fromMega).toEqual(fromBase);
    });

    it("includes Aegislash-Blade for Aegislash", () => {
      expect(getFormsForSpecies("Aegislash")).toEqual([
        "Aegislash",
        "Aegislash-Blade",
      ]);
    });

    it("Floette-Eternal lists Floette-Mega as the alternate form", () => {
      const forms = getFormsForSpecies("Floette-Eternal");
      expect(forms[0]).toBe("Floette-Eternal");
      expect(forms).toContain("Floette-Mega");
    });

    it("returns empty array for empty input", () => {
      expect(getFormsForSpecies("")).toEqual([]);
    });
  });

  describe("speciesHasForms", () => {
    it.each([
      ["Charizard", true],
      ["Garchomp", true],
      ["Aegislash", true],
      ["Floette-Eternal", true],
      ["Floette-Mega", true], // input variant resolves to base, still has forms
      ["Pikachu", false],
      ["Iron Hands", false],
      ["", false],
    ])("%s → %s", (input, expected) => {
      expect(speciesHasForms(input)).toBe(expected);
    });
  });

  describe("getMegaStoneForSpecies", () => {
    it.each([
      ["Charizard-Mega-X", "Charizardite X"],
      ["Charizard-Mega-Y", "Charizardite Y"],
      ["Floette-Mega", "Floettite"],
      ["Garchomp-Mega", "Garchompite"],
      ["Charizard", null],
      ["Aegislash-Blade", null], // not a mega — no stone
      ["Pikachu", null],
      ["", null],
    ])("%s → %s", (input, expected) => {
      expect(getMegaStoneForSpecies(input)).toBe(expected);
    });
  });
});

describe("validatePokemonLegality", () => {
  // Champions M-A legal inputs used across multiple cases:
  //   species:  "Garchomp"        — in CHAMPIONS_MA_LEGAL_SPECIES
  //   item:     "Choice Scarf"    — in CHAMPIONS_MA_LEGAL_ITEMS
  //   ability:  "Rough Skin"      — one of Garchomp's own abilities (Sand Veil / Rough Skin)
  //   move:     "Earthquake"      — Garchomp learns it via level-up / TM
  //
  // Illegal inputs:
  //   species:  "Landorus-Therian" — not in Champions roster
  //   item:     "Life Orb"         — not in CHAMPIONS_MA_LEGAL_ITEMS
  //   ability:  "Intimidate"       — not in Garchomp's ability pool
  //   move:     "Hyperspace Hole"  — Hoopa's signature; Garchomp's learnset never includes it

  const CHAMPIONS = "gen9championsvgc2026regma";

  it("returns { isLegal: true, reason: null } when all fields are legal", () => {
    expect(
      validatePokemonLegality(
        "Garchomp",
        "Rough Skin",
        "Choice Scarf",
        ["Earthquake", "Dragon Claw", "Protect", "Rock Slide"],
        CHAMPIONS
      )
    ).toEqual({ isLegal: true, reason: null });
  });

  it("returns illegal species reason when species is not in the format roster", () => {
    const result = validatePokemonLegality(
      "Landorus-Therian",
      "Rough Skin",
      "Choice Scarf",
      ["Earthquake"],
      CHAMPIONS
    );
    expect(result.isLegal).toBe(false);
    expect(result.reason).toBe("Illegal species: Landorus-Therian");
  });

  it("returns illegal item reason when item is not in the format item pool (legal species)", () => {
    const result = validatePokemonLegality(
      "Garchomp",
      "Rough Skin",
      "Life Orb",
      ["Earthquake"],
      CHAMPIONS
    );
    expect(result.isLegal).toBe(false);
    expect(result.reason).toBe("Illegal item: Life Orb");
  });

  it("returns illegal ability reason when ability is not in the species' pool (legal species)", () => {
    const result = validatePokemonLegality(
      "Garchomp",
      "Intimidate",
      "Choice Scarf",
      ["Earthquake"],
      CHAMPIONS
    );
    expect(result.isLegal).toBe(false);
    expect(result.reason).toBe("Illegal ability: Intimidate");
  });

  it("returns illegal move reason when species cannot learn the move (legal species/item/ability)", () => {
    const result = validatePokemonLegality(
      "Garchomp",
      "Rough Skin",
      "Choice Scarf",
      ["Earthquake", "Hyperspace Hole"],
      CHAMPIONS
    );
    expect(result.isLegal).toBe(false);
    expect(result.reason).toBe("Illegal move: Hyperspace Hole");
  });

  it("first-failure-wins: illegal species AND illegal item → reason is the species message", () => {
    const result = validatePokemonLegality(
      "Landorus-Therian",
      "Rough Skin",
      "Life Orb",
      ["Earthquake"],
      CHAMPIONS
    );
    expect(result.isLegal).toBe(false);
    expect(result.reason).toBe("Illegal species: Landorus-Therian");
  });

  it("skips null fields and returns legal when species is valid", () => {
    expect(
      validatePokemonLegality("Garchomp", null, null, null, CHAMPIONS)
    ).toEqual({ isLegal: true, reason: null });
  });

  it("returns { isLegal: true } for a totally unknown format (permissive fail-open)", () => {
    expect(
      validatePokemonLegality(
        "Landorus-Therian",
        "Intimidate",
        "Life Orb",
        ["Hyperspace Hole"],
        "totally-unknown-format"
      )
    ).toEqual({ isLegal: true, reason: null });
  });

  it("form Pokemon passed as a lowercase slug is legal (slug canonicalization regression)", () => {
    // "rotom-wash" is the normalized slug that RK9 import produces.
    // SimDex.species.get("rotom-wash") resolves to "Rotom-Wash", which IS in
    // the Champions M-A species set — this was the bug: every form Pokemon
    // (Rotom-Wash, Ogerpon-Wellspring, Urshifu-Rapid-Strike, etc.) was wrongly
    // flagged illegal because the slug didn't match the Set.has() lookup.
    expect(
      validatePokemonLegality("rotom-wash", null, null, null, CHAMPIONS)
    ).toEqual({ isLegal: true, reason: null });
  });

  it("illegal form species reason shows the canonical name, not the raw slug", () => {
    // "landorus-therian" slug → canonical "Landorus-Therian" (not in Champions M-A)
    // The reason string must use the canonical name so it's human-readable.
    const result = validatePokemonLegality(
      "landorus-therian",
      null,
      null,
      null,
      CHAMPIONS
    );
    expect(result.isLegal).toBe(false);
    expect(result.reason).toBe("Illegal species: Landorus-Therian");
  });
});
