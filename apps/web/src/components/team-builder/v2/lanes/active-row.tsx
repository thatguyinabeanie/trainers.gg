"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import s from "../builder.module.css";
import { IdentityLane } from "./identity-lane";
import { SetupLane } from "./setup-lane";
import { MovesLane } from "./moves-lane";
import { StatsLane } from "./stats-lane";
import { MetaLane } from "./meta-lane";

// =============================================================================
// Types
// =============================================================================

interface ActiveRowProps {
  idx: number;
  pokemon: Tables<"pokemon">;
  teamPokemon: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  onRemove: () => void;
}

// =============================================================================
// ActiveRow
// =============================================================================

/**
 * Full expanded row for the active/selected Pokémon slot.
 * Composes the 5 lanes: RIB | IDENTITY | SETUP | MOVES | STATS | META.
 */
export function ActiveRow({
  idx,
  pokemon,
  teamPokemon,
  format,
  onUpdate,
  onRemove,
}: ActiveRowProps) {
  // Collect held items from sibling pokemon for the item picker duplicate warning
  const teamItems = teamPokemon
    .filter((tp) => tp.pokemon && tp.pokemon.id !== pokemon.id)
    .map((tp) => tp.pokemon!.held_item)
    .filter((item): item is string => item !== null);

  function handleOpenSpecies(_anchor: HTMLElement) {
    // TODO Phase 3: wire to workspace species picker overlay
    // For now, this triggers the species picker popover flow
  }

  return (
    <div
      className={cn(
        s.rowActive,
        "flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-card",
        "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_28px_-16px_hsl(var(--primary)/0.4)]"
      )}
    >
      {/* RIB — slot number + remove button */}
      <div
        className={cn(
          s.rib,
          "flex w-8 shrink-0 flex-col items-center justify-between border-r border-dashed border-border/60 bg-muted/20 py-2"
        )}
      >
        <span className="font-mono text-[10px] font-medium tracking-wide text-muted-foreground">
          {String(idx + 1).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${pokemon.species ?? "Pokémon"} from slot ${idx + 1}`}
          className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          ×
        </button>
      </div>

      {/* IDENTITY lane */}
      <IdentityLane
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
        onOpenSpecies={handleOpenSpecies}
      />

      {/* SETUP lane */}
      <SetupLane
        pokemon={pokemon}
        format={format}
        teamItems={teamItems}
        onUpdate={onUpdate}
      />

      {/* MOVES lane */}
      <MovesLane
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
      />

      {/* STATS lane */}
      <StatsLane
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
      />

      {/* META lane */}
      <MetaLane
        pokemon={pokemon}
        format={format}
        _format={format}
      />
    </div>
  );
}
