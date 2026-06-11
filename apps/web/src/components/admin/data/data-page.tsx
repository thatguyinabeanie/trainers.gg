"use client";

import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { ConfigTab } from "./config-tab";
import { MonitorTab } from "./monitor-tab";
import type { StageCard } from "./pipeline-cards";
import type { CronSchedules } from "./use-pipeline-config";
import type { PipelineMonitor } from "@trainers/supabase/queries";

// =============================================================================
// Types
// =============================================================================

interface DataPageProps {
  monitor: PipelineMonitor;
  cards: StageCard[];
  config: { pipelineEnabled: boolean; limitlessBatchSize: number };
  schedules: CronSchedules;
  /** Set when the server-side data load partially failed. The Monitor tab
   *  polls via TanStack Query and recovers automatically once the DB is
   *  reachable again (e.g. after a PostgREST schema cache refresh). */
  loadError?: string | null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Client root for the /admin/data page.
 *
 * Two tabs:
 * - Monitor: pipeline event list, status chips, stage cards, bulk actions.
 * - Config: pipeline kill-switch, batch size, cron cadence inputs.
 *
 * All initial data is handed off from the server component to avoid a
 * loading flash on first paint. Client-side polling and mutations are wired
 * inside the individual tab components via TanStack Query.
 */
export function DataPage({
  monitor,
  cards,
  config,
  schedules,
  loadError,
}: DataPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">External data</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Autonomous import pipeline — monitor and configure. Imports run
          server-side on a schedule.
        </p>
      </div>

      {loadError != null && (
        <Alert>
          <TriangleAlertIcon />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="monitor">
        <TabsList>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>
        <TabsContent value="monitor" className="pt-4">
          <MonitorTab initialMonitor={monitor} cards={cards} />
        </TabsContent>
        <TabsContent value="config" className="pt-4">
          <ConfigTab initialConfig={config} initialSchedules={schedules} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
