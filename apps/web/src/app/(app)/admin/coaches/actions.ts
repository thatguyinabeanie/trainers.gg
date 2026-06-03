/**
 * Server actions for admin coach management.
 * Grant and revoke coach status on user accounts.
 */
"use server";

import { updateTag } from "next/cache";

import { uuidSchema, adminReasonSchema } from "@trainers/validators";
import { grantCoachStatus, revokeCoachStatus } from "@trainers/supabase";

import {
  withAdminAction,
  type ActionResult,
} from "@/lib/auth/with-admin-action";
import { CacheTags } from "@/lib/cache";

// =============================================================================
// Grant Coach Status
// =============================================================================

/**
 * Grant coach status to a user. Requires active sudo mode.
 */
export async function grantCoachStatusAction(
  userId: string
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await grantCoachStatus(supabase, parsed.data, adminUserId);
    updateTag(CacheTags.COACHES_LIST);
    return { success: true };
  }, "Failed to grant coach status");
}

// =============================================================================
// Revoke Coach Status
// =============================================================================

/**
 * Revoke coach status from a user. Requires active sudo mode.
 */
export async function revokeCoachStatusAction(
  userId: string,
  reason?: string
): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(userId);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues[0]?.message}`,
    };
  }

  let validatedReason: string | undefined;
  if (reason !== undefined) {
    const r = adminReasonSchema.safeParse(reason);
    if (!r.success) {
      return {
        success: false,
        error: `Invalid input: ${r.error.issues[0]?.message}`,
      };
    }
    validatedReason = r.data;
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await revokeCoachStatus(
      supabase,
      parsed.data,
      adminUserId,
      validatedReason
    );
    updateTag(CacheTags.COACHES_LIST);
    return { success: true };
  }, "Failed to revoke coach status");
}
