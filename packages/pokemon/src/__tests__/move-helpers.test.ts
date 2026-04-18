import { getMoveHelperText, type MoveHelperInput } from "../move-helpers";

/** Build a minimal move input with sensible defaults. */
function buildMove(overrides: Partial<MoveHelperInput> = {}): MoveHelperInput {
  return {
    category: "Physical",
    priority: 0,
    flags: {},
    ...overrides,
  };
}

describe("getMoveHelperText", () => {
  it("returns empty string for a vanilla damaging move with no notable effects", () => {
    // e.g., Tackle / Pound — no priority, no recoil, no secondary.
    const move = buildMove();
    expect(getMoveHelperText(move)).toBe("");
  });

  describe("priority", () => {
    it("describes a priority +1 move (Quick Attack, Aqua Jet)", () => {
      const move = buildMove({ priority: 1 });
      expect(getMoveHelperText(move)).toBe("+1 priority");
    });

    it("describes a higher-priority move", () => {
      const move = buildMove({ priority: 3 });
      expect(getMoveHelperText(move)).toBe("+3 priority");
    });

    it("describes negative priority (e.g., Avalanche -4)", () => {
      const move = buildMove({ priority: -4 });
      expect(getMoveHelperText(move)).toBe("-4 priority");
    });
  });

  describe("damaging move with secondary stat-drop", () => {
    it("Moonblast — 30% chance to lower target's Sp. Atk by 1", () => {
      const move = buildMove({
        category: "Special",
        secondary: { chance: 30, boosts: { spa: -1 } },
      });
      expect(getMoveHelperText(move)).toBe(
        "30% chance — lowers target's Sp. Atk by 1"
      );
    });

    it("Crunch — 20% chance to lower target's Defense by 1", () => {
      const move = buildMove({
        secondary: { chance: 20, boosts: { def: -1 } },
      });
      expect(getMoveHelperText(move)).toBe(
        "20% chance — lowers target's Defense by 1"
      );
    });
  });

  describe("damaging move with recoil", () => {
    it("Flare Blitz — 1/3 recoil + 10% burn", () => {
      const move = buildMove({
        recoil: [33, 100],
        secondary: { chance: 10, status: "brn" },
      });
      expect(getMoveHelperText(move)).toBe(
        "user takes 1/3 recoil · 10% chance to burn target"
      );
    });

    it("Brave Bird — 1/3 recoil only", () => {
      const move = buildMove({ recoil: [33, 100] });
      expect(getMoveHelperText(move)).toBe("user takes 1/3 recoil");
    });

    it("Wood Hammer — 1/3 recoil with non-canonical ratio", () => {
      const move = buildMove({ recoil: [1, 3] });
      expect(getMoveHelperText(move)).toBe("user takes 1/3 recoil");
    });
  });

  describe("status move that switches user out", () => {
    it("U-turn — switches user out after damage", () => {
      const move = buildMove({ selfSwitch: true });
      expect(getMoveHelperText(move)).toBe("switches user out after damage");
    });

    it("Baton Pass — switches and passes stat changes", () => {
      const move = buildMove({
        category: "Status",
        selfSwitch: "copyvolatile",
      });
      expect(getMoveHelperText(move)).toBe(
        "switches user out (passes stat changes)"
      );
    });
  });

  describe("status move that boosts the user", () => {
    it("Swords Dance — sharply raises Attack", () => {
      const move = buildMove({
        category: "Status",
        target: "self",
        boosts: { atk: 2 },
      });
      expect(getMoveHelperText(move)).toBe("raises user's Attack by 2");
    });

    it("Calm Mind — raises Sp. Atk and Sp. Def by 1", () => {
      const move = buildMove({
        category: "Status",
        target: "self",
        boosts: { spa: 1, spd: 1 },
      });
      expect(getMoveHelperText(move)).toBe(
        "raises user's Sp. Atk and Sp. Def by 1"
      );
    });

    it("Parting Shot — lowers target's Atk and Sp. Atk, then switches", () => {
      const move = buildMove({
        category: "Status",
        target: "normal",
        boosts: { atk: -1, spa: -1 },
        selfSwitch: true,
      });
      expect(getMoveHelperText(move)).toBe(
        "switches user out after damage · lowers target's Attack and Sp. Atk by 1"
      );
    });
  });

  describe("force switch / multi-hit / OHKO", () => {
    it("Dragon Tail — forces target to switch", () => {
      const move = buildMove({ priority: -6, forceSwitch: true });
      expect(getMoveHelperText(move)).toBe(
        "-6 priority · forces target to switch"
      );
    });

    it("Bullet Seed — hits 2-5 times", () => {
      const move = buildMove({ multihit: [2, 5] });
      expect(getMoveHelperText(move)).toBe("hits 2–5 times");
    });

    it("Double Hit — hits exactly 2 times", () => {
      const move = buildMove({ multihit: 2 });
      expect(getMoveHelperText(move)).toBe("hits 2 times");
    });

    it("single-element array multihit falls back to 'hits N times'", () => {
      const move = buildMove({ multihit: [3] });
      expect(getMoveHelperText(move)).toBe("hits 3 times");
    });

    it("Sheer Cold — one-hit KO", () => {
      const move = buildMove({ ohko: true });
      expect(getMoveHelperText(move)).toBe("one-hit KO if it lands");
    });
  });

  describe("status, weather, terrain, screens", () => {
    it("Will-O-Wisp — burns the target", () => {
      const move = buildMove({ category: "Status", status: "brn" });
      expect(getMoveHelperText(move)).toBe("burns the target");
    });

    it("Sleep Powder — puts target to sleep", () => {
      const move = buildMove({ category: "Status", status: "slp" });
      expect(getMoveHelperText(move)).toBe("puts target to sleep");
    });

    it("Sunny Day — summons harsh sunlight", () => {
      const move = buildMove({ category: "Status", weather: "sunnyday" });
      expect(getMoveHelperText(move)).toBe("summons harsh sunlight");
    });

    it("Electric Terrain — sets terrain", () => {
      const move = buildMove({
        category: "Status",
        terrain: "electricterrain",
      });
      expect(getMoveHelperText(move)).toBe("sets Electric Terrain for 5 turns");
    });

    it("Tailwind — doubles team Speed for 4 turns", () => {
      const move = buildMove({
        category: "Status",
        sideCondition: "tailwind",
      });
      expect(getMoveHelperText(move)).toBe("doubles team Speed for 4 turns");
    });

    it("Reflect — sets Reflect screen", () => {
      const move = buildMove({
        category: "Status",
        sideCondition: "reflect",
      });
      expect(getMoveHelperText(move)).toContain("Reflect");
    });
  });

  describe("volatile status from a status move", () => {
    it("Protect — shield this turn, fails on consecutive use", () => {
      const move = buildMove({
        category: "Status",
        priority: 4,
        volatileStatus: "protect",
      });
      expect(getMoveHelperText(move)).toBe(
        "+4 priority · shields user this turn — fails if used in succession"
      );
    });

    it("Substitute — creates substitute using 1/4 max HP", () => {
      const move = buildMove({
        category: "Status",
        volatileStatus: "substitute",
      });
      expect(getMoveHelperText(move)).toBe(
        "creates a substitute using 1/4 max HP"
      );
    });

    it("Taunt — prevents status moves", () => {
      const move = buildMove({
        category: "Status",
        volatileStatus: "taunt",
      });
      expect(getMoveHelperText(move)).toContain("prevents target");
    });
  });

  describe("healing", () => {
    it("Recover — restores 1/2 max HP", () => {
      const move = buildMove({ category: "Status", heal: [1, 2] });
      expect(getMoveHelperText(move)).toBe("restores 1/2 max HP");
    });
  });

  describe("drain", () => {
    it("Giga Drain — heals user for 1/2 damage dealt", () => {
      const move = buildMove({ category: "Special", drain: [1, 2] });
      expect(getMoveHelperText(move)).toBe("heals user for 1/2 damage dealt");
    });

    it("Draining Kiss — heals user for 3/4 damage dealt", () => {
      const move = buildMove({ category: "Special", drain: [3, 4] });
      expect(getMoveHelperText(move)).toBe("heals user for 3/4 damage dealt");
    });

    it("falls back to a percent for non-canonical drain ratios", () => {
      const move = buildMove({ category: "Special", drain: [2, 5] });
      expect(getMoveHelperText(move)).toBe("heals user for 40% damage dealt");
    });
  });

  describe("self-destruct", () => {
    it("Explosion — user faints (always)", () => {
      const move = buildMove({ selfdestruct: "always" });
      expect(getMoveHelperText(move)).toBe("user faints");
    });

    it("Mind Blown — user faints only if it hits (ifHit)", () => {
      const move = buildMove({ selfdestruct: "ifHit" });
      expect(getMoveHelperText(move)).toBe("user faints if it hits");
    });
  });

  describe("damaging move with self-boost", () => {
    it("Power-Up Punch — raises user's Attack by 1", () => {
      const move = buildMove({
        secondary: { chance: 100, self: { boosts: { atk: 1 } } },
      });
      expect(getMoveHelperText(move)).toBe("raises user's Attack by 1");
    });
  });

  describe("flinch chance", () => {
    it("Iron Head — 30% flinch", () => {
      const move = buildMove({
        secondary: { chance: 30, volatileStatus: "flinch" },
      });
      expect(getMoveHelperText(move)).toBe("30% flinch chance");
    });
  });
});
