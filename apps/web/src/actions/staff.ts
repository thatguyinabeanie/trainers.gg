/**
 * Staff Management Server Actions
 *
 * Server actions for managing organization staff with cache revalidation.
 * These wrap the @trainers/supabase mutations and queries.
 */

"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
  searchUsersForInvite as searchUsersQuery,
  listCommunityGroups as listGroupsQuery,
  addStaffMember as addStaffMemberMutation,
  addStaffToGroup as addStaffToGroupMutation,
  changeStaffRole as changeRoleMutation,
  removeStaffFromGroup as removeStaffFromGroupMutation,
  removeStaffCompletely as removeStaffMutation,
} from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// Staff Search
// =============================================================================

/**
 * Search users to invite as staff
 * Returns users matching the search term who are NOT already staff or owner
 */
export async function searchUsersForStaffInvite(
  communityId: number,
  searchTerm: string
): Promise<
  ActionResult<
    {
      id: string;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      image: string | null;
    }[]
  >
> {
  try {
    const supabase = await createClient();
    const users = await searchUsersQuery(supabase, communityId, searchTerm);

    return { success: true, data: users };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to search users"),
    };
  }
}

// =============================================================================
// Staff Management
// =============================================================================

/**
 * Add a user to an organization as staff (unassigned to any group)
 * The user will appear in the "Unassigned" section until moved to a group
 * Revalidates: organization page
 */
export async function inviteStaffMember(
  communityId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await addStaffMemberMutation(supabase, communityId, userId);

    // Revalidate organization page to show new staff member
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add staff member"),
    };
  }
}

/**
 * Add a user to an organization as staff with a specific group
 * Revalidates: organization page
 */
export async function inviteStaffToGroup(
  communityId: number,
  userId: string,
  groupId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await addStaffToGroupMutation(supabase, communityId, userId, groupId);

    // Revalidate organization page to show new staff member
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add staff member"),
    };
  }
}

/**
 * Change a staff member's group (for drag & drop)
 * Revalidates: organization page
 */
export async function changeStaffRoleAction(
  communityId: number,
  userId: string,
  newGroupId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await changeRoleMutation(supabase, communityId, userId, newGroupId);

    // Revalidate organization page
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to change staff group"),
    };
  }
}

/**
 * Move a staff member to a group (alias for changeStaffRoleAction for drag & drop)
 */
export async function moveStaffToGroup(
  communityId: number,
  userId: string,
  groupId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  return changeStaffRoleAction(communityId, userId, groupId, slug);
}

/**
 * Remove a staff member completely from the organization
 * Revalidates: organization page
 */
export async function removeStaffAction(
  communityId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await removeStaffMutation(supabase, communityId, userId);

    // Revalidate organization page
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove staff member"),
    };
  }
}

/**
 * Unassign a staff member from all groups (move back to unassigned pool)
 * Does NOT remove them from the community — they remain staff without a role.
 * Revalidates: organization page
 */
export async function unassignStaffAction(
  communityId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await removeStaffFromGroupMutation(supabase, communityId, userId);

    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to unassign staff member"),
    };
  }
}

// =============================================================================
// Groups Query (for populating role selector)
// =============================================================================

/**
 * Get all groups for an organization (for role selection dropdowns)
 */
export async function getOrganizationGroups(communityId: number): Promise<
  ActionResult<
    {
      id: number;
      name: string;
      description: string | null;
      role: {
        id: number;
        name: string;
        description: string | null;
      } | null;
      memberCount: number;
    }[]
  >
> {
  try {
    const supabase = await createClient();
    const groups = await listGroupsQuery(supabase, communityId);

    return { success: true, data: groups };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch groups"),
    };
  }
}
