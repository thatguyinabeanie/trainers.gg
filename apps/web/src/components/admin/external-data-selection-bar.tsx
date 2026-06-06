"use client";
// apps/web/src/components/admin/external-data-selection-bar.tsx
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SelectionBarProps {
  tab: "rk9" | "limitless";
  selectedCount: number;
  bulkProcessing: boolean;
  onClear: () => void;
  // RK9
  rosterEligibleCount?: number;
  teamsEligibleCount?: number;
  resetEligibleCount?: number;
  onScrapeRosters?: () => void;
  onScrapeTeams?: () => void;
  onResetEvents?: () => void;
  // Limitless
  queueEligibleCount?: number;
  onQueueSelected?: () => void;
}

/** Sticky-ish bulk-action bar shown when one or more rows are selected. */
export function SelectionBar(props: SelectionBarProps) {
  if (props.selectedCount === 0) return null;
  return (
    <div className="bg-primary text-primary-foreground flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm">
      <span className="font-semibold">{props.selectedCount} selected</span>
      {props.tab === "rk9" ? (
        <>
          <Button size="sm" variant="secondary" disabled={props.bulkProcessing || !props.rosterEligibleCount} onClick={props.onScrapeRosters}>
            Scrape rosters ({props.rosterEligibleCount ?? 0})
          </Button>
          <Button size="sm" variant="secondary" disabled={props.bulkProcessing || !props.teamsEligibleCount} onClick={props.onScrapeTeams}>
            Scrape teams ({props.teamsEligibleCount ?? 0})
          </Button>
          <Button size="sm" variant="secondary" disabled={props.bulkProcessing || !props.resetEligibleCount} onClick={props.onResetEvents}>
            Reset ({props.resetEligibleCount ?? 0})
          </Button>
        </>
      ) : (
        <Button size="sm" variant="secondary" disabled={props.bulkProcessing || !props.queueEligibleCount} onClick={props.onQueueSelected}>
          Queue selected ({props.queueEligibleCount ?? 0})
        </Button>
      )}
      <span className="flex-1" />
      <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/10" onClick={props.onClear}>
        <X className="mr-1 size-3.5" /> Clear
      </Button>
    </div>
  );
}
