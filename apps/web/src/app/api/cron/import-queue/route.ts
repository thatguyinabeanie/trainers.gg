/**
 * Import Queue Cron — GET /api/cron/import-queue
 *
 * This route replaces the removed pg_cron pipeline (migration 20260511202236)
 * and the client-driven drain loop. Both Limitless and RK9 queue workers are
 * driven here on a 5-minute Vercel cron schedule.
 *
 * Hard truncation recovery: Vercel's maxDuration hard-kills this function at
 * 300 s. The workers are designed to tolerate mid-batch interruption via a
 * 10-minute lease / stale-recovery design — any in-flight batch is abandoned
 * and recovered on the next invocation. BUDGET_MS (~80% of maxDuration) gives
 * the current in-flight batch and the post-import compile step enough headroom
 * to finish cleanly before the hard cutoff fires.
 */

import { compileSourceTeamSlots } from "@trainers/supabase";

import { requireCronAuth } from "@/lib/cron-auth";
import { revalidateUsageStatsCaches } from "@/lib/cache-invalidation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { readSiteConfigValues } from "@/lib/site-config";
import { clamp } from "@/lib/utils";
import { processRk9Queue } from "@/lib/rk9/worker";
import { drainLimitlessQueue } from "@/lib/limitless/queue-worker";

// =============================================================================
// Constants
// =============================================================================

export const maxDuration = 300;

/** ~80% of maxDuration — leaves headroom for the in-flight batch + compile. */
const BUDGET_MS = 240_000;

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: Request): Promise<Response> {
  // Verify Vercel cron authorization. Fails closed if CRON_SECRET is unset.
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();

  // ---------------------------------------------------------------------------
  // Read site config values for both sources
  // ---------------------------------------------------------------------------
  const config = await readSiteConfigValues(supabase, [
    "limitless_backend_auto_import",
    "rk9_backend_auto_import",
    "limitless_batch_size",
    "rk9_max_teams_per_tick",
    "rk9_team_concurrency",
    "limitless_cron_interval_seconds",
    "rk9_cron_interval_seconds",
    "limitless_last_run_at",
    "rk9_last_run_at",
  ]);

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // ---------------------------------------------------------------------------
  // Per-source gating: check auto-import toggle + interval
  // ---------------------------------------------------------------------------

  const limitlessEnabled = config["limitless_backend_auto_import"] === true;
  const rk9Enabled = config["rk9_backend_auto_import"] === true;

  const limitlessIntervalSeconds =
    typeof config["limitless_cron_interval_seconds"] === "number"
      ? config["limitless_cron_interval_seconds"]
      : 300;

  const rk9IntervalSeconds =
    typeof config["rk9_cron_interval_seconds"] === "number"
      ? config["rk9_cron_interval_seconds"]
      : 60;

  const limitlessLastRunAt = config["limitless_last_run_at"];
  const rk9LastRunAt = config["rk9_last_run_at"];

  function isIntervalElapsed(
    lastRunAt: unknown,
    intervalSeconds: number
  ): boolean {
    if (lastRunAt === null || lastRunAt === undefined) return true;
    if (typeof lastRunAt !== "string") return true;
    const elapsed = (now - new Date(lastRunAt).getTime()) / 1000;
    return elapsed >= intervalSeconds;
  }

  const limitlessDue = limitlessEnabled
    ? isIntervalElapsed(limitlessLastRunAt, limitlessIntervalSeconds)
    : false;

  const rk9Due = rk9Enabled
    ? isIntervalElapsed(rk9LastRunAt, rk9IntervalSeconds)
    : false;

  // Compute elapsed seconds for skip-reason messages
  function elapsedSeconds(lastRunAt: unknown): number | null {
    if (lastRunAt === null || lastRunAt === undefined) return null;
    if (typeof lastRunAt !== "string") return null;
    return Math.round((now - new Date(lastRunAt).getTime()) / 1000);
  }

  // ---------------------------------------------------------------------------
  // Stamp last_run_at BEFORE doing work.
  //
  // This is a SOFT overlap guard — it prevents a second cron invocation
  // arriving within the interval window from running the same source twice.
  // The hard guarantee is row-level claim logic inside each worker (lease +
  // stale-recovery). The soft stamp here keeps back-to-back cron fires from
  // queueing duplicate scrapes before the first finishes.
  // ---------------------------------------------------------------------------

  async function stampLastRunAt(key: string): Promise<void> {
    const { error } = await supabase
      .from("site_config")
      .upsert(
        { key, value: nowIso, updated_at: nowIso },
        { onConflict: "key" }
      );
    if (error) {
      console.error(`[import-queue] failed to stamp ${key}`, error);
    }
  }

  const stampPromises: Promise<void>[] = [];
  if (limitlessDue) stampPromises.push(stampLastRunAt("limitless_last_run_at"));
  if (rk9Due) stampPromises.push(stampLastRunAt("rk9_last_run_at"));

  await Promise.all(stampPromises);

  // ---------------------------------------------------------------------------
  // Run both sources concurrently under a shared deadline.
  //
  // Each side resolves to either a result object or a skip descriptor so that
  // one source failing never loses the other's stats.
  // ---------------------------------------------------------------------------

  type LimitlessResult =
    | { processed: number; errors: number; remaining: number; passes: number }
    | { skipped: string }
    | { error: string };

  type Rk9Result =
    | {
        eventsTouched: number;
        teamsScraped: number;
        errors: number;
        remainingQueued: number;
      }
    | { skipped: string }
    | { error: string };

  const deadline = Date.now() + BUDGET_MS;

  // Run both sources concurrently. Each IIFE is declared as its own named
  // promise so TypeScript can infer the precise return type for each variable
  // without collapsing them into a union via the array form of Promise.all.
  const limitlessPromise: Promise<LimitlessResult> = (async () => {
    if (!limitlessEnabled) {
      return { skipped: "auto-import disabled" };
    }
    if (!limitlessDue) {
      const elapsed = elapsedSeconds(limitlessLastRunAt);
      return {
        skipped: `ran ${elapsed}s ago, interval ${limitlessIntervalSeconds}s`,
      };
    }
    // Optional: Limitless serves unauthenticated requests at a lower rate
    // limit, so a missing key degrades throughput rather than halting the
    // drain (the package-level fetch only sets the auth header when a key
    // is present).
    const apiKey = process.env.LIMITLESS_API_KEY;

    const batchSize = clamp(
      typeof config["limitless_batch_size"] === "number"
        ? config["limitless_batch_size"]
        : 20,
      1,
      50
    );

    try {
      return await drainLimitlessQueue(supabase, apiKey, batchSize, deadline);
    } catch (e) {
      // Generic label only — PostgrestError messages can carry schema/table
      // detail; the full error goes to server logs.
      console.error("[import-queue] limitless worker error:", e);
      return { error: "limitless worker failed — see server logs" };
    }
  })();

  const rk9Promise: Promise<Rk9Result> = (async () => {
    if (!rk9Enabled) {
      return { skipped: "auto-import disabled" };
    }
    if (!rk9Due) {
      const elapsed = elapsedSeconds(rk9LastRunAt);
      return {
        skipped: `ran ${elapsed}s ago, interval ${rk9IntervalSeconds}s`,
      };
    }

    const teamsPerTick = clamp(
      typeof config["rk9_max_teams_per_tick"] === "number"
        ? config["rk9_max_teams_per_tick"]
        : 100,
      1,
      200
    );

    const concurrency = clamp(
      typeof config["rk9_team_concurrency"] === "number"
        ? config["rk9_team_concurrency"]
        : 3,
      1,
      5
    );

    try {
      return await processRk9Queue(supabase, {
        deadline,
        teamsPerTick,
        concurrency,
      });
    } catch (e) {
      // Generic label only — full error goes to server logs.
      console.error("[import-queue] rk9 worker error:", e);
      return { error: "rk9 worker failed — see server logs" };
    }
  })();

  const [limitless, rk9] = await Promise.all([limitlessPromise, rk9Promise]);

  // ---------------------------------------------------------------------------
  // Post-step: compile usage stats and revalidate caches.
  //
  // CRITICAL: Neither import path writes to team_slots — that is handled here
  // as a post-step so the /data charts stay current. Without this step, newly
  // imported team data would be invisible to the usage stats pipeline until
  // a manual recompile.
  //
  // compileSourceTeamSlots is idempotent (DELETE + INSERT per event), so if
  // the function is hard-truncated mid-compile, the next cron invocation will
  // cleanly recompile the partial event. Compile errors are caught and included
  // in the response rather than 500ing — imports already succeeded and a
  // compile failure does not require re-importing. The next cron pass will retry
  // any uncompiled events automatically.
  // ---------------------------------------------------------------------------

  type CompileResult =
    | {
        limitless?: { eventsCompiled: number; formats: string[] };
        rk9?: { eventsCompiled: number; formats: string[] };
        revalidated: boolean;
      }
    | { error: string };

  let compile: CompileResult;

  try {
    const limitlessProcessed =
      "processed" in limitless ? limitless.processed : 0;
    const rk9EventsTouched = "eventsTouched" in rk9 ? rk9.eventsTouched : 0;

    const [limitlessCompile, rk9Compile] = await Promise.all([
      limitlessProcessed > 0
        ? compileSourceTeamSlots(supabase, "limitless")
        : null,
      rk9EventsTouched > 0 ? compileSourceTeamSlots(supabase, "rk9") : null,
    ]);

    const didCompile = limitlessCompile !== null || rk9Compile !== null;

    if (didCompile) {
      const allFormats = [
        ...(limitlessCompile?.formats ?? []),
        ...(rk9Compile?.formats ?? []),
      ];
      // Deduplicate formats before revalidating
      const uniqueFormats = [...new Set(allFormats)];
      revalidateUsageStatsCaches(uniqueFormats);
    }

    compile = {
      ...(limitlessCompile !== null ? { limitless: limitlessCompile } : {}),
      ...(rk9Compile !== null ? { rk9: rk9Compile } : {}),
      revalidated: didCompile,
    };
  } catch (e) {
    // Generic label only — full error goes to server logs.
    console.error("[import-queue] compile step error:", e);
    compile = { error: "compile step failed — see server logs" };
  }

  return Response.json({ limitless, rk9, compile, budgetMs: BUDGET_MS });
}
