import {
  fromFlat,
  type PokemonSet,
  type PokemonSetFlat,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// DB → PokemonSetFlat / PokemonSet conversion
// =============================================================================

/**
 * Convert a DB pokemon row (snake_case) to PokemonSetFlat (camelCase).
 * Used by export, import, and validation to bridge DB ↔ @trainers/pokemon formats.
 */
export function dbPokemonToFlat(pokemon: Tables<"pokemon">): PokemonSetFlat {
  return {
    species: pokemon.species ?? "",
    nickname: pokemon.nickname ?? undefined,
    ability: pokemon.ability ?? "",
    nature: pokemon.nature ?? "",
    move1: pokemon.move1 ?? "",
    move2: pokemon.move2 ?? undefined,
    move3: pokemon.move3 ?? undefined,
    move4: pokemon.move4 ?? undefined,
    heldItem: pokemon.held_item ?? undefined,
    level: pokemon.level ?? 50,
    isShiny: pokemon.is_shiny ?? false,
    teraType: pokemon.tera_type ?? undefined,
    gender: (pokemon.gender as "Male" | "Female" | undefined) ?? undefined,
    formatLegal: true,
    evHp: pokemon.ev_hp ?? 0,
    evAttack: pokemon.ev_attack ?? 0,
    evDefense: pokemon.ev_defense ?? 0,
    evSpecialAttack: pokemon.ev_special_attack ?? 0,
    evSpecialDefense: pokemon.ev_special_defense ?? 0,
    evSpeed: pokemon.ev_speed ?? 0,
    ivHp: pokemon.iv_hp ?? 31,
    ivAttack: pokemon.iv_attack ?? 31,
    ivDefense: pokemon.iv_defense ?? 31,
    ivSpecialAttack: pokemon.iv_special_attack ?? 31,
    ivSpecialDefense: pokemon.iv_special_defense ?? 31,
    ivSpeed: pokemon.iv_speed ?? 31,
  };
}

/**
 * Convert a DB pokemon row to structured PokemonSet.
 * Convenience wrapper: dbPokemonToFlat → fromFlat.
 */
export function dbPokemonToPokemonSet(pokemon: Tables<"pokemon">): PokemonSet {
  return fromFlat(dbPokemonToFlat(pokemon));
}
