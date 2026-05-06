"use client";

/**
 * Local Persistence Adapter
 *
 * Implements BuilderPersistence using in-memory state backed by localStorage.
 * Used by the public builder for anonymous team building.
 *
 * All mutations are synchronous (resolved immediately) since there's no server
 * round-trip. The team state is the single source of truth.
 */

import type { Tables, TablesInsert, TablesUpdate, TeamWithPokemon } from "@trainers/supabase";
import type { TeamUpdateData } from "@trainers/validators";
import type { BuilderPersistence, ActionResult } from "./types";

// =============================================================================
// ID Generator
// =============================================================================

/** Start from a timestamp-based negative value so HMR re-evaluation never collides. */
let nextLocalId = -Date.now();

/** Generate a unique negative ID for local pokemon/team_pokemon entries. */
function generateLocalId(): number {
  return nextLocalId--;
}

// =============================================================================
// Factory
// =============================================================================

interface CreateLocalPersistenceOptions {
  /** Setter to update the team state (from useLocalTeamStorage). */
  setTeam: (updater: (prev: TeamWithPokemon) => TeamWithPokemon) => void;
}

export function createLocalPersistence(
  options: CreateLocalPersistenceOptions
): BuilderPersistence {
  const { setTeam } = options;

  return {
    mode: "local",

    async addPokemon(
      _teamId: number,
      pokemon: TablesInsert<"pokemon">,
      position: number
    ): Promise<ActionResult<{ pokemonId: number }>> {
      const pokemonId = generateLocalId();

      // Build a full pokemon row from the insert payload
      const pokemonRow: Tables<"pokemon"> = {
        id: pokemonId,
        species: pokemon.species,
        ability: pokemon.ability ?? "",
        move1: pokemon.move1 ?? "",
        move2: pokemon.move2 ?? null,
        move3: pokemon.move3 ?? null,
        move4: pokemon.move4 ?? null,
        nature: pokemon.nature ?? "Serious",
        nickname: pokemon.nickname ?? null,
        notes: pokemon.notes ?? null,
        held_item: pokemon.held_item ?? null,
        tera_type: pokemon.tera_type ?? null,
        gender: pokemon.gender ?? null,
        is_shiny: pokemon.is_shiny ?? false,
        level: pokemon.level ?? 50,
        format_legal: null,
        created_at: new Date().toISOString(),
        ev_hp: pokemon.ev_hp ?? 0,
        ev_attack: pokemon.ev_attack ?? 0,
        ev_defense: pokemon.ev_defense ?? 0,
        ev_special_attack: pokemon.ev_special_attack ?? 0,
        ev_special_defense: pokemon.ev_special_defense ?? 0,
        ev_speed: pokemon.ev_speed ?? 0,
        iv_hp: pokemon.iv_hp ?? 31,
        iv_attack: pokemon.iv_attack ?? 31,
        iv_defense: pokemon.iv_defense ?? 31,
        iv_special_attack: pokemon.iv_special_attack ?? 31,
        iv_special_defense: pokemon.iv_special_defense ?? 31,
        iv_speed: pokemon.iv_speed ?? 31,
      };

      const teamPokemonEntry: TeamWithPokemon["team_pokemon"][number] = {
        id: pokemonId,
        pokemon_id: pokemonId,
        team_position: position,
        pokemon: pokemonRow,
      };

      setTeam((prev) => ({
        ...prev,
        team_pokemon: [
          // Remove any existing entry at this position
          ...prev.team_pokemon.filter((tp) => tp.team_position !== position),
          teamPokemonEntry,
        ],
        updated_at: new Date().toISOString(),
      }));

      return { success: true, data: { pokemonId } };
    },

    async updatePokemon(
      _teamId: number,
      pokemonId: number,
      fields: Partial<TablesUpdate<"pokemon">>
    ): Promise<ActionResult> {
      setTeam((prev) => ({
        ...prev,
        team_pokemon: prev.team_pokemon.map((tp) =>
          tp.pokemon_id === pokemonId && tp.pokemon
            ? { ...tp, pokemon: { ...tp.pokemon, ...fields } }
            : tp
        ),
        updated_at: new Date().toISOString(),
      }));

      return { success: true, data: undefined };
    },

    async removePokemon(_teamId: number, pokemonId: number): Promise<ActionResult> {
      setTeam((prev) => ({
        ...prev,
        team_pokemon: prev.team_pokemon.filter((tp) => tp.pokemon_id !== pokemonId),
        updated_at: new Date().toISOString(),
      }));

      return { success: true, data: undefined };
    },

    async reorderPokemon(
      _teamId: number,
      positions: { pokemonId: number; position: number }[]
    ): Promise<ActionResult> {
      setTeam((prev) => ({
        ...prev,
        team_pokemon: prev.team_pokemon.map((tp) => {
          const newPos = positions.find((p) => p.pokemonId === tp.pokemon_id);
          if (newPos) {
            return { ...tp, team_position: newPos.position };
          }
          return tp;
        }),
        updated_at: new Date().toISOString(),
      }));

      return { success: true, data: undefined };
    },

    async updateTeam(_teamId: number, fields: TeamUpdateData): Promise<ActionResult> {
      setTeam((prev) => ({
        ...prev,
        ...fields,
        updated_at: new Date().toISOString(),
      }));

      return { success: true, data: undefined };
    },

    // transferTeam is intentionally omitted — not available in local mode

    onMutationSuccess: () => {
      // No-op in local mode — state is already up to date
    },
  };
}
