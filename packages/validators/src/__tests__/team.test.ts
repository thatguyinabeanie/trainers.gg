import {
  parseShowdownText,
  validateTeamStructure,
  parsePokepaseUrl,
  getPokepaseRawUrl,
  getPkmnFormat,
  FORMAT_MAP,
  teamSubmissionSchema,
} from "../team";

// A valid Showdown export for a single Pokemon
const VALID_SHOWDOWN_MON = `Pikachu @ Light Ball
Ability: Static
Level: 50
Tera Type: Electric
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
IVs: 0 Atk
- Thunderbolt
- Surf
- Volt Switch
- Protect`;

// A two-Pokemon team
const TWO_MON_TEAM = `${VALID_SHOWDOWN_MON}

Charizard @ Choice Specs
Ability: Solar Power
Level: 50
Tera Type: Fire
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Flamethrower
- Air Slash
- Focus Blast
- Dragon Pulse`;

describe("parseShowdownText", () => {
  it("parses a single Pokemon from Showdown export", () => {
    const team = parseShowdownText(VALID_SHOWDOWN_MON);
    expect(team).toHaveLength(1);
    expect(team[0]!.species).toBe("Pikachu");
    expect(team[0]!.held_item).toBe("Light Ball");
    expect(team[0]!.ability).toBe("Static");
    expect(team[0]!.level).toBe(50);
    expect(team[0]!.nature).toBe("Timid");
    expect(team[0]!.move1).toBe("Thunderbolt");
    expect(team[0]!.move2).toBe("Surf");
    expect(team[0]!.move3).toBe("Volt Switch");
    expect(team[0]!.move4).toBe("Protect");
    expect(team[0]!.ev_special_attack).toBe(252);
    expect(team[0]!.ev_speed).toBe(252);
    expect(team[0]!.iv_attack).toBe(0);
  });

  it("parses a multi-Pokemon team", () => {
    const team = parseShowdownText(TWO_MON_TEAM);
    expect(team).toHaveLength(2);
    expect(team[0]!.species).toBe("Pikachu");
    expect(team[1]!.species).toBe("Charizard");
  });

  it("returns empty array for empty string", () => {
    expect(parseShowdownText("")).toHaveLength(0);
  });

  it("returns empty array for nonsense input", () => {
    expect(parseShowdownText("this is not a pokemon")).toHaveLength(0);
  });

  it("defaults level to 50 when not specified", () => {
    const text = `Pikachu
Ability: Static
- Thunderbolt`;
    const team = parseShowdownText(text);
    expect(team[0]!.level).toBe(50);
  });

  it("defaults IVs to 31 when not specified", () => {
    const team = parseShowdownText(VALID_SHOWDOWN_MON);
    // The export explicitly sets atk IV to 0, rest should be 31
    expect(team[0]!.iv_hp).toBe(31);
    expect(team[0]!.iv_attack).toBe(0);
    expect(team[0]!.iv_defense).toBe(31);
  });

  it("defaults EVs to 0 when not specified", () => {
    const text = `Pikachu
Ability: Static
- Thunderbolt`;
    const team = parseShowdownText(text);
    // No EVs specified, so they all default to 0
    expect(team[0]!.ev_hp).toBe(0);
    expect(team[0]!.ev_defense).toBe(0);
  });
});

describe("validateTeamStructure", () => {
  it("passes for a valid single-Pokemon team", () => {
    const team = parseShowdownText(VALID_SHOWDOWN_MON);
    const errors = validateTeamStructure(team);
    expect(errors).toHaveLength(0);
  });

  it("fails for an empty team", () => {
    const errors = validateTeamStructure([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.source).toBe("structure");
    expect(errors[0]!.message).toContain("at least 1");
  });

  it("detects duplicate species", () => {
    const team = parseShowdownText(VALID_SHOWDOWN_MON);
    // Duplicate the single mon
    const errors = validateTeamStructure([...team, ...team]);
    const dupError = errors.find((e) =>
      e.message.includes("Duplicate species")
    );
    expect(dupError).toBeDefined();
  });

  it("detects duplicate items", () => {
    const team = parseShowdownText(TWO_MON_TEAM);
    // Force same item on both
    team[1]!.held_item = "Light Ball";
    const errors = validateTeamStructure(team);
    const itemError = errors.find((e) => e.message.includes("Duplicate item"));
    expect(itemError).toBeDefined();
  });

  it("detects Pokemon with no moves", () => {
    const team = parseShowdownText(VALID_SHOWDOWN_MON);
    team[0]!.move1 = null;
    team[0]!.move2 = null;
    team[0]!.move3 = null;
    team[0]!.move4 = null;
    const errors = validateTeamStructure(team);
    const moveError = errors.find((e) => e.message.includes("no moves"));
    expect(moveError).toBeDefined();
  });

  it("detects Pokemon with no ability", () => {
    const team = parseShowdownText(VALID_SHOWDOWN_MON);
    team[0]!.ability = "";
    const errors = validateTeamStructure(team);
    const abilityError = errors.find((e) => e.message.includes("no ability"));
    expect(abilityError).toBeDefined();
  });
});

describe("parsePokepaseUrl", () => {
  it("parses a valid Pokepaste URL", () => {
    const result = parsePokepaseUrl("https://pokepast.es/abcdef0123456789");
    expect(result).toEqual({ isPokepaste: true, pasteId: "abcdef0123456789" });
  });

  it("handles trailing slash", () => {
    const result = parsePokepaseUrl("https://pokepast.es/abcdef0123456789/");
    expect(result).toEqual({ isPokepaste: true, pasteId: "abcdef0123456789" });
  });

  it("handles http URL", () => {
    const result = parsePokepaseUrl("http://pokepast.es/abcdef0123456789");
    expect(result).toEqual({ isPokepaste: true, pasteId: "abcdef0123456789" });
  });

  it("returns null for non-Pokepaste URLs", () => {
    expect(parsePokepaseUrl("https://google.com")).toBeNull();
  });

  it("returns null for raw Showdown text", () => {
    expect(parsePokepaseUrl(VALID_SHOWDOWN_MON)).toBeNull();
  });

  it("returns null for Pokepaste URL with invalid ID length", () => {
    expect(parsePokepaseUrl("https://pokepast.es/abc")).toBeNull();
  });
});

describe("getPokepaseRawUrl", () => {
  it("builds the raw URL from a paste ID", () => {
    expect(getPokepaseRawUrl("abcdef0123456789")).toBe(
      "https://pokepast.es/abcdef0123456789/raw"
    );
  });
});

describe("getPkmnFormat / FORMAT_MAP", () => {
  it("maps reg-i to gen9vgc2025regi", () => {
    expect(getPkmnFormat("reg-i")).toBe("gen9vgc2025regi");
  });

  it("maps ou to gen9ou", () => {
    expect(getPkmnFormat("ou")).toBe("gen9ou");
  });

  it("returns null for unknown formats", () => {
    expect(getPkmnFormat("unknown-format")).toBeNull();
  });

  it("has entries for all expected formats", () => {
    const expectedKeys = [
      "reg-i",
      "reg-h",
      "reg-g",
      "reg-f",
      "reg-e",
      "reg-d",
      "ou",
      "uu",
      "ubers",
      "lc",
      "doubles-ou",
      "monotype",
    ];
    for (const key of expectedKeys) {
      expect(FORMAT_MAP[key]).toBeDefined();
    }
  });
});

describe("teamSubmissionSchema", () => {
  it("accepts valid input", () => {
    const result = teamSubmissionSchema.safeParse({
      tournamentId: 1,
      rawText: VALID_SHOWDOWN_MON,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing tournamentId", () => {
    const result = teamSubmissionSchema.safeParse({
      rawText: VALID_SHOWDOWN_MON,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty rawText", () => {
    const result = teamSubmissionSchema.safeParse({
      tournamentId: 1,
      rawText: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative tournamentId", () => {
    const result = teamSubmissionSchema.safeParse({
      tournamentId: -1,
      rawText: "something",
    });
    expect(result.success).toBe(false);
  });
});
