/**
 * Community Server Actions
 *
 * Server actions for community mutations with cache revalidation.
 * These wrap the @trainers/supabase mutations and trigger on-demand cache invalidation.
 */

"use server";

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
import { invalidateCommunityPageCaches } from "@/lib/cache-invalidation";

/**
 * Action result type for consistent error handling
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code?: string;
      validationErrors?: string[];
    };

// =============================================================================
// Community CRUD
// =============================================================================

/**
 * Update community details
 * Revalidates: communities list (always) and individual community page
 */
export async function updateOrganization(
  communityId: number,
  updates: {
    name?: string;
    description?: string;
    about?: string | null;
    socialLinks?: CommunitySocialLink[];
    logoUrl?: string | null;
  },
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await updateCommunityMutation(supabase, communityId, updates);

    invalidateCommunityPageCaches(slug, communityId);

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
 * Invite a user to join a community
 */
export async function inviteToOrganization(
  communityId: number,
  invitedUserId: string
): Promise<ActionResult<{ invitationId: number }>> {
  try {
    const supabase = await createClient();
    const result = await inviteToCommunityMutation(
      supabase,
      communityId,
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
 * Accept a community invitation
 */
export async function acceptOrganizationInvitation(
  invitationId: number,
  organizationSlug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await acceptCommunityInvitationMutation(supabase, invitationId);

    invalidateCommunityPageCaches(organizationSlug);

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to accept invitation"),
    };
  }
}

/**
 * Decline a community invitation
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
 * Leave a community
 */
export async function leaveOrganization(
  communityId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await leaveCommunityMutation(supabase, communityId);

    invalidateCommunityPageCaches(slug, communityId);

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to leave community"),
    };
  }
}

/**
 * Remove a staff member from a community
 */
export async function removeStaff(
  communityId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await removeStaffMutation(supabase, communityId, userId);

    invalidateCommunityPageCaches(slug, communityId);

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove staff"),
    };
  }
}
