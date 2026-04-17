import {
  getLegalAbilities,
  getLegalItems,
  getLegalMoves,
  getLegalSpecies,
  getLegalTeraTypes,
  isLegalAbility,
  isLegalItem,
  isLegalMove,
  isLegalSpecies,
  isLegalTeraType,
} from "../format-legality";

describe("format-legality — Champions M-A", () => {
  const CHAMPIONS = "championsvgc2026regma";

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
    const legal = getLegalSpecies(CHAMPIONS);
    expect(legal).toBeInstanceOf(Set);
    // 215 base species + 59 mega forms (36 standard + 23 Champions-exclusive)
    // minus duplicates: Aegislash-Shield → Aegislash, Maushold-Three → Maushold
    // Floette-Eternal-Mega removed (Floette-Mega is the Champions name)
    expect(legal?.size).toBe(275);
  });

  it("includes Mega forms using Showdown naming (not 'Mega X' naming)", () => {
    const legal = getLegalSpecies(CHAMPIONS);
    // Wrong naming format — should not be present
    expect(legal?.has("Mega Venusaur")).toBe(false);
    expect(legal?.has("Mega Charizard X")).toBe(false);
    // Correct Showdown naming — should be present (standard + Champions-exclusive)
    expect(legal?.has("Venusaur-Mega")).toBe(true);
    expect(legal?.has("Charizard-Mega-X")).toBe(true);
    expect(legal?.has("Greninja-Mega")).toBe(true);
    // Base species still present
    expect(legal?.has("Venusaur")).toBe(true);
    expect(legal?.has("Charizard")).toBe(true);
  });

  it("retains distinct battle forms", () => {
    const legal = getLegalSpecies(CHAMPIONS);
    expect(legal?.has("Rotom-Heat")).toBe(true);
    expect(legal?.has("Tauros-Paldea-Combat")).toBe(true);
    expect(legal?.has("Aegislash-Blade")).toBe(true);
    expect(legal?.has("Meowstic-F")).toBe(true);
    expect(legal?.has("Slowking-Galar")).toBe(true);
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
    const legal = getLegalSpecies(REG_I);
    expect(legal).toBeInstanceOf(Set);
    expect(legal?.size).toBeGreaterThan(100);
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
    const items = getLegalItems("championsvgc2026regma");
    expect(items).toBeInstanceOf(Set);
    // Hold items
    expect(items?.has("Choice Scarf")).toBe(true);
    expect(items?.has("Focus Sash")).toBe(true);
    expect(items?.has("Leftovers")).toBe(true);
    // Mega Stones
    expect(items?.has("Venusaurite")).toBe(true);
    expect(items?.has("Charizardite X")).toBe(true);
    expect(items?.has("Chandelurite")).toBe(true); // Champions-new
    // Berries
    expect(items?.has("Sitrus Berry")).toBe(true);
    expect(items?.has("Lum Berry")).toBe(true);
    // NOT in Champions
    expect(items?.has("Life Orb")).toBe(false);
    expect(items?.has("Choice Band")).toBe(false);
    expect(items?.has("Assault Vest")).toBe(false);
    // Total: 30 + 59 + 28 = 117
    expect(items?.size).toBe(117);
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
    const legal = getLegalMoves("Incineroar", "championsvgc2026regma");
    expect(legal).toBeInstanceOf(Set);
    expect(legal?.has("Fake Out")).toBe(true);
    expect(legal?.has("Hyperspace Hole")).toBe(false);
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
    const tera = getLegalTeraTypes("gen9vgc2026regi");
    expect(tera?.size).toBe(18);
    expect(tera?.has("Fire")).toBe(true);
  });

  it("returns empty set for Champions M-A (no Tera — only Megas)", () => {
    const tera = getLegalTeraTypes("championsvgc2026regma");
    expect(tera?.size).toBe(0);
  });

  it("returns empty set when format has Terastal Clause ([Gen 9] Monotype)", () => {
    const tera = getLegalTeraTypes("gen9monotype");
    expect(tera?.size).toBe(0);
  });

  it("returns undefined for unknown formats (permissive)", () => {
    expect(getLegalTeraTypes("unknown-format-id")).toBeUndefined();
    expect(isLegalTeraType("Fire", "unknown-format-id")).toBe(true);
  });

  it("isLegalTeraType returns true for empty string (no tera selected)", () => {
    expect(isLegalTeraType("", "championsvgc2026regma")).toBe(true);
  });

  it("isLegalTeraType returns false for a type in a no-Tera format", () => {
    expect(isLegalTeraType("Fire", "championsvgc2026regma")).toBe(false);
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
    const legal = getLegalAbilities("Incineroar", "gen9vgc2026regi");
    expect(legal?.has("Intimidate")).toBe(true);
    expect(legal?.has("Blaze")).toBe(true);
  });

  it("returns undefined for unknown formats (permissive)", () => {
    expect(getLegalAbilities("Pikachu", "unknown-format-id")).toBeUndefined();
    expect(isLegalAbility("Static", "Pikachu", "unknown-format-id")).toBe(true);
  });

  it("returns all species abilities for Champions (no ability banlist)", () => {
    const legal = getLegalAbilities("Incineroar", "championsvgc2026regma");
    expect(legal).toBeInstanceOf(Set);
    expect(legal?.has("Intimidate")).toBe(true);
    expect(legal?.has("Blaze")).toBe(true);
  });

  it("isLegalAbility returns true for empty string (no ability selected)", () => {
    expect(isLegalAbility("", "Pikachu", "gen9vgc2026regi")).toBe(true);
  });
});
