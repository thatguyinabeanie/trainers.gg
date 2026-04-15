"use client";

import {
  getLearnableMoves,
  getMoveType,
  getMoveCategory,
  getMoveBP,
  isLegalSpecies,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { COMPETITIVE_MOVES } from "./competitive-moves";
import { TeamFitAnalysis } from "./team-fit-analysis";
import { TYPE_PILL_COLORS } from "./type-colors";

import { CATEGORY_COLORS, CATEGORY_LABELS } from "./move-category-ui";

// =============================================================================
// Types
// =============================================================================

interface SpeciesDetailProps {
  species: SpeciesSearchEntry | null;
  currentTeam: Array<{ species: string }>;
  /** Active format ID. When set, illegal species disable the Select buttons. */
  formatId?: string;
  onSelect: (species: string, mode: "defaults" | "blank") => void;
}

// =============================================================================
// SpeciesDetail
// =============================================================================

/**
 * Detail panel for the species picker showing type info, competitive moves,
 * team fit analysis, and action buttons to add the pokemon.
 */
export function SpeciesDetail({
  species,
  currentTeam,
  formatId,
  onSelect,
}: SpeciesDetailProps) {
  if (!species) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Select a species from the table to see details
        </p>
      </div>
    );
  }

  // Determine legality — false only when a format is specified and the species is banned
  const legal = formatId ? isLegalSpecies(species.species, formatId) : true;

  // Filter learnable moves down to competitive ones, cap at 10
  const allLearnable = new Set(getLearnableMoves(species.species));
  const competitiveMoves = [...COMPETITIVE_MOVES]
    .filter((move) => allLearnable.has(move))
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Species name + types */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-xl font-bold">{species.species}</h3>
        <div className="flex flex-wrap gap-1">
          {species.types.map((type) => (
            <span
              key={type}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium",
                TYPE_PILL_COLORS[type as keyof typeof TYPE_PILL_COLORS] ??
                  "bg-muted text-foreground"
              )}
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Base stats summary */}
      <div className="grid grid-cols-3 gap-1 text-xs">
        {(
          [
            ["HP", species.baseStats.hp],
            ["Atk", species.baseStats.atk],
            ["Def", species.baseStats.def],
            ["SpA", species.baseStats.spa],
            ["SpD", species.baseStats.spd],
            ["Spe", species.baseStats.spe],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-1">
            <span className="text-muted-foreground w-6 shrink-0">{label}</span>
            <span
              className={cn(
                "font-medium tabular-nums",
                value >= 120 && "text-emerald-500",
                value < 70 && "text-muted-foreground"
              )}
            >
              {value}
            </span>
          </div>
        ))}
        <div className="col-span-3 mt-0.5 flex items-center justify-between border-t pt-0.5">
          <span className="text-muted-foreground">BST</span>
          <span className="font-bold">{species.bst}</span>
        </div>
      </div>

      {/* Abilities */}
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
          Abilities
        </p>
        <div className="flex flex-wrap gap-1">
          {species.abilities.map((ability) => (
            <span
              key={ability}
              className="bg-muted rounded px-2 py-0.5 text-xs"
            >
              {ability}
            </span>
          ))}
        </div>
      </div>

      {/* Key competitive moves */}
      {competitiveMoves.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            Key Moves
          </p>
          <div className="flex flex-col gap-0.5">
            {competitiveMoves.map((moveName) => {
              const moveType = getMoveType(moveName);
              const category = getMoveCategory(moveName);
              const bp = getMoveBP(moveName);
              const typeColor = moveType
                ? (TYPE_PILL_COLORS[
                    moveType as keyof typeof TYPE_PILL_COLORS
                  ] ?? "bg-muted text-foreground")
                : "bg-muted text-foreground";
              const catLabel = category
                ? (CATEGORY_LABELS[category] ?? category)
                : "—";
              const catColor = category
                ? (CATEGORY_COLORS[category] ?? "text-muted-foreground")
                : "text-muted-foreground";

              return (
                <div
                  key={moveName}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {moveName}
                  </span>
                  {moveType && (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-0.5 text-[10px] leading-none font-medium",
                        typeColor
                      )}
                    >
                      {moveType}
                    </span>
                  )}
                  <span className={cn("shrink-0 font-bold", catColor)}>
                    {catLabel}
                  </span>
                  <span className="text-muted-foreground w-6 shrink-0 text-right tabular-nums">
                    {bp ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team fit analysis */}
      {currentTeam.length > 0 && (
        <TeamFitAnalysis
          currentTeam={currentTeam}
          candidateSpecies={species.species}
        />
      )}

      {/* VGC pastes stub */}
      <div className="bg-muted/50 rounded p-3 text-center">
        <p className="text-muted-foreground text-xs">
          Proven sets will appear here when data is available
        </p>
      </div>

      {/* Action buttons */}
      {!legal && (
        <p className="text-muted-foreground mb-2 text-xs">
          Not legal in this format.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          size="sm"
          disabled={!legal}
          onClick={() => onSelect(species.species, "defaults")}
        >
          Select with defaults
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          size="sm"
          disabled={!legal}
          onClick={() => onSelect(species.species, "blank")}
        >
          Select blank
        </Button>
      </div>
    </div>
  );
}
