"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

/** Badge values rendered on the right end of a mon row. */
export type SpeedTierBadge = "tie" | "threat";

/** Human-readable labels for each badge value. */
const BADGE_LABELS: Record<SpeedTierBadge, string> = {
  tie: "Tie",
  threat: "Threat",
};

export interface SpeedTierMon {
  /** Unique key (e.g., "team-42" or "meta-dragapult"). */
  id: string;
  name: string;
  spriteUrl?: string;
  isYours: boolean;
  /** The currently-selected Pokémon within "yours". */
  isSelected: boolean;
  /** Small inline tag rendered on the right end of the row. */
  badge?: SpeedTierBadge;
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
  className?: string;
}

// (no partition helpers needed — all tiers are always shown)

// =============================================================================
// Shared grid template — applied to BOTH the header row and each body row so
// columns are guaranteed to align. Change it in one place and both update.
//   col 1 BASE:     2rem   (3-digit max stat)
//   col 2 POKÉMON:  flex   (sprite + name, fills remaining space)
//   col 3 MIN:      2.5rem (3-digit stat, right-aligned)
//   col 4 NEUTRAL:  2.5rem
//   col 5 +SPE:     2.5rem
// =============================================================================

const TIER_GRID =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_2.5rem_2.5rem_2.5rem] gap-2";

// =============================================================================
// TableHeader — column labels row
// =============================================================================

function TableHeader() {
  return (
    <div
      data-testid="speed-table-header"
      data-tier-grid
      className={cn(
        TIER_GRID,
        "bg-card/95 sticky top-0 z-10 border-t px-2 backdrop-blur-sm"
      )}
    >
      <div className="text-muted-foreground flex items-center justify-center overflow-hidden py-1.5 text-[10px] font-medium tracking-wide whitespace-nowrap uppercase">
        Base
      </div>
      <div className="text-muted-foreground flex min-w-0 items-center overflow-hidden py-1.5 text-[10px] font-medium tracking-wide whitespace-nowrap uppercase">
        Pokémon
      </div>
      <div className="text-muted-foreground flex items-center justify-end overflow-hidden py-1.5 text-[10px] font-medium tracking-wide whitespace-nowrap uppercase">
        Min
      </div>
      <div className="text-muted-foreground flex items-center justify-end overflow-hidden py-1.5 text-[10px] font-medium tracking-wide whitespace-nowrap uppercase">
        Neu
      </div>
      <div className="text-muted-foreground flex items-center justify-end overflow-hidden py-1.5 text-[10px] font-medium tracking-wide whitespace-nowrap uppercase">
        Max
      </div>
    </div>
  );
}

// =============================================================================
// MonRow — single Pokémon row inside a tier group
// =============================================================================

interface MonRowProps {
  mon: SpeedTierMon;
  /** Base speed shown in col 1; undefined = render an empty cell (stacked mons). */
  baseSpeed?: number;
  isYourTier: boolean;
}

function MonRow({ mon, baseSpeed, isYourTier }: MonRowProps) {
  return (
    <div
      data-testid={`mon-${mon.id}`}
      data-yours={mon.isYours}
      data-selected={mon.isSelected}
      data-tier-grid
      className={cn(
        TIER_GRID,
        "hover:bg-muted/30 items-center border-t px-2 py-1 transition-colors duration-100",
        mon.isYours ? "text-primary font-semibold" : "text-muted-foreground",
        mon.isSelected && "text-primary"
      )}
    >
      {/* Base speed — col 1 */}
      <div
        className={cn(
          "flex items-center justify-center font-mono text-xs font-bold",
          isYourTier ? "text-primary" : "text-muted-foreground"
        )}
      >
        {baseSpeed ?? ""}
      </div>

      {/* Pokémon sprite + name — col 2 */}
      <div className="flex min-w-0 items-center gap-1 text-xs">
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
            {BADGE_LABELS[mon.badge]}
          </span>
        )}
      </div>

      {/* Min — col 3 */}
      <div
        data-testid={`stat-min-${mon.id}`}
        className="text-right font-mono text-xs"
      >
        {mon.statMin}
      </div>

      {/* Max Neutral — col 4 */}
      <div
        data-testid={`stat-neutral-${mon.id}`}
        className="text-right font-mono text-xs"
      >
        {mon.statMaxNeutral}
      </div>

      {/* Max Positive — col 5 */}
      <div
        data-testid={`stat-positive-${mon.id}`}
        className="text-right font-mono text-xs font-semibold"
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
  // the first mon's baseSpeed for the left column. Subsequent mons in the same
  // tier show an empty cell so the speed value doesn't repeat.
  // We intentionally avoid falling back to tier.speed here: a tier with zero
  // mons should never be rendered, and showing the effective speed in the BASE
  // column would be misleading (base ≠ effective when modifiers are active).
  const displayBaseSpeed = tier.mons[0]?.baseSpeed;

  return (
    <div
      data-testid={`tier-${tier.speed}`}
      data-your-tier={isYourTier}
      className={cn(isYourTier && "from-primary/10 to-card bg-linear-to-r")}
    >
      {tier.mons.map((mon, idx) => (
        <MonRow
          key={mon.id}
          mon={mon}
          baseSpeed={idx === 0 ? displayBaseSpeed : undefined}
          isYourTier={isYourTier}
        />
      ))}
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
  className,
}: SpeedTierListProps) {
  return (
    <div data-testid="speed-tier-list" className={cn("flex-1", className)}>
      <TableHeader />
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
