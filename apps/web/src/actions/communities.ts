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
  updateCommunity as updateCommunityMutation,
  inviteToCommunity as inviteToCommunityMutation,
  acceptCommunityInvitation as acceptCommunityInvitationMutation,
  declineCommunityInvitation as declineCommunityInvitationMutation,
  leaveCommunity as leaveCommunityMutation,
  removeStaff as removeStaffMutation,
} from "@trainers/supabase";
import { type CommunitySocialLink } from "@trainers/validators";
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
 * Update organization details
 * Revalidates: organizations list (if display data changes) and individual org page
 */
export async function updateOrganization(
  organizationId: number,
  updates: {
    name?: string;
    description?: string;
    socialLinks?: CommunitySocialLink[];
    logoUrl?: string | null;
  },
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateCommunityMutation(supabase, organizationId, updates);

    // Revalidate list if display data changed (name, description, logo)
    if (updates.name || updates.description || updates.logoUrl) {
      updateTag(CacheTags.COMMUNITIES_LIST);
    }

    // Revalidate individual organization page
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(organizationId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update community"),
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
    const result = await inviteToCommunityMutation(
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
    await acceptCommunityInvitationMutation(supabase, invitationId);

    // Revalidate org page to show new staff member
    if (organizationSlug) {
      updateTag(CacheTags.community(organizationSlug));
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
    await declineCommunityInvitationMutation(supabase, invitationId);
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
    await leaveCommunityMutation(supabase, organizationId);

    // Revalidate org page to update staff list
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(organizationId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to leave community"),
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
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(organizationId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove staff"),
    };
  }
}
