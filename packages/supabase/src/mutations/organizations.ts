import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { getInvitationExpiryDate } from "../constants";

type TypedClient = SupabaseClient<Database>;

/**
 * Helper to get current profile
 */
async function getCurrentProfile(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return profile;
}

/**
 * Create a new organization
 */
export async function createOrganization(
  supabase: TypedClient,
  data: {
    name: string;
    slug: string;
    description?: string;
    website?: string;
    logoUrl?: string;
  },
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", data.slug.toLowerCase())
    .single();

  if (existing) {
    throw new Error("Organization slug is already taken");
  }

  // Create organization
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: data.name,
      slug: data.slug.toLowerCase(),
      description: data.description,
      website_url: data.website,
      logo_url: data.logoUrl,
      owner_profile_id: profile.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Add owner as member
  await supabase.from("organization_members").insert({
    organization_id: org.id,
    profile_id: profile.id,
  });

  return org;
}

/**
 * Update organization details
 */
export async function updateOrganization(
  supabase: TypedClient,
  organizationId: string,
  updates: {
    name?: string;
    description?: string;
    website?: string;
    logoUrl?: string;
  },
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Verify ownership or admin permission
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_profile_id")
    .eq("id", organizationId)
    .single();

  if (!org) throw new Error("Organization not found");
  if (org.owner_profile_id !== profile.id) {
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
  organizationId: string,
  invitedProfileId: string,
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", invitedProfileId)
    .single();

  if (existingMember) {
    throw new Error("User is already a member of this organization");
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("invited_profile_id", invitedProfileId)
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
      invited_profile_id: invitedProfileId,
      invited_by_profile_id: profile.id,
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
 */
export async function acceptOrganizationInvitation(
  supabase: TypedClient,
  invitationId: string,
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Get and verify invitation
  const { data: invitation } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (!invitation) throw new Error("Invitation not found");
  if (invitation.invited_profile_id !== profile.id) {
    throw new Error("This invitation is not for you");
  }
  if (invitation.status !== "pending") {
    throw new Error("Invitation is no longer pending");
  }
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    throw new Error("Invitation has expired");
  }

  // Add as member
  await supabase.from("organization_members").insert({
    organization_id: invitation.organization_id,
    profile_id: profile.id,
  });

  // Update invitation status
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
  invitationId: string,
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  const { data: invitation } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (!invitation) throw new Error("Invitation not found");
  if (invitation.invited_profile_id !== profile.id) {
    throw new Error("This invitation is not for you");
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
 * Leave organization
 */
export async function leaveOrganization(
  supabase: TypedClient,
  organizationId: string,
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Check if owner (can't leave if owner)
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_profile_id")
    .eq("id", organizationId)
    .single();

  if (org?.owner_profile_id === profile.id) {
    throw new Error(
      "Organization owner cannot leave. Transfer ownership first.",
    );
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("profile_id", profile.id);

  if (error) throw error;
  return { success: true };
}

/**
 * Remove member from organization
 */
export async function removeMember(
  supabase: TypedClient,
  organizationId: string,
  profileId: string,
) {
  const profile = await getCurrentProfile(supabase);
  if (!profile) throw new Error("Not authenticated");

  // Verify ownership
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_profile_id")
    .eq("id", organizationId)
    .single();

  if (!org) throw new Error("Organization not found");
  if (org.owner_profile_id !== profile.id) {
    throw new Error("Only the owner can remove members");
  }
  if (org.owner_profile_id === profileId) {
    throw new Error("Cannot remove the owner");
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId);

  if (error) throw error;
  return { success: true };
}
