import { getFormatById, type GameFormat } from "@trainers/pokemon";

import {
  formatSupportsDynamax,
  formatSupportsIvs,
  formatSupportsTera,
} from "../format-gating";

// =============================================================================
// Minimal typed mocks for generations that lack a real format in the registry
// (gen 5 and below are not present in VGC_FORMATS).
// =============================================================================

function makeFormat(generation: number): GameFormat {
  return {
    id: `gen${generation}vgctest`,
    game: "Test Game",
    gameShort: "TG",
    generation,
    category: "VGC",
    year: 2020,
    regulation: null,
    label: `Gen ${generation} Test`,
    showdownName: `[Gen ${generation}] Test`,
    doubles: true,
    active: false,
  };
}

// Real formats retrieved from the registry for the key generations.
const gen9Format = getFormatById("gen9vgc2026regi"); // Scarlet & Violet — has Tera
const gen8Format = getFormatById("gen8vgc2022"); // Sword & Shield — Dynamax
const gen7Format = getFormatById("gen7vgc2019ultraseries"); // Sun & Moon — Z-Moves + Mega
const gen6Format = getFormatById("gen6vgc2016"); // X & Y — Mega only

// =============================================================================
// formatSupportsTera
// =============================================================================

describe("formatSupportsTera", () => {
  it("returns true for a gen 9 format (Scarlet & Violet)", () => {
    expect(formatSupportsTera(gen9Format)).toBe(true);
  });

  it("returns false for gen 8 (no Tera in Sword & Shield)", () => {
    expect(formatSupportsTera(gen8Format)).toBe(false);
  });

  it("returns false for gen 7 (Sun & Moon)", () => {
    expect(formatSupportsTera(gen7Format)).toBe(false);
  });

  it("returns false for gen 6 (X & Y)", () => {
    expect(formatSupportsTera(gen6Format)).toBe(false);
  });

  it("returns false for Pokemon Champions (no Tera in Champions rules)", () => {
    const championsFormat = getFormatById("gen9championsvgc2026regma");
    expect(formatSupportsTera(championsFormat)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(formatSupportsTera(undefined)).toBe(false);
  });
});

// =============================================================================
// formatSupportsIvs
// =============================================================================

describe("formatSupportsIvs", () => {
  it("returns true for Scarlet & Violet (gen 9 IV system)", () => {
    expect(formatSupportsIvs(gen9Format)).toBe(true);
  });

  it("returns true for Sword & Shield", () => {
    expect(formatSupportsIvs(gen8Format)).toBe(true);
  });

  it("returns false for Pokemon Champions (SP system, no IVs)", () => {
    const championsFormat = getFormatById("gen9championsvgc2026regma");
    expect(formatSupportsIvs(championsFormat)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(formatSupportsIvs(undefined)).toBe(false);
  });
});

// =============================================================================
// formatSupportsDynamax
// =============================================================================

describe("formatSupportsDynamax", () => {
  it("returns true for gen 8 (Sword & Shield)", () => {
    expect(formatSupportsDynamax(gen8Format)).toBe(true);
  });

  it("returns false for gen 9 (no Dynamax in SV)", () => {
    expect(formatSupportsDynamax(gen9Format)).toBe(false);
  });

  it("returns false for gen 7", () => {
    expect(formatSupportsDynamax(gen7Format)).toBe(false);
  });

  it("returns false for gen 6", () => {
    expect(formatSupportsDynamax(gen6Format)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(formatSupportsDynamax(undefined)).toBe(false);
  });

  it.each([5, 4, 3])("returns false for gen %i (pre-Dynamax)", (gen) => {
    expect(formatSupportsDynamax(makeFormat(gen))).toBe(false);
  });
});
