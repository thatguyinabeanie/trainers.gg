import { getMoveTargetInfo } from "../calc/move-target-info";

// =============================================================================
// getMoveTargetInfo
// =============================================================================

describe("getMoveTargetInfo", () => {
  describe("empty / falsy input → default single-foe", () => {
    it.each(["", undefined as unknown as string])(
      "returns single-foe for %p",
      (input) => {
        const result = getMoveTargetInfo(input);
        expect(result).toEqual({ kind: "single-foe", isSpread: false });
      }
    );
  });

  describe("ALL_FOES_MOVES → all-foes spread", () => {
    it.each([
      "Earthquake",
      "Surf",
      "Discharge",
      "Blizzard",
      "Hyper Voice",
      "Explosion",
      "Self-Destruct",
      "Heat Wave",
      "Sludge Wave",
      "Muddy Water",
      "Glacial Lance",
      "Astral Barrage",
      "Dazzling Gleam",
      "Boomburst",
      "Rock Slide",
      "Icy Wind",
      "Electroweb",
      "Snarl",
      "Round",
      "Overdrive",
    ])("%s is all-foes spread", (move) => {
      const result = getMoveTargetInfo(move);
      expect(result).toEqual({ kind: "all-foes", isSpread: true });
    });
  });

  describe("SELF_MOVES → self, not spread", () => {
    it.each([
      "Protect",
      "Detect",
      "Swords Dance",
      "Calm Mind",
      "Nasty Plot",
      "Quiver Dance",
      "Shell Smash",
      "Dragon Dance",
      "Bulk Up",
      "Tailwind",
      "Trick Room",
      "Sunny Day",
      "Rain Dance",
      "Reflect",
      "Light Screen",
      "Aurora Veil",
      "Substitute",
      "Belly Drum",
    ])("%s is self / not spread", (move) => {
      const result = getMoveTargetInfo(move);
      expect(result).toEqual({ kind: "self", isSpread: false });
    });
  });

  describe("single-target default", () => {
    it.each([
      "Flamethrower",
      "Close Combat",
      "Sucker Punch",
      "Shadow Ball",
      "Moonblast",
    ])("%s defaults to single-foe / not spread", (move) => {
      const result = getMoveTargetInfo(move);
      expect(result).toEqual({ kind: "single-foe", isSpread: false });
    });
  });

  describe("formerly-misclassified moves must NOT be spread", () => {
    // Pollen Puff targets an ally — single-target, never spread
    it("Pollen Puff is NOT spread", () => {
      const result = getMoveTargetInfo("Pollen Puff");
      expect(result.isSpread).toBe(false);
    });

    // Tera Blast targets a single foe — never spread
    it("Tera Blast is NOT spread", () => {
      const result = getMoveTargetInfo("Tera Blast");
      expect(result.isSpread).toBe(false);
    });
  });

  describe("unknown move → single-foe default", () => {
    it("completely unknown move name returns single-foe", () => {
      const result = getMoveTargetInfo("ZorpFlarge");
      expect(result).toEqual({ kind: "single-foe", isSpread: false });
    });
  });

  describe("case sensitivity", () => {
    it("lowercase 'earthquake' does NOT match the set (case-sensitive lookup)", () => {
      // The set is case-sensitive; lowercase should fall to default
      const result = getMoveTargetInfo("earthquake");
      expect(result).toEqual({ kind: "single-foe", isSpread: false });
    });

    it("exact-case 'Earthquake' matches the all-foes set", () => {
      const result = getMoveTargetInfo("Earthquake");
      expect(result.kind).toBe("all-foes");
    });
  });
});
