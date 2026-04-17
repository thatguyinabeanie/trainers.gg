"use client";

import { useState } from "react";
import Image from "next/image";

import {
  type GameFormat,
  type MetaSpeedEntry,
  type SpeedModifiers,
  applySpeedModifiers,
  calculateChampionsStat,
  calculateStat,
  getBaseStats,
  getMetaSpeedTiers,
  getNatureMultiplier,
  getSpeedTierLabel,
  groupBySpeed,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import {
  type SpeedTier,
  type SpeedTierMon,
  SpeedTierList,
} from "./speed-tier-list";
import { type SpeedToggleState, SpeedToggleRail } from "./speed-toggle-rail";

// =============================================================================
// Types
// =============================================================================

interface SpeedPanelProps {
  selectedPokemon: Tables<"pokemon">;
  team: Tables<"pokemon">[];
  format: GameFormat;
  className?: string;
}

/** Internal record used during speed-tier construction. */
interface ScoredMon {
  speed: number;
  mon: SpeedTierMon;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TOGGLE_STATE: SpeedToggleState = {
  field: { tailwind: false, weather: "none" },
  stage: 0,
  item: "",
  status: "healthy",
};

// =============================================================================
// Speed math
// =============================================================================

/**
 * Compute the base (pre-modifier) Speed stat for a team Pokémon.
 * Branches on Champions formula vs classic.
 */
function computeBaseSpeed(
  pokemon: Tables<"pokemon">,
  format: GameFormat
): number {
  const baseStats = getBaseStats(pokemon.species);
  if (!baseStats) return 0;

  const natureMultiplier = getNatureMultiplier(pokemon.nature, "speed");

  // Champions has its own SP-based stat formula at fixed L50.
  if (format.generation === 10) {
    return calculateChampionsStat(
      baseStats.speed,
      pokemon.ev_speed ?? 0,
      natureMultiplier
    );
  }

  return calculateStat(
    baseStats.speed,
    pokemon.iv_speed ?? 31,
    pokemon.ev_speed ?? 0,
    pokemon.level ?? 50,
    natureMultiplier
  );
}

/**
 * Compute the three display speed columns for a team Pokémon.
 * These are always shown in the tier list alongside the mon's name.
 *
 * - min: 0 EVs, 0 IVs, neutral nature, L50
 * - maxNeutral: 252 EVs, neutral nature, L50
 * - maxPositive: 252 EVs, +nature (×1.1), L50
 *
 * For Champions (gen 10), uses the SP formula with 0 SP / 32 SP.
 * Champions supports nature multipliers per the formula — maxPositive uses ×1.1.
 */
function computeStatColumns(
  pokemon: Tables<"pokemon">,
  format: GameFormat
): { base: number; min: number; maxNeutral: number; maxPositive: number } {
  const baseStats = getBaseStats(pokemon.species);
  if (!baseStats) return { base: 0, min: 0, maxNeutral: 0, maxPositive: 0 };

  const b = baseStats.speed;

  if (format.generation === 10) {
    return {
      base: b,
      min: calculateChampionsStat(b, 0, 1.0),
      maxNeutral: calculateChampionsStat(b, 32, 1.0),
      maxPositive: calculateChampionsStat(b, 32, 1.1),
    };
  }

  return {
    base: b,
    min: calculateStat(b, 0, 0, 50, 1.0),
    maxNeutral: calculateStat(b, 31, 252, 50, 1.0),
    maxPositive: calculateStat(b, 31, 252, 50, 1.1),
  };
}

/**
 * Compute the three display speed columns for a meta entry.
 * Meta entries store fastSpread (252 EVs, +nature) and slowSpread (0 EVs, neutral).
 * We reconstruct min separately from base speed using the standard formula.
 */
function computeMetaStatColumns(
  entry: MetaSpeedEntry,
  format: GameFormat
): { base: number; min: number; maxNeutral: number; maxPositive: number } {
  const b = entry.base;

  if (format.generation === 10) {
    // Champions SP-based formula
    return {
      base: b,
      min: calculateChampionsStat(b, 0, 1.0),
      maxNeutral: calculateChampionsStat(b, 32, 1.0),
      maxPositive: calculateChampionsStat(b, 32, 1.1),
    };
  }

  return {
    base: b,
    // entry.slowSpread is 0 EVs neutral — that IS max neutral with 0 EVs.
    // Min (0 EVs, 0 IVs, neutral) is slightly lower.
    min: calculateStat(b, 0, 0, 50, 1.0),
    maxNeutral: calculateStat(b, 31, 252, 50, 1.0),
    maxPositive: entry.fastSpread, // pre-computed fast spread = 252 EVs + nature
  };
}

/** Item id from the toggle state to a SpeedModifiers item value. */
function toItemMod(item: string): SpeedModifiers["item"] {
  if (!item) return null;
  // Cast: we intentionally only allow ids that match the SpeedModifiers union.
  return item as SpeedModifiers["item"];
}

/**
 * Convert an opponent meta entry into an effective-speed scoring + display row.
 * Only ability + weather + tailwind apply (we don't speculate about their item /
 * stage / status).
 */
function metaToScoredMon(
  entry: MetaSpeedEntry,
  toggle: SpeedToggleState,
  format: GameFormat
): ScoredMon {
  // Always use fastSpread for ranking — the tier list shows both columns anyway.
  const baseSpeed = entry.fastSpread;

  const speed = applySpeedModifiers(baseSpeed, {
    ability: entry.speedAbility,
    field: {
      weather: toggle.field.weather,
      tailwind: toggle.field.tailwind,
    },
  });

  const statCols = computeMetaStatColumns(entry, format);
  const sprite = safeSprite(entry.species);

  return {
    speed,
    mon: {
      id: `meta-${entry.species}`,
      name: entry.displayName,
      spriteUrl: sprite,
      isYours: false,
      isSelected: false,
      baseSpeed: statCols.base,
      statMin: statCols.min,
      statMaxNeutral: statCols.maxNeutral,
      statMaxPositive: statCols.maxPositive,
    },
  };
}

/**
 * Convert a team Pokémon into an effective-speed scoring + display row.
 *
 * - For the selected mon: stage / item / status / ability+weather / tailwind all apply.
 * - For other team members: only ability+weather + tailwind apply.
 */
function teamMonToScored(
  pokemon: Tables<"pokemon">,
  format: GameFormat,
  toggle: SpeedToggleState,
  isSelected: boolean
): ScoredMon {
  const baseSpeed = computeBaseSpeed(pokemon, format);
  const mods: SpeedModifiers = isSelected
    ? {
        stage: toggle.stage,
        item: toItemMod(toggle.item),
        status: toggle.status,
        ability: pokemon.ability ?? undefined,
        field: {
          weather: toggle.field.weather,
          tailwind: toggle.field.tailwind,
        },
      }
    : {
        ability: pokemon.ability ?? undefined,
        field: {
          weather: toggle.field.weather,
          tailwind: toggle.field.tailwind,
        },
      };
  const speed = applySpeedModifiers(baseSpeed, mods);
  const statCols = computeStatColumns(pokemon, format);
  const sprite = safeSprite(pokemon.species);

  return {
    speed,
    mon: {
      id: `team-${pokemon.id}`,
      name: pokemon.species,
      spriteUrl: sprite,
      isYours: true,
      isSelected,
      baseSpeed: statCols.base,
      statMin: statCols.min,
      statMaxNeutral: statCols.maxNeutral,
      statMaxPositive: statCols.maxPositive,
    },
  };
}

/** Sprite lookup that swallows any underlying lookup miss. */
function safeSprite(species: string): string | undefined {
  try {
    return getPokemonSprite(species).url;
  } catch {
    return undefined;
  }
}

// =============================================================================
// SpeedPanel
// =============================================================================

/**
 * Right-rail "Speed" panel. Renders the selected Pokémon's speed picture
 * against its team and the meta, with a toggle rail for what-if exploration.
 *
 * State resets when `selectedPokemon` changes (the user is asking "what if for
 * THIS mon"). We use `key` on the inner stateful subtree to make this reset
 * idiomatic and effect-free.
 */
export function SpeedPanel({
  selectedPokemon,
  team,
  format,
  className,
}: SpeedPanelProps) {
  return (
    <SpeedPanelInner
      key={selectedPokemon.id}
      selectedPokemon={selectedPokemon}
      team={team}
      format={format}
      className={className}
    />
  );
}

function SpeedPanelInner({
  selectedPokemon,
  team,
  format,
  className,
}: SpeedPanelProps) {
  const [toggle, setToggle] = useState<SpeedToggleState>(DEFAULT_TOGGLE_STATE);

  // ---- score every relevant mon -------------------------------------------

  const teamScored: ScoredMon[] = team.map((p) =>
    teamMonToScored(p, format, toggle, p.id === selectedPokemon.id)
  );

  // Team species set — used to dedupe meta opponents that overlap with the team.
  const teamSpeciesIds = new Set(
    team.map((p) => p.species.toLowerCase().replace(/[\s\-_]+/g, ""))
  );

  const metaTiers = getMetaSpeedTiers(format.id);
  const metaScored: ScoredMon[] = metaTiers
    .filter(
      (entry) =>
        !teamSpeciesIds.has(
          entry.species.toLowerCase().replace(/[\s\-_]+/g, "")
        )
    )
    .map((entry) => metaToScoredMon(entry, toggle, format));

  const allScored: ScoredMon[] = [...teamScored, ...metaScored];

  // ---- selected mon's effective speed -------------------------------------

  const selectedScored = teamScored.find((s) => s.mon.isSelected);
  const effectiveSpeed = selectedScored?.speed ?? 0;
  const tierLabel = getSpeedTierLabel(effectiveSpeed);

  // ---- summary counts (selected vs all opponents counted) ------------------
  // Opponents = everything that isn't the selected mon (team mates + meta).
  // Use maxPositive speed for opponents — that's the standard threat assumption.
  const opponents = allScored.filter((s) => !s.mon.isSelected);
  let outspeedCount = 0;
  let tieCount = 0;
  let outspedCount = 0;
  for (const opp of opponents) {
    if (effectiveSpeed > opp.speed) outspeedCount += 1;
    else if (effectiveSpeed === opp.speed) tieCount += 1;
    else outspedCount += 1;
  }

  // ---- group all mons into tiers ------------------------------------------

  const groups = groupBySpeed(allScored);

  // Tag tie-risk badges on opponents that share the selected mon's tier.
  const tiers: SpeedTier[] = groups.map((g) => ({
    speed: g.speed,
    mons: g.items.map((s) => {
      const mon = s.mon;
      if (
        !mon.isYours &&
        s.speed === effectiveSpeed &&
        effectiveSpeed > 0 &&
        !mon.badge
      ) {
        return { ...mon, badge: "tie" };
      }
      return mon;
    }),
  }));

  const orderedTiers = tiers;

  // ---- render --------------------------------------------------------------

  const selectedSprite = safeSprite(selectedPokemon.species);

  return (
    <div
      className={cn("bg-card overflow-hidden rounded-lg shadow-sm", className)}
    >
      {/* L1 — Hero ---------------------------------------------------------- */}
      <div className="from-primary/5 to-card border-b bg-gradient-to-br px-4 py-3">
        <div className="text-muted-foreground text-[9px] font-semibold tracking-wider uppercase">
          Selected · {selectedPokemon.species}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="bg-primary/10 flex size-9 items-center justify-center rounded-full">
            {selectedSprite && (
              <Image
                src={selectedSprite}
                alt=""
                width={28}
                height={28}
                unoptimized
                className="size-7 object-contain"
              />
            )}
          </div>
          <span className="text-foreground text-sm font-semibold">Speed</span>
          <span
            data-testid="hero-tier-label"
            className="border-primary text-primary rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
          >
            {tierLabel.replace(/-/g, " ")}
          </span>
          <span
            data-testid="hero-speed"
            className="text-primary ml-auto font-mono text-2xl font-bold"
          >
            {effectiveSpeed}
          </span>
        </div>
      </div>

      {/* L2 — Summary ------------------------------------------------------- */}
      <div className="grid grid-cols-3 border-b px-4 py-2.5 text-center">
        <SummaryCell
          testId="summary-outspeed"
          value={outspeedCount}
          label="outspeed"
          tone="ok"
        />
        <SummaryCell
          testId="summary-tie"
          value={tieCount}
          label="tie"
          tone="warn"
        />
        <SummaryCell
          testId="summary-outsped"
          value={outspedCount}
          label="outsped by"
          tone="bad"
        />
      </div>

      {/* L3 — Toggles (horizontal bar) -------------------------------------- */}
      <SpeedToggleRail state={toggle} onChange={setToggle} format={format} />

      {/* L4 — Tier list (full panel width) --------------------------------- */}
      <div className="max-h-[calc(100vh-24rem)] overflow-y-auto">
        <SpeedTierList tiers={orderedTiers} selectedSpeed={effectiveSpeed} />
      </div>
    </div>
  );
}

// =============================================================================
// SummaryCell
// =============================================================================

interface SummaryCellProps {
  value: number;
  label: string;
  tone: "ok" | "warn" | "bad";
  testId: string;
}

function SummaryCell({ value, label, tone, testId }: SummaryCellProps) {
  return (
    <div className="flex flex-col items-center">
      <span
        data-testid={testId}
        className={cn(
          "font-mono text-base font-bold",
          tone === "ok" && "text-emerald-600 dark:text-emerald-400",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
          tone === "bad" && "text-destructive"
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground mt-1 text-[9px] font-semibold tracking-wider uppercase">
        {label}
      </span>
    </div>
  );
}
