"use server";

/**
 * Admin server actions for the autonomous import pipeline monitor.
 *
 * MUTATING actions are gated by `withAdminAction()` — which enforces an active
 * sudo session in addition to the site-admin role check — so high-impact
 * pipeline operations (delete, exclude, recovery, config changes) require
 * explicit sudo elevation.
 *
 * READ-ONLY actions (`get*`) are gated by `requireAdmin()` (role only) because
 * they do not mutate state and do not warrant the overhead of a sudo check.
 *
 * Mutations use the service-role client (both rk9 and limitless schemas
 * require elevated access). Delete/exclude actions invalidate usage caches
 * for any affected format IDs.
 */

import {
  getPipelineMonitor,
  getImportExclusions,
  type PipelineMonitor,
  type ImportExclusion,
} from "@trainers/supabase/queries";
import {
  deleteSourceEvent,
  excludeSourceEvent,
  clearExclusion,
  resetStuckEvents,
  requeueFailedEvents,
  forceImportEvent,
} from "@trainers/supabase/mutations";
import { z } from "@trainers/validators";
import { type ActionResult } from "@trainers/validators";

import { invalidateUsageStatsCaches } from "@/lib/cache-invalidation";
import {
  createClient,
  createServiceRoleClient,
  getUserId,
} from "@/lib/supabase/server";
import { withAdminAction } from "@/lib/auth/with-admin-action";
import { isSiteAdmin } from "@/lib/sudo/server";

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Verify the caller is an authenticated site admin (role check only).
 * Used by READ-ONLY actions that don't require sudo elevation.
 *
 * @returns The caller's user ID when admin, `null` otherwise.
 */
async function requireAdmin(): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const admin = await isSiteAdmin();
  return admin ? userId : null;
}

// =============================================================================
// Zod schemas for input validation
// =============================================================================

const sourceSchema = z.enum(["rk9", "limitless"]);

const eventActionSchema = z.object({
  source: sourceSchema,
  sourceEventId: z.string().min(1),
});

const excludeSchema = eventActionSchema.extend({
  reason: z.string().max(500).nullable().optional(),
});

// =============================================================================
// Read actions — requireAdmin() only (no sudo required)
// =============================================================================

/**
 * Load the unified pipeline event list (RK9 + Limitless) plus status counts.
 * Admin-only.
 */
export async function getPipelineMonitorAction(): Promise<
  ActionResult<PipelineMonitor>
> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const data = await getPipelineMonitor(supabase);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load monitor",
    };
  }
}

/**
 * Load all active import exclusion tombstones (for the Config exclusions view).
 * Admin-only.
 */
export async function getImportExclusionsAction(): Promise<
  ActionResult<ImportExclusion[]>
> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const data = await getImportExclusions(supabase);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load exclusions",
    };
  }
}

/**
 * Read the two pipeline config keys from site_config.
 * Returns { pipelineEnabled, limitlessBatchSize }. Admin-only.
 */
export async function getPipelineConfigAction(): Promise<
  ActionResult<{ pipelineEnabled: boolean; limitlessBatchSize: number }>
> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("site_config")
      .select("key, value")
      .in("key", ["pipeline_enabled", "limitless_import_batch_size"]);
    if (error) throw new Error(error.message);
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    const rawBatchSize = Number(map.get("limitless_import_batch_size") ?? 25);
    // Validate the stored value is a finite integer within the 1..100 contract
    // enforced by setLimitlessBatchSizeAction. "abc" → NaN, 0/999 → out of range —
    // all fall back to the default (25) so the returned config is always well-formed.
    const limitlessBatchSize =
      Number.isFinite(rawBatchSize) &&
      Number.isInteger(rawBatchSize) &&
      rawBatchSize >= 1 &&
      rawBatchSize <= 100
        ? rawBatchSize
        : 25;
    return {
      success: true,
      data: {
        pipelineEnabled: map.get("pipeline_enabled") === true,
        limitlessBatchSize,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load config",
    };
  }
}

/**
 * Read the live cron schedules for the three import-tick jobs via the
 * admin_get_cron_schedules SECURITY DEFINER RPC.
 *
 * Returns a { sync, import, compile } shape so the Config tab can seed its
 * schedule inputs directly. Falls back to the seeded defaults when pg_cron
 * is absent (local dev).
 *
 * IMPORTANT: uses the AUTHENTICATED server client (`createClient()`) — not
 * the service-role client — so the RPC's auth.uid() admin check is meaningful.
 * Admin-only.
 */
export async function getCronSchedulesAction(): Promise<
  ActionResult<{ sync: string; import: string; compile: string }>
> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    // Authenticated client — required so the RPC's auth.uid() check is meaningful.
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_get_cron_schedules");
    if (error) throw new Error(error.message);
    const byJob = new Map((data ?? []).map((r) => [r.job_name, r.schedule]));
    return {
      success: true,
      data: {
        sync: byJob.get("import-tick-sync") ?? "*/5 * * * *",
        import: byJob.get("import-tick-import") ?? "* * * * *",
        compile: byJob.get("import-tick-compile") ?? "*/2 * * * *",
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load schedules",
    };
  }
}

// =============================================================================
// Mutation actions — withAdminAction() (role + sudo required)
// =============================================================================

const cronJobSchema = z.enum([
  "import-tick-sync",
  "import-tick-import",
  "import-tick-compile",
]);

const alterCronSchema = z.object({
  job: cronJobSchema,
  // 5 whitespace-separated fields; only digits, *, , - / characters allowed —
  // mirrors the DB RPC guard.
  schedule: z
    .string()
    .regex(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/, "Must have 5 fields")
    .regex(/^[0-9*,/\s-]+$/, "Illegal characters"),
});

/**
 * Cascade-purge a source event and all its child data.
 * Invalidates usage caches for any affected format IDs.
 * Requires site admin + active sudo session.
 */
export async function deleteEventAction(
  input: unknown
): Promise<ActionResult<void>> {
  const parsed = eventActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  return withAdminAction(async (supabase) => {
    const { formats } = await deleteSourceEvent(
      supabase,
      parsed.data.source,
      parsed.data.sourceEventId
    );
    // Best-effort: DB delete already committed — don't let a cache failure
    // falsely report the delete as failed.
    if (formats.length > 0) {
      try {
        await invalidateUsageStatsCaches(formats);
      } catch (cacheError) {
        console.error(
          "[deleteEventAction] cache invalidation failed after committed delete:",
          cacheError
        );
      }
    }
    return { success: true, data: undefined };
  }, "Delete failed");
}

/**
 * Cascade-purge AND tombstone a source event so Sync never re-discovers it.
 * Invalidates usage caches for any affected format IDs.
 * Requires site admin + active sudo session.
 */
export async function excludeEventAction(
  input: unknown
): Promise<ActionResult<void>> {
  const parsed = excludeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  return withAdminAction(async (supabase, adminUserId) => {
    const { formats } = await excludeSourceEvent(
      supabase,
      parsed.data.source,
      parsed.data.sourceEventId,
      parsed.data.reason ?? null,
      adminUserId
    );
    // Best-effort: DB exclude already committed — don't let a cache failure
    // falsely report the exclude as failed.
    if (formats.length > 0) {
      try {
        await invalidateUsageStatsCaches(formats);
      } catch (cacheError) {
        console.error(
          "[excludeEventAction] cache invalidation failed after committed exclude:",
          cacheError
        );
      }
    }
    return { success: true, data: undefined };
  }, "Exclude failed");
}

/**
 * Remove an import_exclusions tombstone to re-enable event discovery.
 * Requires site admin + active sudo session.
 */
export async function clearExclusionAction(
  input: unknown
): Promise<ActionResult<void>> {
  const parsed = z.number().int().positive().safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  return withAdminAction(async (supabase) => {
    await clearExclusion(supabase, parsed.data);
    return { success: true, data: undefined };
  }, "Clear failed");
}

/**
 * Recovery: reset stuck in-progress events back to queued.
 * Returns a per-source count of events reset.
 * Requires site admin + active sudo session.
 */
export async function resetStuckAction(): Promise<
  ActionResult<{ rk9: number; limitless: number }>
> {
  return withAdminAction(async (supabase) => {
    const data = await resetStuckEvents(supabase);
    return { success: true, data };
  }, "Reset failed");
}

/**
 * Recovery: move failed events back to queued for a retry.
 * Returns a per-source count of events requeued.
 * Requires site admin + active sudo session.
 */
export async function requeueFailedAction(): Promise<
  ActionResult<{ rk9: number; limitless: number }>
> {
  return withAdminAction(async (supabase) => {
    const data = await requeueFailedEvents(supabase);
    return { success: true, data };
  }, "Requeue failed");
}

/**
 * "Import anyway": force a skipped or failed event back into the queue.
 * Clears any previous import_error so the worker starts fresh.
 * Requires site admin + active sudo session.
 */
export async function forceImportAction(
  input: unknown
): Promise<ActionResult<void>> {
  const parsed = eventActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  return withAdminAction(async (supabase) => {
    await forceImportEvent(
      supabase,
      parsed.data.source,
      parsed.data.sourceEventId
    );
    return { success: true, data: undefined };
  }, "Force import failed");
}

/**
 * Toggle the pipeline_enabled flag in site_config.
 * Requires site admin + active sudo session.
 */
export async function setPipelineEnabledAction(
  input: unknown
): Promise<ActionResult<void>> {
  const parsed = z.boolean().safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  return withAdminAction(async (supabase, adminUserId) => {
    const { error } = await supabase
      .from("site_config")
      .upsert(
        {
          key: "pipeline_enabled",
          value: parsed.data,
          updated_by: adminUserId,
        },
        { onConflict: "key" }
      );
    if (error) throw new Error(error.message);
    return { success: true, data: undefined };
  }, "Update failed");
}

/**
 * Set the limitless_import_batch_size config key (1–100).
 * Requires site admin + active sudo session.
 */
export async function setLimitlessBatchSizeAction(
  size: number
): Promise<ActionResult<void>> {
  const parsed = z.number().int().min(1).max(100).safeParse(size);
  if (!parsed.success)
    return { success: false, error: "Batch size must be 1–100" };
  return withAdminAction(async (supabase, adminUserId) => {
    const { error } = await supabase.from("site_config").upsert(
      {
        key: "limitless_import_batch_size",
        value: parsed.data,
        updated_by: adminUserId,
      },
      { onConflict: "key" }
    );
    if (error) throw new Error(error.message);
    return { success: true, data: undefined };
  }, "Update failed");
}

/**
 * Update the cron schedule for one of the three import-tick jobs via the
 * admin_alter_cron_schedule SECURITY DEFINER RPC.
 *
 * IMPORTANT: uses the AUTHENTICATED server client (`createClient()`) — not
 * the service-role client provided by `withAdminAction`. The RPC re-checks
 * `auth.uid()` against role_id=1 as defense-in-depth. The service-role
 * client has no auth.uid(), which causes the RPC's own guard to raise
 * "Not authorized".
 *
 * Requires site admin + active sudo session.
 */
export async function alterCronScheduleAction(
  input: unknown
): Promise<ActionResult<void>> {
  const parsed = alterCronSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  return withAdminAction(async (_supabase) => {
    // Authenticated client — required so the RPC's auth.uid() check is meaningful.
    // The service-role client provided by withAdminAction is intentionally unused here.
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_alter_cron_schedule", {
      p_job_name: parsed.data.job,
      p_schedule: parsed.data.schedule,
    });
    if (error) throw new Error(error.message);
    return { success: true, data: undefined };
  }, "Schedule update failed");
}
