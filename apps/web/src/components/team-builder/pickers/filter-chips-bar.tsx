/**
 * FilterChipsBar — active-filter chip strip rendered above each picker list.
 * Used by both species and move pickers to show and dismiss active filters.
 */
"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
  /** undefined → primary teal, "mega" → purple */
  tone?: "primary" | "mega";
}

interface FilterChipsBarProps {
  chips: FilterChip[];
  className?: string;
}

export function FilterChipsBar({ chips, className }: FilterChipsBarProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "border-border/50 bg-muted/20 flex flex-wrap items-center gap-1.5 border-b px-4 py-1.5",
        className
      )}
    >
      <span className="text-muted-foreground text-xs">Active:</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            chip.tone === "mega"
              ? "border border-violet-400/25 bg-violet-500/8 text-violet-700 dark:text-violet-300"
              : "border-primary/25 bg-primary/8 text-primary border"
          )}
        >
          {chip.label} <X className="size-2.5 opacity-50" />
        </button>
      ))}
    </div>
  );
}
