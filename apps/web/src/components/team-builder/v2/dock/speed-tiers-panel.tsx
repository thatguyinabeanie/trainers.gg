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
  isChampionsFormat,
  legalSetOrPermissive,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { ItemSprite } from "@/components/tournament/item-sprite";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";

// =============================================================================
// Types
// =============================================================================

export interface SpeedTiersPanelProps {
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
}

type Weather = "none" | "sun" | "rain" | "sand" | "snow";

type SortColumn = "base" | "minSpeed" | "neutralSpeed" | "maxSpeed";

interface SideModifiers {
  tailwind: boolean;
  scarf: boolean;
  unburden: boolean;
  stage: number;
  status: "healthy" | "paralyzed";
  /** Custom EV override (0-252 for VGC, 0-32 for Champions). null = use defaults. */
  evs: number | null;
}

type SortDir = "desc" | "asc";

interface ToggleState {
  yours: SideModifiers;
  theirs: SideModifiers;
  weather: Weather;
  trickRoom: boolean;
  sortBy: SortColumn;
  sortDir: SortDir;
}

interface ScoredMon {
  /** Effective speed (for team mons) or max speed (for meta mons) */
  speed: number;
  /** Min speed: 0 EVs, -nature + theirs modifiers */
  minSpeed: number;
  /** Neutral speed: 252 EVs, neutral nature + theirs modifiers */
  neutralSpeed: number;
  /** Max speed: max EVs, +nature + theirs modifiers */
  maxSpeed: number;
  mon: {
    id: string;
    name: string;
    spriteUrl?: string;
    isYours: boolean;
    isSelected: boolean;
    baseSpeed: number;
    nature?: string | null;
    evSpeed?: number | null;
    ivSpeed?: number | null;
    speedAbility?: string | null;
    heldItem?: string | null;
  };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_YOURS: SideModifiers = {
  tailwind: false,
  scarf: false,
  unburden: false,
  stage: 0,
  status: "healthy",
  evs: null,
};

const DEFAULT_THEIRS: SideModifiers = {
  tailwind: false,
  scarf: false,
  unburden: false,
  stage: 0,
  status: "healthy",
  evs: null,
};

const DEFAULT_TOGGLE: ToggleState = {
  yours: { ...DEFAULT_YOURS },
  theirs: { ...DEFAULT_THEIRS },
  weather: "none",
  trickRoom: false,
  sortBy: "maxSpeed",
  sortDir: "desc",
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

function _normalizeSpecies(s: string): string {
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

/**
 * Build SpeedModifiers from side toggles for applying to a speed value.
 */
function buildSpeedMods(
  side: SideModifiers,
  weather: Weather,
  ability?: string
): SpeedModifiers {
  return {
    ability,
    field: { weather, tailwind: side.tailwind },
    stage: side.stage,
    item: side.scarf ? "choice-scarf" : null,
    status: side.status,
    unburden: side.unburden,
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

/**
 * Score a team mon — effective speed uses YOUR modifiers + held item.
 * Min/max columns show effective speed in both (same value).
 */
function teamMonToScored(
  pokemon: Tables<"pokemon">,
  format: GameFormat,
  toggle: ToggleState,
  isSelected: boolean
): ScoredMon {
  const stats = getBaseStats(pokemon.species ?? "");
  const baseSpeed = stats?.speed ?? 0;

  // Build modifiers from YOURS side + held item
  const heldItem = pokemon.held_item;
  const item = heldItem === "Choice Scarf"
    ? "choice-scarf" as const
    : heldItem === "Iron Ball"
      ? "iron-ball" as const
      : toggle.yours.scarf
        ? "choice-scarf" as const
        : null;

  const abilities = getValidAbilities(pokemon.species ?? "");
  const speedAbilityName = abilities.find((a) => SPEED_ABILITY_LOOKUP[a]) ?? null;

  const mods: SpeedModifiers = {
    ability: pokemon.ability ?? undefined,
    field: { weather: toggle.weather, tailwind: toggle.yours.tailwind },
    stage: toggle.yours.stage,
    item,
    status: toggle.yours.status,
    unburden: toggle.yours.unburden,
  };

  const actualBase = computeBaseSpeed(pokemon, format);
  const speed = applySpeedModifiers(actualBase, mods);

  return {
    speed,
    minSpeed: speed,
    neutralSpeed: speed,
    maxSpeed: speed,
    mon: {
      id: `team-${pokemon.id}`,
      name: pokemon.species ?? "Unknown",
      spriteUrl: safeSprite(pokemon.species ?? ""),
      isYours: true,
      isSelected,
      baseSpeed,
      nature: pokemon.nature,
      evSpeed: pokemon.ev_speed,
      ivSpeed: pokemon.iv_speed,
      speedAbility: pokemon.ability === speedAbilityName ? speedAbilityName : null,
      heldItem: pokemon.held_item,
    },
  };
}

/**
 * Score a meta mon — compute min (0 EVs, -nature) and max (max EVs, +nature)
 * speeds with THEIRS modifiers applied.
 * When custom EVs are set, all three columns use that EV value with different natures.
 */
function metaToScored(
  entry: MetaSpeedEntry,
  toggle: ToggleState,
  format: GameFormat
): ScoredMon {
  const champions = isChampionsFormat(format);
  const b = entry.base;
  const customEvs = toggle.theirs.evs;

  // Compute raw min/neutral/max stat values
  // If custom EVs are set, all three columns use that EV with -/neutral/+ nature
  const minEvs = customEvs ?? 0;
  const neutralEvs = customEvs ?? (champions ? 32 : 252);
  const maxEvs = customEvs ?? (champions ? 32 : 252);

  const rawMin = champions
    ? calculateChampionsStat(b, minEvs, 0.9)
    : calculateStat(b, 31, minEvs, 50, 0.9);
  const rawNeutral = champions
    ? calculateChampionsStat(b, neutralEvs, 1.0)
    : calculateStat(b, 31, neutralEvs, 50, 1.0);
  const rawMax = champions
    ? calculateChampionsStat(b, maxEvs, 1.1)
    : calculateStat(b, 31, maxEvs, 50, 1.1);

  // Apply THEIRS modifiers to all three
  const theirsMods = buildSpeedMods(toggle.theirs, toggle.weather, entry.speedAbility);
  const minSpeed = applySpeedModifiers(rawMin, theirsMods);
  const neutralSpeed = applySpeedModifiers(rawNeutral, theirsMods);
  const maxSpeed = applySpeedModifiers(rawMax, theirsMods);

  return {
    speed: maxSpeed,
    minSpeed,
    neutralSpeed,
    maxSpeed,
    mon: {
      id: `meta-${entry.species}`,
      name: entry.displayName,
      spriteUrl: safeSprite(entry.species),
      isYours: false,
      isSelected: false,
      baseSpeed: b,
      speedAbility: entry.speedAbility ?? null,
    },
  };
}

// =============================================================================
// Tier table row
// =============================================================================

const STAT_CELL = "text-right font-mono text-[11px] tabular-nums px-1.5 py-1 w-[3.5rem]";

/** Determine if a speed ability is currently active based on field/toggle state */
function isSpeedAbilityActive(
  ability: string | null | undefined,
  weather: Weather,
  unburden: boolean
): boolean {
  if (!ability) return false;
  switch (ability) {
    case "chlorophyll": return weather === "sun";
    case "swift-swim": return weather === "rain";
    case "sand-rush": return weather === "sand";
    case "slush-rush": return weather === "snow";
    case "unburden": return unburden;
    case "speed-boost": return true; // always active
    case "quick-feet": return true; // active when statused (handled by modifier)
    default: return false;
  }
}

interface TierMonRowProps {
  scored: ScoredMon;
  heroSpeed: number;
  trickRoom: boolean;
  abilityActive: boolean;
  showGroupSeparator?: boolean;
}

function TierMonRow({ scored, heroSpeed, trickRoom, abilityActive, showGroupSeparator }: TierMonRowProps) {
  const { mon, speed, minSpeed, neutralSpeed, maxSpeed } = scored;
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
        "border-b border-border/30",
        showGroupSeparator && "border-t-2 border-t-primary/40",
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
      <TableCell className="px-1 py-0.5">
        <div className="flex min-w-0 items-center gap-1">
          {mon.spriteUrl ? (
            <Image
              src={mon.spriteUrl}
              alt=""
              width={36}
              height={36}
              unoptimized
              className="size-9 shrink-0 object-contain"
            />
          ) : (
            <span className="bg-muted inline-block size-9 shrink-0 rounded-full" />
          )}
          <span
            className={cn(
              "truncate text-[11px] leading-tight",
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
          {mon.isYours && mon.heldItem && (
            <ItemSprite item={mon.heldItem} size={16} className="shrink-0" />
          )}
          {mon.speedAbility && (
            <span className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium capitalize",
              abilityActive
                ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                : "bg-muted text-muted-foreground/50"
            )}>
              {mon.speedAbility.replace(/-/g, " ")}
            </span>
          )}
          {isTie && (
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium">
              Tie
            </span>
          )}
        </div>
      </TableCell>
      {/* -Speed column */}
      <TableCell
        className={cn(
          STAT_CELL,
          "border-l border-border/50",
          mon.isYours ? "text-primary font-bold" : "text-muted-foreground"
        )}
      >
        {minSpeed}
      </TableCell>
      {/* Neutral speed column */}
      <TableCell
        className={cn(
          STAT_CELL,
          mon.isYours ? "text-primary font-bold" : "text-foreground"
        )}
      >
        {neutralSpeed}
      </TableCell>
      {/* +Speed column */}
      <TableCell
        className={cn(
          STAT_CELL,
          mon.isYours ? "text-primary font-bold" : "text-foreground font-bold"
        )}
      >
        {maxSpeed}
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// SpeedTiersPanel
// =============================================================================

/**
 * Speed tier ladder for the v2 team builder sidebar.
 *
 * Shows your team vs the format meta with min/max speeds.
 * YOURS/THEIRS switches let you simulate real game scenarios.
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

  const legalSpecies = legalSetOrPermissive(getLegalSpecies(format.id));
  const metaTiers = legalSpecies
    ? buildFullMetaTiers(legalSpecies, format)
    : getMetaSpeedTiers(format.id);

  const metaScored: ScoredMon[] = metaTiers
    .map((e) => metaToScored(e, toggle, format));

  const allScored = [...teamScored, ...metaScored];

  // Sort value extractor
  function getSortValue(scored: ScoredMon): number {
    if (scored.mon.isYours) return scored.speed;
    switch (toggle.sortBy) {
      case "base": return scored.mon.baseSpeed;
      case "minSpeed": return scored.minSpeed;
      case "neutralSpeed": return scored.neutralSpeed;
      case "maxSpeed": return scored.maxSpeed;
    }
  }

  const isAsc = toggle.sortDir === "asc";
  const sorted = [...allScored].sort((a, b) => {
    const aVal = getSortValue(a);
    const bVal = getSortValue(b);
    return isAsc ? aVal - bVal : bVal - aVal;
  });

  // ---- helpers ----------------------------------------------------------------

  function setWeather(w: Weather) {
    setToggle((prev) => ({
      ...prev,
      weather: prev.weather === w ? "none" : w,
    }));
  }
  function setTrickRoom(v: boolean) {
    setToggle((prev) => ({ ...prev, trickRoom: v, sortDir: v ? "asc" : "desc" }));
  }
  function setSortBy(col: SortColumn) {
    setToggle((prev) => ({
      ...prev,
      sortBy: col,
      sortDir: prev.sortBy === col ? (prev.sortDir === "desc" ? "asc" : "desc") : "desc",
    }));
  }

  const champions = isChampionsFormat(format);
  const maxEv = champions ? 32 : 252;
  const evStep = champions ? 1 : 4;
  const evLabel = champions ? "SP" : "EVs";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar — two sections side by side: Field (left) | Modifiers (right) */}
      <div className="bg-muted/30 flex gap-3 border-b px-3 py-2">
        {/* Left column: Trick Room + Weather */}
        <div className="flex w-36 flex-col gap-1.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            Field
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground/70">Trick Room</span>
            <Switch
              size="sm"
              checked={toggle.trickRoom}
              onCheckedChange={setTrickRoom}
              aria-label="Trick Room"
            />
          </div>
          <span className="text-[11px] text-muted-foreground/70">Weather</span>
          <div className="flex flex-col gap-1">
            {(["sun", "rain", "sand", "snow"] as const).map((w) => (
              <Toggle
                key={w}
                variant="outline"
                pressed={toggle.weather === w}
                onPressedChange={() => setWeather(w)}
                aria-label={WEATHER_LABELS[w]}
                className={cn("w-full", toggle.weather === w && "bg-primary/15 text-primary border-primary/40")}
              >
                {WEATHER_LABELS[w]}
              </Toggle>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="bg-border w-px self-stretch" />

        {/* Right section: Ours | Label | Theirs mirrored grid */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            Modifiers
          </span>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-1 gap-y-0.5">
            {/* Header */}
            <span className="text-muted-foreground text-right text-[10px] font-semibold uppercase tracking-wider">
              Ours
            </span>
            <span />
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Theirs
            </span>

            {/* Tailwind */}
            <div className="flex justify-end">
              <Switch
                size="sm"
                checked={toggle.yours.tailwind}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({ ...prev, yours: { ...prev.yours, tailwind: v } }))
                }
              />
            </div>
            <span className="text-center text-[11px]">Tailwind</span>
            <div className="flex justify-start">
              <Switch
                size="sm"
                checked={toggle.theirs.tailwind}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({ ...prev, theirs: { ...prev.theirs, tailwind: v } }))
                }
              />
            </div>

            {/* Scarf */}
            <div className="flex justify-end">
              <Switch
                size="sm"
                checked={toggle.yours.scarf}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({ ...prev, yours: { ...prev.yours, scarf: v } }))
                }
              />
            </div>
            <span className="text-center text-[11px]">Scarf</span>
            <div className="flex justify-start">
              <Switch
                size="sm"
                checked={toggle.theirs.scarf}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({ ...prev, theirs: { ...prev.theirs, scarf: v } }))
                }
              />
            </div>

            {/* Unburden */}
            <div className="flex justify-end">
              <Switch
                size="sm"
                checked={toggle.yours.unburden}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({ ...prev, yours: { ...prev.yours, unburden: v } }))
                }
              />
            </div>
            <span className="text-center text-[11px]">Unburden</span>
            <div className="flex justify-start">
              <Switch
                size="sm"
                checked={toggle.theirs.unburden}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({ ...prev, theirs: { ...prev.theirs, unburden: v } }))
                }
                aria-label="Unburden"
              />
            </div>

            {/* Paralyzed */}
            <div className="flex justify-end">
              <Switch
                size="sm"
                checked={toggle.yours.status === "paralyzed"}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({
                    ...prev,
                    yours: { ...prev.yours, status: v ? "paralyzed" : "healthy" },
                  }))
                }
              />
            </div>
            <span className="text-center text-[11px]">Paralyzed</span>
            <div className="flex justify-start">
              <Switch
                size="sm"
                checked={toggle.theirs.status === "paralyzed"}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({
                    ...prev,
                    theirs: { ...prev.theirs, status: v ? "paralyzed" : "healthy" },
                  }))
                }
              />
            </div>

            {/* Stages */}
            <div className="flex justify-end">
              <div className="bg-card grid grid-cols-[20px_28px_20px] overflow-hidden rounded-md border">
                <button
                  type="button"
                  disabled={toggle.yours.stage <= STAGE_MIN}
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      yours: { ...prev.yours, stage: prev.yours.stage - 1 },
                    }))
                  }
                  className="hover:bg-muted text-foreground flex items-center justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <div className="text-foreground flex items-center justify-center font-mono text-[10px] font-semibold">
                  {toggle.yours.stage === 0 ? "0" : toggle.yours.stage > 0 ? `+${toggle.yours.stage}` : toggle.yours.stage}
                </div>
                <button
                  type="button"
                  disabled={toggle.yours.stage >= STAGE_MAX}
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      yours: { ...prev.yours, stage: prev.yours.stage + 1 },
                    }))
                  }
                  className="hover:bg-muted text-foreground flex items-center justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
            <span className="text-center text-[11px]">Stages</span>
            <div className="flex justify-start">
              <div className="bg-card grid grid-cols-[20px_28px_20px] overflow-hidden rounded-md border">
                <button
                  type="button"
                  disabled={toggle.theirs.stage <= STAGE_MIN}
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      theirs: { ...prev.theirs, stage: prev.theirs.stage - 1 },
                    }))
                  }
                  className="hover:bg-muted text-foreground flex items-center justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <div className="text-foreground flex items-center justify-center font-mono text-[10px] font-semibold">
                  {toggle.theirs.stage === 0 ? "0" : toggle.theirs.stage > 0 ? `+${toggle.theirs.stage}` : toggle.theirs.stage}
                </div>
                <button
                  type="button"
                  disabled={toggle.theirs.stage >= STAGE_MAX}
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      theirs: { ...prev.theirs, stage: prev.theirs.stage + 1 },
                    }))
                  }
                  className="hover:bg-muted text-foreground flex items-center justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            {/* EVs — only theirs side has input, ours is empty */}
            <div />
            <span className="text-center text-[11px]">{evLabel}</span>
            <div className="flex justify-start">
              <div className="bg-card grid grid-cols-[20px_40px_20px] overflow-hidden rounded-md border">
                <button
                  type="button"
                  aria-label={`Decrease speed ${evLabel}`}
                  disabled={toggle.theirs.evs === null || toggle.theirs.evs <= 0}
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      theirs: {
                        ...prev.theirs,
                        evs: Math.max(0, (prev.theirs.evs ?? maxEv) - evStep),
                      },
                    }))
                  }
                  className="hover:bg-muted text-foreground flex items-center justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`Speed ${evLabel} override`}
                  value={toggle.theirs.evs ?? ""}
                  placeholder={String(maxEv)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    if (raw === "") {
                      setToggle((prev) => ({
                        ...prev,
                        theirs: { ...prev.theirs, evs: null },
                      }));
                      return;
                    }
                    const val = Math.min(maxEv, Math.max(0, Number(raw)));
                    setToggle((prev) => ({
                      ...prev,
                      theirs: { ...prev.theirs, evs: val },
                    }));
                  }}
                  className="text-foreground bg-transparent text-center font-mono text-[10px] font-semibold outline-none w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label={`Increase speed ${evLabel}`}
                  disabled={toggle.theirs.evs !== null && toggle.theirs.evs >= maxEv}
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      theirs: {
                        ...prev.theirs,
                        evs: Math.min(maxEv, (prev.theirs.evs ?? maxEv) + evStep),
                      },
                    }))
                  }
                  className="hover:bg-muted text-foreground flex items-center justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier table */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="bg-card/95 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="border-b">
              <TableHead
                className={cn(
                  "text-muted-foreground h-auto cursor-pointer px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight tracking-wide",
                  toggle.sortBy === "base" && "text-primary"
                )}
                onClick={() => setSortBy("base")}
              >
                Base {toggle.sortBy === "base" && (toggle.sortDir === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead className="text-muted-foreground h-auto px-1.5 py-1.5 text-[10px] font-medium leading-tight tracking-wide">
                Pokémon
              </TableHead>
              <TableHead
                className={cn(
                  "h-auto cursor-pointer border-l border-border/50 px-1.5 py-1.5 text-right text-[10px] font-medium leading-tight tracking-wide",
                  toggle.sortBy === "minSpeed" ? "text-primary" : "text-muted-foreground"
                )}
                onClick={() => setSortBy("minSpeed")}
              >
                -Spe {toggle.sortBy === "minSpeed" && (toggle.sortDir === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className={cn(
                  "h-auto cursor-pointer px-1.5 py-1.5 text-right text-[10px] font-medium leading-tight tracking-wide",
                  toggle.sortBy === "neutralSpeed" ? "text-primary" : "text-foreground"
                )}
                onClick={() => setSortBy("neutralSpeed")}
              >
                Spe {toggle.sortBy === "neutralSpeed" && (toggle.sortDir === "desc" ? "↓" : "↑")}
              </TableHead>
              <TableHead
                className={cn(
                  "h-auto cursor-pointer px-1.5 py-1.5 text-right text-[10px] font-semibold leading-tight tracking-wide",
                  toggle.sortBy === "maxSpeed" ? "text-primary" : "text-foreground"
                )}
                onClick={() => setSortBy("maxSpeed")}
              >
                +Spe {toggle.sortBy === "maxSpeed" && (toggle.sortDir === "desc" ? "↓" : "↑")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((scored, i) => {
              const getGroupValue = (s: ScoredMon) => {
                switch (toggle.sortBy) {
                  case "base": return s.mon.baseSpeed;
                  case "minSpeed": return s.minSpeed;
                  case "neutralSpeed": return s.neutralSpeed;
                  case "maxSpeed": return s.maxSpeed;
                  default: return s.speed;
                }
              };
              const prev = i > 0 ? getGroupValue(sorted[i - 1]!) : null;
              const curr = getGroupValue(scored);
              const showSeparator = prev !== null && prev !== curr;
              return (
                <TierMonRow
                  key={scored.mon.id}
                  scored={scored}
                  heroSpeed={0}
                  trickRoom={toggle.trickRoom}
                  abilityActive={isSpeedAbilityActive(
                    scored.mon.speedAbility,
                    toggle.weather,
                    scored.mon.isYours ? toggle.yours.unburden : toggle.theirs.unburden
                  )}
                  showGroupSeparator={showSeparator}
                />
              );
            })}
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
