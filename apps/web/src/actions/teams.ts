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
  type TablesInsert,
  type TablesUpdate,
} from "@trainers/supabase";
import {
  type ActionResult,
  createTeamInputSchema,
  updateTeamInputSchema,
  deleteTeamInputSchema,
  forkTeamInputSchema,
  addPokemonInputSchema,
  updatePokemonInputSchema,
  removePokemonInputSchema,
  reorderTeamPokemonInputSchema,
} from "@trainers/validators";

import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { rejectBots, withAction } from "@/actions/utils";

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
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create team"),
    };
  }
}

/**
 * Update team metadata such as name, notes, format, or is_public.
 * Only the fields provided will be updated.
 */
export async function updateTeamAction(
  teamId: number,
  data: Partial<TablesUpdate<"teams">>
): Promise<ActionResult<void>> {
  const parsed = updateTeamInputSchema.safeParse({ teamId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await updateTeamMutation(supabase, parsed.data.teamId, data);
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
    return { success: true, data: { id: result.id } };
  } catch (error) {
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
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await addPokemonToTeamMutation(
      supabase,
      parsed.data.teamId,
      pokemon,
      parsed.data.position
    );
    return { success: true, data: { pokemonId: result.pokemonId } };
  } catch (error) {
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
  pokemonId: number,
  data: Partial<TablesUpdate<"pokemon">>
): Promise<ActionResult<void>> {
  const parsed = updatePokemonInputSchema.safeParse({ pokemonId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await updatePokemonMutation(supabase, parsed.data.pokemonId, data);
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
  }, "Failed to reorder team pokemon");
}
