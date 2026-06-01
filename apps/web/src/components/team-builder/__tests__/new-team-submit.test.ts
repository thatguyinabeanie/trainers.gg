import { describe, it, expect, beforeEach } from "@jest/globals";

// =============================================================================
// Module-level mocks — must be hoisted before imports
// =============================================================================

const mockCreateTeamAction = jest.fn();
const mockAddPokemonToTeamAction = jest.fn();

jest.mock("@/actions/teams", () => ({
  createTeamAction: (...args: unknown[]) => mockCreateTeamAction(...args),
  addPokemonToTeamAction: (...args: unknown[]) =>
    mockAddPokemonToTeamAction(...args),
}));

const mockParseShowdownText = jest.fn();

jest.mock("@trainers/validators", () => ({
  parseShowdownText: (...args: unknown[]) => mockParseShowdownText(...args),
}));

const mockGetLegalSpecies = jest.fn();
const mockGetLegalItems = jest.fn();
const mockGetLegalMoves = jest.fn();
const mockGetLegalTeraTypes = jest.fn();
const mockIsLegalAbility = jest.fn();

// Re-create the LEGALITY_UNAVAILABLE sentinel inside the mock so
// production-code `result === LEGALITY_UNAVAILABLE` checks line up with
// whatever the mock returns.
const MOCK_LEGALITY_UNAVAILABLE: unique symbol = Symbol("legality-unavailable");
jest.mock("@trainers/pokemon", () => ({
  getLegalSpecies: (...args: unknown[]) => mockGetLegalSpecies(...args),
  getLegalItems: (...args: unknown[]) => mockGetLegalItems(...args),
  getLegalMoves: (...args: unknown[]) => mockGetLegalMoves(...args),
  getLegalTeraTypes: (...args: unknown[]) => mockGetLegalTeraTypes(...args),
  isLegalAbility: (...args: unknown[]) => mockIsLegalAbility(...args),
  LEGALITY_UNAVAILABLE: MOCK_LEGALITY_UNAVAILABLE,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { submitNewTeam } from "../new-team-submit";

// =============================================================================
// Fixtures
// =============================================================================

/** A minimal parsed pokemon returned by parseShowdownText. */
function makeParsedPokemon(species: string, held_item: string | null = null) {
  return {
    species,
    ability: "Static",
    nature: "Timid",
    move1: "Thunderbolt",
    move2: null,
    move3: null,
    move4: null,
    held_item,
    level: 50,
    nickname: null,
    gender: null,
    is_shiny: false,
    tera_type: null,
    ev_hp: 0,
    ev_attack: 0,
    ev_defense: 0,
    ev_special_attack: 252,
    ev_special_defense: 4,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
  };
}

const SPECIES = [
  "Pikachu",
  "Rillaboom",
  "Incineroar",
  "Urshifu",
  "Flutter Mane",
  "Iron Hands",
];

/** Build a list of N parsed pokemon. */
function makeParsedTeam(count: number) {
  return SPECIES.slice(0, count).map(makeParsedPokemon);
}

const BASE_INPUT = {
  altId: 1,
  name: "My Team",
  format: "gen9vgc2026regi",
  mode: "empty" as const,
  paste: "",
};

// =============================================================================
// Tests
// =============================================================================

describe("submitNewTeam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: createTeamAction succeeds with id 42
    mockCreateTeamAction.mockResolvedValue({ success: true, data: { id: 42 } });
    // Default: addPokemonToTeamAction succeeds
    mockAddPokemonToTeamAction.mockResolvedValue({
      success: true,
      data: { pokemonId: 1 },
    });
    // Default: no format legality restriction (permissive)
    mockGetLegalSpecies.mockReturnValue(undefined);
    mockGetLegalItems.mockReturnValue(undefined);
    mockGetLegalMoves.mockReturnValue(undefined);
    mockGetLegalTeraTypes.mockReturnValue(undefined);
    mockIsLegalAbility.mockReturnValue(true);
  });

  // ---------------------------------------------------------------------------
  // createTeamAction failure
  // ---------------------------------------------------------------------------

  it("returns { status: 'error' } when createTeamAction fails", async () => {
    mockCreateTeamAction.mockResolvedValueOnce({
      success: false,
      error: "Not authorized",
    });

    const result = await submitNewTeam({ ...BASE_INPUT });

    expect(result).toEqual({ status: "error", error: "Not authorized" });
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Happy path — empty mode
  // ---------------------------------------------------------------------------

  it("returns { status: 'ok', teamId } for empty mode", async () => {
    const result = await submitNewTeam({ ...BASE_INPUT, mode: "empty" });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockCreateTeamAction).toHaveBeenCalledWith(
      1,
      "My Team",
      "gen9vgc2026regi"
    );
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Import mode — empty string paste treated as empty mode
  // ---------------------------------------------------------------------------

  it("returns { status: 'ok', teamId } when import mode has empty string paste", async () => {
    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  it("returns { status: 'ok', teamId } when import mode has whitespace-only paste", async () => {
    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "   \n\t  ",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Import mode — unparseable paste
  // ---------------------------------------------------------------------------

  it("returns { status: 'empty-paste', teamId } when paste cannot be parsed", async () => {
    mockParseShowdownText.mockReturnValueOnce([]);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "this is not valid showdown text",
    });

    expect(result).toEqual({ status: "empty-paste", teamId: 42 });
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Happy path — import mode with valid paste
  // ---------------------------------------------------------------------------

  it("returns { status: 'ok', teamId } and calls addPokemonToTeamAction for each pokemon", async () => {
    const parsed = makeParsedTeam(3);
    mockParseShowdownText.mockReturnValueOnce(parsed);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste:
        "Pikachu @ Light Ball\nRillaboom @ Choice Band\nIncineroar @ Safety Goggles",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockAddPokemonToTeamAction).toHaveBeenCalledTimes(3);
    // Positions are 1-indexed
    expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
      1,
      42,
      expect.objectContaining({ species: "Pikachu" }),
      1
    );
    expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
      2,
      42,
      expect.objectContaining({ species: "Rillaboom" }),
      2
    );
    expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
      3,
      42,
      expect.objectContaining({ species: "Incineroar" }),
      3
    );
  });

  it("caps the import at 6 pokemon even if paste has more", async () => {
    // 7 species — only 6 should be imported
    const parsed = [
      ...makeParsedTeam(6),
      makeParsedPokemon("Landorus-Therian"),
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "big paste",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockAddPokemonToTeamAction).toHaveBeenCalledTimes(6);
  });

  it("returns { status: 'ok', teamId } for a 6-pokemon import", async () => {
    const parsed = makeParsedTeam(6);
    mockParseShowdownText.mockReturnValueOnce(parsed);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "full team paste",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockAddPokemonToTeamAction).toHaveBeenCalledTimes(6);
  });

  // ---------------------------------------------------------------------------
  // Partial import failures
  // ---------------------------------------------------------------------------

  it("returns { status: 'partial', teamId, failedSpecies } when some adds fail", async () => {
    const parsed = makeParsedTeam(3); // Pikachu, Rillaboom, Incineroar
    mockParseShowdownText.mockReturnValueOnce(parsed);

    // Only the second (Rillaboom) fails
    mockAddPokemonToTeamAction
      .mockResolvedValueOnce({ success: true, data: { pokemonId: 1 } })
      .mockResolvedValueOnce({ success: false, error: "DB error" })
      .mockResolvedValueOnce({ success: true, data: { pokemonId: 3 } });

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "three pokemon",
    });

    expect(result).toEqual({
      status: "partial",
      teamId: 42,
      failedSpecies: ["Rillaboom"],
    });
  });

  it("returns { status: 'partial' } listing all failed species when multiple fail", async () => {
    const parsed = makeParsedTeam(3);
    mockParseShowdownText.mockReturnValueOnce(parsed);

    // All three fail
    mockAddPokemonToTeamAction.mockResolvedValue({
      success: false,
      error: "DB error",
    });

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "three pokemon",
    });

    expect(result).toEqual({
      status: "partial",
      teamId: 42,
      failedSpecies: ["Pikachu", "Rillaboom", "Incineroar"],
    });
  });

  // ---------------------------------------------------------------------------
  // Gender mapping
  // ---------------------------------------------------------------------------

  it("maps Male/Female gender values to the DB enum; other values become null", async () => {
    const parsed = [
      { ...makeParsedPokemon("Meowstic"), gender: "Male" },
      { ...makeParsedPokemon("Meowstic-F"), gender: "Female" },
      { ...makeParsedPokemon("Pikachu"), gender: "Genderless" },
      { ...makeParsedPokemon("Ditto"), gender: null },
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);

    await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "gendered pokemon",
    });

    // position 1 — Male
    expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
      1,
      42,
      expect.objectContaining({ gender: "Male" }),
      1
    );
    // position 2 — Female
    expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
      2,
      42,
      expect.objectContaining({ gender: "Female" }),
      2
    );
    // position 3 — Genderless maps to null
    expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
      3,
      42,
      expect.objectContaining({ gender: null }),
      3
    );
    // position 4 — null stays null
    expect(mockAddPokemonToTeamAction).toHaveBeenNthCalledWith(
      4,
      42,
      expect.objectContaining({ gender: null }),
      4
    );
  });

  // ---------------------------------------------------------------------------
  // move1 null → empty string coercion
  // ---------------------------------------------------------------------------

  it("coerces null move1 to empty string for the DB insert", async () => {
    const parsed = [
      { ...makeParsedPokemon("Shedinja"), move1: null as unknown as string },
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);

    await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "Shedinja",
    });

    expect(mockAddPokemonToTeamAction).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ move1: "" }),
      1
    );
  });

  // ---------------------------------------------------------------------------
  // Format legality guards
  // ---------------------------------------------------------------------------

  it("returns { status: 'error' } without creating a team when paste contains an illegal species", async () => {
    // Koraidon is not legal in championsvgc2026regma (only Miraidon is)
    const parsed = [
      makeParsedPokemon("Flutter Mane"), // legal
      makeParsedPokemon("Koraidon"), // illegal in Reg MA (restricted to Miraidon)
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // Simulate format legality: only Flutter Mane is in the legal set, not Koraidon
    const legalSet = new Set(["Flutter Mane", "Incineroar", "Rillaboom"]);
    mockGetLegalSpecies.mockReturnValueOnce(legalSet);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9championsvgc2026regma",
      mode: "import",
      paste: "Flutter Mane\nKoraidon",
    });

    expect(result.status).toBe("error");
    expect((result as { status: "error"; error: string }).error).toContain(
      "Koraidon"
    );
    // Team row must NOT be created
    expect(mockCreateTeamAction).not.toHaveBeenCalled();
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  it("proceeds normally when all species are legal in the target format", async () => {
    const parsed = [
      makeParsedPokemon("Flutter Mane"),
      makeParsedPokemon("Incineroar"),
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // Both species are in the legal set
    const legalSet = new Set(["Flutter Mane", "Incineroar", "Rillaboom"]);
    mockGetLegalSpecies.mockReturnValueOnce(legalSet);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9championsvgc2026regma",
      mode: "import",
      paste: "Flutter Mane\nIncineroar",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockCreateTeamAction).toHaveBeenCalledTimes(1);
    expect(mockAddPokemonToTeamAction).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // Item legality guards
  // ---------------------------------------------------------------------------

  it("returns { status: 'error' } without creating a team when paste contains an illegal item", async () => {
    // Booster Energy is banned in gen9monotype
    const parsed = [
      makeParsedPokemon("Gardevoir", "Life Orb"), // legal item
      makeParsedPokemon("Toxapex", "Booster Energy"), // illegal item
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    const legalItems = new Set(["Life Orb", "Leftovers", "Rocky Helmet"]);
    mockGetLegalItems.mockReturnValueOnce(legalItems);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9monotype",
      mode: "import",
      paste: "Gardevoir @ Life Orb\nToxapex @ Booster Energy",
    });

    expect(result.status).toBe("error");
    expect((result as { status: "error"; error: string }).error).toContain(
      "Booster Energy"
    );
    // Team row must NOT be created
    expect(mockCreateTeamAction).not.toHaveBeenCalled();
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  it("deduplicates illegal item names in the error message", async () => {
    // Two pokemon holding the same illegal item — deduplicated in error
    const parsed = [
      makeParsedPokemon("Gardevoir", "Booster Energy"),
      makeParsedPokemon("Toxapex", "Booster Energy"),
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    const legalItems = new Set(["Life Orb", "Leftovers"]);
    mockGetLegalItems.mockReturnValueOnce(legalItems);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9monotype",
      mode: "import",
      paste: "two pokemon with illegal item",
    });

    expect(result.status).toBe("error");
    const error = (result as { status: "error"; error: string }).error;
    // "Booster Energy" appears only once even though two pokemon hold it
    expect(error.split("Booster Energy").length - 1).toBe(1);
  });

  it("proceeds normally when all held items are legal in the target format", async () => {
    const parsed = [
      makeParsedPokemon("Gardevoir", "Life Orb"),
      makeParsedPokemon("Toxapex", "Leftovers"),
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    const legalItems = new Set(["Life Orb", "Leftovers", "Rocky Helmet"]);
    mockGetLegalItems.mockReturnValueOnce(legalItems);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9monotype",
      mode: "import",
      paste: "Gardevoir @ Life Orb\nToxapex @ Leftovers",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockCreateTeamAction).toHaveBeenCalledTimes(1);
  });

  it("skips item legality check when getLegalItems returns undefined (permissive format)", async () => {
    const parsed = [makeParsedPokemon("Gardevoir", "Booster Energy")];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // getLegalItems returns undefined — permissive, no item banlist
    mockGetLegalItems.mockReturnValueOnce(undefined);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "Gardevoir @ Booster Energy",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
  });

  it("skips item legality check for pokemon with no held item", async () => {
    const parsed = [
      makeParsedPokemon("Gardevoir", null), // no item
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    const legalItems = new Set(["Life Orb"]);
    mockGetLegalItems.mockReturnValueOnce(legalItems);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9monotype",
      mode: "import",
      paste: "Gardevoir",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
  });

  // ---------------------------------------------------------------------------
  // Move legality guards
  // ---------------------------------------------------------------------------

  it("returns { status: 'error' } without creating a team when paste contains an illegal move", async () => {
    const parsed = [
      {
        ...makeParsedPokemon("Pikachu"),
        move1: "Thunderbolt", // legal
        move2: "Hyperspace Hole", // illegal for Pikachu in this format
      },
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // Pikachu's legal set does not include Hyperspace Hole
    mockGetLegalMoves.mockReturnValue(
      new Set(["Thunderbolt", "Protect", "Fake Out", "U-turn"])
    );

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9vgc2026regi",
      mode: "import",
      paste: "Pikachu\nMove: Hyperspace Hole",
    });

    expect(result.status).toBe("error");
    expect((result as { status: "error"; error: string }).error).toContain(
      "Hyperspace Hole"
    );
    expect((result as { status: "error"; error: string }).error).toContain(
      "Pikachu"
    );
    // Team row must NOT be created
    expect(mockCreateTeamAction).not.toHaveBeenCalled();
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  it("proceeds normally when all moves are legal for each species", async () => {
    const parsed = [{ ...makeParsedPokemon("Pikachu"), move1: "Thunderbolt" }];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    mockGetLegalMoves.mockReturnValue(
      new Set(["Thunderbolt", "Protect", "Fake Out"])
    );

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9vgc2026regi",
      mode: "import",
      paste: "Pikachu",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockCreateTeamAction).toHaveBeenCalledTimes(1);
  });

  it("skips move legality check when getLegalMoves returns undefined (permissive format)", async () => {
    const parsed = [
      { ...makeParsedPokemon("Pikachu"), move1: "Hyperspace Hole" },
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // getLegalMoves returns undefined — permissive, no move banlist
    mockGetLegalMoves.mockReturnValue(undefined);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "Pikachu",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
  });

  it("checks all 4 move slots per pokemon and reports all illegal moves", async () => {
    const parsed = [
      {
        ...makeParsedPokemon("Pikachu"),
        move1: "Thunderbolt", // legal
        move2: "Hyperspace Hole", // illegal
        move3: "Protect", // legal
        move4: "Mind Blown", // illegal
      },
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    mockGetLegalMoves.mockReturnValue(
      new Set(["Thunderbolt", "Protect", "Fake Out"])
    );

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9vgc2026regi",
      mode: "import",
      paste: "Pikachu",
    });

    expect(result.status).toBe("error");
    const error = (result as { status: "error"; error: string }).error;
    expect(error).toContain("Hyperspace Hole");
    expect(error).toContain("Mind Blown");
    expect(mockCreateTeamAction).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Tera type legality guards
  // ---------------------------------------------------------------------------

  it("returns { status: 'error' } without creating a team when paste contains an illegal tera type", async () => {
    const parsed = [{ ...makeParsedPokemon("Pikachu"), tera_type: "Fire" }];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // Format only allows Water and Grass tera
    mockGetLegalTeraTypes.mockReturnValueOnce(new Set(["Water", "Grass"]));

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9vgc2026regi",
      mode: "import",
      paste: "Pikachu",
    });

    expect(result.status).toBe("error");
    expect((result as { status: "error"; error: string }).error).toContain(
      "Fire"
    );
    expect(mockCreateTeamAction).not.toHaveBeenCalled();
  });

  it("returns 'Tera isn't allowed' when format disallows Tera entirely", async () => {
    const parsed = [{ ...makeParsedPokemon("Pikachu"), tera_type: "Electric" }];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // Empty set = no Tera allowed
    mockGetLegalTeraTypes.mockReturnValueOnce(new Set());

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9championsvgc2026regma",
      mode: "import",
      paste: "Pikachu",
    });

    expect(result.status).toBe("error");
    expect((result as { status: "error"; error: string }).error).toContain(
      "Tera isn't allowed"
    );
    expect(mockCreateTeamAction).not.toHaveBeenCalled();
  });

  it("proceeds normally when paste tera types are legal", async () => {
    const parsed = [{ ...makeParsedPokemon("Pikachu"), tera_type: "Water" }];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    mockGetLegalTeraTypes.mockReturnValueOnce(
      new Set(["Water", "Fire", "Grass"])
    );

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9vgc2026regi",
      mode: "import",
      paste: "Pikachu",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
  });

  it("skips tera check when getLegalTeraTypes returns undefined (permissive)", async () => {
    const parsed = [{ ...makeParsedPokemon("Pikachu"), tera_type: "Fire" }];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    mockGetLegalTeraTypes.mockReturnValueOnce(undefined);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "Pikachu",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
  });

  it("skips tera check for pokemon with no tera type", async () => {
    const parsed = [{ ...makeParsedPokemon("Pikachu"), tera_type: null }];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // Empty set = no Tera allowed, but null tera_type should pass
    mockGetLegalTeraTypes.mockReturnValueOnce(new Set());

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9championsvgc2026regma",
      mode: "import",
      paste: "Pikachu",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
  });

  // ---------------------------------------------------------------------------
  // Ability legality guards
  // ---------------------------------------------------------------------------

  it("returns { status: 'error' } without creating a team when paste contains an illegal ability", async () => {
    const parsed = [{ ...makeParsedPokemon("Smeargle"), ability: "Moody" }];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // Moody is banned in Gen 9 OU for Smeargle
    mockIsLegalAbility.mockReturnValue(false);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9ou",
      mode: "import",
      paste: "Smeargle\nAbility: Moody",
    });

    expect(result.status).toBe("error");
    expect((result as { status: "error"; error: string }).error).toContain(
      "Moody"
    );
    expect((result as { status: "error"; error: string }).error).toContain(
      "Smeargle"
    );
    expect(mockCreateTeamAction).not.toHaveBeenCalled();
    expect(mockAddPokemonToTeamAction).not.toHaveBeenCalled();
  });

  it("proceeds normally when all abilities are legal", async () => {
    const parsed = [
      { ...makeParsedPokemon("Incineroar"), ability: "Intimidate" },
    ];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    mockIsLegalAbility.mockReturnValue(true);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      format: "gen9vgc2026regi",
      mode: "import",
      paste: "Incineroar\nAbility: Intimidate",
    });

    expect(result).toEqual({ status: "ok", teamId: 42 });
    expect(mockCreateTeamAction).toHaveBeenCalledTimes(1);
  });

  it("skips ability check for pokemon with no ability", async () => {
    const parsed = [{ ...makeParsedPokemon("Pikachu"), ability: "" }];
    mockParseShowdownText.mockReturnValueOnce(parsed);
    // isLegalAbility should not be called with empty string (the guard skips)
    mockIsLegalAbility.mockReturnValue(false);

    const result = await submitNewTeam({
      ...BASE_INPUT,
      mode: "import",
      paste: "Pikachu",
    });

    // Empty ability is skipped — not checked
    expect(result).toEqual({ status: "ok", teamId: 42 });
  });
});
