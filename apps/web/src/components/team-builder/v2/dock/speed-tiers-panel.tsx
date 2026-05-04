"use client";

import { useState } from "react";
import Image from "next/image";

import {
  type GameFormat,
  type MetaSpeedEntry,
  type SpeedAbility,
  type SpeedModifiers,
  applySpeedModifiers,
  calculateChampionsStat,
  calculateStat,
  getBaseStats,
  getLegalSpecies,
  getMetaSpeedTiers,
  getNatureMultiplier,
  getValidAbilities,
  groupBySpeed,
  isChampionsFormat,
  legalSetOrPermissive,
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
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";

// =============================================================================
// Types
// =============================================================================

export interface SpeedTiersPanelProps {
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
}

type Weather = "none" | "sun" | "rain" | "sand" | "snow";

interface SideModifiers {
  tailwind: boolean;
  scarf: boolean;
  ironBall: boolean;
  stage: number;
  status: "healthy" | "paralyzed";
}

interface ToggleState {
  yours: SideModifiers;
  theirs: SideModifiers;
  weather: Weather;
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
    /** +Spe nature, max EVs/IVs */
    statMaxPositive: number;
    /** Neutral nature, max EVs/IVs */
    statMaxNeutral: number;
    /** Neutral nature, 0 EVs */
    statNeutralNoInvest: number;
    /** -Spe nature, 0 EVs */
    statMinNature: number;
    /** +Spe max with Choice Scarf (x1.5) */
    statScarf: number;
    /** Neutral max with Choice Scarf (x1.5) */
    statScarfNeutral: number;
    badge?: "tie" | "threat";
    nature?: string | null;
    evSpeed?: number | null;
    ivSpeed?: number | null;
    speedAbility?: string | null;
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_SIDE: SideModifiers = {
  tailwind: false,
  scarf: false,
  ironBall: false,
  stage: 0,
  status: "healthy",
};

const DEFAULT_TOGGLE: ToggleState = {
  yours: { ...DEFAULT_SIDE },
  theirs: { ...DEFAULT_SIDE },
  weather: "none",
  trickRoom: false,
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

interface StatColumns {
  base: number;
  maxPositive: number;
  maxNeutral: number;
  neutralNoInvest: number;
  minNature: number;
  scarf: number;
  scarfNeutral: number;
}

function computeStatColumns(
  pokemon: Tables<"pokemon">,
  format: GameFormat
): StatColumns {
  const stats = getBaseStats(pokemon.species ?? "");
  if (!stats)
    return { base: 0, maxPositive: 0, maxNeutral: 0, neutralNoInvest: 0, minNature: 0, scarf: 0, scarfNeutral: 0 };
  const b = stats.speed;
  if (isChampionsFormat(format)) {
    const maxPos = calculateChampionsStat(b, 32, 1.1);
    const maxNeu = calculateChampionsStat(b, 32, 1.0);
    const neuNo = calculateChampionsStat(b, 0, 1.0);
    const minNat = calculateChampionsStat(b, 0, 0.9);
    return {
      base: b,
      maxPositive: maxPos,
      maxNeutral: maxNeu,
      neutralNoInvest: neuNo,
      minNature: minNat,
      scarf: Math.floor(maxPos * 1.5),
      scarfNeutral: Math.floor(maxNeu * 1.5),
    };
  }
  const maxPos = calculateStat(b, 31, 252, 50, 1.1);
  const maxNeu = calculateStat(b, 31, 252, 50, 1.0);
  const neuNo = calculateStat(b, 31, 0, 50, 1.0);
  const minNat = calculateStat(b, 31, 0, 50, 0.9);
  return {
    base: b,
    maxPositive: maxPos,
    maxNeutral: maxNeu,
    neutralNoInvest: neuNo,
    minNature: minNat,
    scarf: Math.floor(maxPos * 1.5),
    scarfNeutral: Math.floor(maxNeu * 1.5),
  };
}

function computeMetaStatColumns(
  entry: MetaSpeedEntry,
  format: GameFormat
): StatColumns {
  const b = entry.base;
  if (isChampionsFormat(format)) {
    const maxPos = calculateChampionsStat(b, 32, 1.1);
    const maxNeu = calculateChampionsStat(b, 32, 1.0);
    const neuNo = calculateChampionsStat(b, 0, 1.0);
    const minNat = calculateChampionsStat(b, 0, 0.9);
    return {
      base: b,
      maxPositive: maxPos,
      maxNeutral: maxNeu,
      neutralNoInvest: neuNo,
      minNature: minNat,
      scarf: Math.floor(maxPos * 1.5),
      scarfNeutral: Math.floor(maxNeu * 1.5),
    };
  }
  const maxPos = entry.fastSpread;
  const maxNeu = calculateStat(b, 31, 252, 50, 1.0);
  const neuNo = calculateStat(b, 31, 0, 50, 1.0);
  const minNat = calculateStat(b, 31, 0, 50, 0.9);
  return {
    base: b,
    maxPositive: maxPos,
    maxNeutral: maxNeu,
    neutralNoInvest: neuNo,
    minNature: minNat,
    scarf: Math.floor(maxPos * 1.5),
    scarfNeutral: Math.floor(maxNeu * 1.5),
  };
}

function sideToSpeedModifiers(
  side: SideModifiers,
  weather: Weather,
  ability?: string
): SpeedModifiers {
  return {
    ability,
    field: { weather, tailwind: side.tailwind },
    stage: side.stage,
    item: side.scarf ? "choice-scarf" : side.ironBall ? "iron-ball" : null,
    status: side.status,
  };
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
  const mods = sideToSpeedModifiers(
    toggle.yours,
    toggle.weather,
    pokemon.ability ?? undefined
  );
  const actualBase = computeBaseSpeed(pokemon, format);
  const speed = applySpeedModifiers(actualBase, mods);
  const abilities = getValidAbilities(pokemon.species ?? "");
  const speedAbilityName = abilities.find((a) => SPEED_ABILITY_LOOKUP[a]) ?? null;

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
      statMaxPositive: statCols.maxPositive,
      statMaxNeutral: statCols.maxNeutral,
      statNeutralNoInvest: statCols.neutralNoInvest,
      statMinNature: statCols.minNature,
      statScarf: statCols.scarf,
      statScarfNeutral: statCols.scarfNeutral,
      nature: pokemon.nature,
      evSpeed: pokemon.ev_speed,
      ivSpeed: pokemon.iv_speed,
      speedAbility: pokemon.ability === speedAbilityName ? speedAbilityName : null,
    },
  };
}

function metaToScored(
  entry: MetaSpeedEntry,
  toggle: ToggleState,
  format: GameFormat
): ScoredMon {
  const baseSpeed = entry.fastSpread;
  const mods = sideToSpeedModifiers(
    toggle.theirs,
    toggle.weather,
    entry.speedAbility
  );
  const speed = applySpeedModifiers(baseSpeed, mods);
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
      statMaxPositive: statCols.maxPositive,
      statMaxNeutral: statCols.maxNeutral,
      statNeutralNoInvest: statCols.neutralNoInvest,
      statMinNature: statCols.minNature,
      statScarf: statCols.scarf,
      statScarfNeutral: statCols.scarfNeutral,
      speedAbility: entry.speedAbility ?? null,
    },
  };
}

// =============================================================================
// Tier table using shadcn Table
// =============================================================================

const STAT_CELL = "text-right font-mono text-[11px] tabular-nums px-1.5 py-1";

interface TierMonRowProps {
  scored: ScoredMon;
  heroSpeed: number;
  trickRoom: boolean;
  isFirstInGroup: boolean;
  baseSpeed: number;
}

function TierMonRow({ scored, heroSpeed, trickRoom }: TierMonRowProps) {
  const { mon, speed } = scored;
  const isTie = !mon.isSelected && speed === heroSpeed && heroSpeed > 0;
  const isFaster =
    !mon.isYours && heroSpeed > 0 && (trickRoom ? speed > heroSpeed : speed < heroSpeed);

  // Nature shorthand for team Pokemon
  const natureLabel = mon.nature
    ? getNatureMultiplier(mon.nature, "speed") > 1
      ? "+Spe"
      : getNatureMultiplier(mon.nature, "speed") < 1
        ? "-Spe"
        : ""
    : "";

  return (
    <TableRow
      className={cn(
        "border-0",
        mon.isSelected && "bg-primary/10",
        mon.isYours && !mon.isSelected && "bg-primary/5",
        isFaster && "opacity-40"
      )}
    >
      {/* Base speed */}
      <TableCell className="text-muted-foreground px-1.5 py-1 text-center font-mono text-[11px] tabular-nums">
        {mon.baseSpeed}
      </TableCell>
      {/* Pokemon name + metadata */}
      <TableCell className="px-1.5 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {mon.spriteUrl ? (
            <Image
              src={mon.spriteUrl}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="size-8 shrink-0 object-contain"
            />
          ) : (
            <span className="bg-muted inline-block size-8 shrink-0 rounded-full" />
          )}
          <span
            className={cn(
              "truncate text-xs leading-tight",
              mon.isYours ? "text-primary font-semibold" : "text-foreground"
            )}
          >
            {mon.name}
          </span>
          {mon.isYours && natureLabel && (
            <span
              className={cn(
                "text-[9px] font-semibold",
                natureLabel === "+Spe" && "text-stat-good",
                natureLabel === "-Spe" && "text-destructive"
              )}
            >
              {natureLabel}
            </span>
          )}
          {mon.isYours && (
            <span className="text-primary shrink-0 font-mono text-[11px] font-bold tabular-nums">
              {speed}
            </span>
          )}
          {mon.speedAbility && (
            <span className="bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium">
              {mon.speedAbility}
            </span>
          )}
          {isTie && (
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium">
              Tie
            </span>
          )}
        </div>
      </TableCell>
      {/* Max (+Spe +252) */}
      <TableCell
        className={cn(
          STAT_CELL,
          "font-bold",
          mon.isYours ? "text-primary" : "text-foreground"
        )}
      >
        {mon.statMaxPositive}
      </TableCell>
      {/* Neutral +252 */}
      <TableCell className={cn(STAT_CELL, "text-muted-foreground")}>
        {mon.statMaxNeutral}
      </TableCell>
      {/* Neutral 0 EV */}
      <TableCell className={cn(STAT_CELL, "text-muted-foreground")}>
        {mon.statNeutralNoInvest}
      </TableCell>
      {/* -Spe 0 EV */}
      <TableCell className={cn(STAT_CELL, "text-muted-foreground")}>
        {mon.statMinNature}
      </TableCell>
      {/* Max + Scarf */}
      <TableCell className={cn(STAT_CELL, "text-muted-foreground")}>
        {mon.statScarf}
      </TableCell>
      {/* Neutral + Scarf */}
      <TableCell className={cn(STAT_CELL, "text-muted-foreground")}>
        {mon.statScarfNeutral}
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// Side modifier controls
// =============================================================================

function SideControls({
  label,
  side,
  onChange,
}: {
  label: string;
  side: SideModifiers;
  onChange: (s: SideModifiers) => void;
}) {
  const stageLabel =
    side.stage === 0
      ? "0"
      : side.stage > 0
        ? `+${side.stage}`
        : String(side.stage);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </span>
      <Toggle
        size="sm"
        variant="outline"
        pressed={side.tailwind}
        onPressedChange={(v) => onChange({ ...side, tailwind: v })}
        aria-label={`${label} Tailwind`}
      >
        Tailwind
      </Toggle>
      <Toggle
        size="sm"
        variant="outline"
        pressed={side.scarf}
        onPressedChange={(v) => onChange({ ...side, scarf: v, ironBall: v ? false : side.ironBall })}
        aria-label={`${label} Choice Scarf`}
      >
        Scarf
      </Toggle>
      <Toggle
        size="sm"
        variant="outline"
        pressed={side.ironBall}
        onPressedChange={(v) => onChange({ ...side, ironBall: v, scarf: v ? false : side.scarf })}
        aria-label={`${label} Iron Ball`}
      >
        Iron Ball
      </Toggle>
      {/* Stage stepper */}
      <div className="bg-card grid grid-cols-[22px_32px_22px] overflow-hidden rounded-md border">
        <button
          type="button"
          aria-label={`Decrement ${label} speed stage`}
          disabled={side.stage <= STAGE_MIN}
          onClick={() => onChange({ ...side, stage: side.stage - 1 })}
          className="hover:bg-muted text-foreground flex items-center justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <div className="text-foreground flex items-center justify-center font-mono text-xs font-semibold">
          {stageLabel}
        </div>
        <button
          type="button"
          aria-label={`Increment ${label} speed stage`}
          disabled={side.stage >= STAGE_MAX}
          onClick={() => onChange({ ...side, stage: side.stage + 1 })}
          className="hover:bg-muted text-foreground flex items-center justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
      {/* Status */}
      <Select
        value={side.status}
        onValueChange={(v) => onChange({ ...side, status: v as "healthy" | "paralyzed" })}
      >
        <SelectTrigger size="sm" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="healthy">Healthy</SelectItem>
          <SelectItem value="paralyzed">Paralyzed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// =============================================================================
// SpeedTiersPanel
// =============================================================================

/**
 * Speed tier ladder for the v2 team builder sidebar.
 *
 * Shows your team vs the format meta at all stat spreads.
 * YOURS/THEIRS modifiers let you simulate real game scenarios.
 * Trick Room toggle inverts the sort order.
 */
export function SpeedTiersPanel({
  team,
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

  // Filter to non-null pokemon on the team.
  const pokemons = team
    .filter((tp) => tp.pokemon != null)
    .map((tp) => tp.pokemon as Tables<"pokemon">);

  const teamScored: ScoredMon[] = pokemons.map((p) =>
    teamMonToScored(p, format, toggle, false)
  );

  const teamSpeciesIds = new Set(pokemons.map((p) => normalizeSpecies(p.species ?? "")));

  const legalSpecies = legalSetOrPermissive(getLegalSpecies(format.id));
  const metaTiers = legalSpecies
    ? buildFullMetaTiers(legalSpecies, format)
    : getMetaSpeedTiers(format.id);

  const metaScored: ScoredMon[] = metaTiers
    .filter((e) => !teamSpeciesIds.has(normalizeSpecies(e.species)))
    .map((e) => metaToScored(e, toggle, format));

  const allScored = [...teamScored, ...metaScored];

  const groups = groupBySpeed(allScored);
  // Sort ascending under Trick Room, descending otherwise
  const sortedGroups = toggle.trickRoom
    ? [...groups].sort((a, b) => a.speed - b.speed)
    : groups;

  // ---- helpers ----------------------------------------------------------------

  function setWeather(w: Weather) {
    setToggle((prev) => ({
      ...prev,
      weather: prev.weather === w ? "none" : w,
    }));
  }
  function setTrickRoom(v: boolean) {
    setToggle((prev) => ({ ...prev, trickRoom: v }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toggles toolbar */}
      <div className="bg-muted/30 flex flex-col gap-2 border-b px-3 py-2">
        {/* Yours */}
        <SideControls
          label="Yours"
          side={toggle.yours}
          onChange={(s) => setToggle((prev) => ({ ...prev, yours: s }))}
        />
        {/* Theirs */}
        <SideControls
          label="Theirs"
          side={toggle.theirs}
          onChange={(s) => setToggle((prev) => ({ ...prev, theirs: s }))}
        />
        {/* Field */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            Field
          </span>
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
      </div>

      {/* Tier table */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="bg-card/95 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="border-b">
              <TableHead className="text-muted-foreground h-8 px-1.5 text-center text-[10px] font-medium uppercase tracking-wide">
                Base
              </TableHead>
              <TableHead className="text-muted-foreground h-8 px-1.5 text-[10px] font-medium uppercase tracking-wide">
                Pokémon
              </TableHead>
              <TableHead className="text-primary h-8 px-1.5 text-right text-[10px] font-semibold uppercase tracking-wide">
                Max
              </TableHead>
              <TableHead className="text-muted-foreground h-8 px-1.5 text-right text-[10px] font-medium uppercase tracking-wide">
                +252
              </TableHead>
              <TableHead className="text-muted-foreground h-8 px-1.5 text-right text-[10px] font-medium uppercase tracking-wide">
                0 EV
              </TableHead>
              <TableHead className="text-muted-foreground h-8 px-1.5 text-right text-[10px] font-medium uppercase tracking-wide">
                -Spe
              </TableHead>
              <TableHead className="text-muted-foreground h-8 px-1.5 text-right text-[10px] font-medium uppercase tracking-wide">
                Scarf
              </TableHead>
              <TableHead className="text-muted-foreground h-8 px-1.5 text-right text-[10px] font-medium uppercase tracking-wide">
                Sc.Neu
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const baseGroups = new Map<number, ScoredMon[]>();
              for (const group of sortedGroups) {
                for (const scored of group.items) {
                  const base = scored.mon.baseSpeed;
                  const arr = baseGroups.get(base) ?? [];
                  arr.push(scored);
                  baseGroups.set(base, arr);
                }
              }
              const sortedBases = [...baseGroups.entries()].sort((a, b) =>
                toggle.trickRoom ? a[0] - b[0] : b[0] - a[0]
              );
              return sortedBases.flatMap(([base, mons]) =>
                mons.map((scored, idx) => (
                  <TierMonRow
                    key={scored.mon.id}
                    scored={scored}
                    heroSpeed={0}
                    trickRoom={toggle.trickRoom}
                    isFirstInGroup={idx === 0}
                    baseSpeed={base}
                  />
                ))
              );
            })()}
          </TableBody>
        </table>
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
