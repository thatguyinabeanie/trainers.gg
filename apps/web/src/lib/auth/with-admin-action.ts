"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminWithSudo } from "./require-admin";
import type { TypedClient } from "@trainers/supabase";

// Shared return type for all admin server actions
export type ActionResult = { success: boolean; error?: string };

/**
 * Wraps an admin mutation with authentication, sudo verification,
 * and error handling. Provides the service-role Supabase client
 * and the admin's user ID to the action callback.
 *
 * - Calls `requireAdminWithSudo()` to verify auth + site_admin role + sudo session
 * - Creates a service-role Supabase client (bypasses RLS)
 * - Catches errors and logs them with the provided `errorMessage`
 *
 * Zod validation should happen BEFORE calling this helper, so that
 * invalid input is rejected before the admin/sudo check runs.
 */
export async function withAdminAction(
  action: (supabase: TypedClient, adminUserId: string) => Promise<ActionResult>,
  errorMessage = "An unexpected error occurred"
): Promise<ActionResult> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    return await action(supabase, adminCheck.userId);
  } catch (err) {
    console.error("%s", errorMessage, err);
    return { success: false, error: errorMessage };
  }
}
