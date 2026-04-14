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

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { submitNewTeam } from "../new-team-submit";

// =============================================================================
// Fixtures
// =============================================================================

/** A minimal parsed pokemon returned by parseShowdownText. */
function makeParsedPokemon(species: string) {
  return {
    species,
    ability: "Static",
    nature: "Timid",
    move1: "Thunderbolt",
    move2: null,
    move3: null,
    move4: null,
    held_item: null,
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
});
