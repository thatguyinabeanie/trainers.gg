import { type TeamUpdateData } from "@trainers/validators";

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
 * Update team metadata.
 * Only the fields provided in `data` will be updated.
 * Accepts a `TeamUpdateData` payload — a subset of allowed columns:
 * `name`, `format`, `description`, `notes`, `tags`, `is_public`.
 */
export async function updateTeam(
  supabase: TypedClient,
  teamId: number,
  data: TeamUpdateData
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
 *
 * `teamId` is required as a defense-in-depth guard: before updating, we
 * verify that `pokemonId` is linked to `teamId` via a `team_pokemon` row.
 * This explicit cross-team binding check prevents updates across teams
 * even for publicly readable teams. RLS still enforces ownership independently.
 *
 * Throws if the pokemon is not on this team, not found, or RLS denied.
 */
export async function updatePokemon(
  supabase: TypedClient,
  teamId: number,
  pokemonId: number,
  data: Partial<TablesUpdate<"pokemon">>
): Promise<void> {
  // Verify the pokemonId belongs to teamId at the database level.
  // This closes the cross-team binding gap for publicly readable teams:
  // even if an attacker supplies a pokemonId from a different team, the
  // binding check here will fail before the UPDATE runs.
  const { data: binding, error: bindingError } = await supabase
    .from("team_pokemon")
    .select("pokemon_id")
    .eq("team_id", teamId)
    .eq("pokemon_id", pokemonId)
    .maybeSingle();

  if (bindingError)
    throw new Error(
      `Failed to verify pokemon on team: ${bindingError.message}`
    );
  if (!binding)
    throw new Error("Pokemon not found on this team or not authorized");

  const { data: rows, error } = await supabase
    .from("pokemon")
    .update(data)
    .eq("id", pokemonId)
    .select("id");

  if (error) throw new Error(`Failed to update pokemon: ${error.message}`);
  if (!rows || rows.length === 0)
    throw new Error("Pokemon not found on this team or not authorized");
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

// =============================================================================
// Team landing flags & bulk operations
// =============================================================================

/**
 * Toggle any subset of per-team landing flags.
 * Accepts `pinned`, `archived`, and/or `sort_order` — only the provided
 * fields are updated. RLS enforces ownership server-side.
 */
export async function updateTeamFlags(
  supabase: TypedClient,
  teamId: number,
  flags: Pick<TablesUpdate<"teams">, "pinned" | "archived" | "sort_order">
): Promise<void> {
  const { data, error } = await supabase
    .from("teams")
    .update(flags)
    .eq("id", teamId)
    .select("id");
  if (error) throw new Error(`Failed to update team flags: ${error.message}`);
  if (!data || data.length === 0)
    throw new Error("Team not found or not authorized");
}

/**
 * Persist a custom-order sequence for the caller's teams in one round-trip
 * via the `reorder_teams` RPC. Ownership is enforced server-side — rows for
 * teams not owned by the caller are silently skipped by the RPC.
 *
 * Mirrors the snake_case positional mapping used by `reorderTeamPokemon`.
 */
export async function reorderTeams(
  supabase: TypedClient,
  orders: { teamId: number; sortOrder: number }[]
): Promise<void> {
  const { error } = await supabase.rpc("reorder_teams", {
    p_orders: orders.map((o) => ({
      team_id: o.teamId,
      sort_order: o.sortOrder,
    })),
  });
  if (error) throw new Error(`Failed to reorder teams: ${error.message}`);
}

/** Split an array into fixed-size chunks (the last chunk may be smaller). */
function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/** Maximum number of IDs per `.in()` call — keeps URIs within safe limits. */
const BULK_CHUNK_SIZE = 100;

/**
 * Archive or unarchive many owned teams atomically.
 * Processes IDs in batches of 100 to keep PostgREST URIs within safe limits.
 * RLS silently filters updates to rows not owned by the caller — no error is
 * thrown for unowned IDs.
 */
export async function bulkSetArchived(
  supabase: TypedClient,
  teamIds: number[],
  archived: boolean
): Promise<void> {
  for (const chunk of chunkArray(teamIds, BULK_CHUNK_SIZE)) {
    const { error } = await supabase
      .from("teams")
      .update({ archived })
      .in("id", chunk);
    if (error)
      throw new Error(`Failed to bulk set archived on teams: ${error.message}`);
  }
}

/**
 * Permanently delete many owned teams and their pokemon records.
 * Loops the atomic `delete_team` RPC per ID so each deletion is transactional.
 * If one or more deletions fail, the successes are NOT rolled back — the full
 * error list is collected and thrown as a single aggregated error.
 */
export async function bulkDeleteTeams(
  supabase: TypedClient,
  teamIds: number[]
): Promise<void> {
  const results = await Promise.allSettled(
    teamIds.map((id) => deleteTeam(supabase, id))
  );

  const failures: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      failures.push(
        result.reason instanceof Error
          ? result.reason.message
          : `Unknown error for team ${teamIds[i] ?? i}`
      );
    }
  });

  if (failures.length > 0) {
    // Log per-team detail server-side only — do not surface Postgres detail
    // or internal IDs to the caller.
    console.error(
      `bulkDeleteTeams: ${failures.length} of ${teamIds.length} deletion(s) failed`,
      failures
    );
    throw new Error(
      `Failed to delete ${failures.length} of ${teamIds.length} team(s).`
    );
  }
}
