import type { TablesInsert, TablesUpdate, TeamWithPokemon } from "@trainers/supabase";
import { createLocalPersistence } from "../local-persistence";
import type { TeamUpdateData } from "../types";

beforeEach(() => jest.clearAllMocks());

function makeTeam(teamPokemon: TeamWithPokemon["team_pokemon"] = []): TeamWithPokemon {
  return {
    id: 1,
    name: "Test Team",
    format: "gen9vgc2024regg",
    alt_id: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    is_public: false,
    team_pokemon: teamPokemon,
  } as TeamWithPokemon;
}

function makePokemonSlot(pokemonId: number, position: number) {
  return {
    id: pokemonId,
    pokemon_id: pokemonId,
    team_position: position,
    pokemon: {
      id: pokemonId,
      species: "Pikachu",
      ability: "Static",
      move1: "Thunderbolt",
      move2: null,
      move3: null,
      move4: null,
      nature: "Timid",
      nickname: null,
      notes: null,
      held_item: null,
      tera_type: null,
      gender: null,
      is_shiny: false,
      level: 50,
      format_legal: null,
      created_at: "2024-01-01T00:00:00Z",
      ev_hp: 0, ev_attack: 0, ev_defense: 0, ev_special_attack: 0, ev_special_defense: 0, ev_speed: 0,
      iv_hp: 31, iv_attack: 31, iv_defense: 31, iv_special_attack: 31, iv_special_defense: 31, iv_speed: 31,
    },
  } as TeamWithPokemon["team_pokemon"][number];
}

describe("createLocalPersistence", () => {
  let team: TeamWithPokemon;
  let setTeam: jest.Mock;
  let persistence: ReturnType<typeof createLocalPersistence>;

  beforeEach(() => {
    team = makeTeam();
    setTeam = jest.fn((updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
      team = updater(team);
    });
    persistence = createLocalPersistence({ setTeam });
  });

  it("has mode 'local'", () => {
    expect(persistence.mode).toBe("local");
  });

  it("addPokemon adds pokemon with negative ID and returns success", async () => {
    const pokemon = { species: "Charizard", ability: "Blaze", move1: "Flamethrower" } as unknown as TablesInsert<"pokemon">;
    const result = await persistence.addPokemon(1, pokemon, 0);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pokemonId).toBeLessThan(0);
    }
    expect(team.team_pokemon).toHaveLength(1);
    expect(team.team_pokemon[0].team_position).toBe(0);
    expect(team.team_pokemon[0].pokemon!.species).toBe("Charizard");
  });

  it("sequential adds generate decreasing IDs", async () => {
    const pokemon = { species: "A", ability: "X", move1: "Y" } as unknown as TablesInsert<"pokemon">;
    const r1 = await persistence.addPokemon(1, pokemon, 0);
    const r2 = await persistence.addPokemon(1, pokemon, 1);

    if (r1.success && r2.success) {
      expect(r2.data.pokemonId).toBeLessThan(r1.data.pokemonId);
    }
  });

  it("updatePokemon updates the correct pokemon's fields", async () => {
    team = makeTeam([makePokemonSlot(5, 0)]);
    persistence = createLocalPersistence({ setTeam });

    const result = await persistence.updatePokemon(1, 5, { nature: "Adamant" } as Partial<TablesUpdate<"pokemon">>);
    expect(result).toEqual({ success: true, data: undefined });
    expect(team.team_pokemon[0].pokemon!.nature).toBe("Adamant");
  });

  it("removePokemon removes the pokemon from the team", async () => {
    team = makeTeam([makePokemonSlot(5, 0), makePokemonSlot(6, 1)]);
    persistence = createLocalPersistence({ setTeam });

    const result = await persistence.removePokemon(1, 5);
    expect(result).toEqual({ success: true, data: undefined });
    expect(team.team_pokemon).toHaveLength(1);
    expect(team.team_pokemon[0].pokemon_id).toBe(6);
  });

  it("reorderPokemon updates positions correctly", async () => {
    team = makeTeam([makePokemonSlot(5, 0), makePokemonSlot(6, 1)]);
    persistence = createLocalPersistence({ setTeam });

    const result = await persistence.reorderPokemon(1, [
      { pokemonId: 5, position: 1 },
      { pokemonId: 6, position: 0 },
    ]);
    expect(result).toEqual({ success: true, data: undefined });
    expect(team.team_pokemon.find((tp) => tp.pokemon_id === 5)!.team_position).toBe(1);
    expect(team.team_pokemon.find((tp) => tp.pokemon_id === 6)!.team_position).toBe(0);
  });

  it("updateTeam merges fields into the team", async () => {
    const result = await persistence.updateTeam(1, { name: "Updated" } as TeamUpdateData);
    expect(result).toEqual({ success: true, data: undefined });
    expect(team.name).toBe("Updated");
  });

  it("onMutationSuccess is a no-op", () => {
    expect(() => persistence.onMutationSuccess()).not.toThrow();
  });
});
