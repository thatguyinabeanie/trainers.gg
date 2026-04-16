/**
 * Team Builder Server Actions
 *
 * Server actions for team and pokemon mutations.
 * Wraps @trainers/supabase mutations for creating, updating, deleting,
 * forking teams, and managing pokemon within teams.
 */

"use server";

import {
  createTeam as createTeamMutation,
  updateTeam as updateTeamMutation,
  deleteTeam as deleteTeamMutation,
  forkTeam as forkTeamMutation,
  addPokemonToTeam as addPokemonToTeamMutation,
  updatePokemon as updatePokemonMutation,
  removePokemonFromTeam as removePokemonFromTeamMutation,
  reorderTeamPokemon as reorderTeamPokemonMutation,
  getTeamWithPokemon,
  type TablesInsert,
  type TablesUpdate,
} from "@trainers/supabase";
import {
  type ActionResult,
  type TeamUpdateData,
  createTeamInputSchema,
  updateTeamInputSchema,
  teamUpdateDataSchema,
  deleteTeamInputSchema,
  forkTeamInputSchema,
  addPokemonInputSchema,
  updatePokemonInputSchema,
  removePokemonInputSchema,
  reorderTeamPokemonInputSchema,
  pokemonPayloadSchema,
  pokemonUpdateSchema,
} from "@trainers/validators";

import { invalidateTeamDetailCache } from "@/lib/cache-invalidation";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { rejectBots, withAction } from "@/actions/utils";
import { checkFormatChangeLegality } from "@/actions/format-legality-guard";
import { findLegalityViolation } from "@/actions/_legality";

// =============================================================================
// Team CRUD
// =============================================================================

/**
 * Create a new empty team for an alt.
 * Returns the newly created team's id.
 */
export async function createTeamAction(
  altId: number,
  name: string,
  format: string
): Promise<ActionResult<{ id: number }>> {
  const parsed = createTeamInputSchema.safeParse({ altId, name, format });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await createTeamMutation(
      supabase,
      parsed.data.altId,
      parsed.data.name,
      parsed.data.format
    );
    invalidateTeamDetailCache(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[server-action] createTeamAction:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create team"),
    };
  }
}

/**
 * Update team metadata. Only the fields provided will be updated.
 * See `TeamUpdateData` for accepted fields (name, format, description,
 * notes, tags, is_public).
 */
export async function updateTeamAction(
  teamId: number,
  data: TeamUpdateData
): Promise<ActionResult<void>> {
  const parsed = updateTeamInputSchema.safeParse({ teamId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const parsedData = teamUpdateDataSchema.safeParse(data);
  if (!parsedData.success) {
    return {
      success: false,
      error: parsedData.error.issues[0]?.message ?? "Invalid data",
    };
  }

  // ---------------------------------------------------------------------------
  // Format-change legality guard
  // ---------------------------------------------------------------------------
  // If the caller is switching formats, reject the change if any of the team's
  // current species are illegal in the target format.
  if (parsedData.data.format !== undefined) {
    const supabase = await createClient();
    const team = await getTeamWithPokemon(supabase, parsed.data.teamId);
    if (team !== null) {
      const guard = checkFormatChangeLegality(
        team.team_pokemon,
        team.format,
        parsedData.data.format
      );
      if (!guard.ok) {
        return {
          success: false,
          error: `These Pokémon aren't legal in the target format: ${guard.illegal.join(", ")}. Remove them before changing format.`,
        };
      }
    }
  }

  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await updateTeamMutation(supabase, parsed.data.teamId, parsedData.data);
    invalidateTeamDetailCache(parsed.data.teamId);
  }, "Failed to update team");
}

/**
 * Delete a team and all its associated pokemon records.
 */
export async function deleteTeamAction(
  teamId: number
): Promise<ActionResult<void>> {
  const parsed = deleteTeamInputSchema.safeParse({ teamId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await deleteTeamMutation(supabase, parsed.data.teamId);
    invalidateTeamDetailCache(parsed.data.teamId);
  }, "Failed to delete team");
}

/**
 * Fork a team — creates a full copy of the source team and all its pokemon,
 * setting parent_team_id to the source team's id.
 * Returns the new team's id.
 */
export async function forkTeamAction(
  sourceTeamId: number,
  targetAltId: number,
  newName?: string
): Promise<ActionResult<{ id: number }>> {
  const parsed = forkTeamInputSchema.safeParse({
    sourceTeamId,
    targetAltId,
    newName,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await forkTeamMutation(
      supabase,
      parsed.data.sourceTeamId,
      parsed.data.targetAltId,
      parsed.data.newName
    );
    invalidateTeamDetailCache(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("[server-action] forkTeamAction:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fork team"),
    };
  }
}

// =============================================================================
// Pokemon CRUD
// =============================================================================

/**
 * Add a pokemon to a team at the given position.
 * Returns the new pokemon's id.
 */
export async function addPokemonToTeamAction(
  teamId: number,
  pokemon: TablesInsert<"pokemon">,
  position: number
): Promise<ActionResult<{ pokemonId: number }>> {
  const parsed = addPokemonInputSchema.safeParse({ teamId, position });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const parsedPokemon = pokemonPayloadSchema.safeParse(pokemon);
  if (!parsedPokemon.success) {
    return {
      success: false,
      error: parsedPokemon.error.issues[0]?.message ?? "Invalid pokemon data",
    };
  }
  try {
    await rejectBots();
    const supabase = await createClient();

    // -------------------------------------------------------------------------
    // Legality guard — validate species/item/ability/moves/tera against format
    // -------------------------------------------------------------------------
    const team = await getTeamWithPokemon(supabase, parsed.data.teamId);
    if (team?.format) {
      const violation = findLegalityViolation(parsedPokemon.data, team.format);
      if (violation) return { success: false, error: violation };
    }

    const result = await addPokemonToTeamMutation(
      supabase,
      parsed.data.teamId,
      parsedPokemon.data as TablesInsert<"pokemon">,
      parsed.data.position
    );
    invalidateTeamDetailCache(parsed.data.teamId);
    return { success: true, data: { pokemonId: result.pokemonId } };
  } catch (error) {
    console.error("[server-action] addPokemonToTeamAction:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add pokemon to team"),
    };
  }
}

/**
 * Update a pokemon's data — moves, EVs, IVs, ability, item, etc.
 * Only the fields provided will be updated.
 */
export async function updatePokemonAction(
  teamId: number,
  pokemonId: number,
  data: Partial<TablesUpdate<"pokemon">>
): Promise<ActionResult<void>> {
  const parsedTeam = updateTeamInputSchema.safeParse({ teamId });
  if (!parsedTeam.success) {
    return {
      success: false,
      error: parsedTeam.error.issues[0]?.message ?? "Invalid team id",
    };
  }
  const parsed = updatePokemonInputSchema.safeParse({ pokemonId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const parsedData = pokemonUpdateSchema.parse(data);
    const supabase = await createClient();

    // -------------------------------------------------------------------------
    // Legality guard — merge current row with incoming updates, then validate
    // -------------------------------------------------------------------------
    const team = await getTeamWithPokemon(supabase, parsedTeam.data.teamId);
    if (team?.format) {
      // Find the current pokemon row within the team
      const currentSlot = team.team_pokemon.find(
        (slot) => slot.pokemon_id === parsed.data.pokemonId
      );
      const currentPokemon = currentSlot?.pokemon;
      // Merge current fields with incoming updates so partial updates
      // (e.g. only changing item) still validate against the species
      const merged = { ...currentPokemon, ...parsedData };
      const violation = findLegalityViolation(merged, team.format);
      if (violation) throw new Error(violation);
    }

    await updatePokemonMutation(
      supabase,
      parsed.data.pokemonId,
      parsedData as Partial<TablesUpdate<"pokemon">>
    );
    invalidateTeamDetailCache(parsedTeam.data.teamId);
  }, "Failed to update pokemon");
}

/**
 * Remove a pokemon from a team.
 * Deletes the team_pokemon join row and the pokemon record itself.
 */
export async function removePokemonFromTeamAction(
  teamId: number,
  pokemonId: number
): Promise<ActionResult<void>> {
  const parsed = removePokemonInputSchema.safeParse({ teamId, pokemonId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await removePokemonFromTeamMutation(
      supabase,
      parsed.data.teamId,
      parsed.data.pokemonId
    );
    invalidateTeamDetailCache(parsed.data.teamId);
  }, "Failed to remove pokemon from team");
}

/**
 * Reorder pokemon positions within a team.
 */
export async function reorderTeamPokemonAction(
  teamId: number,
  positions: { pokemonId: number; position: number }[]
): Promise<ActionResult<void>> {
  const parsed = reorderTeamPokemonInputSchema.safeParse({ teamId, positions });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await reorderTeamPokemonMutation(
      supabase,
      parsed.data.teamId,
      parsed.data.positions
    );
    invalidateTeamDetailCache(parsed.data.teamId);
  }, "Failed to reorder team pokemon");
}
