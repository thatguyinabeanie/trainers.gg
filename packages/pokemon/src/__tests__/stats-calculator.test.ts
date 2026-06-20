import {
  calculateHP,
  calculateStat,
  calculateChampionsHP,
  calculateChampionsStat,
  getNatureMultiplier,
  calculateStats,
  calculateBulk,
  getStatColor,
  formatStats,
  getStatStageMultiplier,
  getBaseStats,
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

describe("getBaseStats", () => {
  it("returns base stats for a valid species", () => {
    const stats = getBaseStats("Garchomp");
    expect(stats).not.toBeNull();
    expect(stats!.attack).toBe(130);
    expect(stats!.hp).toBe(108);
    expect(stats!.speed).toBe(102);
  });

  it("maps dex stat keys to our BaseStats interface", () => {
    const stats = getBaseStats("Incineroar");
    expect(stats).not.toBeNull();
    // Incineroar: hp 95, atk 115, def 90, spa 80, spd 90, spe 60
    expect(stats!.hp).toBe(95);
    expect(stats!.attack).toBe(115);
    expect(stats!.defense).toBe(90);
    expect(stats!.specialAttack).toBe(80);
    expect(stats!.specialDefense).toBe(90);
    expect(stats!.speed).toBe(60);
  });

  it("returns null for unknown species", () => {
    expect(getBaseStats("FakePokemon")).toBeNull();
  });

  it.each([
    [
      "Flutter Mane",
      {
        hp: 55,
        attack: 55,
        defense: 55,
        specialAttack: 135,
        specialDefense: 135,
        speed: 135,
      },
    ],
    [
      "Iron Hands",
      {
        hp: 154,
        attack: 140,
        defense: 108,
        specialAttack: 50,
        specialDefense: 68,
        speed: 50,
      },
    ],
    [
      "Gholdengo",
      {
        hp: 87,
        attack: 60,
        defense: 95,
        specialAttack: 133,
        specialDefense: 91,
        speed: 84,
      },
    ],
  ])("returns correct base stats for %s", (species, expected) => {
    expect(getBaseStats(species)).toEqual(expected);
  });
});

// =============================================================================
// Champions Reg M-B — mega base stats
// =============================================================================

describe("getBaseStats — Champions Reg M-B synthetic megas", () => {
  it.each([
    // Brand-new M-B megas with custom stat entries
    [
      "Eelektross-Mega",
      {
        hp: 85,
        attack: 145,
        defense: 80,
        specialAttack: 135,
        specialDefense: 90,
        speed: 80,
      },
    ],
    [
      "Falinks-Mega",
      {
        hp: 65,
        attack: 135,
        defense: 135,
        specialAttack: 70,
        specialDefense: 65,
        speed: 100,
      },
    ],
    [
      "Dragalge-Mega",
      {
        hp: 65,
        attack: 85,
        defense: 105,
        specialAttack: 132,
        specialDefense: 163,
        speed: 44,
      },
    ],
  ])(
    "returns correct base stats for brand-new M-B mega: %s",
    (species, expected) => {
      expect(getBaseStats(species)).toEqual(expected);
    }
  );

  it("resolves Metagross-Mega via @pkmn/dex Gen 6 (returning mega — no custom entry needed)", () => {
    // Metagross-Mega is a standard Gen 6/7 mega present in @pkmn/dex; it must
    // resolve without a custom CHAMPIONS_EXCLUSIVE_MEGA_STATS entry.
    const stats = getBaseStats("Metagross-Mega");
    expect(stats).not.toBeNull();
    expect(stats).toEqual({
      hp: 80,
      attack: 145,
      defense: 150,
      specialAttack: 105,
      specialDefense: 110,
      speed: 110,
    });
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

// =============================================================================
// Pokemon Champions (Gen 10) — SP stat formulas
// =============================================================================

describe("calculateChampionsHP", () => {
  // Formula: floor((base * 2 + 31) * 50 / 100) + 50 + 10 + sp

  it("calculates HP with 0 SP", () => {
    // Incineroar base HP 95: floor((95*2+31)*50/100) + 60 = floor(22100/100) + 60 = 110 + 60 = 170 + 0 = 170
    // Wait: floor((190+31)*50/100) = floor(221*50/100) = floor(11050/100) = floor(110.5) = 110
    // 110 + 50 + 10 + 0 = 170
    expect(calculateChampionsHP(95, 0)).toBe(170);
  });

  it("adds SP directly to the HP total", () => {
    // Same as above but sp=32: 170 + 32 = 202
    expect(calculateChampionsHP(95, 32)).toBe(202);
  });

  it("calculates HP for a low base stat with some SP", () => {
    // Pikachu base HP 35: floor((35*2+31)*50/100) + 60 + sp
    // floor(101*50/100) + 60 + sp = floor(5050/100) + 60 + sp = 50 + 60 + sp = 110 + sp
    expect(calculateChampionsHP(35, 0)).toBe(110);
    expect(calculateChampionsHP(35, 16)).toBe(126);
    expect(calculateChampionsHP(35, 32)).toBe(142);
  });

  it("returns 1 for base 1 (Shedinja equivalent)", () => {
    expect(calculateChampionsHP(1, 0)).toBe(1);
    expect(calculateChampionsHP(1, 32)).toBe(1);
  });

  it.each([
    // [base, sp, expected]
    // formula: floor((base*2+31)*50/100) + 60 + sp
    [100, 0, Math.floor(((200 + 31) * 50) / 100) + 60], // 115 + 60 = 175
    [108, 0, Math.floor(((216 + 31) * 50) / 100) + 60], // 123 + 60 = 183
    [50, 10, Math.floor(((100 + 31) * 50) / 100) + 70], // 65 + 70 = 135
  ])("calculateChampionsHP(base=%i, sp=%i) = %i", (base, sp, expected) => {
    expect(calculateChampionsHP(base, sp)).toBe(expected);
  });
});

describe("calculateChampionsStat", () => {
  // Formula: floor(((floor((base * 2 + 31) * 50 / 100) + 5) + sp) * nature)

  it("calculates a stat with 0 SP and neutral nature (1.0)", () => {
    // Incineroar Atk base 115: floor((115*2+31)*50/100) + 5
    // = floor(261*50/100) + 5 = floor(13050/100) + 5 = 130 + 5 = 135
    // floor(135 * 1.0) = 135
    expect(calculateChampionsStat(115, 0, 1.0)).toBe(135);
  });

  it("adds SP before nature multiply", () => {
    // Same base but sp=32: floor((135 + 32) * 1.0) = 167
    expect(calculateChampionsStat(115, 32, 1.0)).toBe(167);
  });

  it("applies boosting nature (1.1) correctly", () => {
    // Incineroar Atk base 115, sp=0, 1.1 nature:
    // floor(135 * 1.1) = floor(148.5) = 148
    expect(calculateChampionsStat(115, 0, 1.1)).toBe(148);
  });

  it("applies reducing nature (0.9) correctly", () => {
    // Incineroar Atk base 115, sp=0, 0.9 nature:
    // floor(135 * 0.9) = floor(121.5) = 121
    expect(calculateChampionsStat(115, 0, 0.9)).toBe(121);
  });

  it("SP adds before nature multiply, not after", () => {
    // base=100, sp=10, nature=1.1
    // inner = floor((200+31)*50/100) + 5 = floor(11550/100) + 5 = 115 + 5 = 120 (Wait: 231*50=11550, /100=115.5, floor=115)
    // Wait: floor((100*2+31)*50/100) = floor(231*50/100) = floor(11550/100) = 115
    // inner = 115 + 5 = 120
    // floor((120 + 10) * 1.1) = floor(130 * 1.1) = floor(143) = 143
    expect(calculateChampionsStat(100, 10, 1.1)).toBe(143);
    // Verify SP is added before nature: if SP were added after:
    // floor(120 * 1.1) + 10 = floor(132) + 10 = 142 (different result)
    expect(calculateChampionsStat(100, 10, 1.1)).not.toBe(142);
  });

  it.each([
    // [base, sp, nature, expected]
    // floor(((floor((base*2+31)*50/100) + 5) + sp) * nature)
    [60, 0, 1.0, Math.floor((Math.floor(((120 + 31) * 50) / 100) + 5) * 1.0)],
    [
      90,
      32,
      1.0,
      Math.floor((Math.floor(((180 + 31) * 50) / 100) + 5 + 32) * 1.0),
    ],
    [
      130,
      16,
      1.1,
      Math.floor((Math.floor(((260 + 31) * 50) / 100) + 5 + 16) * 1.1),
    ],
  ])(
    "calculateChampionsStat(base=%i, sp=%i, nature=%f) = %i",
    (base, sp, nature, expected) => {
      expect(calculateChampionsStat(base, sp, nature)).toBe(expected);
    }
  );
});
