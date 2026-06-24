/**
 * Team Folder Server Actions
 *
 * Server actions for manual-folder and smart-folder CRUD.
 * Folders are per-user; all mutations resolve the caller's user id via
 * supabase.auth.getUser() and pass it to the underlying mutations as
 * ownerUserId.  RLS on team_folders / smart_folders enforces ownership at
 * the database level as a second layer of defense.
 *
 * Caching note: folders are P-bucket client state.  Invalidation is handled
 * on the client via TanStack Query key invalidation (folderKeys.all) after
 * each action resolves — no server-side updateTag calls are needed here.
 */

"use server";

import {
  createTeamFolder as createTeamFolderMutation,
  renameTeamFolder as renameTeamFolderMutation,
  deleteTeamFolder as deleteTeamFolderMutation,
  addTeamToFolder as addTeamToFolderMutation,
  removeTeamFromFolder as removeTeamFromFolderMutation,
  bulkAddTeamsToFolder as bulkAddTeamsToFolderMutation,
  createSmartFolder as createSmartFolderMutation,
  updateSmartFolder as updateSmartFolderMutation,
  deleteSmartFolder as deleteSmartFolderMutation,
  type Json,
} from "@trainers/supabase";
import {
  type ActionResult,
  positiveIntSchema,
  teamFolderNameSchema,
  createSmartFolderInputSchema,
  updateSmartFolderInputSchema,
  bulkTeamIdsSchema,
} from "@trainers/validators";

import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { rejectBots } from "@/actions/utils";

// =============================================================================
// Helpers
// =============================================================================

/** Validate a folder or team id as a positive integer. */
function parseId(value: number, label: string) {
  const parsed = positiveIntSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? `Invalid ${label}`,
    };
  }
  return { ok: true as const, data: parsed.data };
}

// =============================================================================
// Manual Folder CRUD
// =============================================================================

/**
 * Create a new manual folder owned by the current user.
 * Returns the newly created folder's id.
 */
export async function createTeamFolderAction(
  name: string
): Promise<ActionResult<{ id: number }>> {
  const parsedName = teamFolderNameSchema.safeParse(name);
  if (!parsedName.success) {
    return {
      success: false,
      error: parsedName.error.issues[0]?.message ?? "Invalid folder name",
    };
  }

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const result = await createTeamFolderMutation(
      supabase,
      user.id,
      parsedName.data
    );
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create folder"),
    };
  }
}

/**
 * Rename an existing manual folder.
 * RLS enforces that only the folder owner may update.
 */
export async function renameTeamFolderAction(
  folderId: number,
  name: string
): Promise<ActionResult<void>> {
  const parsedId = parseId(folderId, "folder id");
  if (!parsedId.ok) return { success: false, error: parsedId.error };

  const parsedName = teamFolderNameSchema.safeParse(name);
  if (!parsedName.success) {
    return {
      success: false,
      error: parsedName.error.issues[0]?.message ?? "Invalid folder name",
    };
  }

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to rename folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }
    await renameTeamFolderMutation(supabase, parsedId.data, parsedName.data);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to rename folder"),
    };
  }
}

/**
 * Delete a manual folder.
 * ON DELETE CASCADE automatically removes all team_folder_members rows.
 * RLS enforces that only the folder owner may delete.
 */
export async function deleteTeamFolderAction(
  folderId: number
): Promise<ActionResult<void>> {
  const parsedId = parseId(folderId, "folder id");
  if (!parsedId.ok) return { success: false, error: parsedId.error };

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }
    await deleteTeamFolderMutation(supabase, parsedId.data);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete folder"),
    };
  }
}

// =============================================================================
// Folder Membership Mutations
// =============================================================================

/**
 * Add a single team to a folder.
 * Idempotent — a duplicate (folder_id, team_id) pair is silently ignored.
 * RLS WITH CHECK requires the caller to own both the folder and the team.
 */
export async function addTeamToFolderAction(
  folderId: number,
  teamId: number
): Promise<ActionResult<void>> {
  const parsedFolderId = parseId(folderId, "folder id");
  if (!parsedFolderId.ok) return { success: false, error: parsedFolderId.error };

  const parsedTeamId = parseId(teamId, "team id");
  if (!parsedTeamId.ok) return { success: false, error: parsedTeamId.error };

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add team to folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }
    await addTeamToFolderMutation(supabase, parsedFolderId.data, parsedTeamId.data);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add team to folder"),
    };
  }
}

/**
 * Remove a single team from a folder.
 * RLS enforces that only the folder owner may remove members.
 */
export async function removeTeamFromFolderAction(
  folderId: number,
  teamId: number
): Promise<ActionResult<void>> {
  const parsedFolderId = parseId(folderId, "folder id");
  if (!parsedFolderId.ok) return { success: false, error: parsedFolderId.error };

  const parsedTeamId = parseId(teamId, "team id");
  if (!parsedTeamId.ok) return { success: false, error: parsedTeamId.error };

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove team from folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }
    await removeTeamFromFolderMutation(supabase, parsedFolderId.data, parsedTeamId.data);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove team from folder"),
    };
  }
}

/**
 * Add many teams to one folder in bulk.
 * Chunked at 100 ids to keep PostgREST URI length safe.
 * Idempotent — duplicate (folder_id, team_id) pairs are silently ignored.
 * RLS WITH CHECK rejects any team not owned by the caller.
 */
export async function bulkAddTeamsToFolderAction(
  folderId: number,
  teamIds: number[]
): Promise<ActionResult<void>> {
  const parsedFolderId = parseId(folderId, "folder id");
  if (!parsedFolderId.ok) return { success: false, error: parsedFolderId.error };

  const parsedTeamIds = bulkTeamIdsSchema.safeParse(teamIds);
  if (!parsedTeamIds.success) {
    return {
      success: false,
      error: parsedTeamIds.error.issues[0]?.message ?? "Invalid team ids",
    };
  }

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add teams to folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }
    await bulkAddTeamsToFolderMutation(
      supabase,
      parsedFolderId.data,
      parsedTeamIds.data
    );
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add teams to folder"),
    };
  }
}

// =============================================================================
// Smart Folder CRUD
// =============================================================================

/**
 * Create a new smart folder owned by the current user.
 * The criteria object is validated against smartFolderCriteriaSchema via
 * createSmartFolderInputSchema before being stored.
 * Returns the newly created folder's id.
 */
export async function createSmartFolderAction(
  name: string,
  criteria: unknown
): Promise<ActionResult<{ id: number }>> {
  const parsed = createSmartFolderInputSchema.safeParse({ name, criteria });
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
      error: getErrorMessage(error, "Failed to create smart folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const result = await createSmartFolderMutation(
      supabase,
      user.id,
      parsed.data.name,
      parsed.data.criteria as Json
    );
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create smart folder"),
    };
  }
}

/**
 * Update a smart folder's name and/or criteria.
 * Only the fields provided will be updated.
 * RLS enforces that only the folder owner may update.
 */
export async function updateSmartFolderAction(
  folderId: number,
  data: { name?: string; criteria?: unknown }
): Promise<ActionResult<void>> {
  const parsedId = parseId(folderId, "folder id");
  if (!parsedId.ok) return { success: false, error: parsedId.error };

  const parsedData = updateSmartFolderInputSchema.safeParse(data);
  if (!parsedData.success) {
    return {
      success: false,
      error: parsedData.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update smart folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }
    await updateSmartFolderMutation(supabase, parsedId.data, {
      name: parsedData.data.name,
      criteria: parsedData.data.criteria as Json | undefined,
    });
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update smart folder"),
    };
  }
}

/**
 * Delete a smart folder by id.
 * RLS ensures only the owner can delete their own folders.
 */
export async function deleteSmartFolderAction(
  folderId: number
): Promise<ActionResult<void>> {
  const parsedId = parseId(folderId, "folder id");
  if (!parsedId.ok) return { success: false, error: parsedId.error };

  try {
    await rejectBots();
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete smart folder"),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }
    await deleteSmartFolderMutation(supabase, parsedId.data);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete smart folder"),
    };
  }
}
