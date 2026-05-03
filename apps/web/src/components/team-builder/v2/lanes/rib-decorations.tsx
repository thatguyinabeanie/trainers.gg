"use client";

import { getSpeciesTypes, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { TypeSymbolIcon } from "../../type-symbol-icon";
import s from "../builder.module.css";

// =============================================================================
// Types
// =============================================================================

interface RibDecorationsProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

// =============================================================================
// RibDecorations
// =============================================================================

/**
 * Vertical strip of Pokémon type symbols rendered inside the active-row rib.
 *
 * Level editing lives in the identity panel (heroLv popover), not here.
 * Hidden on mobile (≤767px) via `.ribDecorations` CSS class.
 */
export function RibDecorations({
  pokemon,
  format: _format,
  onUpdate: _onUpdate,
}: RibDecorationsProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");

  return (
    <div className={cn(s.ribDecorations, "flex flex-col items-center gap-2")}>
      {/* Wordless round type symbols — translation-friendly (no English text). */}
      {types.map((t) => (
        <TypeSymbolIcon
          key={t}
          type={t as Parameters<typeof TypeSymbolIcon>[0]["type"]}
          size={24}
        />
      ))}
    </div>
  );
}
