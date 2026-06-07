"use client";

import {
  BarChart2,
  ChevronDown,
  Loader2,
  Play,
  Plus,
  RefreshCw,
} from "lucide-react";

import { formatTimeAgo } from "@trainers/utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
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
  lastCalculatedAt?: string | null;
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
  const isMobile = useIsMobile();

  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
      <StatusChips chips={props.chips} />

      {isMobile ? (
        // Mobile: condensed row — Actions menu + settings + refresh
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
              Actions <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {props.tab === "rk9" ? (
                <>
                  <DropdownMenuItem
                    onClick={props.onDiscover}
                    disabled={props.isDiscovering}
                  >
                    {props.isDiscovering ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 size-3.5" />
                    )}
                    Discover
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={props.onScrapeRostersMatching}
                    disabled={
                      props.bulkProcessing ||
                      (props.rosterMatchingCount ?? 0) === 0
                    }
                  >
                    Scrape Rosters ({props.rosterMatchingCount ?? 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={props.onScrapeTeamsMatching}
                    disabled={
                      props.bulkProcessing ||
                      (props.teamsMatchingCount ?? 0) === 0
                    }
                  >
                    Scrape Teams ({props.teamsMatchingCount ?? 0})
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={props.onSync}
                    disabled={props.syncing}
                  >
                    {props.syncing ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 size-3.5" />
                    )}
                    Sync
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={props.onQueueMatching}
                    disabled={
                      props.bulkProcessing ||
                      (props.queueMatchingCount ?? 0) === 0
                    }
                    title="Queues the events matching your current tab + filters (skipped events are never queued)"
                  >
                    Queue Matching ({props.queueMatchingCount ?? 0})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={props.onQueueAll}
                    disabled={props.bulkProcessing}
                  >
                    Queue all pending ({props.queueAllCount ?? 0})
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
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
      ) : (
        // Desktop: full grouped layout (unchanged)
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
                    props.bulkProcessing ||
                    (props.queueMatchingCount ?? 0) === 0
                  }
                  title="Queues the events matching your current tab + filters (skipped events are never queued)"
                >
                  <Plus className="mr-1.5 size-3.5" /> Queue Matching (
                  {props.queueMatchingCount ?? 0})
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 cursor-pointer items-center justify-center rounded-l-none rounded-r-md border-l border-l-white/20 px-2 transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
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
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={props.recomputingUsage || props.calculatingUsage}
                className="hover:bg-accent hover:text-accent-foreground inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                {props.recomputingUsage || props.calculatingUsage ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Recalculating usage…
                  </>
                ) : (
                  <>
                    <BarChart2 className="mr-1.5 size-3.5" /> Usage{" "}
                    <ChevronDown className="size-3" />
                  </>
                )}
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
            {props.lastCalculatedAt && (
              <span className="text-muted-foreground text-xs">
                {formatTimeAgo(props.lastCalculatedAt)}
              </span>
            )}
          </div>

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
      )}
    </div>
  );
}
