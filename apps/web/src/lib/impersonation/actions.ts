"use server";

import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import { startImpersonation, endImpersonation } from "@trainers/supabase";
import {
  setImpersonationCookie,
  clearImpersonationCookie,
  getImpersonationTarget,
} from "./server";

/**
 * Start impersonating a user. Requires active sudo mode.
 */
export async function startImpersonationAction(
  targetUserId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;
    const { userId: adminUserId } = adminCheck;

    // Cannot impersonate yourself
    if (targetUserId === adminUserId) {
      return { success: false, error: "Cannot impersonate yourself" };
    }

    const supabase = createServiceRoleClient();

    // Verify target user exists
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // End any existing active impersonation sessions for this admin.
    // Uses a direct DB query (not cookie-dependent) so orphaned sessions
    // are cleaned up even if the cookie was cleared or expired.
    const { error: endError } = await supabase
      .from("impersonation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("admin_user_id", adminUserId)
      .is("ended_at", null);

    if (endError) {
      console.error("Error ending previous impersonation session:", endError);
      return {
        success: false,
        error: "Failed to end previous impersonation session",
      };
    }

    // Get request metadata
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Create impersonation session + audit log via shared package function
    try {
      const session = await startImpersonation(
        supabase,
        adminUserId,
        targetUserId,
        reason,
        ipAddress,
        userAgent
      );

      // Set cookie
      await setImpersonationCookie(session.id);
    } catch (startError) {
      console.error("Error creating impersonation session:", startError);
      return { success: false, error: "Failed to start impersonation" };
    }

    return { success: true };
  } catch (err) {
    console.error("Error starting impersonation:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * End the current impersonation session.
 */
export async function endImpersonationAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;
    const { userId: adminUserId } = adminCheck;

    const target = await getImpersonationTarget();
    if (!target) {
      // No active session, just clear cookie
      await clearImpersonationCookie();
      return { success: true };
    }

    const supabase = createServiceRoleClient();

    // End the session + audit log via shared package function
    try {
      await endImpersonation(supabase, adminUserId);
    } catch (endError) {
      console.error("Error ending impersonation session:", endError);
      return { success: false, error: "Failed to end impersonation session" };
    }

    // Only clear cookie on success
    await clearImpersonationCookie();

    return { success: true };
  } catch (err) {
    console.error("Error ending impersonation:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
