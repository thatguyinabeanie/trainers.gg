import {
  getMoveType,
  getMoveCategory,
  getMoveBP,
  getMoveData,
} from "../move-data";
import { REG_MA_BUNDLE } from "../champions-reg-ma";
import { REG_MB_BUNDLE } from "../champions-reg-mb";

// Champions format IDs used in tests
const CHAMPIONS_MA_ID = "gen9championsvgc2026regma";
const CHAMPIONS_MB_ID = "gen9championsvgc2026regmb";

describe("getMoveType", () => {
  it("returns the type of a known move", () => {
    expect(getMoveType("Thunderbolt")).toBe("Electric");
  });

  it("returns the correct type for a Fire-type move", () => {
    expect(getMoveType("Flamethrower")).toBe("Fire");
  });

  it("returns the correct type for a Ground-type move", () => {
    expect(getMoveType("Earthquake")).toBe("Ground");
  });

  it("returns null for an unknown move", () => {
    expect(getMoveType("NotARealMove")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getMoveType("")).toBeNull();
  });

  it.each<[string, string]>([
    ["Protect", "Normal"],
    ["Fake Out", "Normal"],
    ["Ice Beam", "Ice"],
    ["Dark Pulse", "Dark"],
  ])("returns correct type for %s", (move, expectedType) => {
    expect(getMoveType(move)).toBe(expectedType);
  });
});

describe("getMoveCategory", () => {
  it("returns Special for Thunderbolt", () => {
    expect(getMoveCategory("Thunderbolt")).toBe("Special");
  });

  it("returns Physical for Earthquake", () => {
    expect(getMoveCategory("Earthquake")).toBe("Physical");
  });

  it("returns Status for Protect", () => {
    expect(getMoveCategory("Protect")).toBe("Status");
  });

  it("returns null for an unknown move", () => {
    expect(getMoveCategory("NotARealMove")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getMoveCategory("")).toBeNull();
  });

  it.each<[string, string]>([
    ["Fake Out", "Physical"],
    ["Ice Beam", "Special"],
    ["Flamethrower", "Special"],
    ["Close Combat", "Physical"],
    ["Tailwind", "Status"],
    ["Follow Me", "Status"],
  ])("returns correct category for %s", (move, expectedCategory) => {
    expect(getMoveCategory(move)).toBe(expectedCategory);
  });
});

describe("getMoveBP", () => {
  it("returns base power for Thunderbolt", () => {
    // Thunderbolt has base power 90 in gen9
    expect(getMoveBP("Thunderbolt")).toBe(90);
  });

  it("returns base power for Earthquake (100)", () => {
    expect(getMoveBP("Earthquake")).toBe(100);
  });

  it("returns null for Protect (status move with no base power)", () => {
    expect(getMoveBP("Protect")).toBeNull();
  });

  it("returns null for Tailwind (status move)", () => {
    expect(getMoveBP("Tailwind")).toBeNull();
  });

  it("returns null for an unknown move", () => {
    expect(getMoveBP("NotARealMove")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getMoveBP("")).toBeNull();
  });

  it.each<[string, number]>([
    ["Flamethrower", 90],
    ["Ice Beam", 90],
    ["Close Combat", 120],
    ["Fake Out", 40],
  ])("returns correct base power for %s", (move, expectedBP) => {
    expect(getMoveBP(move)).toBe(expectedBP);
  });
});

describe("getMoveData", () => {
  it("returns null for an unknown move", () => {
    expect(getMoveData("NotARealMove")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getMoveData("")).toBeNull();
  });

  it("returns full move data for Thunderbolt", () => {
    const data = getMoveData("Thunderbolt");
    expect(data).not.toBeNull();
    expect(data?.name).toBe("Thunderbolt");
    expect(data?.type).toBe("Electric");
    expect(data?.category).toBe("Special");
    expect(data?.basePower).toBe(90);
    expect(data?.shortDesc).toBeTruthy();
  });

  it("returns full move data for Earthquake", () => {
    const data = getMoveData("Earthquake");
    expect(data).not.toBeNull();
    expect(data?.name).toBe("Earthquake");
    expect(data?.type).toBe("Ground");
    expect(data?.category).toBe("Physical");
    expect(data?.basePower).toBe(100);
  });

  it("returns full move data for Protect (status move)", () => {
    const data = getMoveData("Protect");
    expect(data).not.toBeNull();
    expect(data?.name).toBe("Protect");
    expect(data?.type).toBe("Normal");
    expect(data?.category).toBe("Status");
    expect(data?.basePower).toBe(0);
  });

  it("returns accuracy as a number for standard moves", () => {
    const data = getMoveData("Thunderbolt");
    expect(data).not.toBeNull();
    expect(typeof data?.accuracy === "number" || data?.accuracy === true).toBe(
      true
    );
  });

  it("returns accuracy as true for moves that always hit", () => {
    // Aerial Ace always hits
    const data = getMoveData("Aerial Ace");
    expect(data).not.toBeNull();
    expect(data?.accuracy).toBe(true);
  });

  it("returns a shortDesc string for every found move", () => {
    const data = getMoveData("Ice Beam");
    expect(data).not.toBeNull();
    expect(typeof data?.shortDesc).toBe("string");
  });

  it.each<[string, string, string, number]>([
    ["Flamethrower", "Fire", "Special", 90],
    ["Close Combat", "Fighting", "Physical", 120],
    ["Tailwind", "Flying", "Status", 0],
    ["Fake Out", "Normal", "Physical", 40],
    ["Dazzling Gleam", "Fairy", "Special", 80],
    ["Knock Off", "Dark", "Physical", 65],
  ])(
    "getMoveData(%s) returns type=%s, category=%s, basePower=%d",
    (move, type, category, basePower) => {
      const data = getMoveData(move);
      expect(data).not.toBeNull();
      expect(data?.type).toBe(type);
      expect(data?.category).toBe(category);
      expect(data?.basePower).toBe(basePower);
    }
  );
});

// =============================================================================
// Champions format-aware getMoveData
// =============================================================================

describe("getMoveData — Champions format overrides", () => {
  // -------------------------------------------------------------------------
  // Base power overrides
  // -------------------------------------------------------------------------
  it("First Impression: basePower 90→100 in Champions M-B", () => {
    const vanilla = getMoveData("First Impression");
    expect(vanilla?.basePower).toBe(90); // vanilla @pkmn/dex value

    const champions = getMoveData("First Impression", CHAMPIONS_MB_ID);
    expect(champions?.basePower).toBe(100);
  });

  it("First Impression: basePower 90→100 in Champions M-A", () => {
    const champions = getMoveData("First Impression", CHAMPIONS_MA_ID);
    expect(champions?.basePower).toBe(100);
  });

  it("Beak Blast: basePower 100→120 in Champions M-B", () => {
    const vanilla = getMoveData("Beak Blast");
    expect(vanilla?.basePower).toBe(100);

    const champions = getMoveData("Beak Blast", CHAMPIONS_MB_ID);
    expect(champions?.basePower).toBe(120);
  });

  it("Mountain Gale: basePower 100→120 in Champions M-B", () => {
    const champions = getMoveData("Mountain Gale", CHAMPIONS_MB_ID);
    expect(champions?.basePower).toBe(120);
  });

  it("Bone Rush: basePower 25→30 in Champions M-B", () => {
    const vanilla = getMoveData("Bone Rush");
    expect(vanilla?.basePower).toBe(25);

    const champions = getMoveData("Bone Rush", CHAMPIONS_MB_ID);
    expect(champions?.basePower).toBe(30);
  });

  // -------------------------------------------------------------------------
  // Type overrides
  // -------------------------------------------------------------------------
  it("Snap Trap: type Grass→Steel in Champions M-B", () => {
    // Snap Trap is Grass-type in vanilla @pkmn/dex Gen 9
    const vanilla = getMoveData("Snap Trap");
    expect(vanilla?.type).toBe("Grass");

    const champions = getMoveData("Snap Trap", CHAMPIONS_MB_ID);
    expect(champions?.type).toBe("Steel");
  });

  it("Snap Trap: type Grass→Steel in Champions M-A", () => {
    const champions = getMoveData("Snap Trap", CHAMPIONS_MA_ID);
    expect(champions?.type).toBe("Steel");
  });

  it("Growth: type Normal→Grass in Champions M-B", () => {
    const vanilla = getMoveData("Growth");
    expect(vanilla?.type).toBe("Normal");

    const champions = getMoveData("Growth", CHAMPIONS_MB_ID);
    expect(champions?.type).toBe("Grass");
  });

  // -------------------------------------------------------------------------
  // Accuracy overrides
  // -------------------------------------------------------------------------
  it("Make It Rain: accuracy 100→95 in Champions M-B", () => {
    const vanilla = getMoveData("Make It Rain");
    expect(vanilla?.accuracy).toBe(100);

    const champions = getMoveData("Make It Rain", CHAMPIONS_MB_ID);
    expect(champions?.accuracy).toBe(95);
  });

  it("Crabhammer: accuracy 90→95 in Champions M-B", () => {
    const vanilla = getMoveData("Crabhammer");
    expect(vanilla?.accuracy).toBe(90);

    const champions = getMoveData("Crabhammer", CHAMPIONS_MB_ID);
    expect(champions?.accuracy).toBe(95);
  });

  it("Syrup Bomb: accuracy 85→90 in Champions M-B", () => {
    const vanilla = getMoveData("Syrup Bomb");
    expect(vanilla?.accuracy).toBe(85);

    const champions = getMoveData("Syrup Bomb", CHAMPIONS_MB_ID);
    expect(champions?.accuracy).toBe(90);
  });

  // -------------------------------------------------------------------------
  // Non-Champions formats: vanilla values unchanged
  // -------------------------------------------------------------------------
  it("First Impression: basePower stays 90 in non-Champions format", () => {
    const sv = getMoveData("First Impression", "gen9vgc2026regi");
    expect(sv?.basePower).toBe(90);
  });

  it("Snap Trap: type stays Grass (vanilla) in non-Champions format", () => {
    // Vanilla @pkmn/dex Gen 9 type for Snap Trap is Grass
    const sv = getMoveData("Snap Trap", "gen9vgc2026regi");
    expect(sv?.type).toBe("Grass");
  });

  it("Make It Rain: accuracy stays 100 in non-Champions format", () => {
    const sv = getMoveData("Make It Rain", "gen9vgc2026regi");
    expect(sv?.accuracy).toBe(100);
  });

  it("getMoveData with null formatId behaves like no format", () => {
    const noFormat = getMoveData("First Impression");
    const nullFormat = getMoveData("First Impression", null);
    expect(nullFormat?.basePower).toBe(noFormat?.basePower);
    expect(nullFormat?.type).toBe(noFormat?.type);
  });

  it("getMoveData with unknown format ID returns vanilla values", () => {
    const unknown = getMoveData("First Impression", "gen9unknownformat");
    expect(unknown?.basePower).toBe(90); // vanilla
  });

  it("getMoveData returns null for unknown move even with Champions format", () => {
    expect(getMoveData("NotARealMove", CHAMPIONS_MB_ID)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Unchanged moves: Champions format doesn't alter unregistered moves
  // -------------------------------------------------------------------------
  it("Thunderbolt: unchanged in Champions M-B (no override entry)", () => {
    const vanilla = getMoveData("Thunderbolt");
    const champions = getMoveData("Thunderbolt", CHAMPIONS_MB_ID);
    expect(champions?.basePower).toBe(vanilla?.basePower);
    expect(champions?.type).toBe(vanilla?.type);
    expect(champions?.accuracy).toBe(vanilla?.accuracy);
  });
});

// =============================================================================
// Bundle inheritance: M-B ⊇ M-A moveChanges
// =============================================================================

describe("Champions regulation bundles — moveChanges inheritance", () => {
  it("REG_MB_BUNDLE.moveChanges contains all keys from REG_MA_BUNDLE.moveChanges", () => {
    for (const key of REG_MA_BUNDLE.moveChanges.keys()) {
      expect(REG_MB_BUNDLE.moveChanges.has(key)).toBe(true);
    }
  });

  it("REG_MB_BUNDLE.moveChanges is reference-equal to REG_MA_BUNDLE.moveChanges (no extra M-B changes)", () => {
    // M-B has no new move changes — it should reuse the same map object
    expect(REG_MB_BUNDLE.moveChanges).toBe(REG_MA_BUNDLE.moveChanges);
  });

  it("REG_MA_BUNDLE.moveChanges includes expected Champions-wide entries", () => {
    expect(REG_MA_BUNDLE.moveChanges.has("First Impression")).toBe(true);
    expect(REG_MA_BUNDLE.moveChanges.has("Snap Trap")).toBe(true);
    expect(REG_MA_BUNDLE.moveChanges.has("Make It Rain")).toBe(true);
    expect(REG_MA_BUNDLE.moveChanges.has("Beak Blast")).toBe(true);
    expect(REG_MA_BUNDLE.moveChanges.has("Mountain Gale")).toBe(true);
  });

  it("First Impression entry has correct Champions values", () => {
    const change = REG_MA_BUNDLE.moveChanges.get("First Impression");
    expect(change?.basePower).toBe(100);
    expect(change?.pp).toBe(12);
  });

  it("Snap Trap entry reflects the Steel type change", () => {
    const change = REG_MA_BUNDLE.moveChanges.get("Snap Trap");
    expect(change?.type).toBe("Steel");
  });

  it("Make It Rain entry reflects accuracy decrease", () => {
    const change = REG_MA_BUNDLE.moveChanges.get("Make It Rain");
    expect(change?.accuracy).toBe(95);
  });

  it("Dire Claw entry includes Slicing flag", () => {
    const change = REG_MA_BUNDLE.moveChanges.get("Dire Claw");
    expect(change?.flags).toContain("Slicing");
  });

  it("Dragon Cheer entry includes Sound flag", () => {
    const change = REG_MA_BUNDLE.moveChanges.get("Dragon Cheer");
    expect(change?.flags).toContain("Sound");
  });

  it("Growth entry includes source note", () => {
    const change = REG_MA_BUNDLE.moveChanges.get("Growth");
    expect(change?.note).toMatch(/Serebii/);
  });

  it("Poltergeist entry includes source note", () => {
    const change = REG_MA_BUNDLE.moveChanges.get("Poltergeist");
    expect(change?.note).toMatch(/Smogon/);
  });
});
