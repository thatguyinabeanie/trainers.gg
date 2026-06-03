"use client";

// =============================================================================
// Shared ghost primitives used by both CompactRowGhost and GridRowGhost.
//
// Extracted to avoid duplication between the two layout-specific ghost files
// while keeping StatsGhost/MovesGhost separate (they differ in border direction
// and flex axes between compact vs grid).
// =============================================================================

export function SpriteGhost({ size = 144 }: { size?: number }) {
  return (
    <div
      className="bg-muted/40 rounded-xl"
      style={{ width: size, height: size }}
    />
  );
}

export function SpeciesPillGhost() {
  return (
    <div className="border-border bg-background flex w-full items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-left text-xs">
      <span className="text-muted-foreground/50 min-w-0 flex-1 truncate">
        + Add Pokémon
      </span>
      <span aria-hidden className="text-muted-foreground/30 text-xs">
        ▾
      </span>
    </div>
  );
}

export function MetaBarGhost() {
  return (
    <div className="border-border grid h-9 shrink-0 grid-cols-[1fr_auto] items-center gap-2.5 border-b border-dashed px-3 py-2">
      <span className="text-muted-foreground/30 text-sm font-normal italic">
        Nickname
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="border-border bg-background text-muted-foreground/40 inline-flex h-6 items-center justify-center rounded-[5px] border px-2 font-mono text-xs font-semibold">
          —
        </span>
        <span className="border-border bg-background text-muted-foreground/40 inline-flex h-6 items-center justify-center rounded-[5px] border px-2 font-mono text-xs font-semibold">
          ✦
        </span>
      </span>
    </div>
  );
}

export function FormRowsGhost() {
  return (
    <>
      {(["Item", "Abil", "Nat", "Type"] as const).map((label) => (
        <div
          key={label}
          className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-1.5 rounded px-1 py-1"
        >
          <span className="text-muted-foreground/30 font-mono text-xs font-bold tracking-[0.08em] uppercase">
            {label}
          </span>
          <span className="text-muted-foreground/25 truncate text-xs italic">
            —
          </span>
        </div>
      ))}
    </>
  );
}

export const GHOST_STAT_ROWS = [
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
