import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  createTeam,
  updateTeam,
  deleteTeam,
  forkTeam,
  addPokemonToTeam,
  updatePokemon,
  removePokemonFromTeam,
  reorderTeamPokemon,
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

// =============================================================================
// Shared test data helpers
// =============================================================================

const makeSourcePokemon = (id = 10) => ({
  id,
  species: "Calyrex-Ice",
  nickname: null,
  level: 50,
  nature: "Brave",
  ability: "As One",
  held_item: "Booster Energy",
  gender: null,
  is_shiny: false,
  move1: "Glacial Lance",
  move2: "Trick Room",
  move3: null,
  move4: null,
  ev_hp: 252,
  ev_attack: 252,
  ev_defense: 4,
  ev_special_attack: 0,
  ev_special_defense: 0,
  ev_speed: 0,
  iv_hp: 31,
  iv_attack: 31,
  iv_defense: 31,
  iv_special_attack: 31,
  iv_special_defense: 31,
  iv_speed: 0,
  tera_type: null,
  notes: null,
});

const makeSourceTeam = (overrides?: Record<string, unknown>) => ({
  id: 1,
  name: "VGC Squad",
  format: "gen9vgc2025regg",
  created_by: 42,
  description: "My main team",
  notes: null,
  tags: ["vgc", "top8"],
  is_public: true,
  parent_team_id: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
  team_pokemon: [
    { team_position: 0, pokemon: makeSourcePokemon(10) },
    { team_position: 1, pokemon: makeSourcePokemon(11) },
  ],
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe("teams mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // createTeam
  // ==========================================================================

  describe("createTeam", () => {
    it("inserts a new team and returns its id", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: { id: 99 },
        error: null,
      });

      const result = await createTeam(
        mockClient,
        42,
        "My New Team",
        "gen9vgc2025regg"
      );

      expect(result).toEqual({ id: 99 });
      expect(mockClient.from).toHaveBeenCalledWith("teams");
      expect(mockClient._queryBuilder.insert).toHaveBeenCalledWith({
        created_by: 42,
        name: "My New Team",
        format: "gen9vgc2025regg",
      });
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("id");
      expect(mockClient._queryBuilder.single).toHaveBeenCalled();
    });

    it("throws when insert fails", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: { message: "unique constraint violation" },
      });

      await expect(
        createTeam(mockClient, 42, "My New Team", "gen9vgc2025regg")
      ).rejects.toThrow("Failed to create team: unique constraint violation");
    });
  });

  // ==========================================================================
  // updateTeam
  // ==========================================================================

  describe("updateTeam", () => {
    it("updates the team row by id", async () => {
      const mockClient = createMockClient();
      // update().eq() resolves to { error: null }
      mockClient._queryBuilder.eq.mockResolvedValue({ error: null });

      await updateTeam(mockClient, 7, {
        name: "Renamed Team",
        is_public: true,
      });

      expect(mockClient.from).toHaveBeenCalledWith("teams");
      expect(mockClient._queryBuilder.update).toHaveBeenCalledWith({
        name: "Renamed Team",
        is_public: true,
      });
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("id", 7);
    });

    it("throws when update fails", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.eq.mockResolvedValue({
        error: { message: "row not found" },
      });

      await expect(
        updateTeam(mockClient, 7, { name: "Renamed" })
      ).rejects.toThrow("Failed to update team: row not found");
    });
  });

  // ==========================================================================
  // deleteTeam
  // ==========================================================================

  describe("deleteTeam", () => {
    it("performs the 4-step cascade: fetch join rows, delete joins, delete pokemon, delete team", async () => {
      const mockClient = createMockClient();

      // Step 1: fetch team_pokemon join rows
      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: 1, pokemon_id: 10 },
            { id: 2, pokemon_id: 11 },
          ],
          error: null,
        }),
      };

      // Step 2: delete team_pokemon join rows
      const mockDeleteJoinChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      // Step 3: delete pokemon records
      const mockDeletePokemonChain = {
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      };

      // Step 4: delete the team
      const mockDeleteTeamChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockDeleteJoinChain)
        .mockReturnValueOnce(mockDeletePokemonChain)
        .mockReturnValueOnce(mockDeleteTeamChain);

      await deleteTeam(mockClient, 5);

      expect(mockClient.from).toHaveBeenNthCalledWith(1, "team_pokemon");
      expect(mockFetchChain.select).toHaveBeenCalledWith("id, pokemon_id");
      expect(mockFetchChain.eq).toHaveBeenCalledWith("team_id", 5);

      expect(mockClient.from).toHaveBeenNthCalledWith(2, "team_pokemon");
      expect(mockDeleteJoinChain.eq).toHaveBeenCalledWith("team_id", 5);

      expect(mockClient.from).toHaveBeenNthCalledWith(3, "pokemon");
      expect(mockDeletePokemonChain.in).toHaveBeenCalledWith("id", [10, 11]);

      expect(mockClient.from).toHaveBeenNthCalledWith(4, "teams");
      expect(mockDeleteTeamChain.eq).toHaveBeenCalledWith("id", 5);
    });

    it("skips join and pokemon deletion when team has no pokemon", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockDeleteTeamChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockDeleteTeamChain);

      await deleteTeam(mockClient, 5);

      // Only 2 from() calls: fetch + delete team
      expect(mockClient.from).toHaveBeenCalledTimes(2);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "team_pokemon");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "teams");
    });

    it("throws when fetching join rows fails", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "access denied" },
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockFetchChain);

      await expect(deleteTeam(mockClient, 5)).rejects.toThrow(
        "Failed to fetch team pokemon for deletion: access denied"
      );
    });

    it("throws when deleting join rows fails", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1, pokemon_id: 10 }],
          error: null,
        }),
      };

      const mockDeleteJoinChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "foreign key violation" },
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockDeleteJoinChain);

      await expect(deleteTeam(mockClient, 5)).rejects.toThrow(
        "Failed to delete team_pokemon rows: foreign key violation"
      );
    });

    it("throws when deleting pokemon records fails", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 1, pokemon_id: 10 }],
          error: null,
        }),
      };

      const mockDeleteJoinChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockDeletePokemonChain = {
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          error: { message: "constraint error" },
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockDeleteJoinChain)
        .mockReturnValueOnce(mockDeletePokemonChain);

      await expect(deleteTeam(mockClient, 5)).rejects.toThrow(
        "Failed to delete pokemon records: constraint error"
      );
    });

    it("throws when deleting the team row fails", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockDeleteTeamChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: "row locked" },
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockDeleteTeamChain);

      await expect(deleteTeam(mockClient, 5)).rejects.toThrow(
        "Failed to delete team: row locked"
      );
    });
  });

  // ==========================================================================
  // forkTeam
  // ==========================================================================

  describe("forkTeam", () => {
    const makeForkMocks = () => {
      // Step 1: fetch source team
      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: makeSourceTeam(),
          error: null,
        }),
      };

      // Step 2: create new team
      const mockCreateTeamChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 200 },
          error: null,
        }),
      };

      // Step 3a: insert pokemon copy 1
      const mockInsertPokemon1Chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 201 },
          error: null,
        }),
      };

      // Step 3b: insert team_pokemon join for pokemon 1
      const mockInsertJoin1Chain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      // Step 3c: insert pokemon copy 2
      const mockInsertPokemon2Chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 202 },
          error: null,
        }),
      };

      // Step 3d: insert team_pokemon join for pokemon 2
      const mockInsertJoin2Chain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      return {
        mockFetchChain,
        mockCreateTeamChain,
        mockInsertPokemon1Chain,
        mockInsertJoin1Chain,
        mockInsertPokemon2Chain,
        mockInsertJoin2Chain,
      };
    };

    it("forks source team: fetches, creates new team, copies each pokemon", async () => {
      const mockClient = createMockClient();
      const {
        mockFetchChain,
        mockCreateTeamChain,
        mockInsertPokemon1Chain,
        mockInsertJoin1Chain,
        mockInsertPokemon2Chain,
        mockInsertJoin2Chain,
      } = makeForkMocks();

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockCreateTeamChain)
        .mockReturnValueOnce(mockInsertPokemon1Chain)
        .mockReturnValueOnce(mockInsertJoin1Chain)
        .mockReturnValueOnce(mockInsertPokemon2Chain)
        .mockReturnValueOnce(mockInsertJoin2Chain);

      const result = await forkTeam(mockClient, 1, 99);

      expect(result).toEqual({ id: 200 });
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "teams");
      expect(mockFetchChain.eq).toHaveBeenCalledWith("id", 1);

      expect(mockClient.from).toHaveBeenNthCalledWith(2, "teams");
      expect(mockCreateTeamChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by: 99,
          parent_team_id: 1,
          format: "gen9vgc2025regg",
        })
      );
    });

    it("uses default fork name when newName is not provided", async () => {
      const mockClient = createMockClient();
      const { mockFetchChain, mockCreateTeamChain, mockInsertJoin1Chain } =
        makeForkMocks();

      // Single pokemon team for simplicity
      mockFetchChain.single.mockResolvedValue({
        data: makeSourceTeam({
          name: "VGC Squad",
          team_pokemon: [{ team_position: 0, pokemon: makeSourcePokemon(10) }],
        }),
        error: null,
      });

      const mockInsertPokemon1Chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 201 }, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockCreateTeamChain)
        .mockReturnValueOnce(mockInsertPokemon1Chain)
        .mockReturnValueOnce(mockInsertJoin1Chain);

      await forkTeam(mockClient, 1, 99);

      expect(mockCreateTeamChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: "VGC Squad (fork)" })
      );
    });

    it("uses provided newName when given", async () => {
      const mockClient = createMockClient();
      const { mockFetchChain, mockCreateTeamChain, mockInsertJoin1Chain } =
        makeForkMocks();

      mockFetchChain.single.mockResolvedValue({
        data: makeSourceTeam({
          team_pokemon: [{ team_position: 0, pokemon: makeSourcePokemon(10) }],
        }),
        error: null,
      });

      const mockInsertPokemon1Chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 201 }, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockCreateTeamChain)
        .mockReturnValueOnce(mockInsertPokemon1Chain)
        .mockReturnValueOnce(mockInsertJoin1Chain);

      await forkTeam(mockClient, 1, 99, "My Custom Fork");

      expect(mockCreateTeamChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Custom Fork" })
      );
    });

    it("throws when fetching source team fails", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "not found" },
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockFetchChain);

      await expect(forkTeam(mockClient, 1, 99)).rejects.toThrow(
        "Failed to fetch source team: not found"
      );
    });

    it("throws when source team is null (not found)", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockFetchChain);

      await expect(forkTeam(mockClient, 1, 99)).rejects.toThrow(
        "Source team 1 not found"
      );
    });

    it("throws when creating the forked team fails", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: makeSourceTeam(),
          error: null,
        }),
      };

      const mockCreateTeamChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "insert error" },
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockCreateTeamChain);

      await expect(forkTeam(mockClient, 1, 99)).rejects.toThrow(
        "Failed to create forked team: insert error"
      );
    });

    it("cleans up team and pokemon on pokemon insert failure", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: makeSourceTeam({
            team_pokemon: [
              { team_position: 0, pokemon: makeSourcePokemon(10) },
            ],
          }),
          error: null,
        }),
      };

      const mockCreateTeamChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 200 }, error: null }),
      };

      const mockInsertPokemon1Chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "pokemon insert failed" },
        }),
      };

      // Cleanup calls: delete team_pokemon, delete pokemon, delete team
      const mockCleanupJoinChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockCleanupPokemonChain = {
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockCleanupTeamChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockCreateTeamChain)
        .mockReturnValueOnce(mockInsertPokemon1Chain)
        // Cleanup calls
        .mockReturnValueOnce(mockCleanupJoinChain)
        .mockReturnValueOnce(mockCleanupPokemonChain)
        .mockReturnValueOnce(mockCleanupTeamChain);

      await expect(forkTeam(mockClient, 1, 99)).rejects.toThrow(
        "Failed to copy pokemon during fork: pokemon insert failed"
      );

      // Cleanup should have deleted the team row
      expect(mockClient.from).toHaveBeenCalledWith("teams");
    });

    it("cleans up on join insert failure after pokemon was created", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: makeSourceTeam({
            team_pokemon: [
              { team_position: 0, pokemon: makeSourcePokemon(10) },
            ],
          }),
          error: null,
        }),
      };

      const mockCreateTeamChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 200 }, error: null }),
      };

      const mockInsertPokemon1Chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 201 }, error: null }),
      };

      const mockInsertJoin1Chain = {
        insert: jest
          .fn()
          .mockResolvedValue({ error: { message: "join insert failed" } }),
      };

      // Cleanup: team_pokemon delete, pokemon delete (by id), team delete
      const mockCleanupJoinChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockCleanupPokemonChain = {
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null }),
      };

      const mockCleanupTeamChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockCreateTeamChain)
        .mockReturnValueOnce(mockInsertPokemon1Chain)
        .mockReturnValueOnce(mockInsertJoin1Chain)
        .mockReturnValueOnce(mockCleanupJoinChain)
        .mockReturnValueOnce(mockCleanupPokemonChain)
        .mockReturnValueOnce(mockCleanupTeamChain);

      await expect(forkTeam(mockClient, 1, 99)).rejects.toThrow(
        "Failed to create team_pokemon entry during fork: join insert failed"
      );

      // Cleanup should include the pokemon that was successfully created
      expect(mockCleanupPokemonChain.in).toHaveBeenCalledWith("id", [201]);
      expect(mockCleanupTeamChain.eq).toHaveBeenCalledWith("id", 200);
    });

    it("skips pokemon without a pokemon record (null pokemon)", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: makeSourceTeam({
            team_pokemon: [
              { team_position: 0, pokemon: null }, // null pokemon — should be skipped
            ],
          }),
          error: null,
        }),
      };

      const mockCreateTeamChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 200 }, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockCreateTeamChain);

      const result = await forkTeam(mockClient, 1, 99);

      // No pokemon insert calls since pokemon was null
      expect(result).toEqual({ id: 200 });
      expect(mockClient.from).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // addPokemonToTeam
  // ==========================================================================

  describe("addPokemonToTeam", () => {
    const pokemonInsert = {
      species: "Miraidon",
      nickname: null,
      level: 50,
    } as Parameters<typeof addPokemonToTeam>[2];

    it("inserts pokemon record then creates team_pokemon join row", async () => {
      const mockClient = createMockClient();

      // First from(): insert pokemon
      const mockPokemonChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 55 }, error: null }),
      };

      // Second from(): insert team_pokemon join
      const mockJoinChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockPokemonChain)
        .mockReturnValueOnce(mockJoinChain);

      const result = await addPokemonToTeam(mockClient, 3, pokemonInsert, 2);

      expect(result).toEqual({ pokemonId: 55 });
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "pokemon");
      expect(mockPokemonChain.insert).toHaveBeenCalledWith(pokemonInsert);
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "team_pokemon");
      expect(mockJoinChain.insert).toHaveBeenCalledWith({
        team_id: 3,
        pokemon_id: 55,
        team_position: 2,
      });
    });

    it("throws when pokemon insert fails", async () => {
      const mockClient = createMockClient();

      const mockPokemonChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "constraint violation" },
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockPokemonChain);

      await expect(
        addPokemonToTeam(mockClient, 3, pokemonInsert, 2)
      ).rejects.toThrow("Failed to insert pokemon: constraint violation");
    });

    it("throws when team_pokemon join insert fails", async () => {
      const mockClient = createMockClient();

      const mockPokemonChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 55 }, error: null }),
      };

      const mockJoinChain = {
        insert: jest.fn().mockResolvedValue({
          error: { message: "foreign key error" },
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockPokemonChain)
        .mockReturnValueOnce(mockJoinChain);

      await expect(
        addPokemonToTeam(mockClient, 3, pokemonInsert, 2)
      ).rejects.toThrow("Failed to link pokemon to team: foreign key error");
    });

    it.each([0, 1, 2, 3, 4, 5])(
      "passes position=%i to the team_pokemon join row",
      async (position) => {
        const mockClient = createMockClient();

        const mockPokemonChain = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 55 }, error: null }),
        };

        const mockJoinChain = {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };

        (mockClient.from as jest.Mock)
          .mockReturnValueOnce(mockPokemonChain)
          .mockReturnValueOnce(mockJoinChain);

        await addPokemonToTeam(mockClient, 3, pokemonInsert, position);

        expect(mockJoinChain.insert).toHaveBeenCalledWith(
          expect.objectContaining({ team_position: position })
        );
      }
    );
  });

  // ==========================================================================
  // updatePokemon
  // ==========================================================================

  describe("updatePokemon", () => {
    it("updates the pokemon row by pokemonId", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.eq.mockResolvedValue({ error: null });

      await updatePokemon(mockClient, 55, {
        species: "Koraidon",
        move1: "Collision Course",
      });

      expect(mockClient.from).toHaveBeenCalledWith("pokemon");
      expect(mockClient._queryBuilder.update).toHaveBeenCalledWith({
        species: "Koraidon",
        move1: "Collision Course",
      });
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("id", 55);
    });

    it("throws when update fails", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.eq.mockResolvedValue({
        error: { message: "row not found" },
      });

      await expect(
        updatePokemon(mockClient, 55, { species: "Koraidon" })
      ).rejects.toThrow("Failed to update pokemon: row not found");
    });
  });

  // ==========================================================================
  // removePokemonFromTeam
  // ==========================================================================

  describe("removePokemonFromTeam", () => {
    // The join-row delete uses two .eq() calls: .eq("team_id", ...).eq("pokemon_id", ...)
    // The second .eq() call resolves the whole chain, so we use a proxy that
    // returns itself until the second call, which resolves the promise.
    const makeDoubleEqDeleteChain = (resolvedValue: unknown) => {
      let eqCallCount = 0;
      const chain: Record<string, unknown> = {};
      chain["delete"] = jest.fn().mockReturnValue(chain);
      chain["eq"] = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve(resolvedValue);
        }
        return chain;
      });
      return chain as { delete: jest.Mock; eq: jest.Mock };
    };

    it("deletes the join row then the pokemon record", async () => {
      const mockClient = createMockClient();

      const mockJoinChain = makeDoubleEqDeleteChain({ error: null });
      const mockPokemonChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockJoinChain)
        .mockReturnValueOnce(mockPokemonChain);

      await removePokemonFromTeam(mockClient, 3, 55);

      expect(mockClient.from).toHaveBeenNthCalledWith(1, "team_pokemon");
      expect(mockJoinChain.eq).toHaveBeenCalledWith("team_id", 3);
      expect(mockJoinChain.eq).toHaveBeenCalledWith("pokemon_id", 55);
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "pokemon");
      expect(mockPokemonChain.eq).toHaveBeenCalledWith("id", 55);
    });

    it("throws when deleting the join row fails", async () => {
      const mockClient = createMockClient();

      const mockJoinChain = makeDoubleEqDeleteChain({
        error: { message: "RLS denied" },
      });

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockJoinChain);

      await expect(removePokemonFromTeam(mockClient, 3, 55)).rejects.toThrow(
        "Failed to remove team_pokemon join row: RLS denied"
      );
    });

    it("throws when deleting the pokemon record fails", async () => {
      const mockClient = createMockClient();

      const mockJoinChain = makeDoubleEqDeleteChain({ error: null });
      const mockPokemonChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: "row locked" } }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockJoinChain)
        .mockReturnValueOnce(mockPokemonChain);

      await expect(removePokemonFromTeam(mockClient, 3, 55)).rejects.toThrow(
        "Failed to delete pokemon record: row locked"
      );
    });
  });

  // ==========================================================================
  // reorderTeamPokemon
  // ==========================================================================

  describe("reorderTeamPokemon", () => {
    // reorderTeamPokemon uses .update().eq("team_id", ...).eq("pokemon_id", ...)
    // The second .eq() call resolves the chain, so we use a call-count proxy.
    const makeDoubleEqUpdateChain = (resolvedValue: unknown) => {
      let eqCallCount = 0;
      const chain: Record<string, unknown> = {};
      chain["update"] = jest.fn().mockReturnValue(chain);
      chain["eq"] = jest.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve(resolvedValue);
        }
        return chain;
      });
      return chain as { update: jest.Mock; eq: jest.Mock };
    };

    it("updates team_pokemon positions in parallel for all entries", async () => {
      const mockClient = createMockClient();

      const chain1 = makeDoubleEqUpdateChain({ error: null });
      const chain2 = makeDoubleEqUpdateChain({ error: null });
      const chain3 = makeDoubleEqUpdateChain({ error: null });

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2)
        .mockReturnValueOnce(chain3);

      await reorderTeamPokemon(mockClient, 5, [
        { pokemonId: 10, position: 0 },
        { pokemonId: 11, position: 1 },
        { pokemonId: 12, position: 2 },
      ]);

      expect(mockClient.from).toHaveBeenCalledTimes(3);
      expect(mockClient.from).toHaveBeenCalledWith("team_pokemon");
      expect(chain1.update).toHaveBeenCalledWith({ team_position: 0 });
      expect(chain2.update).toHaveBeenCalledWith({ team_position: 1 });
      expect(chain3.update).toHaveBeenCalledWith({ team_position: 2 });
    });

    it("resolves immediately when positions array is empty", async () => {
      const mockClient = createMockClient();

      await expect(
        reorderTeamPokemon(mockClient, 5, [])
      ).resolves.toBeUndefined();

      expect(mockClient.from).not.toHaveBeenCalled();
    });

    it("throws when any position update fails", async () => {
      const mockClient = createMockClient();

      const failChain = makeDoubleEqUpdateChain({
        error: { message: "write conflict" },
      });

      (mockClient.from as jest.Mock).mockReturnValueOnce(failChain);

      await expect(
        reorderTeamPokemon(mockClient, 5, [{ pokemonId: 10, position: 0 }])
      ).rejects.toThrow("Failed to reorder pokemon 10: write conflict");
    });

    it("passes correct teamId and pokemonId filters to each update", async () => {
      const mockClient = createMockClient();

      const chain1 = makeDoubleEqUpdateChain({ error: null });
      const chain2 = makeDoubleEqUpdateChain({ error: null });

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(chain1)
        .mockReturnValueOnce(chain2);

      await reorderTeamPokemon(mockClient, 7, [
        { pokemonId: 20, position: 0 },
        { pokemonId: 21, position: 1 },
      ]);

      expect(chain1.eq).toHaveBeenCalledWith("team_id", 7);
      expect(chain1.eq).toHaveBeenCalledWith("pokemon_id", 20);
      expect(chain2.eq).toHaveBeenCalledWith("team_id", 7);
      expect(chain2.eq).toHaveBeenCalledWith("pokemon_id", 21);
    });
  });
});
