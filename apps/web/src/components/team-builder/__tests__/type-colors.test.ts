import { describe, it, expect } from "@jest/globals";

import { TYPE_PILL_COLORS, TYPE_BG_COLORS } from "../type-colors";

// All 18 standard Pokemon types + Stellar
const ALL_TYPES = [
  "Normal",
  "Bug",
  "Dark",
  "Dragon",
  "Electric",
  "Fairy",
  "Fighting",
  "Fire",
  "Flying",
  "Ghost",
  "Grass",
  "Ground",
  "Ice",
  "Poison",
  "Psychic",
  "Rock",
  "Steel",
  "Water",
  "Stellar",
];

describe("type-colors", () => {
  describe("TYPE_PILL_COLORS", () => {
    it.each(ALL_TYPES)("has a color for %s", (type) => {
      expect(TYPE_PILL_COLORS[type]).toBeDefined();
      expect(TYPE_PILL_COLORS[type]).toContain("bg-");
    });

    it("includes text contrast class for every type", () => {
      for (const classes of Object.values(TYPE_PILL_COLORS)) {
        expect(classes).toMatch(/text-(white|black)/);
      }
    });
  });

  describe("TYPE_BG_COLORS", () => {
    it.each(ALL_TYPES)("has a color for %s", (type) => {
      expect(TYPE_BG_COLORS[type]).toBeDefined();
      expect(TYPE_BG_COLORS[type]).toContain("bg-");
    });

    it("includes text contrast class for every type", () => {
      for (const classes of Object.values(TYPE_BG_COLORS)) {
        expect(classes).toMatch(/text-(white|black)/);
      }
    });
  });
});
