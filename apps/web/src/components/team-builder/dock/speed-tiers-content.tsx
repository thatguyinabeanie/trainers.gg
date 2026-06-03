"use client";

import { type Dispatch, type SetStateAction } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ItemSprite } from "@/components/tournament/item-sprite";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  type SideModifiers,
  type SortColumn,
  type ToggleState,
  type Weather,
} from "./speed-tiers-state";

// =============================================================================
// Types
// =============================================================================

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

const WEATHER_LABELS: Record<Weather, string> = {
  none: "None",
  sun: "Sun",
  rain: "Rain",
  sand: "Sand",
  snow: "Snow",
};

/** Map engine-level weather strings (from @smogon/calc) to panel Weather type. */
const ENGINE_TO_PANEL_WEATHER: Record<string, Weather> = {
  Sun: "sun",
  Rain: "rain",
  Sand: "sand",
  Snow: "snow",
};

/** Safely convert an external engine weather string to a validated Weather value. */
export function parseExternalWeather(
  engineWeather: string | undefined
): Weather {
  if (!engineWeather) return "none";
  return ENGINE_TO_PANEL_WEATHER[engineWeather] ?? "none";
}

/** Convert panel Weather back to engine format for the calc state setter. */
export function panelWeatherToEngine(w: Weather): string {
  return w === "none" ? "" : w.charAt(0).toUpperCase() + w.slice(1);
}

const STAGE_MIN = -6;
const STAGE_MAX = 6;

/**
 * Sentinel for the render-time state-reset pattern (see react-patterns.md).
 * Module-scoped so its identity is stable across renders. Exported because the
 * EV-clamp-on-format-change reset now lives in TeamWorkspaceV2 (which owns the
 * speed toggle), not here — calling setToggle during this table's render would
 * be a cross-component render-setState violation.
 */
export const UNINITIALIZED_FORMAT_ID = Symbol("uninitialized-format-id");

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

function safeSprite(species: string): string | undefined {
  try {
    return getPokemonSprite(species).url;
  } catch {
    // getPokemonSprite throws for unknown/mismatched species names — graceful
    // degradation to no sprite is preferred over crashing the entire panel.
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
      // Store the NORMALIZED id (e.g. "swift-swim"), not the display name —
      // isSpeedAbilityActive() and the meta rows both key off normalized ids,
      // so the display name would never match and the pill would stay dim.
      speedAbility:
        pokemon.ability === speedAbilityName && speedAbilityName
          ? (SPEED_ABILITY_LOOKUP[speedAbilityName] ?? null)
          : null,
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

  // EVs: if custom set use that; otherwise default to the format max. This
  // matches the modifiers UI, where a cleared input shows the maxEv placeholder
  // and the +/- steppers anchor at maxEv — so a blank field computes the speed
  // the UI implies rather than 0.
  const maxEv = champions ? 32 : 252;
  const evs = customEvs ?? maxEv;

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
  "text-right font-mono text-xs tabular-nums px-2 py-1.5 whitespace-nowrap";

/** Determine if a speed ability is currently active based on field/toggle state */
function isSpeedAbilityActive(
  ability: string | null | undefined,
  weather: Weather,
  unburden: boolean,
  statused: boolean
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
      return statused; // only active when the mon has a status condition
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
  groupValue?: number;
  groupLabel?: string;
}

function TierMonRow({
  scored,
  heroSpeed,
  trickRoom,
  abilityActive,
  showGroupSeparator,
  groupValue,
  groupLabel,
}: TierMonRowProps) {
  const { mon, speed } = scored;
  const isTie = !mon.isSelected && speed === heroSpeed && heroSpeed > 0;
  const isFaster =
    !mon.isYours &&
    heroSpeed > 0 &&
    (trickRoom ? speed > heroSpeed : speed < heroSpeed);

  return (
    <>
      {showGroupSeparator && (
        <TableRow className="border-0">
          <TableCell
            colSpan={2}
            className="text-muted-foreground h-auto px-2 py-0.5 text-[10px] font-medium tabular-nums"
          >
            <div className="border-primary/40 flex items-center justify-center gap-1.5 border-t-2 pt-0.5">
              <span className="text-primary/70 font-mono text-[10px]">
                {groupValue}
              </span>
              <span className="text-muted-foreground/70 text-[9px] tracking-wider uppercase">
                {groupLabel ?? "Base Speed"}
              </span>
            </div>
          </TableCell>
        </TableRow>
      )}
      <TableRow
        className={cn(
          "border-border/30 [&:hover>td]:bg-muted/50 border-b hover:bg-transparent [&:hover>td:first-child]:rounded-l-lg [&:hover>td:last-child]:rounded-r-lg",
          mon.isSelected && "bg-primary/10",
          mon.isYours && !mon.isSelected && "bg-primary/5",
          mon.isYours &&
            "[&>td]:border-primary/25 [&>td]:border-y [&>td:first-child]:rounded-l-lg [&>td:first-child]:border-l [&>td:last-child]:rounded-r-lg [&>td:last-child]:border-r",
          isFaster && "opacity-40"
        )}
      >
        {/* Pokemon name + sprite */}
        <TableCell className="px-1.5 py-1">
          <div className="flex min-w-0 items-center gap-2.5">
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
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "truncate text-xs leading-tight",
                    mon.isYours
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  )}
                >
                  {mon.name}
                </span>
                {mon.isYours && mon.heldItem && (
                  <ItemSprite
                    item={mon.heldItem}
                    size={14}
                    className="shrink-0"
                  />
                )}
                {isTie && (
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] leading-none font-medium text-amber-600 dark:text-amber-400">
                    Tie
                  </span>
                )}
              </div>
              {mon.speedAbility && (
                <span
                  className={cn(
                    "w-fit truncate rounded-full px-1.5 py-0.5 text-[8px] leading-none font-medium capitalize",
                    abilityActive
                      ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                      : "bg-muted text-muted-foreground/50"
                  )}
                >
                  {mon.speedAbility.replace(/-/g, " ")}
                </span>
              )}
            </div>
          </div>
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
    </>
  );
}

// =============================================================================
// SpeedTiersFieldControls — FIELD fieldset (weather + Trick Room)
// =============================================================================

interface FieldControlsProps {
  toggle: ToggleState;
  setToggle: Dispatch<SetStateAction<ToggleState>>;
  effectiveWeather: Weather;
  isExternallyControlled: boolean;
  externalWeather?: string;
  externalSetWeather?: (v: string) => void;
}

export function SpeedTiersFieldControls({
  toggle,
  setToggle,
  effectiveWeather,
  isExternallyControlled,
  externalWeather,
  externalSetWeather,
}: FieldControlsProps) {
  function setWeather(w: Weather) {
    if (isExternallyControlled) {
      if (!externalSetWeather) return;
      // Toggle off if already active, otherwise sync to calc state
      const current = parseExternalWeather(externalWeather);
      externalSetWeather(current === w ? "" : panelWeatherToEngine(w));
    } else {
      setToggle((prev) => ({
        ...prev,
        weather: prev.weather === w ? "none" : w,
      }));
    }
  }
  function setTrickRoom(v: boolean) {
    setToggle((prev) => ({
      ...prev,
      trickRoom: v,
      sortDir: v ? "asc" : "desc",
    }));
  }

  return (
    <fieldset className="border-border/60 rounded-lg border px-3 py-2">
      <legend className="text-primary px-1 font-mono text-[9px] font-bold tracking-[0.12em] uppercase">
        Field
      </legend>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/70 shrink-0 font-mono text-[8.5px] tracking-wide uppercase">
            Weather
          </span>
          <div className="flex flex-1 flex-wrap justify-end gap-1">
            {(["sun", "rain", "sand", "snow"] as const).map((w) => (
              <button
                key={w}
                type="button"
                aria-label={WEATHER_LABELS[w]}
                onClick={() => setWeather(w)}
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[10px] leading-tight transition-all",
                  effectiveWeather === w
                    ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {WEATHER_LABELS[w]}
              </button>
            ))}
          </div>
        </div>
        <div className="border-border/40 flex items-center gap-2 border-t border-dashed pt-1.5">
          <span className="text-muted-foreground/70 shrink-0 font-mono text-[8.5px] tracking-wide uppercase">
            Other
          </span>
          <div className="flex flex-1 flex-wrap justify-end gap-1">
            <button
              type="button"
              aria-label="Trick Room"
              aria-pressed={toggle.trickRoom}
              onClick={() => setTrickRoom(!toggle.trickRoom)}
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[10px] leading-tight transition-all",
                toggle.trickRoom
                  ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              Trick Room
            </button>
          </div>
        </div>
      </div>
    </fieldset>
  );
}

// =============================================================================
// SpeedTiersTable — scrollable speed table (scoring + sort + rows)
// =============================================================================

interface TableProps {
  team: TeamWithPokemon["team_pokemon"];
  format: GameFormat;
  toggle: ToggleState;
  setToggle: Dispatch<SetStateAction<ToggleState>>;
  effectiveWeather: Weather;
  nameFilter?: string;
}

export function SpeedTiersTable({
  team,
  format,
  toggle,
  setToggle,
  effectiveWeather,
  nameFilter,
}: TableProps) {
  // Format-change EV clamping moved to TeamWorkspaceV2 (which owns the toggle).
  // Calling setToggle during this table's render would be a cross-component
  // render-setState violation — the setter belongs to the parent now.

  // Filter to non-null pokemon on the team.
  const pokemons = team
    .filter((tp) => tp.pokemon != null)
    .map((tp) => tp.pokemon as Tables<"pokemon">);

  const effectiveToggle: ToggleState = { ...toggle, weather: effectiveWeather };

  const teamScored: ScoredMon[] = pokemons.map((p) =>
    teamMonToScored(p, format, effectiveToggle, false)
  );

  const legalSpecies = legalSetOrPermissive(getLegalSpecies(format.id));
  const metaTiers = legalSpecies
    ? buildFullMetaTiers(legalSpecies, format)
    : getMetaSpeedTiers(format.id);

  const metaScored: ScoredMon[] = metaTiers.map((e) =>
    metaToScored(e, effectiveToggle, format)
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
  const allSorted = [...allScored].sort((a, b) => {
    const aVal = getSortValue(a);
    const bVal = getSortValue(b);
    return isAsc ? aVal - bVal : bVal - aVal;
  });

  // Apply optional name filter AFTER sorting but BEFORE the group-separator map,
  // so base-speed group headers attach to the correct visible rows.
  const trimmedFilter = nameFilter?.trim().toLowerCase();
  const sorted = trimmedFilter
    ? allSorted.filter((scored) =>
        scored.mon.name.toLowerCase().includes(trimmedFilter)
      )
    : allSorted;

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

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <table className="w-full table-fixed caption-bottom border-separate border-spacing-0 text-sm">
        <colgroup>
          <col className="w-full" />
          <col className="w-14" />
        </colgroup>
        <TableHeader className="bg-card/95 sticky top-0 z-10 backdrop-blur-sm">
          <TableRow className="border-b">
            <TableHead className="text-muted-foreground h-auto px-3 py-1.5 text-[10px] leading-tight font-medium tracking-wide">
              Pokémon
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
                  "h-auto w-full px-3 py-1.5 text-right text-[10px] leading-tight font-semibold tracking-wide",
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
            const prev = i > 0 ? getGroupValue(sorted[i - 1]!) : null;
            const curr = getGroupValue(scored);
            const showSeparator = i === 0 || (prev !== null && prev !== curr);
            return (
              <TierMonRow
                key={scored.mon.id}
                scored={scored}
                heroSpeed={0}
                trickRoom={toggle.trickRoom}
                abilityActive={isSpeedAbilityActive(
                  scored.mon.speedAbility,
                  effectiveWeather,
                  scored.mon.isYours
                    ? toggle.yours.unburden
                    : toggle.theirs.unburden,
                  scored.mon.isYours
                    ? toggle.yours.status === "paralyzed"
                    : toggle.theirs.status === "paralyzed"
                )}
                showGroupSeparator={showSeparator}
                groupValue={curr}
                groupLabel={toggle.sortBy === "speed" ? "Speed" : "Base Speed"}
              />
            );
          })}
        </TableBody>
      </table>
    </div>
  );
}

// =============================================================================
// SpeedTiersModifiers — MODIFIERS fieldset
// =============================================================================

interface ModifiersProps {
  toggle: ToggleState;
  setToggle: Dispatch<SetStateAction<ToggleState>>;
  maxEv: number;
  evStep: number;
  evLabel: string;
}

export function SpeedTiersModifiers({
  toggle,
  setToggle,
  maxEv,
  evStep,
  evLabel,
}: ModifiersProps) {
  return (
    <fieldset className="border-border/60 rounded-lg border px-3 py-2">
      <legend className="text-primary px-1 font-mono text-[9px] font-bold tracking-[0.12em] uppercase">
        Modifiers
      </legend>
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
            onCheckedChange={() =>
              setToggle((prev) => ({
                ...prev,
                yours: { ...prev.yours, tailwind: !prev.yours.tailwind },
              }))
            }
            aria-label="Our Tailwind"
          />
        </div>
        <span className="text-center text-[11px]">Tailwind</span>
        <div className="flex justify-start">
          <Switch
            size="sm"
            checked={toggle.theirs.tailwind}
            onCheckedChange={() =>
              setToggle((prev) => ({
                ...prev,
                theirs: { ...prev.theirs, tailwind: !prev.theirs.tailwind },
              }))
            }
            aria-label="Their Tailwind"
          />
        </div>

        {/* Scarf */}
        <div className="flex justify-end">
          <Switch
            size="sm"
            checked={toggle.yours.scarf}
            onCheckedChange={() =>
              setToggle((prev) => ({
                ...prev,
                yours: { ...prev.yours, scarf: !prev.yours.scarf },
              }))
            }
            aria-label="Our Scarf"
          />
        </div>
        <span className="text-center text-[11px]">Choice Scarf</span>
        <div className="flex justify-start">
          <Switch
            size="sm"
            checked={toggle.theirs.scarf}
            onCheckedChange={() =>
              setToggle((prev) => ({
                ...prev,
                theirs: { ...prev.theirs, scarf: !prev.theirs.scarf },
              }))
            }
            aria-label="Their Scarf"
          />
        </div>

        {/* Unburden */}
        <div className="flex justify-end">
          <Switch
            size="sm"
            checked={toggle.yours.unburden}
            onCheckedChange={() =>
              setToggle((prev) => ({
                ...prev,
                yours: { ...prev.yours, unburden: !prev.yours.unburden },
              }))
            }
            aria-label="Our Unburden"
          />
        </div>
        <span className="text-center text-[11px]">Unburden</span>
        <div className="flex justify-start">
          <Switch
            size="sm"
            checked={toggle.theirs.unburden}
            onCheckedChange={() =>
              setToggle((prev) => ({
                ...prev,
                theirs: { ...prev.theirs, unburden: !prev.theirs.unburden },
              }))
            }
            aria-label="Their Unburden"
          />
        </div>

        {/* Paralyzed */}
        <div className="flex justify-end">
          <Switch
            size="sm"
            checked={toggle.yours.status === "paralyzed"}
            onCheckedChange={() =>
              setToggle((prev) => ({
                ...prev,
                yours: {
                  ...prev.yours,
                  status:
                    prev.yours.status === "paralyzed" ? "healthy" : "paralyzed",
                },
              }))
            }
            aria-label="Our Paralyzed"
          />
        </div>
        <span className="text-center text-[11px]">Paralyzed</span>
        <div className="flex justify-start">
          <Switch
            size="sm"
            checked={toggle.theirs.status === "paralyzed"}
            onCheckedChange={() =>
              setToggle((prev) => ({
                ...prev,
                theirs: {
                  ...prev.theirs,
                  status:
                    prev.theirs.status === "paralyzed"
                      ? "healthy"
                      : "paralyzed",
                },
              }))
            }
            aria-label="Their Paralyzed"
          />
        </div>

        {/* Nature — theirs only */}
        <div />
        <span className="text-center text-[11px]">SPE Nature</span>
        <div className="flex justify-start gap-0.5">
          {(["negative", "neutral", "positive"] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} speed nature`}
              onClick={() =>
                setToggle((prev) => ({
                  ...prev,
                  theirs: { ...prev.theirs, nature: n },
                }))
              }
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors",
                toggle.theirs.nature === n
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              {n === "negative" ? "−" : n === "neutral" ? "●" : "+"}
            </button>
          ))}
        </div>

        {/* EVs — theirs only */}
        <div />
        <span className="text-center text-[11px]">{evLabel}</span>
        <div className="flex items-center justify-start gap-0.5">
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
            className="text-muted-foreground hover:text-foreground text-xs font-bold disabled:opacity-30"
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
            className="text-foreground w-8 [appearance:textfield] bg-transparent text-center font-mono text-[10px] font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
            className="text-muted-foreground hover:text-foreground text-xs font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>

        {/* Stages — compact ±stepper */}
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            aria-label="Our stage decrease"
            disabled={toggle.yours.stage <= STAGE_MIN}
            onClick={() =>
              setToggle((prev) => ({
                ...prev,
                yours: { ...prev.yours, stage: prev.yours.stage - 1 },
              }))
            }
            className="text-muted-foreground hover:text-foreground text-xs font-bold disabled:opacity-30"
          >
            −
          </button>
          <span
            className={cn(
              "min-w-5 rounded px-1 text-center font-mono text-[10px] font-bold",
              toggle.yours.stage !== 0
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground"
            )}
          >
            {toggle.yours.stage === 0
              ? "0"
              : toggle.yours.stage > 0
                ? `+${toggle.yours.stage}`
                : toggle.yours.stage}
          </span>
          <button
            type="button"
            aria-label="Our stage increase"
            disabled={toggle.yours.stage >= STAGE_MAX}
            onClick={() =>
              setToggle((prev) => ({
                ...prev,
                yours: { ...prev.yours, stage: prev.yours.stage + 1 },
              }))
            }
            className="text-muted-foreground hover:text-foreground text-xs font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
        <span className="text-center text-[11px]">Stages</span>
        <div className="flex items-center justify-start gap-0.5">
          <button
            type="button"
            aria-label="Their stage decrease"
            disabled={toggle.theirs.stage <= STAGE_MIN}
            onClick={() =>
              setToggle((prev) => ({
                ...prev,
                theirs: { ...prev.theirs, stage: prev.theirs.stage - 1 },
              }))
            }
            className="text-muted-foreground hover:text-foreground text-xs font-bold disabled:opacity-30"
          >
            −
          </button>
          <span
            className={cn(
              "min-w-5 rounded px-1 text-center font-mono text-[10px] font-bold",
              toggle.theirs.stage !== 0
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground"
            )}
          >
            {toggle.theirs.stage === 0
              ? "0"
              : toggle.theirs.stage > 0
                ? `+${toggle.theirs.stage}`
                : toggle.theirs.stage}
          </span>
          <button
            type="button"
            aria-label="Their stage increase"
            disabled={toggle.theirs.stage >= STAGE_MAX}
            onClick={() =>
              setToggle((prev) => ({
                ...prev,
                theirs: { ...prev.theirs, stage: prev.theirs.stage + 1 },
              }))
            }
            className="text-muted-foreground hover:text-foreground text-xs font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
    </fieldset>
  );
}
