import {
  calculateHP,
  calculateStat,
  getNatureMultiplier,
  calculateStats,
  calculateBulk,
  getStatColor,
  formatStats,
  getStatStageMultiplier,
  NATURE_EFFECTS,
  POKEMON_BASE_STATS,
} from "../stats-calculator";

describe("calculateHP", () => {
  it("calculates HP at level 50 with max IVs and no EVs", () => {
    // Pikachu: base 35, IV 31, EV 0, level 50
    // floor(((2*35 + 31 + 0) * 50) / 100) + level + 10 = floor(5050/100) + 50 + 10 = 50 + 50 + 10 = 110
    expect(calculateHP(35, 31, 0, 50)).toBe(110);
  });

  it("returns 1 for Shedinja (base 1)", () => {
    expect(calculateHP(1, 31, 252, 100)).toBe(1);
  });

  it("accounts for EVs correctly", () => {
    // With 252 EVs: floor(ev/4) = 63
    // Pikachu: floor(((2*35 + 31 + 63) * 50) / 100) + 50 + 10 = floor(8200/100) + 60 = 82 + 60 = 142
    expect(calculateHP(35, 31, 252, 50)).toBe(142);
  });

  it("accounts for level correctly", () => {
    // At level 100: floor(((2*35 + 31 + 0) * 100) / 100) + 100 + 10 = 101 + 110 = 211
    expect(calculateHP(35, 31, 0, 100)).toBe(211);
  });
});

describe("calculateStat", () => {
  it("calculates a stat at level 50 with neutral nature", () => {
    // Pikachu Attack: base 55, IV 31, EV 0, level 50, nature 1.0
    // floor((floor(((2*55 + 31 + 0) * 50) / 100) + 5) * 1.0)
    // = floor((floor(7050/100) + 5) * 1.0) = floor((70 + 5) * 1.0) = 75
    expect(calculateStat(55, 31, 0, 50, 1.0)).toBe(75);
  });

  it("applies boosting nature multiplier", () => {
    // Same as above but with 1.1 nature
    // floor(75 * 1.1) = floor(82.5) = 82
    expect(calculateStat(55, 31, 0, 50, 1.1)).toBe(82);
  });

  it("applies reducing nature multiplier", () => {
    // floor(75 * 0.9) = floor(67.5) = 67
    expect(calculateStat(55, 31, 0, 50, 0.9)).toBe(67);
  });

  it("accounts for EVs", () => {
    // With 252 EVs: floor(ev/4) = 63
    // floor(((2*55 + 31 + 63) * 50) / 100) + 5 = floor(10200/100) + 5 = 102 + 5 = 107
    // With neutral nature: floor(107 * 1.0) = 107
    expect(calculateStat(55, 31, 252, 50, 1.0)).toBe(107);
  });
});

describe("getNatureMultiplier", () => {
  it("returns 1.1 for boosted stat", () => {
    expect(getNatureMultiplier("Adamant", "attack")).toBe(1.1);
    expect(getNatureMultiplier("Timid", "speed")).toBe(1.1);
    expect(getNatureMultiplier("Modest", "specialAttack")).toBe(1.1);
  });

  it("returns 0.9 for reduced stat", () => {
    expect(getNatureMultiplier("Adamant", "specialAttack")).toBe(0.9);
    expect(getNatureMultiplier("Timid", "attack")).toBe(0.9);
  });

  it("returns 1.0 for neutral stats", () => {
    expect(getNatureMultiplier("Adamant", "defense")).toBe(1.0);
    expect(getNatureMultiplier("Adamant", "speed")).toBe(1.0);
  });

  it("returns 1.0 for neutral natures", () => {
    expect(getNatureMultiplier("Hardy", "attack")).toBe(1.0);
    expect(getNatureMultiplier("Docile", "defense")).toBe(1.0);
    expect(getNatureMultiplier("Serious", "speed")).toBe(1.0);
    expect(getNatureMultiplier("Bashful", "specialAttack")).toBe(1.0);
    expect(getNatureMultiplier("Quirky", "specialDefense")).toBe(1.0);
  });

  it("returns 1.0 for unknown natures", () => {
    expect(getNatureMultiplier("NonExistent", "attack")).toBe(1.0);
  });
});

describe("NATURE_EFFECTS", () => {
  it("has 25 nature entries", () => {
    expect(Object.keys(NATURE_EFFECTS)).toHaveLength(25);
  });

  it("has 5 neutral natures", () => {
    const neutral = Object.entries(NATURE_EFFECTS).filter(
      ([, effect]) => !effect.boost && !effect.reduce
    );
    expect(neutral).toHaveLength(5);
  });
});

describe("calculateStats", () => {
  it("calculates all stats for a known Pokemon", () => {
    const stats = calculateStats(
      "Pikachu",
      50,
      "Timid",
      {
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 252,
        specialDefense: 0,
        speed: 252,
      },
      {
        hp: 31,
        attack: 0,
        defense: 31,
        specialAttack: 31,
        specialDefense: 31,
        speed: 31,
      }
    );
    expect(stats.hp).toBeGreaterThan(0);
    expect(stats.speed).toBeGreaterThan(stats.attack); // Timid boosts speed, reduces attack
  });

  it("returns placeholder stats for unknown Pokemon", () => {
    const stats = calculateStats(
      "UnknownPokemon",
      50,
      "Hardy",
      {
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
      {
        hp: 31,
        attack: 31,
        defense: 31,
        specialAttack: 31,
        specialDefense: 31,
        speed: 31,
      }
    );
    // Should return 100 for all stats (placeholder base stats)
    expect(stats.hp).toBe(100);
    expect(stats.attack).toBe(100);
    expect(stats.defense).toBe(100);
    expect(stats.specialAttack).toBe(100);
    expect(stats.specialDefense).toBe(100);
    expect(stats.speed).toBe(100);
  });
});

describe("POKEMON_BASE_STATS", () => {
  it("has base stats for Pikachu", () => {
    expect(POKEMON_BASE_STATS["Pikachu"]).toBeDefined();
    expect(POKEMON_BASE_STATS["Pikachu"]!.hp).toBe(35);
  });

  it("has base stats for Garchomp", () => {
    expect(POKEMON_BASE_STATS["Garchomp"]).toBeDefined();
    expect(POKEMON_BASE_STATS["Garchomp"]!.attack).toBe(130);
  });
});

describe("calculateBulk", () => {
  it("calculates physical, special, and overall bulk", () => {
    const result = calculateBulk(200, 100, 120);
    expect(result.physical).toBe(Math.floor((200 * 100) / 100));
    expect(result.special).toBe(Math.floor((200 * 120) / 100));
    expect(result.overall).toBe(
      Math.floor((result.physical + result.special) / 2)
    );
  });

  it("floors the result", () => {
    // 150 * 90 / 100 = 135
    const result = calculateBulk(150, 90, 90);
    expect(result.physical).toBe(135);
    expect(result.special).toBe(135);
    expect(result.overall).toBe(135);
  });
});

describe("getStatColor", () => {
  it("returns purple for stats >= 200", () => {
    expect(getStatColor(200)).toBe("text-purple-500");
    expect(getStatColor(255)).toBe("text-purple-500");
  });

  it("returns blue for stats 150-199", () => {
    expect(getStatColor(150)).toBe("text-blue-500");
    expect(getStatColor(199)).toBe("text-blue-500");
  });

  it("returns green for stats 100-149", () => {
    expect(getStatColor(100)).toBe("text-green-500");
  });

  it("returns yellow for stats 50-99", () => {
    expect(getStatColor(50)).toBe("text-yellow-500");
    expect(getStatColor(99)).toBe("text-yellow-500");
  });

  it("returns red for stats below 50", () => {
    expect(getStatColor(49)).toBe("text-red-500");
    expect(getStatColor(0)).toBe("text-red-500");
  });
});

describe("formatStats", () => {
  it("formats stats as a readable string", () => {
    const stats = {
      hp: 100,
      attack: 80,
      defense: 90,
      specialAttack: 110,
      specialDefense: 95,
      speed: 120,
    };
    expect(formatStats(stats)).toBe(
      "HP: 100 | Atk: 80 | Def: 90 | SpA: 110 | SpD: 95 | Spe: 120"
    );
  });
});

describe("getStatStageMultiplier", () => {
  it("returns 1 for stage 0", () => {
    expect(getStatStageMultiplier(0)).toBe(1);
  });

  it("returns 1.5 for +1", () => {
    expect(getStatStageMultiplier(1)).toBe(1.5);
  });

  it("returns 4 for +6", () => {
    expect(getStatStageMultiplier(6)).toBe(4);
  });

  it("returns 0.25 for -6", () => {
    expect(getStatStageMultiplier(-6)).toBe(0.25);
  });

  it("returns 0.5 for -2", () => {
    expect(getStatStageMultiplier(-2)).toBe(0.5);
  });

  it("returns 1 for out-of-range stages", () => {
    expect(getStatStageMultiplier(7)).toBe(1);
    expect(getStatStageMultiplier(-7)).toBe(1);
  });
});
