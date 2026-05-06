import type { TablesInsert, TablesUpdate } from "@trainers/supabase";

import { createApiPersistence } from "../api-persistence";
import type { TeamUpdateData } from "../types";

jest.mock("@/lib/api/teams-client", () => ({
  teamsApi: {
    addPokemon: jest
      .fn()
      .mockResolvedValue({ success: true, data: { pokemonId: 1 } }),
    updatePokemon: jest
      .fn()
      .mockResolvedValue({ success: true, data: undefined }),
    removePokemon: jest
      .fn()
      .mockResolvedValue({ success: true, data: undefined }),
    reorderPokemon: jest
      .fn()
      .mockResolvedValue({ success: true, data: undefined }),
    update: jest.fn().mockResolvedValue({ success: true, data: undefined }),
    transfer: jest.fn().mockResolvedValue({ success: true, data: undefined }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { teamsApi } = require("@/lib/api/teams-client");

beforeEach(() => jest.clearAllMocks());

describe("createApiPersistence", () => {
  const onMutationSuccess = jest.fn();
  const persistence = createApiPersistence({ onMutationSuccess });

  it("has mode 'api'", () => {
    expect(persistence.mode).toBe("api");
  });

  it("addPokemon delegates to teamsApi.addPokemon", async () => {
    const pokemon = { species: "Pikachu" } as unknown as TablesInsert<"pokemon">;
    await persistence.addPokemon(1, pokemon, 0);
    expect(teamsApi.addPokemon).toHaveBeenCalledWith(1, pokemon, 0);
  });

  it("updatePokemon delegates to teamsApi.updatePokemon", async () => {
    const fields: Partial<TablesUpdate<"pokemon">> = { nature: "Adamant" };
    await persistence.updatePokemon(1, 5, fields);
    expect(teamsApi.updatePokemon).toHaveBeenCalledWith(1, 5, fields);
  });

  it("removePokemon delegates to teamsApi.removePokemon", async () => {
    await persistence.removePokemon(1, 5);
    expect(teamsApi.removePokemon).toHaveBeenCalledWith(1, 5);
  });

  it("reorderPokemon delegates to teamsApi.reorderPokemon", async () => {
    const positions = [{ pokemonId: 1, position: 2 }];
    await persistence.reorderPokemon(1, positions);
    expect(teamsApi.reorderPokemon).toHaveBeenCalledWith(1, positions);
  });

  it("updateTeam delegates to teamsApi.update", async () => {
    const fields: TeamUpdateData = { name: "New" };
    await persistence.updateTeam(1, fields);
    expect(teamsApi.update).toHaveBeenCalledWith(1, fields);
  });

  it("transferTeam delegates to teamsApi.transfer", async () => {
    await persistence.transferTeam!(1, 3);
    expect(teamsApi.transfer).toHaveBeenCalledWith(1, 3);
  });

  it("onMutationSuccess is the callback passed in", () => {
    persistence.onMutationSuccess();
    expect(onMutationSuccess).toHaveBeenCalled();
  });
});
