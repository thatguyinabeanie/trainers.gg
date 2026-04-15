import { getLegalSpecies, isLegalSpecies } from "../format-legality";

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
