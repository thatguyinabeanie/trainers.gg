"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  unsuspendOrganization,
  transferOrgOwnership,
} from "@trainers/supabase/queries";

// -- Zod Schemas --

const orgIdSchema = z.number().int().positive();
const reasonSchema = z.string().trim().min(1).max(1000);
const userIdSchema = z.string().uuid();

// --- Approve ---

export async function approveOrgAction(
  orgId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsedOrgId = orgIdSchema.safeParse(orgId);
    if (!parsedOrgId.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
      };
    }

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
    const parsedOrgId = orgIdSchema.safeParse(orgId);
    if (!parsedOrgId.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
      };
    }
    const parsedReason = reasonSchema.safeParse(reason);
    if (!parsedReason.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedReason.error.issues[0]?.message}`,
      };
    }

    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

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
    const parsedOrgId = orgIdSchema.safeParse(orgId);
    if (!parsedOrgId.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
      };
    }
    const parsedReason = reasonSchema.safeParse(reason);
    if (!parsedReason.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedReason.error.issues[0]?.message}`,
      };
    }

    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

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
    const parsedOrgId = orgIdSchema.safeParse(orgId);
    if (!parsedOrgId.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
      };
    }

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
    const parsedOrgId = orgIdSchema.safeParse(orgId);
    if (!parsedOrgId.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedOrgId.error.issues[0]?.message}`,
      };
    }
    const parsedUserId = userIdSchema.safeParse(newOwnerUserId);
    if (!parsedUserId.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedUserId.error.issues[0]?.message}`,
      };
    }

    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

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
