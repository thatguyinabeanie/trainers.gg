"use server";

import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
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

    // End any existing impersonation session first
    const existing = await getImpersonationTarget();
    if (existing) {
      await supabase
        .from("impersonation_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", existing.sessionId);
    }

    // Get request metadata
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Create impersonation session
    const { data: session, error: sessionError } = await supabase
      .from("impersonation_sessions")
      .insert({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        reason: reason || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating impersonation session:", sessionError);
      return { success: false, error: "Failed to start impersonation" };
    }

    // Log to audit
    await supabase.from("audit_log").insert({
      action: "admin.impersonation_started" as const,
      actor_user_id: adminUserId,
      metadata: {
        session_id: session.id,
        target_user_id: targetUserId,
        target_username: targetUser.username,
        reason,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // Set cookie
    await setImpersonationCookie(session.id);

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

    // End the session
    const { data: session, error: sessionError } = await supabase
      .from("impersonation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", target.sessionId)
      .select()
      .single();

    if (sessionError) {
      console.error("Error ending impersonation session:", sessionError);
    }

    // Log to audit
    await supabase.from("audit_log").insert({
      action: "admin.impersonation_ended" as const,
      actor_user_id: adminUserId,
      metadata: {
        session_id: target.sessionId,
        target_user_id: target.targetUserId,
        duration_seconds: session
          ? Math.floor(
              (new Date(session.ended_at!).getTime() -
                new Date(session.started_at).getTime()) /
                1000
            )
          : undefined,
      },
    });

    // Clear cookie
    await clearImpersonationCookie();

    return { success: true };
  } catch (err) {
    console.error("Error ending impersonation:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
