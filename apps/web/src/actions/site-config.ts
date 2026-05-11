"use server";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";

/**
 * Read a site config value by key.
 */
export async function getSiteConfig<T = unknown>(
  key: string
): Promise<ActionResult<T | null>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data: (data?.value as T) ?? null };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to read config"),
    };
  }
}

/**
 * Set a site config value by key (upsert).
 */
export async function setSiteConfig(
  key: string,
  value: unknown
): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("site_config").upsert(
      {
        key,
        value: JSON.parse(JSON.stringify(value)),
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: "key" }
    );

    if (error) throw error;
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to save config"),
    };
  }
}
