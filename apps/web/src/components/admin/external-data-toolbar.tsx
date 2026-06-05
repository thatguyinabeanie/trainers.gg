"use client";

import { BarChart2, Loader2, Play, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import {
  ExternalDataSettings,
  type ExternalDataSettingsProps,
} from "./external-data-settings";
import { StatusChips, type StatusChip } from "./external-data-status-chips";

export interface ExternalDataToolbarProps {
  tab: "rk9" | "limitless";
  chips: StatusChip[];
  settings: ExternalDataSettingsProps;
  isFetching: boolean;
  onRefresh: () => void;
  // Usage actions (both tabs)
  onRecomputeUsage: () => void;
  recomputingUsage: boolean;
  onCalculateUsage: () => void;
  calculatingUsage: boolean;
  // RK9 import group
  onDiscover?: () => void;
  isDiscovering?: boolean;
  onScrapeRostersMatching?: () => void;
  rosterMatchingCount?: number;
  onScrapeTeamsMatching?: () => void;
  teamsMatchingCount?: number;
  // Limitless import group
  onSync?: () => void;
  syncing?: boolean;
  onQueueMatching?: () => void;
  queueMatchingCount?: number;
  onQueueAll?: () => void;
  queueAllCount?: number;
  bulkProcessing?: boolean;
}

const LABEL = cn(
  "text-muted-foreground text-xs font-semibold uppercase tracking-wide"
);

export function ExternalDataToolbar(props: ExternalDataToolbarProps) {
  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
      <StatusChips chips={props.chips} />
      <div className="flex flex-wrap items-center gap-2">
        <span className={LABEL}>Import</span>

        {props.tab === "rk9" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={props.onDiscover}
              disabled={props.isDiscovering}
            >
              {props.isDiscovering ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-3.5" />
              )}
              Discover
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={props.onScrapeRostersMatching}
              disabled={
                props.bulkProcessing || (props.rosterMatchingCount ?? 0) === 0
              }
            >
              Scrape Rosters ({props.rosterMatchingCount ?? 0})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={props.onScrapeTeamsMatching}
              disabled={
                props.bulkProcessing || (props.teamsMatchingCount ?? 0) === 0
              }
            >
              <Play className="mr-1.5 size-3.5" /> Scrape Teams (
              {props.teamsMatchingCount ?? 0})
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={props.onSync}
              disabled={props.syncing}
            >
              {props.syncing ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-3.5" />
              )}
              Sync
            </Button>
            <div className="flex">
              <Button
                variant="default"
                size="sm"
                className="rounded-r-none"
                onClick={props.onQueueMatching}
                disabled={
                  props.bulkProcessing || (props.queueMatchingCount ?? 0) === 0
                }
              >
                <Plus className="mr-1.5 size-3.5" /> Queue Matching (
                {props.queueMatchingCount ?? 0})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-l-none rounded-r-md border-l border-l-white/20 bg-primary px-2 text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  aria-label="More queue options"
                >
                  ▾
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={props.onQueueAll}>
                    Queue all pending ({props.queueAllCount ?? 0})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}

        <span className="bg-border h-5 w-px" />
        <span className={LABEL}>Usage</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            <BarChart2 className="mr-1.5 size-3.5" /> Usage ▾
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={props.onRecomputeUsage}
              disabled={props.recomputingUsage}
            >
              Recompute Usage
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={props.onCalculateUsage}
              disabled={props.calculatingUsage}
            >
              Calculate Usage
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="bg-border h-5 w-px" />
        <ExternalDataSettings {...props.settings} />
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onRefresh}
          disabled={props.isFetching}
          aria-label="Refresh"
          title="Refresh data"
        >
          <RefreshCw
            className={props.isFetching ? "size-4 animate-spin" : "size-4"}
          />
        </Button>
      </div>
    </div>
  );
}
