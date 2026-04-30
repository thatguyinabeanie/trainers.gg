"use client";

import { useState } from "react";
import Image from "next/image";

import {
  type GameFormat,
  type MetaSpeedEntry,
  type SpeedAbility,
  type SpeedModifiers,
  type SpeedTierLabel,
  applySpeedModifiers,
  calculateChampionsStat,
  calculateStat,
  getBaseStats,
  getLegalSpecies,
  getMetaSpeedTiers,
  getNatureMultiplier,
  getSpeedAffectingItems,
  getSpeedTierLabel,
  getValidAbilities,
  groupBySpeed,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";

// =============================================================================
// Types
// =============================================================================

export interface SpeedTiersPanelProps {
  team: TeamWithPokemon["team_pokemon"];
  activeIdx: number;
  format: GameFormat | undefined;
}

type Weather = "none" | "sun" | "rain" | "sand" | "snow";

interface ToggleState {
  tailwind: boolean;
  weather: Weather;
  item: string;
  stage: number;
  status: "healthy" | "paralyzed";
  trickRoom: boolean;
}

interface ScoredMon {
  speed: number;
  actualSpeed: number;
  mon: {
    id: string;
    name: string;
    spriteUrl?: string;
    isYours: boolean;
    isSelected: boolean;
    baseSpeed: number;
    statMin: number;
    statMaxNeutral: number;
    statMaxPositive: number;
    badge?: "tie" | "threat";
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TOGGLE: ToggleState = {
  tailwind: false,
  weather: "none",
  item: "",
  stage: 0,
  status: "healthy",
  trickRoom: false,
};

const SPEED_TIER_LABELS: Record<SpeedTierLabel, string> = {
  "very slow": "Very Slow",
  slow: "Slow",
  "mid-slow": "Mid-Slow",
  mid: "Mid",
  "mid-fast": "Mid-Fast",
  fast: "Fast",
  "very fast": "Very Fast",
};

const WEATHER_LABELS: Record<Weather, string> = {
  none: "None",
  sun: "Sun",
  rain: "Rain",
  sand: "Sand",
  snow: "Snow",
};

const STAGE_MIN = -6;
const STAGE_MAX = 6;

const SPEED_ABILITY_LOOKUP: Partial<Record<string, SpeedAbility>> = {
  Chlorophyll: "chlorophyll",
  "Swift Swim": "swift-swim",
  "Sand Rush": "sand-rush",
  "Slush Rush": "slush-rush",
  "Speed Boost": "speed-boost",
  Unburden: "unburden",
  "Quick Feet": "quick-feet",
};

// =============================================================================
// Helpers
// =============================================================================

function isChampionsFormat(format: GameFormat): boolean {
  return format.generation === 10;
}

function normalizeSpecies(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]+/g, "");
}

function safeSprite(species: string): string | undefined {
  try {
    return getPokemonSprite(species).url;
  } catch {
    return undefined;
  }
}

function computeBaseSpeed(
  pokemon: Tables<"pokemon">,
  format: GameFormat
): number {
  const stats = getBaseStats(pokemon.species ?? "");
  if (!stats) return 0;
  const nat = getNatureMultiplier(pokemon.nature ?? null, "speed");
  if (isChampionsFormat(format)) {
    return calculateChampionsStat(stats.speed, pokemon.ev_speed ?? 0, nat);
  }
  return calculateStat(
    stats.speed,
    pokemon.iv_speed ?? 31,
    pokemon.ev_speed ?? 0,
    pokemon.level ?? 50,
    nat
  );
}

function computeStatColumns(
  pokemon: Tables<"pokemon">,
  format: GameFormat
): { base: number; min: number; maxNeutral: number; maxPositive: number } {
  const stats = getBaseStats(pokemon.species ?? "");
  if (!stats)
    return { base: 0, min: 0, maxNeutral: 0, maxPositive: 0 };
  const b = stats.speed;
  if (isChampionsFormat(format)) {
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

function computeMetaStatColumns(
  entry: MetaSpeedEntry,
  format: GameFormat
): { base: number; min: number; maxNeutral: number; maxPositive: number } {
  const b = entry.base;
  if (isChampionsFormat(format)) {
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
    maxPositive: entry.fastSpread,
  };
}

function toItemMod(item: string): SpeedModifiers["item"] {
  if (!item) return null;
  return item as SpeedModifiers["item"];
}

function buildFullMetaTiers(
  legalSpecies: ReadonlySet<string>,
  format: GameFormat
): MetaSpeedEntry[] {
  const champions = isChampionsFormat(format);
  const entries: MetaSpeedEntry[] = [];
  for (const species of legalSpecies) {
    const stats = getBaseStats(species);
    if (!stats) continue;
    const b = stats.speed;
    const fastSpread = champions
      ? calculateChampionsStat(b, 32, 1.1)
      : calculateStat(b, 31, 252, 50, 1.1);
    const slowSpread = champions
      ? calculateChampionsStat(b, 0, 1.0)
      : calculateStat(b, 31, 0, 50, 1.0);
    const abilities = getValidAbilities(species);
    const speedAbility = abilities
      .map((a) => SPEED_ABILITY_LOOKUP[a])
      .find(Boolean) as SpeedAbility | undefined;
    entries.push({
      species,
      displayName: species,
      base: b,
      fastSpread,
      slowSpread,
      speedAbility,
    });
  }
  return entries;
}

function teamMonToScored(
  pokemon: Tables<"pokemon">,
  format: GameFormat,
  toggle: ToggleState,
  isSelected: boolean
): ScoredMon {
  const statCols = computeStatColumns(pokemon, format);
  const fieldMods: SpeedModifiers = {
    ability: pokemon.ability ?? undefined,
    field: { weather: toggle.weather, tailwind: toggle.tailwind },
  };
  const selectedMods: SpeedModifiers = {
    ...fieldMods,
    stage: toggle.stage,
    item: toItemMod(toggle.item),
    status: toggle.status,
  };
  const actualBase = computeBaseSpeed(pokemon, format);
  const speed = applySpeedModifiers(
    actualBase,
    isSelected ? selectedMods : fieldMods
  );
  return {
    speed,
    actualSpeed: speed,
    mon: {
      id: `team-${pokemon.id}`,
      name: pokemon.species ?? "Unknown",
      spriteUrl: safeSprite(pokemon.species ?? ""),
      isYours: true,
      isSelected,
      baseSpeed: statCols.base,
      statMin: statCols.min,
      statMaxNeutral: statCols.maxNeutral,
      statMaxPositive: statCols.maxPositive,
    },
  };
}

function metaToScored(
  entry: MetaSpeedEntry,
  toggle: ToggleState,
  format: GameFormat
): ScoredMon {
  const baseSpeed = entry.fastSpread;
  const speed = applySpeedModifiers(baseSpeed, {
    ability: entry.speedAbility,
    field: { weather: toggle.weather, tailwind: toggle.tailwind },
  });
  const statCols = computeMetaStatColumns(entry, format);
  return {
    speed,
    actualSpeed: speed,
    mon: {
      id: `meta-${entry.species}`,
      name: entry.displayName,
      spriteUrl: safeSprite(entry.species),
      isYours: false,
      isSelected: false,
      baseSpeed: statCols.base,
      statMin: statCols.min,
      statMaxNeutral: statCols.maxNeutral,
      statMaxPositive: statCols.maxPositive,
    },
  };
}

// =============================================================================
// Tier row grid
// =============================================================================

const TIER_GRID =
  "grid grid-cols-[2.75rem_minmax(0,1fr)_2.5rem_2.5rem_2.5rem] gap-2";

function TierTableHeader() {
  return (
    <div className={cn(TIER_GRID, "bg-card/95 sticky top-0 z-10 border-b px-2")}>
      <div className="text-muted-foreground py-1.5 text-center text-[10px] font-medium uppercase tracking-wide">
        Base
      </div>
      <div className="text-muted-foreground py-1.5 text-[10px] font-medium uppercase tracking-wide">
        Pokémon
      </div>
      <div className="text-muted-foreground py-1.5 text-right text-[10px] font-medium uppercase tracking-wide">
        Min
      </div>
      <div className="text-muted-foreground py-1.5 text-right text-[10px] font-medium uppercase tracking-wide">
        Neu
      </div>
      <div className="text-muted-foreground py-1.5 text-right text-[10px] font-medium uppercase tracking-wide">
        +Spe
      </div>
    </div>
  );
}

interface TierMonRowProps {
  scored: ScoredMon;
  heroSpeed: number;
  trickRoom: boolean;
}

function TierMonRow({ scored, heroSpeed, trickRoom }: TierMonRowProps) {
  const { mon, speed } = scored;
  const isTie = !mon.isSelected && speed === heroSpeed && heroSpeed > 0;
  return (
    <div
      className={cn(
        TIER_GRID,
        "hover:bg-muted/20 items-center border-t px-2 py-1 transition-colors",
        mon.isYours ? "text-primary font-semibold" : "text-muted-foreground"
      )}
    >
      <div className="flex items-center justify-center font-mono text-xs">
        {mon.baseSpeed}
      </div>
      <div className="flex min-w-0 items-center gap-1 text-xs">
        {mon.spriteUrl ? (
          <Image
            src={mon.spriteUrl}
            alt=""
            width={20}
            height={20}
            unoptimized
            className="size-5 shrink-0 object-contain"
          />
        ) : (
          <span className="bg-muted inline-block size-5 shrink-0 rounded" />
        )}
        <span className="truncate">{mon.name}</span>
        {isTie && (
          <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 ml-auto rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide">
            {trickRoom ? "Tie" : "Tie"}
          </span>
        )}
      </div>
      <div className="text-right font-mono text-xs">{mon.statMin}</div>
      <div className="text-right font-mono text-xs">{mon.statMaxNeutral}</div>
      <div className="text-right font-mono text-xs">{mon.statMaxPositive}</div>
    </div>
  );
}

// =============================================================================
// SpeedTiersPanel
// =============================================================================

/**
 * Pikalytics-style speed tier ladder for the v2 team builder bottom drawer.
 *
 * Shows your team vs the format meta at all stat spreads.
 * Trick Room toggle inverts the sort order and outspeeds/outsped semantics.
 */
export function SpeedTiersPanel({
  team,
  activeIdx,
  format,
}: SpeedTiersPanelProps) {
  const [toggle, setToggle] = useState<ToggleState>(DEFAULT_TOGGLE);

  if (!format) {
    return (
      <div className="text-muted-foreground px-3 py-6 text-center text-sm">
        Select a format to see speed tiers.
      </div>
    );
  }

  const pokemons = team
    .slice()
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  // The "selected" pokemon is derived from activeIdx into the sorted pokemon list
  const selectedPokemon = pokemons[activeIdx] ?? pokemons[0] ?? null;

  const teamScored: ScoredMon[] = pokemons.map((p) =>
    teamMonToScored(p, format, toggle, p.id === selectedPokemon?.id)
  );

  const teamSpeciesIds = new Set(pokemons.map((p) => normalizeSpecies(p.species ?? "")));

  const legalSpecies = getLegalSpecies(format.id);
  const metaTiers = legalSpecies
    ? buildFullMetaTiers(legalSpecies, format)
    : getMetaSpeedTiers(format.id);

  const metaScored: ScoredMon[] = metaTiers
    .filter((e) => !teamSpeciesIds.has(normalizeSpecies(e.species)))
    .map((e) => metaToScored(e, toggle, format));

  const allScored = [...teamScored, ...metaScored];

  const selectedScored = teamScored.find((s) => s.mon.isSelected);
  const heroSpeed = selectedScored?.actualSpeed ?? 0;
  const tierLabel = heroSpeed > 0 ? getSpeedTierLabel(heroSpeed) : null;

  // Summary counts — flipped semantics under Trick Room
  const opponents = allScored.filter((s) => !s.mon.isSelected);
  let outspeedCount = 0;
  let tieCount = 0;
  let outspedCount = 0;
  for (const opp of opponents) {
    if (heroSpeed > opp.speed) {
      if (toggle.trickRoom) outspedCount++;
      else outspeedCount++;
    } else if (heroSpeed === opp.speed) {
      tieCount++;
    } else {
      if (toggle.trickRoom) outspeedCount++;
      else outspedCount++;
    }
  }

  const groups = groupBySpeed(allScored);
  // Sort ascending under Trick Room, descending otherwise
  const sortedGroups = toggle.trickRoom
    ? [...groups].sort((a, b) => a.speed - b.speed)
    : groups;

  const items = getSpeedAffectingItems(format);

  // ---- helpers ----------------------------------------------------------------

  function setTailwind(v: boolean) {
    setToggle((prev) => ({ ...prev, tailwind: v }));
  }
  function setWeather(w: Weather) {
    setToggle((prev) => ({
      ...prev,
      weather: prev.weather === w ? "none" : w,
    }));
  }
  function setStage(v: number) {
    setToggle((prev) => ({
      ...prev,
      stage: Math.max(STAGE_MIN, Math.min(STAGE_MAX, v)),
    }));
  }
  function setItem(v: string) {
    setToggle((prev) => ({ ...prev, item: v }));
  }
  function setStatus(v: "healthy" | "paralyzed") {
    setToggle((prev) => ({ ...prev, status: v }));
  }
  function setTrickRoom(v: boolean) {
    setToggle((prev) => ({ ...prev, trickRoom: v }));
  }

  const stageLabel =
    toggle.stage === 0
      ? "0"
      : toggle.stage > 0
        ? `+${toggle.stage}`
        : String(toggle.stage);

  return (
    /* Root fills the panel region. Hero / summary / toggles stick at the top;
       the tier list below scrolls inside its own region (see line ~652). */
    <div className="flex h-full min-h-0 flex-col">
      {/* Hero readout */}
      {selectedPokemon && (
        <div className="from-primary/5 to-card border-b bg-gradient-to-br px-4 py-2.5">
          <div className="text-muted-foreground text-[9px] font-semibold tracking-widest uppercase">
            Selected · {selectedPokemon.species}
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-foreground text-sm font-semibold">Speed</span>
            {tierLabel && (
              <span className="border-primary text-primary rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                {SPEED_TIER_LABELS[tierLabel]}
              </span>
            )}
            {toggle.trickRoom && (
              <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                TR
              </span>
            )}
            <span className="text-primary ml-auto font-mono text-xl font-bold">
              {heroSpeed || "—"}
            </span>
          </div>
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 border-b px-4 py-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-stat-good font-mono text-sm font-bold">
            {outspeedCount}
          </span>
          <span className="text-muted-foreground mt-0.5 text-[9px] font-semibold uppercase tracking-wide">
            {toggle.trickRoom ? "outsped by" : "outspeed"}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-stat-mid font-mono text-sm font-bold">
            {tieCount}
          </span>
          <span className="text-muted-foreground mt-0.5 text-[9px] font-semibold uppercase tracking-wide">
            tie
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-destructive font-mono text-sm font-bold">
            {outspedCount}
          </span>
          <span className="text-muted-foreground mt-0.5 text-[9px] font-semibold uppercase tracking-wide">
            {toggle.trickRoom ? "outspeed" : "outsped by"}
          </span>
        </div>
      </div>

      {/* Toggles row */}
      <div className="bg-muted/30 flex flex-wrap items-end gap-3 border-b px-3 py-2">
        {/* Tailwind */}
        <Toggle
          size="sm"
          variant="outline"
          pressed={toggle.tailwind}
          onPressedChange={(v) => setTailwind(v)}
          aria-label="Tailwind"
        >
          Tailwind
        </Toggle>

        {/* Weather */}
        {(["sun", "rain", "sand", "snow"] as const).map((w) => (
          <Toggle
            key={w}
            size="sm"
            variant="outline"
            pressed={toggle.weather === w}
            onPressedChange={() => setWeather(w)}
            aria-label={WEATHER_LABELS[w]}
          >
            {WEATHER_LABELS[w]}
          </Toggle>
        ))}

        {/* Item */}
        <Select value={toggle.item || ""} onValueChange={(v) => setItem(v ?? "")}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Item" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stage */}
        <div className="bg-card grid grid-cols-[22px_32px_22px] overflow-hidden rounded-md border">
          <button
            type="button"
            aria-label="Decrement speed stage"
            disabled={toggle.stage <= STAGE_MIN}
            onClick={() => setStage(toggle.stage - 1)}
            className="hover:bg-muted text-foreground flex items-center justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <div className="text-foreground flex items-center justify-center font-mono text-xs font-semibold">
            {stageLabel}
          </div>
          <button
            type="button"
            aria-label="Increment speed stage"
            disabled={toggle.stage >= STAGE_MAX}
            onClick={() => setStage(toggle.stage + 1)}
            className="hover:bg-muted text-foreground flex items-center justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>

        {/* Status */}
        <Select
          value={toggle.status}
          onValueChange={(v) => setStatus(v as "healthy" | "paralyzed")}
        >
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="paralyzed">Paralyzed</SelectItem>
          </SelectContent>
        </Select>

        {/* Trick Room */}
        <Toggle
          size="sm"
          variant="outline"
          pressed={toggle.trickRoom}
          onPressedChange={(v) => setTrickRoom(v)}
          aria-label="Trick Room"
          className={cn(
            toggle.trickRoom &&
              "border-primary bg-primary/10 text-primary font-semibold"
          )}
        >
          Trick Room
        </Toggle>
      </div>

      {/* Tier table */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TierTableHeader />
        {sortedGroups.map((group) => {
          const _isHeroTier = group.speed === heroSpeed && heroSpeed > 0;
          return group.items.map((scored, _idx) => (
            <TierMonRow
              key={`${scored.mon.id}-${group.speed}`}
              scored={scored}
              heroSpeed={heroSpeed}
              trickRoom={toggle.trickRoom}
            />
          ));
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Mini-stat helpers (exported for Dockbar use)
// =============================================================================

/**
 * Get the fastest effective speed on the team for the Dockbar pill sub-line.
 * Uses max investment (252 EVs + nature) at format level.
 */
export function getTeamFastestSpeed(
  team: TeamWithPokemon["team_pokemon"],
  format: GameFormat
): number {
  const pokemons = team
    .map((tp) => tp.pokemon)
    .filter((p): p is Tables<"pokemon"> => p !== null && p !== undefined);

  if (pokemons.length === 0) return 0;

  let fastest = 0;
  for (const p of pokemons) {
    const stats = getBaseStats(p.species ?? "");
    if (!stats) continue;
    const maxSpeed = isChampionsFormat(format)
      ? calculateChampionsStat(stats.speed, 32, 1.1)
      : calculateStat(stats.speed, 31, 252, 50, 1.1);
    if (maxSpeed > fastest) fastest = maxSpeed;
  }
  return fastest;
}
