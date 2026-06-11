"use client";

import { useState } from "react";

import {
  type DisplayStatus,
  type PipelineEvent,
  type PipelineMonitor,
} from "@trainers/supabase/queries";

import { Button } from "@/components/ui/button";

import { EventList } from "./event-list";
import { PipelineCards, type StageCard } from "./pipeline-cards";
import { StatusChips } from "./status-chips";
import { usePipelineActions, usePipelineMonitor } from "./use-pipeline";

// =============================================================================
// Types
// =============================================================================

interface MonitorTabProps {
  /** SSR-fetched monitor data handed off from the server component. */
  initialMonitor: PipelineMonitor;
  /** Stage summary cards (sync / import / compile) — static per page load. */
  cards: StageCard[];
}

// =============================================================================
// Component
// =============================================================================

/**
 * Monitor tab for the admin data page.
 *
 * - PipelineCards: three stage summary cards (sync / import / compile).
 * - StatusChips: count chips that double as the single filter for the list.
 * - EventList: filtered by the active chip; per-row action callbacks wired
 *   to TanStack Query mutations that invalidate the monitor query on success.
 * - Reset stuck / Requeue failed: bulk recovery actions, page-level.
 *
 * `usePipelineMonitor` polls every 15 s; the initial render is hydrated with
 * `initialMonitor` from the server so there is no loading flash.
 */
export function MonitorTab({ initialMonitor, cards }: MonitorTabProps) {
  const { data } = usePipelineMonitor(initialMonitor);
  // Fall back to initialMonitor during the first render / any transient undefined.
  const monitor = data ?? initialMonitor;
  const actions = usePipelineActions();

  // The chip that is currently selected as the active filter.
  const [active, setActive] = useState<DisplayStatus>("queued");

  // Composite key for the row whose action is currently in-flight.
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Derived from monitor data — not stored in state (React Compiler handles it).
  const filtered = monitor.events.filter((e) => e.displayStatus === active);

  /**
   * Wrap a per-row action: record the pending key so the row disables its
   * buttons while the mutation is in flight.
   */
  function withPending(e: PipelineEvent, fn: (e: PipelineEvent) => void) {
    setPendingKey(`${e.source}:${e.sourceEventId}`);
    fn(e);
  }

  return (
    <div className="space-y-6">
      {/* Stage summary cards */}
      <PipelineCards cards={cards} />

      {/* Chip filter row + bulk recovery actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusChips
          counts={monitor.counts}
          active={active}
          onChange={setActive}
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.resetStuck.mutate()}
            disabled={actions.resetStuck.isPending}
          >
            Reset stuck
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.requeueFailed.mutate()}
            disabled={actions.requeueFailed.isPending}
          >
            Requeue failed
          </Button>
        </div>
      </div>

      {/* Event list — filtered to the active chip */}
      <EventList
        events={filtered}
        pendingKey={pendingKey}
        onDelete={(e) => withPending(e, actions.remove.mutate)}
        onExclude={(e) => withPending(e, actions.exclude.mutate)}
        onForceImport={(e) => withPending(e, actions.forceImport.mutate)}
      />
    </div>
  );
}
