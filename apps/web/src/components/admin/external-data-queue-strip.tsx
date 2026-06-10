"use client";

import { AlertTriangle, Loader2, Play, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QueueStripProps {
  limitless: { queued: number; importing: number; failed: number };
  rk9: { queued: number; inProgress: number; failed: number };
  /** Rows whose import finished within the last 10 minutes. */
  recentImported: number;
  /** Whether auto-import is on for each source. */
  autoImportOn: { limitless: boolean; rk9: boolean };
  processing: boolean;
  onProcessNow: () => void;
  /** Returns queued rows to Pending — must be confirmed via AlertDialog. */
  onUnqueueAll: () => void;
  onResetStuck: () => void;
}

/**
 * Compact strip showing the server-side queue state for both sources.
 * Replaces the old browser-driven drain strip. Does not show progress bars or
 * X/Y denominators — live per-source counts only.
 */
export function QueueStrip({
  limitless,
  rk9,
  recentImported,
  autoImportOn,
  processing,
  onProcessNow,
  onUnqueueAll,
  onResetStuck,
}: QueueStripProps) {
  const [unqueueOpen, setUnqueueOpen] = useState(false);

  const totalQueued =
    limitless.queued + limitless.importing + rk9.queued + rk9.inProgress;
  // Only rows at "queued" status can be unqueued — in-progress work can't be.
  const totalActuallyQueued = limitless.queued + rk9.queued;
  const totalFailed = limitless.failed + rk9.failed;

  // Nothing to show when the queue is fully empty and nothing recently imported
  if (totalQueued === 0 && totalFailed === 0 && recentImported === 0) {
    return null;
  }

  const limitlessWarnOff = !autoImportOn.limitless && limitless.queued > 0;
  const rk9WarnOff = !autoImportOn.rk9 && rk9.queued > 0;
  const hasWarning = limitlessWarnOff || rk9WarnOff;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-3 py-2.5",
        hasWarning
          ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10"
          : "border-primary/20 bg-primary/5"
      )}
    >
      {/* Main counts row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {/* Per-source counts */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {(limitless.queued > 0 || limitless.importing > 0) && (
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">Limitless</span>
              {limitless.queued > 0 && (
                <> · {limitless.queued.toLocaleString()} queued</>
              )}
              {limitless.importing > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-primary">
                    {limitless.importing} importing
                  </span>
                </>
              )}
            </span>
          )}

          {(rk9.queued > 0 || rk9.inProgress > 0) && (
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">RK9</span>
              {rk9.queued > 0 && <> · {rk9.queued.toLocaleString()} queued</>}
              {rk9.inProgress > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-primary">
                    {rk9.inProgress} in progress
                  </span>
                </>
              )}
            </span>
          )}

          {recentImported > 0 && (
            <span className="text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400">
                {recentImported} imported
              </span>{" "}
              in the last 10 min
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs"
            onClick={onProcessNow}
            disabled={processing || totalQueued === 0}
          >
            {processing ? (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            ) : (
              <Play className="mr-1.5 size-3" />
            )}
            Process now
          </Button>

          {totalActuallyQueued > 0 && (
            <AlertDialog open={unqueueOpen} onOpenChange={setUnqueueOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 text-xs"
                    aria-label="Unqueue all"
                  >
                    <Trash2 className="mr-1.5 size-3" />
                    Unqueue all
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unqueue all imports?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will return queued rows to Pending. Rows currently
                    in-progress will continue until their current run finishes.
                    Unqueued rows will not be imported until they are queued
                    again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      onUnqueueAll();
                      setUnqueueOpen(false);
                    }}
                  >
                    Unqueue all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onResetStuck}
            title="Reset any imports stuck in-progress back to queued"
          >
            <RefreshCw className="mr-1.5 size-3" />
            Reset stuck
          </Button>
        </div>
      </div>

      {/* Amber warnings when a source's toggle is off but has queued rows */}
      {limitlessWarnOff && (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>
            Auto-import is off for Limitless — its queue will not drain. Enable
            it in Settings.
          </span>
        </div>
      )}
      {rk9WarnOff && (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>
            Auto-import is off for RK9 — its queue will not drain. Enable it in
            Settings.
          </span>
        </div>
      )}
    </div>
  );
}
