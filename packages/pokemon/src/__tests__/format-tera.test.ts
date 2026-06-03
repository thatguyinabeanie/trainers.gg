import { type GameFormat, formatHasTera, getFormatById } from "../formats";

// =============================================================================
// formatHasTera
// =============================================================================

describe("formatHasTera", () => {
  // ---------------------------------------------------------------------------
  // Champions formats — should return false
  // ---------------------------------------------------------------------------

  it("returns false for the Champions Reg M-A format (no Terastal)", () => {
    const format = getFormatById("gen9championsvgc2026regma");
    expect(formatHasTera(format)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // VGC Gen 9 (Scarlet & Violet) formats — should return true
  // ---------------------------------------------------------------------------

  it("returns true for Gen 9 VGC 2026 Reg I (active SV format)", () => {
    const format = getFormatById("gen9vgc2026regi");
    expect(formatHasTera(format)).toBe(true);
  });

  it("returns true for Gen 9 VGC 2026 Reg F (inactive SV format)", () => {
    const format = getFormatById("gen9vgc2026regf");
    expect(formatHasTera(format)).toBe(true);
  });

  it("returns true for Gen 9 VGC 2024 Reg G", () => {
    const format = getFormatById("gen9vgc2024regg");
    expect(formatHasTera(format)).toBe(true);
  });

  it("returns true for Gen 9 VGC 2023 Reg A (first SV format)", () => {
    const format = getFormatById("gen9vgc2023rega");
    expect(formatHasTera(format)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Pre-Gen 9 formats — should return false (no Terastal mechanic exists)
  // ---------------------------------------------------------------------------

  it("returns false for Gen 8 (Sword & Shield) VGC 2022", () => {
    const format = getFormatById("gen8vgc2022");
    expect(formatHasTera(format)).toBe(false);
  });

  it("returns false for Gen 7 (Sun & Moon) VGC 2019 Ultra Series", () => {
    const format = getFormatById("gen7vgc2019ultraseries");
    expect(formatHasTera(format)).toBe(false);
  });

  it("returns false for Gen 4 (Diamond & Pearl) VGC 2009", () => {
    const format = getFormatById("gen4vgc2009");
    expect(formatHasTera(format)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Null / undefined safety
  // ---------------------------------------------------------------------------

  it("returns false when passed undefined", () => {
    expect(formatHasTera(undefined)).toBe(false);
  });

  it("returns false when passed null", () => {
    expect(formatHasTera(null)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Inline format objects — verifies the check is generation-based
  // ---------------------------------------------------------------------------

  it("returns false for a Champions format even when generation is 9", () => {
    // Champions runs on gen 9 mechanics but disables Tera. Discrimination is
    // by gameShort === "Champions", not the generation number.
    const format: GameFormat = {
      id: "hypothetical-champions",
      game: "Pokemon Champions",
      gameShort: "Champions",
      generation: 9,
      category: "VGC",
      year: 2026,
      regulation: "B",
      label: "Champions: Reg B",
      showdownName: "[Champions] VGC 2026 Reg B",
      doubles: true,
      active: false,
    };
    expect(formatHasTera(format)).toBe(false);
  });

  it("returns true for an inline format with generation 9", () => {
    const format: GameFormat = {
      id: "hypothetical-gen9",
      game: "Scarlet & Violet",
      gameShort: "SV",
      generation: 9,
      category: "VGC",
      year: 2026,
      regulation: "Z",
      label: "SV: Reg Z",
      showdownName: "[Gen 9] VGC 2026 Reg Z",
      doubles: true,
      active: false,
    };
    expect(formatHasTera(format)).toBe(true);
  });
});
