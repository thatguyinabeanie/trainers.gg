import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getTournamentTeamSheets,
  getTeamSheetByRegistration,
  getMatchTeamSheets,
} from "../tournament-team-sheets";
import type { TypedClient } from "../../client";

// Minimal DB row shape matching what tournament_team_sheets returns from select("*")
type TeamSheetRow = {
  id: number;
  tournament_id: number;
  registration_id: number;
  alt_id: number;
  team_id: number;
  format: string;
  position: number;
  species: string;
  ability: string;
  held_item: string | null;
  tera_type: string | null;
  move1: string;
  move2: string | null;
  move3: string | null;
  move4: string | null;
};

function makeRow(overrides?: Partial<TeamSheetRow>): TeamSheetRow {
  return {
    id: 1,
    tournament_id: 10,
    registration_id: 1,
    alt_id: 100,
    team_id: 50,
    format: "gen9vgc2026regi",
    position: 1,
    species: "Pikachu",
    ability: "Static",
    held_item: "Light Ball",
    tera_type: "Electric",
    move1: "Thunderbolt",
    move2: "Volt Switch",
    move3: "Protect",
    move4: null,
    ...overrides,
  };
}

// Creates a mock query builder that resolves with `resolvedValue` when awaited.
// All chaining methods return `this` so they can be stacked in any order.
const createMockQueryBuilder = (resolvedValue: {
  data: TeamSheetRow[] | null;
  error: unknown;
}) => {
  const builder: {
    select: jest.Mock;
    eq: jest.Mock;
    in: jest.Mock;
    order: jest.Mock;
    then: (
      resolve: (v: { data: TeamSheetRow[] | null; error: unknown }) => void
    ) => Promise<void>;
  } = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: (resolve) => Promise.resolve(resolvedValue).then(resolve),
  };
  return builder;
};

const createMockClient = (
  resolvedValue: { data: TeamSheetRow[] | null; error: unknown } = {
    data: [],
    error: null,
  }
) => {
  const builder = createMockQueryBuilder(resolvedValue);
  return {
    from: jest.fn().mockReturnValue(builder),
    _builder: builder,
  } as unknown as TypedClient & {
    _builder: ReturnType<typeof createMockQueryBuilder>;
  };
};

describe("getTournamentTeamSheets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array when no snapshots exist", async () => {
    const mockClient = createMockClient({ data: [], error: null });

    const result = await getTournamentTeamSheets(mockClient, 10);

    expect(result).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    const mockClient = createMockClient({ data: null, error: null });

    const result = await getTournamentTeamSheets(mockClient, 10);

    expect(result).toEqual([]);
  });

  it("throws when query returns an error", async () => {
    const mockClient = createMockClient({
      data: null,
      error: { message: "DB failure" },
    });

    await expect(getTournamentTeamSheets(mockClient, 10)).rejects.toThrow(
      "Failed to fetch team sheets: DB failure"
    );
  });

  it("groups Pokemon correctly by registration_id", async () => {
    const rows = [
      makeRow({
        registration_id: 1,
        alt_id: 100,
        team_id: 50,
        position: 1,
        species: "Pikachu",
      }),
      makeRow({
        id: 2,
        registration_id: 1,
        alt_id: 100,
        team_id: 50,
        position: 2,
        species: "Garchomp",
      }),
      makeRow({
        id: 3,
        registration_id: 2,
        alt_id: 200,
        team_id: 60,
        position: 1,
        species: "Incineroar",
      }),
    ];
    const mockClient = createMockClient({ data: rows, error: null });

    const result = await getTournamentTeamSheets(mockClient, 10);

    expect(result).toHaveLength(2);

    const sheet1 = result.find((s) => s.registrationId === 1);
    expect(sheet1?.pokemon).toHaveLength(2);
    expect(sheet1?.pokemon.map((p) => p.species)).toEqual([
      "Pikachu",
      "Garchomp",
    ]);

    const sheet2 = result.find((s) => s.registrationId === 2);
    expect(sheet2?.pokemon).toHaveLength(1);
    expect(sheet2?.pokemon[0]?.species).toBe("Incineroar");
  });

  it("maps snake_case DB fields to camelCase on each sheet", async () => {
    const row = makeRow({
      registration_id: 1,
      alt_id: 101,
      team_id: 51,
      format: "gen9vgc2026regi",
      position: 1,
      species: "Flutter Mane",
      ability: "Protosynthesis",
      held_item: "Booster Energy",
      tera_type: "Fairy",
      move1: "Moonblast",
      move2: "Shadow Ball",
      move3: "Calm Mind",
      move4: "Protect",
    });
    const mockClient = createMockClient({ data: [row], error: null });

    const [sheet] = await getTournamentTeamSheets(mockClient, 10);

    // PlayerTeamSheet camelCase fields
    expect(sheet?.registrationId).toBe(1);
    expect(sheet?.altId).toBe(101);
    expect(sheet?.teamId).toBe(51);
    expect(sheet?.format).toBe("gen9vgc2026regi");

    // TeamSheetPokemon camelCase fields
    const pokemon = sheet?.pokemon[0];
    expect(pokemon?.heldItem).toBe("Booster Energy");
    expect(pokemon?.teraType).toBe("Fairy");

    // Spot-check that snake_case keys are NOT present
    expect(pokemon).not.toHaveProperty("held_item");
    expect(pokemon).not.toHaveProperty("tera_type");
  });

  it("queries the correct tournament via eq filter", async () => {
    const mockClient = createMockClient({ data: [], error: null });

    await getTournamentTeamSheets(mockClient, 42);

    expect(mockClient.from).toHaveBeenCalledWith("tournament_team_sheets");
    expect(
      (
        mockClient as unknown as {
          _builder: ReturnType<typeof createMockQueryBuilder>;
        }
      )._builder.eq
    ).toHaveBeenCalledWith("tournament_id", 42);
  });
});

describe("getTeamSheetByRegistration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no data exists", async () => {
    const mockClient = createMockClient({ data: [], error: null });

    const result = await getTeamSheetByRegistration(mockClient, 999);

    expect(result).toBeNull();
  });

  it("returns null when data is null", async () => {
    const mockClient = createMockClient({ data: null, error: null });

    const result = await getTeamSheetByRegistration(mockClient, 999);

    expect(result).toBeNull();
  });

  it("throws on query error", async () => {
    const mockClient = createMockClient({
      data: null,
      error: { message: "Query failed" },
    });

    await expect(getTeamSheetByRegistration(mockClient, 1)).rejects.toThrow(
      "Failed to fetch team sheet: Query failed"
    );
  });

  it("returns correct PlayerTeamSheet with all fields mapped", async () => {
    const rows = [
      makeRow({
        registration_id: 5,
        alt_id: 300,
        team_id: 80,
        format: "championsvgc2026regma",
        position: 1,
        species: "Rillaboom",
        ability: "Grassy Surge",
        held_item: "Miracle Seed",
        tera_type: "Grass",
        move1: "Grassy Glide",
        move2: "Wood Hammer",
        move3: "Fake Out",
        move4: null,
      }),
      makeRow({
        id: 2,
        registration_id: 5,
        alt_id: 300,
        team_id: 80,
        format: "championsvgc2026regma",
        position: 2,
        species: "Urshifu",
        ability: "Unseen Fist",
        held_item: null,
        tera_type: "Water",
        move1: "Surging Strikes",
        move2: "Close Combat",
        move3: "Aqua Jet",
        move4: "Detect",
      }),
    ];
    const mockClient = createMockClient({ data: rows, error: null });

    const result = await getTeamSheetByRegistration(mockClient, 5);

    expect(result).not.toBeNull();
    expect(result?.registrationId).toBe(5);
    expect(result?.altId).toBe(300);
    expect(result?.teamId).toBe(80);
    expect(result?.format).toBe("championsvgc2026regma");
    expect(result?.pokemon).toHaveLength(2);

    const [p1, p2] = result!.pokemon;
    expect(p1?.species).toBe("Rillaboom");
    expect(p1?.heldItem).toBe("Miracle Seed");
    expect(p1?.teraType).toBe("Grass");
    expect(p1?.move4).toBeNull();

    expect(p2?.species).toBe("Urshifu");
    expect(p2?.heldItem).toBeNull();
  });

  it("queries by registration_id", async () => {
    const mockClient = createMockClient({
      data: [makeRow({ registration_id: 7 })],
      error: null,
    });

    await getTeamSheetByRegistration(mockClient, 7);

    expect(mockClient.from).toHaveBeenCalledWith("tournament_team_sheets");
    expect(
      (
        mockClient as unknown as {
          _builder: ReturnType<typeof createMockQueryBuilder>;
        }
      )._builder.eq
    ).toHaveBeenCalledWith("registration_id", 7);
  });
});

describe("getMatchTeamSheets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns both nulls when no data", async () => {
    const mockClient = createMockClient({ data: [], error: null });

    const result = await getMatchTeamSheets(mockClient, 10, 100, 200);

    expect(result).toEqual({ player1: null, player2: null });
  });

  it("returns both nulls when data is null", async () => {
    const mockClient = createMockClient({ data: null, error: null });

    const result = await getMatchTeamSheets(mockClient, 10, 100, 200);

    expect(result).toEqual({ player1: null, player2: null });
  });

  it("throws on query error", async () => {
    const mockClient = createMockClient({
      data: null,
      error: { message: "RLS violation" },
    });

    await expect(getMatchTeamSheets(mockClient, 10, 100, 200)).rejects.toThrow(
      "Failed to fetch match team sheets: RLS violation"
    );
  });

  it("correctly assigns player1 vs player2 by alt_id", async () => {
    const p1AltId = 100;
    const p2AltId = 200;

    const rows = [
      makeRow({
        alt_id: p1AltId,
        registration_id: 1,
        team_id: 50,
        position: 1,
        species: "Pikachu",
      }),
      makeRow({
        id: 2,
        alt_id: p2AltId,
        registration_id: 2,
        team_id: 60,
        position: 1,
        species: "Incineroar",
      }),
    ];
    const mockClient = createMockClient({ data: rows, error: null });

    const result = await getMatchTeamSheets(mockClient, 10, p1AltId, p2AltId);

    expect(result.player1?.altId).toBe(p1AltId);
    expect(result.player1?.pokemon[0]?.species).toBe("Pikachu");

    expect(result.player2?.altId).toBe(p2AltId);
    expect(result.player2?.pokemon[0]?.species).toBe("Incineroar");
  });

  it("returns null for a missing player when only one player has data", async () => {
    const p1AltId = 100;
    const p2AltId = 200;

    const rows = [
      makeRow({ alt_id: p1AltId, registration_id: 1, species: "Pikachu" }),
    ];
    const mockClient = createMockClient({ data: rows, error: null });

    const result = await getMatchTeamSheets(mockClient, 10, p1AltId, p2AltId);

    expect(result.player1).not.toBeNull();
    expect(result.player2).toBeNull();
  });

  it("groups multiple Pokemon correctly per player", async () => {
    const p1AltId = 100;
    const p2AltId = 200;

    const rows = [
      makeRow({
        alt_id: p1AltId,
        registration_id: 1,
        team_id: 50,
        position: 1,
        species: "Pikachu",
      }),
      makeRow({
        id: 2,
        alt_id: p1AltId,
        registration_id: 1,
        team_id: 50,
        position: 2,
        species: "Garchomp",
      }),
      makeRow({
        id: 3,
        alt_id: p2AltId,
        registration_id: 2,
        team_id: 60,
        position: 1,
        species: "Incineroar",
      }),
      makeRow({
        id: 4,
        alt_id: p2AltId,
        registration_id: 2,
        team_id: 60,
        position: 2,
        species: "Rillaboom",
      }),
    ];
    const mockClient = createMockClient({ data: rows, error: null });

    const result = await getMatchTeamSheets(mockClient, 10, p1AltId, p2AltId);

    expect(result.player1?.pokemon).toHaveLength(2);
    expect(result.player2?.pokemon).toHaveLength(2);
  });
});
