"use server";

import { createServiceRoleClient, getUser } from "@/lib/supabase/server";

export type InviteValidationResult =
  | { valid: true; email: string }
  | { valid: false; reason: "invalid" | "expired" | "used" };

/**
 * Validate a beta invite token.
 * Uses service role client to bypass RLS — this is a trusted server-side
 * operation, and the new RLS policies restrict authenticated non-admin users
 * from reading the table.
 */
export async function validateInviteToken(
  token: string
): Promise<InviteValidationResult> {
  if (!token || token.length < 10) {
    return { valid: false, reason: "invalid" };
  }

  try {
    const supabase = createServiceRoleClient();

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
 *
 * Security: Verifies the caller is authenticated and matches the userId parameter.
 * Also verifies the user's email matches the invite's email to prevent
 * email substitution attacks (readOnly on the client is only a UI constraint).
 */
export async function markInviteUsed(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the caller is the user being registered
    const currentUser = await getUser();
    if (!currentUser || currentUser.id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = createServiceRoleClient();

    // Fetch the invite first to verify email binding
    const { data: invite } = await supabase
      .from("beta_invites")
      .select("email")
      .eq("token", token)
      .is("used_at", null)
      .maybeSingle();

    if (!invite) {
      return { success: false, error: "Invalid or already used token" };
    }

    // Verify the user's email matches the invite email
    if (currentUser.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return { success: false, error: "Email mismatch" };
    }

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
    if (invite.email) {
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
