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

// --- Toggle Featured ---

export async function toggleFeaturedAction(
  communityId: number,
  isFeatured: boolean
): Promise<ActionResult> {
  const parsedOrgId = positiveIntSchema.safeParse(communityId);
  if (!parsedOrgId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase) => {
    const updateData: { is_featured: boolean; featured_order?: number | null } =
      {
        is_featured: isFeatured,
      };

    if (isFeatured) {
      // Set featured_order to the next available position
      const { data: maxOrder } = await supabase
        .from("communities")
        .select("featured_order")
        .eq("is_featured", true)
        .order("featured_order", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      updateData.featured_order = (maxOrder?.featured_order ?? 0) + 1;
    } else {
      updateData.featured_order = null;
    }

    const { error } = await supabase
      .from("communities")
      .update(updateData)
      .eq("id", parsedOrgId.data);

    if (error) throw error;

    updateTag(CacheTags.COMMUNITIES_LIST);
    updateTag(CacheTags.community(parsedOrgId.data));
    return { success: true };
  }, "Failed to toggle featured status");
}

// --- Toggle Partner ---

export async function togglePartnerAction(
  communityId: number,
  isPartner: boolean
): Promise<ActionResult> {
  const parsedOrgId = positiveIntSchema.safeParse(communityId);
  if (!parsedOrgId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase) => {
    const { error } = await supabase
      .from("communities")
      .update({ tier: isPartner ? "partner" : null })
      .eq("id", parsedOrgId.data);

    if (error) throw error;

    updateTag(CacheTags.COMMUNITIES_LIST);
    updateTag(CacheTags.community(parsedOrgId.data));
    return { success: true };
  }, "Failed to toggle partner status");
}

// --- Update Featured Order ---

export async function updateFeaturedOrderAction(
  orderedIds: number[]
): Promise<ActionResult> {
  return withAdminAction(async (supabase) => {
    if (orderedIds.length === 0) {
      updateTag(CacheTags.COMMUNITIES_LIST);
      return { success: true };
    }

    for (const [i, id] of orderedIds.entries()) {
      const { error } = await supabase
        .from("communities")
        .update({ featured_order: i + 1 })
        .eq("id", id)
        .eq("is_featured", true);

      if (error) throw error;
    }

    updateTag(CacheTags.COMMUNITIES_LIST);
    return { success: true };
  }, "Failed to update featured order");
}
