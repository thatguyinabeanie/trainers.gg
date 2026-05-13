"use client";

import Image from "next/image";

import { type SpeciesSearchEntry } from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { TypeSymbolIcon } from "../type-symbol-icon";
import { STAT_HEADER_COLORS } from "./stat-header-colors";

interface SpeciesMobileRowProps {
  entry: SpeciesSearchEntry;
  onPick: (species: string) => void;
  isSelected?: boolean;
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
}: SpeciesMobileRowProps) {
  const abilities = [
    entry.abilitySlot1,
    entry.abilitySlot2,
    entry.hiddenAbility,
  ].filter((a): a is string => Boolean(a));

  const sprite = getPokemonSprite(entry.species);

  return (
    <button
      type="button"
      onClick={() => onPick(entry.species)}
      aria-label={entry.species}
      className={cn(
        "flex w-full items-start gap-2.5 border-b border-border px-3 py-2 text-left transition-colors",
        "active:bg-muted/50 hover:bg-muted/30",
        isSelected && "bg-primary/5"
      )}
    >
      <span className="bg-primary/5 border-primary/30 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border">
        <Image
          src={sprite.url}
          alt=""
          width={40}
          height={40}
          className={cn(
            "size-9 object-contain",
            sprite.pixelated && "[image-rendering:pixelated]"
          )}
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Line 1 — name + types */}
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {entry.species}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {entry.types.map((type) => (
              <TypeSymbolIcon
                key={type}
                type={type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
                className="size-[18px]"
              />
            ))}
          </span>
        </span>

        {/* Line 2 — ability chips */}
        {abilities.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {abilities.map((ability) => (
              <span
                key={ability}
                className="bg-primary/5 border-primary/30 text-primary rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
              >
                {ability}
              </span>
            ))}
          </span>
        )}

        {/* Line 3 — single-line stats */}
        <span className="flex flex-wrap items-baseline gap-1.5 text-[10px] tabular-nums">
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
  );
}
