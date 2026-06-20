import {
  VGC_FORMATS,
  POKEMON_GAMES,
  ALL_FORMAT_IDS,
  getFormatById,
  getFormatLabel,
  getActiveFormats,
  getAvailableGames,
  getFormatsByGame,
  isChampionsFormat,
  isChampionsFormatId,
  formatHasTera,
} from "../formats";

describe("getFormatById", () => {
  it("returns the correct format for a known ID", () => {
    const format = getFormatById("gen9vgc2026regi");

    expect(format).toBeDefined();
    expect(format?.id).toBe("gen9vgc2026regi");
    expect(format?.game).toBe("Scarlet & Violet");
    expect(format?.generation).toBe(9);
    expect(format?.year).toBe(2026);
    expect(format?.regulation).toBe("I");
    expect(format?.label).toBe("SV: Reg I");
  });

  it("returns the correct format for gen9championsvgc2026regma", () => {
    const format = getFormatById("gen9championsvgc2026regma");

    expect(format).toBeDefined();
    expect(format?.id).toBe("gen9championsvgc2026regma");
    expect(format?.game).toBe("Pokemon Champions");
    // Champions runs on gen 9 mechanics (gen 10 is reserved for Winds &
    // Waves). Champions-specific behaviors discriminate on gameShort.
    expect(format?.generation).toBe(9);
    expect(format?.gameShort).toBe("Champions");
    // Reg M-A was superseded by Reg M-B on 2026-06-17, so it is now inactive.
    expect(format?.active).toBe(false);
  });

  it("returns undefined for an unknown ID", () => {
    expect(getFormatById("nonexistent-format-xyz")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getFormatById("")).toBeUndefined();
  });
});

describe("getFormatLabel", () => {
  it("returns the label for a known ID", () => {
    expect(getFormatLabel("gen9vgc2026regi")).toBe("SV: Reg I");
  });

  it("returns the label for another known ID", () => {
    expect(getFormatLabel("gen9championsvgc2026regma")).toBe("Champions: Reg M-A");
  });

  it("returns the raw ID string for an unknown ID", () => {
    const unknownId = "some-custom-format-2099";
    expect(getFormatLabel(unknownId)).toBe(unknownId);
  });

  it("returns the raw ID string for an empty string", () => {
    expect(getFormatLabel("")).toBe("");
  });
});

describe("getActiveFormats", () => {
  it("returns only formats where active is true", () => {
    const activeFormats = getActiveFormats();

    expect(activeFormats.length).toBeGreaterThan(0);
    expect(activeFormats.every((f) => f.active)).toBe(true);
  });

  it("excludes inactive formats", () => {
    const activeFormats = getActiveFormats();
    const activeIds = new Set(activeFormats.map((f) => f.id));

    // gen9vgc2026regf is explicitly inactive
    expect(activeIds.has("gen9vgc2026regf")).toBe(false);
    // gen8vgc2022 is inactive
    expect(activeIds.has("gen8vgc2022")).toBe(false);
  });

  it("includes gen9vgc2026regi and gen9championsvgc2026regmb as active", () => {
    const activeFormats = getActiveFormats();
    const activeIds = activeFormats.map((f) => f.id);

    expect(activeIds).toContain("gen9vgc2026regi");
    // Champions Reg M-B superseded Reg M-A on 2026-06-17.
    expect(activeIds).toContain("gen9championsvgc2026regmb");
    expect(activeIds).not.toContain("gen9championsvgc2026regma");
  });

  it("active formats count matches the number of active=true entries in VGC_FORMATS", () => {
    const expected = VGC_FORMATS.filter((f) => f.active).length;
    expect(getActiveFormats()).toHaveLength(expected);
  });
});

describe("getAvailableGames", () => {
  it("returns unique games — no duplicates", () => {
    const games = getAvailableGames();
    const names = games.map((g) => g.name);
    const uniqueNames = new Set(names);

    expect(names.length).toBe(uniqueNames.size);
  });

  it("includes Pokemon Champions", () => {
    const games = getAvailableGames();
    const names = games.map((g) => g.name);

    expect(names).toContain("Pokemon Champions");
  });

  it("includes Scarlet & Violet", () => {
    const games = getAvailableGames();
    expect(games.map((g) => g.name)).toContain("Scarlet & Violet");
  });

  it("preserves shortName and generation for each game", () => {
    const games = getAvailableGames();
    const champions = games.find((g) => g.name === "Pokemon Champions");

    expect(champions?.shortName).toBe("Champions");
    // Champions uses gen 9 mechanics — gen 10 is reserved for Winds & Waves.
    expect(champions?.generation).toBe(9);

    const sv = games.find((g) => g.name === "Scarlet & Violet");
    expect(sv?.shortName).toBe("SV");
    expect(sv?.generation).toBe(9);
  });

  it("returns games in order from newest to oldest (first entry is newest)", () => {
    const games = getAvailableGames();
    // Pokemon Champions (gen 10) should appear before Scarlet & Violet (gen 9)
    const champIdx = games.findIndex((g) => g.name === "Pokemon Champions");
    const svIdx = games.findIndex((g) => g.name === "Scarlet & Violet");

    expect(champIdx).toBeGreaterThanOrEqual(0);
    expect(svIdx).toBeGreaterThanOrEqual(0);
    expect(champIdx).toBeLessThan(svIdx);
  });
});

describe("getFormatsByGame", () => {
  it("returns only formats for the specified game", () => {
    const svFormats = getFormatsByGame("Scarlet & Violet");

    expect(svFormats.length).toBeGreaterThan(0);
    expect(svFormats.every((f) => f.game === "Scarlet & Violet")).toBe(true);
  });

  it("does not include formats from other games", () => {
    const svFormats = getFormatsByGame("Scarlet & Violet");
    expect(svFormats.some((f) => f.game === "Pokemon Champions")).toBe(false);
    expect(svFormats.some((f) => f.game === "Sword & Shield")).toBe(false);
  });

  it("returns an empty array for an unknown game name", () => {
    expect(getFormatsByGame("NonExistent Game")).toEqual([]);
  });

  it("returns Pokemon Champions formats correctly", () => {
    const champFormats = getFormatsByGame("Pokemon Champions");

    expect(champFormats.length).toBeGreaterThan(0);
    expect(champFormats.every((f) => f.game === "Pokemon Champions")).toBe(
      true
    );
  });

  it("returns all Sword & Shield formats", () => {
    const swshFormats = getFormatsByGame("Sword & Shield");
    const swshIds = swshFormats.map((f) => f.id);

    expect(swshIds).toContain("gen8vgc2022");
    expect(swshIds).toContain("gen8vgc2020");
  });
});

describe("ALL_FORMAT_IDS", () => {
  it("contains every format ID from VGC_FORMATS in order", () => {
    const expectedIds = VGC_FORMATS.map((f) => f.id);
    expect(ALL_FORMAT_IDS).toEqual(expectedIds);
  });

  it("has the same length as VGC_FORMATS", () => {
    expect(ALL_FORMAT_IDS).toHaveLength(VGC_FORMATS.length);
  });

  it("contains gen9vgc2026regi", () => {
    expect(ALL_FORMAT_IDS).toContain("gen9vgc2026regi");
  });

  it("all IDs are strings", () => {
    expect(ALL_FORMAT_IDS.every((id) => typeof id === "string")).toBe(true);
  });
});

describe("POKEMON_GAMES", () => {
  it("defines Pokemon Champions on gen 9 mechanics (gen 10 reserved for Winds & Waves)", () => {
    expect(POKEMON_GAMES.champions.generation).toBe(9);
    expect(POKEMON_GAMES.champions.name).toBe("Pokemon Champions");
    expect(POKEMON_GAMES.champions.shortName).toBe("Champions");
  });

  it("defines Scarlet & Violet as generation 9", () => {
    expect(POKEMON_GAMES.scarletViolet.generation).toBe(9);
    expect(POKEMON_GAMES.scarletViolet.name).toBe("Scarlet & Violet");
    expect(POKEMON_GAMES.scarletViolet.shortName).toBe("SV");
  });

  it("defines all seven games", () => {
    const keys = Object.keys(POKEMON_GAMES);
    expect(keys).toHaveLength(7);
    expect(keys).toContain("champions");
    expect(keys).toContain("scarletViolet");
    expect(keys).toContain("swordShield");
    expect(keys).toContain("sunMoon");
    expect(keys).toContain("xy");
    expect(keys).toContain("blackWhite");
    expect(keys).toContain("diamondPearl");
  });

  it("generations decrease from Scarlet & Violet (9) to Diamond & Pearl (4)", () => {
    // Champions shares gen 9 with Scarlet & Violet (uses SV mechanics);
    // discriminate Champions via gameShort instead of generation.
    expect(POKEMON_GAMES.champions.generation).toBe(
      POKEMON_GAMES.scarletViolet.generation
    );
    expect(POKEMON_GAMES.scarletViolet.generation).toBeGreaterThan(
      POKEMON_GAMES.swordShield.generation
    );
    expect(POKEMON_GAMES.diamondPearl.generation).toBe(4);
  });
});

describe("VGC_FORMATS registry", () => {
  it("contains gen9vgc2026regi", () => {
    const entry = VGC_FORMATS.find((f) => f.id === "gen9vgc2026regi");

    expect(entry).toBeDefined();
    expect(entry?.active).toBe(true);
    expect(entry?.doubles).toBe(true);
    expect(entry?.category).toBe("VGC");
  });

  it("contains gen9championsvgc2026regma", () => {
    const entry = VGC_FORMATS.find((f) => f.id === "gen9championsvgc2026regma");

    expect(entry).toBeDefined();
    // Reg M-A is retained in the registry but inactive after the M-B cutover.
    expect(entry?.active).toBe(false);
    expect(entry?.doubles).toBe(true);
    expect(entry?.generation).toBe(9);
    expect(entry?.gameShort).toBe("Champions");
    expect(entry?.label).toBe("Champions: Reg M-A");
  });

  it("all entries have required fields populated", () => {
    for (const format of VGC_FORMATS) {
      expect(format.id).toBeTruthy();
      expect(format.game).toBeTruthy();
      expect(format.gameShort).toBeTruthy();
      expect(format.generation).toBeGreaterThan(0);
      expect(format.category).toBeTruthy();
      expect(format.year).toBeGreaterThan(0);
      expect(format.label).toBeTruthy();
      expect(format.showdownName).toBeTruthy();
      expect(typeof format.doubles).toBe("boolean");
      expect(typeof format.active).toBe("boolean");
    }
  });

  it("all IDs are unique", () => {
    const ids = VGC_FORMATS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all formats have doubles=true (VGC is a doubles format)", () => {
    expect(VGC_FORMATS.every((f) => f.doubles)).toBe(true);
  });
});

// =============================================================================
// Champions M-B format registration tests
// =============================================================================

describe("getFormatById — Champions M-B", () => {
  const MB_ID = "gen9championsvgc2026regmb";
  const MA_ID = "gen9championsvgc2026regma";

  it("returns a defined entry for gen9championsvgc2026regmb", () => {
    expect(getFormatById(MB_ID)).toBeDefined();
  });

  it("M-B format has active: true", () => {
    expect(getFormatById(MB_ID)?.active).toBe(true);
  });

  it("M-B format has regulation: 'M-B'", () => {
    expect(getFormatById(MB_ID)?.regulation).toBe("M-B");
  });

  it("M-B format has label 'Champions: Reg M-B'", () => {
    expect(getFormatById(MB_ID)?.label).toBe("Champions: Reg M-B");
  });

  it("M-B format is a Pokemon Champions format (gameShort === 'Champions')", () => {
    const format = getFormatById(MB_ID);
    expect(format?.gameShort).toBe("Champions");
  });

  it("M-B format has generation 9 (runs on SV mechanics)", () => {
    expect(getFormatById(MB_ID)?.generation).toBe(9);
  });

  it("M-B format has game 'Pokemon Champions'", () => {
    expect(getFormatById(MB_ID)?.game).toBe("Pokemon Champions");
  });

  it("M-B format has doubles: true", () => {
    expect(getFormatById(MB_ID)?.doubles).toBe(true);
  });

  it("M-A format is now active: false (superseded by M-B)", () => {
    expect(getFormatById(MA_ID)?.active).toBe(false);
  });

  it("isChampionsFormat returns true for M-B format object", () => {
    const format = getFormatById(MB_ID);
    expect(isChampionsFormat(format)).toBe(true);
  });

  it("isChampionsFormatId returns true for M-B format ID string", () => {
    expect(isChampionsFormatId(MB_ID)).toBe(true);
  });

  it("formatHasTera returns false for M-B (Champions does not support Tera)", () => {
    const format = getFormatById(MB_ID);
    expect(formatHasTera(format)).toBe(false);
  });
});

describe("getActiveFormats — Champions M-B", () => {
  const MB_ID = "gen9championsvgc2026regmb";
  const MA_ID = "gen9championsvgc2026regma";

  it("includes M-B in active formats", () => {
    const activeIds = getActiveFormats().map((f) => f.id);
    expect(activeIds).toContain(MB_ID);
  });

  it("does NOT include M-A in active formats (superseded by M-B)", () => {
    const activeIds = getActiveFormats().map((f) => f.id);
    expect(activeIds).not.toContain(MA_ID);
  });
});

describe("getFormatLabel — Champions M-B", () => {
  it("returns 'Champions: Reg M-B' for the M-B format ID", () => {
    expect(getFormatLabel("gen9championsvgc2026regmb")).toBe("Champions: Reg M-B");
  });
});

describe("VGC_FORMATS registry — Champions M-B", () => {
  it("contains gen9championsvgc2026regmb entry", () => {
    const entry = VGC_FORMATS.find((f) => f.id === "gen9championsvgc2026regmb");
    expect(entry).toBeDefined();
    expect(entry?.active).toBe(true);
    expect(entry?.regulation).toBe("M-B");
    expect(entry?.gameShort).toBe("Champions");
  });

  it("M-B appears before M-A in VGC_FORMATS (newest first)", () => {
    const mbIdx = VGC_FORMATS.findIndex((f) => f.id === "gen9championsvgc2026regmb");
    const maIdx = VGC_FORMATS.findIndex((f) => f.id === "gen9championsvgc2026regma");
    expect(mbIdx).toBeGreaterThanOrEqual(0);
    expect(maIdx).toBeGreaterThanOrEqual(0);
    expect(mbIdx).toBeLessThan(maIdx);
  });

  it("ALL_FORMAT_IDS contains gen9championsvgc2026regmb", () => {
    expect(ALL_FORMAT_IDS).toContain("gen9championsvgc2026regmb");
  });
});
