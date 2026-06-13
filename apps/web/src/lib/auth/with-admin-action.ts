"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin, requireAdminWithSudo } from "./require-admin";
import type { ServiceRoleClient } from "@trainers/supabase";

// Shared return type for data-less admin server actions
export type ActionResult = { success: boolean; error?: string };

/**
 * Wraps a read-only admin server action with authentication and role check only.
 * No sudo step-up is required — use this for display reads (e.g. listing feature
 * flags or announcements) where the admin COOKIE already gated the page.
 *
 * - Calls `requireAdmin()` to verify auth + site_admin role (no sudo)
 * - Creates a service-role Supabase client (bypasses RLS)
 * - Catches errors and logs them with the provided `errorMessage`
 */
export async function withAdminReadAction<R extends { success: boolean }>(
  action: (supabase: ServiceRoleClient, adminUserId: string) => Promise<R>,
  errorMessage = "An unexpected error occurred"
): Promise<R | { success: false; error: string }> {
  try {
    const adminCheck = await requireAdmin();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    return await action(supabase, adminCheck.userId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("%s: %s", errorMessage, detail, err);
    return { success: false, error: errorMessage };
  }
}

/**
 * Wraps an admin mutation with authentication, sudo verification,
 * and error handling. Provides the service-role Supabase client
 * and the admin's user ID to the action callback.
 *
 * - Calls `requireAdminWithSudo()` to verify auth + site_admin role + sudo session
 * - Creates a service-role Supabase client (bypasses RLS)
 * - Catches errors and logs them with the provided `errorMessage`
 *
 * Generic over the callback's result shape `R`, so callers may return either a
 * data-less `{ success: true }` or a data-carrying `{ success: true; data }`
 * (e.g. the validators `ActionResult<T>` union) without a cast. On auth/sudo
 * failure or a thrown error it returns `{ success: false, error }`.
 *
 * Zod validation should happen BEFORE calling this helper, so that
 * invalid input is rejected before the admin/sudo check runs.
 */
export async function withAdminAction<R extends { success: boolean }>(
  action: (supabase: ServiceRoleClient, adminUserId: string) => Promise<R>,
  errorMessage = "An unexpected error occurred"
): Promise<R | { success: false; error: string }> {
  try {
    const adminCheck = await requireAdminWithSudo();
    if ("success" in adminCheck) return adminCheck;

    const supabase = createServiceRoleClient();
    return await action(supabase, adminCheck.userId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("%s: %s", errorMessage, detail, err);
    return { success: false, error: errorMessage };
  }
}
