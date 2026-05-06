/**
 * Tests for createLocalPersistence — the local in-memory persistence adapter.
 */

import type { TeamWithPokemon, TablesInsert } from "@trainers/supabase";
import { createLocalPersistence } from "../persistence/local-persistence";

// =============================================================================
// Helpers
// =============================================================================

function makeTeam(overrides?: Partial<TeamWithPokemon>): TeamWithPokemon {
  return {
    id: -1,
    name: "Test Team",
    format: "gen9vgc2026regi",
    format_legal: null,
    description: null,
    notes: null,
    tags: null,
    is_public: null,
    parent_team_id: null,
    created_by: -1,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    team_pokemon: [],
    ...overrides,
  };
}

function makeTeamPokemon(
  pokemonId: number,
  position: number,
  species = "Pikachu"
): TeamWithPokemon["team_pokemon"][number] {
  return {
    id: pokemonId,
    pokemon_id: pokemonId,
    team_position: position,
    pokemon: {
      id: pokemonId,
      species,
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
      created_at: "2024-01-01T00:00:00.000Z",
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
    },
  };
}

function makePokemonInsert(
  overrides?: Partial<TablesInsert<"pokemon">>
): TablesInsert<"pokemon"> {
  return {
    species: "Charizard",
    ability: "Blaze",
    move1: "Flamethrower",
    move2: "Air Slash",
    nature: "Modest",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createLocalPersistence", () => {
  it("has mode 'local'", () => {
    const setTeam = jest.fn();
    const persistence = createLocalPersistence({ setTeam });
    expect(persistence.mode).toBe("local");
  });

  it("onMutationSuccess is a no-op", () => {
    const setTeam = jest.fn();
    const persistence = createLocalPersistence({ setTeam });
    // Should not throw
    expect(() => persistence.onMutationSuccess()).not.toThrow();
  });
});

describe("createLocalPersistence — addPokemon", () => {
  it("calls setTeam with a new pokemon entry at the given position", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam();
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    const result = await persistence.addPokemon(-1, makePokemonInsert(), 0);

    expect(result.success).toBe(true);
    if (result.success) {
      // Generated ID should be a negative number
      expect(result.data.pokemonId).toBeLessThan(0);
    }

    expect(setTeam).toHaveBeenCalledTimes(1);
    expect(capturedTeam).not.toBeNull();
    expect(capturedTeam!.team_pokemon).toHaveLength(1);
    expect(capturedTeam!.team_pokemon[0]!.team_position).toBe(0);
    expect(capturedTeam!.team_pokemon[0]!.pokemon!.species).toBe("Charizard");
    expect(capturedTeam!.team_pokemon[0]!.pokemon!.ability).toBe("Blaze");
  });

  it("replaces existing pokemon at the same position", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({
      team_pokemon: [makeTeamPokemon(-100, 0, "Pikachu")],
    });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    await persistence.addPokemon(
      -1,
      makePokemonInsert({ species: "Garchomp" }),
      0
    );

    // Should have only the new pokemon at position 0
    expect(capturedTeam!.team_pokemon).toHaveLength(1);
    expect(capturedTeam!.team_pokemon[0]!.pokemon!.species).toBe("Garchomp");
  });

  it("preserves existing pokemon at other positions", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({
      team_pokemon: [
        makeTeamPokemon(-100, 0, "Pikachu"),
        makeTeamPokemon(-101, 1, "Eevee"),
      ],
    });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    await persistence.addPokemon(
      -1,
      makePokemonInsert({ species: "Garchomp" }),
      2
    );

    // Should have all 3 pokemon
    expect(capturedTeam!.team_pokemon).toHaveLength(3);
  });

  it("fills default values for optional pokemon fields", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam();
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    await persistence.addPokemon(
      -1,
      { species: "Ditto", ability: "Imposter", move1: "Transform" },
      0
    );

    const poke = capturedTeam!.team_pokemon[0]!.pokemon!;
    expect(poke.nature).toBe("Serious");
    expect(poke.level).toBe(50);
    expect(poke.is_shiny).toBe(false);
    expect(poke.ev_hp).toBe(0);
    expect(poke.iv_hp).toBe(31);
    expect(poke.nickname).toBeNull();
    expect(poke.held_item).toBeNull();
    expect(poke.tera_type).toBeNull();
    expect(poke.gender).toBeNull();
  });

  it("generates unique IDs across multiple calls", async () => {
    const ids: number[] = [];
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        const result = updater(makeTeam());
        ids.push(result.team_pokemon[0]!.pokemon_id);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    await persistence.addPokemon(-1, makePokemonInsert(), 0);
    await persistence.addPokemon(-1, makePokemonInsert(), 1);
    await persistence.addPokemon(-1, makePokemonInsert(), 2);

    // All IDs should be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });
});

describe("createLocalPersistence — updatePokemon", () => {
  it("updates fields of the matching pokemon", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({
      team_pokemon: [makeTeamPokemon(-100, 0, "Pikachu")],
    });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    const result = await persistence.updatePokemon(-1, -100, {
      nature: "Jolly",
      held_item: "Light Ball",
    });

    expect(result.success).toBe(true);
    expect(capturedTeam!.team_pokemon[0]!.pokemon!.nature).toBe("Jolly");
    expect(capturedTeam!.team_pokemon[0]!.pokemon!.held_item).toBe(
      "Light Ball"
    );
    // Non-updated fields remain unchanged
    expect(capturedTeam!.team_pokemon[0]!.pokemon!.species).toBe("Pikachu");
  });

  it("does not modify other pokemon in the team", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({
      team_pokemon: [
        makeTeamPokemon(-100, 0, "Pikachu"),
        makeTeamPokemon(-101, 1, "Eevee"),
      ],
    });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    await persistence.updatePokemon(-1, -100, { nature: "Bold" });

    // Eevee should be untouched
    expect(capturedTeam!.team_pokemon[1]!.pokemon!.species).toBe("Eevee");
    expect(capturedTeam!.team_pokemon[1]!.pokemon!.nature).toBe("Timid");
  });

  it("updates the team updated_at timestamp", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({
      team_pokemon: [makeTeamPokemon(-100, 0, "Pikachu")],
      updated_at: "2020-01-01T00:00:00.000Z",
    });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    await persistence.updatePokemon(-1, -100, { nature: "Bold" });

    // updated_at should be newer
    expect(capturedTeam!.updated_at).not.toBe("2020-01-01T00:00:00.000Z");
  });
});

describe("createLocalPersistence — removePokemon", () => {
  it("removes the pokemon with the matching ID", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({
      team_pokemon: [
        makeTeamPokemon(-100, 0, "Pikachu"),
        makeTeamPokemon(-101, 1, "Eevee"),
      ],
    });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    const result = await persistence.removePokemon(-1, -100);

    expect(result.success).toBe(true);
    expect(capturedTeam!.team_pokemon).toHaveLength(1);
    expect(capturedTeam!.team_pokemon[0]!.pokemon!.species).toBe("Eevee");
  });

  it("handles removing from an empty team gracefully", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam();
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    const result = await persistence.removePokemon(-1, -999);

    expect(result.success).toBe(true);
    expect(capturedTeam!.team_pokemon).toHaveLength(0);
  });
});

describe("createLocalPersistence — reorderPokemon", () => {
  it("updates team_position for specified pokemon", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({
      team_pokemon: [
        makeTeamPokemon(-100, 0, "Pikachu"),
        makeTeamPokemon(-101, 1, "Eevee"),
        makeTeamPokemon(-102, 2, "Charizard"),
      ],
    });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    const result = await persistence.reorderPokemon(-1, [
      { pokemonId: -100, position: 2 },
      { pokemonId: -102, position: 0 },
    ]);

    expect(result.success).toBe(true);

    // Pikachu moved to position 2
    const pikachu = capturedTeam!.team_pokemon.find(
      (tp) => tp.pokemon_id === -100
    );
    expect(pikachu!.team_position).toBe(2);

    // Charizard moved to position 0
    const charizard = capturedTeam!.team_pokemon.find(
      (tp) => tp.pokemon_id === -102
    );
    expect(charizard!.team_position).toBe(0);

    // Eevee stays at position 1 (not in the reorder list)
    const eevee = capturedTeam!.team_pokemon.find(
      (tp) => tp.pokemon_id === -101
    );
    expect(eevee!.team_position).toBe(1);
  });
});

describe("createLocalPersistence — updateTeam", () => {
  it("updates team metadata fields", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({
      name: "Old Name",
      format: "gen9vgc2026regi",
    });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    const result = await persistence.updateTeam(-1, { name: "New Name" });

    expect(result.success).toBe(true);
    expect(capturedTeam!.name).toBe("New Name");
    // Format should remain unchanged
    expect(capturedTeam!.format).toBe("gen9vgc2026regi");
  });

  it("sets updated_at to a new value", async () => {
    let capturedTeam: TeamWithPokemon | null = null;
    const initialTeam = makeTeam({ updated_at: "2020-01-01T00:00:00.000Z" });
    const setTeam = jest.fn(
      (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => {
        capturedTeam = updater(initialTeam);
      }
    );

    const persistence = createLocalPersistence({ setTeam });
    await persistence.updateTeam(-1, { name: "Updated" });

    expect(capturedTeam!.updated_at).not.toBe("2020-01-01T00:00:00.000Z");
  });
});
