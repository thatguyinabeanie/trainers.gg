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

  // Check if already a staff member
  const { data: existingStaff } = await supabase
    .from("organization_staff")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", invitedUserId)
    .single();

  if (existingStaff) {
    throw new Error("User is already a staff member of this organization");
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
 * Remove staff member from organization
 */
export async function removeMember(
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
    throw new Error("Only the owner can remove staff members");
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
