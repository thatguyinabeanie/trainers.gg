import {
  VGC_FORMATS,
  getFormatById,
  getFormatLabel,
  getActiveFormats,
  getAvailableGames,
  getFormatsByGame,
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

  it("returns the correct format for championsvgc2026regma", () => {
    const format = getFormatById("championsvgc2026regma");

    expect(format).toBeDefined();
    expect(format?.id).toBe("championsvgc2026regma");
    expect(format?.game).toBe("Pokemon Champions");
    expect(format?.generation).toBe(10);
    expect(format?.active).toBe(true);
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
    expect(getFormatLabel("championsvgc2026regma")).toBe("Champions: Reg M-A");
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

  it("includes gen9vgc2026regi and championsvgc2026regma as active", () => {
    const activeFormats = getActiveFormats();
    const activeIds = activeFormats.map((f) => f.id);

    expect(activeIds).toContain("gen9vgc2026regi");
    expect(activeIds).toContain("championsvgc2026regma");
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
    expect(champions?.generation).toBe(10);

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

describe("VGC_FORMATS registry", () => {
  it("contains gen9vgc2026regi", () => {
    const entry = VGC_FORMATS.find((f) => f.id === "gen9vgc2026regi");

    expect(entry).toBeDefined();
    expect(entry?.active).toBe(true);
    expect(entry?.doubles).toBe(true);
    expect(entry?.category).toBe("VGC");
  });

  it("contains championsvgc2026regma", () => {
    const entry = VGC_FORMATS.find((f) => f.id === "championsvgc2026regma");

    expect(entry).toBeDefined();
    expect(entry?.active).toBe(true);
    expect(entry?.doubles).toBe(true);
    expect(entry?.generation).toBe(10);
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
