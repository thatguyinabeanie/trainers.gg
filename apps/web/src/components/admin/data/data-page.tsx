"use client";

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
export function DataPage({ monitor, cards, config, schedules }: DataPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">External data</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Autonomous import pipeline — monitor and configure. Imports run
          server-side on a schedule.
        </p>
      </div>
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
