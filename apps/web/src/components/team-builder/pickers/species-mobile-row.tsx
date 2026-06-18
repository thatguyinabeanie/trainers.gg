"use client";

import { useState } from "react";

import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  getLegalMoves,
  getMoveData,
  LEGALITY_UNAVAILABLE,
  type MoveData,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { CATEGORY_ICON_URLS } from "../move-category-ui";
import { TypeSymbolIcon } from "../type-symbol-icon";
import {
  sortMoveData,
  type MoveListSortCol,
  type MoveListSortState,
} from "./move-list-shared";
import { STAT_HEADER_COLORS } from "./stat-header-colors";

interface SpeciesMobileRowProps {
  entry: SpeciesSearchEntry;
  onPick: (species: string) => void;
  isSelected?: boolean;
  formatId: string;
  /** Pre-looked-up usage % for this species, or undefined when no data exists. */
  usagePct?: number;
}

const STAT_DEFS = [
  { key: "hp" as const, label: "HP", valueKey: "hp" as const },
  { key: "atk" as const, label: "Atk", valueKey: "atk" as const },
  { key: "def" as const, label: "Def", valueKey: "def" as const },
  { key: "spa" as const, label: "SpA", valueKey: "spa" as const },
  { key: "spd" as const, label: "SpD", valueKey: "spd" as const },
  { key: "spe" as const, label: "Spe", valueKey: "spe" as const },
];

export function SpeciesMobileRow({
  entry,
  onPick,
  isSelected,
  formatId,
  usagePct,
}: SpeciesMobileRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const abilities = [
    entry.abilitySlot1,
    entry.abilitySlot2,
    entry.hiddenAbility,
  ].filter((a): a is string => Boolean(a));

  const sprite = getPokemonSprite(entry.species);

  return (
    <div
      data-testid="species-mobile-row"
      className={cn("border-b border-border", isSelected && "bg-primary/5")}
    >
      <div className="flex items-center">
        {/* Expand/collapse moves — left of sprite */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-label={isExpanded ? "Collapse moves" : "Expand moves"}
          aria-expanded={isExpanded}
          className="flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        {/* Pick button — sprite + content */}
        <button
          type="button"
          onClick={() => onPick(entry.species)}
          aria-label={entry.species}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pr-3 text-left transition-colors active:bg-muted/50 hover:bg-muted/30"
        >
          <span className="bg-primary/5 border-primary/30 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border">
            <Image
              src={sprite.url}
              alt=""
              width={56}
              height={56}
              className={cn(
                "size-12 object-contain",
                sprite.pixelated && "[image-rendering:pixelated]"
              )}
            />
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-1">
            {/* Line 1 — name + types + usage chip */}
            <span className="flex items-center justify-between gap-2">
              <span className="grow min-w-0 truncate text-sm font-semibold text-foreground">
                {entry.species}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {entry.types.map((type) => (
                  <TypeSymbolIcon
                    key={type}
                    type={type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
                    className="size-5"
                  />
                ))}
                {usagePct != null && usagePct > 0 && (
                  <span
                    className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums" // text-[10px]: sub-12px micro-label; no Tailwind scale token
                    data-testid={`usg-mobile-${entry.species}`}
                  >
                    {usagePct.toFixed(1)}%
                  </span>
                )}
              </span>
            </span>

            {/* Line 2 — ability chips */}
            {abilities.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {abilities.map((ability) => (
                  <span
                    key={ability}
                    className="bg-primary/5 border-primary/30 text-primary rounded-md border px-1.5 py-0.5 text-[10px] font-medium" // text-[10px]: sub-12px micro-label; no Tailwind scale token
                  >
                    {ability}
                  </span>
                ))}
              </span>
            )}

            {/* Line 3 — single-line stats */}
            <span className="flex items-baseline gap-1.5 text-[10px] tabular-nums"> {/* text-[10px]: sub-12px stat strip; no Tailwind scale token */}
              {STAT_DEFS.map(({ key, label, valueKey }) => (
                <span key={key} className="inline-flex items-baseline gap-0.5">
                  <span className={cn("font-bold opacity-60", STAT_HEADER_COLORS[key])}>
                    {label}
                  </span>
                  <span className={cn("font-semibold", STAT_HEADER_COLORS[key])}>
                    {entry.baseStats[valueKey]}
                  </span>
                </span>
              ))}
              <span className="inline-flex items-baseline gap-0.5">
                <span className={cn("font-bold opacity-60", STAT_HEADER_COLORS.bst)}>
                  BST
                </span>
                <span className={cn("font-bold", STAT_HEADER_COLORS.bst)}>
                  {entry.bst}
                </span>
              </span>
            </span>
          </span>
        </button>
      </div>

      {/* Expanded moves panel */}
      {isExpanded && (
        <SpeciesMobileMovesPanel
          species={entry.species}
          formatId={formatId}
        />
      )}
    </div>
  );
}

// =============================================================================
// SpeciesMobileMovesPanel
// =============================================================================

interface SpeciesMobileMovesPanelProps {
  species: string;
  formatId: string;
}

function SpeciesMobileMovesPanel({ species, formatId }: SpeciesMobileMovesPanelProps) {
  const [sort, setSort] = useState<MoveListSortState>({ col: "bp", dir: "desc" });

  const legalMovesResult = getLegalMoves(species, formatId);

  if (!legalMovesResult || legalMovesResult === LEGALITY_UNAVAILABLE) {
    return (
      <div className="border-t border-border/50 px-3 py-2">
        <span className="text-[11px] text-muted-foreground"> {/* text-[11px]: sub-12px micro-copy; no Tailwind scale token */}
          Moves unavailable for this format.
        </span>
      </div>
    );
  }

  // Pass formatId so Champions formats show accurate move stats
  const allMoves: MoveData[] = [];
  for (const moveName of legalMovesResult) {
    const data = getMoveData(moveName, formatId);
    if (data) allMoves.push(data);
  }

  const sorted = sortMoveData(allMoves, sort);

  function handleSort(col: MoveListSortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "name" ? "asc" : "desc" }
    );
  }

  const sortArrow = (col: MoveListSortCol) =>
    sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="border-t border-border/50">
      {/* Sort controls */}
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"> {/* text-[10px]: sub-12px micro-label; no Tailwind scale token */}
          Sort:
        </span>
        {(["name", "bp", "acc"] as const).map((col) => (
          <button
            key={col}
            type="button"
            onClick={() => handleSort(col)}
            className={cn(
              // text-[10px]: sub-12px sort label; no Tailwind scale token
              "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
              sort.col === col
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {col === "bp" ? "BP" : col === "acc" ? "ACC" : "Name"}
            {sortArrow(col)}
          </button>
        ))}
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground"> {/* text-[10px]: sub-12px count; no Tailwind scale token */}
          {sorted.length}
        </span>
      </div>

      {/* Move rows */}
      <div className="max-h-64 overflow-y-auto">
        {sorted.map((move) => (
          <MobileMoveRow key={move.name} move={move} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MobileMoveRow
// =============================================================================

function MobileMoveRow({ move }: { move: MoveData }) {
  const categoryUrl = CATEGORY_ICON_URLS[move.category];
  const bp = move.basePower > 0 ? String(move.basePower) : "—";
  const acc =
    move.accuracy === true || !move.accuracy ? "—" : `${move.accuracy}%`;
  const desc =
    move.shortDesc !== "No additional effect." ? move.shortDesc : "";

  return (
    <div className="flex items-start gap-1.5 border-b border-border/30 px-3 py-1.5">
      {/* Type icon */}
      <div className="mt-0.5 shrink-0">
        <TypeSymbolIcon
          type={move.type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
          size={20}
        />
      </div>

      {/* Category icon */}
      <div className="mt-1 shrink-0">
        {categoryUrl ? (
          <Image
            src={categoryUrl}
            alt={move.category}
            width={32}
            height={14}
            unoptimized
            className="h-3.5 w-auto [image-rendering:pixelated]"
          />
        ) : (
          // text-[10px]: sub-12px em-dash fallback; no Tailwind scale token
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </div>

      {/* Name + stats + description */}
      <div className="min-w-0 flex-1">
        {/* Line 1: name + BP */}
        <div className="flex items-baseline justify-between gap-1">
          <span className="truncate text-xs font-medium text-foreground">
            {move.name}
          </span>
          {/* text-[10px]: sub-12px stat values; no Tailwind scale token */}
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
            {bp}
          </span>
        </div>
        {/* Line 2: ACC + description */}
        <div className="flex items-baseline gap-1.5">
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
            {acc}
          </span>
          {desc && (
            <span className="min-w-0 truncate text-[10px] text-muted-foreground">
              {desc}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
