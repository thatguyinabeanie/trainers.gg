"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SelectionBarProps {
  selectedCount: number;
  bulkProcessing: boolean;
  onClear: () => void;
  // Unified import action (both sources)
  importEligibleCount?: number;
  onImportSelected?: () => void;
  // Unqueue selected queued rows (returns them to Pending)
  unqueueEligibleCount?: number;
  onUnqueueSelected?: () => void;
  // RK9 reset (only RK9 rows have reset)
  resetEligibleCount?: number;
  onResetEvents?: () => void;
}

/** Sticky-ish bulk-action bar shown when one or more rows are selected. */
export function SelectionBar(props: SelectionBarProps) {
  if (props.selectedCount === 0) return null;
  return (
    <div className="bg-primary text-primary-foreground flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm">
      <span className="font-semibold">{props.selectedCount} selected</span>
      <Button
        size="sm"
        variant="secondary"
        disabled={props.bulkProcessing || !props.importEligibleCount}
        onClick={props.onImportSelected}
      >
        Import selected ({props.importEligibleCount ?? 0})
      </Button>
      {(props.unqueueEligibleCount ?? 0) > 0 && (
        <Button
          size="sm"
          variant="secondary"
          disabled={props.bulkProcessing}
          onClick={props.onUnqueueSelected}
        >
          Unqueue ({props.unqueueEligibleCount ?? 0})
        </Button>
      )}
      {(props.resetEligibleCount ?? 0) > 0 && (
        <Button
          size="sm"
          variant="secondary"
          disabled={props.bulkProcessing}
          onClick={props.onResetEvents}
        >
          Reset ({props.resetEligibleCount ?? 0})
        </Button>
      )}
      <span className="flex-1" />
      <Button
        size="sm"
        variant="ghost"
        className="text-primary-foreground hover:bg-white/10"
        onClick={props.onClear}
      >
        <X className="mr-1 size-3.5" /> Clear
      </Button>
    </div>
  );
}
