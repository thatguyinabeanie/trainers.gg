"use client";

import { STAT_LABELS, type StatKey } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

interface NatureChevronsProps {
  /** Stat boosted (+10%) by the nature. */
  boost: StatKey | null | undefined;
  /** Stat reduced (−10%) by the nature. */
  reduce: StatKey | null | undefined;
  className?: string;
}

export function NatureChevrons({ boost, reduce, className }: NatureChevronsProps) {
  if (!boost || !reduce) return null;
  return (
    <span
      className={cn("font-mono text-[9px] whitespace-nowrap", className)}
    >
      <span className="text-emerald-600 dark:text-emerald-400">
        +{STAT_LABELS[boost]}
      </span>
      <span className="text-muted-foreground">/</span>
      <span className="text-rose-600 dark:text-rose-400">
        −{STAT_LABELS[reduce]}
      </span>
    </span>
  );
}
