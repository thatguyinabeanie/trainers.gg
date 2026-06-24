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
  updateTeamFlags as updateTeamFlagsMutation,
  reorderTeams as reorderTeamsMutation,
  bulkSetArchived as bulkSetArchivedMutation,
  bulkDeleteTeams as bulkDeleteTeamsMutation,
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
  transferTeamInputSchema,
  addPokemonInputSchema,
  updatePokemonInputSchema,
  removePokemonInputSchema,
  reorderTeamPokemonInputSchema,
  pokemonPayloadSchema,
  pokemonUpdateSchema,
  teamFlagsSchema,
  reorderTeamsInputSchema,
  bulkTeamIdsSchema,
} from "@trainers/validators";

import { getErrorMessage } from "@trainers/utils";

import { invalidateTeamDetailCache } from "@/lib/cache-invalidation";
import { createClient } from "@/lib/supabase/server";
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
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create team"),
    };
  }

  const supabase = await createClient();

  // ---------------------------------------------------------------------------
  // Defense-in-depth: verify the caller owns this alt before inserting.
  // RLS on `teams` blocks the INSERT if altId isn't owned by the caller,
  // but that surfaces a raw Postgres error. We return a clean 403-style
  // message here so callers get a meaningful response.
  // ---------------------------------------------------------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ownedAlt, error: ownedAltError } = await supabase
    .from("alts")
    .select("id")
    .eq("id", parsed.data.altId)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  if (ownedAltError) {
    return {
      success: false,
      error: getErrorMessage(ownedAltError, "Failed to verify alt ownership"),
    };
  }
  if (!ownedAlt) {
    return { success: false, error: "You do not own this alt." };
  }

  return withAction(async () => {
    const result = await createTeamMutation(
      supabase,
      parsed.data.altId,
      parsed.data.name,
      parsed.data.format
    );
    invalidateTeamDetailCache(result.id);
    return { id: result.id };
  }, "Failed to create team");
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

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update team"),
    };
  }
  const supabase = await createClient();

  // ---------------------------------------------------------------------------
  // Format-change legality guard — runs before withAction so violation
  // messages aren't sanitized in production
  // ---------------------------------------------------------------------------
  if (parsedData.data.format !== undefined) {
    const team = await getTeamWithPokemon(supabase, parsed.data.teamId);
    if (team === null) {
      return {
        success: false,
        error: "Team not found. It may have been deleted.",
      };
    }
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

  return withAction(async () => {
    // Only the actual mutation remains inside withAction
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
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    const result = await forkTeamMutation(
      supabase,
      parsed.data.sourceTeamId,
      parsed.data.targetAltId,
      parsed.data.newName
    );
    invalidateTeamDetailCache(result.id);
    return { id: result.id };
  }, "Failed to fork team");
}

/**
 * Transfer a team to a different alt owned by the same user.
 * Verifies the caller owns both the team's current alt and the target alt.
 */
export async function transferTeamAction(
  teamId: number,
  targetAltId: number
): Promise<ActionResult<void>> {
  const parsed = transferTeamInputSchema.safeParse({ teamId, targetAltId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to transfer team"),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  // Verify the target alt belongs to this user
  const { data: targetAlt, error: targetAltError } = await supabase
    .from("alts")
    .select("id")
    .eq("id", parsed.data.targetAltId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (targetAltError) {
    return {
      success: false,
      error: getErrorMessage(targetAltError, "Failed to verify alt ownership"),
    };
  }
  if (!targetAlt) {
    return { success: false, error: "Target alt not found or not owned by you." };
  }

  return withAction(async () => {
    const { data, error } = await supabase
      .from("teams")
      .update({ created_by: parsed.data.targetAltId })
      .eq("id", parsed.data.teamId)
      .select("id")
      .single();
    if (error || !data)
      throw new Error("Failed to transfer team — team not found or access denied.");
    invalidateTeamDetailCache(parsed.data.teamId);
  }, "Failed to transfer team");
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
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add pokemon to team"),
    };
  }
  const supabase = await createClient();

  // ---------------------------------------------------------------------------
  // Legality guard — runs before withAction so violation messages aren't
  // sanitized in production
  // ---------------------------------------------------------------------------
  const team = await getTeamWithPokemon(supabase, parsed.data.teamId);
  if (team === null) {
    return {
      success: false,
      error: "Team not found. It may have been deleted.",
    };
  }
  if (team.format) {
    const violation = findLegalityViolation(parsedPokemon.data, team.format);
    if (violation) return { success: false, error: violation };
  }

  return withAction(async () => {
    // Only the actual mutation remains inside withAction
    const result = await addPokemonToTeamMutation(
      supabase,
      parsed.data.teamId,
      parsedPokemon.data as TablesInsert<"pokemon">,
      parsed.data.position
    );
    invalidateTeamDetailCache(parsed.data.teamId);
    return { pokemonId: result.pokemonId };
  }, "Failed to add pokemon to team");
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

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update pokemon"),
    };
  }
  const parsedData = pokemonUpdateSchema.safeParse(data);
  if (!parsedData.success) {
    return {
      success: false,
      error: parsedData.error.issues[0]?.message ?? "Invalid pokemon data",
    };
  }
  const supabase = await createClient();

  // ---------------------------------------------------------------------------
  // Legality guard — runs before withAction so violation messages aren't
  // sanitized in production
  // ---------------------------------------------------------------------------
  const team = await getTeamWithPokemon(supabase, parsedTeam.data.teamId);
  if (team === null) {
    return {
      success: false,
      error: "Team not found. It may have been deleted.",
    };
  }
  if (team.format) {
    // Find the current pokemon row within the team
    const currentSlot = team.team_pokemon.find(
      (slot) => slot.pokemon_id === parsed.data.pokemonId
    );
    const currentPokemon = currentSlot?.pokemon;
    if (!currentPokemon) {
      return { success: false, error: "Pokemon not found on this team." };
    }
    // Merge current fields with incoming updates so partial updates
    // (e.g. only changing item) still validate against the species
    const merged = { ...currentPokemon, ...parsedData.data };
    const violation = findLegalityViolation(merged, team.format);
    if (violation) return { success: false, error: violation };
  }

  return withAction(async () => {
    // Only the actual mutation remains inside withAction.
    // teamId is passed so updatePokemonMutation can verify the binding
    // at the SQL level (team_pokemon join), not just in memory.
    await updatePokemonMutation(
      supabase,
      parsedTeam.data.teamId,
      parsed.data.pokemonId,
      parsedData.data as Partial<TablesUpdate<"pokemon">>
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

// =============================================================================
// Team landing flags & bulk ops
// =============================================================================

/**
 * Set pin/archive/sort-order flags on a single team.
 * Maps camelCase `sortOrder` to snake_case `sort_order` for the mutation.
 */
export async function setTeamFlagsAction(
  teamId: number,
  flags: { pinned?: boolean; archived?: boolean; sortOrder?: number | null }
): Promise<ActionResult<void>> {
  const parsedId = updateTeamInputSchema.safeParse({ teamId });
  if (!parsedId.success) {
    return {
      success: false,
      error: parsedId.error.issues[0]?.message ?? "Invalid team id",
    };
  }
  const parsedFlags = teamFlagsSchema.safeParse(flags);
  if (!parsedFlags.success) {
    return {
      success: false,
      error: parsedFlags.error.issues[0]?.message ?? "Invalid flags",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    const { pinned, archived, sortOrder } = parsedFlags.data;
    await updateTeamFlagsMutation(supabase, parsedId.data.teamId, {
      ...(pinned !== undefined && { pinned }),
      ...(archived !== undefined && { archived }),
      ...(sortOrder !== undefined && { sort_order: sortOrder }),
    });
    invalidateTeamDetailCache(parsedId.data.teamId);
  }, "Failed to update team flags");
}

/**
 * Persist a new sort order for multiple teams in one call.
 * Delegates ownership enforcement to the `reorder_teams` RPC.
 */
export async function reorderTeamsAction(
  orders: { teamId: number; sortOrder: number }[]
): Promise<ActionResult<void>> {
  const parsed = reorderTeamsInputSchema.safeParse(orders);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await reorderTeamsMutation(supabase, parsed.data);
    for (const { teamId } of parsed.data) {
      invalidateTeamDetailCache(teamId);
    }
  }, "Failed to reorder teams");
}

/**
 * Archive or unarchive a batch of teams.
 */
export async function bulkArchiveTeamsAction(
  teamIds: number[],
  archived: boolean
): Promise<ActionResult<void>> {
  const parsedIds = bulkTeamIdsSchema.safeParse(teamIds);
  if (!parsedIds.success) {
    return {
      success: false,
      error: parsedIds.error.issues[0]?.message ?? "Invalid team ids",
    };
  }
  if (typeof archived !== "boolean") {
    return { success: false, error: "archived must be a boolean" };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await bulkSetArchivedMutation(supabase, parsedIds.data, archived);
    for (const id of parsedIds.data) {
      invalidateTeamDetailCache(id);
    }
  }, "Failed to bulk archive teams");
}

/**
 * Permanently delete multiple teams and their pokemon records.
 * Each deletion is transactional; partial failures are surfaced as an
 * aggregated error from the mutation layer.
 */
export async function bulkDeleteTeamsAction(
  teamIds: number[]
): Promise<ActionResult<void>> {
  const parsedIds = bulkTeamIdsSchema.safeParse(teamIds);
  if (!parsedIds.success) {
    return {
      success: false,
      error: parsedIds.error.issues[0]?.message ?? "Invalid team ids",
    };
  }
  return withAction(async () => {
    await rejectBots();
    const supabase = await createClient();
    await bulkDeleteTeamsMutation(supabase, parsedIds.data);
    for (const id of parsedIds.data) {
      invalidateTeamDetailCache(id);
    }
  }, "Failed to bulk delete teams");
}
