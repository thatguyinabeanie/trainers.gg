import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@trainers/supabase";

/**
 * Check if maintenance mode is enabled, considering both the
 * environment variable (fast, sync) and the database feature flag (async).
 *
 * The env var takes priority as an override. If it's not set, the
 * database flag is checked.
 *
 * This module is server-only — use `isMaintenanceModeEnabled` from
 * `@/lib/maintenance` for client-safe sync checks.
 */
export async function isMaintenanceModeEnabledAsync(): Promise<boolean> {
  // Env var is an instant override — if set, use it
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") {
    return true;
  }

  // Check the database feature flag
  try {
    const supabase = await createClient();
    return await isFeatureEnabled(supabase, "maintenance_mode");
  } catch (err) {
    console.error("[maintenance] Failed to check DB feature flag:", err);
    return false;
  }
}
