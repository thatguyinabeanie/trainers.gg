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
  listOrganizationGroups as listGroupsQuery,
  addStaffMember as addStaffMemberMutation,
  addStaffToGroup as addStaffToGroupMutation,
  changeStaffRole as changeRoleMutation,
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
  organizationId: number,
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
    const users = await searchUsersQuery(supabase, organizationId, searchTerm);

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
  organizationId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await addStaffMemberMutation(supabase, organizationId, userId);

    // Revalidate organization page to show new staff member
    if (slug) {
      updateTag(CacheTags.organization(slug));
    }
    updateTag(CacheTags.organization(organizationId));

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
  organizationId: number,
  userId: string,
  groupId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await addStaffToGroupMutation(supabase, organizationId, userId, groupId);

    // Revalidate organization page to show new staff member
    if (slug) {
      updateTag(CacheTags.organization(slug));
    }
    updateTag(CacheTags.organization(organizationId));

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
  organizationId: number,
  userId: string,
  newGroupId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await changeRoleMutation(supabase, organizationId, userId, newGroupId);

    // Revalidate organization page
    if (slug) {
      updateTag(CacheTags.organization(slug));
    }
    updateTag(CacheTags.organization(organizationId));

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
  organizationId: number,
  userId: string,
  groupId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  return changeStaffRoleAction(organizationId, userId, groupId, slug);
}

/**
 * Remove a staff member completely from the organization
 * Revalidates: organization page
 */
export async function removeStaffAction(
  organizationId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await removeStaffMutation(supabase, organizationId, userId);

    // Revalidate organization page
    if (slug) {
      updateTag(CacheTags.organization(slug));
    }
    updateTag(CacheTags.organization(organizationId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove staff member"),
    };
  }
}

// =============================================================================
// Groups Query (for populating role selector)
// =============================================================================

/**
 * Get all groups for an organization (for role selection dropdowns)
 */
export async function getOrganizationGroups(organizationId: number): Promise<
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
    const groups = await listGroupsQuery(supabase, organizationId);

    return { success: true, data: groups };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch groups"),
    };
  }
}
