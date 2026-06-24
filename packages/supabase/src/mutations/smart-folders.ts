import type { TypedClient } from "../client";
import type { Json, TablesUpdate } from "../types";

// =============================================================================
// Smart Folder CRUD
// =============================================================================

/**
 * Create a custom smart folder.
 * `is_seeded` defaults to false (DB default).
 * Returns the new folder's id.
 */
export async function createSmartFolder(
  supabase: TypedClient,
  ownerUserId: string,
  name: string,
  criteria: Json
): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from("smart_folders")
    .insert({ owner_user_id: ownerUserId, name, criteria })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create smart folder: ${error.message}`);
  return { id: data.id };
}

/**
 * Update a smart folder's name and/or criteria.
 * Only the fields provided in `data` will be updated.
 * Throws if the folder is not found or RLS denies access.
 */
export async function updateSmartFolder(
  supabase: TypedClient,
  folderId: number,
  data: Pick<TablesUpdate<"smart_folders">, "name" | "criteria">
): Promise<void> {
  const { error } = await supabase
    .from("smart_folders")
    .update(data)
    .eq("id", folderId);

  if (error) throw new Error(`Failed to update smart folder: ${error.message}`);
}

/**
 * Delete a smart folder by id.
 * RLS ensures only the owner can delete their own folders.
 */
export async function deleteSmartFolder(
  supabase: TypedClient,
  folderId: number
): Promise<void> {
  const { error } = await supabase
    .from("smart_folders")
    .delete()
    .eq("id", folderId);

  if (error) throw new Error(`Failed to delete smart folder: ${error.message}`);
}
