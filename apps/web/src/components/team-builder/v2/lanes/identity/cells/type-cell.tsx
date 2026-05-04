"use client";

import { type PokemonType } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TypePill } from "../../../type-pill";
import { type CellVariant } from "./identity-cell-shared";
import s from "../identity-lane.module.css";
import bs from "../../../builder.module.css";

// =============================================================================
// TypeCell — read-only display of the Pokémon's types in the form section
//
// Unlike other cells this is NOT interactive (types derive from species).
// Renders TypePill icons inline with the same label/value chrome as siblings.
// =============================================================================

interface TypeCellProps {
  types: PokemonType[];
  variant: CellVariant;
}

export function TypeCell({ types, variant }: TypeCellProps) {
  if (variant === "row") {
    return (
      <div className={cn(bs.formRow, "cursor-default hover:bg-transparent")}>
        <span className={bs.formLabel}>Type</span>
        <span className={cn(bs.formValue, "flex items-center gap-1")}>
          {types.length > 0 ? (
            types.map((t) => <TypePill key={t} t={t} size={18} />)
          ) : (
            <span className="text-muted-foreground/25 italic">—</span>
          )}
        </span>
      </div>
    );
  }

  // variant === "grid" — MidStack / Vertical layout
  return (
    <div
      className={cn(s.midFormCell, "cursor-default hover:bg-transparent")}
    >
      <span className={s.midFormLbl}>TYPE</span>
      <span className={cn(s.midFormVal, "flex items-center gap-1")}>
        {types.length > 0 ? (
          types.map((t) => <TypePill key={t} t={t} size={18} />)
        ) : (
          <span className="text-muted-foreground/25 italic">—</span>
        )}
      </span>
    </div>
  );
}
