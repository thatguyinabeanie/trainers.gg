"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  alterCronScheduleAction,
  getCronSchedulesAction,
  getPipelineConfigAction,
  setLimitlessBatchSizeAction,
  setPipelineEnabledAction,
} from "@/actions/pipeline";

const CONFIG_KEY = ["pipeline", "config"] as const;
const SCHEDULES_KEY = ["pipeline", "schedules"] as const;

/** Live cron-schedule shape — one cron expression per managed job. */
export type CronSchedules = { sync: string; import: string; compile: string };

/**
 * TanStack Query wrapper for the pipeline config (pipeline_enabled +
 * limitless_import_batch_size). Seeded from the server-rendered initialData so
 * there is no loading flash on first paint.
 */
export function usePipelineConfig(initialData?: {
  pipelineEnabled: boolean;
  limitlessBatchSize: number;
}) {
  return useQuery({
    queryKey: CONFIG_KEY,
    queryFn: async () => {
      const res = await getPipelineConfigAction();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    initialData,
    staleTime: 30_000,
  });
}

/**
 * Decision 2: read the LIVE cron schedules from cron.job (via the
 * admin_get_cron_schedules RPC), so the Config inputs reflect the real
 * production cadence — not just the seeded defaults. Seeded from the
 * server-rendered initialData so the inputs are correct on first paint.
 */
export function usePipelineSchedules(initialData?: CronSchedules) {
  return useQuery({
    queryKey: SCHEDULES_KEY,
    queryFn: async () => {
      const res = await getCronSchedulesAction();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    initialData,
    staleTime: 30_000,
  });
}

/**
 * Mutations for the pipeline config:
 * - setEnabled: toggle the master kill-switch
 * - setBatchSize: set the Limitless batch size (1–100)
 * - alterCron: update a pg_cron job's schedule; invalidates the schedules
 *   query so the inputs re-seed from the live server value
 */
export function usePipelineConfigMutations() {
  const qc = useQueryClient();
  const invalidateConfig = () => qc.invalidateQueries({ queryKey: CONFIG_KEY });

  const setEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await setPipelineEnabledAction(enabled);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidateConfig,
  });

  const setBatchSize = useMutation({
    mutationFn: async (size: number) => {
      const res = await setLimitlessBatchSizeAction(size);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: invalidateConfig,
  });

  const alterCron = useMutation({
    mutationFn: async (input: { job: string; schedule: string }) => {
      const res = await alterCronScheduleAction(input);
      if (!res.success) throw new Error(res.error);
    },
    // Re-read the live schedules after a successful change so the inputs
    // reflect what pg_cron actually holds now.
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULES_KEY }),
  });

  return { setEnabled, setBatchSize, alterCron };
}
