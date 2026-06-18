import {
  applySpeedModifiers,
  getSpeedTierLabel,
  groupBySpeed,
  getSpeedAffectingItems,
  type SpeedModifiers,
  type SpeedTierLabel,
} from "../speed-helpers";
import { getFormatById } from "../formats";

// =============================================================================
// applySpeedModifiers
// =============================================================================

describe("applySpeedModifiers", () => {
  describe("no modifiers", () => {
    it("returns the input speed unchanged when mods are empty", () => {
      expect(applySpeedModifiers(150, {})).toBe(150);
    });

    it("returns the input speed when status is healthy and no item/ability", () => {
      expect(applySpeedModifiers(150, { status: "healthy" })).toBe(150);
    });
  });

  describe("stat stage modifier", () => {
    it.each<[number, number, number]>([
      [100, 1, 150], // ×1.5
      [100, 2, 200], // ×2
      [100, -1, 66], // ×2/3 → floor(66.67)
      [100, -2, 50], // ×0.5
      [100, 6, 400], // max boost ×4
      [100, -6, 25], // max drop ×0.25
    ])("speed %i with stage %i → %i", (speed, stage, expected) => {
      expect(applySpeedModifiers(speed, { stage })).toBe(expected);
    });

    it("clamps stages above +6 / below -6", () => {
      expect(applySpeedModifiers(100, { stage: 12 })).toBe(400);
      expect(applySpeedModifiers(100, { stage: -12 })).toBe(25);
    });
  });

  describe("item modifier", () => {
    it("applies Choice Scarf as ×1.5", () => {
      expect(applySpeedModifiers(100, { item: "choice-scarf" })).toBe(150);
    });

    it("applies Iron Ball as ×0.5", () => {
      expect(applySpeedModifiers(100, { item: "iron-ball" })).toBe(50);
    });

    it("applies Macho Brace as ×0.5", () => {
      expect(applySpeedModifiers(100, { item: "macho-brace" })).toBe(50);
    });

    it("treats Lagging Tail as multiplier 1 (turn-order only)", () => {
      expect(applySpeedModifiers(100, { item: "lagging-tail" })).toBe(100);
    });

    it("only applies Quick Powder when isDitto is true", () => {
      expect(applySpeedModifiers(100, { item: "quick-powder" })).toBe(100);
      expect(
        applySpeedModifiers(100, { item: "quick-powder", isDitto: true })
      ).toBe(200);
    });
  });

  describe("paralysis modifier", () => {
    it("halves speed when paralyzed", () => {
      expect(applySpeedModifiers(100, { status: "paralyzed" })).toBe(50);
    });

    it("does not halve speed when ability is Quick Feet", () => {
      // Quick Feet exempts paralysis halving and adds ×1.5 itself
      expect(
        applySpeedModifiers(100, {
          status: "paralyzed",
          ability: "Quick Feet",
        })
      ).toBe(150);
    });
  });

  describe("ability + weather modifier", () => {
    it("doubles speed for Chlorophyll in sun", () => {
      expect(
        applySpeedModifiers(100, {
          ability: "Chlorophyll",
          field: { weather: "sun" },
        })
      ).toBe(200);
    });

    it("doubles speed for Swift Swim in rain", () => {
      expect(
        applySpeedModifiers(100, {
          ability: "Swift Swim",
          field: { weather: "rain" },
        })
      ).toBe(200);
    });

    it("doubles speed for Sand Rush in sand", () => {
      expect(
        applySpeedModifiers(100, {
          ability: "Sand Rush",
          field: { weather: "sand" },
        })
      ).toBe(200);
    });

    it("doubles speed for Slush Rush in snow", () => {
      expect(
        applySpeedModifiers(100, {
          ability: "Slush Rush",
          field: { weather: "snow" },
        })
      ).toBe(200);
    });

    it("does not boost when ability does not match weather", () => {
      expect(
        applySpeedModifiers(100, {
          ability: "Chlorophyll",
          field: { weather: "rain" },
        })
      ).toBe(100);
    });

    it("does not boost when no weather is active", () => {
      expect(
        applySpeedModifiers(100, {
          ability: "Chlorophyll",
          field: { weather: "none" },
        })
      ).toBe(100);
    });

    it("normalizes ability casing/spacing", () => {
      // "swift swim", "swift-swim", "swiftSwim" should all work
      expect(
        applySpeedModifiers(100, {
          ability: "swift swim",
          field: { weather: "rain" },
        })
      ).toBe(200);
      expect(
        applySpeedModifiers(100, {
          ability: "swift-swim",
          field: { weather: "rain" },
        })
      ).toBe(200);
    });
  });

  describe("tailwind", () => {
    it("doubles speed when tailwind is up", () => {
      expect(applySpeedModifiers(100, { field: { tailwind: true } })).toBe(200);
    });
  });

  describe("stacked modifiers", () => {
    it("stacks Choice Scarf + Tailwind (×1.5 × 2 = ×3)", () => {
      const mods: SpeedModifiers = {
        item: "choice-scarf",
        field: { tailwind: true },
      };
      expect(applySpeedModifiers(100, mods)).toBe(300);
    });

    it("stacks +1 stage + Choice Scarf + Tailwind", () => {
      // 100 → ×1.5 = 150 → ×1.5 = 225 → ×2 = 450
      const mods: SpeedModifiers = {
        stage: 1,
        item: "choice-scarf",
        field: { tailwind: true },
      };
      expect(applySpeedModifiers(100, mods)).toBe(450);
    });

    it("stacks Chlorophyll + Tailwind in sun", () => {
      // 100 → ×2 (chlorophyll) = 200 → ×2 (tailwind) = 400
      expect(
        applySpeedModifiers(100, {
          ability: "Chlorophyll",
          field: { weather: "sun", tailwind: true },
        })
      ).toBe(400);
    });

    it("paralysis halves AFTER scarf boost", () => {
      // 100 → ×1.5 = 150 → ×0.5 = 75
      expect(
        applySpeedModifiers(100, {
          item: "choice-scarf",
          status: "paralyzed",
        })
      ).toBe(75);
    });
  });
});

// =============================================================================
// getSpeedTierLabel
// =============================================================================

describe("getSpeedTierLabel", () => {
  it.each<[number, SpeedTierLabel]>([
    [0, "very slow"],
    [59, "very slow"],
    [60, "slow"], // first slow
    [89, "slow"],
    [90, "mid-slow"], // first mid-slow
    [109, "mid-slow"],
    [110, "mid"], // first mid
    [129, "mid"],
    [130, "mid-fast"], // first mid-fast
    [159, "mid-fast"],
    [160, "fast"], // first fast
    [199, "fast"],
    [200, "very fast"], // first very fast
    [400, "very fast"],
  ])("speed %i → %s", (speed, expected) => {
    expect(getSpeedTierLabel(speed)).toBe(expected);
  });
});

// =============================================================================
// groupBySpeed
// =============================================================================

describe("groupBySpeed", () => {
  it("returns an empty array for empty input", () => {
    expect(groupBySpeed([])).toEqual([]);
  });

  it("sorts groups descending by speed", () => {
    const items = [
      { name: "a", speed: 100 },
      { name: "b", speed: 200 },
      { name: "c", speed: 150 },
    ];
    const groups = groupBySpeed(items);
    expect(groups.map((g) => g.speed)).toEqual([200, 150, 100]);
  });

  it("buckets items that share a speed into the same group", () => {
    const items = [
      { name: "a", speed: 100 },
      { name: "b", speed: 100 },
      { name: "c", speed: 200 },
    ];
    const groups = groupBySpeed(items);
    expect(groups).toHaveLength(2);

    const speed100 = groups.find((g) => g.speed === 100);
    expect(speed100?.items.map((i) => i.name)).toEqual(["a", "b"]);
  });

  it("does not produce duplicate group keys", () => {
    const items = [
      { speed: 50 },
      { speed: 50 },
      { speed: 100 },
      { speed: 100 },
      { speed: 100 },
    ];
    const groups = groupBySpeed(items);
    const speeds = groups.map((g) => g.speed);
    expect(new Set(speeds).size).toBe(speeds.length);
  });
});

// =============================================================================
// getSpeedAffectingItems
// =============================================================================

describe("getSpeedAffectingItems", () => {
  it("returns choice-scarf and iron-ball for Champions formats (M-A and M-B share the same set)", () => {
    for (const formatId of [
      "gen9championsvgc2026regma",
      "gen9championsvgc2026regmb",
    ]) {
      const format = getFormatById(formatId);
      if (!format) throw new Error(`format fixture missing: ${formatId}`);
      const items = getSpeedAffectingItems(format);
      const ids = items.map((i) => i.id).sort();
      // Iron Ball (M-B addition) is included for both formats since they share
      // the MODERN_LEGAL_ITEM_IDS set; choice-scarf is the M-A boost item.
      expect(ids).toEqual(["choice-scarf", "iron-ball"].sort());
    }
  });

  it("returns the full classic set for older formats", () => {
    const format = getFormatById("gen8vgc2022");
    if (!format) throw new Error("format fixture missing");
    const items = getSpeedAffectingItems(format);
    const ids = new Set(items.map((i) => i.id));
    expect(ids.has("choice-scarf")).toBe(true);
    expect(ids.has("iron-ball")).toBe(true);
    expect(ids.has("lagging-tail")).toBe(true);
    expect(ids.has("quick-powder")).toBe(true);
    expect(ids.has("macho-brace")).toBe(true);
  });

  it("populates effect, multiplier, and displayName on every entry", () => {
    const format = getFormatById("gen9vgc2026regi");
    if (!format) throw new Error("format fixture missing");
    const items = getSpeedAffectingItems(format);
    for (const item of items) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.displayName.length).toBeGreaterThan(0);
      expect(item.effect.length).toBeGreaterThan(0);
      expect(typeof item.multiplier).toBe("number");
    }
  });
});
