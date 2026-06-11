import { redirect } from "next/navigation";

import {
  getPipelineMonitor,
  listRecentImportRuns,
  type PipelineMonitor,
} from "@trainers/supabase/queries";

import { isSiteAdmin } from "@/lib/sudo/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

import { DataPage } from "@/components/admin/data/data-page";
import { type StageCard } from "@/components/admin/data/pipeline-cards";
import { type CronSchedules } from "@/components/admin/data/use-pipeline-config";

// =============================================================================
// Constants
// =============================================================================

/**
 * Seeded defaults — MUST match the schedules seeded in the Task 2.4 migration
 * and the fallbacks in the admin_get_cron_schedules RPC (Task 2.6).
 */
const DEFAULT_SCHEDULES: CronSchedules = {
  sync: "*/5 * * * *",
  import: "* * * * *",
  compile: "*/2 * * * *",
};

/**
 * Empty PipelineMonitor used as a safe fallback when the monitor query fails
 * (e.g. stale PostgREST schema cache for import_runs). The Monitor tab polls
 * via TanStack Query and will recover automatically once the cache refreshes.
 */
const EMPTY_MONITOR: PipelineMonitor = {
  events: [],
  counts: {
    queued: 0,
    processing: 0,
    failed: 0,
    skipped: 0,
    complete: 0,
  },
};

// =============================================================================
// Page
// =============================================================================

/**
 * /admin/data — autonomous import pipeline monitor + config.
 *
 * Server-component gate: site-admin check + service-role data load.
 * Admin-only page; no `'use cache'` (user-specific + service-role bypass).
 *
 * Two clients on purpose:
 * - Service-role client: reads site_config + pipeline monitor (bypasses RLS
 *   to reach rk9/limitless schemas and import_runs).
 * - Authenticated client: runs admin_get_cron_schedules so the RPC's
 *   auth.uid() admin check is satisfied (service-role has no auth.uid()).
 */
export default async function AdminDataPage() {
  // Defense-in-depth admin gate (layout also calls requireSiteAdmin).
  const isAdmin = await isSiteAdmin();
  if (!isAdmin) redirect("/forbidden");

  const supabase = createServiceRoleClient();

  // Fetch pipeline monitor + recent runs independently so a failure in one
  // (e.g. stale PostgREST schema cache for import_runs) does not crash the page.
  // The Monitor tab polls via TanStack Query and recovers automatically.
  let monitor: PipelineMonitor = EMPTY_MONITOR;
  let runs: Awaited<ReturnType<typeof listRecentImportRuns>> = [];
  let loadError: string | null = null;

  const [monitorResult, runsResult] = await Promise.allSettled([
    getPipelineMonitor(supabase),
    listRecentImportRuns(supabase, 30),
  ]);

  if (monitorResult.status === "fulfilled") {
    monitor = monitorResult.value;
  } else {
    console.error(
      "[admin/data] getPipelineMonitor failed:",
      monitorResult.reason
    );
    loadError =
      "Couldn't load the latest pipeline data — showing what's available. It'll refresh automatically.";
  }

  if (runsResult.status === "fulfilled") {
    runs = runsResult.value;
  } else {
    console.error(
      "[admin/data] listRecentImportRuns failed:",
      runsResult.reason
    );
    loadError ??=
      "Couldn't load the latest pipeline data — showing what's available. It'll refresh automatically.";
  }

  // Build the three stage cards from the most recent run per source.
  const latest = (source: string) =>
    runs.find((r) => r.source === source) ?? null;
  const cards: StageCard[] = [
    {
      stage: "sync",
      title: "Sync",
      lastStatus: latest("rk9")?.status ?? null,
      lastRunAt: latest("rk9")?.started_at ?? null,
      progress: null,
    },
    {
      stage: "import",
      title: "Import",
      lastStatus: latest("limitless")?.status ?? null,
      lastRunAt: latest("limitless")?.started_at ?? null,
      progress: null,
    },
    {
      stage: "compile",
      title: "Update stats",
      lastStatus: latest("compile")?.status ?? null,
      lastRunAt: latest("compile")?.started_at ?? null,
      progress: null,
    },
  ];

  // Config (site_config) via the service-role client. Soft-fail: a missing or
  // broken config row should not prevent the rest of the page from rendering.
  let config = { pipelineEnabled: false, limitlessBatchSize: 25 };
  try {
    const { data: configRows, error: configError } = await supabase
      .from("site_config")
      .select("key, value")
      .in("key", ["pipeline_enabled", "limitless_import_batch_size"]);
    if (configError)
      throw new Error(`site_config read failed: ${configError.message}`);
    const cfgMap = new Map((configRows ?? []).map((r) => [r.key, r.value]));
    config = {
      pipelineEnabled: cfgMap.get("pipeline_enabled") === true,
      limitlessBatchSize: Number(
        cfgMap.get("limitless_import_batch_size") ?? 25
      ),
    };
  } catch (err) {
    // Non-fatal: keep the safe defaults above. loadError already set if monitor/runs failed.
    console.error("[admin/data] site_config fetch failed:", err);
  }

  // Read the LIVE cron cadence from cron.job so the Config inputs reflect
  // production, not just seeded defaults. The admin_get_cron_schedules RPC
  // checks auth.uid() against role_id = 1, so it MUST run on an AUTHENTICATED
  // client (service-role has no auth.uid()). Falls back to DEFAULT_SCHEDULES
  // when pg_cron is absent (local dev) or the RPC call itself fails.
  let schedules: CronSchedules = DEFAULT_SCHEDULES;
  try {
    const authed = await createClient();
    const { data: scheduleRows, error: scheduleError } = await authed.rpc(
      "admin_get_cron_schedules"
    );
    if (scheduleError) throw new Error(scheduleError.message);
    const byJob = new Map(
      (scheduleRows ?? []).map((r: { job_name: string; schedule: string }) => [
        r.job_name,
        r.schedule,
      ])
    );
    schedules = {
      sync: byJob.get("import-tick-sync") ?? DEFAULT_SCHEDULES.sync,
      import: byJob.get("import-tick-import") ?? DEFAULT_SCHEDULES.import,
      compile: byJob.get("import-tick-compile") ?? DEFAULT_SCHEDULES.compile,
    };
  } catch {
    // Keep DEFAULT_SCHEDULES — the client will re-read via getCronSchedulesAction.
  }

  return (
    <DataPage
      monitor={monitor}
      cards={cards}
      config={config}
      schedules={schedules}
      loadError={loadError}
    />
  );
}
