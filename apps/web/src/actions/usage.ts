"use server";

import { unstable_cache } from "next/cache";

import { getErrorMessage } from "@trainers/utils";
import type { ActionResult } from "@trainers/validators";
import {
  computeUsageRollups,
  getSpeciesUsage,
  getSpeciesUsageDetail,
  type FormatUsageRow,
  type SpeciesUsagePeriod,
  type SpeciesUsageDetailParams,
} from "@trainers/supabase";
import { createStaticClient, createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { CacheTags } from "@/lib/cache";

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

// ---------------------------------------------------------------------------
// Public read: species usage detail
// ---------------------------------------------------------------------------

/**
 * Public (non-admin) server action to fetch trailing usage periods for a
 * species.  Data is public — all tournament usage stats are visible to
 * everyone — so this uses `createStaticClient()` wrapped in `unstable_cache`
 * for ISR caching.
 *
 * Cache revalidation: 3600s (1 hour).  Usage rollups run at most every few
 * hours, so 1-hour staleness is acceptable. The USAGE_STATS and per-format
 * tags can be used for on-demand invalidation after a rollup completes.
 */
export async function fetchSpeciesUsageDetail(
  params: SpeciesUsageDetailParams
): Promise<ActionResult<SpeciesUsagePeriod[]>> {
  try {
    const { format, species, source = "all", periodType = "week", limit = 12 } =
      params;

    const cacheKey = `usage-detail:${format}:${source}:${species}:${periodType}:${limit}`;

    const getCached = unstable_cache(
      async () => {
        // createStaticClient() — anonymous, no cookies — required inside
        // unstable_cache so the cached value is shared across all users.
        const supabase = createStaticClient();
        return getSpeciesUsageDetail(supabase, {
          format,
          species,
          source,
          periodType,
          limit,
        });
      },
      [cacheKey],
      {
        revalidate: 3600, // 1 hour
        tags: [CacheTags.USAGE_STATS, CacheTags.usageStats(format)],
      }
    );

    const data = await getCached();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch species usage detail"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: format-wide species ranking
// ---------------------------------------------------------------------------

/** Parameters for fetchFormatUsage. */
export interface FetchFormatUsageParams {
  /** Format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** Rollup source. Defaults to "all". */
  source?: string;
  /** Period granularity. Defaults to "week". */
  periodType?: "day" | "week" | "month";
}

/**
 * Public (non-admin) server action to fetch the latest-period species ranking
 * for a format.
 *
 * Returns every `FormatUsageRow` for the most-recent rollup bucket so the
 * species picker can show a `USG %` column for every species at once.
 *
 * Data is public — all tournament usage stats are visible to everyone — so
 * this uses `createStaticClient()` wrapped in `unstable_cache` for ISR
 * caching. Cache revalidation: 3600s (1 hour), matching `fetchSpeciesUsageDetail`.
 */
export async function fetchFormatUsage(
  params: FetchFormatUsageParams
): Promise<ActionResult<FormatUsageRow[]>> {
  try {
    const { format, source = "all", periodType = "week" } = params;

    const cacheKey = `usage-format:${format}:${source}:${periodType}`;

    const getCached = unstable_cache(
      async () => {
        const supabase = createStaticClient();
        return getSpeciesUsage(supabase, { format, source, periodType });
      },
      [cacheKey],
      {
        revalidate: 3600, // 1 hour — matches fetchSpeciesUsageDetail
        tags: [CacheTags.USAGE_STATS, CacheTags.usageStats(format)],
      }
    );

    const data = await getCached();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch format usage"),
    };
  }
}
