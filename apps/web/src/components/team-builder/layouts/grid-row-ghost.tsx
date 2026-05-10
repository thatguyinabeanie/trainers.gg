"use client";

import { cn } from "@/lib/utils";

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
        <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-wide">
          {String(idx + 1).padStart(2, "0")}
        </span>
        <span className="text-muted-foreground/20 flex size-5 items-center justify-center rounded">
          ×
        </span>
      </div>

      {/* IDENTITY — sprite (left, basis-[140px]) + form (right) */}
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
// Shared ghost primitives
// ---------------------------------------------------------------------------

function SpriteGhost({ size = 144 }: { size?: number }) {
  return (
    <div
      className="bg-muted/40 rounded-xl"
      style={{ width: size, height: size }}
    />
  );
}

function SpeciesPillGhost() {
  return (
    <div className="border-border bg-background flex w-full items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-left text-xs">
      <span className="text-muted-foreground/50 min-w-0 flex-1 truncate">
        + Add Pokémon
      </span>
      <span aria-hidden className="text-muted-foreground/30 text-[9px]">
        ▾
      </span>
    </div>
  );
}

function MetaBarGhost() {
  return (
    <div className="border-border grid h-9 shrink-0 grid-cols-[1fr_auto] items-center gap-2.5 border-b border-dashed px-3 py-2">
      <span className="text-muted-foreground/30 text-[13px] font-normal italic">
        Nickname
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="border-border bg-background text-muted-foreground/40 inline-flex h-[22px] items-center justify-center rounded-[5px] border px-2 font-mono text-[11px] font-semibold">
          —
        </span>
        <span className="border-border bg-background text-muted-foreground/40 inline-flex h-[22px] items-center justify-center rounded-[5px] border px-2 font-mono text-[11px] font-semibold">
          ✦
        </span>
      </span>
    </div>
  );
}

function FormRowsGhost() {
  return (
    <>
      {(["Item", "Abil", "Nat", "Type"] as const).map((label) => (
        <div
          key={label}
          className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-1.5 rounded px-1 py-[3px]"
        >
          <span className="text-muted-foreground/30 font-mono text-[9px] font-bold tracking-[0.08em] uppercase">
            {label}
          </span>
          <span className="text-muted-foreground/25 truncate text-[11.5px] italic">
            —
          </span>
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Stats / Moves ghosts — visual structure copied from lane null branches
// without importing the lanes themselves.
// ---------------------------------------------------------------------------

const GHOST_STAT_ROWS = [
  { key: "hp", label: "HP", colorClass: "text-rose-500 dark:text-rose-400" },
  {
    key: "attack",
    label: "ATK",
    colorClass: "text-orange-500 dark:text-orange-400",
  },
  {
    key: "defense",
    label: "DEF",
    colorClass: "text-amber-500 dark:text-amber-400",
  },
  {
    key: "specialAttack",
    label: "SPA",
    colorClass: "text-sky-500 dark:text-sky-400",
  },
  {
    key: "specialDefense",
    label: "SPD",
    colorClass: "text-emerald-500 dark:text-emerald-400",
  },
  {
    key: "speed",
    label: "SPE",
    colorClass: "text-fuchsia-500 dark:text-fuchsia-400",
  },
] as const;

function StatsGhost() {
  const rowGrid =
    "grid grid-cols-[40px_30px_minmax(30px,0.8fr)_40px_minmax(60px,1.6fr)_36px] gap-1.5 items-center px-1 py-0.5 rounded";
  return (
    <div className="border-border/60 flex w-full min-w-0 flex-col justify-center gap-0.5 border-b border-dashed px-3 py-1">
      <div className={cn("mb-0.5", rowGrid)}>
        <span />
        <span className="text-muted-foreground/30 text-center font-mono text-[8.5px] font-medium tracking-wide uppercase">
          Base
        </span>
        <span />
        <span className="text-muted-foreground/30 text-center font-mono text-[8.5px] font-medium tracking-wide uppercase">
          EVs
        </span>
        <span className="text-muted-foreground/30 text-right font-mono text-[8.5px]">
          0/510
        </span>
        <span />
      </div>
      {GHOST_STAT_ROWS.map(({ key, label, colorClass }) => (
        <div key={key} className={cn(rowGrid, colorClass)}>
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] opacity-30">
            {label}
          </span>
          <span className="text-muted-foreground/25 text-right font-mono text-[9.5px] tabular-nums">
            —
          </span>
          <div className="bg-muted relative min-w-0 h-2 overflow-hidden rounded-full" />
          <div className="border-border/30 h-[18px] w-9 rounded border border-dashed" />
          <div className="relative h-3.5">
            <div className="bg-muted-foreground/40 pointer-events-none absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 rounded-full opacity-25" />
          </div>
          <span className="text-muted-foreground/25 text-right font-mono text-[11.5px] font-bold tabular-nums">
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
      <div className="flex flex-col gap-[3px]">
        <div className="grid grid-cols-[24px_32px_1fr_44px_48px] items-center gap-1 pb-0.5">
          <span />
          <span />
          <span className="text-muted-foreground/30 text-[9.5px] font-medium tracking-[0.04em] uppercase">
            NAME
          </span>
          <span className="text-muted-foreground/30 text-[9.5px] font-medium tracking-[0.04em] uppercase">
            BP
          </span>
          <span className="text-muted-foreground/30 text-[9.5px] font-medium tracking-[0.04em] uppercase">
            ACC
          </span>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[24px_32px_1fr_44px_48px] items-center gap-1 px-1 py-1"
          >
            <span />
            <span />
            <span className="text-muted-foreground/30 truncate text-[13px] font-medium">
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
