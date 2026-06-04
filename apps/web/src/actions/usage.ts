"use server";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import { computeUsageRollups } from "@trainers/supabase";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";

// ---------------------------------------------------------------------------
// Usage rollup worker
// ---------------------------------------------------------------------------

/** Keys read from site_config to govern rollup scheduling. */
const CONFIG_KEYS = [
  "usage_rollup_enabled",
  "usage_rollup_interval_seconds",
  "usage_rollup_last_run_at",
] as const;

type RollupResult = {
  ran: boolean;
  formatsProcessed: number;
  bucketsWritten: number;
};

/**
 * Trigger the usage-stats rollup worker.
 *
 * The worker reads three site_config rows via the service-role client
 * (bypasses RLS — the getSiteConfig server action is admin-gated and intended
 * for UI reads, not internal worker use). Smart-skip logic:
 *
 *  - If `force` is true → skip all checks and compute immediately.
 *  - If `usage_rollup_enabled` is false → skip (returns ran: false).
 *  - If `usage_rollup_last_run_at` is set and `now − last_run_at < interval_seconds` → skip.
 *
 * On success the worker upserts `usage_rollup_last_run_at` to the current
 * timestamp so the next scheduled invocation respects the cooldown window.
 */
export async function triggerUsageRollup(
  opts?: { force?: boolean }
): Promise<ActionResult<RollupResult>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const force = opts?.force ?? false;
    const supabase = createServiceRoleClient();

    if (!force) {
      // Read the three rollup-governance keys in one round-trip.
      const { data: configRows, error: configErr } = await supabase
        .from("site_config")
        .select("key, value")
        .in("key", CONFIG_KEYS);

      if (configErr) throw configErr;

      const cfg = new Map<string, unknown>(
        (configRows ?? []).map((r) => [r.key, r.value])
      );

      const enabled = cfg.get("usage_rollup_enabled") as boolean | null | undefined;
      if (enabled === false) {
        // Rollup is administratively disabled.
        return {
          success: true,
          data: { ran: false, formatsProcessed: 0, bucketsWritten: 0 },
        };
      }

      const intervalSeconds = cfg.get("usage_rollup_interval_seconds") as
        | number
        | null
        | undefined;
      const lastRunAt = cfg.get("usage_rollup_last_run_at") as
        | string
        | null
        | undefined;

      if (
        lastRunAt &&
        typeof intervalSeconds === "number" &&
        intervalSeconds > 0
      ) {
        const elapsed = (Date.now() - new Date(lastRunAt).getTime()) / 1000;
        if (elapsed < intervalSeconds) {
          // Still within the cooldown window.
          return {
            success: true,
            data: { ran: false, formatsProcessed: 0, bucketsWritten: 0 },
          };
        }
      }
    }

    // Run the rollup.
    const result = await computeUsageRollups(supabase);

    // Stamp the run timestamp so the next call respects the cooldown.
    const { error: upsertErr } = await supabase.from("site_config").upsert(
      {
        key: "usage_rollup_last_run_at",
        value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: "key" }
    );
    if (upsertErr) {
      // Log but don't fail — the rollup itself succeeded; only the timestamp
      // write failed. A missed timestamp means we might recompute sooner than
      // desired, which is harmless.
      console.error(
        `[usage] failed to upsert usage_rollup_last_run_at: ${upsertErr.message}`
      );
    }

    return {
      success: true,
      data: {
        ran: true,
        formatsProcessed: result.formatsProcessed,
        bucketsWritten: result.bucketsWritten,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Usage rollup failed"),
    };
  }
}
