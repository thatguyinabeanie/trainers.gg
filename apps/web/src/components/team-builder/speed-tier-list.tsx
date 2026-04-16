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
}

export interface SpeedTier {
  speed: number;
  mons: SpeedTierMon[];
}

interface SpeedTierListProps {
  tiers: SpeedTier[];
  /** The selected mon's effective speed — used to split tiers into faster/your-tier/slower. */
  selectedSpeed: number;
  /** Tiers shown above and below "your tier" when collapsed. */
  neighborCount?: number;
  /** Show all tiers vs just neighbors. */
  expandedAllMeta?: boolean;
  /**
   * Whether to render in Trick Room order (reversed section meaning).
   * Tier data is passed pre-sorted in the parent; we only relabel sections.
   */
  trickRoom?: boolean;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Split tiers into (faster, yourTier, slower) relative to selectedSpeed.
 * Tiers are expected to be sorted descending by speed.
 */
function partitionTiers(
  tiers: SpeedTier[],
  selectedSpeed: number
): { faster: SpeedTier[]; yourTier: SpeedTier | null; slower: SpeedTier[] } {
  const faster: SpeedTier[] = [];
  const slower: SpeedTier[] = [];
  let yourTier: SpeedTier | null = null;
  for (const tier of tiers) {
    if (tier.speed > selectedSpeed) faster.push(tier);
    else if (tier.speed < selectedSpeed) slower.push(tier);
    else yourTier = tier;
  }
  return { faster, yourTier, slower };
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
        "flex items-center gap-1.5 text-xs",
        mon.isYours ? "text-primary font-semibold" : "text-muted-foreground",
        mon.isSelected && "text-primary"
      )}
    >
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
  );
}

// =============================================================================
// TierRow — speed-cell + mons list
// =============================================================================

interface TierRowProps {
  tier: SpeedTier;
  isYourTier: boolean;
}

function TierRow({ tier, isYourTier }: TierRowProps) {
  return (
    <div
      data-testid={`tier-${tier.speed}`}
      data-your-tier={isYourTier}
      className={cn(
        "grid grid-cols-[56px_1fr] border-t",
        isYourTier && "from-primary/10 to-card bg-gradient-to-r"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center border-r font-mono text-xs font-bold",
          isYourTier
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {tier.speed}
      </div>
      <div className="grid gap-0.5 px-3 py-1.5">
        {tier.mons.map((mon) => (
          <MonRow key={mon.id} mon={mon} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Section — header + list of rows
// =============================================================================

interface SectionProps {
  label: string;
  tiers: SpeedTier[];
}

function Section({ label, tiers }: SectionProps) {
  if (tiers.length === 0) return null;
  return (
    <div>
      <div className="text-muted-foreground px-3.5 pt-2 pb-1 text-[9px] font-semibold tracking-wider uppercase">
        {label}
      </div>
      <div>
        {tiers.map((tier) => (
          <TierRow key={tier.speed} tier={tier} isYourTier={false} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SpeedTierList
// =============================================================================

/**
 * Grouped speed-tier list. Splits the provided tiers (sorted desc for normal
 * play, asc for Trick Room) into three sections relative to the selected
 * Pokémon's effective speed.
 */
export function SpeedTierList({
  tiers,
  selectedSpeed,
  neighborCount = 3,
  expandedAllMeta = false,
  trickRoom = false,
  className,
}: SpeedTierListProps) {
  const { faster, yourTier, slower } = partitionTiers(tiers, selectedSpeed);

  const displayedFaster = expandedAllMeta
    ? faster
    : faster.slice(Math.max(0, faster.length - neighborCount));
  const displayedSlower = expandedAllMeta
    ? slower
    : slower.slice(0, neighborCount);

  // Section labels — switch meaning under Trick Room.
  const fasterLabel = trickRoom ? "Moves later" : "↑ Faster than you";
  const yourLabel = trickRoom ? "Same priority" : "→ Your tier";
  const slowerLabel = trickRoom ? "Moves first" : "↓ Slower than you";

  return (
    <div data-testid="speed-tier-list" className={cn("flex-1", className)}>
      <Section label={fasterLabel} tiers={displayedFaster} />
      {yourTier && (
        <div>
          <div className="text-muted-foreground px-3.5 pt-2 pb-1 text-[9px] font-semibold tracking-wider uppercase">
            {yourLabel}
          </div>
          <TierRow tier={yourTier} isYourTier />
        </div>
      )}
      <Section label={slowerLabel} tiers={displayedSlower} />
    </div>
  );
}
