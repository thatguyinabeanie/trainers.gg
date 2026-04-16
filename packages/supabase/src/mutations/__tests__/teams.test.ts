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
      // update().eq().select() resolves with the updated row
      mockClient._queryBuilder.select.mockResolvedValueOnce({
        data: [{ id: 7 }],
        error: null,
      });

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
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("id");
    });

    it("throws when update fails", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.select.mockResolvedValueOnce({
        data: null,
        error: { message: "row not found" },
      });

      await expect(
        updateTeam(mockClient, 7, { name: "Renamed" })
      ).rejects.toThrow("Failed to update team: row not found");
    });

    it("throws when no rows are updated (RLS or not found)", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await expect(
        updateTeam(mockClient, 7, { name: "Renamed" })
      ).rejects.toThrow(
        "Failed to update team: Team not found or not authorized"
      );
    });
  });

  // ==========================================================================
  // deleteTeam
  // ==========================================================================

  describe("deleteTeam", () => {
    it("calls the delete_team RPC with the correct team id", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      await deleteTeam(mockClient, 5);

      expect(
        (mockClient as unknown as { rpc: jest.Mock }).rpc
      ).toHaveBeenCalledWith("delete_team", { p_team_id: 5 });
    });

    it("throws when the RPC returns an error", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "access denied" } });

      await expect(deleteTeam(mockClient, 5)).rejects.toThrow(
        "Failed to delete team: access denied"
      );
    });
  });

  // ==========================================================================
  // forkTeam
  // ==========================================================================

  describe("forkTeam", () => {
    it("calls the fork_team RPC with correct parameters", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: 200, error: null });

      const result = await forkTeam(mockClient, 1, 99);

      expect(result).toEqual({ id: 200 });
      expect(
        (mockClient as unknown as { rpc: jest.Mock }).rpc
      ).toHaveBeenCalledWith("fork_team", {
        p_source_team_id: 1,
        p_target_alt_id: 99,
        p_new_name: undefined,
      });
    });

    it("passes newName to RPC when provided", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: 200, error: null });

      await forkTeam(mockClient, 1, 99, "My Custom Fork");

      expect(
        (mockClient as unknown as { rpc: jest.Mock }).rpc
      ).toHaveBeenCalledWith("fork_team", {
        p_source_team_id: 1,
        p_target_alt_id: 99,
        p_new_name: "My Custom Fork",
      });
    });

    it("throws when RPC returns an error", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "not found" } });

      await expect(forkTeam(mockClient, 1, 99)).rejects.toThrow(
        "Failed to fork team: not found"
      );
    });

    it("throws when RPC returns null data", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      await expect(forkTeam(mockClient, 1, 99)).rejects.toThrow(
        "Fork returned no team ID"
      );
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

    it("calls the add_pokemon_to_team RPC and returns the new pokemon id", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: 55, error: null });

      const result = await addPokemonToTeam(mockClient, 3, pokemonInsert, 2);

      expect(result).toEqual({ pokemonId: 55 });
      expect(
        (mockClient as unknown as { rpc: jest.Mock }).rpc
      ).toHaveBeenCalledWith("add_pokemon_to_team", {
        p_team_id: 3,
        p_pokemon: pokemonInsert,
        p_position: 2,
      });
    });

    it("throws when the RPC returns an error", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({
          data: null,
          error: { message: "constraint violation" },
        });

      await expect(
        addPokemonToTeam(mockClient, 3, pokemonInsert, 2)
      ).rejects.toThrow("Failed to add pokemon to team: constraint violation");
    });

    it("throws when the RPC returns null data", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      await expect(
        addPokemonToTeam(mockClient, 3, pokemonInsert, 2)
      ).rejects.toThrow("add_pokemon_to_team returned no pokemon ID");
    });

    it.each([0, 1, 2, 3, 4, 5])(
      "passes position=%i to the RPC",
      async (position) => {
        const mockClient = createMockClient();
        (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
          .fn()
          .mockResolvedValue({ data: 55, error: null });

        await addPokemonToTeam(mockClient, 3, pokemonInsert, position);

        expect(
          (mockClient as unknown as { rpc: jest.Mock }).rpc
        ).toHaveBeenCalledWith(
          "add_pokemon_to_team",
          expect.objectContaining({ p_position: position })
        );
      }
    );
  });

  // ==========================================================================
  // updatePokemon
  // ==========================================================================

  describe("updatePokemon", () => {
    /**
     * Build a mock client where from("team_pokemon") and from("pokemon")
     * return independent query builders so the two sequential chains don't
     * interfere with each other.
     */
    const createUpdatePokemonMockClient = ({
      bindingData,
      bindingError,
      updateData,
      updateError,
    }: {
      bindingData: unknown;
      bindingError: unknown;
      updateData: unknown;
      updateError: unknown;
    }) => {
      // Builder for the team_pokemon binding check
      const teamPokemonQb = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: bindingData, error: bindingError }),
      };

      // Builder for the pokemon update
      const pokemonQb = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest
          .fn()
          .mockResolvedValue({ data: updateData, error: updateError }),
      };

      const fromMock = jest.fn((table: string) => {
        if (table === "team_pokemon") return teamPokemonQb;
        if (table === "pokemon") return pokemonQb;
        return {};
      });

      return {
        from: fromMock,
        _teamPokemonQb: teamPokemonQb,
        _pokemonQb: pokemonQb,
      } as unknown as TypedClient & {
        _teamPokemonQb: typeof teamPokemonQb;
        _pokemonQb: typeof pokemonQb;
      };
    };

    it("verifies team_pokemon binding then updates the pokemon row", async () => {
      const mockClient = createUpdatePokemonMockClient({
        bindingData: { pokemon_id: 55 },
        bindingError: null,
        updateData: [{ id: 55 }],
        updateError: null,
      });

      await updatePokemon(mockClient as unknown as TypedClient, 3, 55, {
        species: "Koraidon",
        move1: "Collision Course",
      });

      // Binding check: from("team_pokemon") with correct filters
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "team_pokemon");
      expect(mockClient._teamPokemonQb.eq).toHaveBeenCalledWith("team_id", 3);
      expect(mockClient._teamPokemonQb.eq).toHaveBeenCalledWith(
        "pokemon_id",
        55
      );
      // Update: from("pokemon") with correct payload
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "pokemon");
      expect(mockClient._pokemonQb.update).toHaveBeenCalledWith({
        species: "Koraidon",
        move1: "Collision Course",
      });
      expect(mockClient._pokemonQb.eq).toHaveBeenCalledWith("id", 55);
      expect(mockClient._pokemonQb.select).toHaveBeenCalledWith("id");
    });

    it("throws when the team_pokemon binding check returns no row", async () => {
      const mockClient = createUpdatePokemonMockClient({
        bindingData: null,
        bindingError: null,
        updateData: null,
        updateError: null,
      });

      await expect(
        updatePokemon(mockClient as unknown as TypedClient, 3, 55, {
          species: "Koraidon",
        })
      ).rejects.toThrow("Pokemon not found on this team or not authorized");
    });

    it("throws when the binding query itself errors", async () => {
      const mockClient = createUpdatePokemonMockClient({
        bindingData: null,
        bindingError: { message: "permission denied" },
        updateData: null,
        updateError: null,
      });

      await expect(
        updatePokemon(mockClient as unknown as TypedClient, 3, 55, {
          species: "Koraidon",
        })
      ).rejects.toThrow("Failed to verify pokemon on team: permission denied");
    });

    it("throws when update fails", async () => {
      const mockClient = createUpdatePokemonMockClient({
        bindingData: { pokemon_id: 55 },
        bindingError: null,
        updateData: null,
        updateError: { message: "row not found" },
      });

      await expect(
        updatePokemon(mockClient as unknown as TypedClient, 3, 55, {
          species: "Koraidon",
        })
      ).rejects.toThrow("Failed to update pokemon: row not found");
    });

    it("throws when no rows are returned (pokemon not found or RLS denied)", async () => {
      const mockClient = createUpdatePokemonMockClient({
        bindingData: { pokemon_id: 55 },
        bindingError: null,
        updateData: [],
        updateError: null,
      });

      await expect(
        updatePokemon(mockClient as unknown as TypedClient, 3, 55, {
          species: "Koraidon",
        })
      ).rejects.toThrow("Pokemon not found on this team or not authorized");
    });
  });

  // ==========================================================================
  // removePokemonFromTeam
  // ==========================================================================

  describe("removePokemonFromTeam", () => {
    it("calls the remove_pokemon_from_team RPC with correct parameters", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      await removePokemonFromTeam(mockClient, 3, 55);

      expect(
        (mockClient as unknown as { rpc: jest.Mock }).rpc
      ).toHaveBeenCalledWith("remove_pokemon_from_team", {
        p_team_id: 3,
        p_pokemon_id: 55,
      });
    });

    it("throws when the RPC returns an error", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "RLS denied" } });

      await expect(removePokemonFromTeam(mockClient, 3, 55)).rejects.toThrow(
        "Failed to remove pokemon from team: RLS denied"
      );
    });
  });

  // ==========================================================================
  // reorderTeamPokemon
  // ==========================================================================

  describe("reorderTeamPokemon", () => {
    it("calls the reorder_team_pokemon RPC with teamId and mapped positions", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      await reorderTeamPokemon(mockClient, 5, [
        { pokemonId: 10, position: 0 },
        { pokemonId: 11, position: 1 },
        { pokemonId: 12, position: 2 },
      ]);

      expect(
        (mockClient as unknown as { rpc: jest.Mock }).rpc
      ).toHaveBeenCalledWith("reorder_team_pokemon", {
        p_team_id: 5,
        p_positions: [
          { pokemon_id: 10, position: 0 },
          { pokemon_id: 11, position: 1 },
          { pokemon_id: 12, position: 2 },
        ],
      });
    });

    it("resolves immediately for an empty positions array", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      await expect(
        reorderTeamPokemon(mockClient, 5, [])
      ).resolves.toBeUndefined();

      expect(
        (mockClient as unknown as { rpc: jest.Mock }).rpc
      ).toHaveBeenCalledWith("reorder_team_pokemon", {
        p_team_id: 5,
        p_positions: [],
      });
    });

    it("throws when the RPC returns an error", async () => {
      const mockClient = createMockClient();
      (mockClient as unknown as { rpc: jest.Mock }).rpc = jest
        .fn()
        .mockResolvedValue({
          data: null,
          error: { message: "write conflict" },
        });

      await expect(
        reorderTeamPokemon(mockClient, 5, [{ pokemonId: 10, position: 0 }])
      ).rejects.toThrow("Failed to reorder team pokemon: write conflict");
    });
  });
});
