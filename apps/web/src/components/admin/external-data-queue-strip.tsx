"use client";

import { Clock, Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface QueueStripProps {
  tab: "rk9" | "limitless";
  // Limitless queue
  queuedCount: number;
  nextLabel: string | null;
  nextQueuedAgo: string | null;
  importProgress: { done: number; total: number } | null;
  draining: boolean;
  onRunImport: () => void;
  // RK9 activity
  rk9Jobs: { name: string; scraped?: number; total?: number }[];
}

export function QueueStrip({
  tab,
  queuedCount,
  nextLabel,
  nextQueuedAgo,
  importProgress,
  draining,
  onRunImport,
  rk9Jobs,
}: QueueStripProps) {
  if (tab === "rk9") {
    if (rk9Jobs.length === 0) return null;

    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"
        )}
      >
        <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
        <span className="text-sm font-medium">
          Scraping {rk9Jobs.length} event{rk9Jobs.length > 1 ? "s" : ""}
        </span>
        <div className="flex flex-wrap gap-2">
          {rk9Jobs.map((job) => (
            <span
              key={job.name}
              className="text-muted-foreground text-xs"
            >
              {job.name}
              {job.scraped !== undefined && job.total !== undefined
                ? ` (${job.scraped}/${job.total})`
                : null}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Limitless tab

  // Draining with progress
  if (draining && importProgress) {
    const { done, total } = importProgress;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"
        )}
      >
        <span
          className="size-2 shrink-0 rounded-full bg-primary animate-pulse"
          aria-hidden
        />
        <span className="text-sm font-medium">
          Importing {done} / {total}…
        </span>
        <Progress
          value={pct}
          className="min-w-32 flex-1"
          aria-label={`Import progress: ${pct}%`}
        >
          <ProgressTrack className="h-1.5">
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
      </div>
    );
  }

  // Queue waiting (and not currently draining)
  if (queuedCount > 0) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"
        )}
      >
        <div className="flex items-center gap-2 text-sm">
          <Clock className="size-3.5 shrink-0 text-primary" />
          <span className="font-medium">
            Queue: {queuedCount} waiting
          </span>
          {nextLabel ? (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground truncate">
                next: {nextLabel}
              </span>
              {nextQueuedAgo ? (
                <span className="text-muted-foreground text-xs">
                  {nextQueuedAgo}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={onRunImport}
          disabled={draining}
        >
          <Play className="mr-1.5 size-3.5" />
          Run Import — drain all ({queuedCount})
        </Button>
      </div>
    );
  }

  // Empty — collapse
  return null;
}
