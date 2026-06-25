import type { TypedClient } from "../client";
import type { Tables } from "../types";

// =============================================================================
// Types
// =============================================================================

/** Manual folder owned by a user. */
export type TeamFolder = Tables<"team_folders">;

/** Smart folder owned by a user — seeded (system-created) or custom (user-created). */
export type SmartFolder = Tables<"smart_folders">;

/**
 * Lightweight folder-membership shape for rail counts and folder-membership
 * lookups. Omits `id` and `created_at` — callers only need the join keys.
 */
export type TeamFolderMembership = Pick<
  Tables<"team_folder_members">,
  "folder_id" | "team_id"
>;

// =============================================================================
// Manual Folder Queries
// =============================================================================

/**
 * Get all manual folders owned by the current user.
 * RLS scopes the result to `auth.uid()` — no explicit owner filter needed.
 * Ordered by `created_at` ascending (oldest first) for stable rail order.
 */
export async function getTeamFoldersForUser(
  supabase: TypedClient
): Promise<TeamFolder[]> {
  const { data, error } = await supabase
    .from("team_folders")
    .select("id, owner_user_id, name, created_at")
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Failed to fetch team folders: ${error.message}`);
  return data ?? [];
}

// =============================================================================
// Smart Folder Queries
// =============================================================================

/**
 * Get all smart folders owned by the current user (seeded + custom).
 * RLS scopes the result to `auth.uid()` — no explicit owner filter needed.
 * Ordered by `created_at` ascending so seeded folders (inserted first) appear
 * before user-created ones.
 */
export async function getSmartFoldersForUser(
  supabase: TypedClient
): Promise<SmartFolder[]> {
  const { data, error } = await supabase
    .from("smart_folders")
    .select("id, owner_user_id, name, criteria, is_seeded, created_at")
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Failed to fetch smart folders: ${error.message}`);
  return data ?? [];
}

// =============================================================================
// Folder Membership Queries
// =============================================================================

/**
 * Get all folder-membership rows for the current user's folders.
 * RLS scopes the result to folders owned by `auth.uid()`.
 * Used for computing per-folder team counts and building team→folder
 * membership sets without a separate round-trip per folder.
 */
export async function getFolderMembershipsForUser(
  supabase: TypedClient
): Promise<TeamFolderMembership[]> {
  const { data, error } = await supabase
    .from("team_folder_members")
    .select("folder_id, team_id");

  if (error)
    throw new Error(
      `Failed to fetch folder memberships: ${error.message}`
    );
  return data ?? [];
}
