"use server";

import { positiveIntSchema, uuidSchema } from "@trainers/validators";
import {
  withAdminAction,
  type ActionResult,
} from "@/lib/auth/with-admin-action";
import {
  suspendUser,
  unsuspendUser,
  grantSiteRole,
  revokeSiteRole,
} from "@trainers/supabase";
import { z } from "@trainers/validators";

// -- Zod Schemas --

const reasonSchema = z.string().max(1000).optional();

// ----------------------------------------------------------------
// Suspend / Unsuspend
// ----------------------------------------------------------------

/**
 * Suspend a user account. Requires active sudo mode.
 */
export async function suspendUserAction(
  userId: string,
  reason?: string
): Promise<ActionResult> {
  const parsedUserId = uuidSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedUserId.error.issues[0]?.message}`,
    };
  }
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedReason.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    // Prevent suspending yourself
    if (parsedUserId.data === adminUserId) {
      return { success: false, error: "Cannot suspend your own account" };
    }

    await suspendUser(
      supabase,
      parsedUserId.data,
      adminUserId,
      parsedReason.data
    );

    return { success: true };
  }, "Error suspending user");
}

/**
 * Unsuspend a user account. Requires active sudo mode.
 */
export async function unsuspendUserAction(
  userId: string
): Promise<ActionResult> {
  const parsedUserId = uuidSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedUserId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await unsuspendUser(supabase, parsedUserId.data, adminUserId);
    return { success: true };
  }, "Error unsuspending user");
}

// ----------------------------------------------------------------
// Site Role Management
// ----------------------------------------------------------------

/**
 * Grant a site role to a user. Requires active sudo mode.
 */
export async function grantSiteRoleAction(
  userId: string,
  roleId: number
): Promise<ActionResult> {
  const parsedUserId = uuidSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedUserId.error.issues[0]?.message}`,
    };
  }
  const parsedRoleId = positiveIntSchema.safeParse(roleId);
  if (!parsedRoleId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedRoleId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    return await grantSiteRole(
      supabase,
      parsedUserId.data,
      parsedRoleId.data,
      adminUserId
    );
  }, "Error granting site role");
}

/**
 * Revoke a site role from a user. Requires active sudo mode.
 * Prevents removing your own site_admin role.
 */
export async function revokeSiteRoleAction(
  userId: string,
  roleId: number
): Promise<ActionResult> {
  const parsedUserId = uuidSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedUserId.error.issues[0]?.message}`,
    };
  }
  const parsedRoleId = positiveIntSchema.safeParse(roleId);
  if (!parsedRoleId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedRoleId.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    // Prevent removing your own site_admin role
    if (parsedUserId.data === adminUserId) {
      const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("name")
        .eq("id", roleId)
        .maybeSingle();

      if (roleError) {
        console.error("Error looking up role:", roleError);
        return { success: false, error: "Failed to verify role details" };
      }

      if (role?.name === "site_admin") {
        return {
          success: false,
          error: "Cannot remove your own site_admin role",
        };
      }
    }

    return await revokeSiteRole(
      supabase,
      parsedUserId.data,
      parsedRoleId.data,
      adminUserId
    );
  }, "Error revoking site role");
}
