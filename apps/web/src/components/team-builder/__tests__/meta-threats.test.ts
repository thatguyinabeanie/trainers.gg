import { describe, it, expect } from "@jest/globals";

import { GEN9_VGC_META_THREATS, type MetaThreat } from "../meta-threats";

describe("GEN9_VGC_META_THREATS", () => {
  it("is an array", () => {
    expect(Array.isArray(GEN9_VGC_META_THREATS)).toBe(true);
  });

  it("contains 10 meta threats", () => {
    expect(GEN9_VGC_META_THREATS).toHaveLength(10);
  });

  it("every threat has the required shape fields", () => {
    for (const threat of GEN9_VGC_META_THREATS) {
      expect(typeof threat.species).toBe("string");
      expect(threat.species.length).toBeGreaterThan(0);
      expect(typeof threat.ability).toBe("string");
      expect(threat.ability.length).toBeGreaterThan(0);
      expect(typeof threat.nature).toBe("string");
      expect(threat.nature.length).toBeGreaterThan(0);
      expect(Array.isArray(threat.moves)).toBe(true);
      expect(threat.moves).toHaveLength(4);
    }
  });

  it("every threat has a complete EV spread with all six stats", () => {
    for (const threat of GEN9_VGC_META_THREATS) {
      expect(typeof threat.evs.hp).toBe("number");
      expect(typeof threat.evs.atk).toBe("number");
      expect(typeof threat.evs.def).toBe("number");
      expect(typeof threat.evs.spa).toBe("number");
      expect(typeof threat.evs.spd).toBe("number");
      expect(typeof threat.evs.spe).toBe("number");
    }
  });

  it("every EV spread totals no more than 508", () => {
    for (const threat of GEN9_VGC_META_THREATS) {
      const total =
        threat.evs.hp +
        threat.evs.atk +
        threat.evs.def +
        threat.evs.spa +
        threat.evs.spd +
        threat.evs.spe;
      expect(total).toBeLessThanOrEqual(508);
    }
  });

  it("every EV value is non-negative", () => {
    for (const threat of GEN9_VGC_META_THREATS) {
      for (const val of Object.values(threat.evs)) {
        expect(val).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("every EV value is a multiple of 4", () => {
    for (const threat of GEN9_VGC_META_THREATS) {
      for (const val of Object.values(threat.evs)) {
        expect(val % 4).toBe(0);
      }
    }
  });

  it("contains Incineroar with Intimidate", () => {
    const incineroar = GEN9_VGC_META_THREATS.find(
      (t) => t.species === "Incineroar"
    );
    expect(incineroar).toBeDefined();
    expect(incineroar?.ability).toBe("Intimidate");
  });

  it("contains Flutter Mane with Protosynthesis", () => {
    const flutterMane = GEN9_VGC_META_THREATS.find(
      (t) => t.species === "Flutter Mane"
    );
    expect(flutterMane).toBeDefined();
    expect(flutterMane?.ability).toBe("Protosynthesis");
  });

  it("contains Rillaboom with Grassy Surge", () => {
    const rillaboom = GEN9_VGC_META_THREATS.find(
      (t) => t.species === "Rillaboom"
    );
    expect(rillaboom).toBeDefined();
    expect(rillaboom?.ability).toBe("Grassy Surge");
  });

  it("contains Amoonguss with Regenerator", () => {
    const amoonguss = GEN9_VGC_META_THREATS.find(
      (t) => t.species === "Amoonguss"
    );
    expect(amoonguss).toBeDefined();
    expect(amoonguss?.ability).toBe("Regenerator");
  });

  it.each<[string, string]>([
    ["Incineroar", "Careful"],
    ["Flutter Mane", "Timid"],
    ["Urshifu-Rapid-Strike", "Jolly"],
    ["Rillaboom", "Adamant"],
    ["Landorus-Therian", "Adamant"],
    ["Tornadus", "Timid"],
    ["Kingambit", "Adamant"],
    ["Ogerpon-Hearthflame", "Jolly"],
    ["Amoonguss", "Calm"],
    ["Chien-Pao", "Jolly"],
  ])("%s uses the %s nature", (species, nature) => {
    const threat = GEN9_VGC_META_THREATS.find((t) => t.species === species);
    expect(threat).toBeDefined();
    expect(threat?.nature).toBe(nature);
  });

  it("Incineroar has Fake Out, Parting Shot, and Knock Off in its moveset", () => {
    const incineroar = GEN9_VGC_META_THREATS.find(
      (t) => t.species === "Incineroar"
    );
    expect(incineroar?.moves).toContain("Fake Out");
    expect(incineroar?.moves).toContain("Parting Shot");
    expect(incineroar?.moves).toContain("Knock Off");
  });

  it("Amoonguss has Spore and Rage Powder for support", () => {
    const amoonguss = GEN9_VGC_META_THREATS.find(
      (t) => t.species === "Amoonguss"
    );
    expect(amoonguss?.moves).toContain("Spore");
    expect(amoonguss?.moves).toContain("Rage Powder");
  });

  it("Flutter Mane has Protect in its moveset", () => {
    const flutterMane = GEN9_VGC_META_THREATS.find(
      (t) => t.species === "Flutter Mane"
    );
    expect(flutterMane?.moves).toContain("Protect");
  });

  it("Tornadus has Tailwind for speed control", () => {
    const tornadus = GEN9_VGC_META_THREATS.find(
      (t) => t.species === "Tornadus"
    );
    expect(tornadus?.moves).toContain("Tailwind");
  });

  it("all 10 species names are unique", () => {
    const names = GEN9_VGC_META_THREATS.map((t) => t.species);
    const unique = new Set(names);
    expect(unique.size).toBe(GEN9_VGC_META_THREATS.length);
  });

  it("satisfies the MetaThreat interface shape", () => {
    // TypeScript enforces this at compile time; verify runtime shape too
    const threat: MetaThreat = GEN9_VGC_META_THREATS[0]!;
    expect(threat).toHaveProperty("species");
    expect(threat).toHaveProperty("ability");
    expect(threat).toHaveProperty("nature");
    expect(threat).toHaveProperty("evs");
    expect(threat).toHaveProperty("moves");
    expect(threat.evs).toHaveProperty("hp");
    expect(threat.evs).toHaveProperty("atk");
    expect(threat.evs).toHaveProperty("def");
    expect(threat.evs).toHaveProperty("spa");
    expect(threat.evs).toHaveProperty("spd");
    expect(threat.evs).toHaveProperty("spe");
  });
});
