"use server";

/**
 * Admin "Process Now" server action for the import queue panel.
 *
 * Runs both the Limitless and RK9 import queue workers in a single call,
 * returning combined progress stats for immediate UI feedback. Unlike the
 * 5-minute cron route, this action:
 *
 * - Ignores `limitless_backend_auto_import` / `rk9_backend_auto_import` flags —
 *   it's an explicit human action, not an automated run.
 * - Does not update `limitless_last_run_at` / `rk9_last_run_at` — those are
 *   cron-only bookmarks for interval gating.
 * - Uses a 50 s deadline (Vercel Serverless function limit for hobby/pro plans
 *   is 60 s; 50 s gives headroom for auth checks and the compile step).
 */

import { compileSourceTeamSlots } from "@trainers/supabase";
import { getErrorMessage } from "@trainers/utils";
import { type ActionResult } from "@trainers/validators";

import { invalidateUsageStatsCaches } from "@/lib/cache-invalidation";
import { processImportQueue } from "@/lib/limitless";
import { processRk9Queue } from "@/lib/rk9/worker";
import { readSiteConfigValues } from "@/lib/site-config";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";

// =============================================================================
// Constants
// =============================================================================

/** ~50 s budget — leaves headroom for auth + compile before Vercel kills the fn. */
const ADMIN_DEADLINE_MS = 50_000;

// =============================================================================
// Helpers
// =============================================================================

/** Clamp a value between min and max (inclusive). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// =============================================================================
// Action
// =============================================================================

/**
 * Process both import queues immediately — admin "Process now" button.
 *
 * Runs Limitless and RK9 workers concurrently under a 50 s deadline.
 * Each side is independently try/caught so one failure does not suppress
 * the other's stats.
 *
 * After processing, if either source imported new data the function
 * compiles team slots (`compileSourceTeamSlots`) and busts the usage stats
 * cache, exactly as the cron route does.
 *
 * The Limitless API key is optional — unauthenticated requests work at a
 * lower rate limit, so a missing key degrades throughput only.
 */
export async function processImportQueuesNow(): Promise<
  ActionResult<{
    limitless: { processed: number; errors: number; remaining: number };
    rk9: {
      eventsTouched: number;
      teamsScraped: number;
      errors: number;
      remainingQueued: number;
    };
  }>
> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const supabase = createServiceRoleClient();
    const deadline = Date.now() + ADMIN_DEADLINE_MS;

    // Read config for both sources in one round-trip (no auth session needed —
    // we use readSiteConfigValues with a service-role client, same as the cron route).
    const config = await readSiteConfigValues(supabase, [
      "limitless_batch_size",
      "rk9_max_teams_per_tick",
      "rk9_team_concurrency",
    ]);

    const limitlessBatchSize = clamp(
      typeof config["limitless_batch_size"] === "number"
        ? config["limitless_batch_size"]
        : 20,
      1,
      50
    );

    const rk9TeamsPerTick = clamp(
      typeof config["rk9_max_teams_per_tick"] === "number"
        ? config["rk9_max_teams_per_tick"]
        : 100,
      1,
      200
    );

    const rk9Concurrency = clamp(
      typeof config["rk9_team_concurrency"] === "number"
        ? config["rk9_team_concurrency"]
        : 3,
      1,
      5
    );

    // ---------------------------------------------------------------------------
    // Run both sources concurrently. Each side is independently try/caught.
    // On failure: zeros + 1 error so the caller sees something went wrong.
    // ---------------------------------------------------------------------------

    type LimitlessStats = {
      processed: number;
      errors: number;
      remaining: number;
    };
    type Rk9Stats = {
      eventsTouched: number;
      teamsScraped: number;
      errors: number;
      remainingQueued: number;
    };

    const limitlessPromise: Promise<LimitlessStats> = (async () => {
      // Optional: Limitless serves unauthenticated requests at a lower rate
      // limit, so a missing key degrades throughput rather than skipping the
      // pass (the package-level fetch only sets the header when present).
      const apiKey = process.env.LIMITLESS_API_KEY;
      try {
        const result = await processImportQueue(
          supabase,
          apiKey,
          limitlessBatchSize
        );
        return {
          processed: result.totalProcessed,
          errors: result.totalErrors,
          remaining: result.remaining,
        };
      } catch (e) {
        console.error("[processImportQueuesNow] limitless error:", e);
        return { processed: 0, errors: 1, remaining: 0 };
      }
    })();

    const rk9Promise: Promise<Rk9Stats> = (async () => {
      try {
        const result = await processRk9Queue(supabase, {
          deadline,
          teamsPerTick: rk9TeamsPerTick,
          concurrency: rk9Concurrency,
        });
        return {
          eventsTouched: result.eventsTouched,
          teamsScraped: result.teamsScraped,
          errors: result.errors,
          remainingQueued: result.remainingQueued,
        };
      } catch (e) {
        console.error("[processImportQueuesNow] rk9 error:", e);
        return {
          eventsTouched: 0,
          teamsScraped: 0,
          errors: 1,
          remainingQueued: 0,
        };
      }
    })();

    const [limitless, rk9] = await Promise.all([limitlessPromise, rk9Promise]);

    // If both sides failed with zero output, propagate a combined error message.
    const bothFailed =
      limitless.processed === 0 &&
      limitless.errors > 0 &&
      rk9.eventsTouched === 0 &&
      rk9.errors > 0;

    // ---------------------------------------------------------------------------
    // Post-step: compile team slots + bust usage caches, mirroring the cron route.
    //
    // Using invalidateUsageStatsCaches (updateTag) because this is a Server Action.
    // ---------------------------------------------------------------------------

    try {
      const [limitlessCompile, rk9Compile] = await Promise.all([
        limitless.processed > 0
          ? compileSourceTeamSlots(supabase, "limitless")
          : null,
        rk9.eventsTouched > 0 ? compileSourceTeamSlots(supabase, "rk9") : null,
      ]);

      if (limitlessCompile !== null || rk9Compile !== null) {
        const allFormats = [
          ...(limitlessCompile?.formats ?? []),
          ...(rk9Compile?.formats ?? []),
        ];
        const uniqueFormats = [...new Set(allFormats)];
        invalidateUsageStatsCaches(uniqueFormats);
      }
    } catch (compileErr) {
      // Compile errors are non-fatal — imports succeeded. The next cron pass
      // will recompile any skipped events. Log and continue.
      console.error("[processImportQueuesNow] compile step error:", compileErr);
    }

    if (bothFailed) {
      return {
        success: false,
        error: "Both import workers failed — check server logs for details",
      };
    }

    return { success: true, data: { limitless, rk9 } };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to process import queues"),
    };
  }
}
