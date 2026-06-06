"use client";

import { cn } from "@/lib/utils";

import {
  FormRowsGhost,
  GHOST_STAT_ROWS,
  MetaBarGhost,
  SpeciesPillGhost,
  SpriteGhost,
} from "./row-ghost-shared";

// =============================================================================
// GridRowGhost — static placeholder mirroring GridRow's vertical structure
//
// Always vertical (matches GridRow):
//   ┌─ rib (top, horizontal bar) ─────────┐
//   ├─ identity (sprite-left + form-right)┤
//   ├─ stats (full width) ────────────────┤
//   ├─ moves (full width) ────────────────┤
//   └─────────────────────────────────────┘
//
// All interactive elements replaced with static placeholders. No nested
// buttons — wrapped by EmptyPokeRow's outer <button>. No legacy CSS classes.
// =============================================================================

interface GridRowGhostProps {
  idx: number;
}

export function GridRowGhost({ idx }: GridRowGhostProps) {
  return (
    <div
      className={cn(
        "bg-card flex h-full w-full min-w-0 flex-col self-center overflow-hidden rounded-lg border border-dashed",
        "border-border hover:border-primary/40 transition-colors"
      )}
    >
      {/* TOP RIB — horizontal bar with slot number + remove placeholder */}
      <div className="border-border/60 bg-muted/20 flex w-full shrink-0 flex-row items-center justify-between border-b border-dashed px-2 py-1">
        <span className="text-muted-foreground font-mono text-xs font-medium tracking-wide">
          {String(idx + 1).padStart(2, "0")}
        </span>
        <span className="text-muted-foreground/20 flex size-5 items-center justify-center rounded">
          ×
        </span>
      </div>

      {/* IDENTITY — sprite (left, basis-36) + form (right) */}
      <div className="border-border flex w-full flex-col border-b border-dashed">
        <div className="flex min-w-0 flex-auto flex-row items-center justify-center">
          <div className="flex shrink-0 grow-0 basis-36 flex-col items-center justify-center gap-1.5 px-1 py-2">
            <SpriteGhost size={120} />
            <SpeciesPillGhost />
          </div>
          <div className="flex min-w-0 shrink basis-auto flex-col justify-center gap-1 px-1.5 py-2">
            <MetaBarGhost />
            <FormRowsGhost />
          </div>
        </div>
      </div>

      {/* STATS + MOVES stacked vertically, both full width */}
      <div className="flex w-full min-w-0 flex-col">
        <StatsGhost />
        <MovesGhost />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats / Moves ghosts — visual structure copied from lane null branches
// without importing the lanes themselves. Differ from compact variants in
// border direction (border-b here vs border-r in compact) and flex axes.
// ---------------------------------------------------------------------------

function StatsGhost() {
  const rowGrid =
    "grid grid-cols-[2.5rem_1.875rem_minmax(1.875rem,0.8fr)_2.5rem_minmax(3.75rem,1.6fr)_2.25rem] gap-1.5 items-center px-1 py-0.5 rounded";
  return (
    <div className="border-border/60 flex w-full min-w-0 flex-col justify-center gap-0.5 border-b border-dashed px-3 py-1">
      <div className={cn("mb-0.5", rowGrid)}>
        <span />
        <span className="text-muted-foreground/30 text-center font-mono text-xs font-medium tracking-wide uppercase">
          Base
        </span>
        <span />
        <span className="text-muted-foreground/30 text-center font-mono text-xs font-medium tracking-wide uppercase">
          EVs
        </span>
        <span className="text-muted-foreground/30 text-right font-mono text-xs">
          0/510
        </span>
        <span />
      </div>
      {GHOST_STAT_ROWS.map(({ key, label, colorClass }) => (
        <div key={key} className={cn(rowGrid, colorClass)}>
          <span className="font-mono text-xs font-semibold tracking-[0.06em] uppercase opacity-30">
            {label}
          </span>
          <span className="text-muted-foreground/25 text-right font-mono text-xs tabular-nums">
            —
          </span>
          <div className="bg-muted relative h-2 min-w-0 overflow-hidden rounded-full" />
          <div className="border-border/30 h-5 w-9 rounded border border-dashed" />
          <div className="relative h-3.5">
            {/* h-[3px]: 3px hairline slider track ghost — no Tailwind scale token */}
            <div className="bg-muted-foreground/40 pointer-events-none absolute top-1/2 right-0 left-0 h-[3px] -translate-y-1/2 rounded-full opacity-25" />
          </div>
          <span className="text-muted-foreground/25 text-right font-mono text-xs font-bold tabular-nums">
            —
          </span>
        </div>
      ))}
    </div>
  );
}

function MovesGhost() {
  return (
    <div className="flex w-full min-w-0 flex-col px-3 py-1">
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-[1.5rem_2rem_1fr_2.75rem_3rem] items-center gap-1 pb-0.5">
          <span />
          <span />
          <span className="text-muted-foreground/30 text-xs font-medium tracking-[0.04em] uppercase">
            NAME
          </span>
          <span className="text-muted-foreground/30 text-xs font-medium tracking-[0.04em] uppercase">
            BP
          </span>
          <span className="text-muted-foreground/30 text-xs font-medium tracking-[0.04em] uppercase">
            ACC
          </span>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[1.5rem_2rem_1fr_2.75rem_3rem] items-center gap-1 px-1 py-1"
          >
            <span />
            <span />
            <span className="text-muted-foreground/30 truncate text-sm font-medium">
              + Add move
            </span>
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
