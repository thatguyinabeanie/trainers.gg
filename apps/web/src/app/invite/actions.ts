"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type InviteValidationResult =
  | { valid: true; email: string }
  | { valid: false; reason: "invalid" | "expired" | "used" };

/**
 * Validate a beta invite token.
 * Uses anon client since unauthenticated users need to validate tokens.
 */
export async function validateInviteToken(
  token: string
): Promise<InviteValidationResult> {
  if (!token || token.length < 10) {
    return { valid: false, reason: "invalid" };
  }

  try {
    const supabase = await createClient();

    const { data: invite, error } = await supabase
      .from("beta_invites")
      .select("email, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("Error validating invite token:", error);
      return { valid: false, reason: "invalid" };
    }

    if (!invite) {
      return { valid: false, reason: "invalid" };
    }

    if (invite.used_at) {
      return { valid: false, reason: "used" };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { valid: false, reason: "expired" };
    }

    return { valid: true, email: invite.email };
  } catch (err) {
    console.error("Error validating invite token:", err);
    return { valid: false, reason: "invalid" };
  }
}

/**
 * Mark an invite as used after the user successfully creates an account.
 * Uses service role client to bypass RLS (called during signup flow).
 */
export async function markInviteUsed(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("beta_invites")
      .update({
        used_at: new Date().toISOString(),
        converted_user_id: userId,
      })
      .eq("token", token)
      .is("used_at", null);

    if (error) {
      console.error("Error marking invite as used:", error);
      return { success: false, error: "Failed to mark invite as used" };
    }

    // Also update the waitlist entry if one exists for this email
    const { data: invite } = await supabase
      .from("beta_invites")
      .select("email")
      .eq("token", token)
      .maybeSingle();

    if (invite?.email) {
      await supabase
        .from("waitlist")
        .update({ converted_user_id: userId })
        .eq("email", invite.email);
    }

    return { success: true };
  } catch (err) {
    console.error("Error marking invite as used:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
