import type { TypedClient } from "../client";
import type { TablesInsert } from "../types";

// =============================================================================
// Helpers
// =============================================================================

/** Max ids per PostgREST `.in()` upsert batch — keeps URI length safe. */
const CHUNK_SIZE = 100;

/** Split an array into fixed-size chunks (last chunk may be smaller). */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// =============================================================================
// Folder CRUD
// =============================================================================

/**
 * Create a manual folder owned by ownerUserId.
 * Returns the new folder's id.
 */
export async function createTeamFolder(
  supabase: TypedClient,
  ownerUserId: string,
  name: string
): Promise<{ id: number }> {
  const insert: TablesInsert<"team_folders"> = {
    owner_user_id: ownerUserId,
    name,
  };

  const { data, error } = await supabase
    .from("team_folders")
    .insert(insert)
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create team folder: ${error.message}`);
  return { id: data.id };
}

/**
 * Rename a folder.
 * RLS enforces that only the folder owner may update.
 */
export async function renameTeamFolder(
  supabase: TypedClient,
  folderId: number,
  name: string
): Promise<void> {
  const { data, error } = await supabase
    .from("team_folders")
    .update({ name })
    .eq("id", folderId)
    .select("id");

  if (error) throw new Error(`Failed to rename team folder: ${error.message}`);
  if (!data || data.length === 0)
    throw new Error("Folder not found or not authorized");
}

/**
 * Delete a folder.
 * ON DELETE CASCADE automatically removes all team_folder_members rows.
 * RLS enforces that only the folder owner may delete.
 */
export async function deleteTeamFolder(
  supabase: TypedClient,
  folderId: number
): Promise<void> {
  const { error } = await supabase
    .from("team_folders")
    .delete()
    .eq("id", folderId);

  if (error) throw new Error(`Failed to delete team folder: ${error.message}`);
}

// =============================================================================
// Membership mutations
// =============================================================================

/**
 * Add a single team to a folder.
 * Idempotent — a duplicate (folder_id, team_id) pair is silently ignored.
 * RLS WITH CHECK requires the caller to own both the folder and the team.
 */
export async function addTeamToFolder(
  supabase: TypedClient,
  folderId: number,
  teamId: number
): Promise<void> {
  const insert: TablesInsert<"team_folder_members"> = {
    folder_id: folderId,
    team_id: teamId,
  };

  const { error } = await supabase
    .from("team_folder_members")
    .upsert(insert, {
      onConflict: "folder_id,team_id",
      ignoreDuplicates: true,
    });

  if (error) throw new Error(`Failed to add team to folder: ${error.message}`);
}

/**
 * Remove a single team from a folder.
 * RLS enforces that only the folder owner may remove members.
 */
export async function removeTeamFromFolder(
  supabase: TypedClient,
  folderId: number,
  teamId: number
): Promise<void> {
  const { error } = await supabase
    .from("team_folder_members")
    .delete()
    .eq("folder_id", folderId)
    .eq("team_id", teamId);

  if (error)
    throw new Error(`Failed to remove team from folder: ${error.message}`);
}

/**
 * Add many teams to one folder in one round-trip per chunk.
 * Chunked at 100 ids to keep PostgREST URI length safe.
 * Idempotent — duplicate (folder_id, team_id) pairs are silently ignored.
 * RLS WITH CHECK rejects any team not owned by the caller.
 */
export async function bulkAddTeamsToFolder(
  supabase: TypedClient,
  folderId: number,
  teamIds: number[]
): Promise<void> {
  if (teamIds.length === 0) return;

  for (const idChunk of chunk(teamIds, CHUNK_SIZE)) {
    const rows: TablesInsert<"team_folder_members">[] = idChunk.map(
      (team_id) => ({ folder_id: folderId, team_id })
    );

    const { error } = await supabase
      .from("team_folder_members")
      .upsert(rows, {
        onConflict: "folder_id,team_id",
        ignoreDuplicates: true,
      });

    if (error)
      throw new Error(`Failed to bulk-add teams to folder: ${error.message}`);
  }
}
