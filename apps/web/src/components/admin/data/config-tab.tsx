"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  usePipelineConfig,
  usePipelineConfigMutations,
  usePipelineSchedules,
  type CronSchedules,
} from "./use-pipeline-config";

// =============================================================================
// Types
// =============================================================================

interface ConfigTabProps {
  /** SSR-fetched pipeline config (enabled flag + batch size). */
  initialConfig: { pipelineEnabled: boolean; limitlessBatchSize: number };
  /** Live cron schedules read server-side from cron.job (Decision 2). */
  initialSchedules: CronSchedules;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * The three pg_cron jobs exposed in the UI.
 * `key` maps to the CronSchedules shape; `job` is the pg_cron job_name.
 */
const JOBS = [
  { key: "sync", job: "import-tick-sync", label: "Sync cadence" },
  { key: "import", job: "import-tick-import", label: "Import cadence" },
  {
    key: "compile",
    job: "import-tick-compile",
    label: "Update-stats cadence",
  },
] as const;

// =============================================================================
// Component
// =============================================================================

/**
 * Config tab for the admin data page.
 *
 * - Master pipeline_enabled toggle: persists to site_config via
 *   setPipelineEnabledAction; TanStack Query invalidates on success.
 * - Limitless batch size: local text input; writes via setLimitlessBatchSizeAction.
 * - Cron cadence inputs: read the LIVE pg_cron schedule via
 *   getCronSchedulesAction (Decision 2), seeded from initialSchedules from the
 *   server. On save, alterCronScheduleAction applies the change live; the
 *   schedules query is then invalidated, and the local edit buffer re-seeds
 *   from the new server value during the next render (render-time adjustment,
 *   no useEffect required — React handles setState calls during render).
 */
export function ConfigTab({ initialConfig, initialSchedules }: ConfigTabProps) {
  // ── Config query ────────────────────────────────────────────────────────────
  const { data } = usePipelineConfig(initialConfig);
  // Fall back to initialConfig until the first successful client-side fetch.
  const config = data ?? initialConfig;

  // ── Schedule query ───────────────────────────────────────────────────────────
  // Decision 2: the live production cadence, refetched on the client after any
  // successful alterCron mutation.
  const { data: liveSchedules = initialSchedules } =
    usePipelineSchedules(initialSchedules);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const { setEnabled, setBatchSize, alterCron } = usePipelineConfigMutations();

  // ── Local batch-size buffer ──────────────────────────────────────────────────
  const [batch, setBatch] = useState(String(config.limitlessBatchSize));

  // ── Local cron edit buffer with render-time re-seed ─────────────────────────
  // `draft` is what the user sees in the inputs.
  // `seenServer` is the last server snapshot we've absorbed into `draft`.
  //
  // When liveSchedules changes (e.g. after an alterCron save invalidation or an
  // out-of-band pg_cron edit), we detect the mismatch during render and call
  // setDraft + setSeenServer. React treats setState during render as "queue a
  // re-render with the new value" — no useEffect needed. React Compiler handles
  // memoization; no manual useMemo/useCallback.
  const [draft, setDraft] = useState<CronSchedules>(liveSchedules);
  const [seenServer, setSeenServer] = useState<CronSchedules>(liveSchedules);

  if (
    liveSchedules.sync !== seenServer.sync ||
    liveSchedules.import !== seenServer.import ||
    liveSchedules.compile !== seenServer.compile
  ) {
    // Re-seed the edit buffer from the server value. React will re-render
    // once more with the new state before committing to the DOM.
    setSeenServer(liveSchedules);
    setDraft(liveSchedules);
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* ── Master toggle ──────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Pipeline enabled</Label>
            <p className="text-muted-foreground text-sm">
              Master kill-switch for all import crons.
            </p>
          </div>
          <Switch
            checked={config.pipelineEnabled}
            onCheckedChange={(v) => setEnabled.mutate(v)}
            disabled={setEnabled.isPending}
          />
        </div>
      </section>

      {/* ── Limitless batch size ───────────────────────────────────────────── */}
      <section className="space-y-2">
        <Label htmlFor="batch" className="text-base font-semibold">
          Limitless batch size
        </Label>
        <p className="text-muted-foreground text-sm">
          Events processed per Limitless import tick (1–100).
        </p>
        <div className="flex items-center gap-2">
          <Input
            id="batch"
            type="number"
            min={1}
            max={100}
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="w-32"
          />
          <Button
            size="sm"
            onClick={() => setBatchSize.mutate(Number(batch))}
            disabled={setBatchSize.isPending}
          >
            Save
          </Button>
        </div>
      </section>

      {/* ── Cron cadence ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Cron cadence</h3>
        <p className="text-muted-foreground text-sm">
          Five-field cron expressions, applied live to pg_cron.
        </p>
        {JOBS.map((j) => (
          <div key={j.key} className="flex items-center gap-2">
            <Label htmlFor={j.key} className="w-48 text-sm">
              {j.label}
            </Label>
            <Input
              id={j.key}
              value={draft[j.key]}
              onChange={(e) =>
                setDraft((s) => ({ ...s, [j.key]: e.target.value }))
              }
              className="w-40 font-mono"
            />
            <Button
              size="sm"
              onClick={() =>
                alterCron.mutate({ job: j.job, schedule: draft[j.key] })
              }
              disabled={alterCron.isPending}
            >
              Save
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
