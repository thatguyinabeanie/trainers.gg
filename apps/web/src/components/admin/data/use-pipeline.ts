"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type PipelineEvent,
  type PipelineMonitor,
} from "@trainers/supabase/queries";

import {
  deleteEventAction,
  excludeEventAction,
  forceImportAction,
  getPipelineMonitorAction,
  requeueFailedAction,
  resetStuckAction,
} from "@/actions/pipeline";

// =============================================================================
// Query key
// =============================================================================

/** Stable query key for the pipeline monitor. All mutations invalidate this. */
const MONITOR_KEY = ["pipeline", "monitor"] as const;

// =============================================================================
// Monitor query
// =============================================================================

/**
 * Poll the unified pipeline event list every 15 seconds.
 *
 * Accepts `initialData` from the server component so the tab renders
 * immediately without a loading state on first mount.
 *
 * staleTime of 10 s means React Query will serve the cached value for
 * 10 s before issuing a background refetch. refetchInterval fires every
 * 15 s regardless, so the monitor stays fresh as cron ticks happen.
 */
export function usePipelineMonitor(initialData?: PipelineMonitor) {
  return useQuery({
    queryKey: MONITOR_KEY,
    queryFn: async () => {
      const res = await getPipelineMonitorAction();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    initialData,
    // Pipeline ticks frequently — keep the monitor fresh but not chatty.
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// =============================================================================
// Mutation hooks
// =============================================================================

/**
 * All per-row and bulk recovery mutations. Every mutation invalidates the
 * monitor query on success so counts and rows stay consistent.
 */
export function usePipelineActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: MONITOR_KEY });

  /** Cascade-purge a source event and all its child data. */
  const remove = useMutation({
    mutationFn: async (e: PipelineEvent) => {
      const res = await deleteEventAction({
        source: e.source,
        sourceEventId: e.sourceEventId,
      });
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  /** Cascade-purge AND tombstone a source event so Sync never re-discovers it. */
  const exclude = useMutation({
    mutationFn: async (e: PipelineEvent) => {
      const res = await excludeEventAction({
        source: e.source,
        sourceEventId: e.sourceEventId,
        reason: null,
      });
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  /** Force a skipped / failed event back into the import queue. */
  const forceImport = useMutation({
    mutationFn: async (e: PipelineEvent) => {
      const res = await forceImportAction({
        source: e.source,
        sourceEventId: e.sourceEventId,
      });
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  /** Recovery: reset all stuck in-progress events back to queued. */
  const resetStuck = useMutation({
    mutationFn: async () => {
      const res = await resetStuckAction();
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  /** Recovery: move all failed events back to queued for a retry. */
  const requeueFailed = useMutation({
    mutationFn: async () => {
      const res = await requeueFailedAction();
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  return { remove, exclude, forceImport, resetStuck, requeueFailed };
}
