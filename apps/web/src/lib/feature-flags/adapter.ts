import type { Adapter } from "flags";
import { dedupe } from "flags/next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@trainers/supabase";

/**
 * Cached Supabase feature flag lookup, deduped per request.
 *
 * Uses the Flags SDK's `dedupe` helper so that multiple flags
 * evaluated in the same request only trigger one DB call per key.
 *
 * RLS audit #6: the `feature_flags` table SELECT is locked to site admins,
 * so flag evaluation reads via the service-role client (RLS bypass). This is
 * safe because the adapter only ever reads the flags table — no user-scoped
 * data — and runs server-side only (RSC / route handlers, never edge
 * middleware). Only the flag read bypasses RLS.
 */
const getFlag = dedupe(async (key: string) => {
  const supabase = createServiceRoleClient();
  return getFeatureFlag(supabase, key);
});

/**
 * Custom Vercel Flags SDK adapter backed by the Supabase `feature_flags` table.
 *
 * - `decide` reads the flag's `enabled` value from the database
 * - `origin` points to the admin config page for managing flags
 */
export const supabaseAdapter: Adapter<boolean, undefined> = {
  async decide({ key }) {
    try {
      const flag = await getFlag(key);
      return flag?.enabled ?? false;
    } catch (err) {
      console.error(`[feature-flags] Failed to evaluate flag "${key}":`, err);
      return false;
    }
  },

  origin: "/admin/config",
};
