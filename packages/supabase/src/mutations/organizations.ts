import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { getInvitationExpiryDate } from "../constants";

type TypedClient = SupabaseClient<Database>;

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
 * Helper to get current alt
 */
async function getCurrentAlt(supabase: TypedClient) {
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
export async function createOrganization(
  supabase: TypedClient,
  data: {
    name: string;
    slug: string;
    description?: string;
    website?: string;
    logoUrl?: string;
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", data.slug.toLowerCase())
    .single();

  if (existing) {
    throw new Error("Organization slug is already taken");
  }

  // Create organization with user as owner
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: data.name,
      slug: data.slug.toLowerCase(),
      description: data.description,
      website_url: data.website,
      logo_url: data.logoUrl,
      owner_user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Add the user as organization staff (user-level, not alt-level)
  if (user) {
    await supabase.from("organization_staff").insert({
      organization_id: org.id,
      user_id: user.id,
    });
  }

  return org;
}

/**
 * Update organization details
 */
export async function updateOrganization(
  supabase: TypedClient,
  organizationId: number,
  updates: {
    name?: string;
    description?: string;
    website?: string;
    logoUrl?: string;
  }
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Verify ownership or admin permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  if (!org) throw new Error("Organization not found");
  if (org.owner_user_id !== user.id) {
    // TODO: Check for admin role through RBAC
    throw new Error("You don't have permission to update this organization");
  }

  const updateData: Database["public"]["Tables"]["organizations"]["Update"] =
    {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.website !== undefined) updateData.website_url = updates.website;
  if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;

  const { error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", organizationId);

  if (error) throw error;
  return { success: true };
}

/**
 * Invite a user to join organization
 */
export async function inviteToOrganization(
  supabase: TypedClient,
  organizationId: number,
  invitedUserId: string
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Check if already staff
  const { data: existingStaff } = await supabase
    .from("organization_staff")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", invitedUserId)
    .single();

  if (existingStaff) {
    throw new Error("User is already staff of this organization");
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("invited_user_id", invitedUserId)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    throw new Error("User already has a pending invitation");
  }

  // Create invitation
  const { data: invitation, error } = await supabase
    .from("organization_invitations")
    .insert({
      organization_id: organizationId,
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
 * Note: The database trigger will automatically create the organization_staff record
 */
export async function acceptOrganizationInvitation(
  supabase: TypedClient,
  invitationId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get and verify invitation
  const { data: invitation } = await supabase
    .from("organization_invitations")
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
  // The trigger will automatically create organization_staff record and assign role
  await supabase
    .from("organization_invitations")
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
export async function declineOrganizationInvitation(
  supabase: TypedClient,
  invitationId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Get and verify invitation
  const { data: invitation } = await supabase
    .from("organization_invitations")
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
    .from("organization_invitations")
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
export async function leaveOrganization(
  supabase: TypedClient,
  organizationId: number
) {
  const user = await getCurrentUser(supabase);
  if (!user) throw new Error("Not authenticated");

  // Verify not the owner
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  if (org?.owner_user_id === user.id) {
    throw new Error(
      "Organization owner cannot leave. Transfer ownership first."
    );
  }

  const { error } = await supabase
    .from("organization_staff")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", user.id);

  if (error) throw error;
  return { success: true };
}

/**
 * Remove staff from organization
 */
export async function removeStaff(
  supabase: TypedClient,
  organizationId: number,
  userId: string
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify ownership
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  if (!org) throw new Error("Organization not found");
  if (org.owner_user_id !== currentUser.id) {
    throw new Error("Only the owner can remove staff");
  }

  // Cannot remove the owner
  if (userId === currentUser.id) {
    throw new Error("Cannot remove the owner");
  }

  const { error } = await supabase
    .from("organization_staff")
    .delete()
    .eq("organization_id", organizationId)
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
  organizationId: number,
  userId: string
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Check if user is already staff
  const { data: existingStaff } = await supabase
    .from("organization_staff")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingStaff) {
    throw new Error("User is already a staff member");
  }

  // Add user as staff (no group assignment)
  const { error: staffError } = await supabase
    .from("organization_staff")
    .insert({
      organization_id: organizationId,
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
  organizationId: number,
  userId: string,
  groupId: number
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify the group belongs to this organization
  const { data: group } = await supabase
    .from("groups")
    .select("id, organization_id")
    .eq("id", groupId)
    .single();

  if (!group) throw new Error("Group not found");
  if (group.organization_id !== organizationId) {
    throw new Error("Group does not belong to this organization");
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
    .from("organization_staff")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  // If not already staff, add them
  if (!existingStaff) {
    const { error: staffError } = await supabase
      .from("organization_staff")
      .insert({
        organization_id: organizationId,
        user_id: userId,
      });

    if (staffError) throw staffError;
  }

  // Check if user already has a role in any group of this org
  const { data: orgGroups } = await supabase
    .from("groups")
    .select("id")
    .eq("organization_id", organizationId);

  const orgGroupIds = (orgGroups ?? []).map((g) => g.id);

  const { data: existingGroupRoles } = await supabase
    .from("group_roles")
    .select("id")
    .in("group_id", orgGroupIds.length > 0 ? orgGroupIds : [-1]);

  const existingGroupRoleIds = (existingGroupRoles ?? []).map((gr) => gr.id);

  // Remove any existing user_group_roles for this org
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
  organizationId: number,
  userId: string
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Get all groups for this organization
  const { data: orgGroups } = await supabase
    .from("groups")
    .select("id")
    .eq("organization_id", organizationId);

  const orgGroupIds = (orgGroups ?? []).map((g) => g.id);

  if (orgGroupIds.length === 0) {
    return { success: true };
  }

  // Get all group_roles for these groups
  const { data: groupRoles } = await supabase
    .from("group_roles")
    .select("id")
    .in("group_id", orgGroupIds);

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
  organizationId: number,
  userId: string,
  newGroupId: number
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify the target user is not the org owner
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  if (!org) throw new Error("Organization not found");
  if (org.owner_user_id === userId) {
    throw new Error("Cannot change the owner's role");
  }

  // Use addStaffToGroup which handles replacing existing role
  return addStaffToGroup(supabase, organizationId, userId, newGroupId);
}

/**
 * Remove a staff member completely (from staff table and all groups)
 */
export async function removeStaffCompletely(
  supabase: TypedClient,
  organizationId: number,
  userId: string
) {
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) throw new Error("Not authenticated");

  // Verify not removing the owner
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_user_id")
    .eq("id", organizationId)
    .single();

  if (!org) throw new Error("Organization not found");
  if (org.owner_user_id === userId) {
    throw new Error("Cannot remove the organization owner");
  }

  // Cannot remove yourself
  if (userId === currentUser.id) {
    throw new Error(
      "Cannot remove yourself. Use 'Leave Organization' instead."
    );
  }

  // First remove from all groups
  await removeStaffFromGroup(supabase, organizationId, userId);

  // Then remove from organization_staff
  const { error } = await supabase
    .from("organization_staff")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true };
}
