"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface SpeedTierMon {
  /** Unique key (e.g., "team-42" or "meta-dragapult"). */
  id: string;
  name: string;
  spriteUrl?: string;
  isYours: boolean;
  /** The currently-selected Pokémon within "yours". */
  isSelected: boolean;
  /** Small inline tag rendered on the right end of the row. */
  badge?: string;
  /** Base Speed stat for the BASE SPEED column (left-most). */
  baseSpeed: number;
  /** Min stat: L50, 0 EVs, neutral nature, 0 IVs. */
  statMin: number;
  /** Max neutral stat: L50, 252 EVs, neutral nature. */
  statMaxNeutral: number;
  /** Max positive stat: L50, 252 EVs, +nature (×1.1). */
  statMaxPositive: number;
}

export interface SpeedTier {
  /** Effective speed — used for sorting, sections, and grouping. */
  speed: number;
  mons: SpeedTierMon[];
}

interface SpeedTierListProps {
  tiers: SpeedTier[];
  /**
   * The selected mon's effective speed — used only to highlight "your tier"
   * row. No partitioning or neighbor-count logic; all tiers are always shown.
   */
  selectedSpeed: number;
  /**
   * Whether to render in Trick Room order (reversed section meaning).
   * Tier data is passed pre-sorted in the parent; we only relabel sections.
   */
  trickRoom?: boolean;
  className?: string;
}

// (no partition helpers needed — all tiers are always shown)

// =============================================================================
// TableHeader — column labels row
// =============================================================================

function TableHeader() {
  return (
    <div
      data-testid="speed-table-header"
      className="bg-muted/20 grid grid-cols-[28px_1fr_32px_40px_36px] border-t px-0"
    >
      <div className="text-muted-foreground flex items-center justify-center px-0.5 py-1.5 text-[9px] font-medium tracking-wide uppercase">
        Base
      </div>
      <div className="text-muted-foreground flex min-w-0 items-center px-2 py-1.5 text-[9px] font-medium tracking-wide uppercase">
        Pokémon
      </div>
      <div className="text-muted-foreground flex items-center justify-end px-0.5 py-1.5 text-[9px] font-medium tracking-wide uppercase">
        Min
      </div>
      <div className="text-muted-foreground flex items-center justify-end px-0.5 py-1.5 text-[9px] font-medium tracking-wide uppercase">
        Neutral
      </div>
      <div className="text-muted-foreground flex items-center justify-end px-0.5 py-1.5 text-[9px] font-medium tracking-wide uppercase">
        +Spe
      </div>
    </div>
  );
}

// =============================================================================
// MonRow — single Pokémon row inside a tier group
// =============================================================================

interface MonRowProps {
  mon: SpeedTierMon;
}

function MonRow({ mon }: MonRowProps) {
  return (
    <div
      data-testid={`mon-${mon.id}`}
      data-yours={mon.isYours}
      data-selected={mon.isSelected}
      className={cn(
        "grid grid-cols-[1fr_32px_40px_36px] items-center py-0.5",
        mon.isYours ? "text-primary font-semibold" : "text-muted-foreground",
        mon.isSelected && "text-primary"
      )}
    >
      {/* Pokémon sprite + name */}
      <div className="flex min-w-0 items-center gap-1 px-2 text-xs">
        {mon.spriteUrl ? (
          <Image
            src={mon.spriteUrl}
            alt=""
            width={24}
            height={24}
            unoptimized
            className="size-6 shrink-0 object-contain"
          />
        ) : (
          <span className="bg-muted inline-block size-6 shrink-0 rounded" />
        )}
        <span className="truncate">{mon.name}</span>
        {mon.badge && (
          <span
            className={cn(
              "ml-auto rounded px-1 py-0.5 text-[8px] font-semibold tracking-wide uppercase",
              mon.badge === "tie"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : mon.badge === "threat"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {mon.badge}
          </span>
        )}
      </div>

      {/* Min */}
      <div
        data-testid={`stat-min-${mon.id}`}
        className="pr-0.5 text-right font-mono text-xs"
      >
        {mon.statMin}
      </div>

      {/* Max Neutral */}
      <div
        data-testid={`stat-neutral-${mon.id}`}
        className="pr-0.5 text-right font-mono text-xs"
      >
        {mon.statMaxNeutral}
      </div>

      {/* Max Positive */}
      <div
        data-testid={`stat-positive-${mon.id}`}
        className="pr-0.5 text-right font-mono text-xs font-semibold"
      >
        {mon.statMaxPositive}
      </div>
    </div>
  );
}

// =============================================================================
// TierRow — base-speed cell + mons list
// =============================================================================

interface TierRowProps {
  tier: SpeedTier;
  isYourTier: boolean;
}

function TierRow({ tier, isYourTier }: TierRowProps) {
  // All mons in a tier share the same base speed (speed-tie grouping), so use
  // the first mon's baseSpeed for the left column.
  const displayBaseSpeed = tier.mons[0]?.baseSpeed ?? tier.speed;

  return (
    <div
      data-testid={`tier-${tier.speed}`}
      data-your-tier={isYourTier}
      className={cn(
        "grid grid-cols-[28px_1fr] border-t",
        isYourTier && "from-primary/10 to-card bg-gradient-to-r"
      )}
    >
      {/* BASE SPEED cell — spans all mon rows vertically */}
      <div
        className={cn(
          "flex items-center justify-center border-r font-mono text-xs font-bold",
          isYourTier
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {displayBaseSpeed}
      </div>

      {/* Mon rows — stacked vertically, each has name + min/neutral/+spe */}
      <div className="grid gap-0 py-1">
        {tier.mons.map((mon) => (
          <MonRow key={mon.id} mon={mon} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SpeedTierList
// =============================================================================

/**
 * Grouped speed-tier list. Displays ALL tiers with a 5-column layout:
 * BASE SPEED | POKÉMON | MIN | MAX NEUTRAL | MAX POSITIVE.
 *
 * Multiple mons sharing the same effective speed are stacked within one row,
 * sharing the BASE SPEED cell on the left.
 *
 * Design choice: the tier list columns (min/neutral/+spe) are static species
 * data — they show unmodified base+investment values regardless of field
 * conditions. Only the hero (selected mon's speed in the parent panel) updates
 * with toggle state. This keeps the table a stable reference while toggles
 * serve what-if scenario planning.
 *
 * Section labels (faster/your-tier/slower) have been intentionally removed —
 * the full meta is always shown flat with the selected mon's row highlighted.
 * Trick Room reversal is reflected in the pre-sorted order passed by the parent.
 */
export function SpeedTierList({
  tiers,
  selectedSpeed,
  trickRoom = false,
  className,
}: SpeedTierListProps) {
  // Section labels for Trick Room context — shown above the list.
  const contextLabel = trickRoom ? "Moves first" : "↑ Faster";
  const bottomLabel = trickRoom ? "Moves later" : "↓ Slower";

  return (
    <div data-testid="speed-tier-list" className={cn("flex-1", className)}>
      <TableHeader />
      {/* Context hint row — appears once above the tier list */}
      {tiers.length > 0 && (
        <div className="text-muted-foreground flex justify-between px-3.5 pt-2 pb-1 text-[9px] font-semibold tracking-wider uppercase">
          <span>{contextLabel}</span>
          <span>{bottomLabel}</span>
        </div>
      )}
      {tiers.map((tier) => (
        <TierRow
          key={tier.speed}
          tier={tier}
          isYourTier={tier.speed === selectedSpeed}
        />
      ))}
    </div>
  );
}
