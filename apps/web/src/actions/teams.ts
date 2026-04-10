/**
 * Team Builder Server Actions
 *
 * Server actions for team and pokemon mutations with cache revalidation.
 * Wraps @trainers/supabase mutations for creating, updating, deleting,
 * forking teams, and managing pokemon within teams.
 */

"use server";

import { updateTag } from "next/cache";

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
import { type ActionResult } from "@trainers/validators";

import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { rejectBots, withAction } from "@/actions/utils";

// =============================================================================
// Cache Tag Helpers
// =============================================================================

/** Cache tag for all teams belonging to an alt. */
function teamsCacheTag(altId: number) {
  return `teams-alt-${altId}`;
}

/** Cache tag for a specific team and its pokemon. */
function teamCacheTag(teamId: number) {
  return `team-${teamId}`;
}

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
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await createTeamMutation(supabase, altId, name, format);
    updateTag(teamsCacheTag(altId));
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
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await updateTeamMutation(supabase, teamId, data);
    updateTag(teamCacheTag(teamId));
  }, "Failed to update team");
}

/**
 * Delete a team and all its associated pokemon records.
 */
export async function deleteTeamAction(
  teamId: number
): Promise<ActionResult<void>> {
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await deleteTeamMutation(supabase, teamId);
    updateTag(teamCacheTag(teamId));
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
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await forkTeamMutation(
      supabase,
      sourceTeamId,
      targetAltId,
      newName
    );
    updateTag(teamsCacheTag(targetAltId));
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
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await addPokemonToTeamMutation(
      supabase,
      teamId,
      pokemon,
      position
    );
    updateTag(teamCacheTag(teamId));
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
 * Accepts optional teamId for cache invalidation.
 */
export async function updatePokemonAction(
  pokemonId: number,
  data: Partial<TablesUpdate<"pokemon">>,
  teamId?: number
): Promise<ActionResult<void>> {
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await updatePokemonMutation(supabase, pokemonId, data);
    if (teamId) updateTag(teamCacheTag(teamId));
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
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await removePokemonFromTeamMutation(supabase, teamId, pokemonId);
    updateTag(teamCacheTag(teamId));
  }, "Failed to remove pokemon from team");
}

/**
 * Reorder pokemon positions within a team.
 */
export async function reorderTeamPokemonAction(
  teamId: number,
  positions: { pokemonId: number; position: number }[]
): Promise<ActionResult<void>> {
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await reorderTeamPokemonMutation(supabase, teamId, positions);
    updateTag(teamCacheTag(teamId));
  }, "Failed to reorder team pokemon");
}
