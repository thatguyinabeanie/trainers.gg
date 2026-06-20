"use server";

import { positiveIntSchema, uuidSchema, type ActionResult } from "@trainers/validators";
import {
  withAdminAction,
  withAdminReadAction,
  type ActionResult as AdminActionResult,
} from "@/lib/auth/with-admin-action";
import {
  suspendUser,
  unsuspendUser,
  grantSiteRole,
  revokeSiteRole,
  getUserAdminDetails,
  getSiteRoles,
  type UserAdminDetails,
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
): Promise<AdminActionResult> {
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
): Promise<AdminActionResult> {
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
): Promise<AdminActionResult> {
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
): Promise<AdminActionResult> {
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

// ----------------------------------------------------------------
// User Detail (read)
// ----------------------------------------------------------------

type UserDetailsData = {
  user: UserAdminDetails | null;
  siteRoles: Awaited<ReturnType<typeof getSiteRoles>>;
};

/**
 * Load a single user's admin detail (profile + PII + site roles) for the
 * admin user-detail sheet. Gated by withAdminReadAction (site_admin) and run
 * with a service-role client because getUserAdminDetails reads PII via the
 * service_role-only get_users_pii RPC and the auth admin email API.
 */
export async function getUserDetailsAction(
  userId: string
): Promise<ActionResult<UserDetailsData>> {
  const parsedUserId = uuidSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedUserId.error.issues[0]?.message}`,
    };
  }

  return withAdminReadAction(async (supabase) => {
    const [user, siteRoles] = await Promise.all([
      getUserAdminDetails(supabase, parsedUserId.data),
      getSiteRoles(supabase),
    ]);
    return { success: true, data: { user, siteRoles } };
  }, "Error loading user details");
}
