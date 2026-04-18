import { getStatTier, type StatTier } from "../stat-tiers";

describe("getStatTier", () => {
  describe("boundaries", () => {
    it.each<[number, StatTier]>([
      [60, "low"], // upper bound of low (inclusive)
      [61, "mid"], // first mid value
      [90, "mid"], // upper bound of mid (inclusive)
      [91, "good"], // first good value
      [120, "good"], // upper bound of good (inclusive)
      [121, "great"], // first great value
    ])("base %i → %s", (base, expected) => {
      expect(getStatTier(base)).toBe(expected);
    });
  });

  describe("edge values", () => {
    it("treats 0 as low", () => {
      expect(getStatTier(0)).toBe("low");
    });

    it("treats 1 as low (canonical minimum base stat)", () => {
      expect(getStatTier(1)).toBe("low");
    });

    it("treats 255 as great (canonical maximum base stat)", () => {
      expect(getStatTier(255)).toBe("great");
    });

    it("treats very large values as great", () => {
      expect(getStatTier(9999)).toBe("great");
    });

    it("coerces negative values to low", () => {
      expect(getStatTier(-50)).toBe("low");
    });

    it("coerces NaN to low", () => {
      expect(getStatTier(Number.NaN)).toBe("low");
    });

    it("coerces Infinity to low (fails Number.isFinite, returns defensive default)", () => {
      // Infinity fails Number.isFinite → returns "low" by design (defensive default).
      expect(getStatTier(Number.POSITIVE_INFINITY)).toBe("low");
    });
  });

  describe("representative real-world Pokemon stats", () => {
    it.each<[string, number, StatTier]>([
      ["Blissey HP (255)", 255, "great"],
      ["Garchomp Attack (130)", 130, "great"],
      ["Charizard Sp. Atk (109)", 109, "good"],
      ["Pikachu Speed (90)", 90, "mid"],
      ["Snorlax Speed (30)", 30, "low"],
    ])("%s → %s", (_label, base, expected) => {
      expect(getStatTier(base)).toBe(expected);
    });
  });
});
