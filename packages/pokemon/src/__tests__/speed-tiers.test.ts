import { getFormatSpeedBenchmarks, compareSpeedTier } from "../speed-tiers";

// Helper: reproduce the stat formula for verification
// floor((floor(((2*base + iv + floor(ev/4)) * level) / 100) + 5) * nature)
function calcStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature: number
): number {
  return Math.floor(
    (Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) *
      nature
  );
}

describe("getFormatSpeedBenchmarks", () => {
  it("returns a non-empty array for a known gen9 format", () => {
    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    expect(benchmarks.length).toBeGreaterThan(0);
  });

  it("returns a non-empty array for a known gen8 format", () => {
    const benchmarks = getFormatSpeedBenchmarks("gen8vgc2022");
    expect(benchmarks.length).toBeGreaterThan(0);
  });

  it("falls back to gen9 for an unknown format ID and returns results", () => {
    // Unknown format IDs fall back to generation 9 per the implementation
    const benchmarks = getFormatSpeedBenchmarks("nonexistent-format-xyz");
    expect(benchmarks.length).toBeGreaterThan(0);
  });

  it("computes correct min/max speeds for Pikachu (base speed 90)", () => {
    // min: 0 EVs, 0 IVs, -nature (0.9), level 50
    // inner = floor(((180+0+0)*50)/100)+5 = 90+5 = 95
    // minSpeed = floor(95 * 0.9) = floor(85.5) = 85
    const expectedMin = calcStat(90, 0, 0, 50, 0.9);
    expect(expectedMin).toBe(85);

    // max: 252 EVs, 31 IVs, +nature (1.1), level 50
    // inner = floor(((180+31+63)*50)/100)+5 = floor(274*50/100)+5 = 137+5 = 142
    // maxSpeed = floor(142 * 1.1) = floor(156.2) = 156
    const expectedMax = calcStat(90, 31, 252, 50, 1.1);
    expect(expectedMax).toBe(156);

    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    const pikachu = benchmarks.find((b) => b.species === "Pikachu");

    expect(pikachu).toBeDefined();
    expect(pikachu!.minSpeed).toBe(expectedMin); // 85
    expect(pikachu!.maxSpeed).toBe(expectedMax); // 156
  });

  it("computes correct scarf and tailwind speeds for Pikachu (base speed 90)", () => {
    // max = 156 (from above)
    // scarf = floor(156 * 1.5) = floor(234) = 234
    // tailwind = floor(156 * 2) = 312
    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    const pikachu = benchmarks.find((b) => b.species === "Pikachu");

    expect(pikachu!.commonSpeeds.scarf).toBe(234);
    expect(pikachu!.commonSpeeds.tailwind).toBe(312);
  });

  it("computes correct neutral252 speed for Pikachu (base speed 90)", () => {
    // neutral252: 252 EVs, 31 IVs, neutral nature (1.0), level 50
    // inner = 142 (same as max calc before nature)
    // neutral252 = floor(142 * 1.0) = 142
    const expectedNeutral = calcStat(90, 31, 252, 50, 1.0);
    expect(expectedNeutral).toBe(142);

    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    const pikachu = benchmarks.find((b) => b.species === "Pikachu");

    expect(pikachu!.commonSpeeds.neutral252).toBe(expectedNeutral); // 142
  });

  it("positive252 equals maxSpeed for every entry", () => {
    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    for (const entry of benchmarks) {
      expect(entry.commonSpeeds.positive252).toBe(entry.maxSpeed);
    }
  });

  it("every entry satisfies minSpeed <= neutral252 <= maxSpeed", () => {
    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    for (const entry of benchmarks) {
      expect(entry.minSpeed).toBeLessThanOrEqual(entry.commonSpeeds.neutral252);
      expect(entry.commonSpeeds.neutral252).toBeLessThanOrEqual(entry.maxSpeed);
    }
  });

  it("scarf is greater than maxSpeed for every entry", () => {
    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    for (const entry of benchmarks) {
      expect(entry.commonSpeeds.scarf).toBeGreaterThan(entry.maxSpeed);
    }
  });

  it("tailwind is greater than scarf for every entry", () => {
    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    for (const entry of benchmarks) {
      expect(entry.commonSpeeds.tailwind).toBeGreaterThan(
        entry.commonSpeeds.scarf
      );
    }
  });

  it("every entry has a defined species name and positive baseSpeed", () => {
    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    for (const entry of benchmarks) {
      expect(typeof entry.species).toBe("string");
      expect(entry.species.length).toBeGreaterThan(0);
      expect(entry.baseSpeed).toBeGreaterThan(0);
    }
  });

  it("computes correct speeds for Incineroar (base speed 60)", () => {
    // min: floor((floor(((120+0+0)*50)/100)+5)*0.9) = floor((60+5)*0.9) = floor(58.5) = 58
    // max: floor((floor(((120+31+63)*50)/100)+5)*1.1) = floor((107+5)*1.1) = floor(123.2) = 123
    const expectedMin = calcStat(60, 0, 0, 50, 0.9);
    const expectedMax = calcStat(60, 31, 252, 50, 1.1);
    expect(expectedMin).toBe(58);
    expect(expectedMax).toBe(123);

    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    const incineroar = benchmarks.find((b) => b.species === "Incineroar");

    expect(incineroar).toBeDefined();
    expect(incineroar!.minSpeed).toBe(expectedMin);
    expect(incineroar!.maxSpeed).toBe(expectedMax);
  });
});

describe("compareSpeedTier", () => {
  it("excludes the subject species from both lists", () => {
    const { outspeeds, outspedBy } = compareSpeedTier(
      "Pikachu",
      156,
      "gen9vgc2026regi"
    );
    const allSpecies = [
      ...outspeeds.map((b) => b.species),
      ...outspedBy.map((b) => b.species),
    ];
    expect(allSpecies).not.toContain("Pikachu");
  });

  it("outspeeds contains only species whose maxSpeed is strictly below the calculatedSpeed", () => {
    const calculatedSpeed = 150;
    const { outspeeds } = compareSpeedTier(
      "Pikachu",
      calculatedSpeed,
      "gen9vgc2026regi"
    );
    for (const entry of outspeeds) {
      expect(entry.maxSpeed).toBeLessThan(calculatedSpeed);
    }
  });

  it("outspedBy contains only species whose maxSpeed is strictly above the calculatedSpeed", () => {
    const calculatedSpeed = 150;
    const { outspedBy } = compareSpeedTier(
      "Pikachu",
      calculatedSpeed,
      "gen9vgc2026regi"
    );
    for (const entry of outspedBy) {
      expect(entry.maxSpeed).toBeGreaterThan(calculatedSpeed);
    }
  });

  it("species with equal maxSpeed are in neither list (ties are excluded)", () => {
    // Get Pikachu's exact maxSpeed (156), then compare at that speed
    const benchmarks = getFormatSpeedBenchmarks("gen9vgc2026regi");
    const pikachu = benchmarks.find((b) => b.species === "Pikachu");
    const pikachuMax = pikachu!.maxSpeed; // 156

    // Compare Charizard (different species) at the same speed as Pikachu's max
    const { outspeeds, outspedBy } = compareSpeedTier(
      "Charizard",
      pikachuMax,
      "gen9vgc2026regi"
    );

    const allSpecies = [
      ...outspeeds.map((b) => b.species),
      ...outspedBy.map((b) => b.species),
    ];
    // Pikachu's maxSpeed equals the calculatedSpeed, so it should be in neither list
    expect(allSpecies).not.toContain("Pikachu");
  });

  it("outspeeds list is sorted ascending by maxSpeed", () => {
    const { outspeeds } = compareSpeedTier("Pikachu", 150, "gen9vgc2026regi");
    for (let i = 1; i < outspeeds.length; i++) {
      expect(outspeeds[i]!.maxSpeed).toBeGreaterThanOrEqual(
        outspeeds[i - 1]!.maxSpeed
      );
    }
  });

  it("outspedBy list is sorted ascending by maxSpeed", () => {
    const { outspedBy } = compareSpeedTier("Pikachu", 150, "gen9vgc2026regi");
    for (let i = 1; i < outspedBy.length; i++) {
      expect(outspedBy[i]!.maxSpeed).toBeGreaterThanOrEqual(
        outspedBy[i - 1]!.maxSpeed
      );
    }
  });

  it("returns non-empty lists for a mid-range speed value", () => {
    // A speed of 150 should have some pokemon faster and some slower
    const { outspeeds, outspedBy } = compareSpeedTier(
      "Pikachu",
      150,
      "gen9vgc2026regi"
    );
    expect(outspeeds.length).toBeGreaterThan(0);
    expect(outspedBy.length).toBeGreaterThan(0);
  });

  it("outspeeds is empty when calculatedSpeed is very low", () => {
    // A calculated speed of 1 should outspeed nothing (or almost nothing)
    const { outspeeds } = compareSpeedTier("Pikachu", 1, "gen9vgc2026regi");
    expect(outspeeds).toHaveLength(0);
  });

  it("outspedBy is empty when calculatedSpeed is extremely high", () => {
    // A calculated speed of 9999 should be outspeed by nothing
    const { outspedBy } = compareSpeedTier("Pikachu", 9999, "gen9vgc2026regi");
    expect(outspedBy).toHaveLength(0);
  });

  it("each SpeedBenchmark in the result has the expected shape", () => {
    const { outspeeds, outspedBy } = compareSpeedTier(
      "Pikachu",
      150,
      "gen9vgc2026regi"
    );
    const sample = outspeeds[0] ?? outspedBy[0];

    expect(sample).toBeDefined();
    expect(typeof sample!.species).toBe("string");
    expect(typeof sample!.baseSpeed).toBe("number");
    expect(typeof sample!.minSpeed).toBe("number");
    expect(typeof sample!.maxSpeed).toBe("number");
    expect(typeof sample!.commonSpeeds.neutral252).toBe("number");
    expect(typeof sample!.commonSpeeds.positive252).toBe("number");
    expect(typeof sample!.commonSpeeds.scarf).toBe("number");
    expect(typeof sample!.commonSpeeds.tailwind).toBe("number");
  });
});
