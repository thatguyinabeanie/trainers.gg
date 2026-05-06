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

type SortColumn = "base" | "speed";

type NatureToggle = "positive" | "neutral" | "negative";

interface SideModifiers {
  tailwind: boolean;
  scarf: boolean;
  unburden: boolean;
  stage: number;
  status: "healthy" | "paralyzed";
  /** Custom EV override (0-252 for VGC, 0-32 for Champions). null = use defaults. */
  evs: number | null;
  /** Nature toggle for speed — only applies to theirs */
  nature: NatureToggle;
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
  /** Effective speed value to display in the SPE column */
  speed: number;
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
  nature: "positive",
};

const DEFAULT_THEIRS: SideModifiers = {
  tailwind: false,
  scarf: false,
  unburden: false,
  stage: 0,
  status: "healthy",
  evs: null,
  nature: "positive",
};

const DEFAULT_TOGGLE: ToggleState = {
  yours: { ...DEFAULT_YOURS },
  theirs: { ...DEFAULT_THEIRS },
  weather: "none",
  trickRoom: false,
  sortBy: "speed",
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

/**
 * Sentinel for the render-time state-reset pattern (see react-patterns.md).
 * Module-scoped so its identity is stable across renders.
 */
const UNINITIALIZED_FORMAT_ID = Symbol("uninitialized-format-id");

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
  const item =
    heldItem === "Choice Scarf"
      ? ("choice-scarf" as const)
      : heldItem === "Iron Ball"
        ? ("iron-ball" as const)
        : toggle.yours.scarf
          ? ("choice-scarf" as const)
          : null;

  const abilities = getValidAbilities(pokemon.species ?? "");
  const speedAbilityName =
    abilities.find((a) => SPEED_ABILITY_LOOKUP[a]) ?? null;

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
      speedAbility:
        pokemon.ability === speedAbilityName ? speedAbilityName : null,
      heldItem: pokemon.held_item,
    },
  };
}

/**
 * Score a meta mon — compute speed based on the active nature toggle.
 * Uses THEIRS modifiers applied to the calculated stat.
 */
function metaToScored(
  entry: MetaSpeedEntry,
  toggle: ToggleState,
  format: GameFormat
): ScoredMon {
  const champions = isChampionsFormat(format);
  const b = entry.base;
  const customEvs = toggle.theirs.evs;

  // Nature multiplier from toggle
  const natureMult =
    toggle.theirs.nature === "positive"
      ? 1.1
      : toggle.theirs.nature === "negative"
        ? 0.9
        : 1.0;

  // EVs: if custom set use that; otherwise max EVs for +/neutral, 0 for -
  const evs =
    customEvs ??
    (toggle.theirs.nature === "negative" ? 0 : champions ? 32 : 252);

  const rawSpeed = champions
    ? calculateChampionsStat(b, evs, natureMult)
    : calculateStat(b, 31, evs, 50, natureMult);

  // Apply THEIRS modifiers
  const theirsMods = buildSpeedMods(
    toggle.theirs,
    toggle.weather,
    entry.speedAbility
  );
  const speed = applySpeedModifiers(rawSpeed, theirsMods);

  return {
    speed,
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

const STAT_CELL =
  "text-right font-mono text-xs tabular-nums px-2 py-1.5 w-[3.5rem]";

/** Determine if a speed ability is currently active based on field/toggle state */
function isSpeedAbilityActive(
  ability: string | null | undefined,
  weather: Weather,
  unburden: boolean
): boolean {
  if (!ability) return false;
  switch (ability) {
    case "chlorophyll":
      return weather === "sun";
    case "swift-swim":
      return weather === "rain";
    case "sand-rush":
      return weather === "sand";
    case "slush-rush":
      return weather === "snow";
    case "unburden":
      return unburden;
    case "speed-boost":
      return true; // always active
    case "quick-feet":
      return true; // active when statused (handled by modifier)
    default:
      return false;
  }
}

interface TierMonRowProps {
  scored: ScoredMon;
  heroSpeed: number;
  trickRoom: boolean;
  abilityActive: boolean;
  showGroupSeparator?: boolean;
}

function TierMonRow({
  scored,
  heroSpeed,
  trickRoom,
  abilityActive,
  showGroupSeparator,
}: TierMonRowProps) {
  const { mon, speed } = scored;
  const isTie = !mon.isSelected && speed === heroSpeed && heroSpeed > 0;
  const isFaster =
    !mon.isYours &&
    heroSpeed > 0 &&
    (trickRoom ? speed > heroSpeed : speed < heroSpeed);

  return (
    <TableRow
      className={cn(
        "border-border/30 border-b",
        showGroupSeparator && "border-t-primary/40 border-t-2",
        mon.isSelected && "bg-primary/10",
        mon.isYours && !mon.isSelected && "bg-primary/5",
        isFaster && "opacity-40"
      )}
    >
      {/* Pokemon name + sprite */}
      <TableCell className="px-1.5 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {mon.spriteUrl ? (
            <Image
              src={mon.spriteUrl}
              alt=""
              width={44}
              height={44}
              unoptimized
              className="size-11 shrink-0 object-contain"
            />
          ) : (
            <span className="bg-muted inline-block size-11 shrink-0 rounded-full" />
          )}
          <span
            className={cn(
              "truncate text-xs leading-tight",
              mon.isYours ? "text-primary font-semibold" : "text-foreground"
            )}
          >
            {mon.name}
          </span>
          {mon.speedAbility && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] leading-none font-medium capitalize",
                abilityActive
                  ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                  : "bg-muted text-muted-foreground/50"
              )}
            >
              {mon.speedAbility.replace(/-/g, " ")}
            </span>
          )}
          {mon.isYours && mon.heldItem && (
            <ItemSprite item={mon.heldItem} size={14} className="shrink-0" />
          )}
          {isTie && (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] leading-none font-medium text-amber-600 dark:text-amber-400">
              Tie
            </span>
          )}
        </div>
      </TableCell>
      {/* Base speed */}
      <TableCell className="text-muted-foreground px-2 py-1.5 text-right font-mono text-xs tabular-nums">
        {mon.baseSpeed}
      </TableCell>
      {/* SPE column */}
      <TableCell
        className={cn(
          STAT_CELL,
          mon.isYours ? "text-primary font-bold" : "text-foreground font-bold"
        )}
      >
        {speed}
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
export function SpeedTiersPanel({ team, format }: SpeedTiersPanelProps) {
  const [toggle, setToggle] = useState<ToggleState>(DEFAULT_TOGGLE);
  const [prevFormatId, setPrevFormatId] = useState<
    string | undefined | typeof UNINITIALIZED_FORMAT_ID
  >(UNINITIALIZED_FORMAT_ID);

  // Format can change (user switches VGC → Champions). Different formats have
  // different max EVs (VGC 252 vs Champions 32), so a stale 100-EV override
  // would otherwise pass out-of-range to calculateChampionsStat. Clamp on
  // change using the render-time sentinel pattern from react-patterns.md.
  const currentFormatId = format?.id;
  if (currentFormatId !== prevFormatId) {
    setPrevFormatId(currentFormatId);
    if (format) {
      const newMaxEv = isChampionsFormat(format) ? 32 : 252;
      setToggle((prev) => {
        const yoursEvs = prev.yours.evs;
        const theirsEvs = prev.theirs.evs;
        const clampedYours =
          yoursEvs != null && yoursEvs > newMaxEv ? newMaxEv : yoursEvs;
        const clampedTheirs =
          theirsEvs != null && theirsEvs > newMaxEv ? newMaxEv : theirsEvs;
        if (clampedYours === yoursEvs && clampedTheirs === theirsEvs)
          return prev;
        return {
          ...prev,
          yours: { ...prev.yours, evs: clampedYours },
          theirs: { ...prev.theirs, evs: clampedTheirs },
        };
      });
    }
  }

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

  const metaScored: ScoredMon[] = metaTiers.map((e) =>
    metaToScored(e, toggle, format)
  );

  const allScored = [...teamScored, ...metaScored];

  // Sort value extractor
  function getSortValue(scored: ScoredMon): number {
    switch (toggle.sortBy) {
      case "base":
        return scored.mon.baseSpeed;
      case "speed":
        return scored.speed;
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
    setToggle((prev) => ({
      ...prev,
      trickRoom: v,
      sortDir: v ? "asc" : "desc",
    }));
  }
  function setSortBy(col: SortColumn) {
    setToggle((prev) => ({
      ...prev,
      sortBy: col,
      sortDir:
        prev.sortBy === col
          ? prev.sortDir === "desc"
            ? "asc"
            : "desc"
          : prev.trickRoom
            ? "asc"
            : "desc",
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
          <span className="text-primary font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
            Field
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground/70 text-[11px]">
              Trick Room
            </span>
            <Switch
              size="sm"
              checked={toggle.trickRoom}
              onCheckedChange={setTrickRoom}
              aria-label="Trick Room"
            />
          </div>
          <span className="text-muted-foreground/70 text-[11px]">Weather</span>
          <div className="flex flex-col gap-1">
            {(["sun", "rain", "sand", "snow"] as const).map((w) => (
              <Toggle
                key={w}
                variant="outline"
                pressed={toggle.weather === w}
                onPressedChange={() => setWeather(w)}
                aria-label={WEATHER_LABELS[w]}
                className={cn(
                  "w-full",
                  toggle.weather === w &&
                    "bg-primary/15 text-primary border-primary/40"
                )}
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
          <span className="text-primary font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
            Modifiers
          </span>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-1 gap-y-0.5">
            {/* Header */}
            <span className="text-muted-foreground text-right text-[10px] font-semibold tracking-wider uppercase">
              Ours
            </span>
            <span />
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Theirs
            </span>

            {/* Tailwind */}
            <div className="flex justify-end">
              <Switch
                size="sm"
                checked={toggle.yours.tailwind}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({
                    ...prev,
                    yours: { ...prev.yours, tailwind: v },
                  }))
                }
              />
            </div>
            <span className="text-center text-[11px]">Tailwind</span>
            <div className="flex justify-start">
              <Switch
                size="sm"
                checked={toggle.theirs.tailwind}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({
                    ...prev,
                    theirs: { ...prev.theirs, tailwind: v },
                  }))
                }
              />
            </div>

            {/* Scarf */}
            <div className="flex justify-end">
              <Switch
                size="sm"
                checked={toggle.yours.scarf}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({
                    ...prev,
                    yours: { ...prev.yours, scarf: v },
                  }))
                }
              />
            </div>
            <span className="text-center text-[11px]">Scarf</span>
            <div className="flex justify-start">
              <Switch
                size="sm"
                checked={toggle.theirs.scarf}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({
                    ...prev,
                    theirs: { ...prev.theirs, scarf: v },
                  }))
                }
              />
            </div>

            {/* Unburden */}
            <div className="flex justify-end">
              <Switch
                size="sm"
                checked={toggle.yours.unburden}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({
                    ...prev,
                    yours: { ...prev.yours, unburden: v },
                  }))
                }
              />
            </div>
            <span className="text-center text-[11px]">Unburden</span>
            <div className="flex justify-start">
              <Switch
                size="sm"
                checked={toggle.theirs.unburden}
                onCheckedChange={(v) =>
                  setToggle((prev) => ({
                    ...prev,
                    theirs: { ...prev.theirs, unburden: v },
                  }))
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
                    yours: {
                      ...prev.yours,
                      status: v ? "paralyzed" : "healthy",
                    },
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
                    theirs: {
                      ...prev.theirs,
                      status: v ? "paralyzed" : "healthy",
                    },
                  }))
                }
              />
            </div>

            {/* Nature toggle — only theirs side */}
            <div />
            <span className="text-center text-[11px]">Nature</span>
            <div className="flex justify-start">
              <div className="bg-card grid grid-cols-3 overflow-hidden rounded-md border">
                <button
                  type="button"
                  aria-label="Negative speed nature"
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      theirs: { ...prev.theirs, nature: "negative" },
                    }))
                  }
                  className={cn(
                    "flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold",
                    toggle.theirs.nature === "negative"
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="Neutral speed nature"
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      theirs: { ...prev.theirs, nature: "neutral" },
                    }))
                  }
                  className={cn(
                    "flex items-center justify-center border-x px-2 py-0.5 text-[10px] font-semibold",
                    toggle.theirs.nature === "neutral"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  ●
                </button>
                <button
                  type="button"
                  aria-label="Positive speed nature"
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      theirs: { ...prev.theirs, nature: "positive" },
                    }))
                  }
                  className={cn(
                    "flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold",
                    toggle.theirs.nature === "positive"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : "hover:bg-muted text-muted-foreground"
                  )}
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
                  disabled={
                    toggle.theirs.evs === null || toggle.theirs.evs <= 0
                  }
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
                  className="text-foreground w-full [appearance:textfield] bg-transparent text-center font-mono text-[10px] font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label={`Increase speed ${evLabel}`}
                  disabled={
                    toggle.theirs.evs !== null && toggle.theirs.evs >= maxEv
                  }
                  onClick={() =>
                    setToggle((prev) => ({
                      ...prev,
                      theirs: {
                        ...prev.theirs,
                        evs: Math.min(
                          maxEv,
                          (prev.theirs.evs ?? maxEv) + evStep
                        ),
                      },
                    }))
                  }
                  className="hover:bg-muted text-foreground flex items-center justify-center text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
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
                  {toggle.yours.stage === 0
                    ? "0"
                    : toggle.yours.stage > 0
                      ? `+${toggle.yours.stage}`
                      : toggle.yours.stage}
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
                  {toggle.theirs.stage === 0
                    ? "0"
                    : toggle.theirs.stage > 0
                      ? `+${toggle.theirs.stage}`
                      : toggle.theirs.stage}
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
          </div>
        </div>
      </div>

      {/* Tier table */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="bg-card/95 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="border-b">
              <TableHead className="text-muted-foreground h-auto px-1.5 py-1.5 text-[10px] leading-tight font-medium tracking-wide">
                Pokémon
              </TableHead>
              <TableHead
                aria-sort={
                  toggle.sortBy === "base"
                    ? toggle.sortDir === "desc"
                      ? "descending"
                      : "ascending"
                    : "none"
                }
                className="h-auto px-0 py-0"
              >
                <button
                  type="button"
                  onClick={() => setSortBy("base")}
                  className={cn(
                    "text-muted-foreground h-auto w-full px-2 py-1.5 text-right text-[10px] leading-tight font-medium tracking-wide",
                    toggle.sortBy === "base" && "text-primary"
                  )}
                >
                  Base{" "}
                  {toggle.sortBy === "base" &&
                    (toggle.sortDir === "desc" ? "↓" : "↑")}
                </button>
              </TableHead>
              <TableHead
                aria-sort={
                  toggle.sortBy === "speed"
                    ? toggle.sortDir === "desc"
                      ? "descending"
                      : "ascending"
                    : "none"
                }
                className="h-auto px-0 py-0"
              >
                <button
                  type="button"
                  onClick={() => setSortBy("speed")}
                  className={cn(
                    "h-auto w-full px-2 py-1.5 text-right text-[10px] leading-tight font-semibold tracking-wide",
                    toggle.sortBy === "speed" ? "text-primary" : "text-foreground"
                  )}
                >
                  SPE{" "}
                  {toggle.sortBy === "speed" &&
                    (toggle.sortDir === "desc" ? "↓" : "↑")}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((scored, i) => {
              const getGroupValue = (s: ScoredMon) => {
                switch (toggle.sortBy) {
                  case "base":
                    return s.mon.baseSpeed;
                  case "speed":
                    return s.speed;
                  default:
                    return s.speed;
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
                    scored.mon.isYours
                      ? toggle.yours.unburden
                      : toggle.theirs.unburden
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
