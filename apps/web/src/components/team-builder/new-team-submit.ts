import {
  getLegalItems,
  getLegalMoves,
  getLegalSpecies,
  getLegalTeraTypes,
  isLegalAbility,
  LEGALITY_UNAVAILABLE,
} from "@trainers/pokemon";
import { type TablesInsert } from "@trainers/supabase";
import { parseShowdownText } from "@trainers/validators";

import { addPokemonToTeamAction, createTeamAction } from "@/actions/teams";

// =============================================================================
// Types
// =============================================================================

export type NewTeamSubmitInput = {
  altId: number;
  name: string;
  format: string;
  mode: "empty" | "import";
  /** Empty string when mode === "empty". */
  paste: string;
};

export type NewTeamSubmitResult =
  | { status: "ok"; teamId: number }
  | { status: "error"; error: string }
  | { status: "empty-paste"; teamId: number }
  | { status: "partial"; teamId: number; failedSpecies: string[] };

// =============================================================================
// Helper
// =============================================================================

/**
 * Orchestrates creating a new team and optionally importing a Showdown paste.
 * Returns a discriminated result so callers can display the appropriate toast
 * without duplicating the import logic.
 */
export async function submitNewTeam(
  input: NewTeamSubmitInput
): Promise<NewTeamSubmitResult> {
  // 1. If import mode with a non-blank paste, parse + legality-check BEFORE
  //    creating the team record so we never leave an orphan team row on error.
  let parsed: ReturnType<typeof parseShowdownText> = [];
  if (input.mode === "import" && input.paste.trim()) {
    parsed = parseShowdownText(input.paste.trim());

    // Reject the whole paste when any species is illegal in the target format.
    if (parsed.length > 0) {
      const unavailable = {
        status: "error" as const,
        error:
          "Legality check is temporarily unavailable. Please try again in a moment.",
      };
      const legalSet = getLegalSpecies(input.format);
      if (legalSet === LEGALITY_UNAVAILABLE) return unavailable;
      if (legalSet !== undefined) {
        const illegal = parsed
          .map((p) => p.species)
          .filter(
            (species): species is string =>
              Boolean(species) && !legalSet.has(species)
          );
        if (illegal.length > 0) {
          return {
            status: "error",
            error: `Cannot import. These Pokémon aren't legal in this format: ${illegal.join(", ")}.`,
          };
        }
      }

      // Reject the whole paste when any held item is illegal in the target format.
      const legalItems = getLegalItems(input.format);
      if (legalItems === LEGALITY_UNAVAILABLE) return unavailable;
      if (legalItems !== undefined) {
        const illegalItems = parsed
          .map((p) => p.held_item)
          .filter(
            (i): i is string => i !== null && i !== "" && !legalItems.has(i)
          );
        if (illegalItems.length > 0) {
          return {
            status: "error",
            error: `Cannot import. These items aren't legal in this format: ${[...new Set(illegalItems)].join(", ")}.`,
          };
        }
      }

      // Reject the whole paste when any move is illegal for its species in this format.
      const illegalMoves: string[] = [];
      for (const p of parsed) {
        if (!p.species) continue;
        const legalForSpecies = getLegalMoves(p.species, input.format);
        if (legalForSpecies === LEGALITY_UNAVAILABLE) return unavailable;
        if (!legalForSpecies) continue;
        for (const slot of ["move1", "move2", "move3", "move4"] as const) {
          const move = p[slot];
          if (move && !legalForSpecies.has(move)) {
            illegalMoves.push(`${move} on ${p.species}`);
          }
        }
      }
      if (illegalMoves.length > 0) {
        return {
          status: "error",
          error: `Cannot import. Illegal moves: ${illegalMoves.join("; ")}.`,
        };
      }

      // Reject the whole paste when any Tera type is illegal in the target format.
      const legalTera = getLegalTeraTypes(input.format);
      if (legalTera === LEGALITY_UNAVAILABLE) return unavailable;
      if (legalTera !== undefined) {
        const illegalTera = parsed
          .map((p) => p.tera_type)
          .filter((t): t is NonNullable<typeof t> => {
            if (!t) return false;
            return !legalTera.has(t);
          });
        if (illegalTera.length > 0) {
          return {
            status: "error",
            error:
              legalTera.size === 0
                ? "Cannot import. Tera isn't allowed in this format."
                : `Cannot import. Illegal Tera types: ${[...new Set(illegalTera)].join(", ")}.`,
          };
        }
      }

      // Reject the whole paste when any ability is illegal for its species in this format.
      const illegalAbilities: string[] = [];
      for (const p of parsed) {
        if (!p.species || !p.ability) continue;
        if (!isLegalAbility(p.ability, p.species, input.format)) {
          illegalAbilities.push(`${p.ability} on ${p.species}`);
        }
      }
      if (illegalAbilities.length > 0) {
        return {
          status: "error",
          error: `Cannot import. Illegal abilities: ${illegalAbilities.join("; ")}.`,
        };
      }
    }
  }

  // 2. Create the team record
  const createResult = await createTeamAction(
    input.altId,
    input.name.trim(),
    input.format
  );
  if (!createResult.success) {
    return { status: "error", error: createResult.error };
  }
  const teamId = createResult.data.id;

  // 3. If not import mode, or paste is blank, we're done
  if (input.mode !== "import" || !input.paste.trim()) {
    return { status: "ok", teamId };
  }

  // 4. If the paste was unparseable, report empty-paste (team was created)
  if (parsed.length === 0) {
    return { status: "empty-paste", teamId };
  }

  // 5. Import up to 6 pokemon concurrently with explicit position indexes.
  //    Cast gender to the DB enum — parseShowdownText uses string | null but
  //    the DB expects the "Male" | "Female" enum. Trim to valid values only.
  const toImport = parsed.slice(0, 6);
  const addResults = await Promise.all(
    toImport.map((pokemon, i) => {
      const gender =
        pokemon.gender === "Male" || pokemon.gender === "Female"
          ? pokemon.gender
          : null;
      const pokemonInsert: TablesInsert<"pokemon"> = {
        species: pokemon.species,
        ability: pokemon.ability,
        nature: pokemon.nature,
        move1: pokemon.move1 ?? "",
        move2: pokemon.move2,
        move3: pokemon.move3,
        move4: pokemon.move4,
        held_item: pokemon.held_item,
        level: pokemon.level,
        nickname: pokemon.nickname,
        is_shiny: pokemon.is_shiny,
        tera_type: pokemon.tera_type,
        gender,
        ev_hp: pokemon.ev_hp,
        ev_attack: pokemon.ev_attack,
        ev_defense: pokemon.ev_defense,
        ev_special_attack: pokemon.ev_special_attack,
        ev_special_defense: pokemon.ev_special_defense,
        ev_speed: pokemon.ev_speed,
        iv_hp: pokemon.iv_hp,
        iv_attack: pokemon.iv_attack,
        iv_defense: pokemon.iv_defense,
        iv_special_attack: pokemon.iv_special_attack,
        iv_special_defense: pokemon.iv_special_defense,
        iv_speed: pokemon.iv_speed,
      };
      return addPokemonToTeamAction(teamId, pokemonInsert, i + 1);
    })
  );

  // 6. Collect any failures and report them
  const failedSpecies = toImport
    .filter((_, i) => !addResults[i]?.success)
    .map((p) => p.species);

  if (failedSpecies.length > 0) {
    return { status: "partial", teamId, failedSpecies };
  }

  return { status: "ok", teamId };
}
