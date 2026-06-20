/**
 * Staff Management Server Actions
 *
 * Server actions for managing community staff with cache revalidation.
 * These wrap the @trainers/supabase mutations and queries.
 */

"use server";

import {
  searchUsersForInvite as searchUsersQuery,
  listCommunityGroups as listGroupsQuery,
  addStaffMember as addStaffMemberMutation,
  addStaffToGroup as addStaffToGroupMutation,
  changeStaffRole as changeRoleMutation,
  removeStaffFromGroup as removeStaffFromGroupMutation,
  removeStaffCompletely as removeStaffMutation,
} from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";
import { getErrorMessage, PERMISSIONS } from "@trainers/utils";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { invalidateCommunityPageCaches } from "@/lib/cache-invalidation";
import { enqueueCommunityRoleSync } from "@/lib/discord/enqueue-helpers";
import { rejectBots } from "./utils";

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
    await rejectBots();
    const supabase = await createClient();

    // Authorization: this search enriches results with first/last name via the
    // service_role-only get_users_pii RPC (which bypasses RLS). Gate on
    // community.invite_staff BEFORE the service-role read — otherwise any
    // signed-in user could enumerate arbitrary users' names by searching with
    // any community id. The PostgREST reads inside the query run under RLS, but
    // the PII enrichment does not, so the app layer must gate it.
    const { data: canInvite, error: permError } = await supabase.rpc(
      "has_community_permission",
      {
        p_community_id: communityId,
        permission_key: PERMISSIONS.COMMUNITY_INVITE_STAFF,
      }
    );
    if (permError) {
      throw new Error(`Permission check failed: ${permError.message}`);
    }
    if (!canInvite) {
      return {
        success: false,
        error: "You do not have permission to invite staff for this community.",
      };
    }

    // Service-role client required for PII enrichment (get_users_pii RPC is
    // service_role-only). The auth client handles the PostgREST reads under RLS.
    const serviceSupabase = createServiceRoleClient();
    const users = await searchUsersQuery(
      supabase,
      communityId,
      searchTerm,
      10,
      serviceSupabase
    );

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
 * Add a user to a community as staff (unassigned to any group)
 * The user will appear in the "Unassigned" section until moved to a group
 * Revalidates: community page
 */
export async function inviteStaffMember(
  communityId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await addStaffMemberMutation(supabase, communityId, userId);

    invalidateCommunityPageCaches(slug, communityId);

    // Fire-and-forget: assign the staff Discord role
    void enqueueCommunityRoleSync(
      supabase,
      communityId,
      [userId],
      "staff",
      "add",
      `staff_added:${communityId}:${userId}`
    );

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add staff member"),
    };
  }
}

/**
 * Add a user to a community as staff with a specific group
 * Revalidates: community page
 */
export async function inviteStaffToGroup(
  communityId: number,
  userId: string,
  groupId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await addStaffToGroupMutation(supabase, communityId, userId, groupId);

    invalidateCommunityPageCaches(slug, communityId);

    // Fire-and-forget: assign the staff Discord role
    void enqueueCommunityRoleSync(
      supabase,
      communityId,
      [userId],
      "staff",
      "add",
      `staff_added:${communityId}:${userId}`
    );

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
 * Revalidates: community page
 */
export async function changeStaffRoleAction(
  communityId: number,
  userId: string,
  newGroupId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await changeRoleMutation(supabase, communityId, userId, newGroupId);

    invalidateCommunityPageCaches(slug, communityId);

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
 * Remove a staff member completely from the community
 * Revalidates: community page
 */
export async function removeStaffAction(
  communityId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await removeStaffMutation(supabase, communityId, userId);

    invalidateCommunityPageCaches(slug, communityId);

    // Fire-and-forget: remove the staff Discord role
    void enqueueCommunityRoleSync(
      supabase,
      communityId,
      [userId],
      "staff",
      "remove",
      `staff_removed:${communityId}:${userId}`
    );

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
 * Revalidates: community page
 */
export async function unassignStaffAction(
  communityId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await removeStaffFromGroupMutation(supabase, communityId, userId);

    invalidateCommunityPageCaches(slug, communityId);

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
 * Get all groups for a community (for role selection dropdowns)
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
