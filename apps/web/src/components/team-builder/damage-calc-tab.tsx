"use client";

import { useState, useEffect, useRef, useId } from "react";
import {
  calculate,
  Field,
  Generations,
  Move,
  Pokemon,
  Side,
} from "@smogon/calc";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";
import {
  type GameFormat,
  ALL_TYPES,
  getBaseStats,
  getValidAbilities,
  getValidNatures,
  getMoveData,
  buildSpeciesSearchIndex,
  getTypeColor,
  getAllItems,
  NATURE_EFFECTS,
  calculateChampionsHP,
  calculateChampionsStat,
  getNatureMultiplier,
  isLegalSpecies,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// Types
// =============================================================================

interface DamageCalcTabProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  format: GameFormat | undefined;
}

interface DefenderEvs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface DefenderBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface AttackerBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface AttackerSideState {
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  tailwind: boolean;
  helpingHand: boolean;
  friendGuard: boolean;
}

interface DefenderSideState {
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  tailwind: boolean;
  helpingHand: boolean;
  friendGuard: boolean;
  stealthRock: boolean;
  spikes: number;
  saltCure: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const gen9 = Generations.get(9);

const STATUS_OPTIONS = [
  "Healthy",
  "Burned",
  "Poisoned",
  "Badly Poisoned",
  "Paralyzed",
  "Asleep",
  "Frozen",
];

/** Smogon status names map */
const STATUS_MAP: Record<string, string> = {
  Healthy: "",
  Burned: "brn",
  Poisoned: "psn",
  "Badly Poisoned": "tox",
  Paralyzed: "par",
  Asleep: "slp",
  Frozen: "frz",
};

const BOOST_OPTIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

const WEATHER_OPTIONS = ["", "Sun", "Rain", "Sand", "Snow"] as const;
const WEATHER_LABELS: Record<string, string> = {
  "": "None",
  Sun: "Sun",
  Rain: "Rain",
  Sand: "Sand",
  Snow: "Snow",
};

const TERRAIN_OPTIONS = ["", "Electric", "Grassy", "Misty", "Psychic"] as const;
const TERRAIN_LABELS: Record<string, string> = {
  "": "None",
  Electric: "Elec",
  Grassy: "Grass",
  Misty: "Misty",
  Psychic: "Psych",
};

const STAT_LABELS_SHORT: Record<string, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

const DEFENDER_STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
type DefenderStatKey = (typeof DEFENDER_STAT_KEYS)[number];

/** Maps full stat key names (from NATURE_EFFECTS) to short display labels. */
const STAT_KEY_TO_SHORT: Record<string, string> = {
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
};

/**
 * Returns a nature's stat effect label, e.g. "(+SpA, -Atk)" or "" for neutral.
 */
function getNatureLabel(nature: string): string {
  const effect = NATURE_EFFECTS[nature];
  if (!effect || (!effect.boost && !effect.reduce)) return "";
  const boostLabel = effect.boost
    ? (STAT_KEY_TO_SHORT[effect.boost] ?? "")
    : "";
  const reduceLabel = effect.reduce
    ? (STAT_KEY_TO_SHORT[effect.reduce] ?? "")
    : "";
  if (!boostLabel && !reduceLabel) return "";
  return `(+${boostLabel}, -${reduceLabel})`;
}

/** All held items available in gen 9 — built once at module init. */
const ALL_ITEMS: string[] = getAllItems();

/**
 * Module-level cache for the species search index.
 * Built once per format ID per app session, keyed by format ID string.
 */
const speciesIndexCache = new Map<string, string[]>();

// =============================================================================
// Helpers
// =============================================================================

/** Cast a string to the branded smogon type it needs for Pokemon constructor options. */
function asSmogon<T>(v: string | null | undefined): T {
  return (v ?? undefined) as unknown as T;
}

/**
 * Build a @smogon/calc Pokemon from a DB row with optional boost/status overrides.
 */
function buildAttackerFromDb(
  db: Tables<"pokemon">,
  boosts: AttackerBoosts,
  status: string
): Pokemon | null {
  if (!db.species) return null;
  try {
    return new Pokemon(gen9, db.species, {
      level: db.level ?? 50,
      nature: asSmogon(db.nature ?? "Hardy"),
      ability: asSmogon(db.ability),
      item: asSmogon(db.held_item),
      teraType: asSmogon(db.tera_type),
      ivs: {
        hp: db.iv_hp ?? 31,
        atk: db.iv_attack ?? 31,
        def: db.iv_defense ?? 31,
        spa: db.iv_special_attack ?? 31,
        spd: db.iv_special_defense ?? 31,
        spe: db.iv_speed ?? 31,
      },
      evs: {
        hp: db.ev_hp ?? 0,
        atk: db.ev_attack ?? 0,
        def: db.ev_defense ?? 0,
        spa: db.ev_special_attack ?? 0,
        spd: db.ev_special_defense ?? 0,
        spe: db.ev_speed ?? 0,
      },
      boosts: {
        atk: boosts.atk,
        def: boosts.def,
        spa: boosts.spa,
        spd: boosts.spd,
        spe: boosts.spe,
      },
      status: asSmogon(STATUS_MAP[status] ?? ""),
      moves: [db.move1, db.move2, db.move3, db.move4].filter((m): m is string =>
        Boolean(m)
      ) as unknown as string[],
    });
  } catch {
    return null;
  }
}

/**
 * Build a @smogon/calc Pokemon for the defender from the editable calc state.
 */
function buildDefenderPokemon(
  species: string,
  ability: string,
  item: string,
  nature: string,
  teraType: string,
  evs: DefenderEvs,
  boosts: DefenderBoosts,
  status: string,
  hpPercent: number
): Pokemon | null {
  if (!species) return null;
  try {
    const poke = new Pokemon(gen9, species, {
      level: 50,
      nature: asSmogon(nature),
      ability: asSmogon(ability || null),
      item: asSmogon(item || null),
      teraType: asSmogon(teraType || null),
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: {
        hp: evs.hp,
        atk: evs.atk,
        def: evs.def,
        spa: evs.spa,
        spd: evs.spd,
        spe: evs.spe,
      },
      boosts: {
        atk: boosts.atk,
        def: boosts.def,
        spa: boosts.spa,
        spd: boosts.spd,
        spe: boosts.spe,
      },
      status: asSmogon(STATUS_MAP[status] ?? ""),
      curHP: Math.max(1, Math.round((hpPercent / 100) * 1)),
    });
    return poke;
  } catch {
    return null;
  }
}

/**
 * Build a @smogon/calc Field from the field state.
 */
function buildField(
  gameType: "Doubles" | "Singles",
  weather: string,
  terrain: string,
  gravity: boolean,
  attackerSide: AttackerSideState,
  defenderSide: DefenderSideState,
  direction: "offense" | "defense"
): Field {
  // When direction is "defense", attacker/defender sides swap
  const aSide = direction === "offense" ? attackerSide : defenderSide;
  const dSide = direction === "offense" ? defenderSide : attackerSide;

  const aSmogon = new Side({
    isReflect: "reflect" in aSide ? aSide.reflect : false,
    isLightScreen: "lightScreen" in aSide ? aSide.lightScreen : false,
    isAuroraVeil: "auroraVeil" in aSide ? aSide.auroraVeil : false,
    isTailwind: "tailwind" in aSide ? aSide.tailwind : false,
    isHelpingHand: "helpingHand" in aSide ? aSide.helpingHand : false,
    isFriendGuard: "friendGuard" in aSide ? aSide.friendGuard : false,
  });

  const dSmogon = new Side({
    isReflect: "reflect" in dSide ? dSide.reflect : false,
    isLightScreen: "lightScreen" in dSide ? dSide.lightScreen : false,
    isAuroraVeil: "auroraVeil" in dSide ? dSide.auroraVeil : false,
    isTailwind: "tailwind" in dSide ? dSide.tailwind : false,
    isHelpingHand: "helpingHand" in dSide ? dSide.helpingHand : false,
    isFriendGuard: "friendGuard" in dSide ? dSide.friendGuard : false,
    isSR:
      "stealthRock" in dSide ? (dSide as DefenderSideState).stealthRock : false,
    spikes: "spikes" in dSide ? (dSide as DefenderSideState).spikes : 0,
    isSaltCured:
      "saltCure" in dSide ? (dSide as DefenderSideState).saltCure : false,
  });

  return new Field({
    gameType,
    weather: asSmogon(weather || null),
    terrain: asSmogon(terrain || null),
    isGravity: gravity,
    attackerSide: aSmogon,
    defenderSide: dSmogon,
  });
}

/**
 * Run a calc and return a structured result.
 * Returns null if the calc fails or deals no damage.
 */
interface CalcOutput {
  minPercent: number;
  maxPercent: number;
  desc: string;
  rolls: readonly number[];
  defenderMaxHP: number;
}

function runCalc(
  attacker: Pokemon,
  defender: Pokemon,
  moveName: string,
  isCrit: boolean,
  field: Field
): CalcOutput | null {
  try {
    const move = new Move(gen9, moveName, { isCrit });
    const result = calculate(gen9, attacker, defender, move, field);
    const damage = result.damage;
    if (!damage || (Array.isArray(damage) && damage.length === 0)) return null;

    const defHP = defender.maxHP();
    if (defHP === 0) return null;

    const [minDmg, maxDmg] = result.range();
    const minPercent = Math.floor((minDmg / defHP) * 1000) / 10;
    const maxPercent = Math.floor((maxDmg / defHP) * 1000) / 10;

    // result.damage can be number[] or number[][] (doubles spread)
    const rolls: readonly number[] = Array.isArray(damage)
      ? Array.isArray(damage[0])
        ? ((damage as number[][])[0] ?? [])
        : (damage as number[])
      : [];

    return {
      minPercent,
      maxPercent,
      desc: result.desc(),
      rolls,
      defenderMaxHP: defHP,
    };
  } catch {
    return null;
  }
}

/**
 * Get the verdict label for a calc result.
 */
function getVerdict(
  minPercent: number,
  maxPercent: number
): "OHKO" | "2HKO" | "3HKO" | null {
  if (minPercent >= 100) return "OHKO";
  if (maxPercent >= 50) return "2HKO";
  if (maxPercent >= 34) return "3HKO";
  return null;
}

// =============================================================================
// Small shared UI pieces
// =============================================================================

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-widest uppercase">
      {children}
    </p>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-background rounded-lg border px-3 py-2.5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

interface VerdictBadgeProps {
  verdict: "OHKO" | "2HKO" | "3HKO";
}

function VerdictBadge({ verdict }: VerdictBadgeProps) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold",
        verdict === "OHKO" && "bg-red-100 text-red-700",
        verdict === "2HKO" && "bg-orange-100 text-orange-700",
        verdict === "3HKO" && "bg-yellow-100 text-yellow-700"
      )}
    >
      {verdict}
    </span>
  );
}

// =============================================================================
// DirectionToggle
// =============================================================================

interface DirectionToggleProps {
  value: "offense" | "defense";
  attackerName: string;
  defenderName: string;
  onChange: (v: "offense" | "defense") => void;
}

function DirectionToggle({
  value,
  attackerName,
  defenderName,
  onChange,
}: DirectionToggleProps) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onChange("offense")}
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          value === "offense"
            ? "bg-teal-600 text-white"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {attackerName} → {defenderName}
      </button>
      <button
        type="button"
        onClick={() => onChange("defense")}
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          value === "defense"
            ? "bg-teal-600 text-white"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {defenderName} → {attackerName}
      </button>
    </div>
  );
}

// =============================================================================
// TypeDot
// =============================================================================

function TypeDot({ type }: { type: string | null }) {
  const color = type
    ? getTypeColor(type as Parameters<typeof getTypeColor>[0])
    : "#9ca3af";
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      title={type ?? "Unknown"}
    />
  );
}

// =============================================================================
// MoveSelectorRow
// =============================================================================

interface MoveSelectorRowProps {
  moveName: string | null;
  moveIdx: number;
  isSelected: boolean;
  isCrit: boolean;
  calcOutput: CalcOutput | null;
  onSelect: () => void;
  onCritToggle: () => void;
}

function MoveSelectorRow({
  moveName,
  moveIdx: _moveIdx,
  isSelected,
  isCrit,
  calcOutput,
  onSelect,
  onCritToggle,
}: MoveSelectorRowProps) {
  const moveData = moveName ? getMoveData(moveName) : null;
  const verdict = calcOutput
    ? getVerdict(calcOutput.minPercent, calcOutput.maxPercent)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        isSelected ? "bg-teal-50 ring-1 ring-teal-400" : "hover:bg-muted/60"
      )}
    >
      {/* Type dot */}
      <TypeDot type={moveData?.type ?? null} />

      {/* Move name */}
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        {moveName ?? <span className="text-muted-foreground italic">—</span>}
      </span>

      {/* BP */}
      {moveData?.basePower ? (
        <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
          {moveData.basePower}
        </span>
      ) : null}

      {/* Damage range */}
      {calcOutput ? (
        <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
          {calcOutput.minPercent}–{calcOutput.maxPercent}%
        </span>
      ) : (
        <span className="text-muted-foreground shrink-0 text-[10px]">—%</span>
      )}

      {/* Verdict badge */}
      <div className="w-10 shrink-0 text-right">
        {verdict ? <VerdictBadge verdict={verdict} /> : null}
      </div>

      {/* Crit checkbox — hidden for Status moves since they can't crit */}
      {moveData?.category !== "Status" && (
        <label
          className={cn(
            "flex shrink-0 cursor-pointer items-center gap-1 text-[10px]",
            isCrit ? "text-amber-700" : "text-muted-foreground"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isCrit}
            onChange={() => onCritToggle()}
            className="size-3 cursor-pointer rounded accent-amber-500"
          />
          Crit
        </label>
      )}
    </button>
  );
}

// =============================================================================
// BoostSelect
// =============================================================================

interface BoostSelectProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function BoostSelect({ label, value, onChange }: BoostSelectProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-muted-foreground text-[10px]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "border-border bg-background h-7 rounded border px-1 text-center text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none",
          value > 0 && "text-green-700",
          value < 0 && "text-red-700"
        )}
      >
        {BOOST_OPTIONS.map((b) => (
          <option key={b} value={b}>
            {b > 0 ? `+${b}` : b}
          </option>
        ))}
      </select>
    </div>
  );
}

// =============================================================================
// AttackerModifiers
// =============================================================================

interface AttackerModifiersProps {
  status: string;
  boosts: AttackerBoosts;
  onStatusChange: (v: string) => void;
  onBoostChange: (stat: keyof AttackerBoosts, v: number) => void;
}

function AttackerModifiers({
  status,
  boosts,
  onStatusChange,
  onBoostChange,
}: AttackerModifiersProps) {
  return (
    <div>
      <SectionHeader>Your Modifiers</SectionHeader>
      <div className="flex flex-wrap items-end gap-3">
        {/* Status */}
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-[10px]">Status</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="border-border bg-background rounded border px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Boosts */}
        {(
          [
            ["atk", "Atk"],
            ["def", "Def"],
            ["spa", "SpA"],
            ["spd", "SpD"],
            ["spe", "Spe"],
          ] as [keyof AttackerBoosts, string][]
        ).map(([stat, label]) => (
          <BoostSelect
            key={stat}
            label={label}
            value={boosts[stat]}
            onChange={(v) => onBoostChange(stat, v)}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// InlineSpeciesSearch — clickable species name that becomes a search input
// =============================================================================

interface InlineSpeciesSearchProps {
  species: string;
  types: string[];
  formatId: string | undefined;
  onChange: (species: string) => void;
}

function InlineSpeciesSearch({
  species,
  types,
  formatId,
  onChange,
}: InlineSpeciesSearchProps) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the species index lazily on first use.
  let speciesIndex = speciesIndexCache.get(formatId ?? "");
  if (!speciesIndex) {
    try {
      speciesIndex = buildSpeciesSearchIndex(formatId ?? "gen9vgc2026regg").map(
        (s) => s.species
      );
    } catch {
      speciesIndex = [];
    }
    speciesIndexCache.set(formatId ?? "", speciesIndex);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditing(false);
        setQuery("");
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openSearch() {
    setQuery(species);
    setEditing(true);
    // Focus the input after state update
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    const trimmed = q.trim().toLowerCase();
    if (trimmed.length === 0) {
      setResults([]);
      return;
    }
    const filtered = (speciesIndex ?? [])
      .filter((s) => s.toLowerCase().includes(trimmed))
      .slice(0, 12);
    setResults(filtered);
  }

  function handleSelect(sp: string) {
    setEditing(false);
    setQuery("");
    setResults([]);
    onChange(sp);
  }

  if (editing) {
    return (
      <div ref={containerRef} className="relative mb-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus
          placeholder="Search species…"
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) {
              handleSelect(results[0]!);
            } else if (e.key === "Escape") {
              setEditing(false);
              setQuery("");
              setResults([]);
            }
          }}
          className="border-border bg-background w-full rounded border px-2 py-1 text-sm font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
        />
        {results.length > 0 && (
          <ul className="border-border bg-background absolute top-full right-0 left-0 z-20 mt-0.5 max-h-48 overflow-y-auto rounded-md border shadow-md">
            {results.map((sp) => {
              const legal = formatId ? isLegalSpecies(sp, formatId) : true;
              return (
                <li key={sp}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!legal) return;
                      handleSelect(sp);
                    }}
                    disabled={!legal}
                    className={cn(
                      "hover:bg-muted flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs",
                      !legal &&
                        "cursor-not-allowed opacity-50 hover:bg-transparent"
                    )}
                  >
                    <span className="flex-1">{sp}</span>
                    {!legal && (
                      <Badge
                        variant="outline"
                        className="border-muted-foreground/30 text-muted-foreground text-[10px]"
                      >
                        Not legal
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // Display mode: species name + type badges — click to open search
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <button
        type="button"
        onClick={openSearch}
        className="hover:text-primary flex items-center gap-1 rounded border border-dashed border-transparent px-1 py-0.5 text-sm font-semibold transition-colors hover:border-teal-300 hover:bg-teal-50"
        title="Click to change species"
      >
        {species || "—"}
        <span className="text-muted-foreground text-[10px]">▾</span>
      </button>
      {types.map((t) => (
        <span
          key={t}
          className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
          style={{
            backgroundColor: getTypeColor(
              t as Parameters<typeof getTypeColor>[0]
            ),
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// =============================================================================
// DefenderStatRow
// =============================================================================

interface DefenderStatRowProps {
  statKey: DefenderStatKey;
  base: number;
  ev: number;
  boost: number;
  /** When true, renders a 0-32 SP input instead of the EV slider. */
  isStatPoints?: boolean;
  /** Nature string, used to calculate SP-based stat total. */
  nature?: string;
  onEvChange: (v: number) => void;
  onBoostChange: (v: number) => void;
}

function DefenderStatRow({
  statKey,
  base,
  ev,
  boost,
  isStatPoints = false,
  nature = "Hardy",
  onEvChange,
  onBoostChange,
}: DefenderStatRowProps) {
  const label = STAT_LABELS_SHORT[statKey]!;
  const sliderColors: Record<string, string> = {
    hp: "#ef4444",
    atk: "#f97316",
    def: "#eab308",
    spa: "#3b82f6",
    spd: "#22c55e",
    spe: "#ec4899",
  };
  const sliderColor = sliderColors[statKey] ?? "#6b7280";
  const fillPct = (ev / 252) * 100;

  // Champions SP stat total
  function getSpTotal(): number {
    if (statKey === "hp") return calculateChampionsHP(base, ev);
    // Map short keys to full stat key names for getNatureMultiplier
    const statKeyMap: Record<
      string,
      keyof Omit<
        {
          hp: number;
          attack: number;
          defense: number;
          specialAttack: number;
          specialDefense: number;
          speed: number;
        },
        "hp"
      >
    > = {
      atk: "attack",
      def: "defense",
      spa: "specialAttack",
      spd: "specialDefense",
      spe: "speed",
    };
    const fullKey = statKeyMap[statKey];
    const mult = fullKey ? getNatureMultiplier(nature, fullKey) : 1.0;
    return calculateChampionsStat(base, ev, mult);
  }

  // EV-based stat total (non-HP, approximate at level 50)
  const evTotal = Math.floor(
    ((2 * base + 31 + Math.floor(ev / 4)) * 50) / 100 + 5
  );

  if (isStatPoints) {
    // SP mode: compact number input + stat total + boost, no slider
    return (
      <div className="grid grid-cols-[32px_28px_60px_48px_48px] items-center gap-1 text-xs">
        {/* Label */}
        <span className="text-muted-foreground font-semibold">{label}</span>

        {/* Base */}
        <span className="text-right tabular-nums">{base}</span>

        {/* SP input 0-32 */}
        <input
          type="number"
          min={0}
          max={32}
          value={ev}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onEvChange(Math.max(0, Math.min(32, v)));
          }}
          className="border-border bg-background rounded border px-1 py-0.5 text-center text-xs tabular-nums focus:ring-1 focus:ring-teal-500 focus:outline-none"
          aria-label={`${label} Stat Points`}
        />

        {/* Calculated stat total */}
        <span className="text-muted-foreground text-center tabular-nums">
          {getSpTotal()}
        </span>

        {/* Boost */}
        <select
          value={boost}
          onChange={(e) => onBoostChange(Number(e.target.value))}
          className={cn(
            "border-border bg-background rounded border px-0.5 py-0.5 text-center text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none",
            boost > 0 && "text-green-700",
            boost < 0 && "text-red-700"
          )}
        >
          {BOOST_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b > 0 ? `+${b}` : b}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[32px_28px_1fr_48px_48px_48px] items-center gap-1 text-xs">
      {/* Label */}
      <span className="text-muted-foreground font-semibold">{label}</span>

      {/* Base */}
      <span className="text-right tabular-nums">{base}</span>

      {/* EV slider */}
      <div className="relative flex h-5 items-center">
        <input
          type="range"
          min={0}
          max={252}
          step={4}
          value={ev}
          onChange={(e) => onEvChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${fillPct}%, #f1f5f9 ${fillPct}%, #f1f5f9 100%)`,
          }}
          className="h-[6px] w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm"
          title={`EVs: ${ev}`}
        />
      </div>

      {/* EVs input */}
      <input
        type="number"
        min={0}
        max={252}
        value={ev}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onEvChange(Math.max(0, Math.min(252, v)));
        }}
        className="border-border bg-background rounded border px-1 py-0.5 text-center text-xs tabular-nums focus:ring-1 focus:ring-teal-500 focus:outline-none"
      />

      {/* Calculated total — approximate for display */}
      <span className="text-muted-foreground text-center tabular-nums">
        {evTotal}
      </span>

      {/* Boost */}
      <select
        value={boost}
        onChange={(e) => onBoostChange(Number(e.target.value))}
        className={cn(
          "border-border bg-background rounded border px-0.5 py-0.5 text-center text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none",
          boost > 0 && "text-green-700",
          boost < 0 && "text-red-700"
        )}
      >
        {BOOST_OPTIONS.map((b) => (
          <option key={b} value={b}>
            {b > 0 ? `+${b}` : b}
          </option>
        ))}
      </select>
    </div>
  );
}

// =============================================================================
// DefenderPanel
// =============================================================================

interface DefenderPanelProps {
  species: string;
  types: string[];
  ability: string;
  item: string;
  nature: string;
  teraType: string;
  evs: DefenderEvs;
  boosts: DefenderBoosts;
  status: string;
  hpPercent: number;
  formatId: string | undefined;
  /** When true, shows SP inputs (0-32) instead of EV sliders for the defender. */
  isStatPoints?: boolean;
  onSpeciesChange: (species: string) => void;
  onAbilityChange: (v: string) => void;
  onItemChange: (v: string) => void;
  onNatureChange: (v: string) => void;
  onTeraChange: (v: string) => void;
  onEvChange: (stat: DefenderStatKey, v: number) => void;
  onBoostChange: (stat: keyof DefenderBoosts, v: number) => void;
  onStatusChange: (v: string) => void;
  onHpPercentChange: (v: number) => void;
}

function DefenderPanel({
  species,
  types,
  ability,
  item,
  nature,
  teraType,
  evs,
  boosts,
  status,
  hpPercent,
  formatId,
  isStatPoints = false,
  onSpeciesChange,
  onAbilityChange,
  onItemChange,
  onNatureChange,
  onTeraChange,
  onEvChange,
  onBoostChange,
  onStatusChange,
  onHpPercentChange,
}: DefenderPanelProps) {
  const validAbilities = getValidAbilities(species);
  const validNatures = getValidNatures();
  const itemListId = useId();

  return (
    <Card>
      <SectionHeader>Defender</SectionHeader>

      {/* Species inline search — clickable name that opens a search input */}
      <InlineSpeciesSearch
        species={species}
        types={types}
        formatId={formatId}
        onChange={onSpeciesChange}
      />

      {/* Ability / Item / Nature / Tera in 2×2 grid */}
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        {/* Ability */}
        <div className="flex flex-col gap-0.5">
          <label className="text-muted-foreground text-[10px]">Ability</label>
          <select
            value={ability}
            onChange={(e) => onAbilityChange(e.target.value)}
            className="border-border bg-background rounded border px-1 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">—</option>
            {validAbilities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Item — text input with datalist for autocomplete */}
        <div className="flex flex-col gap-0.5">
          <label className="text-muted-foreground text-[10px]">Item</label>
          <input
            type="text"
            list={itemListId}
            value={item}
            onChange={(e) => onItemChange(e.target.value)}
            placeholder="e.g. Sitrus Berry"
            className="border-border bg-background rounded border px-1 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
          <datalist id={itemListId}>
            {ALL_ITEMS.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </div>

        {/* Nature */}
        <div className="flex flex-col gap-0.5">
          <label className="text-muted-foreground text-[10px]">Nature</label>
          <select
            value={nature}
            onChange={(e) => onNatureChange(e.target.value)}
            className="border-border bg-background rounded border px-1 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            {validNatures.map((n) => {
              const effectLabel = getNatureLabel(n);
              return (
                <option key={n} value={n}>
                  {effectLabel ? `${n} ${effectLabel}` : n}
                </option>
              );
            })}
          </select>
        </div>

        {/* Tera */}
        <div className="flex flex-col gap-0.5">
          <label className="text-muted-foreground text-[10px]">Tera</label>
          <select
            value={teraType}
            onChange={(e) => onTeraChange(e.target.value)}
            className="border-border bg-background rounded border px-1 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">None</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats — grid rows: Label | Base | Slider/SP | EVs/SP | Total | ± */}
      <div className="mb-2">
        {/* Header — column labels differ between EV and SP modes */}
        {isStatPoints ? (
          <div className="text-muted-foreground mb-1 grid grid-cols-[32px_28px_60px_48px_48px] items-center gap-1 text-[10px]">
            <span></span>
            <span className="text-right">Base</span>
            <span className="text-center">SP</span>
            <span className="text-center">Stat</span>
            <span className="text-center">±</span>
          </div>
        ) : (
          <div className="text-muted-foreground mb-1 grid grid-cols-[32px_28px_1fr_48px_48px_48px] items-center gap-1 text-[10px]">
            <span></span>
            <span className="text-right">Base</span>
            <span></span>
            <span className="text-center">EVs</span>
            <span className="text-center">Stat</span>
            <span className="text-center">±</span>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {DEFENDER_STAT_KEYS.map((stat) => {
            const base =
              getBaseStats(species)?.[
                stat === "hp"
                  ? "hp"
                  : stat === "atk"
                    ? "attack"
                    : stat === "def"
                      ? "defense"
                      : stat === "spa"
                        ? "specialAttack"
                        : stat === "spd"
                          ? "specialDefense"
                          : "speed"
              ] ?? 0;
            return (
              <DefenderStatRow
                key={stat}
                statKey={stat}
                base={base}
                ev={evs[stat]}
                boost={stat === "hp" ? 0 : boosts[stat as keyof DefenderBoosts]}
                isStatPoints={isStatPoints}
                nature={nature}
                onEvChange={(v) => onEvChange(stat, v)}
                onBoostChange={(v) =>
                  stat !== "hp" &&
                  onBoostChange(stat as keyof DefenderBoosts, v)
                }
              />
            );
          })}
        </div>
      </div>

      {/* Status + HP */}
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="border-border bg-background flex-1 rounded border px-1 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="flex flex-1 items-center gap-1">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={hpPercent}
            onChange={(e) => onHpPercentChange(Number(e.target.value))}
            style={{
              accentColor:
                hpPercent > 50
                  ? "#22c55e"
                  : hpPercent > 25
                    ? "#f59e0b"
                    : "#ef4444",
              background: `linear-gradient(to right, ${hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#f59e0b" : "#ef4444"} 0%, ${hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#f59e0b" : "#ef4444"} ${hpPercent}%, #f1f5f9 ${hpPercent}%, #f1f5f9 100%)`,
            }}
            className="h-[7px] flex-1 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-current [&::-webkit-slider-thumb]:shadow-sm"
            title={`HP: ${hpPercent}%`}
          />
          <input
            type="number"
            min={1}
            max={100}
            value={hpPercent}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) onHpPercentChange(Math.max(1, Math.min(100, v)));
            }}
            className="border-border bg-background w-12 rounded border px-1 py-0.5 text-right text-xs tabular-nums focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
          <span className="text-muted-foreground text-xs">%</span>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// SideConditions — chip-style toggle buttons
// =============================================================================

interface ConditionChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

function ConditionChip({ label, active, onToggle }: ConditionChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "cursor-pointer rounded border px-2 py-1 text-xs transition-colors",
        active
          ? "border-teal-500 bg-teal-50 text-teal-700"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
      )}
    >
      {label}
    </button>
  );
}

// =============================================================================
// FieldConditions
// =============================================================================

interface FieldConditionsProps {
  gameType: "Doubles" | "Singles";
  weather: string;
  terrain: string;
  gravity: boolean;
  attackerSide: AttackerSideState;
  defenderSide: DefenderSideState;
  onGameTypeChange: (v: "Doubles" | "Singles") => void;
  onWeatherChange: (v: string) => void;
  onTerrainChange: (v: string) => void;
  onGravityChange: (v: boolean) => void;
  onAttackerSideChange: (patch: Partial<AttackerSideState>) => void;
  onDefenderSideChange: (patch: Partial<DefenderSideState>) => void;
}

function FieldConditions({
  gameType,
  weather,
  terrain,
  gravity,
  attackerSide,
  defenderSide,
  onGameTypeChange,
  onWeatherChange,
  onTerrainChange,
  onGravityChange,
  onAttackerSideChange,
  onDefenderSideChange,
}: FieldConditionsProps) {
  return (
    <Card>
      <SectionHeader>Field Conditions</SectionHeader>
      <div className="flex flex-col gap-3">
        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-14 shrink-0 text-xs">
            Mode
          </span>
          <div className="flex gap-1">
            {(["Doubles", "Singles"] as const).map((gt) => (
              <button
                key={gt}
                type="button"
                onClick={() => onGameTypeChange(gt)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  gameType === gt
                    ? "bg-teal-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {gt}
              </button>
            ))}
          </div>
        </div>

        {/* Weather */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-14 shrink-0 text-xs">
            Weather
          </span>
          <div className="flex flex-wrap gap-1">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onWeatherChange(weather === w ? "" : w)}
                className={cn(
                  "rounded px-2 py-1 text-xs transition-colors",
                  weather === w
                    ? "bg-teal-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {WEATHER_LABELS[w]}
              </button>
            ))}
          </div>
        </div>

        {/* Terrain */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-14 shrink-0 text-xs">
            Terrain
          </span>
          <div className="flex flex-wrap gap-1">
            {TERRAIN_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTerrainChange(terrain === t ? "" : t)}
                className={cn(
                  "rounded px-2 py-1 text-xs transition-colors",
                  terrain === t
                    ? "bg-teal-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {TERRAIN_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Gravity */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-14 shrink-0 text-xs">
            Global
          </span>
          <ConditionChip
            label="Gravity"
            active={gravity}
            onToggle={() => onGravityChange(!gravity)}
          />
        </div>

        {/* Per-side conditions — chip toggles in bordered cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Your side */}
          <div className="rounded-md border p-2">
            <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase">
              Your Side
            </p>
            <div className="flex flex-wrap gap-1">
              <ConditionChip
                label="Reflect"
                active={attackerSide.reflect}
                onToggle={() =>
                  onAttackerSideChange({ reflect: !attackerSide.reflect })
                }
              />
              <ConditionChip
                label="L.Screen"
                active={attackerSide.lightScreen}
                onToggle={() =>
                  onAttackerSideChange({
                    lightScreen: !attackerSide.lightScreen,
                  })
                }
              />
              <ConditionChip
                label="A.Veil"
                active={attackerSide.auroraVeil}
                onToggle={() =>
                  onAttackerSideChange({
                    auroraVeil: !attackerSide.auroraVeil,
                  })
                }
              />
              <ConditionChip
                label="Tailwind"
                active={attackerSide.tailwind}
                onToggle={() =>
                  onAttackerSideChange({ tailwind: !attackerSide.tailwind })
                }
              />
              <ConditionChip
                label="H.Hand"
                active={attackerSide.helpingHand}
                onToggle={() =>
                  onAttackerSideChange({
                    helpingHand: !attackerSide.helpingHand,
                  })
                }
              />
              <ConditionChip
                label="F.Guard"
                active={attackerSide.friendGuard}
                onToggle={() =>
                  onAttackerSideChange({
                    friendGuard: !attackerSide.friendGuard,
                  })
                }
              />
            </div>
          </div>

          {/* Their side */}
          <div className="rounded-md border p-2">
            <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold uppercase">
              Their Side
            </p>
            <div className="flex flex-wrap gap-1">
              <ConditionChip
                label="Reflect"
                active={defenderSide.reflect}
                onToggle={() =>
                  onDefenderSideChange({ reflect: !defenderSide.reflect })
                }
              />
              <ConditionChip
                label="L.Screen"
                active={defenderSide.lightScreen}
                onToggle={() =>
                  onDefenderSideChange({
                    lightScreen: !defenderSide.lightScreen,
                  })
                }
              />
              <ConditionChip
                label="A.Veil"
                active={defenderSide.auroraVeil}
                onToggle={() =>
                  onDefenderSideChange({
                    auroraVeil: !defenderSide.auroraVeil,
                  })
                }
              />
              <ConditionChip
                label="Tailwind"
                active={defenderSide.tailwind}
                onToggle={() =>
                  onDefenderSideChange({ tailwind: !defenderSide.tailwind })
                }
              />
              <ConditionChip
                label="H.Hand"
                active={defenderSide.helpingHand}
                onToggle={() =>
                  onDefenderSideChange({
                    helpingHand: !defenderSide.helpingHand,
                  })
                }
              />
              <ConditionChip
                label="F.Guard"
                active={defenderSide.friendGuard}
                onToggle={() =>
                  onDefenderSideChange({
                    friendGuard: !defenderSide.friendGuard,
                  })
                }
              />
              <ConditionChip
                label="S.Rock"
                active={defenderSide.stealthRock}
                onToggle={() =>
                  onDefenderSideChange({
                    stealthRock: !defenderSide.stealthRock,
                  })
                }
              />
              <ConditionChip
                label="Salt Cure"
                active={defenderSide.saltCure}
                onToggle={() =>
                  onDefenderSideChange({ saltCure: !defenderSide.saltCure })
                }
              />
              {/* Spikes — small select inline with chips */}
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "rounded border px-2 py-1 text-xs",
                    defenderSide.spikes > 0
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 bg-white text-gray-500"
                  )}
                >
                  Spikes
                </span>
                <select
                  value={defenderSide.spikes}
                  onChange={(e) =>
                    onDefenderSideChange({ spikes: Number(e.target.value) })
                  }
                  className="border-border bg-background w-10 rounded border px-0.5 py-0.5 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  {[0, 1, 2, 3].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// ResultPanel (sticky bottom)
// =============================================================================

interface ResultPanelProps {
  attackerName: string;
  defenderName: string;
  moveName: string | null;
  direction: "offense" | "defense";
  output: CalcOutput | null;
}

function ResultPanel({
  attackerName,
  defenderName,
  moveName,
  direction,
  output,
}: ResultPanelProps) {
  if (!moveName) {
    return (
      <div className="border-t bg-white px-3 py-3">
        <p className="text-muted-foreground text-xs">No move selected.</p>
      </div>
    );
  }

  const effectiveAttacker =
    direction === "offense" ? attackerName : defenderName;
  const effectiveDefender =
    direction === "offense" ? defenderName : attackerName;
  const verdict = output
    ? getVerdict(output.minPercent, output.maxPercent)
    : null;

  return (
    <div className="border-t bg-white px-3 py-3">
      {/* Move → Target header */}
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-semibold">{moveName}</span>
        <span className="text-muted-foreground text-xs">→</span>
        <span className="text-xs font-semibold">{effectiveDefender}</span>
        {verdict && <VerdictBadge verdict={verdict} />}
      </div>

      {output ? (
        <>
          {/* Damage bar */}
          <div className="mb-1.5">
            <div className="bg-muted relative h-[7px] overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  output.maxPercent >= 100
                    ? "bg-red-500"
                    : output.maxPercent >= 50
                      ? "bg-orange-500"
                      : output.maxPercent >= 25
                        ? "bg-amber-500"
                        : "bg-green-500"
                )}
                style={{ width: `${Math.min(100, output.maxPercent)}%` }}
              />
            </div>
          </div>

          {/* Range */}
          <p className="mb-1 text-xs font-semibold tabular-nums">
            {output.minPercent}% – {output.maxPercent}%
          </p>

          {/* Desc text */}
          <p className="text-muted-foreground mb-1 text-[10px] leading-snug">
            {output.desc}
          </p>

          {/* Damage rolls */}
          {output.rolls.length > 0 && (
            <p className="text-muted-foreground text-[10px] tabular-nums">
              Rolls:{" "}
              {output.rolls
                .map(
                  (r) =>
                    `${Math.floor((r / output.defenderMaxHP) * 1000) / 10}%`
                )
                .join(", ")}
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-xs">
          {effectiveAttacker} using {moveName} vs {effectiveDefender} — no
          damage dealt.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// DamageCalcTab — main component
// =============================================================================

/**
 * Traditional damage calculator tab in the team builder.
 *
 * The selected Pokemon's actual set is the attacker. The defender is fully
 * configurable in the right panel. Live calculations update as any input changes.
 */
export function DamageCalcTab({
  team: _team,
  selectedPokemon,
  format,
}: DamageCalcTabProps) {
  // --- Direction ---
  const [direction, setDirection] = useState<"offense" | "defense">("offense");

  // --- Selected move (0-3) ---
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(0);

  // --- Crit per move ---
  const [critMoves, setCritMoves] = useState([false, false, false, false]);

  // --- Attacker modifiers (calc-only) ---
  const [attackerStatus, setAttackerStatus] = useState("Healthy");
  const [attackerBoosts, setAttackerBoosts] = useState<AttackerBoosts>({
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  });

  // --- Defender ---
  const [defenderSpecies, setDefenderSpecies] = useState("Incineroar");
  const [defenderAbility, setDefenderAbility] = useState("Intimidate");
  const [defenderItem, setDefenderItem] = useState("Sitrus Berry");
  const [defenderNature, setDefenderNature] = useState("Careful");
  const [defenderTera, setDefenderTera] = useState("");
  const [defenderEvs, setDefenderEvs] = useState<DefenderEvs>({
    hp: 252,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 4,
    spe: 0,
  });
  const [defenderBoosts, setDefenderBoosts] = useState<DefenderBoosts>({
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  });
  const [defenderStatus, setDefenderStatus] = useState("Healthy");
  const [defenderHpPercent, setDefenderHpPercent] = useState(100);

  // --- Field ---
  const [gameType, setGameType] = useState<"Doubles" | "Singles">("Doubles");
  const [weather, setWeather] = useState("");
  const [terrain, setTerrain] = useState("");
  const [gravity, setGravity] = useState(false);
  const [attackerSide, setAttackerSide] = useState<AttackerSideState>({
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
  });
  const [defenderSide, setDefenderSide] = useState<DefenderSideState>({
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    stealthRock: false,
    spikes: 0,
    saltCure: false,
  });

  // Champions format uses Stat Points (SP) instead of EVs/IVs.
  // Detect by generation === 10 to cover all Champions regulation variants.
  const isStatPoints = format?.generation === 10;

  // --- Derived: defender types (computed at render time — no effect needed) ---
  // species.get() requires the ID brand, so we cast with asSmogon.
  function getDefenderTypes(species: string): string[] {
    try {
      const sp = gen9.species.get(asSmogon(species.toLowerCase()));
      return sp ? (sp.types as string[]) : [];
    } catch {
      return [];
    }
  }
  const defenderTypes = getDefenderTypes(defenderSpecies);

  // --- Auto-populate defender on species change ---
  function handleDefenderSpeciesChange(newSpecies: string) {
    setDefenderSpecies(newSpecies);
    const abilities = getValidAbilities(newSpecies);
    setDefenderAbility(abilities[0] ?? "");
    setDefenderItem("");
    setDefenderNature("Hardy");
    setDefenderTera("");
    setDefenderEvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    setDefenderBoosts({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    setDefenderStatus("Healthy");
    setDefenderHpPercent(100);
  }

  // --- Compute per-move calcs ---
  const moves = [
    selectedPokemon?.move1 ?? null,
    selectedPokemon?.move2 ?? null,
    selectedPokemon?.move3 ?? null,
    selectedPokemon?.move4 ?? null,
  ];

  const attackerName = selectedPokemon?.species ?? "—";
  const defenderName = defenderSpecies || "—";

  function getCalcOutputForMove(
    moveIdx: number,
    overrideDirection?: "offense" | "defense"
  ): CalcOutput | null {
    if (!selectedPokemon) return null;
    const moveName = moves[moveIdx];
    if (!moveName) return null;

    const isCrit = critMoves[moveIdx] ?? false;
    const dir = overrideDirection ?? direction;

    const field = buildField(
      gameType,
      weather,
      terrain,
      gravity,
      attackerSide,
      defenderSide,
      dir
    );

    if (dir === "offense") {
      const attacker = buildAttackerFromDb(
        selectedPokemon,
        attackerBoosts,
        attackerStatus
      );
      const defender = buildDefenderPokemon(
        defenderSpecies,
        defenderAbility,
        defenderItem,
        defenderNature,
        defenderTera,
        defenderEvs,
        defenderBoosts,
        defenderStatus,
        defenderHpPercent
      );
      if (!attacker || !defender) return null;
      return runCalc(attacker, defender, moveName, isCrit, field);
    } else {
      // "defense": the defender's Pokémon uses the move against us
      // We build the defender as attacker, and we are the defender
      const defenderAsAttacker = buildDefenderPokemon(
        defenderSpecies,
        defenderAbility,
        defenderItem,
        defenderNature,
        defenderTera,
        defenderEvs,
        defenderBoosts,
        defenderStatus,
        100
      );
      const ourPokemon = buildAttackerFromDb(
        selectedPokemon,
        { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        "Healthy"
      );
      if (!defenderAsAttacker || !ourPokemon) return null;
      return runCalc(defenderAsAttacker, ourPokemon, moveName, isCrit, field);
    }
  }

  // Compute calcs for all moves (live as state changes)
  const moveCalcOutputs = moves.map((_, idx) => getCalcOutputForMove(idx));

  // Selected move output
  const selectedMoveOutput = moveCalcOutputs[selectedMoveIdx] ?? null;
  const selectedMoveName = moves[selectedMoveIdx] ?? null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // When no Pokemon is selected, the attacker-dependent sections are dimmed
  // and non-interactive. Defender + field conditions remain editable.
  const hasAttacker = Boolean(selectedPokemon?.species);

  return (
    <div className="flex flex-col gap-3 pb-32">
      {/* Direction toggle — only rendered when an attacker is present */}
      {hasAttacker && (
        <DirectionToggle
          value={direction}
          attackerName={attackerName}
          defenderName={defenderName}
          onChange={setDirection}
        />
      )}

      {/* Move selector — dimmed and non-interactive without an attacker */}
      <div className={cn(!hasAttacker && "pointer-events-none opacity-50")}>
        <Card>
          <SectionHeader>Moves</SectionHeader>
          <div className="flex flex-col gap-0.5">
            {moves.map((moveName, idx) => (
              <MoveSelectorRow
                key={idx}
                moveName={moveName}
                moveIdx={idx}
                isSelected={selectedMoveIdx === idx}
                isCrit={critMoves[idx] ?? false}
                calcOutput={moveCalcOutputs[idx] ?? null}
                onSelect={() => setSelectedMoveIdx(idx)}
                onCritToggle={() => {
                  const next = [...critMoves];
                  next[idx] = !next[idx];
                  setCritMoves(next);
                }}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Attacker modifiers — dimmed and non-interactive without an attacker */}
      <div className={cn(!hasAttacker && "pointer-events-none opacity-50")}>
        <AttackerModifiers
          status={attackerStatus}
          boosts={attackerBoosts}
          onStatusChange={setAttackerStatus}
          onBoostChange={(stat, v) =>
            setAttackerBoosts((prev) => ({ ...prev, [stat]: v }))
          }
        />
      </div>

      {/* Defender */}
      <DefenderPanel
        species={defenderSpecies}
        types={defenderTypes}
        ability={defenderAbility}
        item={defenderItem}
        nature={defenderNature}
        teraType={defenderTera}
        evs={defenderEvs}
        boosts={defenderBoosts}
        status={defenderStatus}
        hpPercent={defenderHpPercent}
        formatId={format?.id}
        isStatPoints={isStatPoints}
        onSpeciesChange={handleDefenderSpeciesChange}
        onAbilityChange={setDefenderAbility}
        onItemChange={setDefenderItem}
        onNatureChange={setDefenderNature}
        onTeraChange={setDefenderTera}
        onEvChange={(stat, v) =>
          setDefenderEvs((prev) => {
            if (isStatPoints) {
              // SP mode: each stat is independent, capped at 0-32
              return { ...prev, [stat]: Math.max(0, Math.min(32, v)) };
            }
            // Classic EV mode: total capped at 510, each stat at 252
            const MAX_TOTAL = 510;
            const otherTotal = Object.entries(prev)
              .filter(([k]) => k !== stat)
              .reduce((sum, [, val]) => sum + val, 0);
            const capped = Math.min(v, MAX_TOTAL - otherTotal, 252);
            return { ...prev, [stat]: Math.max(0, capped) };
          })
        }
        onBoostChange={(stat, v) =>
          setDefenderBoosts((prev) => ({ ...prev, [stat]: v }))
        }
        onStatusChange={setDefenderStatus}
        onHpPercentChange={setDefenderHpPercent}
      />

      {/* Field conditions */}
      <FieldConditions
        gameType={gameType}
        weather={weather}
        terrain={terrain}
        gravity={gravity}
        attackerSide={attackerSide}
        defenderSide={defenderSide}
        onGameTypeChange={setGameType}
        onWeatherChange={setWeather}
        onTerrainChange={setTerrain}
        onGravityChange={setGravity}
        onAttackerSideChange={(patch) =>
          setAttackerSide((prev) => ({ ...prev, ...patch }))
        }
        onDefenderSideChange={(patch) =>
          setDefenderSide((prev) => ({ ...prev, ...patch }))
        }
      />

      {/* Sticky result */}
      <div className="fixed right-0 bottom-0 left-0 z-10 shadow-lg md:static md:shadow-none">
        {hasAttacker ? (
          <ResultPanel
            attackerName={attackerName}
            defenderName={defenderName}
            moveName={selectedMoveName}
            direction={direction}
            output={selectedMoveOutput}
          />
        ) : (
          <div className="border-t bg-white px-3 py-3">
            <p className="text-muted-foreground text-xs">
              Pick an attacker to calculate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
