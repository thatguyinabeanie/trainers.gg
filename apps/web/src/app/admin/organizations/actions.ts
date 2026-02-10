"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  unsuspendOrganization,
  transferOrgOwnership,
} from "@trainers/supabase/queries";

// --- Approve ---

export async function approveOrgAction(
  orgId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    await approveOrganization(supabase, orgId, adminCheck.userId);

    return { success: true };
  } catch (err) {
    console.error("Error approving organization:", err);
    return { success: false, error: "Failed to approve organization" };
  }
}

// --- Reject ---

export async function rejectOrgAction(
  orgId: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    if (!reason.trim()) {
      return { success: false, error: "A reason is required" };
    }

    const supabase = createServiceRoleClient();
    await rejectOrganization(supabase, orgId, adminCheck.userId, reason);

    return { success: true };
  } catch (err) {
    console.error("Error rejecting organization:", err);
    return { success: false, error: "Failed to reject organization" };
  }
}

// --- Suspend ---

export async function suspendOrgAction(
  orgId: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    if (!reason.trim()) {
      return { success: false, error: "A reason is required" };
    }

    const supabase = createServiceRoleClient();
    await suspendOrganization(supabase, orgId, adminCheck.userId, reason);

    return { success: true };
  } catch (err) {
    console.error("Error suspending organization:", err);
    return { success: false, error: "Failed to suspend organization" };
  }
}

// --- Unsuspend ---

export async function unsuspendOrgAction(
  orgId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    await unsuspendOrganization(supabase, orgId, adminCheck.userId);

    return { success: true };
  } catch (err) {
    console.error("Error unsuspending organization:", err);
    return { success: false, error: "Failed to unsuspend organization" };
  }
}

// --- Transfer Ownership ---

export async function transferOwnershipAction(
  orgId: number,
  newOwnerUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    if (!newOwnerUserId.trim()) {
      return { success: false, error: "A new owner is required" };
    }

    const supabase = createServiceRoleClient();
    await transferOrgOwnership(
      supabase,
      orgId,
      newOwnerUserId,
      adminCheck.userId
    );

    return { success: true };
  } catch (err) {
    console.error("Error transferring organization ownership:", err);
    return { success: false, error: "Failed to transfer ownership" };
  }
}
