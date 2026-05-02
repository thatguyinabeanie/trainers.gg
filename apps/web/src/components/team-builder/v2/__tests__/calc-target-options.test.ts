import { CALC_TARGETS, type CalcTarget } from "../calc/calc-target-options";

// =============================================================================
// CALC_TARGETS data integrity
// =============================================================================

describe("CALC_TARGETS", () => {
  it("is non-empty", () => {
    expect(CALC_TARGETS.length).toBeGreaterThan(0);
  });

  it("every entry has a non-empty name", () => {
    for (const target of CALC_TARGETS) {
      expect(target.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty species string", () => {
    for (const target of CALC_TARGETS) {
      expect(target.species.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty ability string", () => {
    for (const target of CALC_TARGETS) {
      expect(target.ability.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty item string", () => {
    for (const target of CALC_TARGETS) {
      expect(target.item.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty nature string", () => {
    for (const target of CALC_TARGETS) {
      expect(target.nature.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has all six EV keys", () => {
    const requiredKeys: Array<keyof CalcTarget["evs"]> = [
      "hp",
      "atk",
      "def",
      "spa",
      "spd",
      "spe",
    ];
    for (const target of CALC_TARGETS) {
      for (const key of requiredKeys) {
        expect(target.evs).toHaveProperty(key);
      }
    }
  });

  it("every entry has EVs summing to ≤ 510", () => {
    for (const target of CALC_TARGETS) {
      const sum =
        target.evs.hp +
        target.evs.atk +
        target.evs.def +
        target.evs.spa +
        target.evs.spd +
        target.evs.spe;
      expect(sum).toBeLessThanOrEqual(510);
    }
  });

  it("every EV value is a non-negative integer", () => {
    for (const target of CALC_TARGETS) {
      for (const val of Object.values(target.evs)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(val)).toBe(true);
      }
    }
  });

  it("every EV value is at most 252", () => {
    for (const target of CALC_TARGETS) {
      for (const val of Object.values(target.evs)) {
        expect(val).toBeLessThanOrEqual(252);
      }
    }
  });

  it("when moves are provided, there are exactly 4 of them", () => {
    for (const target of CALC_TARGETS) {
      if (target.moves !== undefined) {
        expect(target.moves).toHaveLength(4);
      }
    }
  });

  it("when moves are provided, all move strings are non-empty", () => {
    for (const target of CALC_TARGETS) {
      if (target.moves !== undefined) {
        for (const move of target.moves) {
          expect(move.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  describe("known meta staples are present", () => {
    const names = CALC_TARGETS.map((t) => t.name);

    it.each([
      "Incineroar",
      "Flutter Mane",
      "Iron Hands",
      "Amoonguss",
      "Gholdengo",
    ])("%s is in the targets list", (name) => {
      expect(names).toContain(name);
    });
  });

  describe("parameterized invariant walk — named-target diagnostics", () => {
    // Uses it.each so test output names the failing target directly rather than
    // surfacing a generic "index N" failure inside a for-loop.
    it.each(CALC_TARGETS.map((t) => [t.name, t] as [string, CalcTarget]))(
      "%s has valid VGC EV totals + non-empty required fields",
      (_name, target) => {
        const total =
          target.evs.hp +
          target.evs.atk +
          target.evs.def +
          target.evs.spa +
          target.evs.spd +
          target.evs.spe;
        expect(total).toBeLessThanOrEqual(510);

        Object.values(target.evs).forEach((v) => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(252);
        });

        expect(target.species).not.toBe("");
        expect(target.ability).not.toBe("");
        expect(target.nature).not.toBe("");

        if (target.moves !== undefined) {
          expect(target.moves).toHaveLength(4);
          target.moves.forEach((m) => expect(typeof m).toBe("string"));
        }
      }
    );
  });

  describe("specific entries have expected configurations", () => {
    let incineroar: CalcTarget | undefined;

    beforeAll(() => {
      incineroar = CALC_TARGETS.find((t) => t.name === "Incineroar");
    });

    it("Incineroar has Intimidate ability", () => {
      expect(incineroar?.ability).toBe("Intimidate");
    });

    it("Incineroar runs max HP + max SpDef EVs", () => {
      expect(incineroar?.evs.hp).toBe(252);
      expect(incineroar?.evs.spd).toBe(252);
    });

    it("Incineroar's moves include Fake Out", () => {
      expect(incineroar?.moves).toContain("Fake Out");
    });
  });
});
