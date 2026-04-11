import { describe, it, expect } from "@jest/globals";

import { STAT_KEYS, STAT_LABELS, type StatKey } from "../stat-types";

describe("stat-types", () => {
  it("STAT_KEYS contains all six stats in order", () => {
    expect(STAT_KEYS).toEqual([
      "hp",
      "attack",
      "defense",
      "specialAttack",
      "specialDefense",
      "speed",
    ]);
  });

  it("STAT_LABELS has a display label for every stat key", () => {
    for (const key of STAT_KEYS) {
      expect(STAT_LABELS[key]).toBeDefined();
      expect(typeof STAT_LABELS[key]).toBe("string");
    }
  });

  it("STAT_LABELS uses standard competitive abbreviations", () => {
    const expected: Record<StatKey, string> = {
      hp: "HP",
      attack: "Atk",
      defense: "Def",
      specialAttack: "SpA",
      specialDefense: "SpD",
      speed: "Spe",
    };

    expect(STAT_LABELS).toEqual(expected);
  });
});
