"use server";

import { updateTag } from "next/cache";
import {
  positiveIntSchema,
  uuidSchema,
  adminReasonSchema,
} from "@trainers/validators";
import {
  withAdminAction,
  type ActionResult,
} from "@/lib/auth/with-admin-action";
import {
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  unsuspendOrganization,
  transferCommunityOwnership,
} from "@trainers/supabase/queries";
import { CacheTags } from "@/lib/cache";

// --- Approve ---

export async function approveCommunityAction(
  communityId: number
): Promise<ActionResult> {
  const parsedOrgId = positiveIntSchema.safeParse(communityId);
  if (!parsedOrgId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await approveOrganization(supabase, parsedOrgId.data, adminUserId);
    updateTag(CacheTags.COMMUNITIES_LIST);
    updateTag(CacheTags.community(parsedOrgId.data));
    return { success: true };
  }, "Failed to approve organization");
}

// --- Reject ---

export async function rejectCommunityAction(
  communityId: number,
  reason: string
): Promise<ActionResult> {
  const parsedOrgId = positiveIntSchema.safeParse(communityId);
  if (!parsedOrgId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
    };
  }
  const parsedReason = adminReasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedReason.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await rejectOrganization(
      supabase,
      parsedOrgId.data,
      adminUserId,
      parsedReason.data
    );
    updateTag(CacheTags.COMMUNITIES_LIST);
    updateTag(CacheTags.community(parsedOrgId.data));
    return { success: true };
  }, "Failed to reject organization");
}

// --- Suspend ---

export async function suspendCommunityAction(
  communityId: number,
  reason: string
): Promise<ActionResult> {
  const parsedOrgId = positiveIntSchema.safeParse(communityId);
  if (!parsedOrgId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
    };
  }
  const parsedReason = adminReasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedReason.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await suspendOrganization(
      supabase,
      parsedOrgId.data,
      adminUserId,
      parsedReason.data
    );
    updateTag(CacheTags.COMMUNITIES_LIST);
    updateTag(CacheTags.community(parsedOrgId.data));
    return { success: true };
  }, "Failed to suspend organization");
}

// --- Unsuspend ---

export async function unsuspendCommunityAction(
  communityId: number
): Promise<ActionResult> {
  const parsedOrgId = positiveIntSchema.safeParse(communityId);
  if (!parsedOrgId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await unsuspendOrganization(supabase, parsedOrgId.data, adminUserId);
    updateTag(CacheTags.COMMUNITIES_LIST);
    updateTag(CacheTags.community(parsedOrgId.data));
    return { success: true };
  }, "Failed to unsuspend organization");
}

// --- Transfer Ownership ---

export async function transferOwnershipAction(
  communityId: number,
  newOwnerUserId: string
): Promise<ActionResult> {
  const parsedOrgId = positiveIntSchema.safeParse(communityId);
  if (!parsedOrgId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
    };
  }
  const parsedUserId = uuidSchema.safeParse(newOwnerUserId);
  if (!parsedUserId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedUserId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await transferCommunityOwnership(
      supabase,
      parsedOrgId.data,
      parsedUserId.data,
      adminUserId
    );
    updateTag(CacheTags.COMMUNITIES_LIST);
    updateTag(CacheTags.community(parsedOrgId.data));
    return { success: true };
  }, "Failed to transfer ownership");
}
