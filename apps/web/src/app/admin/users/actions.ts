"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  suspendUser,
  unsuspendUser,
  grantSiteRole,
  revokeSiteRole,
} from "@trainers/supabase";

// ----------------------------------------------------------------
// Suspend / Unsuspend
// ----------------------------------------------------------------

/**
 * Suspend a user account. Requires active sudo mode.
 */
export async function suspendUserAction(
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;
    const { userId: adminUserId } = adminCheck;

    // Prevent suspending yourself
    if (userId === adminUserId) {
      return { success: false, error: "Cannot suspend your own account" };
    }

    const supabase = createServiceRoleClient();
    await suspendUser(supabase, userId, adminUserId, reason);

    return { success: true };
  } catch (err) {
    console.error("Error suspending user:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Unsuspend a user account. Requires active sudo mode.
 */
export async function unsuspendUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;
    const { userId: adminUserId } = adminCheck;

    const supabase = createServiceRoleClient();
    await unsuspendUser(supabase, userId, adminUserId);

    return { success: true };
  } catch (err) {
    console.error("Error unsuspending user:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    const result = await grantSiteRole(supabase, userId, roleId);

    return result;
  } catch (err) {
    console.error("Error granting site role:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Revoke a site role from a user. Requires active sudo mode.
 * Prevents removing your own site_admin role.
 */
export async function revokeSiteRoleAction(
  userId: string,
  roleId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;
    const { userId: adminUserId } = adminCheck;

    // Prevent removing your own site_admin role
    if (userId === adminUserId) {
      const supabase = createServiceRoleClient();
      const { data: role } = await supabase
        .from("roles")
        .select("name")
        .eq("id", roleId)
        .maybeSingle();

      if (role?.name === "site_admin") {
        return {
          success: false,
          error: "Cannot remove your own site_admin role",
        };
      }
    }

    const supabase = createServiceRoleClient();
    const result = await revokeSiteRole(supabase, userId, roleId);

    return result;
  } catch (err) {
    console.error("Error revoking site role:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
