"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

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
  oppEVs: "max",
  field: { tailwind: false, weather: "none", trickRoom: false },
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
  toggle: SpeedToggleState
): ScoredMon {
  const baseSpeed =
    toggle.oppEVs === "max" ? entry.fastSpread : entry.slowSpread;

  const speed = applySpeedModifiers(baseSpeed, {
    ability: entry.speedAbility,
    field: {
      weather: toggle.field.weather,
      tailwind: toggle.field.tailwind,
    },
  });

  const sprite = safeSprite(entry.species);
  return {
    speed,
    mon: {
      id: `meta-${entry.species}`,
      name: entry.displayName,
      spriteUrl: sprite,
      isYours: false,
      isSelected: false,
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
  const sprite = safeSprite(pokemon.species);

  return {
    speed,
    mon: {
      id: `team-${pokemon.id}`,
      name: pokemon.species,
      spriteUrl: sprite,
      isYours: true,
      isSelected,
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
  const [allMetaExpanded, setAllMetaExpanded] = useState(false);

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
    .map((entry) => metaToScoredMon(entry, toggle));

  const allScored: ScoredMon[] = [...teamScored, ...metaScored];

  // ---- selected mon's effective speed -------------------------------------

  const selectedScored = teamScored.find((s) => s.mon.isSelected);
  const effectiveSpeed = selectedScored?.speed ?? 0;
  const tierLabel = getSpeedTierLabel(effectiveSpeed);

  // ---- summary counts (selected vs all opponents counted) ------------------
  // Opponents = everything that isn't the selected mon (team mates + meta).
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

  // Trick Room: reverse the visual ordering so the slowest tier sits at top.
  const orderedTiers = toggle.field.trickRoom ? tiers.slice().reverse() : tiers;

  // ---- render --------------------------------------------------------------

  // Total tiers minus what we already show in collapsed neighbor view.
  const totalTiers = orderedTiers.length;
  const fasterCount = orderedTiers.filter((t) =>
    toggle.field.trickRoom ? t.speed < effectiveSpeed : t.speed > effectiveSpeed
  ).length;
  const slowerCount = orderedTiers.filter((t) =>
    toggle.field.trickRoom ? t.speed > effectiveSpeed : t.speed < effectiveSpeed
  ).length;
  const yourTierExists = orderedTiers.some((t) => t.speed === effectiveSpeed);
  const shownInCollapsed =
    Math.min(3, fasterCount) +
    (yourTierExists ? 1 : 0) +
    Math.min(3, slowerCount);
  const remainingCount = Math.max(0, totalTiers - shownInCollapsed);

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

      {/* L3 — Body: toggle rail | tier list -------------------------------- */}
      <div className="flex">
        <SpeedToggleRail state={toggle} onChange={setToggle} format={format} />
        <SpeedTierList
          tiers={orderedTiers}
          selectedSpeed={effectiveSpeed}
          neighborCount={3}
          trickRoom={toggle.field.trickRoom}
        />
      </div>

      {/* L4 — All meta tiers expand ---------------------------------------- */}
      <div className="border-t">
        <button
          type="button"
          aria-expanded={allMetaExpanded}
          onClick={() => setAllMetaExpanded((v) => !v)}
          className="bg-muted/30 hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors duration-150"
        >
          <span>All meta tiers</span>
          <span className="flex items-center gap-2">
            {!allMetaExpanded && remainingCount > 0 && (
              <span className="text-muted-foreground text-[10px] font-medium normal-case">
                show {remainingCount} more
              </span>
            )}
            <ChevronDown
              className={cn(
                "text-muted-foreground size-3.5 transition-transform duration-150",
                allMetaExpanded ? "rotate-0" : "-rotate-90"
              )}
            />
          </span>
        </button>
        {allMetaExpanded && (
          <div className="max-h-96 overflow-y-auto">
            <SpeedTierList
              tiers={orderedTiers}
              selectedSpeed={effectiveSpeed}
              neighborCount={3}
              expandedAllMeta
              trickRoom={toggle.field.trickRoom}
            />
          </div>
        )}
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
