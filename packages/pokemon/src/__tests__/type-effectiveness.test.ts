import {
  getTypeEffectiveness,
  getDefensiveMatchups,
  calculateTeamCoverage,
  calculateTeamSynergy,
  getTypeColor,
  getEffectivenessDisplay,
  POKEMON_TYPES,
  type PokemonType,
} from "../type-effectiveness";

// -- All 18 types for iteration tests --
const ALL_TYPES: PokemonType[] = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

describe("getTypeEffectiveness", () => {
  // -- Super-effective cases --
  it("returns 2 for Fire attacking Grass (super-effective)", () => {
    expect(getTypeEffectiveness("Fire", ["Grass"])).toBe(2);
  });

  it("returns 2 for Water attacking Fire", () => {
    expect(getTypeEffectiveness("Water", ["Fire"])).toBe(2);
  });

  it("returns 2 for Electric attacking Water", () => {
    expect(getTypeEffectiveness("Electric", ["Water"])).toBe(2);
  });

  it("returns 2 for Fighting attacking Normal", () => {
    expect(getTypeEffectiveness("Fighting", ["Normal"])).toBe(2);
  });

  // -- Not very effective cases --
  it("returns 0.5 for Fire attacking Water (not very effective)", () => {
    expect(getTypeEffectiveness("Fire", ["Water"])).toBe(0.5);
  });

  it("returns 0.5 for Grass attacking Fire", () => {
    expect(getTypeEffectiveness("Grass", ["Fire"])).toBe(0.5);
  });

  // -- Immunity cases --
  it("returns 0 for Normal attacking Ghost (immune)", () => {
    expect(getTypeEffectiveness("Normal", ["Ghost"])).toBe(0);
  });

  it("returns 0 for Electric attacking Ground (immune)", () => {
    expect(getTypeEffectiveness("Electric", ["Ground"])).toBe(0);
  });

  it("returns 0 for Ghost attacking Normal (immune)", () => {
    expect(getTypeEffectiveness("Ghost", ["Normal"])).toBe(0);
  });

  it("returns 0 for Fighting attacking Ghost (immune)", () => {
    expect(getTypeEffectiveness("Fighting", ["Ghost"])).toBe(0);
  });

  it("returns 0 for Dragon attacking Fairy (immune)", () => {
    expect(getTypeEffectiveness("Dragon", ["Fairy"])).toBe(0);
  });

  it("returns 0 for Ground attacking Flying (immune)", () => {
    expect(getTypeEffectiveness("Ground", ["Flying"])).toBe(0);
  });

  it("returns 0 for Psychic attacking Dark (immune)", () => {
    expect(getTypeEffectiveness("Psychic", ["Dark"])).toBe(0);
  });

  it("returns 0 for Poison attacking Steel (immune)", () => {
    expect(getTypeEffectiveness("Poison", ["Steel"])).toBe(0);
  });

  // -- Neutral cases --
  it("returns 1 for Normal attacking Normal (neutral)", () => {
    expect(getTypeEffectiveness("Normal", ["Normal"])).toBe(1);
  });

  it("returns 1 for Fire attacking Electric (neutral, not in chart)", () => {
    expect(getTypeEffectiveness("Fire", ["Electric"])).toBe(1);
  });

  // -- Dual-type interactions --
  it("returns 4 for Ground attacking Fire/Steel (4x effective)", () => {
    // Ground is 2x vs Fire and 2x vs Steel => 4x
    expect(getTypeEffectiveness("Ground", ["Fire", "Steel"])).toBe(4);
  });

  it("returns 0.25 for Fire attacking Water/Dragon (double resisted)", () => {
    // Fire is 0.5 vs Water and 0.5 vs Dragon => 0.25
    expect(getTypeEffectiveness("Fire", ["Water", "Dragon"])).toBe(0.25);
  });

  it("returns 0 for Electric attacking Water/Ground (one immune)", () => {
    // Electric is 2x vs Water but 0x vs Ground => 0
    expect(getTypeEffectiveness("Electric", ["Water", "Ground"])).toBe(0);
  });

  it("returns 1 for Ice attacking Grass/Fire (cancels out)", () => {
    // Ice is 2x vs Grass but 0.5 vs Fire => 1
    expect(getTypeEffectiveness("Ice", ["Grass", "Fire"])).toBe(1);
  });
});

describe("getDefensiveMatchups", () => {
  it("returns correct matchups for a single type (Normal)", () => {
    const matchups = getDefensiveMatchups(["Normal"]);
    // Normal is weak to Fighting (2x) and immune to Ghost (0x)
    expect(matchups.weaknesses["Fighting"]).toBe(2);
    expect(matchups.immunities).toContain("Ghost");
    expect(Object.keys(matchups.resistances)).toHaveLength(0);
  });

  it("returns correct matchups for a single type (Steel)", () => {
    const matchups = getDefensiveMatchups(["Steel"]);
    // Steel has many resistances, weak to Fire/Fighting/Ground
    expect(matchups.weaknesses["Fire"]).toBe(2);
    expect(matchups.weaknesses["Fighting"]).toBe(2);
    expect(matchups.weaknesses["Ground"]).toBe(2);
    // Steel is immune to Poison
    expect(matchups.immunities).toContain("Poison");
    // Steel resists Normal, Grass, Ice, Flying, Psychic, Bug, Rock, Dragon, Steel, Fairy
    expect(matchups.resistances["Normal"]).toBe(0.5);
    expect(matchups.resistances["Ice"]).toBe(0.5);
    expect(matchups.resistances["Fairy"]).toBe(0.5);
  });

  it("returns correct matchups for dual types (Fire/Flying)", () => {
    const matchups = getDefensiveMatchups(["Fire", "Flying"]);
    // Fire/Flying: 4x weak to Rock, 2x weak to Water, Electric
    // Immune to Ground
    expect(matchups.weaknesses["Rock"]).toBe(4);
    expect(matchups.weaknesses["Water"]).toBe(2);
    expect(matchups.weaknesses["Electric"]).toBe(2);
    expect(matchups.immunities).toContain("Ground");
    // Resists Bug (0.25 = Fire 0.5 * Flying 0.5)
    expect(matchups.resistances["Bug"]).toBe(0.25);
  });

  it("returns correct matchups for Ghost/Dark (Spiritomb-like)", () => {
    const matchups = getDefensiveMatchups(["Ghost", "Dark"]);
    // Ghost/Dark: Immune to Normal, Fighting, Psychic
    expect(matchups.immunities).toContain("Normal");
    expect(matchups.immunities).toContain("Fighting");
    expect(matchups.immunities).toContain("Psychic");
    // Weak to Fairy
    expect(matchups.weaknesses["Fairy"]).toBe(2);
  });

  it("does not list neutral matchups (1x) in any category", () => {
    const matchups = getDefensiveMatchups(["Normal"]);
    // All types that are neither weak, resistant, nor immune should not appear
    const allListedTypes = [
      ...Object.keys(matchups.weaknesses),
      ...Object.keys(matchups.resistances),
      ...matchups.immunities,
    ];
    // Normal type: Fighting is a weakness, Ghost is immune, rest are neutral
    // Neutral types should not be listed
    expect(allListedTypes).not.toContain("Fire");
    expect(allListedTypes).not.toContain("Water");
  });
});

describe("calculateTeamCoverage", () => {
  it("calculates coverage for a simple team", () => {
    // A team with Charizard (Fire/Flying) and Garchomp (Dragon/Ground)
    const team = [
      { species: "Charizard", moves: ["Flamethrower"] },
      { species: "Garchomp", moves: ["Earthquake"] },
    ];
    const result = calculateTeamCoverage(team);

    // Fire is super-effective against Grass, Ice, Bug, Steel
    // Flying is super-effective against Grass, Fighting, Bug
    // Dragon is super-effective against Dragon
    // Ground is super-effective against Fire, Electric, Poison, Rock, Steel
    expect(result.coverage.size).toBeGreaterThan(0);
    expect(result.coverage.has("Grass")).toBe(true);
    expect(result.coverage.has("Steel")).toBe(true);
    expect(result.coverage.has("Ice")).toBe(true);
  });

  it("returns empty coverage for unknown species", () => {
    const team = [{ species: "Fakemon", moves: ["Tackle"] }];
    const result = calculateTeamCoverage(team);
    expect(result.coverage.size).toBe(0);
  });

  it("tracks super-effective hit counts", () => {
    const team = [
      { species: "Charizard", moves: ["Flamethrower"] }, // Fire/Flying
    ];
    const result = calculateTeamCoverage(team);

    // Fire is 2x vs Grass, so superEffective should include Grass
    expect(result.superEffective["Grass"]).toBeDefined();
    expect(result.superEffective["Grass"]).toBeGreaterThanOrEqual(2);
  });
});

describe("calculateTeamSynergy", () => {
  it("identifies shared weaknesses across team members", () => {
    // A team with Charizard and Incineroar (both Fire type -> both weak to Water, Rock, Ground)
    const team = [{ species: "Charizard" }, { species: "Incineroar" }];
    const result = calculateTeamSynergy(team);

    // Both Fire types share Water and Rock weaknesses
    expect(result.sharedWeaknesses["Rock"]).toBeGreaterThanOrEqual(2);
  });

  it("identifies uncovered types", () => {
    // Single team member - many types will be uncovered
    const team = [{ species: "Pikachu" }]; // Electric only
    const result = calculateTeamSynergy(team);

    // Electric resists Electric, Flying, Steel
    // Many types won't be covered
    expect(result.uncoveredTypes.size).toBeGreaterThan(0);
  });

  it("determines defensiveCore status based on shared weaknesses", () => {
    // A diverse team should have good defensive synergy
    const team = [
      { species: "Charizard" }, // Fire/Flying
      { species: "Garchomp" }, // Dragon/Ground
      { species: "Amoonguss" }, // Grass/Poison
      { species: "Gholdengo" }, // Steel/Ghost
    ];
    const result = calculateTeamSynergy(team);

    // defensiveCore = true if no type hits more than half the team
    expect(typeof result.defensiveCore).toBe("boolean");
  });

  it("handles unknown species gracefully", () => {
    const team = [{ species: "FakeSpecies" }];
    const result = calculateTeamSynergy(team);

    // With no recognized types, no shared weaknesses
    expect(Object.keys(result.sharedWeaknesses)).toHaveLength(0);
    // All types uncovered (no resistances or immunities)
    expect(result.uncoveredTypes.size).toBe(18);
    // defensiveCore is true since no weaknesses exceed limit
    expect(result.defensiveCore).toBe(true);
  });
});

describe("POKEMON_TYPES", () => {
  it("contains known Pokemon with correct types", () => {
    expect(POKEMON_TYPES["Pikachu"]).toEqual(["Electric"]);
    expect(POKEMON_TYPES["Charizard"]).toEqual(["Fire", "Flying"]);
    expect(POKEMON_TYPES["Garchomp"]).toEqual(["Dragon", "Ground"]);
    expect(POKEMON_TYPES["Gholdengo"]).toEqual(["Steel", "Ghost"]);
  });

  it("returns undefined for Pokemon not in the table", () => {
    expect(POKEMON_TYPES["Bulbasaur"]).toBeUndefined();
  });
});

describe("getTypeColor", () => {
  it("returns a valid hex color for every type", () => {
    for (const type of ALL_TYPES) {
      const color = getTypeColor(type);
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("returns expected colors for specific types", () => {
    expect(getTypeColor("Fire")).toBe("#F08030");
    expect(getTypeColor("Water")).toBe("#6890F0");
    expect(getTypeColor("Grass")).toBe("#78C850");
    expect(getTypeColor("Electric")).toBe("#F8D030");
    expect(getTypeColor("Normal")).toBe("#A8A878");
    expect(getTypeColor("Dragon")).toBe("#7038F8");
  });

  it("returns distinct colors for each type", () => {
    const colors = ALL_TYPES.map(getTypeColor);
    const unique = new Set(colors);
    expect(unique.size).toBe(18);
  });
});

describe("getEffectivenessDisplay", () => {
  it('returns "Immune" for 0x', () => {
    const result = getEffectivenessDisplay(0);
    expect(result.label).toBe("Immune");
    expect(result.color).toBe("#666666");
  });

  it('returns "1/4x" for 0.25x', () => {
    const result = getEffectivenessDisplay(0.25);
    expect(result.label).toBe("1/4x");
    expect(result.color).toBe("#FF6B6B");
  });

  it('returns "1/2x" for 0.5x', () => {
    const result = getEffectivenessDisplay(0.5);
    expect(result.label).toBe("1/2x");
    expect(result.color).toBe("#FFB366");
  });

  it('returns "1x" for 1x (neutral)', () => {
    const result = getEffectivenessDisplay(1);
    expect(result.label).toBe("1x");
    expect(result.color).toBe("#999999");
  });

  it('returns "2x" for 2x (super effective)', () => {
    const result = getEffectivenessDisplay(2);
    expect(result.label).toBe("2x");
    expect(result.color).toBe("#4ECDC4");
  });

  it('returns "4x" for 4x', () => {
    const result = getEffectivenessDisplay(4);
    expect(result.label).toBe("4x");
    expect(result.color).toBe("#45B7D1");
  });

  it("returns the multiplier as a label for unexpected values", () => {
    const result = getEffectivenessDisplay(8);
    expect(result.label).toBe("8x");
    expect(result.color).toBe("#999999");
  });
});
