"use client";

import { Search } from "lucide-react";

import { calculateTeamSynergy, ALL_TYPES } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { TYPE_PILL_COLORS } from "../../type-colors";

// =============================================================================
// Constants
// =============================================================================

/** All 18 standard types in display order. */
const ALL_TYPE_NAMES = ALL_TYPES as unknown as string[];

/** Quick-pick moves for the move filter. */
const QUICK_PICK_MOVES = [
  "Tailwind",
  "Follow Me",
  "Trick Room",
  "Fake Out",
  "Protect",
  "Spore",
];

/** The six base stats. */
const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

/** Preset role definitions for the Role filter. */
const ROLES: Array<{
  label: string;
  moves?: string[];
  abilities?: string[];
}> = [
  { label: "Tailwind", moves: ["Tailwind"] },
  { label: "Trick Room", moves: ["Trick Room"] },
  { label: "Fake Out", moves: ["Fake Out"] },
  { label: "Intimidate", abilities: ["Intimidate"] },
  { label: "Follow Me/Redirection", moves: ["Follow Me", "Rage Powder"] },
  {
    label: "Speed Control",
    moves: ["Tailwind", "Icy Wind", "Electroweb"],
  },
  {
    label: "Weather Setter",
    abilities: ["Drizzle", "Drought", "Sand Stream", "Snow Warning"],
  },
  {
    label: "Terrain Setter",
    abilities: [
      "Electric Surge",
      "Grassy Surge",
      "Psychic Surge",
      "Misty Surge",
    ],
  },
  {
    label: "Priority",
    moves: [
      "Fake Out",
      "Aqua Jet",
      "Sucker Punch",
      "Extreme Speed",
      "Ice Shard",
      "Mach Punch",
      "Grassy Glide",
    ],
  },
];

// =============================================================================
// Types
// =============================================================================

export interface SpeciesFilterState {
  types: string[];
  abilities: string[];
  moves: string[];
  role: string | null;
  minBaseStat: Partial<
    Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>
  >;
  maxBaseStat: Partial<
    Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>
  >;
}

export const DEFAULT_FILTERS: SpeciesFilterState = {
  types: [],
  abilities: [],
  moves: [],
  role: null,
  minBaseStat: {},
  maxBaseStat: {},
};

interface SpeciesFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  currentTeam: Array<{ species: string }>;
  totalCount: number;
  filteredCount: number;
}

// =============================================================================
// SpeciesFilters
// =============================================================================

/**
 * Filter bar for the species picker: search input, usage tier chips,
 * role/type/move/stats dropdown popovers, and team-need suggestions.
 */
export function SpeciesFilters({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  currentTeam,
  totalCount,
  filteredCount,
}: SpeciesFiltersProps) {
  // Compute team synergy for need suggestions
  const synergy =
    currentTeam.length > 0 ? calculateTeamSynergy(currentTeam) : null;

  // Types the team is weak to 2+ times and also uncovered
  const neededTypes: string[] = synergy
    ? ALL_TYPE_NAMES.filter((type) => {
        const weakCount = synergy.sharedWeaknesses[type as never] ?? 0;
        return weakCount >= 2 && synergy.uncoveredTypes.has(type as never);
      })
    : [];

  // -- Handlers --

  function toggleType(type: string) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  }

  function applyRole(role: (typeof ROLES)[number]) {
    const isActive = filters.role === role.label;
    if (isActive) {
      onFiltersChange({
        ...filters,
        role: null,
        moves: [],
        abilities: [],
      });
    } else {
      onFiltersChange({
        ...filters,
        role: role.label,
        moves: role.moves ?? [],
        abilities: role.abilities ?? [],
      });
    }
  }

  function addMove(move: string) {
    if (filters.moves.includes(move)) return;
    onFiltersChange({ ...filters, moves: [...filters.moves, move] });
  }

  function removeMove(move: string) {
    onFiltersChange({
      ...filters,
      moves: filters.moves.filter((m) => m !== move),
    });
  }

  function setMinStat(stat: (typeof STAT_KEYS)[number], value: string) {
    const parsed = value === "" ? undefined : parseInt(value, 10);
    if (parsed !== undefined && Number.isNaN(parsed)) return;
    onFiltersChange({
      ...filters,
      minBaseStat: { ...filters.minBaseStat, [stat]: parsed },
    });
  }

  function setMaxStat(stat: (typeof STAT_KEYS)[number], value: string) {
    const parsed = value === "" ? undefined : parseInt(value, 10);
    if (parsed !== undefined && Number.isNaN(parsed)) return;
    onFiltersChange({
      ...filters,
      maxBaseStat: { ...filters.maxBaseStat, [stat]: parsed },
    });
  }

  function applyNeededType(type: string) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  }

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.moves.length > 0 ||
    filters.abilities.length > 0 ||
    filters.role !== null ||
    Object.keys(filters.minBaseStat).length > 0 ||
    Object.keys(filters.maxBaseStat).length > 0;

  return (
    <div className="flex flex-col gap-2 border-b px-4 py-3">
      {/* Row 1: Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          placeholder="Search species, abilities, types, moves..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-8 pl-8 text-sm"
          autoFocus
        />
      </div>

      {/* Row 2: Tier chips + filter popovers */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Usage tier chips */}
        <button
          type="button"
          className="bg-primary text-primary-foreground rounded px-2.5 py-1 text-xs font-medium"
        >
          All
        </button>
        {["Top 20", "Rising", "Niche"].map((tier) => (
          <Tooltip key={tier}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  disabled
                  className="text-muted-foreground cursor-not-allowed rounded px-2.5 py-1 text-xs font-medium opacity-50"
                />
              }
            >
              {tier}
            </TooltipTrigger>
            <TooltipContent>Requires meta data</TooltipContent>
          </Tooltip>
        ))}

        <div className="bg-border mx-1 h-4 w-px" />

        {/* Role filter */}
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  filters.role !== null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              />
            }
          >
            Role{filters.role ? `: ${filters.role}` : ""}
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1.5" align="start">
            <div className="flex flex-col gap-0.5">
              {ROLES.map((role) => (
                <button
                  key={role.label}
                  type="button"
                  onClick={() => applyRole(role)}
                  className={cn(
                    "rounded px-2 py-1.5 text-left text-xs transition-colors",
                    filters.role === role.label
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Type filter */}
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  filters.types.length > 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              />
            }
          >
            Type
            {filters.types.length > 0 ? ` (${filters.types.length})` : ""}
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2" align="start">
            <div className="grid grid-cols-3 gap-1">
              {ALL_TYPE_NAMES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium transition-opacity",
                    filters.types.includes(type)
                      ? (TYPE_PILL_COLORS[
                          type as keyof typeof TYPE_PILL_COLORS
                        ] ?? "bg-muted")
                      : "bg-muted text-muted-foreground opacity-60 hover:opacity-100"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Learns Move filter */}
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  filters.moves.length > 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              />
            }
          >
            Learns Move
            {filters.moves.length > 0 ? ` (${filters.moves.length})` : ""}
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2.5" align="start">
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Search moves..."
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      addMove(val);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              {/* Active moves */}
              {filters.moves.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.moves.map((move) => (
                    <Badge
                      key={move}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => removeMove(move)}
                    >
                      {move} ×
                    </Badge>
                  ))}
                </div>
              )}
              {/* Quick picks */}
              <div>
                <p className="text-muted-foreground mb-1 text-xs">Quick pick</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_PICK_MOVES.map((move) => (
                    <button
                      key={move}
                      type="button"
                      onClick={() => addMove(move)}
                      disabled={filters.moves.includes(move)}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs transition-colors",
                        filters.moves.includes(move)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {move}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Stats filter */}
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  Object.keys(filters.minBaseStat).length > 0 ||
                    Object.keys(filters.maxBaseStat).length > 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              />
            }
          >
            Stats
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2.5" align="start">
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1 text-xs">
                <span />
                <span className="text-muted-foreground text-center">Min</span>
                <span className="text-muted-foreground text-center">Max</span>
              </div>
              {STAT_KEYS.map((stat) => (
                <div key={stat} className="grid grid-cols-3 items-center gap-1">
                  <span className="text-xs font-medium">
                    {STAT_LABELS[stat]}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={255}
                    placeholder="—"
                    value={filters.minBaseStat[stat] ?? ""}
                    onChange={(e) => setMinStat(stat, e.target.value)}
                    className="h-6 text-center text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={255}
                    placeholder="—"
                    value={filters.maxBaseStat[stat] ?? ""}
                    onChange={(e) => setMaxStat(stat, e.target.value)}
                    className="h-6 text-center text-xs"
                  />
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onFiltersChange(DEFAULT_FILTERS)}
          >
            Clear
          </Button>
        )}

        {/* Result count — only when actively narrowing */}
        {filteredCount !== totalCount && (
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {filteredCount} of {totalCount}
          </span>
        )}
      </div>

      {/* Row 3: Team need suggestions */}
      {neededTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Team needs:</span>
          {neededTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => applyNeededType(type)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                filters.types.includes(type)
                  ? (TYPE_PILL_COLORS[type as keyof typeof TYPE_PILL_COLORS] ??
                      "bg-muted")
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              ✦ Covers {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
