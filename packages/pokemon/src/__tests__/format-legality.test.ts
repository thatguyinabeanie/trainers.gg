import {
  getLegalItems,
  getLegalSpecies,
  isLegalItem,
  isLegalSpecies,
} from "../format-legality";

describe("format-legality — Champions M-A", () => {
  const CHAMPIONS = "championsvgc2026regma";

  it("marks Incineroar as legal in Champions M-A", () => {
    expect(isLegalSpecies("Incineroar", CHAMPIONS)).toBe(true);
  });

  it("marks Landorus-Therian as illegal in Champions M-A", () => {
    expect(isLegalSpecies("Landorus-Therian", CHAMPIONS)).toBe(false);
  });

  it("returns a ReadonlySet for Champions M-A", () => {
    const legal = getLegalSpecies(CHAMPIONS);
    expect(legal).toBeInstanceOf(Set);
    expect(legal?.size).toBe(217);
  });

  it("excludes Mega forms (they're item-driven, not separately selectable)", () => {
    const legal = getLegalSpecies(CHAMPIONS);
    expect(legal?.has("Mega Venusaur")).toBe(false);
    expect(legal?.has("Mega Charizard X")).toBe(false);
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

  // Champions item legality is currently permissive (see TODO(champions-items)
  // in format-legality.ts) — no authoritative published list exists yet, so we
  // skip the Champions-specific assertions until rules are sourced.
  it.skip("returns a ReadonlySet for Champions M-A", () => {
    const items = getLegalItems("championsvgc2026regma");
    expect(items).toBeInstanceOf(Set);
    expect(items?.has("Life Orb")).toBe(true);
    expect(items?.size).toBeGreaterThan(20);
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
});
