/**
 * Organization Server Actions
 *
 * Server actions for organization mutations with cache revalidation.
 * These wrap the @trainers/supabase mutations and trigger on-demand cache invalidation.
 */

"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
  createOrganization as createOrganizationMutation,
  updateOrganization as updateOrganizationMutation,
  inviteToOrganization as inviteToOrganizationMutation,
  acceptOrganizationInvitation as acceptOrganizationInvitationMutation,
  declineOrganizationInvitation as declineOrganizationInvitationMutation,
  leaveOrganization as leaveOrganizationMutation,
  removeStaff as removeStaffMutation,
} from "@trainers/supabase";
import { type OrganizationSocialLink } from "@trainers/validators";
import { CacheTags } from "@/lib/cache";

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// Organization CRUD
// =============================================================================

/**
 * Create a new organization
 * Revalidates: organizations list
 */
export async function createOrganization(data: {
  name: string;
  slug: string;
  description?: string;
  socialLinks?: OrganizationSocialLink[];
  logoUrl?: string;
}): Promise<ActionResult<{ id: number; slug: string; name: string }>> {
  try {
    const supabase = await createClient();
    const result = await createOrganizationMutation(supabase, data);

    // New organization is visible on the public list
    updateTag(CacheTags.ORGANIZATIONS_LIST);

    return {
      success: true,
      data: { id: result.id, slug: result.slug, name: result.name },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create organization"),
    };
  }
}

/**
 * Update organization details
 * Revalidates: organizations list (if display data changes) and individual org page
 */
export async function updateOrganization(
  organizationId: number,
  updates: {
    name?: string;
    description?: string;
    socialLinks?: OrganizationSocialLink[];
    logoUrl?: string | null;
  },
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateOrganizationMutation(supabase, organizationId, updates);

    // Revalidate list if display data changed (name, description, logo)
    if (updates.name || updates.description || updates.logoUrl) {
      updateTag(CacheTags.ORGANIZATIONS_LIST);
    }

    // Revalidate individual organization page
    if (slug) {
      updateTag(CacheTags.organization(slug));
    }
    updateTag(CacheTags.organization(organizationId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update organization"),
    };
  }
}

// =============================================================================
// Staff Management
// =============================================================================

/**
 * Invite a user to join an organization
 */
export async function inviteToOrganization(
  organizationId: number,
  invitedUserId: string
): Promise<ActionResult<{ invitationId: number }>> {
  try {
    const supabase = await createClient();
    const result = await inviteToOrganizationMutation(
      supabase,
      organizationId,
      invitedUserId
    );

    return { success: true, data: { invitationId: result.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to send invitation"),
    };
  }
}

/**
 * Accept an organization invitation
 */
export async function acceptOrganizationInvitation(
  invitationId: number,
  organizationSlug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await acceptOrganizationInvitationMutation(supabase, invitationId);

    // Revalidate org page to show new staff member
    if (organizationSlug) {
      updateTag(CacheTags.organization(organizationSlug));
    }

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to accept invitation"),
    };
  }
}

/**
 * Decline an organization invitation
 */
export async function declineOrganizationInvitation(
  invitationId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await declineOrganizationInvitationMutation(supabase, invitationId);
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to decline invitation"),
    };
  }
}

/**
 * Leave an organization
 */
export async function leaveOrganization(
  organizationId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await leaveOrganizationMutation(supabase, organizationId);

    // Revalidate org page to update staff list
    if (slug) {
      updateTag(CacheTags.organization(slug));
    }
    updateTag(CacheTags.organization(organizationId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to leave organization"),
    };
  }
}

/**
 * Remove a staff member from an organization
 */
export async function removeStaff(
  organizationId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await removeStaffMutation(supabase, organizationId, userId);

    // Revalidate org page to update staff list
    if (slug) {
      updateTag(CacheTags.organization(slug));
    }
    updateTag(CacheTags.organization(organizationId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove staff"),
    };
  }
}
