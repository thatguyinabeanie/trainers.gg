"use client";

import {
  getBaseStats,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

// =============================================================================
// Types
// =============================================================================

interface MetaLaneProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
}

// =============================================================================
// Helpers
// =============================================================================

function computeBst(species: string): number | null {
  const base = getBaseStats(species);
  if (!base) return null;
  return (
    base.hp +
    base.attack +
    base.defense +
    base.specialAttack +
    base.specialDefense +
    base.speed
  );
}

function computeBaseSpe(species: string): number | null {
  return getBaseStats(species)?.speed ?? null;
}

// =============================================================================
// MetaLane
// =============================================================================

/**
 * Right-most meta column — shows BST and base SPE from species data.
 * WR and usage are omitted in Phase 2; team-pokemon row doesn't carry them.
 *
 * TODO Phase 5: usage from format meta data.
 */
export function MetaLane({ pokemon, _format }: MetaLaneProps & { _format?: GameFormat }) {
  const bst = computeBst(pokemon.species ?? "");
  const baseSpe = computeBaseSpe(pokemon.species ?? "");

  return (
    <div className="flex flex-col justify-center gap-1.5 px-3 py-2 font-mono text-[11px]" style={{ minWidth: 72 }}>
      {/* BST */}
      <span className="flex items-baseline gap-1 whitespace-nowrap">
        <b className="text-[12px] font-semibold">{bst ?? "—"}</b>
        <span className="text-muted-foreground text-[9px] font-medium uppercase tracking-wide">
          BST
        </span>
      </span>

      {/* Base SPE */}
      <span className="flex items-baseline gap-1 whitespace-nowrap">
        <b className="text-[12px] font-semibold">{baseSpe ?? "—"}</b>
        <span className="text-muted-foreground text-[9px] font-medium uppercase tracking-wide">
          Spe
        </span>
      </span>

      {/* WR placeholder */}
      <span className="text-muted-foreground/40 flex items-baseline gap-1 whitespace-nowrap">
        <b className="text-[11px]">—</b>
        <span className="text-[9px] font-medium uppercase tracking-wide">WR</span>
      </span>
    </div>
  );
}
