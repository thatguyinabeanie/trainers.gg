import type { TypedClient } from "../client";
import type { Json, TablesInsert, TablesUpdate } from "../types";

// =============================================================================
// Team CRUD
// =============================================================================

/**
 * Create a new empty team for an alt.
 * Returns the newly created team's id.
 */
export async function createTeam(
  supabase: TypedClient,
  altId: number,
  name: string,
  format: string
): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      created_by: altId,
      name,
      format,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create team: ${error.message}`);
  return { id: data.id };
}

/**
 * Update team metadata such as name, notes, format, or is_public.
 * Only the fields provided in `data` will be updated.
 */
export async function updateTeam(
  supabase: TypedClient,
  teamId: number,
  data: Partial<TablesUpdate<"teams">>
): Promise<void> {
  const { data: updatedTeams, error } = await supabase
    .from("teams")
    .update(data)
    .eq("id", teamId)
    .select("id");

  if (error) throw new Error(`Failed to update team: ${error.message}`);
  if (!updatedTeams || updatedTeams.length === 0) {
    throw new Error("Failed to update team: Team not found or not authorized");
  }
}

/**
 * Delete a team and all its associated pokemon records.
 * Delegates to the `delete_team` RPC for transactional atomicity.
 */
export async function deleteTeam(
  supabase: TypedClient,
  teamId: number
): Promise<void> {
  const { error } = await supabase.rpc("delete_team", {
    p_team_id: teamId,
  });
  if (error) throw new Error(`Failed to delete team: ${error.message}`);
}

/**
 * Fork a team — creates a full copy of the source team and all its pokemon,
 * setting parent_team_id to the source team's id.
 * Uses the `fork_team` RPC for transactional atomicity — if any step fails,
 * the entire operation rolls back with no partial copies.
 * Returns the new team's id.
 */
export async function forkTeam(
  supabase: TypedClient,
  sourceTeamId: number,
  targetAltId: number,
  newName?: string
): Promise<{ id: number }> {
  const { data, error } = await supabase.rpc("fork_team", {
    p_source_team_id: sourceTeamId,
    p_target_alt_id: targetAltId,
    p_new_name: newName,
  });

  if (error) throw new Error(`Failed to fork team: ${error.message}`);
  if (data == null) throw new Error("Fork returned no team ID");

  return { id: data as number };
}

// =============================================================================
// Pokemon CRUD
// =============================================================================

/**
 * Add a pokemon to a team at the given position.
 * Delegates to the `add_pokemon_to_team` RPC for transactional atomicity —
 * if any step fails, the entire operation rolls back with no orphaned records.
 * Returns the new pokemon's id.
 */
export async function addPokemonToTeam(
  supabase: TypedClient,
  teamId: number,
  pokemon: TablesInsert<"pokemon">,
  position: number
): Promise<{ pokemonId: number }> {
  const { data, error } = await supabase.rpc("add_pokemon_to_team", {
    p_team_id: teamId,
    p_pokemon: pokemon as unknown as Json,
    p_position: position,
  });

  if (error) throw new Error(`Failed to add pokemon to team: ${error.message}`);
  if (data == null)
    throw new Error("add_pokemon_to_team returned no pokemon ID");

  return { pokemonId: data as number };
}

/**
 * Update a pokemon's data — moves, EVs, IVs, ability, item, etc.
 * Only the fields provided in `data` will be updated.
 * Throws if no row was affected (pokemon not found or RLS denied).
 */
export async function updatePokemon(
  supabase: TypedClient,
  pokemonId: number,
  data: Partial<TablesUpdate<"pokemon">>
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("pokemon")
    .update(data)
    .eq("id", pokemonId)
    .select("id");

  if (error) throw new Error(`Failed to update pokemon: ${error.message}`);
  if (!rows || rows.length === 0)
    throw new Error("Pokemon not found or not authorized");
}

/**
 * Remove a pokemon from a team.
 * Delegates to the `remove_pokemon_from_team` RPC for transactional atomicity —
 * both the team_pokemon join row and the pokemon record are deleted atomically.
 */
export async function removePokemonFromTeam(
  supabase: TypedClient,
  teamId: number,
  pokemonId: number
): Promise<void> {
  const { error } = await supabase.rpc("remove_pokemon_from_team", {
    p_team_id: teamId,
    p_pokemon_id: pokemonId,
  });

  if (error)
    throw new Error(`Failed to remove pokemon from team: ${error.message}`);
}

/**
 * Reorder pokemon positions within a team.
 * Delegates to the `reorder_team_pokemon` RPC for transactional atomicity.
 */
export async function reorderTeamPokemon(
  supabase: TypedClient,
  teamId: number,
  positions: { pokemonId: number; position: number }[]
): Promise<void> {
  const { error } = await supabase.rpc("reorder_team_pokemon", {
    p_team_id: teamId,
    p_positions: positions.map(({ pokemonId, position }) => ({
      pokemon_id: pokemonId,
      position,
    })),
  });
  if (error)
    throw new Error(`Failed to reorder team pokemon: ${error.message}`);
}
