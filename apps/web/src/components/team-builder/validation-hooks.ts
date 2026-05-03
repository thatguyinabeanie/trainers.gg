import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Dex } from "@pkmn/dex";

import {
  type GameFormat,
  type PokemonSet,
  type PokemonValidationError,
  validatePokemon,
} from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";
import { containsProfanity } from "@trainers/validators";

import { dbPokemonToPokemonSet } from "./pokemon-utils";

// =============================================================================
// Types
// =============================================================================

export interface ValidationError extends PokemonValidationError {
  /** DB pokemon.id — used to group errors by Pokemon */
  pokemonId: number;
  /** Species name for display */
  pokemonName: string;
}

/** The DB pokemon row shape — NonNullable<TeamWithPokemon["team_pokemon"][number]["pokemon"]> */
type DbPokemon = NonNullable<
  TeamWithPokemon["team_pokemon"][number]["pokemon"]
>;

/** A team_pokemon entry with a resolved pokemon row */
type TeamPokemonEntry = TeamWithPokemon["team_pokemon"][number];

// =============================================================================
// Debounce duration
// =============================================================================

const DEBOUNCE_MS = 1500;

// =============================================================================
// Error filtering helpers
// =============================================================================

export function errorsForFields(
  errors: ValidationError[],
  fields: readonly string[]
): ValidationError[] {
  return errors.filter((e) => fields.includes(e.field));
}

// =============================================================================
// Validation logic
// =============================================================================

/**
 * Runs all per-pokemon and cross-team validation checks.
 * Returns a flat list of ValidationError items.
 */
function runValidation(
  teamPokemon: TeamWithPokemon["team_pokemon"],
  format: GameFormat | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Collect entries with a resolved pokemon row
  const resolved: Array<{
    pokemonId: number;
    pokemon: DbPokemon;
    pokemonSet: PokemonSet;
  }> = [];

  for (const entry of teamPokemon) {
    if (!entry.pokemon) continue;

    const pokemonSet = dbPokemonToPokemonSet(entry.pokemon);

    resolved.push({
      pokemonId: entry.pokemon_id,
      pokemon: entry.pokemon,
      pokemonSet,
    });
  }

  // -----------------------------------------------------------------------
  // Per-Pokemon validation via validatePokemon()
  // -----------------------------------------------------------------------

  for (const { pokemonId, pokemon, pokemonSet } of resolved) {
    const speciesName = pokemon.species ?? "";
    const result = validatePokemon(pokemonSet, format);

    // Determine if this species is genderless — genderless Pokemon should not
    // produce gender validation errors (e.g., Magnemite, Staryu, Metagross).
    const dexSpecies = Dex.species.get(speciesName);
    const isGenderless = dexSpecies.gender === "N";

    for (const err of result.errors) {
      // Skip gender errors for genderless species
      if (isGenderless && err.field === "gender") continue;

      errors.push({
        pokemonId,
        pokemonName: speciesName,
        field: err.field,
        message: err.message,
        severity: "error",
      });
    }

    // -----------------------------------------------------------------------
    // Nickname profanity check
    // -----------------------------------------------------------------------

    if (pokemon.nickname && containsProfanity(pokemon.nickname)) {
      errors.push({
        pokemonId,
        pokemonName: speciesName,
        field: "nickname",
        message: "Nickname contains inappropriate content",
        severity: "error",
      });
    }
  }

  // -----------------------------------------------------------------------
  // Cross-team: duplicate held items
  // -----------------------------------------------------------------------

  const itemMap = new Map<
    string,
    Array<{ pokemonId: number; species: string }>
  >();

  for (const { pokemonId, pokemon } of resolved) {
    const item = pokemon.held_item;
    if (!item) continue;

    const bucket = itemMap.get(item) ?? [];
    bucket.push({ pokemonId, species: pokemon.species ?? "" });
    itemMap.set(item, bucket);
  }

  for (const [, holders] of itemMap) {
    if (holders.length < 2) continue;

    for (const holder of holders) {
      const others = holders
        .filter((h) => h.pokemonId !== holder.pokemonId)
        .map((h) => h.species)
        .join(", ");

      errors.push({
        pokemonId: holder.pokemonId,
        pokemonName: holder.species,
        field: "item",
        message: `Duplicate item — also held by ${others}`,
        severity: "error",
      });
    }
  }

  // -----------------------------------------------------------------------
  // Cross-team: duplicate species
  // -----------------------------------------------------------------------

  const speciesMap = new Map<
    string,
    Array<{ pokemonId: number; species: string }>
  >();

  for (const { pokemonId, pokemon } of resolved) {
    const species = pokemon.species;
    if (!species) continue;

    const bucket = speciesMap.get(species) ?? [];
    bucket.push({ pokemonId, species });
    speciesMap.set(species, bucket);
  }

  for (const [, members] of speciesMap) {
    if (members.length < 2) continue;

    for (const member of members) {
      errors.push({
        pokemonId: member.pokemonId,
        pokemonName: member.species,
        field: "species",
        message: `Duplicate species — ${member.species} appears more than once`,
        severity: "error",
      });
    }
  }

  // -----------------------------------------------------------------------
  // Team size warning: fewer than 6 Pokemon
  // -----------------------------------------------------------------------

  const filled = teamPokemon.filter(
    (e): e is TeamPokemonEntry & { pokemon: DbPokemon } => e.pokemon !== null
  );

  if (filled.length < 6) {
    // Attach warning to the first Pokemon when one exists; empty teams do not emit this warning
    const first = filled[0];
    if (first) {
      errors.push({
        pokemonId: first.pokemon_id,
        pokemonName: first.pokemon.species ?? "",
        field: "teamSize",
        message: `Team has ${filled.length} of 6 Pokemon`,
        severity: "warning",
      });
    }
  }

  return errors;
}

/**
 * Groups a flat ValidationError list by pokemonId.
 */
function groupByPokemonId(
  errors: ValidationError[]
): Map<number, ValidationError[]> {
  const map = new Map<number, ValidationError[]>();
  for (const err of errors) {
    const bucket = map.get(err.pokemonId) ?? [];
    bucket.push(err);
    map.set(err.pokemonId, bucket);
  }
  return map;
}

// =============================================================================
// Hook
// =============================================================================

export interface UseTeamValidationResult {
  errors: ValidationError[];
  pokemonErrors: Map<number, ValidationError[]>;
  isValid: boolean;
  validate: () => void;
}

/**
 * Provides reactive, debounced team validation for the team builder workspace.
 *
 * - Validation runs 1.5 s after any change to `teamPokemon` (debounced)
 * - `validate()` runs immediately for the manual Validate button
 * - `pokemonErrors` groups errors by pokemon DB id for fast lookup in the strip/editor
 * - `isValid` is false when any error (not warning) is present
 *
 * @param teamPokemon  - The team_pokemon array from the DB query
 * @param format       - The GameFormat for this team (may be undefined while loading)
 */
export function useTeamValidation(
  teamPokemon: TeamWithPokemon["team_pokemon"],
  format: GameFormat | undefined
): UseTeamValidationResult {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [pokemonErrors, setPokemonErrors] = useState<
    Map<number, ValidationError[]>
  >(new Map());

  // Keep latest teamPokemon + format in a ref so the timer callback is always
  // reading the most recent values without needing to be in the effect deps.
  const teamPokemonRef = useRef(teamPokemon);
  const formatRef = useRef(format);

  // Keep refs current before any effects fire, so the debounce timer callback
  // always reads the latest values. useLayoutEffect runs synchronously after
  // render before effects — the approved pattern per react-patterns.md.
  useLayoutEffect(() => {
    teamPokemonRef.current = teamPokemon;
    formatRef.current = format;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Immediate (non-debounced) validation — exposed as `validate()`
  const validate = () => {
    const result = runValidation(teamPokemonRef.current, formatRef.current);
    setErrors(result);
    setPokemonErrors(groupByPokemonId(result));
  };

  // Debounced reactive validation on teamPokemon changes
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const result = runValidation(teamPokemonRef.current, formatRef.current);
      setErrors(result);
      setPokemonErrors(groupByPokemonId(result));
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [teamPokemon]);

  const isValid = errors.every((e) => e.severity !== "error");

  return { errors, pokemonErrors, isValid, validate };
}
