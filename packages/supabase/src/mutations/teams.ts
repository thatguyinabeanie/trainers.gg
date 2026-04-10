import type { TypedClient } from "../client";
import type { TablesInsert, TablesUpdate } from "../types";

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
  const { error } = await supabase.from("teams").update(data).eq("id", teamId);

  if (error) throw new Error(`Failed to update team: ${error.message}`);
}

/**
 * Delete a team and all its associated pokemon records.
 * Deletion order: team_pokemon join rows → pokemon records → team row.
 */
export async function deleteTeam(
  supabase: TypedClient,
  teamId: number
): Promise<void> {
  // Step 1: Fetch team_pokemon join rows so we know which pokemon to delete
  const { data: joinRows, error: joinFetchError } = await supabase
    .from("team_pokemon")
    .select("id, pokemon_id")
    .eq("team_id", teamId);

  if (joinFetchError)
    throw new Error(
      `Failed to fetch team pokemon for deletion: ${joinFetchError.message}`
    );

  const pokemonIds = (joinRows ?? []).map((r) => r.pokemon_id);

  // Step 2: Delete team_pokemon join rows
  if (joinRows && joinRows.length > 0) {
    const { error: joinDeleteError } = await supabase
      .from("team_pokemon")
      .delete()
      .eq("team_id", teamId);

    if (joinDeleteError)
      throw new Error(
        `Failed to delete team_pokemon rows: ${joinDeleteError.message}`
      );
  }

  // Step 3: Delete the pokemon records
  if (pokemonIds.length > 0) {
    const { error: pokemonDeleteError } = await supabase
      .from("pokemon")
      .delete()
      .in("id", pokemonIds);

    if (pokemonDeleteError)
      throw new Error(
        `Failed to delete pokemon records: ${pokemonDeleteError.message}`
      );
  }

  // Step 4: Delete the team itself
  const { error: teamDeleteError } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (teamDeleteError)
    throw new Error(`Failed to delete team: ${teamDeleteError.message}`);
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
 * Inserts a new pokemon record then creates the team_pokemon join row.
 * Returns the new pokemon's id.
 */
export async function addPokemonToTeam(
  supabase: TypedClient,
  teamId: number,
  pokemon: TablesInsert<"pokemon">,
  position: number
): Promise<{ pokemonId: number }> {
  // Insert the pokemon record
  const { data: newPokemon, error: pokemonError } = await supabase
    .from("pokemon")
    .insert(pokemon)
    .select("id")
    .single();

  if (pokemonError)
    throw new Error(`Failed to insert pokemon: ${pokemonError.message}`);

  // Create the team_pokemon join row
  const { error: joinError } = await supabase.from("team_pokemon").insert({
    team_id: teamId,
    pokemon_id: newPokemon.id,
    team_position: position,
  });

  if (joinError) {
    // Clean up the orphaned pokemon record — log if cleanup also fails
    const { error: cleanupError } = await supabase
      .from("pokemon")
      .delete()
      .eq("id", newPokemon.id);
    if (cleanupError) {
      console.error(
        `Orphan cleanup failed for pokemon ${newPokemon.id}: ${cleanupError.message}`
      );
    }
    throw new Error(`Failed to link pokemon to team: ${joinError.message}`);
  }

  return { pokemonId: newPokemon.id };
}

/**
 * Update a pokemon's data — moves, EVs, IVs, ability, item, etc.
 * Only the fields provided in `data` will be updated.
 */
export async function updatePokemon(
  supabase: TypedClient,
  pokemonId: number,
  data: Partial<TablesUpdate<"pokemon">>
): Promise<void> {
  const { error } = await supabase
    .from("pokemon")
    .update(data)
    .eq("id", pokemonId);

  if (error) throw new Error(`Failed to update pokemon: ${error.message}`);
}

/**
 * Remove a pokemon from a team.
 * Deletes the team_pokemon join row and then the pokemon record itself.
 */
export async function removePokemonFromTeam(
  supabase: TypedClient,
  teamId: number,
  pokemonId: number
): Promise<void> {
  // Step 1: Delete the team_pokemon join row
  const { error: joinError } = await supabase
    .from("team_pokemon")
    .delete()
    .eq("team_id", teamId)
    .eq("pokemon_id", pokemonId);

  if (joinError)
    throw new Error(
      `Failed to remove team_pokemon join row: ${joinError.message}`
    );

  // Step 2: Delete the pokemon record
  const { error: pokemonError } = await supabase
    .from("pokemon")
    .delete()
    .eq("id", pokemonId);

  if (pokemonError)
    throw new Error(`Failed to delete pokemon record: ${pokemonError.message}`);
}

/**
 * Reorder pokemon positions within a team.
 * Updates each team_pokemon row's position in parallel.
 */
export async function reorderTeamPokemon(
  supabase: TypedClient,
  teamId: number,
  positions: { pokemonId: number; position: number }[]
): Promise<void> {
  await Promise.all(
    positions.map(async ({ pokemonId, position }) => {
      const { error } = await supabase
        .from("team_pokemon")
        .update({ team_position: position })
        .eq("team_id", teamId)
        .eq("pokemon_id", pokemonId);

      if (error)
        throw new Error(
          `Failed to reorder pokemon ${pokemonId}: ${error.message}`
        );
    })
  );
}
