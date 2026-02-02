"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const EMAIL_DELIVERY_FAILED = "EMAIL_DELIVERY_FAILED";

/**
 * Send a beta invite to an email address.
 * Calls the send-invite edge function which handles token generation,
 * DB insertion, and email delivery via Resend.
 */
export async function sendBetaInvite(
  email: string
): Promise<{
  success: boolean;
  error?: string;
  warning?: string;
  code?: string;
}> {
  try {
    const supabase = await createClient();

    // Get the current session for the auth token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        success: false,
        error: "Not authenticated",
        code: "UNAUTHORIZED",
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return {
        success: false,
        error: "Configuration error",
        code: "CONFIG_ERROR",
      };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const result = await response.json();

    if (!result.success && result.code !== EMAIL_DELIVERY_FAILED) {
      return {
        success: false,
        error: result.error || "Failed to send invite",
        code: result.code,
      };
    }

    return { success: true, warning: result.warning };
  } catch (err) {
    console.error("Error sending beta invite:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Resend a beta invite email.
 * Revokes the old invite and creates a new one for the same email.
 */
export async function resendBetaInvite(
  inviteId: number,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();

    await supabase.from("beta_invites").delete().eq("id", inviteId);

    // Send a new invite
    return await sendBetaInvite(email);
  } catch (err) {
    console.error("Error resending beta invite:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Revoke (delete) a beta invite.
 */
export async function revokeBetaInvite(
  inviteId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("beta_invites")
      .delete()
      .eq("id", inviteId);

    if (error) {
      console.error("Error revoking invite:", error);
      return { success: false, error: "Failed to revoke invite" };
    }

    return { success: true };
  } catch (err) {
    console.error("Error revoking beta invite:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
