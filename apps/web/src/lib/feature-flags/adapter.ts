import type { Adapter } from "flags";
import { dedupe } from "flags/next";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@trainers/supabase";

/**
 * Cached Supabase feature flag lookup, deduped per request.
 *
 * Uses the Flags SDK's `dedupe` helper so that multiple flags
 * evaluated in the same request only trigger one DB call per key.
 */
const getFlag = dedupe(async (key: string) => {
  const supabase = await createClient();
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
    } catch {
      // If the DB call fails, fall back to disabled
      return false;
    }
  },

  origin: "/admin/config",
};
