import type { Database } from "../types";
import type { TypedClient } from "../client";
import { getInvitationExpiryDate } from "../constants";
import {
  communitySocialLinksSchema,
  type CommunitySocialLink,
  type UpdateCommunityPermissionsInput,
} from "@trainers/validators";

/**
 * Helper to get current user
 */
async function getCurrentUser(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper to check if user has a specific permission in a community
 */
async function checkCommunityPermission(
  supabase: TypedClient,
  communityId: number,
  permissionKey: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_community_permission", {
    p_community_id: communityId,
    permission_key: permissionKey,
  });

  if (error) {
    console.error("Error checking permission:", error);
    return false;
  }

  return data === true;
}

/**
 * Helper to check if current user is community owner
 */
async function isCommunityOwner(
  supabase: TypedClient,
  communityId: number
): Promise<boolean> {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) return false;

  const { data: community } = await supabase
    .from("communities")
    .select("owner_user_id")
    .eq("id", communityId)
    .single();

  return community?.owner_user_id === currentUser.id;
}

/**
 * Helper to get current alt
 */
async function _getCurrentAlt(supabase: TypedClient) {
  const user = await getCurrentUser(supabase);
  if (!user) return null;

  const { data: alt } = await supabase
    .from("alts")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return alt;
}

/**
 * Create a new organization
 * Organizations are owned by users (not alts) for Bluesky federation
 */
export async function createCommunity(
  supabase: TypedClient,
  data: {
    name: string;
    slug: string;
    description?: string;
    socialLinks?: CommunitySocialLink[];
    logoUrl?: string;
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", data.slug.toLowerCase())
    .single();

  if (existing) {
    throw new Error("Community slug is already taken");
  }

  // Validate social links if provided
  let validatedLinks: CommunitySocialLink[] = [];
  if (data.socialLinks) {
    const parsed = communitySocialLinksSchema.safeParse(data.socialLinks);
    if (!parsed.success) {
      throw new Error(
        `Invalid social links: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    validatedLinks = parsed.data;
  }

  // Create organization with user as owner
  const { data: community, error } = await supabase
    .from("communities")
    .insert({
      name: data.name,
      slug: data.slug.toLowerCase(),
      description: data.description,
      social_links: validatedLinks,
      logo_url: data.logoUrl,
      owner_user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Add the user as organization staff (user-level, not alt-level)
  if (user) {
    await supabase.from("community_staff").insert({
      community_id: community.id,
      user_id: user.id,
    });
  }

  return community;
}

/**
 * Update organization details
 */
export async function updateCommunity(
  supabase: TypedClient,
  communityId: number,
  updates: {
    name?: string;
    description?: string;
    socialLinks?: CommunitySocialLink[];
    logoUrl?: string | null;
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Verify ownership or admin permission
  const { data: community } = await supabase
    .from("communities")
    .select("owner_user_id")
    .eq("id", communityId)
    .single();

  if (!community) throw new Error("Community not found");
  if (community.owner_user_id !== user.id) {
    // TODO: Check for admin role through RBAC
    throw new Error("You don't have permission to update this community");
  }

  const updateData: Database["public"]["Tables"]["communities"]["Update"] = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.socialLinks !== undefined) {
    // Validate social links through Zod before writing to JSONB
    const parsed = communitySocialLinksSchema.safeParse(updates.socialLinks);
    if (!parsed.success) {
      throw new Error(
        `Invalid social links: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    updateData.social_links = parsed.data;
  }
  if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;

  const { error } = await supabase
    .from("communities")
    .update(updateData)
    .eq("id", communityId);

  if (error) throw error;
  return { success: true };
}

/**
 * Invite a user to join organization
 */
export async function inviteToCommunity(
  supabase: TypedClient,
  communityId: number,
  invitedUserId: string
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Check if already staff
  const { data: existingStaff } = await supabase
    .from("community_staff")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", invitedUserId)
    .single();

  if (existingStaff) {
    throw new Error("User is already staff of this community");
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from("community_invitations")
    .select("id")
    .eq("community_id", communityId)
    .eq("invited_user_id", invitedUserId)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    throw new Error("User already has a pending invitation");
  }

  // Create invitation
  const { data: invitation, error } = await supabase
    .from("community_invitations")
    .insert({
      community_id: communityId,
      invited_user_id: invitedUserId,
      invited_by_user_id: user.id,
      role: "org_moderator", // Default role
      status: "pending",
      expires_at: getInvitationExpiryDate(),
    })
    .select()
    .single();

  if (error) throw error;
  return invitation;
}

/**
 * Accept organization invitation
 * Note: The database trigger will automatically create the community_staff record
 */
export async function acceptCommunityInvitation(
  supabase: TypedClient,
  invitationId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get and verify invitation
  const { data: invitation } = await supabase
    .from("community_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (!invitation) throw new Error("Invitation not found");
  if (invitation.invited_user_id !== user.id) {
    throw new Error("This invitation is not for you");
  }
  if (invitation.status !== "pending") {
    throw new Error("Invitation is no longer pending");
  }
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    throw new Error("Invitation has expired");
  }

  // Update invitation status
  // The trigger will automatically create community_staff record and assign role
  await supabase
    .from("community_invitations")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  return { success: true };
}

/**
 * Decline organization invitation
 */
export async function declineCommunityInvitation(
  supabase: TypedClient,
  invitationId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get and verify invitation
  const { data: invitation } = await supabase
    .from("community_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (!invitation) throw new Error("Invitation not found");
  if (invitation.invited_user_id !== user.id) {
    throw new Error("This invitation is not for you");
  }
  if (invitation.status !== "pending") {
    throw new Error("Invitation is no longer pending");
  }

  await supabase
    .from("community_invitations")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  return { success: true };
}

/**
 * Leave organization (user-level action)
 */
export async function leaveCommunity(
  supabase: TypedClient,
  communityId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Verify not the owner
  const { data: community } = await supabase
    .from("communities")
    .select("owner_user_id")
    .eq("id", communityId)
    .single();

  if (community?.owner_user_id === user.id) {
    throw new Error("Community owner cannot leave. Transfer ownership first.");
  }

  const { error } = await supabase
    .from("community_staff")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);

  if (error) throw error;
  return { success: true };
}

/**
 * Remove staff from organization
 */
export async function removeStaff(
  supabase: TypedClient,
  communityId: number,
  userId: string
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify ownership
  const { data: community } = await supabase
    .from("communities")
    .select("owner_user_id")
    .eq("id", communityId)
    .single();

  if (!community) throw new Error("Community not found");
  if (community.owner_user_id !== currentUser.id) {
    throw new Error("Only the owner can remove staff");
  }

  // Cannot remove the owner
  if (userId === currentUser.id) {
    throw new Error("Cannot remove the owner");
  }

  const { error } = await supabase
    .from("community_staff")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true };
}

// =============================================================================
// Staff Group Management
// =============================================================================

/**
 * Add a user to an organization as staff (without assigning to a group yet)
 * The user will appear in the "Unassigned" section until moved to a group
 */
export async function addStaffMember(
  supabase: TypedClient,
  communityId: number,
  userId: string
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify permission: must be community owner or have community.staff.manage permission
  const ownerCheck = await isCommunityOwner(supabase, communityId);
  const permCheck = await checkCommunityPermission(
    supabase,
    communityId,
    "community.staff.manage"
  );
  if (!ownerCheck && !permCheck) {
    throw new Error("You don't have permission to manage staff");
  }

  // Check if user is already staff
  const { data: existingStaff } = await supabase
    .from("community_staff")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingStaff) {
    throw new Error("User is already a staff member");
  }

  // Add user as staff (no group assignment)
  const { error: staffError } = await supabase.from("community_staff").insert({
    community_id: communityId,
    user_id: userId,
  });

  if (staffError) throw staffError;

  return { success: true };
}

/**
 * Add a user to an organization as staff with a specific group/role
 */
export async function addStaffToGroup(
  supabase: TypedClient,
  communityId: number,
  userId: string,
  groupId: number
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify permission: must be community owner or have community.staff.manage permission
  const ownerCheck = await isCommunityOwner(supabase, communityId);
  const permCheck = await checkCommunityPermission(
    supabase,
    communityId,
    "community.staff.manage"
  );
  if (!ownerCheck && !permCheck) {
    throw new Error("You don't have permission to manage staff");
  }

  // Verify the group belongs to this organization
  const { data: group } = await supabase
    .from("groups")
    .select("id, community_id")
    .eq("id", groupId)
    .single();

  if (!group) throw new Error("Group not found");
  if (group.community_id !== communityId) {
    throw new Error("Group does not belong to this community");
  }

  // Get the group_role for this group
  const { data: groupRole } = await supabase
    .from("group_roles")
    .select("id")
    .eq("group_id", groupId)
    .single();

  if (!groupRole) throw new Error("Group has no associated role");

  // Check if user is already staff
  const { data: existingStaff } = await supabase
    .from("community_staff")
    .select("id")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  // If not already staff, add them
  if (!existingStaff) {
    const { error: staffError } = await supabase
      .from("community_staff")
      .insert({
        community_id: communityId,
        user_id: userId,
      });

    if (staffError) throw staffError;
  }

  // Check if user already has a role in any group of this community
  const { data: communityGroups } = await supabase
    .from("groups")
    .select("id")
    .eq("community_id", communityId);

  const communityGroupIds = (communityGroups ?? []).map((g) => g.id);

  const { data: existingGroupRoles } = await supabase
    .from("group_roles")
    .select("id")
    .in("group_id", communityGroupIds.length > 0 ? communityGroupIds : [-1]);

  const existingGroupRoleIds = (existingGroupRoles ?? []).map((gr) => gr.id);

  // Remove any existing user_group_roles for this community
  if (existingGroupRoleIds.length > 0) {
    await supabase
      .from("user_group_roles")
      .delete()
      .eq("user_id", userId)
      .in("group_role_id", existingGroupRoleIds);
  }

  // Add user to the new group
  const { error: roleError } = await supabase.from("user_group_roles").insert({
    user_id: userId,
    group_role_id: groupRole.id,
  });

  if (roleError) throw roleError;

  return { success: true };
}

/**
 * Remove a user from all groups in an organization (effectively removing their role)
 */
export async function removeStaffFromGroup(
  supabase: TypedClient,
  communityId: number,
  userId: string
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify permission: must be community owner or have community.staff.manage permission
  const ownerCheck = await isCommunityOwner(supabase, communityId);
  const permCheck = await checkCommunityPermission(
    supabase,
    communityId,
    "community.staff.manage"
  );
  if (!ownerCheck && !permCheck) {
    throw new Error("You don't have permission to manage staff");
  }

  // Get all groups for this community
  const { data: communityGroups } = await supabase
    .from("groups")
    .select("id")
    .eq("community_id", communityId);

  const communityGroupIds = (communityGroups ?? []).map((g) => g.id);

  if (communityGroupIds.length === 0) {
    return { success: true };
  }

  // Get all group_roles for these groups
  const { data: groupRoles } = await supabase
    .from("group_roles")
    .select("id")
    .in("group_id", communityGroupIds);

  const groupRoleIds = (groupRoles ?? []).map((gr) => gr.id);

  if (groupRoleIds.length === 0) {
    return { success: true };
  }

  // Remove user from all group_roles
  await supabase
    .from("user_group_roles")
    .delete()
    .eq("user_id", userId)
    .in("group_role_id", groupRoleIds);

  return { success: true };
}

/**
 * Change a staff member's role by moving them to a different group
 */
export async function changeStaffRole(
  supabase: TypedClient,
  communityId: number,
  userId: string,
  newGroupId: number
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify permission: must be community owner or have community.staff.manage permission
  const ownerCheck = await isCommunityOwner(supabase, communityId);
  const permCheck = await checkCommunityPermission(
    supabase,
    communityId,
    "community.staff.manage"
  );
  if (!ownerCheck && !permCheck) {
    throw new Error("You don't have permission to manage staff");
  }

  // Verify the target user is not the community owner
  const { data: community } = await supabase
    .from("communities")
    .select("owner_user_id")
    .eq("id", communityId)
    .single();

  if (!community) throw new Error("Community not found");
  if (community.owner_user_id === userId) {
    throw new Error("Cannot change the owner's role");
  }

  // Use addStaffToGroup which handles replacing existing role
  return addStaffToGroup(supabase, communityId, userId, newGroupId);
}

/**
 * Remove a staff member completely (from staff table and all groups)
 */
export async function removeStaffCompletely(
  supabase: TypedClient,
  communityId: number,
  userId: string
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify permission: must be community owner or have community.staff.manage permission
  const ownerCheck = await isCommunityOwner(supabase, communityId);
  const permCheck = await checkCommunityPermission(
    supabase,
    communityId,
    "community.staff.manage"
  );
  if (!ownerCheck && !permCheck) {
    throw new Error("You don't have permission to manage staff");
  }

  // Verify not removing the owner
  const { data: community } = await supabase
    .from("communities")
    .select("owner_user_id")
    .eq("id", communityId)
    .single();

  if (!community) throw new Error("Community not found");
  if (community.owner_user_id === userId) {
    throw new Error("Cannot remove the community owner");
  }

  // Cannot remove yourself
  if (userId === currentUser.id) {
    throw new Error("Cannot remove yourself. Use 'Leave Community' instead.");
  }

  // First remove from all groups
  await removeStaffFromGroup(supabase, communityId, userId);

  // Then remove from community_staff
  const { error } = await supabase
    .from("community_staff")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true };
}

/**
 * Update community permission settings. Owner-only operation enforced by RLS.
 */
export async function updateCommunityPermissions(
  supabase: TypedClient,
  communityId: number,
  permissions: UpdateCommunityPermissionsInput
): Promise<void> {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Build update object, only including provided fields
  const updateData: Database["public"]["Tables"]["communities"]["Update"] = {};
  if (permissions.isPublic !== undefined)
    updateData.is_public = permissions.isPublic;
  if (permissions.registrationMode !== undefined)
    updateData.registration_mode = permissions.registrationMode;
  if (permissions.staffInviteMode !== undefined)
    updateData.staff_invite_mode = permissions.staffInviteMode;
  if (permissions.teamSheetVisibility !== undefined)
    updateData.team_sheet_visibility = permissions.teamSheetVisibility;

  if (Object.keys(updateData).length === 0) return;

  const { error } = await supabase
    .from("communities")
    .update(updateData)
    .eq("id", communityId);

  if (error) throw new Error(`Failed to update permissions: ${error.message}`);
}
