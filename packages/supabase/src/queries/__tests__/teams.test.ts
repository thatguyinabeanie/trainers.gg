import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getTeamsForAltFull,
  getTeamsForAltList,
  getTeamWithPokemon,
  getTeamsForAltByFormatFull,
  getTeamsForUser,
} from "../teams";
import type { TypedClient } from "../../client";

// =============================================================================
// Mock Supabase client factory
// =============================================================================

type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  insert: jest.Mock<() => MockQueryBuilder>;
  update: jest.Mock<() => MockQueryBuilder>;
  delete: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  in: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  single: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  maybeSingle: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

// Minimal TeamWithPokemon shape for test data
const makeTeam = (overrides?: Record<string, unknown>) => ({
  id: 1,
  name: "Test Team",
  format: "gen9vgc2025regg",
  created_by: 42,
  description: null,
  notes: null,
  tags: [],
  is_public: false,
  parent_team_id: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
  team_pokemon: [],
  ...overrides,
});

const makePokemonRow = (overrides?: Record<string, unknown>) => ({
  id: 1,
  team_position: 0,
  pokemon: {
    id: 1,
    species: "Koraidon",
    nickname: null,
    level: 50,
    nature: "Adamant",
    ability: "Orichalcum Pulse",
    held_item: null,
    gender: null,
    is_shiny: false,
    move1: "Collision Course",
    move2: null,
    move3: null,
    move4: null,
    ev_hp: 0,
    ev_attack: 252,
    ev_defense: 0,
    ev_special_attack: 0,
    ev_special_defense: 4,
    ev_speed: 252,
    iv_hp: 31,
    iv_attack: 31,
    iv_defense: 31,
    iv_special_attack: 31,
    iv_special_defense: 31,
    iv_speed: 31,
    tera_type: null,
    notes: null,
  },
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe("teams queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getTeamsForAltFull
  // ==========================================================================

  describe("getTeamsForAltFull", () => {
    it("returns teams with pokemon for the given altId", async () => {
      const team = makeTeam({ team_pokemon: [makePokemonRow()] });
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [team],
        error: null,
      });

      const result = await getTeamsForAltFull(mockClient, 42);

      expect(result).toEqual([team]);
      expect(mockClient.from).toHaveBeenCalledWith("teams");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "created_by",
        42
      );
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "updated_at",
        { ascending: false }
      );
    });

    it("returns empty array when the alt has no teams", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getTeamsForAltFull(mockClient, 42);

      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getTeamsForAltFull(mockClient, 42);

      expect(result).toEqual([]);
    });

    it("throws when Supabase returns an error", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: "connection refused" },
      });

      await expect(getTeamsForAltFull(mockClient, 42)).rejects.toThrow(
        "Failed to fetch teams for alt: connection refused"
      );
    });

    it("passes the correct select shape including team_pokemon join", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getTeamsForAltFull(mockClient, 42);

      const selectArg = mockClient._queryBuilder.select.mock
        .calls[0]?.[0] as string;
      expect(selectArg).toContain("team_pokemon");
      expect(selectArg).toContain("pokemon");
    });
  });

  // ==========================================================================
  // getTeamWithPokemon
  // ==========================================================================

  describe("getTeamWithPokemon", () => {
    it("returns the team with pokemon when found", async () => {
      const team = makeTeam({
        id: 7,
        team_pokemon: [makePokemonRow()],
      });
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: team,
        error: null,
      });

      const result = await getTeamWithPokemon(mockClient, 7);

      expect(result).toEqual(team);
      expect(mockClient.from).toHaveBeenCalledWith("teams");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("id", 7);
      expect(mockClient._queryBuilder.maybeSingle).toHaveBeenCalled();
    });

    it("returns null when team does not exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getTeamWithPokemon(mockClient, 999);

      expect(result).toBeNull();
    });

    it("throws when Supabase returns an error", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      });

      await expect(getTeamWithPokemon(mockClient, 7)).rejects.toThrow(
        "Failed to fetch team: permission denied"
      );
    });

    it("passes the correct select shape including team_pokemon join", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await getTeamWithPokemon(mockClient, 7);

      const selectArg = mockClient._queryBuilder.select.mock
        .calls[0]?.[0] as string;
      expect(selectArg).toContain("team_pokemon");
      expect(selectArg).toContain("pokemon");
    });
  });

  // ==========================================================================
  // getTeamsForAltByFormatFull
  // ==========================================================================

  describe("getTeamsForAltByFormatFull", () => {
    it("returns teams filtered by altId and format", async () => {
      const team = makeTeam({
        format: "gen9vgc2025regg",
        team_pokemon: [makePokemonRow()],
      });
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [team],
        error: null,
      });

      const result = await getTeamsForAltByFormatFull(
        mockClient,
        42,
        "gen9vgc2025regg"
      );

      expect(result).toEqual([team]);
      expect(mockClient.from).toHaveBeenCalledWith("teams");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "created_by",
        42
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "format",
        "gen9vgc2025regg"
      );
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "updated_at",
        { ascending: false }
      );
    });

    it("returns empty array when no teams match the format", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getTeamsForAltByFormatFull(
        mockClient,
        42,
        "gen9vgc2025regg"
      );

      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getTeamsForAltByFormatFull(
        mockClient,
        42,
        "gen9vgc2025regg"
      );

      expect(result).toEqual([]);
    });

    it("throws when Supabase returns an error", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: "query timeout" },
      });

      await expect(
        getTeamsForAltByFormatFull(mockClient, 42, "gen9vgc2025regg")
      ).rejects.toThrow(
        "Failed to fetch teams for alt by format: query timeout"
      );
    });

    it.each([
      ["gen9vgc2025regg", 42],
      ["gen9vgc2024regh", 99],
      ["natdex", 1],
    ])(
      "applies both created_by and format eq filters for format=%s altId=%i",
      async (format, altId) => {
        const mockClient = createMockClient();
        mockClient._queryBuilder.order.mockResolvedValue({
          data: [],
          error: null,
        });

        await getTeamsForAltByFormatFull(mockClient, altId, format);

        expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
          "created_by",
          altId
        );
        expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
          "format",
          format
        );
      }
    );
  });

  // ==========================================================================
  // getTeamsForAltList
  // ==========================================================================

  describe("getTeamsForAltList", () => {
    const makeListTeam = (overrides?: Record<string, unknown>) => ({
      id: 1,
      name: "Test Team",
      format: "gen9vgc2025regg",
      is_public: false,
      updated_at: "2025-01-02T00:00:00Z",
      created_at: "2025-01-01T00:00:00Z",
      team_pokemon: [
        {
          id: 1,
          team_position: 0,
          pokemon: {
            id: 1,
            species: "Koraidon",
            is_shiny: false,
          },
        },
      ],
      ...overrides,
    });

    it("returns lightweight team list with pokemon data for the given altId", async () => {
      const team = makeListTeam();
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [team],
        error: null,
      });

      const result = await getTeamsForAltList(mockClient, 42);

      expect(result).toEqual([team]);
      expect(mockClient.from).toHaveBeenCalledWith("teams");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "created_by",
        42
      );
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "updated_at",
        { ascending: false }
      );
    });

    it("returns empty array when data is null", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getTeamsForAltList(mockClient, 42);

      expect(result).toEqual([]);
    });

    it("returns empty array when the alt has no teams", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getTeamsForAltList(mockClient, 42);

      expect(result).toEqual([]);
    });

    it("throws when Supabase returns an error", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: "connection refused" },
      });

      await expect(getTeamsForAltList(mockClient, 42)).rejects.toThrow(
        "Failed to fetch teams for alt: connection refused"
      );
    });

    it("select shape includes lightweight pokemon fields (id, species, is_shiny)", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getTeamsForAltList(mockClient, 42);

      const selectArg = mockClient._queryBuilder.select.mock
        .calls[0]?.[0] as string;
      expect(selectArg).toContain("team_pokemon");
      expect(selectArg).toContain("species");
      expect(selectArg).toContain("is_shiny");
    });
  });

  // ==========================================================================
  // getTeamsForUser
  // ==========================================================================

  describe("getTeamsForUser", () => {
    const makeRawTeam = (overrides?: Record<string, unknown>) => ({
      id: 1,
      name: "Test Team",
      format: "gen9vgc2025regg",
      is_public: false,
      updated_at: "2025-01-02T00:00:00Z",
      created_at: "2025-01-01T00:00:00Z",
      alt: { username: "ash_ketchum" },
      team_pokemon: [
        {
          id: 1,
          team_position: 0,
          pokemon: {
            id: 1,
            species: "Koraidon",
            is_shiny: false,
          },
        },
      ],
      ...overrides,
    });

    it("returns teams with alt_username flattened from the alt join", async () => {
      const raw = makeRawTeam();
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [raw],
        error: null,
      });

      const result = await getTeamsForUser(mockClient, "user-uuid-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "Test Team",
        format: "gen9vgc2025regg",
        alt_username: "ash_ketchum",
      });
      // The raw `alt` key must be stripped from the output
      expect(result[0]).not.toHaveProperty("alt");
    });

    it("filters by the userId via eq on alts.user_id", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getTeamsForUser(mockClient, "user-uuid-1");

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "alts.user_id",
        "user-uuid-1"
      );
    });

    it("orders results by updated_at descending", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getTeamsForUser(mockClient, "user-uuid-1");

      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "updated_at",
        { ascending: false }
      );
    });

    it("returns empty array when the user has no teams", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getTeamsForUser(mockClient, "user-uuid-1");

      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getTeamsForUser(mockClient, "user-uuid-1");

      expect(result).toEqual([]);
    });

    it("throws when Supabase returns an error", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      });

      await expect(getTeamsForUser(mockClient, "user-uuid-1")).rejects.toThrow(
        "Failed to fetch teams for user: permission denied"
      );
    });

    it("flattens teams from multiple alts with their respective usernames", async () => {
      const rawTeams = [
        makeRawTeam({ id: 1, alt: { username: "ash_ketchum" } }),
        makeRawTeam({ id: 2, name: "Team 2", alt: { username: "red_champ" } }),
      ];
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: rawTeams,
        error: null,
      });

      const result = await getTeamsForUser(mockClient, "user-uuid-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, alt_username: "ash_ketchum" });
      expect(result[1]).toMatchObject({ id: 2, alt_username: "red_champ" });
    });

    it("uses the !inner join syntax to enforce the user_id filter at DB level", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      await getTeamsForUser(mockClient, "user-uuid-1");

      const selectArg = mockClient._queryBuilder.select.mock
        .calls[0]?.[0] as string;
      // The !inner modifier is required — a plain left join does NOT filter parent rows
      expect(selectArg).toContain("alts!teams_created_by_fkey!inner");
    });
  });
});
