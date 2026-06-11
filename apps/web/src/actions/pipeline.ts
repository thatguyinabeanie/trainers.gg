"use server";

/**
 * Admin server actions for the autonomous import pipeline monitor.
 *
 * All actions are gated by `isSiteAdmin()` and return `ActionResult<T>`.
 * Mutations use the service-role client (both rk9 and limitless schemas
 * require elevated access). Delete/exclude actions invalidate usage caches
 * for any affected format IDs.
 *
 * Config actions (toggle auto-import, batch size, cron cadence) are in a
 * separate file — see Task 3.4.
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
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Verify the caller is an authenticated site admin.
 *
 * @returns The caller's user ID when admin, `null` otherwise (not authed or not admin).
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
// Read actions
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

// =============================================================================
// Mutation actions — delete / exclude / recovery
// =============================================================================

/**
 * Cascade-purge a source event and all its child data.
 * Invalidates usage caches for any affected format IDs. Admin-only.
 */
export async function deleteEventAction(
  input: unknown
): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  const parsed = eventActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  try {
    const supabase = createServiceRoleClient();
    const { formats } = await deleteSourceEvent(
      supabase,
      parsed.data.source,
      parsed.data.sourceEventId
    );
    if (formats.length > 0) await invalidateUsageStatsCaches(formats);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

/**
 * Cascade-purge AND tombstone a source event so Sync never re-discovers it.
 * Invalidates usage caches for any affected format IDs. Admin-only.
 */
export async function excludeEventAction(
  input: unknown
): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  const parsed = excludeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  try {
    const supabase = createServiceRoleClient();
    const { formats } = await excludeSourceEvent(
      supabase,
      parsed.data.source,
      parsed.data.sourceEventId,
      parsed.data.reason ?? null,
      userId
    );
    if (formats.length > 0) await invalidateUsageStatsCaches(formats);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Exclude failed",
    };
  }
}

/**
 * Remove an import_exclusions tombstone to re-enable event discovery.
 * Admin-only.
 */
export async function clearExclusionAction(
  id: number
): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    await clearExclusion(supabase, id);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Clear failed",
    };
  }
}

/**
 * Recovery: reset stuck in-progress events back to queued.
 * Returns a per-source count of events reset. Admin-only.
 */
export async function resetStuckAction(): Promise<
  ActionResult<{ rk9: number; limitless: number }>
> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const data = await resetStuckEvents(supabase);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reset failed",
    };
  }
}

/**
 * Recovery: move failed events back to queued for a retry.
 * Returns a per-source count of events requeued. Admin-only.
 */
export async function requeueFailedAction(): Promise<
  ActionResult<{ rk9: number; limitless: number }>
> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  try {
    const supabase = createServiceRoleClient();
    const data = await requeueFailedEvents(supabase);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Requeue failed",
    };
  }
}

/**
 * "Import anyway": force a skipped or failed event back into the queue.
 * Clears any previous import_error so the worker starts fresh. Admin-only.
 */
export async function forceImportAction(
  input: unknown
): Promise<ActionResult<void>> {
  const userId = await requireAdmin();
  if (!userId) return { success: false, error: "Requires site admin" };
  const parsed = eventActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };
  try {
    const supabase = createServiceRoleClient();
    await forceImportEvent(
      supabase,
      parsed.data.source,
      parsed.data.sourceEventId
    );
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Force import failed",
    };
  }
}
