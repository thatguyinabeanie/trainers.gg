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
  updateCommunityPermissions as updatePermissionsMutation,
  inviteToCommunity as inviteToCommunityMutation,
  acceptCommunityInvitation as acceptCommunityInvitationMutation,
  declineCommunityInvitation as declineCommunityInvitationMutation,
  leaveCommunity as leaveCommunityMutation,
  removeStaff as removeStaffMutation,
} from "@trainers/supabase";
import {
  type CommunitySocialLink,
  updateCommunityPermissionsSchema,
  type UpdateCommunityPermissionsInput,
} from "@trainers/validators";
import { CacheTags } from "@/lib/cache";

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
// Organization CRUD
// =============================================================================

/**
 * Update organization details
 * Revalidates: organizations list (always) and individual org page
 */
export async function updateOrganization(
  communityId: number,
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
    await updateCommunityMutation(supabase, communityId, updates);

    // Always revalidate list — any update may affect the public listing
    updateTag(CacheTags.COMMUNITIES_LIST);

    // Revalidate individual organization page
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update community"),
    };
  }
}

/**
 * Update community permissions (visibility, join settings, etc.)
 * Revalidates: communities list (is_public affects listing) and individual community page
 */
export async function updateCommunityPermissions(
  communityId: number,
  permissions: UpdateCommunityPermissionsInput,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const parsed = updateCommunityPermissionsSchema.safeParse(permissions);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid permissions data",
        validationErrors: parsed.error.errors.map((e) => e.message),
      };
    }

    const supabase = await createClient();
    await updatePermissionsMutation(supabase, communityId, parsed.data);

    // Revalidate — is_public affects the communities list
    updateTag(CacheTags.COMMUNITIES_LIST);
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update permissions"),
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
  communityId: number,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await leaveCommunityMutation(supabase, communityId);

    // Revalidate org page to update staff list
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

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
  communityId: number,
  userId: string,
  slug?: string
): Promise<ActionResult<{ success: true }>> {
  try {
    const supabase = await createClient();
    await removeStaffMutation(supabase, communityId, userId);

    // Revalidate org page to update staff list
    if (slug) {
      updateTag(CacheTags.community(slug));
    }
    updateTag(CacheTags.community(communityId));

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove staff"),
    };
  }
}
